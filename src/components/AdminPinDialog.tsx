import { useState, useRef, useEffect, createContext, useContext, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

const ADMIN_PIN = "1212";

interface AdminPinContextType {
  requirePin: (onSuccess: () => void) => void;
}

const AdminPinContext = createContext<AdminPinContextType | null>(null);

export function useAdminPin() {
  const ctx = useContext(AdminPinContext);
  if (!ctx) throw new Error("useAdminPin must be inside AdminPinProvider");
  return ctx;
}

export function AdminPinProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [callback, setCallback] = useState<(() => void) | null>(null);
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const requirePin = useCallback((onSuccess: () => void) => {
    setCallback(() => onSuccess);
    setPin(["", "", "", ""]);
    setError(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

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
        setOpen(false);
        callback?.();
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
    <AdminPinContext.Provider value={{ requirePin }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">{t("pin.subtitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center py-2">
            <Shield className="h-8 w-8 text-primary mx-auto" />
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
        </DialogContent>
      </Dialog>
    </AdminPinContext.Provider>
  );
}
