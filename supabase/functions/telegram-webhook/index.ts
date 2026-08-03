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

const DELETE_NO_CHILDREN = 'Шумо ҳоло ягон фарзанди пайвастшуда надоред.'
const DELETE_PROMPT = 'Кадом фарзандро аз рӯйхат пок кардан мехоҳед? Лутфан аз рӯйхати зер интихоб кунед:'
const deleteConfirmed = (name: string) =>
  `✅ Фарзанди шумо «${name}» бо муваффақият аз рӯйхат пок карда шуд.`

// Multi-child parents: the message is stored in the DB immediately and the
// chosen child is attached later, so inline-keyboard selections NEVER expire.

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

const MONTH_NAMES = [
  'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
  'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр',
]

const RANKING_PROMPT = '📊 Рейтингро интихоб кунед:'
const rankingKeyboard = () => ({
  inline_keyboard: [
    [{ text: '#Топ 3', callback_data: 'rey:top3' }],
    [{ text: 'Ҳаммаҷой', callback_data: 'rey:all' }],
  ],
})

function medalLine(i: number, text: string): string {
  const medals = ['🥇', '🥈', '🥉']
  return `${medals[i] ?? `${i + 1}.`} ${text}`
}

// Academic ranking ("Беҳтарин хонандагон") from the electronic grade journal.
async function buildAcademicRanking(
  supabase: ReturnType<typeof createClient>,
  schoolId: string,
  limit: number | null,
): Promise<string> {
  const header = '📚 Беҳтарин хонандагон\n'
  try {
    const { data } = await supabase
      .from('academic_scores')
      .select('student_name, points, avg_grade, total_grades')
      .eq('school_id', schoolId)
      .order('points', { ascending: false })
      .limit(limit ?? 200)
    const rows = data ?? []
    if (rows.length === 0) return header + '\nҲоло маълумоти журнал мавҷуд нест.'
    const lines = rows.map((r, i) =>
      medalLine(i, `${r.student_name} — ${r.points} хол (миёна ${r.avg_grade})`),
    )
    return header + '\n' + lines.join('\n')
  } catch {
    return header + '\nМаълумот дастрас нест.'
  }
}

// Attendance ranking ("Беҳтарин иштироккунандагони дарс") for the current month.
async function buildAttendanceRanking(
  supabase: ReturnType<typeof createClient>,
  _schoolId: string,
  limit: number | null,
): Promise<string> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const header = `🏃 Беҳтарин иштироккунандагони дарс — ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}\n`

  const { data: students } = await supabase.from('students').select('id, name')
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('student_id, type, timestamp')
    .gte('timestamp', monthStart)
    .eq('type', 'check-in')

  const nameById = new Map<string, string>()
  for (const s of students ?? []) nameById.set(s.id as string, s.name as string)

  const days = new Map<string, Set<string>>()
  for (const l of logs ?? []) {
    const sid = l.student_id as string
    if (!nameById.has(sid)) continue
    const dayKey = String(l.timestamp).slice(0, 10)
    if (!days.has(sid)) days.set(sid, new Set())
    days.get(sid)!.add(dayKey)
  }

  const ranked = [...days.entries()]
    .map(([sid, set]) => ({ name: nameById.get(sid) ?? sid, count: set.size }))
    .sort((a, b) => b.count - a.count)

  if (ranked.length === 0) return header + '\nҲоло барои ин моҳ маълумоти ҳузур мавҷуд нест.'
  const list = limit ? ranked.slice(0, limit) : ranked
  return header + '\n' + list.map((r, i) => medalLine(i, `${r.name} — ${r.count} рӯз`)).join('\n')
}

async function buildRankingReply(
  supabase: ReturnType<typeof createClient>,
  schoolId: string,
  limit: number | null,
): Promise<string> {
  const academic = await buildAcademicRanking(supabase, schoolId, limit)
  const attendance = await buildAttendanceRanking(supabase, schoolId, limit)
  const title = limit ? '🏆 #Топ 3\n\n' : '🏆 Рейтинги пурра (Ҳаммаҷой)\n\n'
  return title + academic + '\n\n' + attendance
}


