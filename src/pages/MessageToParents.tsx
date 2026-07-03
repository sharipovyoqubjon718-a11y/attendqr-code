import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Send, MessageSquare, Paperclip, X } from "lucide-react";
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
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleSend = async (s: Student) => {
    const text = (messages[s.id] || "").trim();
    if (!text) { toast.error(t("msg.empty")); return; }
    const chatId = contacts[s.id]?.chat_id || contacts[s.id]?.phone || "";
    if (!chatId) { toast.error(t("msg.noChatId")); return; }
    setSending(s.id);
    const res = await sendParentMessage(chatId, text);
    setSending(null);
    if (res.ok) {
      toast.success(t("msg.sent"));
      setMessages((p) => ({ ...p, [s.id]: "" }));
    } else {
      toast.error(res.error || t("msg.sendError"));
    }
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
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleSend(s)}
                      disabled={sending === s.id}
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
