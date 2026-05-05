import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, TrendingUp, Play, Square, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStudents, getTodayStats, getWeeklyData, startSession, endSession, isSessionActive } from "@/lib/store";
import { getCurrentShift, SHIFT_TIMES } from "@/lib/students-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "@/components/ui/sonner";
import { useI18n } from "@/lib/i18n";
import { getActiveSchool, getSelectedSchool } from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";

export default function Dashboard() {
  const { t } = useI18n();
  const [sessionActive, setSessionActive] = useState(isSessionActive());
  const currentShift = getCurrentShift();
  const [stats, setStats] = useState(getTodayStats(currentShift));
  const weeklyData = getWeeklyData();
  const allStudents = getStudents();
  const shiftStudents = allStudents.filter(s => s.shift === currentShift);
  const shiftInfo = SHIFT_TIMES[currentShift];

  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => setStats(getTodayStats(currentShift)), 5000);
    return () => clearInterval(interval);
  }, [sessionActive, currentShift]);

  const handleStartSession = () => {
    startSession();
    setSessionActive(true);
    setStats(getTodayStats(currentShift));
    toast.success(t("dash.sessionStarted"));
  };

  const handleEndSession = () => {
    endSession();
    setSessionActive(false);
    setStats(getTodayStats(currentShift));
    toast.success(t("dash.sessionEnded"));
  };

  const displayStats = sessionActive
    ? { total: shiftStudents.length, present: stats.present, absent: shiftStudents.length - stats.present, rate: stats.rate }
    : { total: shiftStudents.length, present: 0, absent: 0, rate: 0 };

  const statCards = [
    { label: t("dash.shiftStudents"), value: displayStats.total, icon: Users, color: "text-primary" },
    { label: t("dash.present"), value: displayStats.present, icon: UserCheck, color: "text-secondary" },
    { label: t("dash.absent"), value: displayStats.absent, icon: UserX, color: "text-destructive" },
    { label: t("dash.rate"), value: `${displayStats.rate}%`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-6 flex items-center gap-4 flex-wrap">
        <img src={gdbhLogo} alt="ГДБҲ" className="h-16 w-16 rounded-full border-2 border-primary shadow-md" />
        <div className="flex-1 min-w-[200px]">
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">{t("dash.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("dash.subtitle")}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="gap-1">
              {currentShift === 'morning' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {t(currentShift === 'morning' ? "shiftLabel.morning" : "shiftLabel.afternoon")}
            </Badge>
            <Badge variant="secondary">{allStudents.length} {t("dash.students")}</Badge>
          </div>
        </div>
        <div>
          {!sessionActive ? (
            <Button onClick={handleStartSession} size="lg" className="gap-2 bg-secondary hover:bg-secondary/90 transition-transform active:scale-95">
              <Play className="h-5 w-5" /> {t("dash.startSession")}
            </Button>
          ) : (
            <Button onClick={handleEndSession} size="lg" variant="destructive" className="gap-2 transition-transform active:scale-95">
              <Square className="h-5 w-5" /> {t("dash.endSession")}
            </Button>
          )}
        </div>
      </div>

      {sessionActive ? (
        <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 text-center">
          <p className="text-secondary font-semibold">{t("dash.sessionActive")}</p>
        </div>
      ) : (
        <div className="bg-muted border border-border rounded-lg p-3 text-center">
          <p className="text-muted-foreground">{t("dash.sessionInactive")}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="glass-card animate-fade-in">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl sm:text-3xl font-display font-bold mt-1">{s.value}</p>
                </div>
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">{t("dash.weeklyChart")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="hsl(120, 100%, 20%)" name={t("chart.present")} radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="hsl(0, 100%, 40%)" name={t("chart.absent")} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
