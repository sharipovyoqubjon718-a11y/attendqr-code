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

function LockShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-xs space-y-6 text-center animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-10 w-10 text-primary" />
          </div>
        </div>
        {children}
        <p className="text-[10px] text-muted-foreground/60">{/* footer */}Developed by Sharipov's Python Academy</p>
      </div>
    </div>
  );
}
