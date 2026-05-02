import { useState, useMemo, useCallback } from "react";
import { Search, Printer, LayoutGrid, Table as TableIcon, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStudents } from "@/lib/store";
import { getSelectedSchool } from "@/lib/schools";
import { MORNING_GRADES, AFTERNOON_GRADES, ALL_GRADES } from "@/lib/students-data";
import goldenEmblem from "@/assets/golden-emblem.png";
import AddStudentDialog from "@/components/AddStudentDialog";
import { StudentListView } from "@/components/StudentListView";
import { generateQrPdf } from "@/lib/qr-pdf";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

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

  const handleSavePdf = async () => {
    if (filtered.length === 0) {
      toast.error(t("students.count"));
      return;
    }
    const school = getSelectedSchool();
    const logoSrc = school.logoDataUrl || goldenEmblem;
    toast.info("PDF…");
    try {
      await generateQrPdf({
        students: filtered.map((s) => ({ id: s.id, name: s.name, grade: s.grade })),
        schoolName: school.name,
        logoSrc,
      });
      toast.success("PDF ✓");
    } catch (err) {
      console.error(err);
      toast.error("PDF error");
    }
  };

  const handlePrint = () => window.print();

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
