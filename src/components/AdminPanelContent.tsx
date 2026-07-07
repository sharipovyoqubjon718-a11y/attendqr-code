import { useState } from "react";
import { Plus, Trash2, Pencil, Eye, EyeOff, Save, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getSchools, addSchool, deleteSchool, updateSchool, type School,
} from "@/lib/schools";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { isConfirmed } from "@/lib/security";

const emptyForm = { name: "", prefix: "", username: "", password: "1234", website: "" };

export default function AdminPanelContent({ onChanged }: { onChanged?: () => void }) {
  const { t } = useI18n();
  const [schools, setSchools] = useState<School[]>(getSchools());
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<School>>({});
  const [pendingDelete, setPendingDelete] = useState<School | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const refresh = () => { setSchools(getSchools()); onChanged?.(); };

  const prefixTaken = form.prefix.trim().length > 0 &&
    schools.some((s) => s.prefix.toUpperCase() === form.prefix.trim().toUpperCase());

  const handleAdd = () => {
    if (form.website) return;
    if (prefixTaken) return toast.error(t("admin.prefixExists"));
    const res = addSchool({
      name: form.name, prefix: form.prefix,
      username: form.username, password: form.password || "1234",
    });
    if (res.error === "missing") return toast.error(t("admin.fillAll"));
    if (res.error === "prefix-exists") return toast.error(t("admin.prefixExists"));
    if (res.error === "username-exists") return toast.error(t("admin.usernameExists"));
    setForm(emptyForm); setShowForm(false); refresh();
    toast.success(t("school.addedToast"));
  };

  const startEdit = (s: School) => {
    setEditingId(s.id);
    setEditDraft({ name: s.name, username: s.username, password: s.password, prefix: s.prefix });
  };
  const saveEdit = () => {
    if (!editingId) return;
    updateSchool(editingId, editDraft);
    setEditingId(null); setEditDraft({}); refresh();
    toast.success(t("security.saved"));
  };
  const toggleActive = (s: School) => {
    updateSchool(s.id, { active: s.active === false ? true : false });
    refresh();
  };

  const confirmDelete = () => {
    if (!pendingDelete || !isConfirmed(deleteConfirm)) return;
    deleteSchool(pendingDelete.id);
    setPendingDelete(null); setDeleteConfirm(""); refresh();
    toast.success(t("school.deletedToast"));
  };

  return (
    <div className="space-y-3">
      <Button
        type="button" size="sm" className="w-full gap-2"
        onClick={() => setShowForm((v) => !v)}
      >
        <Plus className="h-4 w-4" /> {t("school.add")}
      </Button>

      {showForm && (
        <form
          className="space-y-2 border rounded-md p-3 bg-card"
          autoComplete="off"
          onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
        >
          <input
            type="text" name="website" tabIndex={-1} autoComplete="off"
            value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="hidden" aria-hidden
          />
          <Label className="text-xs">{t("admin.schoolName")}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
          <Label className="text-xs">{t("admin.schoolPrefix")}</Label>
          <Input
            value={form.prefix}
            onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
            maxLength={12}
            className={prefixTaken ? "border-destructive focus-visible:ring-destructive" : undefined}
          />
          {prefixTaken && (
            <p className="text-[11px] font-medium text-destructive">{t("admin.prefixInUse")}</p>
          )}
          <div className="rounded-md border bg-muted/40 p-2 space-y-1">
            <p className="text-[10px] text-muted-foreground">{t("admin.existingPrefixes")}</p>
            <div className="flex flex-wrap gap-1">
              {schools.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm({ ...form, prefix: s.prefix })}
                  className="text-[11px] rounded px-1.5 py-0.5 bg-background border hover:bg-accent"
                >
                  {s.prefix} · {s.name}
                </button>
              ))}
            </div>
          </div>
          <Label className="text-xs">{t("login.username")}</Label>
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" maxLength={64} />
          <Label className="text-xs">{t("login.password")}</Label>
          <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" maxLength={64} />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => setShowForm(false)}>
              {t("edit.cancel")}
            </Button>
            <Button type="submit" size="sm" className="flex-1">{t("edit.save")}</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {schools.map((s) => {
          const isEditing = editingId === s.id;
          const active = s.active !== false;
          return (
            <div key={s.id} className="border rounded-md p-3 bg-card space-y-2">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editDraft.name ?? ""}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    placeholder={t("admin.schoolName")}
                  />
                  <Input
                    value={editDraft.username ?? ""}
                    onChange={(e) => setEditDraft({ ...editDraft, username: e.target.value })}
                    placeholder={t("login.username")}
                    autoComplete="off"
                  />
                  <Input
                    type="text"
                    value={editDraft.password ?? ""}
                    onChange={(e) => setEditDraft({ ...editDraft, password: e.target.value })}
                    placeholder={t("login.password")}
                    autoComplete="new-password"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setEditingId(null); setEditDraft({}); }}>
                      <X className="h-3.5 w-3.5 mr-1" /> {t("edit.cancel")}
                    </Button>
                    <Button size="sm" className="flex-1" onClick={saveEdit}>
                      <Save className="h-3.5 w-3.5 mr-1" /> {t("edit.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {s.prefix} • {s.username}
                      </p>
                    </div>
                    <Switch checked={active} onCheckedChange={() => toggleActive(s)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">{t("login.password")}:</span>
                      <code className="font-mono">{revealed[s.id] ? s.password : "••••"}</code>
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => setRevealed((r) => ({ ...r, [s.id]: !r[s.id] }))}
                      >
                        {revealed[s.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {s.id !== "gdbh" && (
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setPendingDelete(s); setDeleteConfirm(""); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
