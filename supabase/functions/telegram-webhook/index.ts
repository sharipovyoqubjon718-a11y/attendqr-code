import { createClient } from 'npm:@supabase/supabase-js@2'

const ALREADY_TODAY = 'Шумо аллакай имрӯз ботро фаъол кардаед! Лутфан паёми навбатиро фардо фиристед.'
const CONFIRMED = 'Ташаккур! Фаъолияти шумо барои имрӯз тасдиқ шуд. Паёмҳоро аз мактаб интизор шавед.'
const WELCOME = 'Салом! Барои фаъолсозӣ фармони /start -ро фиристед.'

async function sendMessage(token: string, chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!token) return new Response('ok')

  const update = await req.json().catch(() => null)
  const message = update?.message ?? update?.edited_message
  const chatId = message?.chat?.id
  const text: string = message?.text ?? ''

  if (!chatId) return new Response(JSON.stringify({ ok: true }))

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (text.trim().startsWith('/start')) {
    const today = new Date().toISOString().split('T')[0]
    const chatIdStr = String(chatId)

    // Find existing contact(s) by chat_id
    const { data: rows } = await supabase
      .from('parent_contacts')
      .select('id, last_start_date')
      .eq('chat_id', chatIdStr)

    const existing = rows && rows.length > 0 ? rows[0] : null

    if (existing && existing.last_start_date === today) {
      await sendMessage(token, chatId, ALREADY_TODAY)
    } else if (existing) {
      await supabase.from('parent_contacts')
        .update({ last_start_date: today })
        .eq('chat_id', chatIdStr)
      await sendMessage(token, chatId, CONFIRMED)
    } else {
      // No registered student linked to this chat yet — still confirm activation
      await sendMessage(token, chatId, CONFIRMED)
    }
  } else {
    await sendMessage(token, chatId, WELCOME)
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
