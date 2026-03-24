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

const classNames = ['10-A', '10-B', '10-C', '11-A', '11-B', '11-C', '12-A', '12-B', '12-C'];
const firstNames = ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan','Ananya','Diya','Myra','Sara','Aanya','Ira','Anika','Prisha','Kavya','Riya','Ethan','Liam','Noah','James','Oliver','Emma','Ava','Sophia','Mia','Zara','Rohan','Kiran','Neha','Amit','Priya','Rahul','Sneha','Vikram','Pooja','Deepak'];
const lastNames = ['Sharma','Patel','Singh','Kumar','Gupta','Joshi','Verma','Reddy','Nair','Das','Mehta','Shah','Rao','Mishra','Chauhan','Thakur','Pandey','Iyer','Chopra','Bhat','Anderson','Wilson','Taylor','Brown','Johnson','Garcia','Martinez','Lee','Kim','Chen'];

function generateStudents(): Student[] {
  const students: Student[] = [];
  for (let i = 1; i <= 300; i++) {
    const id = `STU${String(i).padStart(4, '0')}`;
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    students.push({
      id,
      name: `${first} ${last}`,
      className: classNames[Math.floor(Math.random() * classNames.length)],
      qrCode: id,
    });
  }
  return students;
}

function generateAttendanceLogs(students: Student[]): AttendanceLog[] {
  const logs: AttendanceLog[] = [];
  const today = new Date();
  // Generate logs for the past 7 days for ~80% of students each day
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
    
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const attendCount = Math.floor(students.length * (0.75 + Math.random() * 0.15));
    
    for (let i = 0; i < attendCount; i++) {
      const student = shuffled[i];
      const checkIn = new Date(date);
      checkIn.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
      
      logs.push({
        id: `LOG-${dayOffset}-${i}-in`,
        studentId: student.id,
        type: 'check-in',
        timestamp: checkIn.toISOString(),
      });

      if (Math.random() > 0.1) {
        const checkOut = new Date(date);
        checkOut.setHours(14 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));
        logs.push({
          id: `LOG-${dayOffset}-${i}-out`,
          studentId: student.id,
          type: 'check-out',
          timestamp: checkOut.toISOString(),
        });
      }
    }
  }
  return logs;
}

export function getStudents(): Student[] {
  const stored = localStorage.getItem(STUDENTS_KEY);
  if (stored) return JSON.parse(stored);
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

export function getBlacklistedStudents(absentThreshold = 3): (Student & { absentDays: number })[] {
  const students = getStudents();
  const logs = getLogs();
  
  // Count unique days each student checked in (last 7 weekdays)
  const today = new Date();
  const weekdays: string[] = [];
  let d = new Date(today);
  for (let i = 0; weekdays.length < 7; i++) {
    d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      weekdays.push(d.toISOString().split('T')[0]);
    }
  }

  const studentDays = new Map<string, Set<string>>();
  logs.filter(l => l.type === 'check-in').forEach(log => {
    const day = log.timestamp.split('T')[0];
    if (!weekdays.includes(day)) return;
    if (!studentDays.has(log.studentId)) studentDays.set(log.studentId, new Set());
    studentDays.get(log.studentId)!.add(day);
  });

  return students
    .map(s => {
      const presentDays = studentDays.get(s.id)?.size || 0;
      const absentDays = weekdays.length - presentDays;
      return { ...s, absentDays };
    })
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
  const data: { day: string; present: number; absent: number }[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en', { weekday: 'short' });
    
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
