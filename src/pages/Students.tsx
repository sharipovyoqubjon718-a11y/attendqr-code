import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getStudents } from "@/lib/store";

export default function Students() {
  const [search, setSearch] = useState("");
  const students = useMemo(() => getStudents(), []);

  const filtered = useMemo(
    () => students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.className.toLowerCase().includes(search.toLowerCase())
    ),
    [students, search]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Student Database</h2>
        <p className="text-muted-foreground">{students.length} students enrolled</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID, or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Student ID</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Class</TableHead>
                <TableHead className="font-semibold">QR Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="secondary">{s.className}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.qrCode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 50 && (
          <div className="p-3 text-center text-sm text-muted-foreground border-t">
            Showing 50 of {filtered.length} results. Refine your search to see more.
          </div>
        )}
      </div>
    </div>
  );
}
