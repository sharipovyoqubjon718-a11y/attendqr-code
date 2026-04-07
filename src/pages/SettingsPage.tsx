import { useState, useEffect, useRef } from "react";
import { Settings, Sun, Moon, Lock, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import PatternLock from "@/components/PatternLock";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type SecurityMethod = "pin" | "pattern";

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

export default function SettingsPage() {
  const { t } = useI18n();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [securityMethod, setSecurityMethod] = useState<SecurityMethod>(getSecurityMethod);

  // PIN update
  const [newPin, setNewPin] = useState<string[]>(["", "", "", ""]);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pattern update
  const [settingPattern, setSettingPattern] = useState(false);
  const [tempPattern, setTempPattern] = useState<number[] | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("sams_theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("sams_theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const handleMethodChange = (val: string) => {
    const method = val as SecurityMethod;
    setSecurityMethod(method);
    localStorage.setItem("sams_security_method", method);
  };

  // PIN handlers
  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...newPin];
    updated[index] = value;
    setNewPin(updated);
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !newPin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const savePin = () => {
    const pin = newPin.join("");
    if (pin.length === 4) {
      localStorage.setItem("sams_login_pin", pin);
      toast.success(t("security.saved"));
      setNewPin(["", "", "", ""]);
    }
  };

  // Pattern handlers
  const handlePatternSet = (pattern: number[]) => {
    if (pattern.length < 3) {
      toast.error(t("security.patternTooShort"));
      return;
    }
    if (!confirmStep) {
      setTempPattern(pattern);
      setConfirmStep(true);
    } else {
      if (tempPattern && JSON.stringify(tempPattern) === JSON.stringify(pattern)) {
        localStorage.setItem("sams_login_pattern", JSON.stringify(pattern));
        toast.success(t("security.saved"));
        setSettingPattern(false);
        setConfirmStep(false);
        setTempPattern(null);
      } else {
        toast.error(t("pin.wrong"));
        setConfirmStep(false);
        setTempPattern(null);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="font-display text-xl font-bold">{t("settings.title")}</h1>
      </div>

      <div className="glass-card p-6 space-y-6">
        {/* Theme */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t("settings.theme")}</Label>
          <div className="flex gap-2">
            <Button
              variant={!darkMode ? "default" : "outline"}
              size="sm"
              onClick={() => { if (darkMode) toggleDark(); }}
              className="flex-1 gap-2"
            >
              <Sun className="h-4 w-4" /> {t("settings.light")}
            </Button>
            <Button
              variant={darkMode ? "default" : "outline"}
              size="sm"
              onClick={() => { if (!darkMode) toggleDark(); }}
              className="flex-1 gap-2"
            >
              <Moon className="h-4 w-4" /> {t("settings.dark")}
            </Button>
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t("settings.language")}</Label>
          <p className="text-xs text-muted-foreground">{t("settings.colors")}</p>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Security Method */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <Label className="text-sm font-semibold">{t("security.title")}</Label>
        </div>

        <RadioGroup value={securityMethod} onValueChange={handleMethodChange} className="flex gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="pin" id="sec-pin" />
            <Label htmlFor="sec-pin" className="cursor-pointer">{t("security.pin")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="pattern" id="sec-pattern" />
            <Label htmlFor="sec-pattern" className="cursor-pointer">{t("security.pattern")}</Label>
          </div>
        </RadioGroup>

        {/* Update PIN */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" /> {t("security.updatePin")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("security.newPin")}</p>
          <div className="flex gap-2 items-center">
            {newPin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { pinRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(i, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(i, e)}
                className="w-11 h-11 text-center text-lg font-bold rounded-xl border-2 bg-card text-foreground outline-none transition-all border-border focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
            ))}
            <Button size="sm" onClick={savePin} disabled={newPin.join("").length < 4} className="ml-2 gap-1">
              <Check className="h-4 w-4" /> {t("edit.save")}
            </Button>
          </div>
        </div>

        {/* Update Pattern */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" /> {t("security.updatePattern")}
          </Label>
          {!settingPattern ? (
            <Button size="sm" variant="outline" onClick={() => { setSettingPattern(true); setConfirmStep(false); setTempPattern(null); }}>
              {t("security.drawPattern")}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                {confirmStep ? t("security.confirmPattern") : t("security.drawPattern")}
              </p>
              <PatternLock onPatternComplete={handlePatternSet} />
              <Button size="sm" variant="ghost" className="w-full" onClick={() => { setSettingPattern(false); setConfirmStep(false); setTempPattern(null); }}>
                {t("edit.cancel")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
