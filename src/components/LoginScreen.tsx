import { useState, useEffect, useRef } from "react";
import { LifeBuoy, Lock, User, ShieldAlert, Plus } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import {
  getSchools, getSelectedSchoolId, setSelectedSchoolId,
  tryLogin, type School,
} from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import HiddenAdminPanel from "@/components/HiddenAdminPanel";
import { checkLoginRate, recordLoginAttempt, clearLoginAttempts } from "@/lib/security";

interface LoginScreenProps {
  onUnlock: () => void;
}

export default function LoginScreen({ onUnlock }: LoginScreenProps) {
  const { t } = useI18n();
  const [schools, setSchools] = useState<School[]>(getSchools());
  const [selected, setSelected] = useState<string>("");
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [retryIn, setRetryIn] = useState(0);

  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);

  const refresh = () => setSchools(getSchools());

  const handleEmblemClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => { clickCountRef.current = 0; }, 1500);
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      setShowAdmin(true);
    }
  };

  const handleSchoolSelect = (id: string) => {
    setSelectedSchoolId(id);
    setSelected(id);
    setUsername("");
    setPassword("");
    setWebsite("");
    setShowLogin(true);
  };

  // Always clear sensitive fields when modal closes/opens
  // Always clear sensitive fields when modal closes/opens; reset selection on close
  useEffect(() => {
    setPassword("");
    setWebsite("");
    if (!showLogin) setSelected("");
  }, [showLogin]);

  // Live retry countdown
  useEffect(() => {
    if (retryIn <= 0) return;
    const id = window.setInterval(() => {
      setRetryIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (website) { setShowLogin(false); return; } // bot — drop silently
    const rate = checkLoginRate();
    if (!rate.allowed) {
      setRetryIn(rate.retryInSec);
      toast.error(`${t("login.tooMany")} ${rate.retryInSec}s`);
      return;
    }
    recordLoginAttempt();
    const ok = tryLogin(selected, username, password);
    if (ok) {
      clearLoginAttempts();
      setPassword("");
      setShowLogin(false);
      onUnlock();
    } else {
      setPassword("");
      const after = checkLoginRate();
      if (!after.allowed) setRetryIn(after.retryInSec);
      toast.error(t("login.invalid"));
    }
  };

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-xs space-y-6 text-center animate-fade-in">
        <button
          type="button"
          onClick={handleEmblemClick}
          className="mx-auto block focus:outline-none"
          aria-label="Logo"
        >
          <img
            src={goldenEmblem}
            alt="Emblem"
            className="h-32 w-32 object-contain drop-shadow-lg mx-auto select-none"
            draggable={false}
          />
        </button>

        <div className="space-y-2 text-left">
          <Label className="text-xs font-semibold">{t("school.select")}</Label>
          <Select value={selected} onValueChange={handleSchoolSelect}>
            <SelectTrigger className="w-full h-11 text-sm">
              <SelectValue placeholder={t("school.select")} />
            </SelectTrigger>
            <SelectContent>
              {schools.filter((s) => s.active !== false).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button" variant="outline" size="sm"
            className="w-full gap-2 mt-2"
            onClick={() => setShowAdmin(true)}
          >
            <Plus className="h-4 w-4" /> {t("school.add")}
          </Button>
        </div>

        <a
          href="https://t.me/Sharipov_Yoqubjon"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
        >
          <LifeBuoy className="h-4 w-4" />
          <span>{t("support.title")}</span>
        </a>

        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          Developed by Sharipov's Python Academy<br />Lead Developer: Sharipov Yoqubjon
        </p>
      </div>

      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {schools.find((s) => s.id === selected)?.name}
            </DialogTitle>
            <DialogDescription className="sr-only">login</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-3" autoComplete="off">
            {/* honeypot */}
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
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3" /> {t("login.username")}
              </Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="off"
                name="login-id"
                maxLength={64}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Lock className="h-3 w-3" /> {t("login.password")}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                name="login-secret"
                maxLength={64}
              />
            </div>
            {retryIn > 0 && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" />
                {t("login.tooMany")} {retryIn}s
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowLogin(false)}>{t("edit.cancel")}</Button>
              <Button type="submit" disabled={retryIn > 0}>{t("login.signIn")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <HiddenAdminPanel
        open={showAdmin}
        onClose={() => setShowAdmin(false)}
        onSchoolsChanged={refresh}
      />
    </div>
  );
}
