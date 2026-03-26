import { Card, CardContent } from "@/components/ui/card";
import gdbhLogo from "@/assets/gdbh-logo.png";

export default function About() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <img src={gdbhLogo} alt="ГДБҲ" className="h-24 w-24 rounded-full mx-auto mb-4 border-4 border-primary shadow-lg" />
        <h2 className="font-display text-2xl font-bold text-foreground">Маълумот</h2>
        <div className="tajik-gradient-bar w-32 mx-auto mt-2 rounded-full" />
      </div>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-semibold">Лоиҳа:</p>
            <p className="font-display font-bold text-foreground">
              Гимназияи давлатии Боғи Ҳабиб шаҳри Кӯлоб (ГДБҲ)
            </p>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-semibold">Супориш:</p>
            <p className="font-medium text-foreground">Муаллими Технологияи иттилоотӣ</p>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-semibold">Созанда ва таҳиягар:</p>
            <p className="font-display font-bold text-lg text-primary">Шарипов Ёқубҷон</p>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-semibold">Система:</p>
            <p className="text-foreground">AttendQR — Системаи идоракунии давоматӣ бо сканери QR</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <div className="h-3 w-3 rounded-full bg-card border" />
            <div className="h-3 w-3 rounded-full bg-secondary" />
            <span className="text-sm text-muted-foreground ml-2">Парчами Тоҷикистон</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