// Store an incoming parent message right away (child attached after selection).
async function storePending(
  supabase: ReturnType<typeof createClient>,
  schoolId: string,
  chatIdStr: string,
  senderName: string,
  text: string,
  audioUrl: string | null,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('messages')
      .insert({
        school_id: schoolId,
        sender_name: senderName,
        message_content: text,
        audio_url: audioUrl,
        chat_id: chatIdStr,
        status: 'unread',
      })
      .select('id')
      .maybeSingle()
    return (data?.id as string) ?? null
  } catch {
    return null
  }
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

      // Ranking selection — never expires.
      if (cqChatId && data.startsWith('rey:')) {
        const supabaseRey = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        let schoolId = 'gdbh'
        try {
          const { data: row } = await supabaseRey
            .from('parent_contacts')
            .select('school_id')
            .eq('chat_id', String(cqChatId))
            .limit(1)
            .maybeSingle()
          if (row?.school_id) schoolId = row.school_id as string
        } catch {
          // keep the default school
        }
        const limit = data === 'rey:top3' ? 3 : null
        const reply = await buildRankingReply(supabaseRey, schoolId, limit)
        await sendMessage(token, cqChatId, reply)
        return new Response('ok', { status: 200 })
      }

      if (cqChatId && (data.startsWith('del:') || data.startsWith('pick:'))) {

        const parts = data.split(':')
        const rowId = parts[1] ?? ''
        const pendingMessageId = parts[2] ?? ''
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
          } else if (row && pendingMessageId) {
            // Child selected — attach the child's name to the stored message.
            const { data: msg } = await supabaseCb
              .from('messages')
              .select('id, sender_name')
              .eq('id', pendingMessageId)
              .maybeSingle()
            if (msg) {
              const base = String(msg.sender_name ?? 'Волидайн').replace(/\s*\(волиди.*\)$/, '')
              await supabaseCb
                .from('messages')
                .update({ sender_name: `${base} (волиди ${row.student_name})` })
                .eq('id', msg.id)
            }
            await sendMessage(token, cqChatId, MESSAGE_FORWARDED)
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

    // Inline keyboard forcing the parent to pick one of several children.
    const childKeyboard = (messageId: string | null) => ({
      inline_keyboard: children.map((c) => [
        { text: c.student_name || '—', callback_data: `pick:${c.id}:${messageId ?? ''}` },
      ]),
    })

    // ---- Voice / audio message from a registered parent -> forward to app ----
    const voice = message?.voice ?? message?.audio
    if (voice?.file_id && children.length > 0) {
      const mime = message?.voice ? 'audio/ogg' : (voice?.mime_type || 'audio/mpeg')
      const dataUrl = await downloadFileAsDataUrl(token, voice.file_id, mime)
      if (children.length > 1) {
        const msgId = await storePending(supabase, children[0].school_id as string, chatIdStr, senderTgName, '🎤 Паёми овозӣ', dataUrl)
        await sendMessage(token, chatId, CHOOSE_CHILD, childKeyboard(msgId))
        return new Response('ok', { status: 200 })
      }
      const child = children[0]
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


    // ---- /reyting: offer "#Топ 3" or "Ҳаммаҷой" via inline keyboard --------
    if (text.startsWith('/reyting') || text.startsWith('/ranking')) {
      await sendMessage(token, chatId, RANKING_PROMPT, rankingKeyboard())
      return new Response('ok', { status: 200 })
    }


    // Ignore any other slash command.
    if (text.startsWith('/')) return new Response('ok', { status: 200 })

    // ---- Registration: parse "[Name] [Class] [Parallel]" -----------------
    const parsed = parseRegistration(text)

    // Registered parent sending a free-form message -> forward to the app.
    // A message that doesn't parse as a registration is treated as a chat.
    if (children.length > 0 && !parsed) {
      if (children.length > 1) {
        const msgId = await storePending(supabase, children[0].school_id as string, chatIdStr, senderTgName, text, null)
        await sendMessage(token, chatId, CHOOSE_CHILD, childKeyboard(msgId))
        return new Response('ok', { status: 200 })
      }
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
