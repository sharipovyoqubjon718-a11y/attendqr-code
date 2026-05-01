// Local school list manager (per-device, localStorage)

export interface School {
  id: string;
  name: string;
}

const STORAGE_KEY = "sams_schools";
const SELECTED_KEY = "sams_selected_school";

const DEFAULT_SCHOOLS: School[] = [
  { id: "gdbh", name: "ГДБҲ — Кӯлоб" },
];

export function getSchools(): School[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCHOOLS));
      return DEFAULT_SCHOOLS;
    }
    const parsed = JSON.parse(raw) as School[];
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SCHOOLS;
  } catch {
    return DEFAULT_SCHOOLS;
  }
}

export function saveSchools(schools: School[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schools));
}

export function addSchool(name: string): School {
  const schools = getSchools();
  const school: School = {
    id: `s_${Date.now().toString(36)}`,
    name: name.trim(),
  };
  schools.push(school);
  saveSchools(schools);
  return school;
}

export function renameSchool(id: string, name: string) {
  const schools = getSchools().map((s) => (s.id === id ? { ...s, name: name.trim() } : s));
  saveSchools(schools);
}

export function deleteSchool(id: string) {
  const schools = getSchools().filter((s) => s.id !== id);
  saveSchools(schools.length ? schools : DEFAULT_SCHOOLS);
  if (getSelectedSchoolId() === id) {
    setSelectedSchoolId((schools[0] ?? DEFAULT_SCHOOLS[0]).id);
  }
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
