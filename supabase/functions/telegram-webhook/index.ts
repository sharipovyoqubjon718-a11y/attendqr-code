// AttendQR Telegram bot — unified webhook router.
//
// Routing contract:
//   Telegram chat id  ->  parent_contacts rows (children)
//   child             ->  school_id (never a hardcoded default)
//   message           ->  messages row scoped to that child's school_id
//
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
const CHOOSE_CHILD_RANKING = 'Рейтинги кадом фарзандро дидан мехоҳед?'
const DELETE_NO_CHILDREN = 'Шумо ҳоло ягон фарзанди пайвастшуда надоред.'
const DELETE_PROMPT = 'Кадом фарзандро аз рӯйхат пок кардан мехоҳед?'
const deleteConfirmed = (name: string) =>
  `✅ Фарзанди шумо «${name}» бо муваффақият аз рӯйхат пок карда шуд.`
const RANKING_PROMPT = '📊 Рейтингро интихоб кунед:'
const RANKING_NO_CHILDREN =
  'Барои дидани рейтинг аввал фарзанди худро пайваст кунед: [Ному насаб] [Синф] [Параллел]'
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

const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

// Children of one Telegram account, stably ordered so keyboard indices are safe.
// Rows with an empty school_id are half-finished registrations awaiting the
// parent's school choice, so they are never treated as linked children.
async function getChildren(supabase: DB, chatId: string): Promise<Child[]> {
  const { data, error } = await supabase
    .from('parent_contacts')
    .select('id, school_id, student_id, student_name')
    .eq('chat_id', chatId)
    .neq('school_id', '')
    .order('id', { ascending: true })
  if (error) {
    console.error('getChildren failed', error.message)
    return []
  }
  return (data ?? []) as unknown as Child[]
}


// Every school id known to the system (credentials + any data rows), stably
// ordered so keyboard indices are safe.
async function listSchools(supabase: DB): Promise<string[]> {
  const [{ data: creds }, { data: contacts }, { data: scores }] = await Promise.all([
    supabase.from('school_credentials').select('school_id').order('created_at', { ascending: true }),
    supabase.from('parent_contacts').select('school_id'),
    supabase.from('academic_scores').select('school_id'),
  ])
  const ids: string[] = []
  for (const row of [...(creds ?? []), ...(contacts ?? []), ...(scores ?? [])]) {
    const id = row.school_id as string
    if (id && !ids.includes(id)) ids.push(id)
}

// ------------------------------------------------------------------ session --
// Active child session: which child (and therefore which school) every action
// of this Telegram account is routed to. Persisted, so it never expires.
interface Session {
  child_contact_id: string | null
  school_id: string | null
  student_id: string | null
  student_name: string
  grade: string
}

async function getSession(supabase: DB, chatId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('telegram_sessions')
    .select('child_contact_id, school_id, student_id, student_name, grade')
    .eq('chat_id', chatId)
    .maybeSingle()
  if (error) {
    console.error('getSession failed', error.message)
    return null
  }
  return (data as unknown as Session) ?? null
}

async function setSession(supabase: DB, chatId: string, child: Child) {
  const { error } = await supabase.from('telegram_sessions').upsert(
    {
      chat_id: chatId,
      child_contact_id: child.id,
      school_id: child.school_id,
      student_id: child.student_id,
      student_name: child.student_name,
    },
    { onConflict: 'chat_id' },
  )
  if (error) console.error('setSession failed', error.message)
}

async function clearSession(supabase: DB, chatId: string) {
  const { error } = await supabase.from('telegram_sessions').delete().eq('chat_id', chatId)
  if (error) console.error('clearSession failed', error.message)
}

// The child this account is currently acting for. Auto-selects the only child,
// re-validates a stored selection against the live children list, and returns
// null when the parent still has to choose.
async function activeChild(
  supabase: DB,
  chatId: string,
  children: Child[],
): Promise<Child | null> {
  if (children.length === 0) return null
  if (children.length === 1) {
    await setSession(supabase, chatId, children[0])
    return children[0]
  }
  const session = await getSession(supabase, chatId)
  if (!session?.child_contact_id) return null
  const match = children.find((c) => c.id === session.child_contact_id)
  if (!match) {
    await clearSession(supabase, chatId)
    return null
  }
  return match
}

  return ids
}

