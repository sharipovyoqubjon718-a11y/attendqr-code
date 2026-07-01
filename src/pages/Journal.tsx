import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, QrCode, Trash2, BookOpen, Pencil, Settings2 } from "lucide-react";
import { toast } from "sonner";
import jsQR from "jsqr";
import { getStudents, addStudent, type Student } from "@/lib/store";
import { getActiveSchool, getSelectedSchool } from "@/lib/schools";
import { sanitizeText } from "@/lib/security";
import {
  loadJournal, saveJournal, getSubjects, setSubjects as persistSubjects,
  quarterForDate, quarterAvg, avgForStudent, gradeColorClass,
  type Quarter, type JournalData,
} from "@/lib/journal";
import { CLASSES as SHARED_CLASSES, PARALLELS as SHARED_PARALLELS, parseGrade, makeGrade, matchesClassParallel } from "@/lib/classes";

const QUARTERS: { id: Quarter; label: string }[] = [
  { id: "q1", label: "Чоряки 1" },
  { id: "q2", label: "Чоряки 2" },
  { id: "q3", label: "Чоряки 3" },
  { id: "q4", label: "Чоряки 4" },
];

export default function Journal() {
  const school = getActiveSchool() || getSelectedSchool();
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const refresh = () => setStudents(getStudents());

  const [subjects, setSubjectsState] = useState<string[]>(() => getSubjects());
  const commitSubjects = (next: string[]) => {
    persistSubjects(next);
    setSubjectsState(next);
  };

  const [cls, setCls] = useState<string>("");
  const [letter, setLetter] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("q1");
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Fixed class list 1..11 and parallel options ("-", А..Д)
  const classes = SHARED_CLASSES;
  const PARALLELS = SHARED_PARALLELS;

  const ready = !!cls && !!letter && !!subject;

  // Filtered roster, alphabetical by last name (last name is first token in saved "Насаб Ном")
  const roster = useMemo(() => {
    if (!cls || !letter) return [];
    return students
      .filter((s) => matchesClassParallel(s.grade, cls, letter))
      .sort((a, b) => {
        const la = (a.name.trim().split(/\s+/)[0] || a.name);
        const lb = (b.name.trim().split(/\s+/)[0] || b.name);
        return la.localeCompare(lb, "ru");
      });
  }, [students, cls, letter]);


  // Journal data
  const [data, setData] = useState<JournalData>(() => ({
    grades: {}, lessons: { q1: [], q2: [], q3: [], q4: [] },
  }));

  useEffect(() => {
    if (ready) setData(loadJournal(cls, letter, subject));
  }, [cls, letter, subject, ready]);

  const persist = (next: JournalData) => {
    setData(next);
    if (ready) saveJournal(cls, letter, subject, next);
  };

  // Selecting a calendar date → switch tab to its quarter
  useEffect(() => {
    if (date) setActiveTab(quarterForDate(date));
  }, [date]);

  // Add lesson to a quarter
  const addLesson = (q: Quarter) => {
    const d = (date || new Date()).toISOString().split("T")[0];
    const topic = window.prompt("Мавзӯи дарс:") || "";
    const lesson = { id: crypto.randomUUID(), date: d, topic: sanitizeText(topic, 80) };
    persist({ ...data, lessons: { ...data.lessons, [q]: [...data.lessons[q], lesson] } });
  };

  const removeLesson = (q: Quarter, id: string) => {
    if (!confirm("Дарсро пок мекунед?")) return;
    const newGrades: typeof data.grades = {};
    for (const [sid, g] of Object.entries(data.grades)) {
      const { [id]: _, ...rest } = g;
      newGrades[sid] = rest;
    }
    persist({
      grades: newGrades,
      lessons: { ...data.lessons, [q]: data.lessons[q].filter((l) => l.id !== id) },
    });
  };

  const setGrade = (sid: string, lid: string, value: string) => {
    const v = parseInt(value, 10);
    const next = { ...data, grades: { ...data.grades, [sid]: { ...(data.grades[sid] || {}) } } };
    if (!value) {
      delete next.grades[sid][lid];
    } else if (Number.isFinite(v) && v >= 1 && v <= 10) {
      next.grades[sid][lid] = v;
    } else {
      toast.error("Баҳо аз 1 то 10");
      return;
    }
    persist(next);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top selectors (sidebar-style block) */}
      <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" /> Журнал
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Синф</Label>
            <Select value={cls} onValueChange={(v) => { setCls(v); setLetter(""); }}>
              <SelectTrigger><SelectValue placeholder="Интихоб..." /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Параллел</Label>
            <Select value={letter} onValueChange={setLetter} disabled={!cls}>
              <SelectTrigger><SelectValue placeholder="А, Б, В..." /></SelectTrigger>
              <SelectContent>
                {PARALLELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Фан</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Интихоб..." /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!ready ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            Барои оғоз: синф, параллел ва фанро интихоб кунед.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-card border rounded-lg p-4 shadow-sm">
            <div>
              <h2 className="font-display font-bold text-lg">
                Синф: {cls} {letter} | Фан: {subject}
              </h2>
              <p className="text-xs text-muted-foreground">{school.name} · {roster.length} хонанда</p>
            </div>
            <div className="flex gap-2">
              <AddStudentInline cls={cls} letter={letter} onAdded={refresh} />
              <QrAddStudent cls={cls} letter={letter} onAdded={refresh} />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto">
              {QUARTERS.map((q) => (
                <TabsTrigger key={q.id} value={q.id}>{q.label}</TabsTrigger>
              ))}
              <TabsTrigger value="half">Нимсола</TabsTrigger>
              <TabsTrigger value="annual">Солона</TabsTrigger>
            </TabsList>

            {QUARTERS.map((q) => (
              <TabsContent key={q.id} value={q.id} className="mt-3">
                <QuarterGrid
                  q={q.id}
                  data={data}
                  roster={roster}
                  onSetGrade={setGrade}
                  onAddLesson={() => addLesson(q.id)}
                  onRemoveLesson={(lid) => removeLesson(q.id, lid)}
                />
              </TabsContent>
            ))}

            <TabsContent value="half" className="mt-3">
              <AverageGrid
                roster={roster}
                title="Ҳисоби нимсола (Чоряки 1 + 2)"
                compute={(s) => avgForStudent(data, s.id, ["q1", "q2"])}
              />
            </TabsContent>
            <TabsContent value="annual" className="mt-3">
              <AverageGrid
                roster={roster}
                title="Ҳисоби солона (Чоряки 1–4)"
                compute={(s) => avgForStudent(data, s.id, ["q1", "q2", "q3", "q4"])}
                extras={(s) => QUARTERS.map((q) => quarterAvg(data, s.id, q.id))}
              />
            </TabsContent>
          </Tabs>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Тақвим</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                className="rounded-md border pointer-events-auto"
              />
              {date && (
                <p className="text-xs text-muted-foreground mt-2">
                  Сана: {date.toLocaleDateString("ru-RU")} → {QUARTERS.find(q => q.id === quarterForDate(date))?.label}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function QuarterGrid({
  q, data, roster, onSetGrade, onAddLesson, onRemoveLesson,
}: {
  q: Quarter;
  data: JournalData;
  roster: Student[];
  onSetGrade: (sid: string, lid: string, v: string) => void;
  onAddLesson: () => void;
  onRemoveLesson: (lid: string) => void;
}) {
  const lessons = data.lessons[q];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Дарсҳо: {lessons.length}</CardTitle>
        <Button size="sm" onClick={onAddLesson} className="gap-1">
          <Plus className="h-4 w-4" /> Дарси нав
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/50">
              <th className="sticky left-0 bg-slate-100 dark:bg-slate-800/50 text-left px-3 py-2 border min-w-[200px]">Хонанда</th>
              {lessons.map((l) => (
                <th key={l.id} className="border px-1 py-1 text-center align-bottom min-w-[60px]">
                  <div className="text-[10px] text-muted-foreground">{l.date.slice(5)}</div>
                  <div
                    className="text-[10px] font-medium leading-tight max-h-16 overflow-hidden"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    title={l.topic}
                  >
                    {l.topic || "—"}
                  </div>
                  <button
                    onClick={() => onRemoveLesson(l.id)}
                    className="text-destructive opacity-50 hover:opacity-100 mt-1"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3 w-3 inline" />
                  </button>
                </th>
              ))}
              <th className="border px-2 py-2 text-center">Миёна</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((s) => {
              const avg = quarterAvg(data, s.id, q);
              return (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="sticky left-0 bg-background border px-3 py-1 font-medium">{s.name}</td>
                  {lessons.map((l) => {
                    const v = data.grades[s.id]?.[l.id];
                    return (
                      <td key={l.id} className="border p-0">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={v ?? ""}
                          onChange={(e) => onSetGrade(s.id, l.id, e.target.value)}
                          className={`w-full h-9 text-center text-sm border-0 outline-none focus:ring-2 focus:ring-primary ${v ? gradeColorClass(v) : ""}`}
                        />
                      </td>
                    );
                  })}
                  <td className="border px-2 py-1 text-center font-semibold">
                    {avg !== null ? avg.toFixed(1) : "—"}
                  </td>
                </tr>
              );
            })}
            {roster.length === 0 && (
              <tr><td colSpan={lessons.length + 2} className="text-center py-6 text-muted-foreground">Хонанда нест</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AverageGrid({
  roster, title, compute, extras,
}: {
  roster: Student[];
  title: string;
  compute: (s: Student) => number | null;
  extras?: (s: Student) => (number | null)[];
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/50">
              <th className="text-left px-3 py-2 border">Хонанда</th>
              {extras && QUARTERS.map((q) => (
                <th key={q.id} className="border px-2 py-2 text-center">{q.label}</th>
              ))}
              <th className="border px-2 py-2 text-center">Миёна</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((s) => {
              const avg = compute(s);
              const ex = extras?.(s) || [];
              return (
                <tr key={s.id}>
                  <td className="border px-3 py-1 font-medium">{s.name}</td>
                  {ex.map((v, i) => (
                    <td key={i} className={`border px-2 py-1 text-center ${v ? gradeColorClass(Math.round(v)) : ""}`}>
                      {v !== null ? v.toFixed(1) : "—"}
                    </td>
                  ))}
                  <td className={`border px-2 py-1 text-center font-bold ${avg ? gradeColorClass(Math.round(avg)) : ""}`}>
                    {avg !== null ? avg.toFixed(1) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AddStudentInline({ cls, letter, onAdded }: { cls: string; letter: string; onAdded: () => void }) {
  const school = getActiveSchool() || getSelectedSchool();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [classNum, setClassNum] = useState(cls);
  const [classLetter, setClassLetter] = useState(letter);

  useEffect(() => { setClassNum(cls); setClassLetter(letter); }, [cls, letter, open]);

  const CLASSES = SHARED_CLASSES;
  const PARALLELS = SHARED_PARALLELS;

  const submit = () => {
    const f = sanitizeText(first, 60);
    const l = sanitizeText(last, 60);
    if (!f || !l || !classNum || !classLetter) { toast.error("Ҳамаи майдонҳоро пур кунед"); return; }
    const id = `${school.prefix}${Date.now().toString().slice(-6)}`;
    const ok = addStudent({
      id,
      name: `${l} ${f}`,
      grade: makeGrade(classNum, classLetter),
      shift: "morning",
      qrCode: id,
    });
    if (!ok) { toast.error("Хато"); return; }
    toast.success("Хонанда илова шуд");
    setOpen(false); setFirst(""); setLast("");
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Хонанда</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Иловаи хонанда</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Насаб</Label><Input value={last} onChange={(e) => setLast(e.target.value)} /></div>
          <div><Label>Ном</Label><Input value={first} onChange={(e) => setFirst(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Синф *</Label>
              <Select value={classNum} onValueChange={setClassNum}>
                <SelectTrigger><SelectValue placeholder="Интихоб..." /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Параллел *</Label>
              <Select value={classLetter} onValueChange={setClassLetter}>
                <SelectTrigger><SelectValue placeholder="А, Б, В..." /></SelectTrigger>
                <SelectContent>
                  {PARALLELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Сабт</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QrAddStudent({ cls, letter, onAdded }: { cls: string; letter: string; onAdded: () => void }) {
  const school = getActiveSchool() || getSelectedSchool();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((r) => (img.onload = r));
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height);
    if (!code) { toast.error("QR пайдо нашуд"); return; }
    let payload: any = code.data;
    try { payload = JSON.parse(code.data); } catch {}
    const name = typeof payload === "object" ? (payload.name || `${payload.last || ""} ${payload.first || ""}`.trim()) : String(payload);
    const grade = typeof payload === "object" ? (payload.grade || makeGrade(cls, letter)) : makeGrade(cls, letter);
    if (!name) { toast.error("Маълумоти QR хато"); return; }
    const id = `${school.prefix}${Date.now().toString().slice(-6)}`;
    const ok = addStudent({ id, name: sanitizeText(name, 100), grade, shift: "morning", qrCode: id });
    if (!ok) { toast.error("Хато"); return; }
    toast.success(`Илова: ${name}`);
    onAdded();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
      <Button size="sm" variant="outline" className="gap-1" onClick={() => fileRef.current?.click()}>
        <QrCode className="h-4 w-4" /> QR
      </Button>
    </>
  );
}
