import { useState, useMemo, useRef } from "react";
import { Search, Printer, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudents } from "@/lib/store";
import { QRCodeSVG } from "qrcode.react";

export default function Students() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "gallery">("gallery");
  const students = useMemo(() => getStudents(), []);
  const galleryRef = useRef<HTMLDivElement>(null);

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
        body { font-family: Arial, Helvetica, sans-serif; padding: 20px; margin: 0; }
        h1 { text-align: center; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .card { text-align: center; border: 1px solid #bbb; border-radius: 8px; padding: 14px 8px 10px; page-break-inside: avoid; }
        .card canvas { display: block; margin: 0 auto; }
        .name { margin-top: 8px; font-size: 11px; line-height: 1.3; color: #444; }
        @media print { body { padding: 10px; } .grid { gap: 10px; } }
      </style></head><body>
      <h1>Галлереяи QR кодҳо</h1>
      <div class="grid">
        ${filtered.map(s => `
          <div class="card">
            <div id="qr-${s.id}"></div>
            <div class="name">${s.name}<br/>(${s.id})</div>
          </div>
        `).join('')}
      </div>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
      <script>
        const containers = document.querySelectorAll('[id^="qr-"]');
        let done = 0;
        containers.forEach(el => {
          const id = el.id.replace('qr-', '');
          const canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, id, { width: 140, margin: 1, errorCorrectionLevel: 'L' }, () => {
            el.appendChild(canvas);
            done++;
            if (done === containers.length) setTimeout(() => window.print(), 400);
          });
        });
        setTimeout(() => window.print(), 2000);
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
        <div className="flex gap-2">
          <Button
            onClick={() => setView("gallery")}
            variant={view === "gallery" ? "default" : "outline"}
            size="sm"
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" /> Галлерея
          </Button>
          <Button
            onClick={() => setView("table")}
            variant={view === "table" ? "default" : "outline"}
            size="sm"
          >
            <TableIcon className="mr-1.5 h-4 w-4" /> Ҷадвал
          </Button>
          <Button onClick={handlePrint} variant="secondary" size="sm">
            <Printer className="mr-1.5 h-4 w-4" /> Чопи галлерея
          </Button>
        </div>
      </div>

      {view === "gallery" ? (
        <div ref={galleryRef}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.slice(0, 120).map((s) => (
              <div
                key={s.id}
                className="flex flex-col items-center rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <QRCodeSVG value={s.id} size={100} level="L" />
                <p className="mt-2 text-center text-xs text-muted-foreground leading-tight">
                  {s.name}
                  <br />
                  <span className="font-mono">({s.id})</span>
                </p>
              </div>
            ))}
          </div>
          {filtered.length > 120 && (
            <div className="p-3 text-center text-sm text-muted-foreground border-t mt-4">
              120 аз {filtered.length} натиҷа нишон дода шудааст. Ҷустуҷӯро дақиқтар кунед.
            </div>
          )}
        </div>
      ) : (
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
                      <QRCodeSVG value={s.id} size={48} level="L" />
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
      )}
    </div>
  );
}
