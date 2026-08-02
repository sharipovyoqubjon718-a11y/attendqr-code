// Teachers & class supervisors (per school, localStorage)
import { scopedKey } from "./schools";
import { sanitizeText } from "./security";

export type StaffRole = "teacher" | "director" | "deputy_academic" | "deputy_upbringing";

/** Roles that may only ever be held by a single person per school. */
export const UNIQUE_ROLES: StaffRole[] = ["director", "deputy_academic", "deputy_upbringing"];

export interface Teacher {
  id: string;
  fullName: string;
  subject: string;
  role: StaffRole;
  isSupervisor: boolean;
  grade?: string;    // class number, e.g. "5"
  parallel?: string; // parallel letter, e.g. "А" or "-"
}

const KEY = "teachers";

export function getTeachers(): Teacher[] {
  try {
    const raw = localStorage.getItem(scopedKey(KEY));
    const parsed = raw ? (JSON.parse(raw) as Teacher[]) : [];
    if (!Array.isArray(parsed)) return [];
    // Legacy rows have no role — default them to plain teachers.
    return parsed.map((t) => ({ ...t, role: t.role ?? "teacher" }));
  } catch {
    return [];
  }
}

export function saveTeachers(list: Teacher[]) {
  localStorage.setItem(scopedKey(KEY), JSON.stringify(list));
}

/** Unique roles already taken — the UI hides these from the role picker. */
export function takenRoles(exceptId?: string): StaffRole[] {
  return getTeachers()
    .filter((t) => t.id !== exceptId && UNIQUE_ROLES.includes(t.role))
    .map((t) => t.role);
}

export function addTeacher(
  input: Omit<Teacher, "id">,
): { teacher?: Teacher; error?: string } {
  const fullName = sanitizeText(input.fullName, 120);
  const role: StaffRole = input.role ?? "teacher";
  const subject = sanitizeText(input.subject, 80);
  if (!fullName) return { error: "missing" };
  if (role === "teacher" && !subject) return { error: "missing" };
  if (UNIQUE_ROLES.includes(role) && takenRoles().includes(role)) return { error: "role-taken" };
  const isSupervisor = role === "teacher" ? !!input.isSupervisor : false;
  if (isSupervisor && !input.grade) return { error: "missing-class" };
  const teacher: Teacher = {
    id: `t_${Date.now().toString(36)}`,
    fullName,
    subject,
    role,
    isSupervisor,
    grade: isSupervisor ? input.grade : undefined,
    parallel: isSupervisor ? input.parallel || "-" : undefined,
  };
  const list = getTeachers();
  list.push(teacher);
  saveTeachers(list);
  return { teacher };
}

export function updateTeacher(id: string, patch: Partial<Teacher>): { error?: string } {
  if (patch.role && UNIQUE_ROLES.includes(patch.role) && takenRoles(id).includes(patch.role)) {
    return { error: "role-taken" };
  }
  saveTeachers(
    getTeachers().map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      if (patch.fullName !== undefined) next.fullName = sanitizeText(patch.fullName, 120) || t.fullName;
      if (patch.subject !== undefined) next.subject = sanitizeText(patch.subject, 80);
      if (next.role !== "teacher") next.isSupervisor = false;
      if (next.isSupervisor === false) { next.grade = undefined; next.parallel = undefined; }
      return next;
    }),
  );
  return {};
}

export function deleteTeacher(id: string) {
  saveTeachers(getTeachers().filter((t) => t.id !== id));
}

export function supervisorLabel(t: Teacher): string {
  if (!t.isSupervisor || !t.grade) return "";
  return t.parallel && t.parallel !== "-" ? `${t.grade}-${t.parallel}` : t.grade;
}

export const ROLE_LABEL_KEY: Record<StaffRole, string> = {
  teacher: "teachers.roleTeacher",
  director: "teachers.roleDirector",
  deputy_academic: "teachers.roleDeputyAcademic",
  deputy_upbringing: "teachers.roleDeputyUpbringing",
};