async function schoolLabel(supabase: DB, schoolId: string): Promise<string> {
  const { data } = await supabase
    .from('school_credentials')
    .select('name')
    .eq('school_id', schoolId)
    .maybeSingle()
  const name = (data?.name as string) || ''
  return name.trim() || schoolId
}

// Resolve a student's institution from the data itself — no hardcoded school.
// Priority: the school of this parent's already-linked children -> an existing
// contact row for that name -> journal scores -> ask the parent (null).
async function resolveSchoolId(
  supabase: DB,
  studentName: string,
  parentSchools: string[],
): Promise<{ schoolId: string | null; existingId: string | null }> {
  const target = normalize(studentName)

  const { data: contacts, error: cErr } = await supabase
    .from('parent_contacts')
    .select('id, school_id, student_name')
  if (cErr) console.error('resolveSchoolId contacts failed', cErr.message)
  const matches = (contacts ?? []).filter((r) => normalize(r.student_name as string) === target)

  // Same name in several schools: prefer the school this parent already uses.
  const own = matches.find((r) => parentSchools.includes(r.school_id as string))
  const contactMatch = own ?? (matches.length === 1 ? matches[0] : undefined)
  if (contactMatch) {
    return { schoolId: contactMatch.school_id as string, existingId: contactMatch.id as string }
  }

  const { data: scores, error: sErr } = await supabase
    .from('academic_scores')
    .select('school_id, student_name')
  if (sErr) console.error('resolveSchoolId scores failed', sErr.message)
  const scoreMatches = (scores ?? []).filter((r) => normalize(r.student_name as string) === target)
  const ownScore = scoreMatches.find((r) => parentSchools.includes(r.school_id as string))
  const scoreMatch = ownScore ?? (scoreMatches.length === 1 ? scoreMatches[0] : undefined)
  if (scoreMatch) return { schoolId: scoreMatch.school_id as string, existingId: null }

  // Unknown student: only assume a school when there is exactly one candidate.
  const uniqueParentSchools = [...new Set(parentSchools.filter(Boolean))]
  if (uniqueParentSchools.length === 1) return { schoolId: uniqueParentSchools[0], existingId: null }

  const schools = await listSchools(supabase)
  if (schools.length === 1) return { schoolId: schools[0], existingId: null }
  return { schoolId: null, existingId: null }
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

// -------------------------------------------------------------- session text --
const CHOOSE_ACTIVE_CHILD =
  'Лутфан интихоб кунед, ки ин амал ба кадом фарзанди шумо тааллуқ дорад:'
const activeChildSet = (name: string) =>
  `👤 Фарзанди фаъол: «${name}». Ҳамаи паёмҳо ба мактаби ҳамин фарзанд мераванд.\n` +
  'Барои иваз кардан: /farzand'
const activeChildLine = (name: string) => `👤 Фарзанди фаъол: «${name}» (иваз: /farzand)`


// ----------------------------------------------------------------- keyboards --
// Telegram caps callback_data at 64 bytes, so payloads carry only short indices.
const rankingKeyboard = (childIdx: number) => ({
  inline_keyboard: [
    [{ text: '#Топ 3', callback_data: `r:${childIdx}:3` }],
    [{ text: 'Ҳаммаҷой', callback_data: `r:${childIdx}:0` }],
  ],
})

const childKeyboard = (children: Child[], prefix: 'p' | 'd' | 'c' | 'a') => ({
  inline_keyboard: children.map((c, i) => [
    { text: c.student_name || '—', callback_data: `${prefix}:${i}` },
  ]),
})


const schoolKeyboard = (labels: string[]) => ({
  inline_keyboard: labels.map((label, i) => [{ text: label, callback_data: `s:${i}` }]),
})

const CHOOSE_SCHOOL = 'Лутфан мактаби фарзанди худро интихоб кунед:'
const schoolLinked = (name: string, grade: string, school: string) =>
  `✅ Хонанда «${name}» (синфи ${grade}) ба мактаби «${school}» пайваст карда шуд.`


// ----------------------------------------------------------------- rankings --
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

async function sendRanking(supabase: DB, chatId: number | string, child: Child, limit: number | null) {
  const [academic, attendance] = await Promise.all([
    buildAcademicRanking(supabase, child.school_id, limit),
    buildAttendanceRanking(supabase, limit),
  ])
  const title = limit ? '🏆 #Топ 3' : '🏆 Рейтинги пурра (Ҳаммаҷой)'
  await sendMessage(chatId, `${title} — ${child.student_name}\n\n${academic}\n\n${attendance}`)
}

// ------------------------------------------------------------ message store --
async function insertMessage(supabase: DB, row: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase.from('messages').insert(row).select('id').maybeSingle()
  if (error) {
    console.error('insertMessage failed', error.message)
    return null
  }
  return (data?.id as string) ?? null
}

// Attach the newest pending message of this chat to the chosen child + school.
async function releasePending(supabase: DB, chatId: string, child: Child) {
  const { data: msg, error } = await supabase
    .from('messages')
    .select('id, sender_name')
    .eq('chat_id', chatId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) console.error('pending lookup failed', error.message)
  if (!msg) return false
  const base = String(msg.sender_name ?? 'Волидайн').replace(/\s*\(волиди.*\)$/, '')
  const { error: upErr } = await supabase
    .from('messages')
    .update({
      sender_name: `${base} (волиди ${child.student_name})`,
      school_id: child.school_id,
      status: 'unread',
    })
    .eq('id', msg.id)
  if (upErr) {
    console.error('release pending message failed', upErr.message)
    return false
  }
  return true
}

// ------------------------------------------------------------------ handlers --
async function handleCallback(supabase: DB, cq: Record<string, any>) {
  const chatId = cq.message?.chat?.id
  const data: string = cq.data ?? ''
  await answerCallback(cq.id)
  if (!chatId) return
  const chatIdStr = String(chatId)
  console.log('callback', { chatIdStr, data })

  const children = await getChildren(supabase, chatIdStr)
  const childAt = (raw: string) => {
    const i = Number(raw)
    return Number.isInteger(i) ? children[i] : undefined
  }

  // r:<childIdx>:<limit>  -> ranking for one child's school
  if (data.startsWith('r:')) {
    const [, idxRaw, limitRaw] = data.split(':')
    const child = childAt(idxRaw)
    if (!child) return void sendMessage(chatId, RANKING_NO_CHILDREN)
    const limit = Number(limitRaw) > 0 ? Number(limitRaw) : null
    await sendRanking(supabase, chatId, child, limit)
    return
  }

  // c:<childIdx> -> child picked for /reyting, now ask for the scope
  if (data.startsWith('c:')) {
    const [, idxRaw] = data.split(':')
    const child = childAt(idxRaw)
    if (!child) return void sendMessage(chatId, RANKING_NO_CHILDREN)
    await setSession(supabase, chatIdStr, child)
    await sendMessage(chatId, RANKING_PROMPT, rankingKeyboard(Number(idxRaw)))
    return
  }

  // a:<childIdx> -> make this child the active session child
  if (data.startsWith('a:')) {
    const child = childAt(data.split(':')[1])
    if (!child) return void sendMessage(chatId, ERROR_GENERIC)
    await setSession(supabase, chatIdStr, child)
    await sendMessage(chatId, activeChildSet(child.student_name))
    return
  }


  // s:<schoolIdx> -> finish a parked registration by binding it to one school
  if (data.startsWith('s:')) {
    const schools = await listSchools(supabase)
    const schoolId = schools[Number(data.split(':')[1])]
    if (!schoolId) return void sendMessage(chatId, ERROR_GENERIC)
    const { data: parked, error: pErr } = await supabase
      .from('parent_contacts')
      .select('id, student_name, grade')
      .eq('chat_id', chatIdStr)
      .eq('school_id', '')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (pErr) console.error('parked lookup failed', pErr.message)
    if (!parked) return void sendMessage(chatId, REGISTER_HELP)
    const { error } = await supabase
      .from('parent_contacts')
      .update({ school_id: schoolId })
      .eq('id', parked.id)
    if (error) {
      console.error('bind parked registration failed', error.message)
      return void sendMessage(chatId, ERROR_GENERIC)
    }
    await sendMessage(
      chatId,
      schoolLinked(
        String(parked.student_name ?? ''),
        String(parked.grade ?? ''),
        await schoolLabel(supabase, schoolId),
      ),
    )
    return
  }

  if (!data.startsWith('d:') && !data.startsWith('p:')) return


  const child = childAt(data.split(':')[1])
  if (!child) return void sendMessage(chatId, ERROR_GENERIC)

  // d:<childIdx> -> unlink child
  if (data.startsWith('d:')) {
    const { error } = await supabase.from('parent_contacts').delete().eq('id', child.id)
    if (error) {
      console.error('delete child failed', error.message)
      await sendMessage(chatId, ERROR_GENERIC)
      return
    }
    const session = await getSession(supabase, chatIdStr)
    if (session?.child_contact_id === child.id) await clearSession(supabase, chatIdStr)
    await sendMessage(chatId, deleteConfirmed(child.student_name))
    return
  }

  // p:<childIdx> -> remember the choice and route the pending message there
  await setSession(supabase, chatIdStr, child)
  await releasePending(supabase, chatIdStr, child)
  await sendMessage(chatId, `${MESSAGE_FORWARDED}\n${activeChildLine(child.student_name)}`)
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
    console.log('update parsed', {
      chatIdStr,
      children: children.length,
      isCommand: text.startsWith('/'),
      text: text.slice(0, 60),
    })

    // Active session child (auto-selected when only one child is linked).
    const active = await activeChild(supabase, chatIdStr, children)
    const activeIdx = active ? children.findIndex((c) => c.id === active.id) : -1

    // ---- commands --------------------------------------------------------
    if (text.startsWith('/start') || text.startsWith('/help')) {
      if (children.length === 0) {
        await sendMessage(chatId, HELP)
      } else {
        await sendMessage(
          chatId,
          helpWithChildren(children.map((c) => c.student_name).filter(Boolean)),
        )
        if (active) await sendMessage(chatId, activeChildLine(active.student_name))
        else await sendMessage(chatId, CHOOSE_ACTIVE_CHILD, childKeyboard(children, 'a'))
      }
      return new Response('ok', { status: 200 })
    }

    // Explicit child switch.
    if (text.startsWith('/farzand') || text.startsWith('/switch') || text.startsWith('/child')) {
      if (children.length === 0) await sendMessage(chatId, DELETE_NO_CHILDREN)
      else await sendMessage(chatId, CHOOSE_ACTIVE_CHILD, childKeyboard(children, 'a'))
      return new Response('ok', { status: 200 })
    }

    if (text.startsWith('/delete')) {
      if (children.length === 0) await sendMessage(chatId, DELETE_NO_CHILDREN)
      else await sendMessage(chatId, DELETE_PROMPT, childKeyboard(children, 'd'))
      return new Response('ok', { status: 200 })
    }

    if (text.startsWith('/reyting') || text.startsWith('/ranking')) {
      if (children.length === 0) await sendMessage(chatId, RANKING_NO_CHILDREN)
      else if (active) await sendMessage(chatId, RANKING_PROMPT, rankingKeyboard(activeIdx))
      else await sendMessage(chatId, CHOOSE_CHILD_RANKING, childKeyboard(children, 'c'))
      return new Response('ok', { status: 200 })
    }

    // ---- voice / audio ---------------------------------------------------
    const voice = message?.voice ?? message?.audio
    if (voice?.file_id && children.length > 0) {
      const mime = message?.voice ? 'audio/ogg' : (voice.mime_type || 'audio/mpeg')
      const audioUrl = await downloadFileAsDataUrl(voice.file_id, mime)
      await insertMessage(supabase, {
        school_id: active ? active.school_id : children[0].school_id,
        sender_name: active ? `${senderName} (волиди ${active.student_name})` : senderName,
        message_content: '🎤 Паёми овозӣ',
        audio_url: audioUrl,
        chat_id: chatIdStr,
        status: active ? 'unread' : 'pending',
      })
      if (active) await sendMessage(chatId, MESSAGE_FORWARDED)
      else await sendMessage(chatId, CHOOSE_CHILD, childKeyboard(children, 'p'))
      return new Response('ok', { status: 200 })
    }

    // ---- new-child registration (strict format) --------------------------
    const parsed = isRegistration(text)

    // A parent with 2+ children and no active selection yet: park the message
    // and ask which child it belongs to (the keyboard never expires).
    if (children.length > 1 && !active && !parsed) {
      await insertMessage(supabase, {
        school_id: children[0].school_id,
        sender_name: senderName,
        message_content: text || '📎 Паём',
        chat_id: chatIdStr,
        status: 'pending',
      })
      await sendMessage(chatId, CHOOSE_CHILD, childKeyboard(children, 'p'))
      return new Response('ok', { status: 200 })
    }


    // Unknown slash commands for single-child / unlinked chats.
    if (text.startsWith('/')) {
      await sendMessage(chatId, HELP)
      return new Response('ok', { status: 200 })
    }

    // ---- free-form message routed to the active session child ------------
    if (active && !parsed) {
      await insertMessage(supabase, {
        school_id: active.school_id,
        sender_name: `${senderName} (волиди ${active.student_name})`,
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
    const { schoolId, existingId } = await resolveSchoolId(
      supabase,
      parsed.name,
      children.map((c) => c.school_id),
    )
    console.log('registration resolved school', { chatIdStr, schoolId, existingId })

    // Ambiguous institution: park the registration (school_id = '') and let the
    // parent pick the school, so nothing lands in a default school's dashboard.
    if (!schoolId) {
      const schools = await listSchools(supabase)
      if (schools.length === 0) {
        await sendMessage(chatId, ERROR_GENERIC)
        return new Response('ok', { status: 200 })
      }
      await supabase.from('parent_contacts').delete().eq('chat_id', chatIdStr).eq('school_id', '')
      const { error } = await supabase.from('parent_contacts').insert({
        school_id: '',
        student_id: `TG-${chatIdStr}-${Date.now()}`,
        student_name: parsed.name,
        chat_id: chatIdStr,
        grade,
      })
      if (error) {
        console.error('park pending registration failed', error.message)
        await sendMessage(chatId, ERROR_GENERIC)
        return new Response('ok', { status: 200 })
      }
      const labels = await Promise.all(schools.map((s) => schoolLabel(supabase, s)))
      await sendMessage(chatId, CHOOSE_SCHOOL, schoolKeyboard(labels))
      return new Response('ok', { status: 200 })
    }


    if (existingId) {
      const { error } = await supabase
        .from('parent_contacts')
        .update({ chat_id: chatIdStr, grade })
        .eq('id', existingId)
      if (error) {
        console.error('link existing student failed', error.message)
        await sendMessage(chatId, ERROR_GENERIC)
        return new Response('ok', { status: 200 })
      }
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
