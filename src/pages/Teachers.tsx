import { useState } from "react";
import { GraduationCap, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CLASSES, PARALLELS } from "@/lib/classes";
import { useI18n } from "@/lib/i18n";
import {
  addTeacher, deleteTeacher, getTeachers, supervisorLabel, updateTeacher, type Teacher,
} from "@/lib/teachers";
import { toast } from "sonner";

const emptyForm = { fullName: "", subject: "", isSupervisor: false, grade: "", parallel: "-", website: "" };

export default function Teachers() {
  const { t } = useI18n();
  const [list, setList] = useState<Teacher[]>(getTeachers());
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Teacher | null>(null);

  const refresh = () => setList(getTeachers());

  const handleAdd = () => {
    if (form.website) return;
    const res = addTeacher({
      fullName: form.fullName,
      subject: form.subject,
      isSupervisor: form.isSupervisor,
      grade: form.grade,
      parallel: form.parallel,
    });
    if (res.error === "missing") return toast.error(t("admin.fillAll"));
    if (res.error === "missing-class") return toast.error(t("teachers.pickClass"));
    setForm(emptyForm);
    setShowForm(false);
    refresh();
    toast.success(t("teachers.added"));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteTeacher(pendingDelete.id);
    setPendingDelete(null);
    refresh();
    toast.success(t("teachers.deleted"));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display text-xl font-bold">{t("teachers.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("teachers.subtitle")}</p>
        </div>
      </div>

      <Button size="sm" className="w-full gap-2" onClick={() => setShowForm((v) => !v)}>
        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showForm ? t("edit.cancel") : t("teachers.add")}
      </Button>

      {showForm && (
        <form
          className="glass-card p-5 space-y-3"
          autoComplete="off"
          onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
        >
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden
            className="hidden" value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("teachers.fullName")}</Label>
            <Input value={form.fullName} maxLength={120} autoComplete="off"
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("teachers.subject")}</Label>
            <Input value={form.subject} maxLength={80} autoComplete="off"
              onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
            <Label className="text-xs">{t("teachers.supervisor")}</Label>
            <Switch
              checked={form.isSupervisor}
              onCheckedChange={(v) => setForm({ ...form, isSupervisor: v })}
            />
          </div>
          {form.isSupervisor && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("parents.class")}</Label>
                <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                  <SelectTrigger><SelectValue placeholder={t("parents.select")} /></SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("parents.parallel")}</Label>
                <Select value={form.parallel} onValueChange={(v) => setForm({ ...form, parallel: v })}>
                  <SelectTrigger><SelectValue placeholder={t("parents.select")} /></SelectTrigger>
                  <SelectContent>
                    {PARALLELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <Button type="submit" size="sm" className="w-full">{t("edit.save")}</Button>
        </form>
      )}

      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("teachers.empty")}</p>
        ) : (
          list.map((teacher) => (
            <div key={teacher.id} className="glass-card p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{teacher.fullName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{teacher.subject}</p>
              </div>
              {teacher.isSupervisor && (
                <Badge variant="secondary" className="text-[10px]">
                  {t("teachers.supervisorOf")} {supervisorLabel(teacher)}
                </Badge>
              )}
              <Switch
                checked={teacher.isSupervisor}
                onCheckedChange={(v) => { updateTeacher(teacher.id, { isSupervisor: v }); refresh(); }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => setPendingDelete(teacher)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.fullName}</AlertDialogTitle>
            <AlertDialogDescription>{t("teachers.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("delete.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
