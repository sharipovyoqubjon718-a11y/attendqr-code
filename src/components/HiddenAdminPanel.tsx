import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { HIDDEN_ADMIN_PASSWORD } from "@/lib/schools";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import AdminPanelContent from "./AdminPanelContent";

interface Props {
  open: boolean;
  onClose: () => void;
  onSchoolsChanged: () => void;
}

export default function HiddenAdminPanel({ open, onClose, onSchoolsChanged }: Props) {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) { setAuthed(false); setPassword(""); }
  }, [open]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === HIDDEN_ADMIN_PASSWORD) {
      setAuthed(true); setPassword("");
    } else toast.error(t("login.invalid"));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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
              autoFocus autoComplete="new-password" name="admin-secret"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>{t("edit.cancel")}</Button>
              <Button type="submit">{t("login.signIn")}</Button>
            </DialogFooter>
          </form>
        ) : (
          <AdminPanelContent onChanged={onSchoolsChanged} />
        )}
      </DialogContent>
    </Dialog>
  );
}
