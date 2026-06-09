import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageSquare, CheckCheck, WifiOff, RefreshCw, Inbox, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMessages, markMessageRead, markAllMessagesRead, clearAllMessages, type Message } from "@/lib/messages";
import { getActiveSchoolId, getSelectedSchoolId } from "@/lib/schools";
import { useI18n } from "@/lib/i18n";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function Messages() {
  const { t } = useI18n();
  const schoolId = getActiveSchoolId() || getSelectedSchoolId() || "gdbh";
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchMessages();
      setMessages(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh whenever a message row changes for this school.
  useEffect(() => {
    const channel = supabase
      .channel("messages-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `school_id=eq.${schoolId}` },
        () => {
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, load]);

  const handleRead = async (m: Message) => {
    if (m.status === "read") return;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "read" } : x)));
    await markMessageRead(m.id);
  };

  const handleReadAll = async () => {
    setMessages((prev) => prev.map((x) => ({ ...x, status: "read" })));
    await markAllMessagesRead();
    toast.success(t("messages.allRead"));
  };

  const handleClear = async () => {
    try {
      await clearAllMessages();
      setMessages([]);
      toast.success(t("messages.cleared"));
    } catch {
      toast.error(t("conn.lost"));
    }
  };

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">{t("messages.title")}</h1>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> {t("conn.retry")}
          </Button>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleReadAll}>
              <CheckCheck className="h-4 w-4 mr-1" /> {t("messages.markAll")}
            </Button>
          )}
        </div>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <WifiOff className="h-8 w-8 text-destructive" />
            <p className="text-muted-foreground">{t("conn.lost")}</p>
            <Button onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" /> {t("conn.retry")}
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="text-muted-foreground text-center py-10">…</p>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p>{t("messages.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[70vh] pr-2">
          <div className="space-y-2">
            {messages.map((m) => (
              <Card
                key={m.id}
                onClick={() => handleRead(m)}
                className={`cursor-pointer transition-colors ${
                  m.status === "unread" ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {m.status === "unread" && <span className="h-2 w-2 rounded-full bg-primary" />}
                      {m.sender_name || t("messages.unknown")}
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground">{timeAgo(m.timestamp)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3 text-sm whitespace-pre-wrap break-words">
                  {m.message_content}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
