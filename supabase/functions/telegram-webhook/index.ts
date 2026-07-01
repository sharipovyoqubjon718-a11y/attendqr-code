import { createClient } from 'npm:@supabase/supabase-js@2'

// ---- Exact Tajik reply templates (Section 2) ---------------------------------
const WELCOME_NO_CHILDREN =
  '👋 Салом! Хуш омадед ба системаи AttendQR. Барои пайваст кардани ҳисоби фарзандатон, лутфан маълумотро чунин нависед: [Ному насаб] [Синф] [Параллел]. (Намуна: Алиев Аҳмад 5 а)'

const welcomeWithChildren = (names: string[]) =>
  `👋 Салом! Рӯйхати хонандагони шумо: ${names.join(', ')}. Барои иловаи фарзанди нав маълумоти ӯро нависед.`

const REGISTER_HELP =
  'Лутфан маълумотро чунин нависед: [Ному насаб] [Синф] [Параллел]. (Намуна: Алиев Аҳмад 5 а)'

const registered = (name: string, grade: string) =>
  `✅ Хонанда «${name}» (синфи ${grade}) бомуваффақият пайваст карда шуд.`

async function sendMessage(token: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch {
    // never let a send failure surface a non-2xx to Telegram
  }
}

// Normalise a parallel letter to uppercase (Cyrillic/Tajik).
function normLetter(s: string): string {
  return (s || '').trim().toUpperCase()
}

// Parse "[Ному насаб] [Синф] [Параллел]" -> { name, cls, letter }.
// The class is the first standalone number token; the name is everything
// before it; the parallel is the single letter right after the number.
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

// IMPORTANT: this handler ALWAYS returns HTTP 200 so Telegram never retries.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('ok', { status: 200 })

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

    // All children currently linked to this Telegram ID (multi-child support).
    const { data: linkedRows } = await supabase
      .from('parent_contacts')
      .select('id, school_id, student_id, student_name')
      .eq('chat_id', chatIdStr)

    const children = linkedRows ?? []

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

    // Ignore any other slash command.
    if (text.startsWith('/')) return new Response('ok', { status: 200 })

    // ---- Registration: parse "[Name] [Class] [Parallel]" -----------------
    const parsed = parseRegistration(text)
    if (!parsed) {
      await sendMessage(token, chatId, REGISTER_HELP)
      return new Response('ok', { status: 200 })
    }

    const grade = makeGrade(parsed.cls, parsed.letter)
    const schoolId = (children[0]?.school_id as string) || 'gdbh'
    const studentId = `TG-${chatIdStr}-${Date.now()}`

    try {
      await supabase.from('parent_contacts').insert({
        school_id: schoolId,
        student_id: studentId,
        student_name: parsed.name,
        chat_id: chatIdStr,
        grade,
      })
    } catch {
      // ignore insert failures so Telegram never sees a non-2xx response
    }

    await sendMessage(token, chatId, registered(parsed.name, grade))
    return new Response('ok', { status: 200 })
  } catch {
    return new Response('ok', { status: 200 })
  }
})
