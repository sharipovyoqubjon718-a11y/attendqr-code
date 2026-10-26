// Донишафрӯз — саҳифаи чати омӯзгори зеҳнӣ (як сӯҳбат, бе нигоҳдорӣ).
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { BrainCircuit, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { role: "user" | "assistant"; content: string };
const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/donishafruz-chat`;

export default function Donishafruz() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Хатогӣ ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]);
            }
          } catch { /* сатри нопурра */ }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessages((m) => (m[m.length - 1]?.role === "assistant" && !m[m.length - 1].content ? m.slice(0, -1) : m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark mx-auto flex h-[calc(100vh-11rem)] max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 shadow-[0_0_16px_hsl(270_90%_60%/0.5)]">
          <BrainCircuit className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold">Донишафрӯз</h2>
          <p className="text-xs text-muted-foreground">Омӯзгори зеҳнӣ барои синфҳои 1–11</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => { setMessages([]); setError(null); }} title="Сӯҳбати нав">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-10 text-center text-sm text-muted-foreground">
            Салом! Ман Донишафрӯз ҳастам. Саволи худро нависед ва синфатонро гӯед 📚
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {m.role === "user" ? (
              <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2 text-sm text-primary-foreground">
                {m.content}
              </div>
            ) : (
              <div className="prose prose-sm prose-invert max-w-[90%] text-sm leading-relaxed">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" /> Донишафрӯз фикр мекунад...
          </div>
        )}
        {error && <div className="rounded-md bg-destructive/20 px-3 py-2 text-sm text-destructive">{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Саволатонро нависед..."
          rows={1}
          className="max-h-32 min-h-[44px] resize-none bg-muted"
        />
        <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0 bg-violet-600 hover:bg-violet-500">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
