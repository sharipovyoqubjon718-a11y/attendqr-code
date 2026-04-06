import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Lang = "tj" | "ru" | "en";

// Flag-based color themes per language
const FLAG_THEMES: Record<Lang, { primary: string; secondary: string; accent: string; ring: string }> = {
  tj: { primary: "0 100% 40%", secondary: "140 61% 34%", accent: "140 61% 34%", ring: "0 100% 40%" },           // #CC0000 Red / #228B22 Green
  ru: { primary: "215 100% 33%", secondary: "4 75% 49%", accent: "215 100% 33%", ring: "215 100% 33%" },        // #0039A6 Blue / #D52B1E Red
  en: { primary: "236 30% 33%", secondary: "356 67% 42%", accent: "236 30% 33%", ring: "236 30% 33%" },         // #3C3B6E Navy / #B22234 Red
};

export function applyFlagTheme(lang: Lang) {
  const theme = FLAG_THEMES[lang];
  document.documentElement.style.setProperty("--primary", theme.primary);
  document.documentElement.style.setProperty("--secondary", theme.secondary);
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--ring", theme.primary);
  document.documentElement.style.setProperty("--sidebar-primary", theme.primary);
  document.documentElement.style.setProperty("--sidebar-ring", theme.primary);
}

const translations = {
  // Navigation
  "nav.dashboard": { tj: "Панели идоракунӣ", ru: "Панель управления", en: "Dashboard" },
  "nav.morning": { tj: "Навбати субҳ", ru: "Утренняя смена", en: "Morning Shift" },
  "nav.afternoon": { tj: "Навбати рӯз", ru: "Дневная смена", en: "Afternoon Shift" },
  "nav.addStudent": { tj: "Иловаи хонанда", ru: "Добавить ученика", en: "Add Student" },
  "nav.scanner": { tj: "Сканер", ru: "Сканер", en: "Scanner" },
  "nav.logs": { tj: "Сабти давомот", ru: "Журнал посещаемости", en: "Attendance Logs" },
  "nav.reports": { tj: "Ҳисоботҳо", ru: "Отчёты", en: "Reports" },
  "nav.blacklist": { tj: "Рӯйхати сиёҳ", ru: "Чёрный список", en: "Blacklist" },
  "nav.about": { tj: "Маълумот", ru: "О системе", en: "About" },
  "nav.navigation": { tj: "Навигатсия", ru: "Навигация", en: "Navigation" },

  // Dashboard
  "dash.title": { tj: "ГИМНАЗИЯИ ДАВЛАТИИ БОҒИ ҲАБИБ", ru: "ГОСУДАРСТВЕННАЯ ГИМНАЗИЯ БОГИ ХАБИБ", en: "BOGHI HABIB STATE GYMNASIUM" },
  "dash.subtitle": { tj: "Панели идоракунӣ — Кӯлоб", ru: "Панель управления — Кулоб", en: "Dashboard — Kulob" },
  "dash.students": { tj: "хонанда", ru: "учеников", en: "students" },
  "dash.shiftStudents": { tj: "Хонандагони навбат", ru: "Учеников смены", en: "Shift Students" },
  "dash.present": { tj: "Имрӯз ҳозир", ru: "Сегодня присутствуют", en: "Present Today" },
  "dash.absent": { tj: "Ғоиб", ru: "Отсутствуют", en: "Absent" },
  "dash.rate": { tj: "Сатҳи давомот", ru: "Уровень посещаемости", en: "Attendance Rate" },
  "dash.startSession": { tj: "Оғози дарс", ru: "Начать урок", en: "Start Session" },
  "dash.endSession": { tj: "Анҷоми дарс", ru: "Закончить урок", en: "End Session" },
  "dash.sessionActive": { tj: "✅ Дарс идома дорад — сканер фаъол аст", ru: "✅ Урок продолжается — сканер активен", en: "✅ Session active — scanner enabled" },
  "dash.sessionInactive": { tj: "Дарс оғоз нашудааст. Тугмаи \"Оғози дарс\"-ро пахш кунед.", ru: "Урок не начался. Нажмите кнопку \"Начать урок\".", en: "Session not started. Press \"Start Session\"." },
  "dash.weeklyChart": { tj: "Давомоти ҳафтагӣ", ru: "Еженедельная посещаемость", en: "Weekly Attendance" },
  "dash.sessionStarted": { tj: "Дарс оғоз шуд!", ru: "Урок начался!", en: "Session started!" },
  "dash.sessionEnded": { tj: "Дарс анҷом ёфт!", ru: "Урок завершён!", en: "Session ended!" },

  // Students
  "students.morning": { tj: "Навбати субҳ (07:30 - 13:00)", ru: "Утренняя смена (07:30 - 13:00)", en: "Morning Shift (07:30 - 13:00)" },
  "students.afternoon": { tj: "Навбати рӯз (13:10 - 18:00)", ru: "Дневная смена (13:10 - 18:00)", en: "Afternoon Shift (13:10 - 18:00)" },
  "students.all": { tj: "Ҳамаи хонандагон", ru: "Все ученики", en: "All Students" },
  "students.search": { tj: "Ҷустуҷӯ бо ном, ID ё синф...", ru: "Поиск по имени, ID или классу...", en: "Search by name, ID, or grade..." },
  "students.allGrades": { tj: "Ҳама синфҳо", ru: "Все классы", en: "All Grades" },
  "students.grade": { tj: "Синфи", ru: "Класс", en: "Grade" },
  "students.gallery": { tj: "Галлерея", ru: "Галерея", en: "Gallery" },
  "students.table": { tj: "Ҷадвал", ru: "Таблица", en: "Table" },
  "students.print": { tj: "Чоп", ru: "Печать", en: "Print" },
  "students.count": { tj: "хонанда", ru: "учеников", en: "students" },

  // Student table headers
  "th.id": { tj: "ID", ru: "ID", en: "ID" },
  "th.name": { tj: "Ном", ru: "Имя", en: "Name" },
  "th.grade": { tj: "Синф", ru: "Класс", en: "Grade" },
  "th.shift": { tj: "Навбат", ru: "Смена", en: "Shift" },
  "th.qr": { tj: "QR", ru: "QR", en: "QR" },
  "th.actions": { tj: "Амалҳо", ru: "Действия", en: "Actions" },

  // Shifts
  "shift.morning": { tj: "Субҳ", ru: "Утро", en: "AM" },
  "shift.afternoon": { tj: "Рӯз", ru: "День", en: "PM" },

  // Scanner
  "scanner.title": { tj: "Сканери QR", ru: "QR Сканер", en: "QR Scanner" },
  "scanner.subtitle": { tj: "QR кодро дар пеши камера гиред", ru: "Поднесите QR-код к камере", en: "Hold QR code in front of camera" },
  "scanner.start": { tj: "Оғози сканер", ru: "Запуск сканера", en: "Start Scanner" },
  "scanner.stop": { tj: "Қатъ кардан", ru: "Остановить", en: "Stop" },
  "scanner.camera": { tj: "Камера", ru: "Камера", en: "Camera" },
  "scanner.manual": { tj: "Дохилкунии дастӣ", ru: "Ручной ввод", en: "Manual Entry" },
  "scanner.manualPlaceholder": { tj: "ID-ро ворид кунед (мас. ГДБҲ001)", ru: "Введите ID (напр. ГДБҲ001)", en: "Enter ID (e.g. ГДБҲ001)" },
  "scanner.submit": { tj: "Фиристодан", ru: "Отправить", en: "Submit" },
  "scanner.pressStart": { tj: "Тугмаи \"Оғози сканер\"-ро пахш кунед", ru: "Нажмите \"Запуск сканера\"", en: "Press \"Start Scanner\"" },
  "scanner.checkin": { tj: "Ҳозир", ru: "Пришёл", en: "Check-in" },
  "scanner.checkout": { tj: "Баромад", ru: "Ушёл", en: "Check-out" },
  "scanner.noSession": { tj: "Дарс оғоз нашудааст. Аввал \"Оғози дарс\"-ро пахш кунед.", ru: "Урок не начался. Нажмите \"Начать урок\".", en: "Session not started. Press \"Start Session\" first." },
  "scanner.cameraNotSupported": { tj: "Камера аз ҷониби ин браузер дастгирӣ намешавад.", ru: "Камера не поддерживается этим браузером.", en: "Camera not supported by this browser." },
  "scanner.cameraFailed": { tj: "Камера фаъол нашуд. Лутфан дубора кӯшиш кунед.", ru: "Камера не запустилась. Попробуйте снова.", en: "Camera failed. Please try again." },

  // Logs
  "logs.title": { tj: "Сабти давомот", ru: "Журнал посещаемости", en: "Attendance Logs" },
  "logs.records": { tj: "сабт", ru: "записей", en: "records" },
  "logs.searchPlaceholder": { tj: "Ҷустуҷӯ бо ном ё ID...", ru: "Поиск по имени или ID...", en: "Search by name or ID..." },
  "logs.type": { tj: "Навъ", ru: "Тип", en: "Type" },
  "logs.datetime": { tj: "Сана ва вақт", ru: "Дата и время", en: "Date & Time" },
  "logs.unknown": { tj: "Номаълум", ru: "Неизвестный", en: "Unknown" },
  "logs.showing": { tj: "натиҷа нишон дода шудааст", ru: "результатов показано", en: "results shown" },

  // Blacklist
  "blacklist.title": { tj: "Рӯйхати сиёҳ", ru: "Чёрный список", en: "Blacklist" },
  "blacklist.subtitle": { tj: "Хонандагоне ки дар 7 рӯзи кории охир 3+ рӯз ғоиб буданд", ru: "Ученики, отсутствовавшие 3+ дней за последние 7 рабочих дней", en: "Students absent 3+ days in last 7 working days" },
  "blacklist.empty": { tj: "Ягон хонанда дар рӯйхати сиёҳ нест. Давомоти хуб!", ru: "Нет учеников в чёрном списке. Хорошая посещаемость!", en: "No students in blacklist. Great attendance!" },
  "blacklist.absentDays": { tj: "Рӯзҳои ғоибӣ", ru: "Дни отсутствия", en: "Absent Days" },
  "blacklist.status": { tj: "Ҳолат", ru: "Статус", en: "Status" },
  "blacklist.critical": { tj: "Критикӣ", ru: "Критический", en: "Critical" },
  "blacklist.warning": { tj: "Огоҳӣ", ru: "Предупреждение", en: "Warning" },
  "blacklist.recorded": { tj: "хонанда қайд шудааст", ru: "учеников зафиксировано", en: "students recorded" },
  "blacklist.days": { tj: "рӯз", ru: "дней", en: "days" },

  // Reports
  "reports.title": { tj: "Ҳисоботҳо", ru: "Отчёты", en: "Reports" },
  "reports.subtitle": { tj: "Хулосаи ҳафтагии давомот", ru: "Еженедельная сводка посещаемости", en: "Weekly attendance summary" },
  "reports.saturday": { tj: "📊 Имрӯз — Шанбе! Ҳисоботи ҳафтагӣ омода аст.", ru: "📊 Сегодня — Суббота! Еженедельный отчёт готов.", en: "📊 Today is Saturday! Weekly report is ready." },
  "reports.totalStudents": { tj: "Ҳамагӣ хонандагон", ru: "Всего учеников", en: "Total Students" },
  "reports.overallRate": { tj: "Сатҳи умумии давомот", ru: "Общий уровень посещаемости", en: "Overall Attendance Rate" },
  "reports.workdays": { tj: "Рӯзҳои корӣ", ru: "Рабочие дни", en: "Work Days" },
  "reports.weeklyChart": { tj: "Графики ҳафтагӣ", ru: "Еженедельный график", en: "Weekly Chart" },
  "reports.studentTable": { tj: "Ҷадвали хонандагон", ru: "Таблица учеников", en: "Student Table" },
  "reports.presentCol": { tj: "Ҳозир", ru: "Присут.", en: "Present" },
  "reports.absentCol": { tj: "Ғоиб", ru: "Отсут.", en: "Absent" },
  "chart.present": { tj: "Ҳозир", ru: "Присутствуют", en: "Present" },
  "chart.absent": { tj: "Ғоиб", ru: "Отсутствуют", en: "Absent" },

  // Add Student
  "addStudent.title": { tj: "Иловаи хонанда", ru: "Добавить ученика", en: "Add Student" },
  "addStudent.subtitle": { tj: "Хонандаи навро ба система илова кунед", ru: "Добавить нового ученика в систему", en: "Add a new student to the system" },
  "addStudent.info": { tj: "Маълумоти хонанда", ru: "Данные ученика", en: "Student Info" },
  "addStudent.fullName": { tj: "Номи пурра", ru: "Полное имя", en: "Full Name" },
  "addStudent.namePlaceholder": { tj: "Масалан: Ёқубҷон Шарипов", ru: "Напр.: Ёқубҷон Шарипов", en: "E.g.: Yoqubjon Sharipov" },
  "addStudent.idNum": { tj: "Рақами ID (бе ГДБҲ)", ru: "Номер ID (без ГДБҲ)", en: "ID Number (without ГДБҲ)" },
  "addStudent.idAuto": { tj: "ID ба таври худкор бо префикси ГДБҲ сохта мешавад", ru: "ID автоматически создаётся с префиксом ГДБҲ", en: "ID is auto-generated with ГДБҲ prefix" },
  "addStudent.save": { tj: "Сабт кардан", ru: "Сохранить", en: "Save" },
  "addStudent.added": { tj: "илова шуд!", ru: "добавлен!", en: "added!" },
  "addStudent.addBtn": { tj: "Иловаи хонанда", ru: "Добавить ученика", en: "Add Student" },

  // About
  "about.title": { tj: "Маълумот", ru: "О системе", en: "About" },
  "about.project": { tj: "Лоиҳа:", ru: "Проект:", en: "Project:" },
  "about.projectName": { tj: "Гимназияи давлатии Боғи Ҳабиб шаҳри Кӯлоб (ГДБҲ)", ru: "Государственная гимназия Боги Хабиб г. Кулоб (ГДБҲ)", en: "Boghi Habib State Gymnasium, Kulob (ГДБҲ)" },
  "about.orderedBy": { tj: "Супориш:", ru: "Заказ:", en: "Ordered by:" },
  "about.itTeacher": { tj: "Муаллими Технологияи иттилоотӣ", ru: "Учитель информационных технологий", en: "IT Teacher" },
  "about.developer": { tj: "Созанда ва таҳиягар:", ru: "Разработчик:", en: "Developer:" },
  "about.system": { tj: "Система:", ru: "Система:", en: "System:" },
  "about.systemDesc": { tj: "AttendQR — Системаи идоракунии давоматӣ бо сканери QR", ru: "AttendQR — Система управления посещаемостью с QR-сканером", en: "AttendQR — QR-based Attendance Management System" },
  "about.flag": { tj: "Парчами Тоҷикистон", ru: "Флаг Таджикистана", en: "Flag of Tajikistan" },

  // PIN
  "pin.title": { tj: "ГДБҲ — Давомот", ru: "ГДБҲ — Посещаемость", en: "ГДБҲ — Attendance" },
  "pin.subtitle": { tj: "PIN-кодро ворид кунед", ru: "Введите PIN-код", en: "Enter PIN code" },
  "pin.wrong": { tj: "PIN нодуруст аст", ru: "PIN неверный", en: "Wrong PIN" },

  // Edit/Delete
  "edit.title": { tj: "Таҳрири хонанда", ru: "Редактировать ученика", en: "Edit Student" },
  "edit.name": { tj: "Ном", ru: "Имя", en: "Name" },
  "edit.grade": { tj: "Синф", ru: "Класс", en: "Grade" },
  "edit.shift": { tj: "Навбат", ru: "Смена", en: "Shift" },
  "edit.save": { tj: "Нигоҳ доштан", ru: "Сохранить", en: "Save" },
  "edit.cancel": { tj: "Бекор", ru: "Отмена", en: "Cancel" },
  "edit.saved": { tj: "Тағйирот сабт шуд", ru: "Изменения сохранены", en: "Changes saved" },
  "delete.confirm": { tj: "Оё шумо воқеан мехоҳед ин хонандаро пок кунед?", ru: "Вы действительно хотите удалить этого ученика?", en: "Are you sure you want to delete this student?" },
  "delete.yes": { tj: "Ҳа", ru: "Да", en: "Yes" },
  "delete.no": { tj: "Не", ru: "Нет", en: "No" },
  "delete.title": { tj: "Пок кардан", ru: "Удалить", en: "Delete" },
  "delete.done": { tj: "Хонанда пок карда шуд", ru: "Ученик удалён", en: "Student deleted" },

  // Footer
  "footer": { tj: "Developed by Sharipov's Python Academy", ru: "Developed by Sharipov's Python Academy", en: "Developed by Sharipov's Python Academy" },

  // Settings
  "settings.title": { tj: "Танзимот", ru: "Настройки", en: "Settings" },
  "settings.theme": { tj: "Мавзӯъ", ru: "Тема", en: "Theme" },
  "settings.light": { tj: "Равшан", ru: "Светлая", en: "Light" },
  "settings.dark": { tj: "Торик", ru: "Тёмная", en: "Dark" },
  "settings.colors": { tj: "Гулчин", ru: "Цвет", en: "Color" },
  "settings.language": { tj: "Забон", ru: "Язык", en: "Language" },

  // Admin PIN
  "admin.pinRequired": { tj: "PIN лозим аст", ru: "Требуется PIN", en: "PIN required" },

  // Dashboard dynamic
  "dash.day": { tj: "Рӯз", ru: "День", en: "Day" },

  // Add Student grade
  "addStudent.grade": { tj: "Синф", ru: "Класс", en: "Grade" },
  "addStudent.selectGrade": { tj: "Синфро интихоб кунед", ru: "Выберите класс", en: "Select grade" },
  "addStudent.shiftAuto": { tj: "Навбат ба таври худкор муайян мешавад", ru: "Смена определяется автоматически", en: "Shift is auto-detected" },
  "addStudent.saturdayOff": { tj: "Шанбе — рӯзи истироҳат", ru: "Суббота — выходной", en: "Saturday — rest day" },
  "addStudent.saturdayOn": { tj: "Шанбе — рӯзи корӣ", ru: "Суббота — рабочий", en: "Saturday — working day" },

  // Shift labels (translatable)
  "shiftLabel.morning": { tj: "Субҳ (07:30 - 13:00)", ru: "Утро (07:30 - 13:00)", en: "Morning (07:30 - 13:00)" },
  "shiftLabel.afternoon": { tj: "Рӯз (13:10 - 18:00)", ru: "День (13:10 - 18:00)", en: "Afternoon (13:10 - 18:00)" },

  // Common
  "results.showing": { tj: "натиҷа нишон дода шудааст", ru: "результатов показано", en: "results shown" },
  "common.of": { tj: "аз", ru: "из", en: "of" },
} as const;

type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("sams_lang") as Lang) || "tj";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("sams_lang", l);
    applyFlagTheme(l);
  }, []);

  // Apply flag theme on initial load
  useEffect(() => {
    applyFlagTheme(lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.tj;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export const LANG_LABELS: Record<Lang, string> = {
  tj: "🇹🇯 Тоҷикӣ",
  ru: "🇷🇺 Русский",
  en: "🇬🇧 English",
};
