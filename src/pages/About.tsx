import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { getActiveSchool, getSelectedSchool } from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";

export default function About() {
  const { t } = useI18n();
  const school = getActiveSchool() || getSelectedSchool();
  const logoSrc = school.logoDataUrl || goldenEmblem;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center">
        <img src={logoSrc} alt="ГДБҲ" className="h-24 w-24 rounded-full mx-auto mb-4 border-4 border-primary shadow-lg" />
        <h2 className="font-display text-2xl font-bold text-foreground">{t("about.title")}</h2>
        <div className="tajik-gradient-bar w-32 mx-auto mt-2 rounded-full" />
      </div>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-semibold">{t("about.project")}</p>
            <p className="font-display font-bold text-foreground">{t("about.projectName")}</p>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-semibold">{t("about.orderedBy")}</p>
            <p className="font-medium text-foreground">{t("about.itTeacher")}</p>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-semibold">{t("about.developer")}</p>
            <p className="font-medium text-foreground">Шарипов Ёқубҷон</p>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-semibold">{t("about.system")}</p>
            <p className="font-medium text-foreground">{t("about.systemDesc")}</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
