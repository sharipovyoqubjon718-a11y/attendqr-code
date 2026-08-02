import { useState } from "react";
import { GraduationCap, Pencil, Plus, Trash2, X } from "lucide-react";
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
  addTeacher, deleteTeacher, getTeachers, ROLE_LABEL_KEY, supervisorLabel,
  takenRoles, updateTeacher, UNIQUE_ROLES, type StaffRole, type Teacher,
} from "@/lib/teachers";
import { toast } from "sonner";

const emptyForm = {
  fullName: "",
  subject: "",
  role: "teacher" as StaffRole,
  isSupervisor: false,
  grade: "",
  parallel: "-",
  website: "",
};

const ALL_ROLES: StaffRole[] = ["teacher", "director", "deputy_academic", "deputy_upbringing"];

export default function Teachers() {
  const { t } = useI18n();
  const [list, setList] = useState<Teacher[]>(getTeachers());
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Teacher | null>(null);

  const refresh = () => setList(getTeachers());

  // Unique roles already filled are hidden from the picker.
  const taken = takenRoles(editingId ?? undefined);
  const roleOptions = ALL_ROLES.filter((r) => !UNIQUE_ROLES.includes(r) || !taken.includes(r));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setForm({
      fullName: teacher.fullName,
      subject: teacher.subject,
      role: teacher.role,
      isSupervisor: teacher.isSupervisor,
      grade: teacher.grade || "",
      parallel: teacher.parallel || "-",
      website: "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (form.website) return;
    if (!form.fullName.trim()) return toast.error(t("admin.fillAll"));
    if (form.role === "teacher" && !form.subject.trim()) return toast.error(t("admin.fillAll"));
    if (form.role === "teacher" && form.isSupervisor && !form.grade) {
      return toast.error(t("teachers.pickClass"));
    }

    if (editingId) {
      const res = updateTeacher(editingId, {
        fullName: form.fullName,
        subject: form.role === "teacher" ? form.subject : "",
        role: form.role,
        isSupervisor: form.role === "teacher" && form.isSupervisor,
        grade: form.grade,
        parallel: form.parallel,
      });
      if (res.error) return toast.error(t("admin.fillAll"));
      closeForm();
      refresh();
      return void toast.success(t("teachers.updated"));
    }

    const res = addTeacher({
      fullName: form.fullName,
      subject: form.role === "teacher" ? form.subject : "",
      role: form.role,
      isSupervisor: form.isSupervisor,
      grade: form.grade,
      parallel: form.parallel,
    });
    if (res.error === "missing") return toast.error(t("admin.fillAll"));
    if (res.error === "missing-class") return toast.error(t("teachers.pickClass"));
    if (res.error === "role-taken") return toast.error(t("admin.fillAll"));
    closeForm();
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

      <Button
        size="sm"
        className="w-full gap-2"
        onClick={() => (showForm ? closeForm() : openAdd())}
      >
        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showForm ? t("edit.cancel") : t("teachers.addStaff")}
      </Button>

      {showForm && (
        <form
          className="glass-card p-5 space-y-3"
          autoComplete="off"
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        >
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden
            className="hidden" value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })} />

          <div className="space-y-1.5">
            <Label className="text-xs">{t("teachers.role")}</Label>
            <Select
              value={form.role}
              onValueChange={(v) =>
                setForm({ ...form, role: v as StaffRole, isSupervisor: v === "teacher" ? form.isSupervisor : false })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>{t(ROLE_LABEL_KEY[r] as never)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("teachers.fullName")}</Label>
            <Input value={form.fullName} maxLength={120} autoComplete="off"
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>

          {form.role === "teacher" && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t("teachers.subject")}</Label>
              <Input value={form.subject} maxLength={80} autoComplete="off"
                onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
          )}

          {form.role === "teacher" && (
            <>
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
            </>
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
                <p className="text-[11px] text-muted-foreground truncate">
                  {teacher.role === "teacher" ? teacher.subject : t(ROLE_LABEL_KEY[teacher.role] as never)}
                </p>
              </div>
              {teacher.isSupervisor && (
                <Badge variant="secondary" className="text-[10px]">
                  {t("teachers.supervisorOf")} {supervisorLabel(teacher)}
                </Badge>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => openEdit(teacher)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
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
