import { createClient } from 'npm:@supabase/supabase-js@2'

const ASK_PHONE =
  'Лутфан, рақами телефони худро нависед (масалан: 900000000), то мо шуморо ба мактаб пайваст кунем.'
const LINKED_OK =
  'Ташаккур! Аккаунти шумо бомуваффақият бо хонанда пайваст карда шуд. Акнун шумо паёмҳоро аз мактаб қабул мекунед.'
const ALREADY_LINKED =
  'Аккаунти шумо аллакай бо хонанда пайваст шудааст. Шумо паёмҳоро аз мактаб қабул мекунед.'
const NOT_FOUND =
  'Бубахшед, бо ин рақами телефон хонанда ёфт нашуд. Лутфан рақамеро, ки дар мактаб сабт шудааст, дубора нависед.'

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

// Keep only digits for phone matching.
function normalizePhone(raw: string): string {
  return (raw || '').replace(/\D/g, '')
}

// IMPORTANT: This handler ALWAYS returns HTTP 200 so Telegram never retries
// and never reports a "non-2xx status code" error. The registration flow is
// kept simple: /start asks for a phone number, a valid phone links the chat.
Deno.serve(async (req) => {
  // Always respond 200, even on unexpected input.
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

    // Check if this chat is already linked.
    const { data: linkedRows } = await supabase
      .from('parent_contacts')
      .select('id, school_id, student_name')
      .eq('chat_id', chatIdStr)
      .limit(1)

    const isLinked = !!(linkedRows && linkedRows.length > 0)
    const linkedContact = isLinked ? linkedRows![0] : null

    // Save every non-/start text message into the notifications feed so the
    // dashboard can show it in real time.
    if (text && !text.startsWith('/start')) {
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

    if (text.startsWith('/start')) {
      await sendMessage(token, chatId, isLinked ? ALREADY_LINKED : ASK_PHONE)
      return new Response('ok', { status: 200 })
    }

    if (isLinked) {
      await sendMessage(token, chatId, ALREADY_LINKED)
      return new Response('ok', { status: 200 })
    }

    // Not linked: treat any text as a phone number attempt.
    const phone = normalizePhone(text)
    if (phone.length >= 6) {
      const { data: matches } = await supabase
        .from('parent_contacts')
        .select('id, phone')
        .not('phone', 'is', null)

      const found = (matches ?? []).find(
        (r) => normalizePhone(r.phone as string) === phone,
      )

      if (found) {
        await supabase
          .from('parent_contacts')
          .update({ chat_id: chatIdStr })
          .eq('id', found.id)
        await sendMessage(token, chatId, LINKED_OK)
      } else {
        await sendMessage(token, chatId, NOT_FOUND)
      }
    } else {
      await sendMessage(token, chatId, ASK_PHONE)
    }

    return new Response('ok', { status: 200 })
  } catch {
    // Never surface an error to Telegram.
    return new Response('ok', { status: 200 })
  }
})
