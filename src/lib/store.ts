import { generateAllStudents, type StudentRecord } from './students-data';
import { getActiveSchoolId, getSelectedSchoolId } from './schools';

export type Student = StudentRecord;

export interface AttendanceLog {
  id: string;
  studentId: string;
  type: 'check-in' | 'check-out';
  timestamp: string;
}

function activeId(): string {
  return getActiveSchoolId() || getSelectedSchoolId() || 'gdbh';
}
const STUDENTS_KEY = () => `school_${activeId()}_students_v5`;
const LOGS_KEY = () => `school_${activeId()}_logs`;
const SESSION_KEY = () => `school_${activeId()}_session_active`;
const LAST_RESET_KEY = () => `school_${activeId()}_last_reset`;
const PURGE_KEY = () => `school_${activeId()}_logs_purged_v3`;

function normalizeStudentName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part =>
      part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
    )
    .join(' ');
}

function normalizeStudents(students: Student[]): Student[] {
  return students.map(student => ({
    ...student,
    name: normalizeStudentName(student.name),
  }));
}

// Daily reset check
function checkDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  const lastReset = localStorage.getItem(LAST_RESET_KEY());
  if (lastReset !== today) {
    const session = localStorage.getItem(SESSION_KEY());
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.active) {
          localStorage.setItem(SESSION_KEY(), JSON.stringify({ active: false, endedAt: new Date().toISOString() }));
        }
      } catch {}
    }
    localStorage.setItem(LAST_RESET_KEY(), today);
  }
}

export function getStudents(): Student[] {
  checkDailyReset();
  const stored = localStorage.getItem(STUDENTS_KEY());

  if (stored) {
    const students = normalizeStudents(JSON.parse(stored));
    localStorage.setItem(STUDENTS_KEY(), JSON.stringify(students));
    return students;
  }

  // Seed the default 282 students only for the master ГДБҲ school; other schools start empty.
  const seed = activeId() === 'gdbh' ? normalizeStudents(generateAllStudents()) : [];
  localStorage.setItem(STUDENTS_KEY(), JSON.stringify(seed));
  return seed;
}

export function getLogs(): AttendanceLog[] {
  if (!localStorage.getItem(PURGE_KEY())) {
    localStorage.removeItem(LOGS_KEY());
    localStorage.setItem(PURGE_KEY(), '1');
  }
  const stored = localStorage.getItem(LOGS_KEY());
  if (stored) return JSON.parse(stored);
  return [];
}

export function addLog(log: AttendanceLog) {
  const logs = getLogs();
  logs.unshift(log);
  localStorage.setItem(LOGS_KEY(), JSON.stringify(logs));
}

export function addStudent(student: Student): boolean {
  const students = getStudents();
  const normalizedStudent = { ...student, name: normalizeStudentName(student.name) };
  if (students.some(s => s.id === normalizedStudent.id)) return false;
  students.push(normalizedStudent);
  localStorage.setItem(STUDENTS_KEY(), JSON.stringify(students));
  return true;
}

export function updateStudent(id: string, updates: Partial<Pick<Student, 'name' | 'grade' | 'shift'>>): boolean {
  const students = getStudents();
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) return false;
  if (updates.name) students[idx].name = normalizeStudentName(updates.name);
  if (updates.grade) students[idx].grade = updates.grade;
  if (updates.shift) students[idx].shift = updates.shift;
  localStorage.setItem(STUDENTS_KEY(), JSON.stringify(students));
  return true;
}

export function deleteStudent(id: string): boolean {
  const students = getStudents();
  const filtered = students.filter(s => s.id !== id);
  if (filtered.length === students.length) return false;
  localStorage.setItem(STUDENTS_KEY(), JSON.stringify(filtered));
  return true;
}

export function getStudentById(id: string): Student | undefined {
  return getStudents().find(s => s.id === id);
}

export function isValidGDBHId(id: string): boolean {
  return /^ГДБҲ\d{3}$/.test(id.trim());
}

