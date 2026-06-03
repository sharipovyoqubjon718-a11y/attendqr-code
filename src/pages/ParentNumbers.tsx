import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Save, Link2, Link2Off } from "lucide-react";
import { toast } from "sonner";
import { getStudents, type Student } from "@/lib/store";
import { getActiveSchool, getSelectedSchool } from "@/lib/schools";
import { CLASSES, PARALLELS, matchesClassParallel } from "@/lib/classes";
import { fetchParentContacts, saveParentContact } from "@/lib/parents";
import { useI18n } from "@/lib/i18n";

export default function ParentNumbers() {
  const { t } = useI18n();
  const school = getActiveSchool() || getSelectedSchool();
  const [students] = useState<Student[]>(() => getStudents());
  const [cls, setCls] = useState("");
  const [parallel, setParallel] = useState("");
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [linked, setLinked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const ready = !!cls && !!parallel;

  const roster = useMemo(() => {
    if (!ready) return [];
    return students
      .filter((s) => matchesClassParallel(s.grade, cls, parallel))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [students, cls, parallel, ready]);

  useEffect(() => {
    fetchParentContacts().then((map) => {
      const nextPhones: Record<string, string> = {};
      const nextLinked: Record<string, boolean> = {};
      for (const [sid, c] of Object.entries(map)) {
        nextPhones[sid] = c.phone || "";
        nextLinked[sid] = !!c.chat_id;
      }
      setPhones((prev) => ({ ...nextPhones, ...prev }));
      setLinked(nextLinked);
    });
  }, []);

  const handleSave = async (s: Student) => {
    setSaving(s.id);
    const ok = await saveParentContact({
      student_id: s.id,
      student_name: s.name,
      phone: phones[s.id] || "",
    });
    setSaving(null);
    if (ok) toast.success(t("parents.saved"));
    else toast.error(t("parents.saveError"));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="bg-white dark:bg-card border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" /> {t("parents.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </CardContent>
      </Card>

      {!ready ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("parents.selectHint")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{school.name} · {roster.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">{t("parents.studentName")}</TableHead>
                    <TableHead className="font-semibold">{t("parents.phone")}</TableHead>
                    <TableHead className="font-semibold">{t("parents.status")}</TableHead>
                    <TableHead className="font-semibold text-right">{t("parents.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Input
                          value={phones[s.id] ?? ""}
                          onChange={(e) => setPhones((p) => ({ ...p, [s.id]: e.target.value }))}
                          placeholder={t("parents.phonePlaceholder")}
                          inputMode="tel"
                          className="max-w-xs"
                        />
                      </TableCell>
                      <TableCell>
                        {linked[s.id] ? (
                          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <Link2 className="h-3 w-3" /> {t("parents.linked")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <Link2Off className="h-3 w-3" /> {t("parents.notLinked")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleSave(s)} disabled={saving === s.id} className="gap-1">
                          <Save className="h-4 w-4" /> {t("parents.save")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {roster.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">{t("parents.noStudents")}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
