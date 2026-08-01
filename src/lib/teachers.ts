// Teachers & class supervisors (per school, localStorage)
import { scopedKey } from "./schools";
import { sanitizeText } from "./security";

export interface Teacher {
  id: string;
  fullName: string;
  subject: string;
  isSupervisor: boolean;
  grade?: string;    // class number, e.g. "5"
  parallel?: string; // parallel letter, e.g. "А" or "-"
}

const KEY = "teachers";

export function getTeachers(): Teacher[] {
  try {
    const raw = localStorage.getItem(scopedKey(KEY));
    const parsed = raw ? (JSON.parse(raw) as Teacher[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTeachers(list: Teacher[]) {
  localStorage.setItem(scopedKey(KEY), JSON.stringify(list));
}

export function addTeacher(input: Omit<Teacher, "id">): { teacher?: Teacher; error?: string } {
  const fullName = sanitizeText(input.fullName, 120);
  const subject = sanitizeText(input.subject, 80);
  if (!fullName || !subject) return { error: "missing" };
  if (input.isSupervisor && !input.grade) return { error: "missing-class" };
  const teacher: Teacher = {
    id: `t_${Date.now().toString(36)}`,
    fullName,
    subject,
    isSupervisor: !!input.isSupervisor,
    grade: input.isSupervisor ? input.grade : undefined,
    parallel: input.isSupervisor ? input.parallel || "-" : undefined,
  };
  const list = getTeachers();
  list.push(teacher);
  saveTeachers(list);
  return { teacher };
}

export function updateTeacher(id: string, patch: Partial<Teacher>) {
  saveTeachers(
    getTeachers().map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      if (patch.fullName !== undefined) next.fullName = sanitizeText(patch.fullName, 120) || t.fullName;
      if (patch.subject !== undefined) next.subject = sanitizeText(patch.subject, 80) || t.subject;
      if (next.isSupervisor === false) { next.grade = undefined; next.parallel = undefined; }
      return next;
    }),
  );
}

export function deleteTeacher(id: string) {
  saveTeachers(getTeachers().filter((t) => t.id !== id));
}

export function supervisorLabel(t: Teacher): string {
  if (!t.isSupervisor || !t.grade) return "";
  return t.parallel && t.parallel !== "-" ? `${t.grade}-${t.parallel}` : t.grade;
}
