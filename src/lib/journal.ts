import { getActiveSchoolId, getSelectedSchoolId } from "./schools";

export type Quarter = "q1" | "q2" | "q3" | "q4";

export interface JournalLesson {
  id: string;
  date: string; // YYYY-MM-DD
  topic: string;
}

export interface JournalData {
  // grades[studentId][lessonId] = number 1..10
  grades: Record<string, Record<string, number>>;
  // lessons per quarter
  lessons: Record<Quarter, JournalLesson[]>;
}

export const DEFAULT_SUBJECTS: string[] = [
  "Забони тоҷикӣ",
  "Адабиёти тоҷик",
  "Математика",
  "Алгебра",
  "Геометрия",
  "Физика",
  "Химия",
  "Биология",
  "Информатика",
  "Таърих",
  "География",
  "Забони русӣ",
  "Забони англисӣ",
  "Тарбияи ҷисмонӣ",
];

function aid() {
  return getActiveSchoolId() || getSelectedSchoolId() || "gdbh";
}

const SUBJECTS_KEY = () => `school_${aid()}_journal_subjects`;
const KEY = (cls: string, letter: string, subject: string) =>
  `school_${aid()}_journal_${cls}_${letter}_${encodeURIComponent(subject)}`;

export function getSubjects(): string[] {
  const stored = localStorage.getItem(SUBJECTS_KEY());
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }
  localStorage.setItem(SUBJECTS_KEY(), JSON.stringify(DEFAULT_SUBJECTS));
  return DEFAULT_SUBJECTS;
}

export function setSubjects(subjects: string[]) {
  localStorage.setItem(SUBJECTS_KEY(), JSON.stringify(subjects));
}

const empty = (): JournalData => ({
  grades: {},
  lessons: { q1: [], q2: [], q3: [], q4: [] },
});

export function loadJournal(cls: string, letter: string, subject: string): JournalData {
  const stored = localStorage.getItem(KEY(cls, letter, subject));
  if (!stored) return empty();
  try {
    const parsed = JSON.parse(stored);
    return {
      grades: parsed.grades || {},
      lessons: {
        q1: parsed.lessons?.q1 || [],
        q2: parsed.lessons?.q2 || [],
        q3: parsed.lessons?.q3 || [],
        q4: parsed.lessons?.q4 || [],
      },
    };
  } catch {
    return empty();
  }
}

export function saveJournal(cls: string, letter: string, subject: string, data: JournalData) {
  localStorage.setItem(KEY(cls, letter, subject), JSON.stringify(data));
}

// Date → quarter (Tajik academic year)
// Q1: Sep 1 – Oct 31, Q2: Nov 1 – Dec 31, Q3: Jan 11 – Mar 23, Q4: Apr 1 – May 31
export function quarterForDate(date: Date): Quarter {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 9 || m === 10) return "q1";
  if (m === 11 || m === 12) return "q2";
  if (m === 1 && d >= 11) return "q3";
  if (m === 2 || m === 3) return "q3";
  if (m === 4 || m === 5) return "q4";
  // fallback to nearest
  if (m <= 1) return "q2";
  return "q4";
}

export function avgForStudent(data: JournalData, studentId: string, quarters: Quarter[]): number | null {
  const all: number[] = [];
  for (const q of quarters) {
    for (const l of data.lessons[q]) {
      const g = data.grades[studentId]?.[l.id];
      if (typeof g === "number") all.push(g);
    }
  }
  if (!all.length) return null;
  return Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10;
}

export function quarterAvg(data: JournalData, studentId: string, q: Quarter): number | null {
  return avgForStudent(data, studentId, [q]);
}

export function gradeColorClass(g: number): string {
  if (g >= 8) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (g >= 4) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

export function parseGradeFromString(g: string): { cls: string; letter: string } | null {
  // matches "10-А" or "10А" or "1-Б"
  const m = String(g).match(/^(\d{1,2})\s*[-\s]?\s*([А-Яа-яA-Za-zӢӯҶҷҲҳҚқҒғӣЁё])?$/);
  if (!m) return null;
  return { cls: m[1], letter: (m[2] || "").toUpperCase() };
}

export function lastNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
