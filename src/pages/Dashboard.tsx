import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, TrendingUp, Play, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTodayStats, getWeeklyData, startSession, endSession, isSessionActive } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "@/components/ui/sonner";
import gdbhLogo from "@/assets/gdbh-logo.png";

export default function Dashboard() {
  const [sessionActive, setSessionActive] = useState(isSessionActive());
  const [stats, setStats] = useState(getTodayStats());
  const weeklyData = getWeeklyData();

  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => setStats(getTodayStats()), 5000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  const handleStartSession = () => {
    startSession();
    setSessionActive(true);
    setStats(getTodayStats());
    toast.success('Дарс оғоз шуд!');
  };

  const handleEndSession = () => {
    endSession();
    setSessionActive(false);
    setStats(getTodayStats());
    toast.success('Дарс анҷом ёфт! Ҳисобот нигоҳ дошта шуд.');
  };

  const displayStats = sessionActive
    ? stats
    : { total: stats.total, present: 0, absent: 0, rate: 0 };

  const statCards = [
    { label: "Миқдори умумии хонандагон", value: displayStats.total, icon: Users, color: "text-primary" },
    { label: "Имрӯз ҳозир", value: displayStats.present, icon: UserCheck, color: "text-secondary" },
    { label: "Ғоиб", value: displayStats.absent, icon: UserX, color: "text-destructive" },
    { label: "Сатҳи давомот", value: `${displayStats.rate}%`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner with logo */}
      <div className="glass-card p-6 flex items-center gap-4 flex-wrap">
        <img src={gdbhLogo} alt="ГДБҲ" className="h-16 w-16 rounded-full border-2 border-primary shadow-md" />
        <div className="flex-1 min-w-[200px]">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Панели идоракунӣ</h2>
          <p className="text-muted-foreground text-sm">Гимназияи давлатии бо нишони ҳарбӣ — Кӯлоб</p>
        </div>
        <div>
          {!sessionActive ? (
            <Button onClick={handleStartSession} size="lg" className="gap-2 bg-secondary hover:bg-secondary/90">
              <Play className="h-5 w-5" /> Оғози дарс
            </Button>
          ) : (
            <Button onClick={handleEndSession} size="lg" variant="destructive" className="gap-2">
              <Square className="h-5 w-5" /> Анҷоми дарс
            </Button>
          )}
        </div>
      </div>

      {/* Session status */}
      {sessionActive ? (
        <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 text-center">
          <p className="text-secondary font-semibold">✅ Дарс идома дорад — сканер фаъол аст</p>
        </div>
      ) : (
        <div className="bg-muted border border-border rounded-lg p-3 text-center">
          <p className="text-muted-foreground">Дарс оғоз нашудааст. Тугмаи "Оғози дарс"-ро пахш кунед.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="glass-card">
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
          <CardTitle className="font-display">Давомоти ҳафтагӣ</CardTitle>
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
                <Bar dataKey="present" fill="hsl(120, 100%, 20%)" name="Ҳозир" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="hsl(0, 100%, 40%)" name="Ғоиб" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
