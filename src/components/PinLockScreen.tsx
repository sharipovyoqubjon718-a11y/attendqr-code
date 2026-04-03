import { useState, useRef, useEffect } from "react";
import { Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_PIN } from "@/lib/students-data";

interface PinLockScreenProps {
  onUnlock: () => void;
}

export default function PinLockScreen({ onUnlock }: PinLockScreenProps) {
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
      if (fullPin === ADMIN_PIN) {
        onUnlock();
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

  const handleNumPad = (num: string) => {
    const nextEmpty = pin.findIndex((d) => d === "");
    if (nextEmpty === -1) return;
    handleChange(nextEmpty, num);
  };

  const handleClear = () => {
    setPin(["", "", "", ""]);
    setError(false);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">ГДБҲ — Давомот</h1>
          <p className="text-sm text-muted-foreground">PIN-кодро ворид кунед</p>
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
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-card text-foreground outline-none transition-all
                ${error ? "border-destructive" : digit ? "border-primary" : "border-border"}
                focus:border-primary focus:ring-2 focus:ring-ring/20`}
            />
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm font-medium flex items-center justify-center gap-1">
            <Lock className="h-4 w-4" /> PIN нодуруст аст
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((num) =>
            num === "" ? (
              <div key="empty" />
            ) : num === "⌫" ? (
              <Button key="clear" variant="outline" className="h-12 text-lg" onClick={handleClear}>
                ⌫
              </Button>
            ) : (
              <Button key={num} variant="outline" className="h-12 text-lg font-semibold" onClick={() => handleNumPad(num)}>
                {num}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
