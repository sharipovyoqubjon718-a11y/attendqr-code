import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getBlacklistedStudents } from "@/lib/store";

export default function Blacklist() {
  const blacklisted = useMemo(() => getBlacklistedStudents(3), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Blacklist</h2>
          <p className="text-muted-foreground">Students absent 3+ days in the last 7 weekdays</p>
        </div>
      </div>

      {blacklisted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No students on the blacklist. Great attendance!</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-destructive/5">
                  <TableHead className="font-semibold">Student ID</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Class</TableHead>
                  <TableHead className="font-semibold">Days Absent</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklisted.map((s) => (
                  <TableRow key={s.id} className="bg-destructive/[0.02]">
                    <TableCell className="font-mono text-sm">{s.id}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><Badge variant="secondary">{s.className}</Badge></TableCell>
                    <TableCell>
                      <span className="font-bold text-destructive">{s.absentDays}</span>
                      <span className="text-muted-foreground text-sm"> / 7 days</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {s.absentDays >= 5 ? 'Critical' : 'Warning'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 text-sm text-muted-foreground border-t">
            {blacklisted.length} student{blacklisted.length !== 1 ? 's' : ''} flagged
          </div>
        </div>
      )}
    </div>
  );
}
