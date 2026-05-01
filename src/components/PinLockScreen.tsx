import { useState, useRef, useEffect } from "react";
import { Lock, Plus, Trash2, LifeBuoy } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import PatternLock from "@/components/PatternLock";
import { useI18n } from "@/lib/i18n";
import { getSchools, addSchool, deleteSchool, getSelectedSchoolId, setSelectedSchoolId, type School } from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SecurityMethod = "pin" | "pattern";

interface PinLockScreenProps {
  onUnlock: () => void;
}

function getSecurityMethod(): SecurityMethod {
  return (localStorage.getItem("sams_security_method") as SecurityMethod) || "pin";
}
function getSavedPin(): string {
  return localStorage.getItem("sams_login_pin") || "2211";
}
function getSavedPattern(): number[] {
  const p = localStorage.getItem("sams_login_pattern");
  return p ? JSON.parse(p) : [];
}

export default function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const { t } = useI18n();
  const [method] = useState<SecurityMethod>(getSecurityMethod);

  if (method === "pattern") {
    return <PatternLockView onUnlock={onUnlock} />;
  }
  return <PinView onUnlock={onUnlock} />;
}

function PinView({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useI18n();
  const pin = getSavedPin();
  const [pinValue, setPinValue] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pinValue];
    newPin[index] = value;
    setPinValue(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      const fullPin = newPin.join("");
      if (fullPin === pin) {
        onUnlock();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPinValue(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pinValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <LockShell>
      <h1 className="text-xl font-bold text-foreground">{t("pin.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("pin.subtitle")}</p>

      <div className={`flex justify-center gap-3 ${shake ? "animate-shake" : ""}`}>
        {pinValue.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-card text-foreground outline-none transition-all
              ${error ? "border-destructive" : digit ? "border-primary" : "border-border"}
              focus:border-primary focus:ring-2 focus:ring-ring/20`}
          />
        ))}
      </div>

      {error && (
        <p className="text-destructive text-sm font-medium flex items-center justify-center gap-1">
          <Lock className="h-4 w-4" /> {t("pin.wrong")}
        </p>
      )}
    </LockShell>
  );
}

function PatternLockView({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useI18n();
  const savedPattern = getSavedPattern();
  const [error, setError] = useState(false);

  const handlePatternComplete = (pattern: number[]) => {
    if (savedPattern.length === 0) {
      // No pattern set — fallback, unlock anyway
      onUnlock();
      return;
    }
    if (JSON.stringify(pattern) === JSON.stringify(savedPattern)) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 800);
    }
  };

  return (
    <LockShell>
      <h1 className="text-xl font-bold text-foreground">{t("pin.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("pin.drawPattern")}</p>
      <PatternLock onPatternComplete={handlePatternComplete} error={error} />
      {error && (
        <p className="text-destructive text-sm font-medium flex items-center justify-center gap-1">
          <Lock className="h-4 w-4" /> {t("pin.wrong")}
        </p>
      )}
    </LockShell>
  );
}

function SchoolManager() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>(getSchools());
  const [newName, setNewName] = useState("");

  const refresh = () => setSchools(getSchools());

  const handleAdd = () => {
    if (!newName.trim()) return;
    addSchool(newName);
    setNewName("");
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteSchool(id);
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Plus className="h-3 w-3 mr-1" /> {t("school.manage")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("school.manage")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-auto">
          {schools.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded border">
              <span className="text-sm truncate">{s.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter className="flex gap-2 sm:flex-row">
          <Input
            placeholder={t("school.namePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm">{t("school.add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LockShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(getSelectedSchoolId());
  const [schoolList, setSchoolList] = useState<School[]>(getSchools());

  const handleSelect = (id: string) => {
    setSelectedSchoolId(id);
    setSelected(id);
  };

  // Refresh list when dialog closes (cheap polling on focus)
  useEffect(() => {
    const refresh = () => setSchoolList(getSchools());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-xs space-y-5 text-center animate-fade-in">
        <div className="flex flex-col items-center gap-2">
          <img
            src={goldenEmblem}
            alt="ГДБҲ Emblem"
            className="h-28 w-28 object-contain drop-shadow-lg"
          />
        </div>

        {/* School selector */}
        <div className="space-y-1.5 text-left">
          <Select value={selected} onValueChange={handleSelect}>
            <SelectTrigger className="w-full h-10 text-sm">
              <SelectValue placeholder={t("school.select")} />
            </SelectTrigger>
            <SelectContent>
              {schoolList.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <SchoolManager />
          </div>
        </div>

        {children}

        {/* Tech support */}
        <a
          href="https://t.me/Sharipov_Yoqubjon"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
        >
          <LifeBuoy className="h-4 w-4" />
          <span>{t("support.title")}</span>
        </a>

        <p className="text-[10px] text-muted-foreground/60">Developed by Sharipov's Python Academy</p>
      </div>
    </div>
  );
}
