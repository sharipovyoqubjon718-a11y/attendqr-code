import { useState, useMemo, useRef } from "react";
import { Search, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudents } from "@/lib/store";
import { QRCodeSVG } from "qrcode.react";

export default function Students() {
  const [search, setSearch] = useState("");
  const students = useMemo(() => getStudents(), []);
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.className.toLowerCase().includes(search.toLowerCase())
    ),
    [students, search]
  );

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>QR кодҳои хонандагон</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .card { text-align: center; border: 1px solid #ddd; border-radius: 8px; padding: 12px; page-break-inside: avoid; }
        .card svg { margin: 0 auto; }
        .name { font-weight: bold; margin-top: 8px; font-size: 12px; }
        .id { color: #666; font-size: 11px; font-family: monospace; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>QR кодҳои хонандагон</h1>
      <div class="grid">
        ${filtered.map(s => `
          <div class="card">
            <svg id="qr-${s.id}"></svg>
            <div class="name">${s.name}</div>
            <div class="id">${s.id} — ${s.className}</div>
          </div>
        `).join('')}
      </div>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
      <script>
        document.querySelectorAll('[id^="qr-"]').forEach(el => {
          const id = el.id.replace('qr-', '');
          const canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, id, { width: 100 }, () => {
            el.replaceWith(canvas);
            if (document.querySelectorAll('canvas').length === document.querySelectorAll('[id^="qr-"]').length + document.querySelectorAll('canvas').length - document.querySelectorAll('[id^="qr-"]').length) {
              setTimeout(() => window.print(), 500);
            }
          });
        });
        setTimeout(() => window.print(), 1500);
      <\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Базаи маълумоти хонандагон</h2>
        <p className="text-muted-foreground">{students.length} хонанда сабтном шудааст</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ҷустуҷӯ бо ном, ID ё синф..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handlePrint} variant="secondary">
          <Printer className="mr-2 h-4 w-4" /> Чопи QR кодҳо
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">ID хонанда</TableHead>
                <TableHead className="font-semibold">Ном</TableHead>
                <TableHead className="font-semibold">Синф</TableHead>
                <TableHead className="font-semibold">QR код</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="secondary">{s.className}</Badge></TableCell>
                  <TableCell>
                    <QRCodeSVG value={s.id} size={48} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 50 && (
          <div className="p-3 text-center text-sm text-muted-foreground border-t">
            50 аз {filtered.length} натиҷа нишон дода шудааст. Ҷустуҷӯро дақиқтар кунед.
          </div>
        )}
      </div>
    </div>
  );
}
