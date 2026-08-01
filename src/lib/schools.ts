// Multi-school management with per-school credentials & settings (localStorage)
import { sanitizeText, sanitizeUsername, sanitizePrefix } from "./security";

export interface School {
  id: string;          // internal storage partition key
  prefix: string;      // student ID prefix (e.g. "ГДБҲ")
  name: string;        // "Номи муассиса"
  username: string;
  password: string;
  logoDataUrl?: string;
  restDays?: string[]; // ISO date strings YYYY-MM-DD
  active?: boolean;    // inactive schools cannot be selected on login screen
  shiftOverrides?: Record<string, 'morning' | 'afternoon'>; // grade -> shift
}

// Default shift rule based on leading class number
// Shift 1 (Morning, 8:00 - 13:00): classes 1, 7, 8, 9, 10
// Shift 2 (Afternoon, 13:00+):     classes 2, 3, 4, 5, 6
const SHIFT1_GRADES = new Set([1, 7, 8, 9, 10]);
export function defaultShiftForGrade(grade: string): 'morning' | 'afternoon' {
  const n = parseInt(String(grade).match(/^\d+/)?.[0] ?? '', 10);
  if (Number.isFinite(n) && SHIFT1_GRADES.has(n)) return 'morning';
  return 'afternoon';
}
export function getShiftForGrade(school: School, grade: string): 'morning' | 'afternoon' {
  return school.shiftOverrides?.[grade] ?? defaultShiftForGrade(grade);
}

const SCHOOLS_KEY = "sams_schools_v3";
const SELECTED_KEY = "sams_selected_school";
const SESSION_KEY = "sams_active_session";

const DEFAULT_SCHOOLS: School[] = [
  { id: "gdbh", prefix: "ГДБҲ", name: "ГДБҲ", username: "GDBH", password: "2004" },
];

export const MASTER_USERNAME = "GDBH";
export const MASTER_PASSWORD = "2004";
export const HIDDEN_ADMIN_PASSWORD = "Yoqubjon";

export function getSchools(): School[] {
  try {
    const raw = localStorage.getItem(SCHOOLS_KEY);
    if (!raw) {
      // Migrate from v2
      const v2 = localStorage.getItem("sams_schools_v2");
      if (v2) {
        const parsed = JSON.parse(v2) as Array<Partial<School> & { id: string; name: string }>;
        const migrated: School[] = parsed.map((p) => ({
          id: p.id,
          prefix: p.id === "gdbh" ? "ГДБҲ" : sanitizePrefix(p.name) || "SCH",
          name: p.name,
          username: p.username || (p.id === "gdbh" ? "GDBH" : sanitizeUsername(p.name)),
          password: p.password || (p.id === "gdbh" ? "2004" : "1234"),
          logoDataUrl: p.logoDataUrl,
          restDays: p.restDays,
        }));
        localStorage.setItem(SCHOOLS_KEY, JSON.stringify(migrated));
        return migrated;
      }
      localStorage.setItem(SCHOOLS_KEY, JSON.stringify(DEFAULT_SCHOOLS));
      return DEFAULT_SCHOOLS;
    }
    const parsed = JSON.parse(raw) as School[];
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SCHOOLS;
  } catch {
    return DEFAULT_SCHOOLS;
  }
}

export function saveSchools(schools: School[]) {
  localStorage.setItem(SCHOOLS_KEY, JSON.stringify(schools));
}

export interface NewSchoolInput {
  name: string;
  prefix: string;
  username: string;
  password: string;
}

export function addSchool(input: NewSchoolInput): { school?: School; error?: string } {
  const name = sanitizeText(input.name, 120);
  const prefix = sanitizePrefix(input.prefix);
  const username = sanitizeUsername(input.username);
  const password = sanitizeText(input.password, 64);
  if (!name || !prefix || !username || !password) return { error: "missing" };
  const schools = getSchools();
  if (schools.some((s) => s.prefix.toUpperCase() === prefix.toUpperCase())) {
    return { error: "prefix-exists" };
  }
  if (schools.some((s) => s.username.toLowerCase() === username.toLowerCase())) {
    return { error: "username-exists" };
  }
  const school: School = {
    id: `s_${Date.now().toString(36)}`,
    name, prefix, username, password,
  };
  schools.push(school);
  saveSchools(schools);
  return { school };
}

