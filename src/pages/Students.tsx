import { useState, useMemo, useRef, useCallback } from "react";
import { Search, Printer, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudents } from "@/lib/store";
import { QRCodeSVG } from "qrcode.react";
import gdbhLogo from "@/assets/gdbh-logo.png";
import AddStudentDialog from "@/components/AddStudentDialog";

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

  const logoSize = 28;
  const qrSize = 120;

  const renderQRWithLogo = (value: string, size: number, logoSz: number) => (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <QRCodeSVG value={value} size={size} level="H" />
      <div
        className="absolute bg-white rounded-full flex items-center justify-center"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: logoSz + 6,
          height: logoSz + 6,
        }}
      >
        <img src={gdbhLogo} alt="ГДБҲ" className="rounded-full" style={{ width: logoSz, height: logoSz }} />
      </div>
    </div>
  );

  const handlePrint = () => {
    // Convert logo to base64 for print window
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = gdbhLogo;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      const logoBase64 = canvas.toDataURL("image/png");
      openPrintWindow(logoBase64);
    };
    // fallback if image is already loaded
    if (img.complete) {
      canvas.width = img.width || 200;
      canvas.height = img.height || 200;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      const logoBase64 = canvas.toDataURL("image/png");
      openPrintWindow(logoBase64);
    }
  };

  const openPrintWindow = (logoBase64: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Чоп кардани QR-кодҳо</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; }
        .page { width: 210mm; margin: 0 auto; padding: 8mm 12mm; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
        .card {
          text-align: center;
          border: 1px dashed #999;
          border-radius: 4px;
          padding: 10mm 6mm 8mm;
          page-break-inside: avoid;
          position: relative;
        }
        .qr-wrap { position: relative; display: inline-block; }
        .qr-wrap canvas { display: block; }
        .logo-overlay {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: #fff; border-radius: 50%;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
        }
        .logo-overlay img { width: 30px; height: 30px; border-radius: 50%; }
        .name { margin-top: 6px; font-size: 10px; line-height: 1.3; color: #333; font-weight: 600; }
        @media print {
          body { margin: 0; }
          .page { padding: 6mm 10mm; }
        }
        @page { size: A4 portrait; margin: 0; }
      </style></head><body>
      ${(() => {
        const pages: string[] = [];
        for (let i = 0; i < filtered.length; i += 8) {
          const pageStudents = filtered.slice(i, i + 8);
          pages.push(`<div class="page"><div class="grid">${pageStudents.map(s => `
            <div class="card">
              <div class="qr-wrap" id="qr-${s.id}"></div>
              <div class="name">${s.name.toLowerCase()}<br/>(${s.id})</div>
            </div>
          `).join('')}</div></div>`);
        }
        return pages.join('');
      })()}
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
      <script>
        const logo = "${logoBase64}";
        const containers = document.querySelectorAll('[id^="qr-"]');
        let done = 0;
        containers.forEach(el => {
          const id = el.id.replace('qr-', '');
          const canvas = document.createElement('canvas');
          QRCode.toCanvas(canvas, id, { width: 160, margin: 1, errorCorrectionLevel: 'H' }, () => {
            el.appendChild(canvas);
            const overlay = document.createElement('div');
            overlay.className = 'logo-overlay';
            const img = document.createElement('img');
            img.src = logo;
            overlay.appendChild(img);
            el.appendChild(overlay);
            done++;
            if (done === containers.length) setTimeout(() => window.print(), 500);
          });
        });
        setTimeout(() => window.print(), 3000);
      <\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 print-content">
      <style>{`
        @media print {
          nav, [data-sidebar], .no-print, header { display: none !important; }
          .print-content { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
      <div className="no-print">
        <h2 className="font-display text-2xl font-bold text-foreground">Базаи маълумоти хонандагон</h2>
        <p className="text-muted-foreground">{students.length} хонанда сабтном шудааст</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center no-print">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ҷустуҷӯ бо ном, ID ё синф..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
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
            <Printer className="mr-1.5 h-4 w-4" /> Чоп кардани QR-кодҳо
          </Button>
        </div>
      </div>

      {view === "gallery" ? (
        <div ref={galleryRef}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {filtered.slice(0, 120).map((s) => (
              <div
                key={s.id}
                className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card p-4 shadow-sm"
              >
                {renderQRWithLogo(s.id, qrSize, logoSize)}
                <p className="mt-2 text-center text-[10px] text-muted-foreground leading-tight lowercase font-semibold">
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
                      {renderQRWithLogo(s.id, 56, 16)}
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
