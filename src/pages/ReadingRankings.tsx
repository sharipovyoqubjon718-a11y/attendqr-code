import { useEffect, useState } from "react";
import { BookOpen, Trophy, Medal, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getStudents, getLogs } from "@/lib/store";

interface Row {
  id: string;
  name: string;
  grade: string;
  count: number;
}

function buildRanking(): Row[] {
  const students = getStudents();
  const logs = getLogs();
  const counts = new Map<string, number>();
  for (const l of logs) {
    if (l.type !== "check-in") continue;
    counts.set(l.studentId, (counts.get(l.studentId) || 0) + 1);
  }
  return students
    .map((s) => ({ id: s.id, name: s.name, grade: s.grade || "", count: counts.get(s.id) || 0 }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "ru");
    });
}

const PODIUM_ICON = [Trophy, Medal, Award];
const PODIUM_TONE = ["text-yellow-500", "text-slate-400", "text-amber-700"];

export default function ReadingRankings() {
  const { t } = useI18n();
  const [rows, setRows] = useState(() => buildRanking());

  useEffect(() => {
    const tick = () => setRows(buildRanking());
    const id = window.setInterval(tick, 3000);
    window.addEventListener("storage", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in print-area">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold">{t("reading.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("reading.subtitle")}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">{t("reading.empty")}</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r, i) => {
            const Icon = i < 3 ? PODIUM_ICON[i] : null;
            const tone = i < 3 ? PODIUM_TONE[i] : "text-muted-foreground";
            return (
              <div key={r.id} className="glass-card p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold ${tone}`}>
                  {Icon ? <Icon className="h-5 w-5" /> : <span>{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("rankings.class")} {r.grade}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold">{r.count}</p>
                  <p className="text-[10px] text-muted-foreground">{t("reading.count")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
