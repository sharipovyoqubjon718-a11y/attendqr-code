import { useEffect, useRef, useState } from "react";
import { Settings, Sun, Moon, Lock, Calendar as CalIcon, Image as ImageIcon, User, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import {
  getSelectedSchool, updateSchool, getSelectedSchoolId,
  defaultShiftForGrade, getShiftForGrade,
} from "@/lib/schools";
import { getStudents } from "@/lib/store";
import goldenEmblem from "@/assets/golden-emblem.png";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import HiddenAdminPanel from "@/components/HiddenAdminPanel";
import { syncSchoolCredentials } from "@/lib/school-credentials";
import { applyFavicon } from "@/lib/favicon";

export default function SettingsPage() {
  const { t } = useI18n();
  const [school, setSchool] = useState(getSelectedSchool());
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [name, setName] = useState(school.name);
  const [username, setUsername] = useState(school.username);
  const [password, setPassword] = useState(school.password);
  const [website, setWebsite] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
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

  const isMaster = isMasterSchool(school);

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast.error("Image ≤ 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      updateSchool(getSelectedSchoolId(), { logoDataUrl: dataUrl });
      // Only the master administrator (ГДБҲ) sets the GLOBAL brand: app icon,
      // favicon and header. Other schools stay scoped to their own dashboard/QR.
      if (isMaster && setGlobalLogo(dataUrl, getSelectedSchoolId())) {
        applyFavicon();
      }
      // Mirror the logo to the database so it syncs across devices.
      void syncSchoolCredentials({
        schoolId: getSelectedSchoolId(),
        username: school.username,
        password: school.password,
        name: school.name,
        logoDataUrl: dataUrl,
      });
      refresh();
      toast.success(t("security.saved"));
    };
    reader.readAsDataURL(file);
  };

  const saveName = () => {
    if (website || !name.trim()) return;
    updateSchool(getSelectedSchoolId(), { name });
    refresh();
    toast.success(t("security.saved"));
  };

  const saveCreds = async () => {
    if (website || !username.trim() || !password.trim()) return;
    updateSchool(getSelectedSchoolId(), { username, password });
    refresh();
    // Persist credentials to the database via the secure upsert (no data loss).
    const res = await syncSchoolCredentials({
      schoolId: getSelectedSchoolId(),
      username: username.trim(),
      password: password.trim(),
      name: school.name,
      logoDataUrl: school.logoDataUrl,
    });
    if (!res.ok) {
      toast.error(res.error || "DB");
      return;
    }
    toast.success(t("security.saved"));
  };

  // Build distinct grades present in school's roster
  const grades = Array.from(new Set(getStudents().map((s) => s.grade).filter(Boolean)))
    .sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    });

  const setGradeShift = (grade: string, toMorning: boolean) => {
    const overrides = { ...(school.shiftOverrides || {}) };
    overrides[grade] = toMorning ? "morning" : "afternoon";
    updateSchool(getSelectedSchoolId(), { shiftOverrides: overrides });
    refresh();
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      {/* School logo */}
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
        <p className="text-[10px] text-muted-foreground text-center">{t("school.logoQrHint")}</p>
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

      {/* Credentials (Login) */}
      <form
        className="glass-card p-6 space-y-4"
        autoComplete="off"
        onSubmit={(e) => { e.preventDefault(); saveCreds(); }}
      >
        <input type="text" name="website" tabIndex={-1} autoComplete="off"
          value={website} onChange={(e) => setWebsite(e.target.value)}
          className="hidden" aria-hidden />
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

      {/* Admin Panel — visible only on master account (ГДБҲ) */}
      {school.id === "gdbh" && (
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <Label className="text-sm font-semibold">{t("admin.hiddenTitle")}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t("admin.hiddenDesc")}</p>
          <Button size="sm" className="w-full" onClick={() => setShowAdmin(true)}>
            {t("admin.open")}
          </Button>
        </div>
      )}

      {/* Shift Management */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <Label className="text-sm font-semibold">{t("shift.management")}</Label>
        </div>
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <p>{t("shift.shift1Desc")}</p>
          <p>{t("shift.shift2Desc")}</p>
        </div>
        {grades.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">—</p>
        ) : (
          <div className="space-y-1">
            {grades.map((g) => {
              const current = getShiftForGrade(school, g);
              const isMorning = current === "morning";
              const isDefault = current === defaultShiftForGrade(g);
              return (
                <div key={g} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border">
                  <div className="text-sm">
                    {t("rankings.class")} {g}
                    {!isDefault && <span className="ml-1 text-[9px] text-primary">●</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={cn(!isMorning && "text-muted-foreground")}>{t("shift.morning")}</span>
                    <Switch checked={!isMorning} onCheckedChange={(v) => setGradeShift(g, !v)} />
                    <span className={cn(isMorning && "text-muted-foreground")}>{t("shift.afternoon")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rest days picker (Holidays) */}
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
      </div>

      <HiddenAdminPanel
        open={showAdmin}
        onClose={() => setShowAdmin(false)}
        onSchoolsChanged={refresh}
      />
    </div>
  );
}
