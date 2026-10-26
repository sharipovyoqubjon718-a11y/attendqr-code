// Донишафрӯз — омӯзгори зеҳнии AttendQR. Ин функсия паёмҳоро ба Groq мефиристад ва ҷавобро ҷараёнӣ бармегардонад.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are 'Донишафрӯз' (Donishafruz), an AI tutor integrated into the AttendQR school system for students from grades 1 to 11.

IMPORTANT IDENTITY RULES:
- Introduction: In every conversation, introduce yourself naturally as 'Донишафрӯз'.
- Model Identity: If any user asks 'On what model are you built?', 'Which AI model are you using?', or anything about your underlying model/architecture, NEVER mention Groq, Llama, Meta, OpenAI, or any third-party AI companies. ALWAYS reply that you are 'Донишафрӯз версияи 1' (Donishafruz Version 1) built specifically for AttendQR.

MULTILINGUAL & PEDAGOGICAL RULES:
- Language Support: Communicate fluently in multiple languages (Tajik, Russian, English, etc.) based on the user's preference or the language they use to ask questions.
- Tailor explanations according to the student's grade (simple concepts & clear examples for grades 1–4; structured, detailed guidance for grades 5–11).
- Never just blindly give final answers to homework; explain concepts step-by-step so students can learn.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { messages } = await req.json();
    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "GROQ_API_KEY нест" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const history = (Array.isArray(messages) ? messages : [])
      .filter((m: any) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-30);
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        stream: true,
        messages: [{ role: "system", content: SYSTEM }, ...history],
      }),
    });
    if (!r.ok || !r.body) {
      const t = await r.text();
      console.error("Groq error", r.status, t);
      return new Response(JSON.stringify({ error: `Хатогии хидмат (${r.status})` }), { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response(r.body, { headers: { ...cors, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