export function getBlacklistedStudents(absentThreshold = 3): (Student & { absentDays: number })[] {
  const students = getStudents();
  const logs = getLogs();
  const today = new Date();
  const weekdays: string[] = [];
  let d = new Date(today);
  for (let i = 0; weekdays.length < 7; i++) {
    d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) weekdays.push(d.toISOString().split('T')[0]);
  }
  const studentDays = new Map<string, Set<string>>();
  logs.filter(l => l.type === 'check-in').forEach(log => {
    const day = log.timestamp.split('T')[0];
    if (!weekdays.includes(day)) return;
    if (!studentDays.has(log.studentId)) studentDays.set(log.studentId, new Set());
    studentDays.get(log.studentId)!.add(day);
  });
  return students
    .map(s => ({ ...s, absentDays: weekdays.length - (studentDays.get(s.id)?.size || 0) }))
    .filter(s => s.absentDays >= absentThreshold)
    .sort((a, b) => b.absentDays - a.absentDays);
}

export function getTodayStats(shift?: 'morning' | 'afternoon') {
  const allStudents = getStudents();
  const students = shift ? allStudents.filter(s => s.shift === shift) : allStudents;
  const logs = getLogs();
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.timestamp.startsWith(today));
  const studentIds = new Set(students.map(s => s.id));
  const checkedIn = new Set(todayLogs.filter(l => l.type === 'check-in' && studentIds.has(l.studentId)).map(l => l.studentId));
  const checkedOut = new Set(todayLogs.filter(l => l.type === 'check-out' && studentIds.has(l.studentId)).map(l => l.studentId));
  return {
    total: students.length,
    present: checkedIn.size,
    absent: students.length - checkedIn.size,
    checkedOut: checkedOut.size,
    rate: students.length > 0 ? Math.round((checkedIn.size / students.length) * 100) : 0,
  };
}

export function getWeeklyData() {
  const students = getStudents();
  const logs = getLogs();
  const today = new Date();
  const tajikDays = ['Яш', 'Дш', 'Сш', 'Чш', 'Пш', 'Ҷм', 'Шб'];
  const data: { day: string; present: number; absent: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = tajikDays[d.getDay()];
    if (d.getDay() === 0 || d.getDay() === 6) {
      data.push({ day: dayName, present: 0, absent: 0 });
      continue;
    }
    const dayLogs = logs.filter(l => l.type === 'check-in' && l.timestamp.startsWith(dateStr));
    const present = new Set(dayLogs.map(l => l.studentId)).size;
    data.push({ day: dayName, present, absent: students.length - present });
  }
  return data;
}

export function getWeeklyReport() {
  const students = getStudents();
  const logs = getLogs();
  const today = new Date();
  const weekdays: string[] = [];
  for (let i = 0; weekdays.length < 6; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() !== 0) weekdays.push(d.toISOString().split('T')[0]);
  }
  const studentAttendance = students.map(s => {
    const presentDays = weekdays.filter(day =>
      logs.some(l => l.studentId === s.id && l.type === 'check-in' && l.timestamp.startsWith(day))
    ).length;
    return { ...s, presentDays, absentDays: weekdays.length - presentDays, rate: Math.round((presentDays / weekdays.length) * 100) };
  });
  const totalRate = students.length > 0
    ? Math.round(studentAttendance.reduce((sum, s) => sum + s.rate, 0) / students.length)
    : 0;
  return { students: studentAttendance, totalRate, weekdays: weekdays.length };
}

export function formatTajikTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('tg-TJ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Session management
export function startSession() {
  localStorage.setItem(SESSION_KEY(), JSON.stringify({ active: true, startedAt: new Date().toISOString() }));
}

export function endSession() {
  localStorage.setItem(SESSION_KEY(), JSON.stringify({ active: false, endedAt: new Date().toISOString() }));
}

export function isSessionActive(): boolean {
  checkDailyReset();
  const stored = localStorage.getItem(SESSION_KEY());
  if (!stored) return false;
  try { return JSON.parse(stored).active === true; } catch { return false; }
}
