export interface Student {
  id: string;
  name: string;
  className: string;
  qrCode: string;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  type: 'check-in' | 'check-out';
  timestamp: string;
}

const STUDENTS_KEY = 'sams_students';
const LOGS_KEY = 'sams_logs';
const SESSION_KEY = 'sams_session_active';
const LAST_RESET_KEY = 'sams_last_reset';

const tajikNames = [
  'Абдуллоҷон Раҳимов', 'Фирдавс Ҷӯраев', 'Шарифмо Каримова', 'Дилшод Ализода',
  'Мадина Ғаниева', 'Рустам Сафаров', 'Зарина Аҳмадова', 'Сомон Назаров',
  'Нигина Ҳасанова', 'Баҳром Ҷалилов', 'Манижа Мирзоева', 'Фарҳод Исмоилов',
  'Ситора Раҷабова', 'Ёқубҷон Шарипов', 'Шаҳло Бобоева', 'Далер Тоҷиев',
  'Парвина Холова', 'Ҷамшед Ғафуров', 'Гулнора Содиқова', 'Анвар Салимов',
  'Нозанин Муродова', 'Бобур Каюмов', 'Рухшона Давлатова', 'Искандар Файзуллоев',
  'Муниса Акрамова', 'Шерзод Одинаев', 'Озода Маҳмудова', 'Комрон Зоиров',
  'Дилором Усмонова', 'Тимур Шодиев',
];

const classNames = ['10-А', '10-Б', '10-В', '11-А', '11-Б', '11-В', '12-А', '12-Б', '12-В'];

function generateStudents(): Student[] {
  const students: Student[] = [];
  for (let i = 1; i <= 300; i++) {
    const id = `ГДБҲ${String(i).padStart(3, '0')}`;
    const nameIdx = (i - 1) % tajikNames.length;
    const baseName = tajikNames[nameIdx];
    const name = i > tajikNames.length ? `${baseName} ${Math.ceil(i / tajikNames.length)}` : baseName;
    students.push({
      id,
      name,
      className: classNames[Math.floor(Math.random() * classNames.length)],
      qrCode: id,
    });
  }
  return students;
}

function generateAttendanceLogs(students: Student[]): AttendanceLog[] {
  const logs: AttendanceLog[] = [];
  const today = new Date();
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const attendCount = Math.floor(students.length * (0.75 + Math.random() * 0.15));
    for (let i = 0; i < attendCount; i++) {
      const student = shuffled[i];
      const checkIn = new Date(date);
      checkIn.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
      logs.push({ id: `LOG-${dayOffset}-${i}-in`, studentId: student.id, type: 'check-in', timestamp: checkIn.toISOString() });
      if (Math.random() > 0.1) {
        const checkOut = new Date(date);
        checkOut.setHours(14 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));
        logs.push({ id: `LOG-${dayOffset}-${i}-out`, studentId: student.id, type: 'check-out', timestamp: checkOut.toISOString() });
      }
    }
  }
  return logs;
}

// Daily reset check
function checkDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  const lastReset = localStorage.getItem(LAST_RESET_KEY);
  if (lastReset !== today) {
    // End any active session from previous day
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.active) {
          localStorage.setItem(SESSION_KEY, JSON.stringify({ active: false, endedAt: new Date().toISOString() }));
        }
      } catch {}
    }
    localStorage.setItem(LAST_RESET_KEY, today);
  }
}

export function getStudents(): Student[] {
  checkDailyReset();
  const stored = localStorage.getItem(STUDENTS_KEY);
  if (stored) {
    const students = JSON.parse(stored);
    // Check if old format (STU prefix)
    if (students.length > 0 && students[0].id.startsWith('STU')) {
      localStorage.removeItem(STUDENTS_KEY);
      localStorage.removeItem(LOGS_KEY);
      const newStudents = generateStudents();
      localStorage.setItem(STUDENTS_KEY, JSON.stringify(newStudents));
      return newStudents;
    }
    return students;
  }
  const students = generateStudents();
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  return students;
}

export function getLogs(): AttendanceLog[] {
  const stored = localStorage.getItem(LOGS_KEY);
  if (stored) return JSON.parse(stored);
  const students = getStudents();
  const logs = generateAttendanceLogs(students);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  return logs;
}

export function addLog(log: AttendanceLog) {
  const logs = getLogs();
  logs.unshift(log);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function addStudent(student: Student): boolean {
  const students = getStudents();
  if (students.some(s => s.id === student.id)) return false;
  students.push(student);
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
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

export function getTodayStats() {
  const students = getStudents();
  const logs = getLogs();
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.timestamp.startsWith(today));
  const checkedIn = new Set(todayLogs.filter(l => l.type === 'check-in').map(l => l.studentId));
  const checkedOut = new Set(todayLogs.filter(l => l.type === 'check-out').map(l => l.studentId));
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
  localStorage.setItem(SESSION_KEY, JSON.stringify({ active: true, startedAt: new Date().toISOString() }));
}

export function endSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ active: false, endedAt: new Date().toISOString() }));
}

export function isSessionActive(): boolean {
  checkDailyReset();
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return false;
  try { return JSON.parse(stored).active === true; } catch { return false; }
}
