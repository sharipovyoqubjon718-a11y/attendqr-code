import { useEffect, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getStudents, getTodayStats, getLogs } from "@/lib/store";

interface Row {
  grade: string;
  total: number;
  present: number;
  rate: number;
}

function buildRanking(): Row[] {
  const students = getStudents();
  const logs = getLogs();
  const today = new Date().toISOString().split("T")[0];
  const todayCheckins = new Set(
    logs.filter((l) => l.type === "check-in" && l.timestamp.startsWith(today)).map((l) => l.studentId)
  );
  const map = new Map<string, { total: number; present: number }>();
  for (const s of students) {
    if (!s.grade) continue;
    const r = map.get(s.grade) || { total: 0, present: 0 };
    r.total += 1;
    if (todayCheckins.has(s.id)) r.present += 1;
    map.set(s.grade, r);
  }
  return Array.from(map.entries())
    .map(([grade, v]) => ({
      grade,
      total: v.total,
      present: v.present,
      rate: v.total ? Math.round((v.present / v.total) * 100) : 0,
    }))
    .sort((a, b) => {
      if (b.rate !== a.rate) return b.rate - a.rate;
      const na = parseInt(a.grade, 10);
      const nb = parseInt(b.grade, 10);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return a.grade.localeCompare(b.grade);
    });
}

const PODIUM_ICON = [Trophy, Medal, Award];
const PODIUM_TONE = ["text-yellow-500", "text-slate-400", "text-amber-700"];

export default function Rankings() {
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
  getTodayStats();

  return (
    <div className="space-y-6 animate-fade-in print-area">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold">{t("rankings.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("rankings.subtitle")}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">{t("rankings.empty")}</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r, i) => {
            const Icon = i < 3 ? PODIUM_ICON[i] : null;
            const tone = i < 3 ? PODIUM_TONE[i] : "text-muted-foreground";
            return (
              <div
                key={r.grade}
                className="glass-card p-4 flex items-center gap-4"
              >
                <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold ${tone}`}>
                  {Icon ? <Icon className="h-5 w-5" /> : <span>{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{t("rankings.class")} {r.grade}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.present} / {r.total}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold">{r.rate}%</p>
                  <p className="text-[10px] text-muted-foreground">{t("rankings.rate")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
