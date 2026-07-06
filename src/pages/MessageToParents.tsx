import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Send, MessageSquare, Paperclip, X, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { getStudents, type Student } from "@/lib/store";
import { getActiveSchool, getSelectedSchool } from "@/lib/schools";
import { CLASSES, PARALLELS, matchesClassParallel } from "@/lib/classes";
import { fetchParentContacts, sendParentMessage, type ParentContact } from "@/lib/parents";
import { useI18n } from "@/lib/i18n";

type Attachment = { base64: string; name: string; type: string };

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function MessageToParents() {
  const { t } = useI18n();
  const school = getActiveSchool() || getSelectedSchool();
  const [students] = useState<Student[]>(() => getStudents());
  const [cls, setCls] = useState("");
  const [parallel, setParallel] = useState("");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Record<string, ParentContact>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, Attachment>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const ready = !!cls && !!parallel;

  useEffect(() => {
    fetchParentContacts().then(setContacts);
  }, []);

  const roster = useMemo(() => {
    if (!ready) return [];
    return students
      .filter((s) => matchesClassParallel(s.grade, cls, parallel))
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [students, cls, parallel, ready, search]);

  const handleFile = async (studentId: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { toast.error(t("msg.fileTooBig")); return; }
    try {
      const base64 = await readFileAsBase64(file);
      setAttachments((p) => ({ ...p, [studentId]: { base64, name: file.name, type: file.type } }));
    } catch {
      toast.error(t("msg.sendError"));
    }
  };

  const handleSend = async (s: Student) => {
    const text = (messages[s.id] || "").trim();
    const file = attachments[s.id];
    if (!text && !file) { toast.error(t("msg.empty")); return; }
    const chatId = contacts[s.id]?.chat_id || contacts[s.id]?.phone || "";
    // Prevention: never attempt to send when there is no chat_id.
    if (!chatId) { toast.error(t("msg.noChatId")); return; }
    setSending(s.id);
    const res = await sendParentMessage(chatId, text, file);
    setSending(null);
    if (res.ok) {
      toast.success(t("msg.sent"));
      setMessages((p) => ({ ...p, [s.id]: "" }));
      setAttachments((p) => { const n = { ...p }; delete n[s.id]; return n; });
    } else {
      toast.error(res.error || t("msg.sendError"));
      // The Edge Function nullifies chat_id on "chat not found" / blocked errors.
      // Re-fetch so the UI immediately shows "Chat ID сабт нашудааст" and disables Send.
      fetchParentContacts().then(setContacts);
    }
  };

  const sendVoiceNote = async (s: Student, blob: Blob) => {
    const chatId = contacts[s.id]?.chat_id || contacts[s.id]?.phone || "";
    if (!chatId) { toast.error(t("msg.noChatId")); return; }
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    setSending(s.id);
    const res = await sendParentMessage(chatId, "", {
      base64,
      name: "voice.ogg",
      type: "audio/ogg",
    });
    setSending(null);
    if (res.ok) {
      toast.success(t("msg.voiceSent"));
    } else {
      toast.error(res.error || t("msg.sendError"));
      fetchParentContacts().then(setContacts);
    }
  };

  const startRecording = async (s: Student) => {
    if (recordingId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((tk) => tk.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/ogg" });
        void sendVoiceNote(s, blob);
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecordingId(s.id);
    } catch {
      toast.error(t("msg.micError"));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecordingId(null);
  };


  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="bg-white dark:bg-card border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> {t("msg.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("parents.class")}</Label>
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger><SelectValue placeholder={t("parents.select")} /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("parents.parallel")}</Label>
              <Select value={parallel} onValueChange={setParallel} disabled={!cls}>
                <SelectTrigger><SelectValue placeholder="-, А, Б, В..." /></SelectTrigger>
                <SelectContent>
                  {PARALLELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {ready && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("msg.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {!ready ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("parents.selectHint")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {roster.map((s) => {
            const hasChat = !!(contacts[s.id]?.chat_id || contacts[s.id]?.phone);
            return (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    {!hasChat && <span className="text-xs text-destructive">{t("msg.noChatId")}</span>}
                  </div>
                  <Textarea
                    value={messages[s.id] ?? ""}
                    onChange={(e) => setMessages((p) => ({ ...p, [s.id]: e.target.value }))}
                    placeholder={t("msg.placeholder")}
                    rows={2}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        ref={(el) => { fileInputs.current[s.id] = el; }}
                        type="file"
                        className="hidden"
                        onChange={(e) => { void handleFile(s.id, e.target.files?.[0]); e.target.value = ""; }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputs.current[s.id]?.click()}
                        className="gap-1"
                      >
                        <Paperclip className="h-4 w-4" /> {t("msg.attach")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={recordingId === s.id ? "destructive" : "outline"}
                        disabled={!hasChat || (recordingId !== null && recordingId !== s.id) || sending === s.id}
                        onClick={() => (recordingId === s.id ? stopRecording() : startRecording(s))}
                        className="gap-1"
                      >
                        {recordingId === s.id ? (
                          <><Square className="h-4 w-4" /> {t("msg.stopRec")}</>
                        ) : (
                          <><Mic className="h-4 w-4" /> {t("msg.record")}</>
                        )}
                      </Button>
                      {attachments[s.id] && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <span className="truncate max-w-[120px]">{attachments[s.id].name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachments((p) => { const n = { ...p }; delete n[s.id]; return n; })}
                            className="text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSend(s)}
                      disabled={sending === s.id || !hasChat}
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send className="h-4 w-4" /> {t("msg.send")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {roster.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">{t("parents.noStudents")}</CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
