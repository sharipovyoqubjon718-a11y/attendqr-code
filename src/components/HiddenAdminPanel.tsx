import { useState } from "react";
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

interface Props {
  open: boolean;
  onClose: () => void;
  onSchoolsChanged: () => void;
}

export default function HiddenAdminPanel({ open, onClose, onSchoolsChanged }: Props) {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [schools, setSchools] = useState<School[]>(getSchools());
  const [newName, setNewName] = useState("");

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<School | null>(null);
  const [deletePwd, setDeletePwd] = useState("");

  const refresh = () => {
    const list = getSchools();
    setSchools(list);
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
    if (!newName.trim()) return;
    addSchool(newName);
    setNewName("");
    refresh();
    toast.success(t("school.addedToast"));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (deletePwd !== HIDDEN_ADMIN_PASSWORD) {
      toast.error(t("login.invalid"));
      return;
    }
    deleteSchool(pendingDelete.id);
    refresh();
    setPendingDelete(null);
    setDeletePwd("");
    toast.success(t("school.deletedToast"));
  };

  const handleClose = () => {
    setAuthed(false);
    setPassword("");
    setNewName("");
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t("admin.hiddenTitle")}
            </DialogTitle>
            <DialogDescription>{t("admin.hiddenDesc")}</DialogDescription>
          </DialogHeader>

          {!authed ? (
            <form onSubmit={handleAuth} className="space-y-3">
              <Label className="text-xs">{t("login.password")}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleClose}>{t("edit.cancel")}</Button>
                <Button type="submit">{t("login.signIn")}</Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-auto">
                {schools.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded border">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.username}</p>
                    </div>
                    {s.id !== "gdbh" && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setPendingDelete(s)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs">{t("school.add")}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("school.namePlaceholder")}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                  <Button onClick={handleAdd} size="sm" className="shrink-0">
                    <Plus className="h-4 w-4 mr-1" /> {t("school.add")}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t("school.defaultCreds")}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>{t("edit.close")}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("school.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} — {t("school.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">{t("login.password")}</Label>
            <Input type="password" value={deletePwd} onChange={(e) => setDeletePwd(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeletePwd(""); }}>{t("delete.no")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("delete.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
