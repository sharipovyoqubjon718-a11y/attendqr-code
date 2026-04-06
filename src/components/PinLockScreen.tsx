import { useState, useRef, useEffect } from "react";
import { Shield, Lock } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

interface PinLockScreenProps {
  onUnlock: () => void;
  pin?: string;
}

export default function PinLockScreen({ onUnlock, pin = "2211" }: PinLockScreenProps) {
  const { t } = useI18n();
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-xs space-y-8 text-center animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{t("pin.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pin.subtitle")}</p>
        </div>

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

        <p className="text-[10px] text-muted-foreground/60">{t("footer")}</p>
      </div>
    </div>
  );
}
