import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { addStudent } from "@/lib/store";
import { getActiveSchool, getSelectedSchool, getShiftForGrade } from "@/lib/schools";
import { CLASSES, PARALLELS, makeGrade } from "@/lib/classes";
import { sanitizeText } from "@/lib/security";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface AddStudentDialogProps {
  onStudentAdded: () => void;
}

export default function AddStudentDialog({ onStudentAdded }: AddStudentDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [idNum, setIdNum] = useState("");
  const [cls, setCls] = useState("");
  const [parallel, setParallel] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const school = getActiveSchool() || getSelectedSchool();
  const prefix = school.prefix;

  const reset = () => { setName(""); setIdNum(""); setCls(""); setParallel(""); setWebsite(""); };

  const handleSave = () => {
    if (website) { setOpen(false); return; }
    const trimmedName = sanitizeText(name, 100);
    const trimmedNum = idNum.trim();

    if (!trimmedName || !trimmedNum || !cls || !parallel) {
      toast.error(t("admin.fillAll"));
      return;
    }
    if (!/^\d{1,3}$/.test(trimmedNum)) {
      toast.error("ID 1–999");
      return;
    }
    const fullId = `${prefix}${trimmedNum.padStart(3, "0")}`;
    const grade = makeGrade(cls, parallel);
    const success = addStudent({
      id: fullId,
      name: trimmedName,
      grade,
      shift: getShiftForGrade(school, grade),
      qrCode: fullId,
    });
    if (!success) {
      toast.error(`ID "${fullId}" ⚠️`);
      return;
    }
    toast.success(`${trimmedName} ✓`);
    reset();
    setOpen(false);
    onStudentAdded();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-secondary hover:bg-secondary/90">
          <UserPlus className="h-4 w-4" /> {t("addStudent.addBtn")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t("addStudent.title")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4 pt-2"
          autoComplete="off"
          onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        >
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
            aria-hidden
          />
          <div className="space-y-2">
            <Label>{t("addStudent.fullName")}</Label>
            <Input
              placeholder={t("addStudent.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Синф *</Label>
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger><SelectValue placeholder="Интихоб..." /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Параллел *</Label>
              <Select value={parallel} onValueChange={setParallel}>
                <SelectTrigger><SelectValue placeholder="А, Б, В..." /></SelectTrigger>
                <SelectContent>
                  {PARALLELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("addStudent.idNum")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-primary">{prefix}</span>
              <Input
                placeholder="001"
                value={idNum}
                onChange={(e) => setIdNum(e.target.value.replace(/\D/g, "").slice(0, 3))}
                className="flex-1"
                maxLength={3}
                inputMode="numeric"
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90">
            {t("addStudent.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
