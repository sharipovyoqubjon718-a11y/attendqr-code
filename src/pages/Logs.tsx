import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getLogs, getStudents } from "@/lib/store";

export default function Logs() {
  const [search, setSearch] = useState("");
  const logs = useMemo(() => getLogs(), []);
  const students = useMemo(() => {
    const map = new Map<string, string>();
    getStudents().forEach(s => map.set(s.id, s.name));
    return map;
  }, []);

  const filtered = useMemo(
    () => logs.filter(l => {
      const name = students.get(l.studentId) || '';
      return name.toLowerCase().includes(search.toLowerCase()) ||
        l.studentId.toLowerCase().includes(search.toLowerCase());
    }),
    [logs, search, students]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Attendance Logs</h2>
        <p className="text-muted-foreground">{logs.length} records</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Student ID</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.studentId}</TableCell>
                  <TableCell className="font-medium">{students.get(log.studentId) || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant={log.type === 'check-in' ? 'default' : 'secondary'}>
                      {log.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 100 && (
          <div className="p-3 text-center text-sm text-muted-foreground border-t">
            Showing 100 of {filtered.length} results.
          </div>
        )}
      </div>
    </div>
  );
}
