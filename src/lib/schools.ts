// Multi-school management with per-school credentials & settings (localStorage)

export interface School {
  id: string;
  name: string;
  username: string;
  password: string;
  logoDataUrl?: string;
  restDays?: string[]; // ISO date strings YYYY-MM-DD
}

const SCHOOLS_KEY = "sams_schools_v2";
const SELECTED_KEY = "sams_selected_school";
const SESSION_KEY = "sams_active_session"; // current logged-in school id

const DEFAULT_SCHOOLS: School[] = [
  { id: "gdbh", name: "ГДБҲ — н. Муъминобод", username: "GDBH", password: "2004" },
];

export const MASTER_USERNAME = "GDBH";
export const MASTER_PASSWORD = "2004";
export const HIDDEN_ADMIN_PASSWORD = "Yoqubjon";

export function getSchools(): School[] {
  try {
    const raw = localStorage.getItem(SCHOOLS_KEY);
    if (!raw) {
      // Migrate from v1 if present
      const v1 = localStorage.getItem("sams_schools");
      if (v1) {
        const parsed = JSON.parse(v1) as Array<{ id: string; name: string }>;
        const migrated: School[] = parsed.map((p) => ({
          id: p.id,
          name: p.id === "gdbh" ? "ГДБҲ — н. Муъминобод" : p.name,
          username: p.id === "gdbh" ? "GDBH" : p.name,
          password: p.id === "gdbh" ? "2004" : "1234",
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

export function addSchool(name: string): School {
  const schools = getSchools();
  const trimmed = name.trim();
  const school: School = {
    id: `s_${Date.now().toString(36)}`,
    name: trimmed,
    username: trimmed,
    password: "1234",
  };
  schools.push(school);
  saveSchools(schools);
  return school;
}

export function updateSchool(id: string, patch: Partial<School>) {
  const schools = getSchools().map((s) => (s.id === id ? { ...s, ...patch } : s));
  saveSchools(schools);
}

export function deleteSchool(id: string) {
  if (id === "gdbh") return; // protect master school
  const schools = getSchools().filter((s) => s.id !== id);
  saveSchools(schools.length ? schools : DEFAULT_SCHOOLS);
  if (getSelectedSchoolId() === id) {
    setSelectedSchoolId((schools[0] ?? DEFAULT_SCHOOLS[0]).id);
  }
  // Clear scoped data
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

// Session (active login)
export function getActiveSchoolId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
export function setActiveSchoolId(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

export function tryLogin(schoolId: string, username: string, password: string): boolean {
  // Master credentials: log in as ГДБҲ (or selected school)
  if (username === MASTER_USERNAME && password === MASTER_PASSWORD) {
    setActiveSchoolId(schoolId || "gdbh");
    return true;
  }
  const school = getSchools().find((s) => s.id === schoolId);
  if (!school) return false;
  if (school.username === username && school.password === password) {
    setActiveSchoolId(schoolId);
    return true;
  }
  return false;
}

// Scoped storage helper (used by store.ts)
export function scopedKey(base: string): string {
  const id = getActiveSchoolId() || getSelectedSchoolId();
  return `school_${id}_${base}`;
}
