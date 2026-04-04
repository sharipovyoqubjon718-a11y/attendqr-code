import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getBlacklistedStudents } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

export default function Blacklist() {
  const { t } = useI18n();
  const blacklisted = useMemo(() => getBlacklistedStudents(3), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">{t("blacklist.title")}</h2>
          <p className="text-muted-foreground">{t("blacklist.subtitle")}</p>
        </div>
      </div>

      {blacklisted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t("blacklist.empty")}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-destructive/5">
                  <TableHead className="font-semibold">{t("th.id")}</TableHead>
                  <TableHead className="font-semibold">{t("th.name")}</TableHead>
                  <TableHead className="font-semibold">{t("th.grade")}</TableHead>
                  <TableHead className="font-semibold">{t("blacklist.absentDays")}</TableHead>
                  <TableHead className="font-semibold">{t("blacklist.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklisted.map((s) => (
                  <TableRow key={s.id} className="bg-destructive/[0.02] animate-fade-in">
                    <TableCell className="font-mono text-sm">{s.id}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><Badge variant="secondary">{s.grade}</Badge></TableCell>
                    <TableCell>
                      <span className="font-bold text-destructive">{s.absentDays}</span>
                      <span className="text-muted-foreground text-sm"> / 7 {t("blacklist.days")}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {s.absentDays >= 5 ? t("blacklist.critical") : t("blacklist.warning")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 text-sm text-muted-foreground border-t">
            {blacklisted.length} {t("blacklist.recorded")}
          </div>
        </div>
      )}
    </div>
  );
}