export function updateSchool(id: string, patch: Partial<School>) {
  const schools = getSchools().map((s) => {
    if (s.id !== id) return s;
    const next = { ...s, ...patch };
    if (patch.name !== undefined) next.name = sanitizeText(patch.name, 120) || s.name;
    if (patch.username !== undefined) next.username = sanitizeUsername(patch.username) || s.username;
    if (patch.password !== undefined) next.password = sanitizeText(patch.password, 64) || s.password;
    if (patch.prefix !== undefined && s.id !== "gdbh") next.prefix = sanitizePrefix(patch.prefix) || s.prefix;
    return next;
  });
  saveSchools(schools);
}

export function deleteSchool(id: string) {
  if (id === "gdbh") return;
  const schools = getSchools().filter((s) => s.id !== id);
  saveSchools(schools.length ? schools : DEFAULT_SCHOOLS);
  if (getSelectedSchoolId() === id) {
    setSelectedSchoolId((schools[0] ?? DEFAULT_SCHOOLS[0]).id);
  }
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`school_${id}_`))
    .forEach((k) => localStorage.removeItem(k));
}

export function getSelectedSchoolId(): string {
  return localStorage.getItem(SELECTED_KEY) || getSchools()[0]?.id || "gdbh";
}

export function setSelectedSchoolId(id: string) {
  localStorage.setItem(SELECTED_KEY, id);
}

export function getSelectedSchool(): School {
  const id = getSelectedSchoolId();
  return getSchools().find((s) => s.id === id) ?? getSchools()[0];
}

export function getActiveSchoolId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
export function setActiveSchoolId(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

export function getActiveSchool(): School | null {
  const id = getActiveSchoolId();
  if (!id) return null;
  return getSchools().find((s) => s.id === id) ?? null;
}

export function tryLogin(schoolId: string, username: string, password: string): boolean {
  const u = sanitizeUsername(username);
  const p = sanitizeText(password, 64);
  if (u === MASTER_USERNAME && p === MASTER_PASSWORD) {
    setActiveSchoolId(schoolId || "gdbh");
    return true;
  }
  const school = getSchools().find((s) => s.id === schoolId);
  if (!school) return false;
  if (school.username === u && school.password === p) {
    setActiveSchoolId(schoolId);
    return true;
  }
  return false;
}

export function scopedKey(base: string): string {
  const id = getActiveSchoolId() || getSelectedSchoolId();
  return `school_${id}_${base}`;
}

// ---------------------------------------------------------------------------
// Global brand (app icon / favicon / header) — master school (ГДБҲ) only
// ---------------------------------------------------------------------------
export const MASTER_SCHOOL_ID = "gdbh";
const GLOBAL_LOGO_KEY = "sams_global_logo";

export function isMasterSchool(school?: School | null): boolean {
  return (school?.id ?? "") === MASTER_SCHOOL_ID;
}

/** Returns the global brand logo (data URL) or null when the default is used. */
export function getGlobalLogo(): string | null {
  try {
    const v = localStorage.getItem(GLOBAL_LOGO_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

/** Only the master administrator account may change the global brand. */
export function setGlobalLogo(dataUrl: string, schoolId: string): boolean {
  if (schoolId !== MASTER_SCHOOL_ID) return false;
  localStorage.setItem(GLOBAL_LOGO_KEY, dataUrl);
  return true;
}

// ---------------------------------------------------------------------------
// QR payload — strictly [Prefix][Student ID]
// ---------------------------------------------------------------------------
/**
 * Builds the QR payload for a student, always using the prefix that belongs to
 * the student's own school. Any legacy/foreign prefix baked into the stored id
 * is stripped so the code always reads `[Prefix][Number]`.
 */
export function qrValueForStudent(studentId: string, school?: School | null): string {
  const s = school ?? getActiveSchool() ?? getSelectedSchool();
  const prefix = (s?.prefix || "").trim();
  const raw = String(studentId || "").trim();
  if (!prefix) return raw;
  // Number part = trailing digits of the stored id (ignores any old prefix).
  const digits = raw.match(/(\d+)\s*$/)?.[1];
  if (!digits) return raw.toUpperCase().startsWith(prefix.toUpperCase()) ? raw : `${prefix}${raw}`;
  return `${prefix}${digits}`;
}
