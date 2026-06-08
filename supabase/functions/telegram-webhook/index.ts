import { createClient } from 'npm:@supabase/supabase-js@2'

// Exact daily activation reply (sent only on the first message of a calendar day).
const DAILY_REPLY =
  'Шумо ботро имрӯз фаъол кардед! Лутфан паёми навбатиро фардо фиристед!'

async function sendMessage(token: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch {
    // ignore send failures so Telegram never sees a non-2xx response
  }
}

// Today's date in YYYY-MM-DD (UTC) for daily-limit comparisons.
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// IMPORTANT: This handler ALWAYS returns HTTP 200 so Telegram never retries
// and never reports a "non-2xx status code" error.
//
// Behaviour:
//  - Every incoming text is saved to the `messages` table (dashboard feed).
//  - On the FIRST message of a calendar day, the bot replies with DAILY_REPLY.
//  - On subsequent messages the same day, the bot stays completely silent.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('ok', { status: 200 })
    }

    const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!token) return new Response('ok', { status: 200 })

    const update = await req.json().catch(() => null)
    const message = update?.message ?? update?.edited_message
    const chatId = message?.chat?.id
    const text: string = (message?.text ?? '').trim()

    if (!chatId) return new Response('ok', { status: 200 })

    const chatIdStr = String(chatId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Look up the linked contact (so the message shows the student's name).
    const { data: linkedRows } = await supabase
      .from('parent_contacts')
      .select('id, school_id, student_name, last_start_date')
      .eq('chat_id', chatIdStr)
      .limit(1)

    const linkedContact =
      linkedRows && linkedRows.length > 0 ? linkedRows[0] : null

    // Always save the message into the notifications feed.
    if (text) {
      const senderFromName = [message?.from?.first_name, message?.from?.last_name]
        .filter(Boolean)
        .join(' ')
      const senderName =
        (linkedContact?.student_name as string) || senderFromName || `ID ${chatIdStr}`
      try {
        await supabase.from('messages').insert({
          school_id: (linkedContact?.school_id as string) || 'gdbh',
          chat_id: chatIdStr,
          sender_name: senderName,
          message_content: text,
          status: 'unread',
        })
      } catch {
        // never block the bot on a logging failure
      }
    }

    // Daily-limit reply: only on the first message of the calendar day.
    const today = todayStr()
    const lastDate = (linkedContact?.last_start_date as string | null) ?? null
    const isFirstOfDay = lastDate !== today

    if (isFirstOfDay) {
      if (linkedContact) {
        try {
          await supabase
            .from('parent_contacts')
            .update({ last_start_date: today })
            .eq('id', linkedContact.id)
        } catch {
          // ignore tracking failures
        }
      }
      await sendMessage(token, chatId, DAILY_REPLY)
    }
    // Subsequent messages the same day: stay completely silent.

    return new Response('ok', { status: 200 })
  } catch {
    return new Response('ok', { status: 200 })
  }
})
