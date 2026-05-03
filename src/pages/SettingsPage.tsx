import { useEffect, useRef, useState } from "react";
import { Settings, Sun, Moon, Lock, Calendar as CalIcon, Image as ImageIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { getSelectedSchool, updateSchool, getSelectedSchoolId } from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { t } = useI18n();
  const [school, setSchool] = useState(getSelectedSchool());
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [name, setName] = useState(school.name);
  const [username, setUsername] = useState(school.username);
  const [password, setPassword] = useState(school.password);
  const [website, setWebsite] = useState(""); // honeypot
  const fileRef = useRef<HTMLInputElement | null>(null);
  const restDays = (school.restDays || []).map((d) => new Date(d));

  useEffect(() => {
    const saved = localStorage.getItem("sams_theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const refresh = () => {
    const s = getSelectedSchool();
    setSchool(s);
    setName(s.name);
    setUsername(s.username);
    setPassword(s.password);
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("sams_theme", next ? "dark" : "light");
  };

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast.error("Image ≤ 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateSchool(getSelectedSchoolId(), { logoDataUrl: String(reader.result) });
      refresh();
      toast.success(t("security.saved"));
    };
    reader.readAsDataURL(file);
  };

  const saveName = () => {
    if (website) return;
    if (!name.trim()) return;
    updateSchool(getSelectedSchoolId(), { name });
    refresh();
    toast.success(t("security.saved"));
  };

  const saveCreds = () => {
    if (website) return;
    if (!username.trim() || !password.trim()) return;
    updateSchool(getSelectedSchoolId(), { username, password });
    refresh();
    toast.success(t("security.saved"));
  };

  const toggleRestDay = (date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    const current = school.restDays || [];
    const next = current.includes(iso) ? current.filter((d) => d !== iso) : [...current, iso];
    updateSchool(getSelectedSchoolId(), { restDays: next });
    refresh();
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      {/* School logo at top */}
      <div className="glass-card p-6 flex flex-col items-center gap-3">
        <img
          src={school.logoDataUrl || goldenEmblem}
          alt={school.name}
          className="h-24 w-24 object-contain rounded-full border-2 border-primary/30 bg-card"
        />
        <h2 className="font-display text-lg font-bold text-center">{school.name}</h2>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
          <ImageIcon className="h-4 w-4" /> {t("school.uploadLogo")}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="font-display text-xl font-bold">{t("settings.title")}</h1>
      </div>

      {/* Theme + Language */}
      <div className="glass-card p-6 space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t("settings.theme")}</Label>
          <div className="flex gap-2">
            <Button variant={!darkMode ? "default" : "outline"} size="sm" onClick={() => { if (darkMode) toggleDark(); }} className="flex-1 gap-2">
              <Sun className="h-4 w-4" /> {t("settings.light")}
            </Button>
            <Button variant={darkMode ? "default" : "outline"} size="sm" onClick={() => { if (!darkMode) toggleDark(); }} className="flex-1 gap-2">
              <Moon className="h-4 w-4" /> {t("settings.dark")}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t("settings.language")}</Label>
          <LanguageSwitcher />
        </div>
      </div>

      {/* School name */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <Label className="text-sm font-semibold">{t("admin.schoolName")}</Label>
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="off" />
        <Button size="sm" onClick={saveName} className="w-full">{t("edit.save")}</Button>
      </div>

      {/* Credentials */}
      <form
        className="glass-card p-6 space-y-4"
        autoComplete="off"
        onSubmit={(e) => { e.preventDefault(); saveCreds(); }}
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
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <Label className="text-sm font-semibold">{t("school.credentials")}</Label>
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> {t("login.username")}</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" name="settings-id" maxLength={64} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> {t("login.password")}</Label>
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" name="settings-secret" maxLength={64} />
        </div>
        <Button type="submit" size="sm" className="w-full">{t("edit.save")}</Button>
      </form>

      {/* Rest days picker */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <CalIcon className="h-5 w-5 text-primary" />
          <Label className="text-sm font-semibold">{t("school.restDays")}</Label>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalIcon className="mr-2 h-4 w-4" />
              {restDays.length} {t("school.restDays")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="multiple"
              selected={restDays}
              onSelect={(dates) => {
                const isoList = (dates || []).map((d) => format(d, "yyyy-MM-dd"));
                updateSchool(getSelectedSchoolId(), { restDays: isoList });
                refresh();
              }}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {restDays.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {restDays.slice(0, 8).map((d) => (
              <button
                key={d.toISOString()}
                onClick={() => toggleRestDay(d)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive transition"
              >
                {format(d, "dd.MM")} ✕
              </button>
            ))}
            {restDays.length > 8 && <span className="text-[10px] text-muted-foreground self-center">+{restDays.length - 8}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
