import { useState, useMemo, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getLogs, getStudents, formatTajikTime, type AttendanceLog } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const MONTHS: Record<string, string[]> = {
  tj: ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"],
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const LABELS: Record<string, { day: string; month: string; year: string; all: string; reset: string; absent: string; present: string }> = {
  tj: { day: "Рӯз", month: "Моҳ", year: "Сол", all: "Ҳама", reset: "Тоза кардан", absent: "Ғоиб", present: "Ҳозир" },
  ru: { day: "День", month: "Месяц", year: "Год", all: "Все", reset: "Сбросить", absent: "Отсутствует", present: "Присутствует" },
  en: { day: "Day", month: "Month", year: "Year", all: "All", reset: "Reset", absent: "Absent", present: "Present" },
};

const ALL = "all";

type Row = {
  id: string;
  studentId: string;
  type: string;
  timestamp: string;
};

export default function Logs() {
  const { t, lang } = useI18n();
  const L = LABELS[lang] ?? LABELS.tj;
  const monthNames = MONTHS[lang] ?? MONTHS.tj;

  const [search, setSearch] = useState("");
  const now = new Date();
  const [day, setDay] = useState<string>(ALL);
  const [month, setMonth] = useState<string>(ALL);
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [remote, setRemote] = useState<Row[]>([]);

  const localLogs = useMemo<AttendanceLog[]>(() => getLogs(), []);
  const students = useMemo(() => getStudents(), []);
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [students]);

  // Pull the matching records straight from the database so history persists
  // beyond this device. Local records are merged in as a fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let q = supabase.from("attendance_logs").select("id, student_id, type, timestamp");
        const y = Number(year);
        if (!Number.isNaN(y) && year.length === 4) {
          const m = month === ALL ? null : Number(month);
          const d = day === ALL ? null : Number(day);
          let start: Date;
          let end: Date;
          if (m !== null && d !== null) {
            start = new Date(y, m, d, 0, 0, 0);
            end = new Date(y, m, d, 23, 59, 59, 999);
          } else if (m !== null) {
            start = new Date(y, m, 1);
            end = new Date(y, m + 1, 0, 23, 59, 59, 999);
          } else {
            start = new Date(y, 0, 1);
            end = new Date(y, 11, 31, 23, 59, 59, 999);
          }
          q = q.gte("timestamp", start.toISOString()).lte("timestamp", end.toISOString());
        }
        const { data } = await q.order("timestamp", { ascending: false }).limit(2000);
        if (!cancelled && data) {
          setRemote(
            data.map((r) => ({
              id: r.id as string,
              studentId: r.student_id as string,
              type: r.type as string,
              timestamp: r.timestamp as string,
            })),
          );
        }
      } catch {
        if (!cancelled) setRemote([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day, month, year]);

  const matchesDate = (iso: string) => {
    const d = new Date(iso);
    if (year.length === 4 && !Number.isNaN(Number(year)) && d.getFullYear() !== Number(year)) return false;
    if (month !== ALL && d.getMonth() !== Number(month)) return false;
    if (day !== ALL && d.getDate() !== Number(day)) return false;
    return true;
  };

  const merged = useMemo(() => {
    const byId = new Map<string, Row>();
    for (const r of remote) byId.set(r.id, r);
    for (const l of localLogs) {
      if (!byId.has(l.id) && matchesDate(l.timestamp)) {
        byId.set(l.id, { id: l.id, studentId: l.studentId, type: l.type, timestamp: l.timestamp });
      }
    }
    return [...byId.values()]
      .filter((r) => matchesDate(r.timestamp))
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [remote, localLogs, day, month, year]);

  // When one exact date is selected, also list the students who never checked in
  // that day as absent (ғоиб) so the log shows the full picture.
  const absentRows = useMemo(() => {
    if (day === ALL || month === ALL || year.length !== 4) return [];
    const present = new Set(merged.filter((r) => r.type === "check-in").map((r) => r.studentId));
    return students
      .filter((s) => !present.has(s.id))
      .map((s) => ({ id: `absent-${s.id}`, studentId: s.id, type: "absent", timestamp: "" }));
  }, [merged, students, day, month, year]);

  const all = useMemo(() => [...merged, ...absentRows], [merged, absentRows]);

  const filtered = useMemo(
    () =>
      all.filter((l) => {
        const name = nameById.get(l.studentId) || "";
        const q = search.toLowerCase();
        return name.toLowerCase().includes(q) || l.studentId.toLowerCase().includes(q);
      }),
    [all, search, nameById],
  );

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{t("logs.title")}</h2>
        <p className="text-muted-foreground">{filtered.length} {t("logs.records")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{L.day}</label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{L.all}</SelectItem>
              {days.map((d) => (
                <SelectItem key={d} value={String(d)}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{L.month}</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{L.all}</SelectItem>
              {monthNames.map((m, i) => (
                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{L.year}</label>
          <Input
            className="w-[110px]"
            inputMode="numeric"
            maxLength={4}
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => { setDay(ALL); setMonth(ALL); setYear(String(new Date().getFullYear())); }}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          {L.reset}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("logs.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-lg overflow-hidden glass-card">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">{t("th.id")}</TableHead>
                <TableHead className="font-semibold">{t("th.name")}</TableHead>
                <TableHead className="font-semibold">{t("logs.type")}</TableHead>
                <TableHead className="font-semibold">{t("logs.datetime")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((log) => (
                <TableRow key={log.id} className="animate-fade-in">
                  <TableCell className="font-mono text-xs">{log.studentId}</TableCell>
                  <TableCell className="font-medium text-sm">{nameById.get(log.studentId) || t("logs.unknown")}</TableCell>
                  <TableCell>
                    <Badge
                      variant={log.type === "check-in" ? "secondary" : log.type === "absent" ? "destructive" : "outline"}
                    >
                      {log.type === "check-in"
                        ? t("scanner.checkin")
                        : log.type === "absent"
                          ? L.absent
                          : t("scanner.checkout")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.timestamp ? formatTajikTime(log.timestamp) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 200 && (
          <div className="p-3 text-center text-sm text-muted-foreground border-t">
            200 {t("common.of")} {filtered.length} {t("logs.showing")}
          </div>
        )}
      </div>
    </div>
  );
}
