import { useState, useRef, useEffect } from "react";
import { Settings, Shield, Lock, Sun, Moon, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

const SETTINGS_PIN = "1212";

function PinEntry({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      const fullPin = newPin.join("");
      if (fullPin === SETTINGS_PIN) {
        onSuccess();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="space-y-4 text-center py-4">
      <div className="flex flex-col items-center gap-2">
        <Shield className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">{t("pin.subtitle")}</p>
      </div>
      <div className={`flex justify-center gap-3 ${shake ? "animate-shake" : ""}`}>
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-12 h-12 text-center text-xl font-bold rounded-xl border-2 bg-card text-foreground outline-none transition-all
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
    </div>
  );
}

const COLOR_PRESETS = [
  { name: "Сурх", primary: "0 100% 40%", secondary: "120 100% 20%" },
  { name: "Кабуд", primary: "220 90% 45%", secondary: "200 80% 50%" },
  { name: "Сабз", primary: "150 80% 30%", secondary: "120 60% 40%" },
  { name: "Бунафш", primary: "270 70% 45%", secondary: "300 60% 50%" },
  { name: "Тиллоӣ", primary: "38 92% 45%", secondary: "25 80% 50%" },
];

export function SettingsPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [activeColor, setActiveColor] = useState(0);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("sams_theme", next ? "dark" : "light");
  };

  const applyColor = (index: number) => {
    setActiveColor(index);
    const preset = COLOR_PRESETS[index];
    document.documentElement.style.setProperty("--primary", preset.primary);
    document.documentElement.style.setProperty("--secondary", preset.secondary);
    document.documentElement.style.setProperty("--accent", preset.secondary);
    document.documentElement.style.setProperty("--ring", preset.primary);
    localStorage.setItem("sams_color", String(index));
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("sams_theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
    const savedColor = localStorage.getItem("sams_color");
    if (savedColor) {
      const idx = parseInt(savedColor);
      if (!isNaN(idx) && idx < COLOR_PRESETS.length) {
        applyColor(idx);
      }
    }
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setAuthenticated(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title={t("settings.title")}>
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> {t("settings.title")}
          </DialogTitle>
        </DialogHeader>
        {!authenticated ? (
          <PinEntry onSuccess={() => setAuthenticated(true)} />
        ) : (
          <div className="space-y-6 py-2">
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

            {/* Color picker */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1">
                <Palette className="h-4 w-4" /> {t("settings.colors")}
              </Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => applyColor(i)}
                    className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 ${
                      activeColor === i ? "border-foreground scale-110" : "border-border"
                    }`}
                    style={{ background: `hsl(${preset.primary})` }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("settings.language")}</Label>
              <LanguageSwitcher />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
