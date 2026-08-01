import { createClient } from 'npm:@supabase/supabase-js@2'

// ---- Exact Tajik reply templates --------------------------------------------
const WELCOME_NO_CHILDREN =
  '👋 Салом! Хуш омадед ба системаи AttendQR. Барои пайваст кардани ҳисоби фарзандатон, лутфан маълумотро чунин нависед: [Ному насаб] [Синф] [Параллел]. (Намуна: Алиев Аҳмад 5 А)'

const welcomeWithChildren = (names: string[]) =>
  `👋 Салом! Рӯйхати хонандагони шумо: ${names.join(', ')}.\n\nАкнун ҳар паёме, ки шумо ин ҷо менависед, ба муаллим фиристода мешавад. Барои иловаи фарзанди нав маълумоти ӯро нависед: [Ному насаб] [Синф] [Параллел].`

const REGISTER_HELP =
  'Лутфан маълумотро чунин нависед: [Ному насаб] [Синф] [Параллел]. (Намуна: Алиев Аҳмад 5 А)'

const registered = (name: string, grade: string) =>
  `✅ Хонанда «${name}» (синфи ${grade}) бомуваффақият пайваст карда шуд. Акнун шумо метавонед ба муаллим паём нависед.`

const MESSAGE_FORWARDED = '✅ Паёми шумо ба муаллим фиристода шуд.'

const CHOOSE_CHILD = 'Шумо якчанд фарзанди пайвастшуда доред. Лутфан интихоб кунед, ки ин паём ба кадом фарзанд тааллуқ дорад:'
const CHOICE_EXPIRED = 'Вақти интихоб гузашт. Лутфан паёми худро аз нав фиристед.'

const DELETE_NO_CHILDREN = 'Шумо ҳоло ягон фарзанди пайвастшуда надоред.'
const DELETE_PROMPT = 'Кадом фарзандро аз рӯйхат пок кардан мехоҳед? Лутфан аз рӯйхати зер интихоб кунед:'
const deleteConfirmed = (name: string) =>
  `✅ Фарзанди шумо «${name}» бо муваффақият аз рӯйхат пок карда шуд.`

// Pending messages awaiting a child selection (multi-child parents).
// Key = Telegram chat id. Entries expire after 15 minutes.
type Pending = { text: string; audioUrl: string | null; senderName: string; at: number }
const pendingByChat = new Map<string, Pending>()
const PENDING_TTL_MS = 15 * 60 * 1000

function setPending(chatId: string, p: Pending) {
  pendingByChat.set(chatId, p)
}
function takePending(chatId: string): Pending | null {
  const p = pendingByChat.get(chatId)
  pendingByChat.delete(chatId)
  if (!p || Date.now() - p.at > PENDING_TTL_MS) return null
  return p
}

async function sendMessage(
  token: string,
  chatId: number | string,
  text: string,
  replyMarkup?: unknown,
) {
  try {
    const body: Record<string, unknown> = { chat_id: chatId, text }
    if (replyMarkup) body.reply_markup = replyMarkup
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // never let a send failure surface a non-2xx to Telegram
  }
}

async function answerCallbackQuery(token: string, callbackQueryId: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    })
  } catch {
    // ignore
  }
}

// Download a Telegram file (voice/audio) and return it as a base64 data URL.
async function downloadFileAsDataUrl(
  token: string,
  fileId: string,
  mime: string,
): Promise<string | null> {
  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    })
    const info = await infoRes.json().catch(() => null)
    const filePath = info?.result?.file_path
    if (!filePath) return null
    const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
    if (!fileRes.ok) return null
    const buf = new Uint8Array(await fileRes.arrayBuffer())
    let binary = ''
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
    const b64 = btoa(binary)
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

// Normalise a parallel letter to uppercase (Cyrillic/Tajik).
function normLetter(s: string): string {
  return (s || '').trim().toUpperCase()
}

// Parse "[Ному насаб] [Синф] [Параллел]" -> { name, cls, letter }.
function parseRegistration(
  text: string,
): { name: string; cls: string; letter: string } | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length < 2) return null

  const numIdx = tokens.findIndex((tkn) => /^\d{1,2}$/.test(tkn))
  if (numIdx <= 0) return null // need at least one name token before the number

  const name = tokens.slice(0, numIdx).join(' ')
  const cls = tokens[numIdx]
  const rawLetter = tokens[numIdx + 1] ?? ''
  const letter = /^[A-Za-zА-Яа-яЁёӮӯҚқҲҳҶҷҒғӢӣ]$/.test(rawLetter)
    ? normLetter(rawLetter)
    : '-'

  if (!name || !cls) return null
  return { name, cls, letter }
}

