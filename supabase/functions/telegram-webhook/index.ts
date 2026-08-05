// AttendQR Telegram bot — clean rewrite.
// Always returns HTTP 200 so Telegram never retries deliveries.
import { createClient } from 'npm:@supabase/supabase-js@2'

// ---------------------------------------------------------------- templates --
const HELP =
  '👋 Салом! Хуш омадед ба системаи AttendQR.\n\n' +
  'Фармонҳои дастрас:\n' +
  '/start — оғоз ва маълумот\n' +
  '/delete — пок кардани фарзанд аз рӯйхат\n' +
  '/reyting — рейтинги хонандагон\n\n' +
  'Барои пайваст кардани фарзанд маълумоти ӯро нависед: [Ному насаб] [Синф] [Параллел]\n' +
  '(Намуна: Алиев Аҳмад 5 А)'

const helpWithChildren = (names: string[]) =>
  `👋 Салом! Рӯйхати фарзандони шумо: ${names.join(', ')}.\n\n` +
  'Ҳар паёме, ки шумо ин ҷо менависед, ба муаллим фиристода мешавад.\n\n' +
  'Фармонҳо: /start, /delete, /reyting\n' +
  'Барои иловаи фарзанди нав: [Ному насаб] [Синф] [Параллел]'

const REGISTER_HELP =
  'Лутфан маълумотро чунин нависед: [Ному насаб] [Синф] [Параллел]. (Намуна: Алиев Аҳмад 5 А)'

const registered = (name: string, grade: string) =>
  `✅ Хонанда «${name}» (синфи ${grade}) бомуваффақият пайваст карда шуд.`

const MESSAGE_FORWARDED = '✅ Паёми шумо ба муаллим фиристода шуд.'
const CHOOSE_CHILD =
  'Шумо якчанд фарзанди пайвастшуда доред. Лутфан интихоб кунед, ки ин паём ба кадом фарзанд тааллуқ дорад:'
const DELETE_NO_CHILDREN = 'Шумо ҳоло ягон фарзанди пайвастшуда надоред.'
const DELETE_PROMPT = 'Кадом фарзандро аз рӯйхат пок кардан мехоҳед?'
const deleteConfirmed = (name: string) =>
  `✅ Фарзанди шумо «${name}» бо муваффақият аз рӯйхат пок карда шуд.`
const RANKING_PROMPT = '📊 Рейтингро интихоб кунед:'
const ERROR_GENERIC = '⚠️ Хатои техникӣ. Лутфан баъдтар кӯшиш кунед.'

const MONTH_NAMES = [
  'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
  'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр',
]

// ------------------------------------------------------------ telegram api --
const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''

async function tg(method: string, payload: Record<string, unknown>) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => null)
    if (!json?.ok) console.error(`telegram ${method} failed`, res.status, JSON.stringify(json))
    return json
  } catch (e) {
    console.error(`telegram ${method} threw`, String(e))
    return null
  }
}

const sendMessage = (chatId: number | string, text: string, replyMarkup?: unknown) =>
  tg('sendMessage', replyMarkup ? { chat_id: chatId, text, reply_markup: replyMarkup } : { chat_id: chatId, text })

const answerCallback = (id: string) => tg('answerCallbackQuery', { callback_query_id: id })

