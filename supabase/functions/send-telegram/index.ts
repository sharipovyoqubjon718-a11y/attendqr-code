import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// If Telegram reports the chat is unreachable, wipe the stored chat_id so the
// UI marks the parent as "Chat ID сабт нашудааст" and stops trying to send.
async function nullifyChatId(chatId: string) {
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) return
    const supabase = createClient(url, key)
    await supabase.from('parent_contacts').update({ chat_id: null }).eq('chat_id', chatId)
  } catch {
    // ignore cleanup failures
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Decode a base64 (optionally data-URL) string into bytes.
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // IMPORTANT: always respond with HTTP 200 and an { ok } flag so the client
  // never throws a "non-2xx status code" error. Failures are reported in the body.
  try {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!token) {
      return json({ ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' })
    }

    const body = await req.json().catch(() => ({}))
    const chatId = String(body?.chat_id ?? '').trim()
    const text = String(body?.text ?? '').trim()
    const fileBase64 = typeof body?.file_base64 === 'string' ? body.file_base64 : ''
    const fileName = String(body?.file_name ?? 'attachment').trim() || 'attachment'
    const fileType = String(body?.file_type ?? '').trim()

    if (!chatId) {
      return json({ ok: false, error: 'chat_id is required' })
    }
    if (!text && !fileBase64) {
      return json({ ok: false, error: 'text or file is required' })
    }
    if (text.length > 4000) {
      return json({ ok: false, error: 'text too long' })
    }

    let tgRes: Response
    let data: { ok?: boolean; description?: string; result?: { message_id?: number } }

    if (fileBase64) {
      // Send images as photo, audio/voice as voice, everything else as document.
      const bytes = base64ToBytes(fileBase64)
      const isImage = fileType.startsWith('image/')
      const isAudio = fileType.startsWith('audio/')
      const method = isImage ? 'sendPhoto' : isAudio ? 'sendVoice' : 'sendDocument'
      const field = isImage ? 'photo' : isAudio ? 'voice' : 'document'
      const form = new FormData()
      form.append('chat_id', chatId)
      if (text) form.append('caption', text)
      form.append(field, new Blob([bytes], { type: fileType || 'application/octet-stream' }), fileName)

      tgRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        body: form,
      })
    } else {
      tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      })
    }

    data = await tgRes.json().catch(() => ({}))

    if (!tgRes.ok || !data.ok) {
      const desc = data.description || 'Telegram send failed'
      // Auto-cleanup: parent blocked the bot or chat no longer exists.
      if (/chat not found|bot was blocked|user is deactivated|chat_id is empty/i.test(desc)) {
        await nullifyChatId(chatId)
      }
      return json({ ok: false, error: desc })
    }


    return json({ ok: true, message_id: data.result?.message_id })
  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
})
