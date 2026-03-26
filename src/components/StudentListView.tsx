import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import gdbhLogo from "@/assets/gdbh-logo.png";
import type { Student } from "@/lib/store";

function QRWithLogo({ value, size, logoSize }: { value: string; size: number; logoSize: number }) {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <QRCodeSVG value={value} size={size} level="H" />
      <div
        className="absolute bg-card rounded-full flex items-center justify-center"
        style={{
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: logoSize + 6, height: logoSize + 6,
        }}
      >
        <img src={gdbhLogo} alt="ГДБҲ" className="rounded-full" style={{ width: logoSize, height: logoSize }} />
      </div>
    </div>
  );
}

interface Props {
  filtered: Student[];
  view: "table" | "gallery";
}

export function StudentListView({ filtered, view }: Props) {
  if (view === "gallery") {
    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {filtered.slice(0, 150).map((s) => (
            <div key={s.id} className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card p-4 shadow-sm">
              <QRWithLogo value={s.id} size={120} logoSize={28} />
              <p className="mt-2 text-center text-[10px] text-muted-foreground leading-tight lowercase font-semibold">
                {s.name}<br /><span className="font-mono">({s.id})</span>
              </p>
            </div>
          ))}
        </div>
        {filtered.length > 150 && (
          <div className="p-3 text-center text-sm text-muted-foreground border-t mt-4">
            150 аз {filtered.length} натиҷа нишон дода шудааст.
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
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Ном</TableHead>
              <TableHead className="font-semibold">Синф</TableHead>
              <TableHead className="font-semibold">QR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 150).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.id}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell><Badge variant="secondary">{s.className}</Badge></TableCell>
                <TableCell><QRWithLogo value={s.id} size={56} logoSize={16} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