function makeGrade(cls: string, letter: string): string {
  if (!letter || letter === '-') return cls
  return `${cls}-${letter}`
}

// Build the monthly attendance ranking (Tajik) for a school.
async function buildMonthlyRanking(
  supabase: ReturnType<typeof createClient>,
  schoolId: string,
): Promise<string> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: students } = await supabase
    .from('students')
    .select('id, name')

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('student_id, type, timestamp')
    .gte('timestamp', monthStart)
    .eq('type', 'check-in')

  const nameById = new Map<string, string>()
  for (const s of students ?? []) nameById.set(s.id as string, s.name as string)

  const counts = new Map<string, number>()
  for (const l of logs ?? []) {
    const sid = l.student_id as string
    if (!nameById.has(sid)) continue // limit to real students of the roster
    counts.set(sid, (counts.get(sid) ?? 0) + 1)
  }

  const ranked = [...counts.entries()]
    .map(([sid, count]) => ({ name: nameById.get(sid) ?? sid, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  const monthNames = [
    'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
    'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр',
  ]
  const header = `🏆 Рейтинги ҳузури хонандагон — ${monthNames[now.getMonth()]} ${now.getFullYear()}\n`

  if (ranked.length === 0) {
    return header + '\nҲоло барои ин моҳ маълумоти ҳузур мавҷуд нест.'
  }

  const medals = ['🥇', '🥈', '🥉']
  const lines = ranked.map((r, i) => {
    const prefix = medals[i] ?? `${i + 1}.`
    return `${prefix} ${r.name} — ${r.count} рӯз`
  })
  return header + '\n' + lines.join('\n')
}

// IMPORTANT: this handler ALWAYS returns HTTP 200 so Telegram never retries.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('ok', { status: 200 })

    const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!token) return new Response('ok', { status: 200 })

    const update = await req.json().catch(() => null)

    // ---- Inline keyboard callbacks (/delete and child selection) ----------
    const cq = update?.callback_query
    if (cq) {
      const cqChatId = cq.message?.chat?.id
      const data: string = cq.data ?? ''
      await answerCallbackQuery(token, cq.id)
      if (cqChatId && (data.startsWith('del:') || data.startsWith('pick:'))) {
        const rowId = data.slice(data.indexOf(':') + 1)
        const supabaseCb = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        try {
          const { data: row } = await supabaseCb
            .from('parent_contacts')
            .select('id, school_id, student_name')
            .eq('id', rowId)
            .eq('chat_id', String(cqChatId))
            .maybeSingle()
          if (row && data.startsWith('del:')) {
            await supabaseCb.from('parent_contacts').delete().eq('id', row.id)
            await sendMessage(token, cqChatId, deleteConfirmed(row.student_name as string))
          } else if (row) {
            // Child selected — deliver the message the parent sent earlier.
            const pending = takePending(String(cqChatId))
            if (!pending) {
              await sendMessage(token, cqChatId, CHOICE_EXPIRED)
            } else {
              await supabaseCb.from('messages').insert({
                school_id: row.school_id,
                sender_name: `${pending.senderName} (волиди ${row.student_name})`,
                message_content: pending.text,
                audio_url: pending.audioUrl,
                chat_id: String(cqChatId),
                status: 'unread',
              })
              await sendMessage(token, cqChatId, MESSAGE_FORWARDED)
            }
          }
        } catch {
          // ignore db failures so Telegram never sees a non-2xx response
        }
      }
      return new Response('ok', { status: 200 })
    }

    const message = update?.message ?? update?.edited_message
    const chatId = message?.chat?.id
    const text: string = (message?.text ?? '').trim()
    if (!chatId) return new Response('ok', { status: 200 })

    const chatIdStr = String(chatId)
    const senderTgName =
      [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(' ') ||
      message?.from?.username ||
      'Волидайн'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // All children currently linked to this Telegram ID (multi-child support).
    const { data: linkedRows } = await supabase
      .from('parent_contacts')
      .select('id, school_id, student_id, student_name')
      .eq('chat_id', chatIdStr)

    const children = linkedRows ?? []

    // ---- Voice / audio message from a registered parent -> forward to app ----
    const voice = message?.voice ?? message?.audio
    if (voice?.file_id && children.length > 0) {
      const child = children[0]
      const mime = message?.voice ? 'audio/ogg' : (voice?.mime_type || 'audio/mpeg')
      const dataUrl = await downloadFileAsDataUrl(token, voice.file_id, mime)
      try {
        await supabase.from('messages').insert({
          school_id: child.school_id,
          sender_name: `${senderTgName} (волиди ${child.student_name})`,
          message_content: '🎤 Паёми овозӣ',
          audio_url: dataUrl,
          chat_id: chatIdStr,
          status: 'unread',
        })
      } catch {
        // ignore db failures so Telegram never sees a non-2xx response
      }
      await sendMessage(token, chatId, MESSAGE_FORWARDED)
      return new Response('ok', { status: 200 })
    }



    // ---- /start command --------------------------------------------------
    if (text.startsWith('/start')) {
      if (children.length === 0) {
        await sendMessage(token, chatId, WELCOME_NO_CHILDREN)
      } else {
        const names = children.map((c) => c.student_name).filter(Boolean)
        await sendMessage(token, chatId, welcomeWithChildren(names))
      }
      return new Response('ok', { status: 200 })
    }

    // ---- /delete command: show inline keyboard of linked children --------
    if (text.startsWith('/delete')) {
      if (children.length === 0) {
        await sendMessage(token, chatId, DELETE_NO_CHILDREN)
      } else {
        const keyboard = children.map((c) => [
          { text: c.student_name || '—', callback_data: `del:${c.id}` },
        ])
        await sendMessage(token, chatId, DELETE_PROMPT, { inline_keyboard: keyboard })
      }
      return new Response('ok', { status: 200 })
    }


    // ---- /reyting (monthly ranking, for administration) ------------------
    if (text.startsWith('/reyting') || text.startsWith('/ranking')) {
      const schoolId = (children[0]?.school_id as string) || 'gdbh'
      const ranking = await buildMonthlyRanking(supabase, schoolId)
      await sendMessage(token, chatId, ranking)
      return new Response('ok', { status: 200 })
    }

    // Ignore any other slash command.
    if (text.startsWith('/')) return new Response('ok', { status: 200 })

    // ---- Registration: parse "[Name] [Class] [Parallel]" -----------------
    const parsed = parseRegistration(text)

    // Registered parent sending a free-form message -> forward to the app.
    // A message that doesn't parse as a registration is treated as a chat.
    if (children.length > 0 && !parsed) {
      const child = children[0]
      try {
        await supabase.from('messages').insert({
          school_id: child.school_id,
          sender_name: `${senderTgName} (волиди ${child.student_name})`,
          message_content: text,
          chat_id: chatIdStr,
          status: 'unread',
        })
      } catch {
        // ignore db failures so Telegram never sees a non-2xx response
      }
      await sendMessage(token, chatId, MESSAGE_FORWARDED)
      return new Response('ok', { status: 200 })
    }

    if (!parsed) {
      await sendMessage(token, chatId, REGISTER_HELP)
      return new Response('ok', { status: 200 })
    }

    const grade = makeGrade(parsed.cls, parsed.letter)
    const schoolId = (children[0]?.school_id as string) || 'gdbh'
    const nameNorm = parsed.name.trim().toLowerCase().replace(/\s+/g, ' ')

    try {
      // Prefer linking to an existing student record so QR scans (which look up
      // by real student_id) can notify the parent. Only create a TG-* row when
      // no matching student exists yet.
      const { data: existing } = await supabase
        .from('parent_contacts')
        .select('id, student_name, chat_id')
        .eq('school_id', schoolId)

      const match = (existing ?? []).find(
        (r) => (r.student_name ?? '').trim().toLowerCase().replace(/\s+/g, ' ') === nameNorm,
      )

      if (match) {
        await supabase
          .from('parent_contacts')
          .update({ chat_id: chatIdStr, grade })
          .eq('id', match.id)
      } else {
        await supabase.from('parent_contacts').insert({
          school_id: schoolId,
          student_id: `TG-${chatIdStr}-${Date.now()}`,
          student_name: parsed.name,
          chat_id: chatIdStr,
          grade,
        })
      }
    } catch {
      // ignore db failures so Telegram never sees a non-2xx response
    }

    await sendMessage(token, chatId, registered(parsed.name, grade))
    return new Response('ok', { status: 200 })
  } catch {
    return new Response('ok', { status: 200 })
  }
})
