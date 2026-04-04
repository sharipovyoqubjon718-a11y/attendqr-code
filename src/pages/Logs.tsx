import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getLogs, getStudents, formatTajikTime } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

export default function Logs() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const logs = useMemo(() => getLogs(), []);
  const students = useMemo(() => {
    const map = new Map<string, string>();
    getStudents().forEach(s => map.set(s.id, s.name));
    return map;
  }, []);

  const filtered = useMemo(
    () => logs.filter(l => {
      const name = students.get(l.studentId) || '';
      return name.toLowerCase().includes(search.toLowerCase()) ||
        l.studentId.toLowerCase().includes(search.toLowerCase());
    }),
    [logs, search, students]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{t("logs.title")}</h2>
        <p className="text-muted-foreground">{logs.length} {t("logs.records")}</p>
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
              {filtered.slice(0, 100).map((log) => (
                <TableRow key={log.id} className="animate-fade-in">
                  <TableCell className="font-mono text-xs">{log.studentId}</TableCell>
                  <TableCell className="font-medium text-sm">{students.get(log.studentId) || t("logs.unknown")}</TableCell>
                  <TableCell>
                    <Badge variant={log.type === 'check-in' ? 'secondary' : 'outline'}>
                      {log.type === 'check-in' ? t("scanner.checkin") : t("scanner.checkout")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatTajikTime(log.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 100 && (
          <div className="p-3 text-center text-sm text-muted-foreground border-t">
            100 {t("common.of")} {filtered.length} {t("logs.showing")}
          </div>
        )}
      </div>
    </div>
  );
}
