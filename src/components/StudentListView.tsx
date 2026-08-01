import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditDeleteActions } from "@/components/EditDeleteActions";
import { useI18n } from "@/lib/i18n";
import { getActiveSchool, getSelectedSchool, qrValueForStudent } from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";
import type { Student } from "@/lib/store";

function useSchoolLogo() {
  const school = getActiveSchool() || getSelectedSchool();
  return school.logoDataUrl || goldenEmblem;
}

function downloadSvg(svg: SVGSVGElement | null, fileName: string) {
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob(['<?xml version="1.0" standalone="no"?>\n', source], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function QrCode({ value, size, logoSize, logoSrc }: { value: string; size: number; logoSize: number; logoSrc: string }) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="H"
      imageSettings={{
        src: logoSrc,
        height: logoSize,
        width: logoSize,
        excavate: true,
      }}
    />
  );
}

function QrCell({ student, size, logoSize, logoSrc }: { student: Student; size: number; logoSize: number; logoSrc: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const qrValue = qrValueForStudent(student.id);
  const handleDownload = () => {
    const svg = ref.current?.querySelector("svg") as SVGSVGElement | null;
    downloadSvg(svg, `QR_${student.name}_${qrValue}`);
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <div ref={ref} className="inline-block">
        <QrCode value={qrValue} size={size} logoSize={logoSize} logoSrc={logoSrc} />
      </div>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleDownload} title="SVG">
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface Props {
  filtered: Student[];
  view: "table" | "gallery";
  onChanged: () => void;
}

export function StudentListView({ filtered, view, onChanged }: Props) {
  const { t } = useI18n();
  const logoSrc = useSchoolLogo();

  if (view === "gallery") {
    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {filtered.slice(0, 150).map((s) => (
            <div key={s.id} className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card p-4 shadow-sm animate-fade-in">
              <QrCell student={s} size={120} logoSize={28} logoSrc={logoSrc} />
              <p className="mt-2 text-center text-[10px] text-muted-foreground leading-tight font-semibold">
                {s.name}<br /><span className="font-mono">({s.id})</span>
              </p>
              <div className="mt-2">
                <EditDeleteActions student={s} onChanged={onChanged} />
              </div>
            </div>
          ))}
        </div>
        {filtered.length > 150 && (
          <div className="p-3 text-center text-sm text-muted-foreground border-t mt-4">
            150 {t("common.of")} {filtered.length} {t("results.showing")}.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[600px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">{t("th.id")}</TableHead>
              <TableHead className="font-semibold">{t("th.name")}</TableHead>
              <TableHead className="font-semibold">{t("th.grade")}</TableHead>
              <TableHead className="font-semibold">{t("th.shift")}</TableHead>
              <TableHead className="font-semibold">{t("th.qr")}</TableHead>
              <TableHead className="font-semibold">{t("th.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 150).map((s) => (
              <TableRow key={s.id} className="animate-fade-in">
                <TableCell className="font-mono text-sm">{s.id}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell><Badge variant="secondary">{s.grade}</Badge></TableCell>
                <TableCell><Badge variant="outline">{s.shift === 'morning' ? t("shift.morning") : t("shift.afternoon")}</Badge></TableCell>
                <TableCell><QrCell student={s} size={56} logoSize={16} logoSrc={logoSrc} /></TableCell>
                <TableCell><EditDeleteActions student={s} onChanged={onChanged} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