async function downloadFileAsDataUrl(fileId: string, mime: string): Promise<string | null> {
  try {
    const info = await tg('getFile', { file_id: fileId })
    const filePath = info?.result?.file_path
    if (!filePath) return null
    const fileRes = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`)
    if (!fileRes.ok) return null
    const buf = new Uint8Array(await fileRes.arrayBuffer())
    let binary = ''
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
    return `data:${mime};base64,${btoa(binary)}`
  } catch (e) {
    console.error('downloadFileAsDataUrl failed', String(e))
    return null
  }
}

// --------------------------------------------------------------- db client --
function db() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}
type DB = ReturnType<typeof db>

interface Child { id: string; school_id: string; student_id: string; student_name: string }

async function getChildren(supabase: DB, chatId: string): Promise<Child[]> {
  const { data, error } = await supabase
    .from('parent_contacts')
    .select('id, school_id, student_id, student_name')
    .eq('chat_id', chatId)
  if (error) {
    console.error('getChildren failed', error.message)
    return []
  }
  return (data ?? []) as unknown as Child[]
}

// ------------------------------------------------------------- registration --
function parseRegistration(text: string): { name: string; cls: string; letter: string } | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length < 2) return null
  const numIdx = tokens.findIndex((t) => /^\d{1,2}$/.test(t))
  if (numIdx <= 0) return null
  const name = tokens.slice(0, numIdx).join(' ')
  const cls = tokens[numIdx]
  const raw = tokens[numIdx + 1] ?? ''
  const letter = /^[A-Za-zА-Яа-яЁёӮӯҚқҲҳҶҷҒғӢӣ]$/.test(raw) ? raw.toUpperCase() : '-'
  if (!name || !cls) return null
  return { name, cls, letter }
}

function isRegistration(text: string): { name: string; cls: string; letter: string } | null {
  if (!text || text.startsWith('/')) return null
  const p = parseRegistration(text)
  if (!p) return null
  const n = Number(p.cls)
  if (!(n >= 1 && n <= 11)) return null
  const wordsOk = p.name
    .split(/\s+/)
    .every((t) => /^[A-Za-zА-Яа-яЁёӮӯҚқҲҳҶҷҒғӢӣЪъ'’-]{2,}$/.test(t))
  return wordsOk ? p : null
}

const makeGrade = (cls: string, letter: string) => (!letter || letter === '-' ? cls : `${cls}-${letter}`)

// ----------------------------------------------------------------- rankings --
const rankingKeyboard = () => ({
  inline_keyboard: [
    [{ text: '#Топ 3', callback_data: 'rey:top3' }],
    [{ text: 'Ҳаммаҷой', callback_data: 'rey:all' }],
  ],
})

const medalLine = (i: number, text: string) => `${['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} ${text}`

async function buildAcademicRanking(supabase: DB, schoolId: string, limit: number | null) {
  const header = '📚 Беҳтарин хонандагон\n'
  const { data, error } = await supabase
    .from('academic_scores')
    .select('student_name, points, avg_grade')
    .eq('school_id', schoolId)
    .order('points', { ascending: false })
    .limit(limit ?? 200)
  if (error) {
    console.error('academic ranking failed', error.message)
    return header + '\nМаълумот дастрас нест.'
  }
  const rows = data ?? []
  if (rows.length === 0) return header + '\nҲоло маълумоти журнал мавҷуд нест.'
  return header + '\n' + rows
    .map((r, i) => medalLine(i, `${r.student_name} — ${r.points} хол (миёна ${r.avg_grade})`))
    .join('\n')
}

async function buildAttendanceRanking(supabase: DB, limit: number | null) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const header = `🏃 Беҳтарин иштироккунандагони дарс — ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}\n`

  const [{ data: students }, { data: logs, error }] = await Promise.all([
    supabase.from('students').select('id, name'),
    supabase
      .from('attendance_logs')
      .select('student_id, timestamp')
      .gte('timestamp', monthStart)
      .eq('type', 'check-in'),
  ])
  if (error) {
    console.error('attendance ranking failed', error.message)
    return header + '\nМаълумот дастрас нест.'
  }

  const nameById = new Map<string, string>()
  for (const s of students ?? []) nameById.set(s.id as string, s.name as string)

  const days = new Map<string, Set<string>>()
  for (const l of logs ?? []) {
    const sid = l.student_id as string
    if (!nameById.has(sid)) continue
    if (!days.has(sid)) days.set(sid, new Set())
    days.get(sid)!.add(String(l.timestamp).slice(0, 10))
  }

  const ranked = [...days.entries()]
    .map(([sid, set]) => ({ name: nameById.get(sid)!, count: set.size }))
    .sort((a, b) => b.count - a.count)
  if (ranked.length === 0) return header + '\nҲоло барои ин моҳ маълумоти ҳузур мавҷуд нест.'
  const list = limit ? ranked.slice(0, limit) : ranked
  return header + '\n' + list.map((r, i) => medalLine(i, `${r.name} — ${r.count} рӯз`)).join('\n')
}

async function buildRankingReply(supabase: DB, schoolId: string, limit: number | null) {
  const [academic, attendance] = await Promise.all([
    buildAcademicRanking(supabase, schoolId, limit),
    buildAttendanceRanking(supabase, limit),
  ])
  const title = limit ? '🏆 #Топ 3\n\n' : '🏆 Рейтинги пурра (Ҳаммаҷой)\n\n'
  return title + academic + '\n\n' + attendance
}

// ------------------------------------------------------------ message store --
async function insertMessage(
  supabase: DB,
  row: Record<string, unknown>,
): Promise<string | null> {
  const { data, error } = await supabase.from('messages').insert(row).select('id').maybeSingle()
  if (error) {
    console.error('insertMessage failed', error.message)
    return null
  }
  return (data?.id as string) ?? null
}

// Telegram limits callback_data to 64 bytes, so we never put UUIDs in it.
// We send only a short index into the (stably ordered) children list.
const childKeyboard = (children: Child[], prefix: 'p' | 'd' = 'p') => ({
  inline_keyboard: children.map((c, i) => [
    { text: c.student_name || '—', callback_data: `${prefix}:${i}` },
  ]),
})

const sortChildren = (children: Child[]) =>
  [...children].sort((a, b) => a.id.localeCompare(b.id))

// ------------------------------------------------------------------ handlers --
async function handleCallback(supabase: DB, cq: Record<string, any>) {
  const chatId = cq.message?.chat?.id
  const data: string = cq.data ?? ''
  await answerCallback(cq.id)
  if (!chatId) return
  console.log('callback', { chatId: String(chatId), data })

  if (data.startsWith('rey:')) {
    let schoolId = 'gdbh'
    const { data: row } = await supabase
      .from('parent_contacts')
      .select('school_id')
      .eq('chat_id', String(chatId))
      .limit(1)
      .maybeSingle()
    if (row?.school_id) schoolId = row.school_id as string
    await sendMessage(chatId, await buildRankingReply(supabase, schoolId, data === 'rey:top3' ? 3 : null))
    return
  }

  if (!data.startsWith('d:') && !data.startsWith('p:')) return

  const idx = Number(data.split(':')[1])
  const children = sortChildren(await getChildren(supabase, String(chatId)))
  const child = Number.isInteger(idx) ? children[idx] : undefined
  if (!child) {
    await sendMessage(chatId, ERROR_GENERIC)
    return
  }

  if (data.startsWith('d:')) {
    const { error: delErr } = await supabase.from('parent_contacts').delete().eq('id', child.id)
    if (delErr) {
      console.error('delete child failed', delErr.message)
      await sendMessage(chatId, ERROR_GENERIC)
      return
    }
    await sendMessage(chatId, deleteConfirmed(child.student_name))
    return
  }

  // p: attach the chosen child to the newest pending message of this chat
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .select('id, sender_name')
    .eq('chat_id', String(chatId))
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (msgErr) console.error('pending lookup failed', msgErr.message)
  if (msg) {
    const base = String(msg.sender_name ?? 'Волидайн').replace(/\s*\(волиди.*\)$/, '')
    const { error: upErr } = await supabase
      .from('messages')
      .update({
        sender_name: `${base} (волиди ${child.student_name})`,
        school_id: child.school_id,
        status: 'unread',
      })
      .eq('id', msg.id)
    if (upErr) console.error('release pending message failed', upErr.message)
  }
  await sendMessage(chatId, MESSAGE_FORWARDED)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 })
  if (!TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not configured')
    return new Response('ok', { status: 200 })
  }

  try {
    const rawBody = await req.text()
    console.log('incoming update raw', rawBody.slice(0, 1500))
    let update: any = null
    try {
      update = JSON.parse(rawBody)
    } catch {
      update = null
    }
    if (!update) {
      console.error('unparsable update body')
      return new Response('ok', { status: 200 })
    }
    const supabase = db()

    if (update.callback_query) {
      await handleCallback(supabase, update.callback_query)
      return new Response('ok', { status: 200 })
    }

    const message = update.message ?? update.edited_message
    const chatId = message?.chat?.id
    if (!chatId) return new Response('ok', { status: 200 })
    const chatIdStr = String(chatId)
    const text: string = (message?.text ?? '').trim()
    const senderName =
      [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(' ') ||
      message?.from?.username ||
      'Волидайн'

    const children = await getChildren(supabase, chatIdStr)
    console.log('update', { chatIdStr, children: children.length, text: text.slice(0, 60) })

    // ---- commands --------------------------------------------------------
    if (text.startsWith('/start')) {
      await sendMessage(
        chatId,
        children.length === 0
          ? HELP
          : helpWithChildren(children.map((c) => c.student_name).filter(Boolean)),
      )
      return new Response('ok', { status: 200 })
    }

    if (text.startsWith('/delete')) {
      if (children.length === 0) await sendMessage(chatId, DELETE_NO_CHILDREN)
      else await sendMessage(chatId, DELETE_PROMPT, childKeyboard(children, null, 'del'))
      return new Response('ok', { status: 200 })
    }

    if (text.startsWith('/reyting') || text.startsWith('/ranking')) {
      await sendMessage(chatId, RANKING_PROMPT, rankingKeyboard())
      return new Response('ok', { status: 200 })
    }

    // ---- voice / audio ---------------------------------------------------
    const voice = message?.voice ?? message?.audio
    if (voice?.file_id && children.length > 0) {
      const mime = message?.voice ? 'audio/ogg' : (voice.mime_type || 'audio/mpeg')
      const audioUrl = await downloadFileAsDataUrl(voice.file_id, mime)
      if (children.length > 1) {
        const msgId = await insertMessage(supabase, {
          school_id: children[0].school_id,
          sender_name: senderName,
          message_content: '🎤 Паёми овозӣ',
          audio_url: audioUrl,
          chat_id: chatIdStr,
          status: 'pending',
        })
        await sendMessage(chatId, CHOOSE_CHILD, childKeyboard(children, msgId))
        return new Response('ok', { status: 200 })
      }
      const child = children[0]
      await insertMessage(supabase, {
        school_id: child.school_id,
        sender_name: `${senderName} (волиди ${child.student_name})`,
        message_content: '🎤 Паёми овозӣ',
        audio_url: audioUrl,
        chat_id: chatIdStr,
        status: 'unread',
      })
      await sendMessage(chatId, MESSAGE_FORWARDED)
      return new Response('ok', { status: 200 })
    }

    // ---- new-child registration (strict format) --------------------------
    const parsed = isRegistration(text)

    // ---- MULTI-CHILD INTERCEPTION ---------------------------------------
    // Any non-command text from a parent with 2+ children is stored as a
    // pending row (hidden from the app) and answered with the child keyboard.
    // No timeouts: the buttons stay valid forever.
    if (children.length > 1 && !parsed) {
      const msgId = await insertMessage(supabase, {
        school_id: children[0].school_id,
        sender_name: senderName,
        message_content: text || '📎 Паём',
        chat_id: chatIdStr,
        status: 'pending',
      })
      await sendMessage(chatId, CHOOSE_CHILD, childKeyboard(children, msgId))
      return new Response('ok', { status: 200 })
    }

    // Ignore unknown slash commands for single-child / unlinked chats.
    if (text.startsWith('/')) {
      await sendMessage(chatId, HELP)
      return new Response('ok', { status: 200 })
    }

    // ---- single child free-form message ---------------------------------
    if (children.length > 0 && !parsed) {
      const child = children[0]
      await insertMessage(supabase, {
        school_id: child.school_id,
        sender_name: `${senderName} (волиди ${child.student_name})`,
        message_content: text,
        chat_id: chatIdStr,
        status: 'unread',
      })
      await sendMessage(chatId, MESSAGE_FORWARDED)
      return new Response('ok', { status: 200 })
    }

    if (!parsed) {
      await sendMessage(chatId, REGISTER_HELP)
      return new Response('ok', { status: 200 })
    }

    // ---- perform registration -------------------------------------------
    const grade = makeGrade(parsed.cls, parsed.letter)
    const schoolId = children[0]?.school_id || 'gdbh'
    const nameNorm = parsed.name.trim().toLowerCase().replace(/\s+/g, ' ')

    const { data: existing, error: exErr } = await supabase
      .from('parent_contacts')
      .select('id, student_name')
      .eq('school_id', schoolId)
    if (exErr) console.error('registration lookup failed', exErr.message)

    const match = (existing ?? []).find(
      (r) => (r.student_name ?? '').trim().toLowerCase().replace(/\s+/g, ' ') === nameNorm,
    )

    if (match) {
      const { error } = await supabase
        .from('parent_contacts')
        .update({ chat_id: chatIdStr, grade })
        .eq('id', match.id)
      if (error) console.error('link existing student failed', error.message)
    } else {
      const { error } = await supabase.from('parent_contacts').insert({
        school_id: schoolId,
        student_id: `TG-${chatIdStr}-${Date.now()}`,
        student_name: parsed.name,
        chat_id: chatIdStr,
        grade,
      })
      if (error) {
        console.error('insert new student failed', error.message)
        await sendMessage(chatId, ERROR_GENERIC)
        return new Response('ok', { status: 200 })
      }
    }

    await sendMessage(chatId, registered(parsed.name, grade))
    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('webhook fatal', String(e))
    return new Response('ok', { status: 200 })
  }
})
