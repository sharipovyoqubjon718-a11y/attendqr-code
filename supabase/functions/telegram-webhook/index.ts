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
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

// Keep only digits for phone matching.
function normalizePhone(raw: string): string {
  return (raw || '').replace(/\D/g, '')
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
  const text: string = (message?.text ?? '').trim()

  if (!chatId) return new Response(JSON.stringify({ ok: true }))

  const chatIdStr = String(chatId)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Check if this chat is already linked to a student.
  const { data: linkedRows } = await supabase
    .from('parent_contacts')
    .select('id, student_name')
    .eq('chat_id', chatIdStr)
    .limit(1)

  const isLinked = !!(linkedRows && linkedRows.length > 0)

  if (text.startsWith('/start')) {
    await sendMessage(token, chatId, isLinked ? ALREADY_LINKED : ASK_PHONE)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Already linked — nothing else to do.
  if (isLinked) {
    await sendMessage(token, chatId, ALREADY_LINKED)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Treat any non-command text as a phone number attempt.
  const phone = normalizePhone(text)
  if (phone.length >= 6) {
    // Match a student by phone (compare digits-only on both sides).
    const { data: matches } = await supabase
      .from('parent_contacts')
      .select('id, phone, student_name')
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

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
