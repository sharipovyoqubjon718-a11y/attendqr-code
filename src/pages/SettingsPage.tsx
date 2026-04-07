import { useState, useEffect } from "react";
import { Settings, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

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
    </div>
  );
}
