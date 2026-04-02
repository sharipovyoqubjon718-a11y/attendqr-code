import { useMemo } from "react";
import { BarChart3, Users, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getWeeklyReport, getWeeklyData } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Reports() {
  const report = useMemo(() => getWeeklyReport(), []);
  const weeklyData = useMemo(() => getWeeklyData(), []);
  const isSaturday = new Date().getDay() === 6;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Ҳисоботҳо
        </h2>
        <p className="text-muted-foreground">Хулосаи ҳафтагии давомот</p>
      </div>

      {isSaturday && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 text-center">
          <p className="text-secondary font-semibold">📊 Имрӯз — Шанбе! Ҳисоботи ҳафтагӣ омода аст.</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ҳамагӣ хонандагон</p>
              <p className="text-2xl font-display font-bold">{report.students.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Сатҳи умумии давомот</p>
              <p className="text-2xl font-display font-bold">{report.totalRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Рӯзҳои корӣ</p>
              <p className="text-2xl font-display font-bold">{report.weekdays}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Графики ҳафтагӣ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
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

      {/* Student breakdown */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Ҷадвали хонандагон</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">ID</TableHead>
                    <TableHead className="font-semibold">Ном</TableHead>
                    <TableHead className="font-semibold">Синф</TableHead>
                    <TableHead className="font-semibold">Ҳозир</TableHead>
                    <TableHead className="font-semibold">Ғоиб</TableHead>
                    <TableHead className="font-semibold">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.students.slice(0, 50).map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{s.grade}</Badge></TableCell>
                      <TableCell className="text-secondary font-bold">{s.presentDays}</TableCell>
                      <TableCell className="text-primary font-bold">{s.absentDays}</TableCell>
                      <TableCell>
                        <Badge variant={s.rate >= 80 ? "secondary" : "destructive"} className="text-xs">
                          {s.rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
