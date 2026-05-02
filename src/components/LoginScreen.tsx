import { useState, useEffect, useRef } from "react";
import { LifeBuoy, Lock, User } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import {
  getSchools, getSelectedSchoolId, setSelectedSchoolId,
  tryLogin, type School, HIDDEN_ADMIN_PASSWORD,
} from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import HiddenAdminPanel from "@/components/HiddenAdminPanel";

interface LoginScreenProps {
  onUnlock: () => void;
}

export default function LoginScreen({ onUnlock }: LoginScreenProps) {
  const { t } = useI18n();
  const [schools, setSchools] = useState<School[]>(getSchools());
  const [selected, setSelected] = useState(getSelectedSchoolId());
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Hidden admin: 5 rapid clicks on emblem
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);

  const refresh = () => setSchools(getSchools());

  const handleEmblemClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 1500);
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      setShowAdmin(true);
    }
  };

  const handleSchoolSelect = (id: string) => {
    setSelectedSchoolId(id);
    setSelected(id);
    const s = getSchools().find((x) => x.id === id);
    if (s) {
      setUsername(s.username);
      setPassword("");
      setShowLogin(true);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = tryLogin(selected, username.trim(), password);
    if (ok) {
      toast.success("✅");
      setShowLogin(false);
      onUnlock();
    } else {
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
            alt="ГДБҲ Emblem"
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
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Login dialog */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {schools.find((s) => s.id === selected)?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> {t("login.username")}</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> {t("login.password")}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowLogin(false)}>{t("edit.cancel")}</Button>
              <Button type="submit">{t("login.signIn")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden admin panel */}
      <HiddenAdminPanel
        open={showAdmin}
        onClose={() => setShowAdmin(false)}
        onSchoolsChanged={refresh}
      />
    </div>
  );
}
