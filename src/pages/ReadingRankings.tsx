import { useEffect, useState } from "react";
import { BookOpen, Trophy, Medal, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getStudents } from "@/lib/store";
import { buildAcademicScores } from "@/lib/journal";

interface Row {
  id: string;
  name: string;
  grade: string;
  points: number;
  avg: number;
  high: number;
  total: number;
}

/**
 * Ranking is based on the electronic grade journal (academic achievement),
 * NOT on attendance counts.
 */
function buildRanking(): Row[] {
  const students = getStudents();
  const scores = buildAcademicScores();
  return students
    .map((s) => {
      const sc = scores.get(s.id);
      return {
        id: s.id,
        name: s.name,
        grade: s.grade || "",
        points: sc?.points ?? 0,
        avg: sc?.avg ?? 0,
        high: sc?.high ?? 0,
        total: sc?.total ?? 0,
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.avg !== a.avg) return b.avg - a.avg;
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
                    {t("rankings.class")} {r.grade} · {t("reading.avg")} {r.avg} · {t("reading.high")} {r.high}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold">{r.points}</p>
                  <p className="text-[10px] text-muted-foreground">{t("reading.points")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
