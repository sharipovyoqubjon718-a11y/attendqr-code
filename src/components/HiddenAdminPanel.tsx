import { useEffect, useState } from "react";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getSchools, addSchool, deleteSchool, HIDDEN_ADMIN_PASSWORD, type School,
} from "@/lib/schools";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { isConfirmed } from "@/lib/security";

interface Props {
  open: boolean;
  onClose: () => void;
  onSchoolsChanged: () => void;
}

const emptyForm = { name: "", prefix: "", username: "", password: "", website: "" };

export default function HiddenAdminPanel({ open, onClose, onSchoolsChanged }: Props) {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [schools, setSchools] = useState<School[]>(getSchools());
  const [form, setForm] = useState(emptyForm);

  // Silent delete confirmation (CONFIRM-only)
  const [pendingDelete, setPendingDelete] = useState<School | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Reset state every open/close cycle (prevents autofill bleed)
  useEffect(() => {
    if (!open) {
      setAuthed(false);
      setPassword("");
      setForm(emptyForm);
      setDeleteConfirm("");
      setPendingDelete(null);
    } else {
      setSchools(getSchools());
    }
  }, [open]);

  const refresh = () => {
    setSchools(getSchools());
    onSchoolsChanged();
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === HIDDEN_ADMIN_PASSWORD) {
      setAuthed(true);
      setPassword("");
    } else {
      toast.error(t("login.invalid"));
    }
  };

  const handleAdd = () => {
    if (form.website) return; // honeypot — silently drop bots
    const res = addSchool({
      name: form.name,
      prefix: form.prefix,
      username: form.username,
      password: form.password,
    });
    if (res.error === "missing") { toast.error(t("admin.fillAll")); return; }
    if (res.error === "prefix-exists") { toast.error(t("admin.prefixExists")); return; }
    if (res.error === "username-exists") { toast.error(t("admin.usernameExists")); return; }
    setForm(emptyForm);
    refresh();
    toast.success(t("school.addedToast"));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (!isConfirmed(deleteConfirm)) return;
    deleteSchool(pendingDelete.id);
    refresh();
    setPendingDelete(null);
    setDeleteConfirm("");
    toast.success(t("school.deletedToast"));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t("admin.hiddenTitle")}
            </DialogTitle>
            <DialogDescription>{t("admin.hiddenDesc")}</DialogDescription>
          </DialogHeader>

          {!authed ? (
            <form onSubmit={handleAuth} className="space-y-3" autoComplete="off">
              <Label className="text-xs">{t("login.password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="new-password"
                name="admin-secret"
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose}>{t("edit.cancel")}</Button>
                <Button type="submit">{t("login.signIn")}</Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-auto">
                {schools.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded border">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {s.prefix} • {s.username}
                      </p>
                    </div>
                    {s.id !== "gdbh" && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setPendingDelete(s)}
                        title={t("delete.title")}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <form
                className="space-y-2 border-t pt-3"
                autoComplete="off"
                onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
              >
                {/* honeypot */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="hidden"
                  aria-hidden
                />
                <Label className="text-xs">{t("admin.schoolName")}</Label>
                <Input
                  placeholder={t("school.namePlaceholder")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={120}
                />
                <Label className="text-xs">{t("admin.schoolPrefix")}</Label>
                <Input
                  placeholder="MKT"
                  value={form.prefix}
                  onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
                  maxLength={12}
                />
                <Label className="text-xs">{t("login.username")}</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoComplete="off"
                  name="new-school-username"
                  maxLength={64}
                />
                <Label className="text-xs">{t("login.password")}</Label>
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                  name="new-school-password"
                  maxLength={64}
                />
                <Button type="submit" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> {t("school.add")}
                </Button>
              </form>

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>{t("edit.close")}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Silent CONFIRM delete dialog — no instructions */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">confirm</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm("")}>{t("delete.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!isConfirmed(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
