import { useState, useMemo, useCallback } from "react";
import { Search, Printer, LayoutGrid, Table as TableIcon, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStudents } from "@/lib/store";
import { MORNING_GRADES, AFTERNOON_GRADES, ALL_GRADES } from "@/lib/students-data";
import { QRCodeSVG } from "qrcode.react";
import gdbhLogo from "@/assets/gdbh-logo.png";
import AddStudentDialog from "@/components/AddStudentDialog";
import { StudentListView } from "@/components/StudentListView";
import { useI18n } from "@/lib/i18n";

interface StudentsPageProps {
  shift?: 'morning' | 'afternoon';
}

export default function Students({ shift }: StudentsPageProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "gallery">("gallery");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const allStudents = useMemo(() => getStudents(), [refreshKey]);
  const handleChanged = useCallback(() => setRefreshKey(k => k + 1), []);

  const grades = shift === 'morning' ? MORNING_GRADES : shift === 'afternoon' ? AFTERNOON_GRADES : ALL_GRADES;

  const students = useMemo(() => {
    let list = shift ? allStudents.filter(s => s.shift === shift) : allStudents;
    if (gradeFilter !== 'all') list = list.filter(s => s.grade === gradeFilter);
    return list;
  }, [allStudents, shift, gradeFilter]);

  const pageTitle = shift === 'morning' ? t("students.morning") : shift === 'afternoon' ? t("students.afternoon") : t("students.all");

  const filtered = useMemo(
    () => students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.grade.toLowerCase().includes(search.toLowerCase())
    ),
    [students, search]
  );

  const handlePrint = (savePdf = false) => {
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = gdbhLogo;
    const run = () => {
      canvas.width = img.width || 200;
      canvas.height = img.height || 200;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      openPrintWindow(canvas.toDataURL("image/png"), savePdf);
    };
    img.onload = run;
    if (img.complete) run();
  };

  const openPrintWindow = (logoBase64: string, savePdf: boolean) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const titleSuffix = savePdf ? ' — Save as PDF' : '';
    printWindow.document.write(`
      <html><head><title>QR Codes${titleSuffix}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; }
        .page { width: 210mm; margin: 0 auto; padding: 8mm 8mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
        .card { text-align: center; border: 1px dashed #999; border-radius: 4px; padding: 4mm 2mm 3mm; page-break-inside: avoid; }
        .qr-wrap { position: relative; display: inline-block; }
        .qr-wrap canvas { display: block; }
        .logo-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
        .logo-overlay img { width: 22px; height: 22px; border-radius: 50%; }
        .name { margin-top: 4px; font-size: 9px; line-height: 1.25; color: #222; font-weight: 700; }
        .meta { font-size: 8px; color: #666; }
        ${savePdf ? '.pdf-banner { background:#fffbe6; border-bottom:1px solid #ffd666; padding:6px; text-align:center; font-size:11px; color:#874d00; } @media print { .pdf-banner { display:none; } }' : ''}
        @media print { body { margin: 0; } .page { padding: 6mm; } }
        @page { size: A4 portrait; margin: 0; }
      </style></head><body>
      ${savePdf ? '<div class="pdf-banner">In the print dialog choose <b>Destination → Save as PDF</b></div>' : ''}
      ${(() => {
        const pages: string[] = [];
        const perPage = 16; // 4 cols x 4 rows
        for (let i = 0; i < filtered.length; i += perPage) {
          const pageStudents = filtered.slice(i, i + perPage);
          pages.push(`<div class="page"><div class="grid">${pageStudents.map(s => `
            <div class="card">
              <div class="qr-wrap" id="qr-${s.id}"></div>
              <div class="name">${s.name}</div>
              <div class="meta">${s.id} — ${s.grade}</div>
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
          QRCode.toCanvas(canvas, id, { width: 110, margin: 1, errorCorrectionLevel: 'H' }, () => {
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
    <div className="space-y-6 print-content animate-fade-in">
      <style>{`
        @media print {
          nav, [data-sidebar], .no-print, header { display: none !important; }
          .print-content { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
      <div className="no-print">
        <h2 className="font-display text-2xl font-bold text-foreground">{pageTitle}</h2>
        <p className="text-muted-foreground">{students.length} {t("students.count")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center no-print">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("students.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("th.grade")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("students.allGrades")}</SelectItem>
            {grades.map(g => (
              <SelectItem key={g} value={g}>{t("students.grade")} {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setView("gallery")} variant={view === "gallery" ? "default" : "outline"} size="sm" className="transition-transform active:scale-95">
            <LayoutGrid className="mr-1.5 h-4 w-4" /> {t("students.gallery")}
          </Button>
          <Button onClick={() => setView("table")} variant={view === "table" ? "default" : "outline"} size="sm" className="transition-transform active:scale-95">
            <TableIcon className="mr-1.5 h-4 w-4" /> {t("students.table")}
          </Button>
          <Button onClick={() => handlePrint(false)} variant="secondary" size="sm" className="transition-transform active:scale-95">
            <Printer className="mr-1.5 h-4 w-4" /> {t("students.print")}
          </Button>
          <Button onClick={() => handlePrint(true)} variant="secondary" size="sm" className="transition-transform active:scale-95">
            <FileDown className="mr-1.5 h-4 w-4" /> {t("students.savePdf")}
          </Button>
          <AddStudentDialog onStudentAdded={handleChanged} />
        </div>
      </div>

      <StudentListView filtered={filtered} view={view} onChanged={handleChanged} />
    </div>
  );
}
