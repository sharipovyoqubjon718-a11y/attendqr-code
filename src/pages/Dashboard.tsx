import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodayStats, getWeeklyData } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Dashboard() {
  const stats = getTodayStats();
  const weeklyData = getWeeklyData();

  const statCards = [
    { label: "Миқдори умумии хонандагон", value: stats.total, icon: Users, color: "text-primary" },
    { label: "Имрӯз ҳозир", value: stats.present, icon: UserCheck, color: "text-success" },
    { label: "Ғоиб", value: stats.absent, icon: UserX, color: "text-destructive" },
    { label: "Сатҳи давомот", value: `${stats.rate}%`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Панели идоракунӣ</h2>
        <p className="text-muted-foreground">Хулосаи давоматӣ имрӯз</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-display font-bold mt-1">{s.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Давомоти ҳафтагӣ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-muted-foreground" fontSize={12} />
                <YAxis className="text-muted-foreground" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="hsl(168, 70%, 38%)" name="Ҳозир" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="hsl(0, 72%, 55%)" name="Ғоиб" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
