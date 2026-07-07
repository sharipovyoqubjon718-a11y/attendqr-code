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
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--accent", theme.secondary);
  root.style.setProperty("--ring", theme.ring);
  root.style.setProperty("--sidebar-primary", theme.primary);
  root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
  root.style.setProperty("--sidebar-accent", theme.primary);
  root.style.setProperty("--sidebar-accent-foreground", "0 0% 100%");
  root.style.setProperty("--sidebar-ring", theme.ring);
  root.style.setProperty("--success", theme.secondary);
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
  "dash.subtitle": { tj: "Панели идоракунӣ", ru: "Панель управления", en: "Dashboard" },
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
  "students.morning": { tj: "Навбати субҳ (08:00 - 13:00)", ru: "Утренняя смена (08:00 - 13:00)", en: "Morning Shift (08:00 - 13:00)" },
  "students.afternoon": { tj: "Навбати рӯз (13:10 - 17:20)", ru: "Дневная смена (13:10 - 17:20)", en: "Afternoon Shift (13:10 - 17:20)" },
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
  "about.projectName": { tj: "AttendQR-Системаи идоракунии мактаб бо сканери QR", ru: "AttendQR — Система управления школой с QR-сканером", en: "AttendQR — School Management System with QR Scanner" },
  "about.orderedBy": { tj: "Супориш:", ru: "Заказ:", en: "Ordered by:" },
  "about.itTeacher": { tj: "Устод Фаррухи Сафаралӣ", ru: "Устод Фаррухи Сафаралӣ", en: "Ustod Farrukhi Safarali" },
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
  "footer": { tj: "Developed by Sharipov's Python Academy | Lead Developer: Sharipov Yoqubjon", ru: "Developed by Sharipov's Python Academy | Lead Developer: Sharipov Yoqubjon", en: "Developed by Sharipov's Python Academy | Lead Developer: Sharipov Yoqubjon" },
  "support.title": { tj: "Дастгирии техникӣ", ru: "Техническая поддержка", en: "Technical Support" },
  "students.savePdf": { tj: "Захира ҳамчун PDF", ru: "Сохранить как PDF", en: "Save as PDF" },
  "shift.manual": { tj: "Иваз кардани навбат", ru: "Сменить смену", en: "Switch Shift" },

  // Settings
  "settings.title": { tj: "Танзимот", ru: "Настройки", en: "Settings" },
  "settings.theme": { tj: "Мавзӯъ", ru: "Тема", en: "Theme" },
  "settings.light": { tj: "Равшан", ru: "Светлая", en: "Light" },
  "settings.dark": { tj: "Торик", ru: "Тёмная", en: "Dark" },
  "settings.colors": { tj: "Гулчин", ru: "Цвет", en: "Color" },
  "settings.language": { tj: "Забон", ru: "Язык", en: "Language" },

  // Admin PIN
  "admin.pinRequired": { tj: "PIN лозим аст", ru: "Требуется PIN", en: "PIN required" },

  // Security settings
  "security.title": { tj: "Усули амният", ru: "Метод безопасности", en: "Security Method" },
  "security.pin": { tj: "PIN код", ru: "PIN код", en: "PIN Code" },
  "security.pattern": { tj: "Гулчин (Намунавӣ)", ru: "Графический ключ", en: "Pattern Lock" },
  "security.updatePin": { tj: "Иваз кардани PIN", ru: "Изменить PIN", en: "Update PIN" },
  "security.updatePattern": { tj: "Иваз кардани гулчин", ru: "Изменить рисунок", en: "Update Pattern" },
  "security.newPin": { tj: "PIN-и навро ворид кунед", ru: "Введите новый PIN", en: "Enter new PIN" },
  "security.drawPattern": { tj: "Намунавиро кашед", ru: "Нарисуйте рисунок", en: "Draw a pattern" },
  "security.saved": { tj: "Сабт шуд!", ru: "Сохранено!", en: "Saved!" },
  "security.confirmPattern": { tj: "Намунавиро бори дигар кашед", ru: "Повторите рисунок", en: "Draw pattern again" },
  "security.patternTooShort": { tj: "Ҳадди ақал 3 нуқтаро пайваст кунед", ru: "Соедините минимум 3 точки", en: "Connect at least 3 dots" },
  "pin.drawPattern": { tj: "Намунавиро кашед", ru: "Нарисуйте рисунок", en: "Draw your pattern" },

  // Schools
  "school.select": { tj: "Мактабро интихоб кунед", ru: "Выберите школу", en: "Select school" },
  "school.add": { tj: "Иловаи мактаб", ru: "Добавить школу", en: "Add school" },
  "school.namePlaceholder": { tj: "Номи мактаб", ru: "Название школы", en: "School name" },
  "school.manage": { tj: "Идоракунии мактабҳо", ru: "Управление школами", en: "Manage schools" },
  "school.delete": { tj: "Пок кардан", ru: "Удалить", en: "Delete" },
  "school.confirmDelete": { tj: "Мактабро пок мекунед?", ru: "Удалить школу?", en: "Delete this school?" },
  "school.deleteWarning": { tj: "Ҳамаи маълумот пок мешавад. Барои тасдиқ паролро ворид кунед.", ru: "Все данные будут удалены. Введите пароль для подтверждения.", en: "All data will be erased. Enter password to confirm." },
  "school.defaultCreds": { tj: "Логин: номи мактаб, парол: 1234", ru: "Логин: название школы, пароль: 1234", en: "Username: school name, password: 1234" },
  "school.addedToast": { tj: "Мактаб илова шуд", ru: "Школа добавлена", en: "School added" },
  "school.deletedToast": { tj: "Мактаб пок шуд", ru: "Школа удалена", en: "School deleted" },
  "school.logo": { tj: "Логои мактаб", ru: "Логотип школы", en: "School logo" },
  "school.uploadLogo": { tj: "Логои навро интихоб кунед", ru: "Загрузить логотип", en: "Upload logo" },
  "school.credentials": { tj: "Маълумоти воридшавӣ", ru: "Данные входа", en: "Login credentials" },
  "school.restDays": { tj: "Рӯзҳои истироҳат", ru: "Выходные дни", en: "Rest days" },
  "school.todayRest": { tj: "Имрӯз рӯзи истироҳат аст!", ru: "Сегодня — выходной день!", en: "Today is a rest day!" },

  // Login
  "login.username": { tj: "Логин", ru: "Логин", en: "Username" },
  "login.password": { tj: "Парол", ru: "Пароль", en: "Password" },
  "login.signIn": { tj: "Ворид шудан", ru: "Войти", en: "Sign in" },
  "login.invalid": { tj: "Маълумот нодуруст аст", ru: "Неверные данные", en: "Invalid credentials" },
  "login.logout": { tj: "Баромад", ru: "Выйти", en: "Log out" },

  // Hidden admin
  "admin.hiddenTitle": { tj: "Панели пинҳонии маъмур", ru: "Скрытая админ-панель", en: "Hidden admin panel" },
  "admin.hiddenDesc": { tj: "Идоракунии мактабҳо", ru: "Управление школами", en: "Manage schools" },

  // Edit
  "edit.close": { tj: "Пӯшидан", ru: "Закрыть", en: "Close" },

  // Sidebar new
  "nav.shift1": { tj: "Басти Субҳ", ru: "Смена Утренняя", en: "Morning Shift" },
  "nav.shift2": { tj: "Басти Рӯз", ru: "Смена Дневная", en: "Afternoon Shift" },

  // Dashboard dynamic
  "dash.day": { tj: "Рӯз", ru: "День", en: "Day" },

  // Add Student grade
  "addStudent.grade": { tj: "Синф", ru: "Класс", en: "Grade" },
  "addStudent.selectGrade": { tj: "Синфро интихоб кунед", ru: "Выберите класс", en: "Select grade" },
  "addStudent.shiftAuto": { tj: "Навбат ба таври худкор муайян мешавад", ru: "Смена определяется автоматически", en: "Shift is auto-detected" },
  "addStudent.saturdayOff": { tj: "Шанбе — рӯзи истироҳат", ru: "Суббота — выходной", en: "Saturday — rest day" },
  "addStudent.saturdayOn": { tj: "Шанбе — рӯзи корӣ", ru: "Суббота — рабочий", en: "Saturday — working day" },

  // Shift labels (translatable)
  "shiftLabel.morning": { tj: "Субҳ (08:00 - 13:00)", ru: "Утро (08:00 - 13:00)", en: "Morning (08:00 - 13:00)" },
  "shiftLabel.afternoon": { tj: "Рӯз (13:10 - 17:20)", ru: "День (13:10 - 17:20)", en: "Afternoon (13:10 - 17:20)" },

  // Common
  "results.showing": { tj: "натиҷа нишон дода шудааст", ru: "результатов показано", en: "results shown" },
  "common.of": { tj: "аз", ru: "из", en: "of" },

  // Admin form
  "admin.schoolName": { tj: "Номи муассиса", ru: "Название учреждения", en: "School name" },
  "admin.schoolPrefix": { tj: "ID-и мактаб (префикс)", ru: "ID школы (префикс)", en: "School ID (prefix)" },
  "admin.fillAll": { tj: "Лутфан ҳамаи майдонҳоро пур кунед", ru: "Заполните все поля", en: "Please fill all fields" },
  "admin.prefixExists": { tj: "Чунин префикс аллакай вуҷуд дорад", ru: "Такой префикс уже существует", en: "Prefix already exists" },
  "admin.prefixInUse": { tj: "Ин префикс аллакай истифода шудааст", ru: "Этот префикс уже используется", en: "This prefix is already in use" },
  "admin.usernameExists": { tj: "Чунин логин аллакай вуҷуд дорад", ru: "Такой логин уже существует", en: "Username already exists" },

  // Login extras
  "login.tooMany": { tj: "Кӯшишҳои зиёд. Лутфан баъд аз", ru: "Слишком много попыток. Повторите через", en: "Too many attempts. Retry in" },

  // Rankings
  "nav.rankings": { tj: "Рейтинги синфҳо", ru: "Рейтинг классов", en: "Class Rankings" },
  "nav.journal": { tj: "Журнал", ru: "Журнал", en: "Journal" },
  "rankings.title": { tj: "Рейтинги синфҳо", ru: "Рейтинг классов", en: "Class Rankings" },
  "rankings.subtitle": { tj: "Дар асоси сатҳи давомот дар вақти воқеӣ", ru: "В реальном времени по уровню посещаемости", en: "Real-time by attendance rate" },
  "rankings.empty": { tj: "Маълумот нест", ru: "Нет данных", en: "No data" },
  "rankings.rate": { tj: "Сатҳ", ru: "Уровень", en: "Rate" },
  "rankings.class": { tj: "Синф", ru: "Класс", en: "Class" },
  "nav.readingRankings": { tj: "Рейтинги хониш", ru: "Рейтинг учеников", en: "Reading Rankings" },
  "reading.title": { tj: "Рейтинги хониш", ru: "Рейтинг учеников", en: "Reading Rankings" },
  "reading.subtitle": { tj: "Дар асоси шумораи умумии ҳузур", ru: "По общему количеству посещений", en: "By total attendance count" },
  "reading.empty": { tj: "Маълумот нест", ru: "Нет данных", en: "No data" },
  "reading.count": { tj: "ҳузур", ru: "посещений", en: "attendances" },

  // Admin / Shift extras
  "admin.open": { tj: "Кушодани панели маъмур", ru: "Открыть админ-панель", en: "Open admin panel" },
  "school.logoQrHint": { tj: "Ин лого дар маркази QR код намоиш дода мешавад", ru: "Этот логотип отображается в центре QR-кода", en: "This logo appears at the center of QR codes" },
  "shift.management": { tj: "Идоракунии басти дарсӣ", ru: "Управление сменами", en: "Shift management" },
  "shift.shift1Desc": { tj: "Басти 1 (08:00 - 13:00): синфҳои 1, 7, 8, 9, 10", ru: "Смена 1 (08:00 - 13:00): классы 1, 7, 8, 9, 10", en: "Shift 1 (08:00 - 13:00): grades 1, 7, 8, 9, 10" },
  "shift.shift2Desc": { tj: "Басти 2 (13:00+): синфҳои 2, 3, 4, 5, 6", ru: "Смена 2 (13:00+): классы 2, 3, 4, 5, 6", en: "Shift 2 (13:00+): grades 2, 3, 4, 5, 6" },

  // Navigation extras
  "nav.parents": { tj: "Рақами волидайн", ru: "Номера родителей", en: "Parent Numbers" },
  "nav.messageParents": { tj: "Паём ба волидайн", ru: "Сообщение родителям", en: "Message to Parents" },

  // Parent Numbers
  "parents.title": { tj: "Рақами волидайн", ru: "Номера родителей", en: "Parent Numbers" },
  "parents.class": { tj: "Синф", ru: "Класс", en: "Class" },
  "parents.parallel": { tj: "Параллел", ru: "Параллель", en: "Parallel" },
  "parents.select": { tj: "Интихоб...", ru: "Выбрать...", en: "Select..." },
  "parents.selectHint": { tj: "Барои оғоз: синф ва параллелро интихоб кунед.", ru: "Для начала выберите класс и параллель.", en: "Select a class and parallel to begin." },
  "parents.studentName": { tj: "Номи хонанда", ru: "Имя ученика", en: "Student Name" },
  "parents.contact": { tj: "Telegram Chat ID / Телефон", ru: "Telegram Chat ID / Телефон", en: "Telegram Chat ID / Phone" },
  "parents.contactPlaceholder": { tj: "Chat ID ё рақами телефон", ru: "Chat ID или телефон", en: "Chat ID or phone" },
  "parents.action": { tj: "Амал", ru: "Действие", en: "Action" },
  "parents.save": { tj: "Сабт", ru: "Сохранить", en: "Save" },
  "parents.saved": { tj: "Сабт шуд", ru: "Сохранено", en: "Saved" },
  "parents.saveError": { tj: "Хатои сабт", ru: "Ошибка сохранения", en: "Save error" },
  "parents.noStudents": { tj: "Хонанда нест", ru: "Нет учеников", en: "No students" },
  "parents.phone": { tj: "Рақами телефон", ru: "Номер телефона", en: "Phone Number" },
  "parents.phonePlaceholder": { tj: "масалан: 900000000", ru: "напр: 900000000", en: "e.g. 900000000" },
  "parents.status": { tj: "Ҳолат", ru: "Статус", en: "Status" },
  "parents.linked": { tj: "Пайваст", ru: "Привязан", en: "Linked" },
  "parents.notLinked": { tj: "Пайваст нест", ru: "Не привязан", en: "Not linked" },
  "parents.reset": { tj: "Бекор кардан", ru: "Сбросить", en: "Reset" },
  "parents.resetConfirmTitle": { tj: "Пайвастро бекор кардан?", ru: "Отвязать родителя?", en: "Disconnect parent?" },
  "parents.resetConfirmDesc": { tj: "Оё шумо мутмаин ҳастед, ки ин хонандаро ҷудо кунед? Ин амал барқарор намешавад.", ru: "Вы уверены, что хотите отвязать этого ученика? Это действие нельзя отменить.", en: "Are you sure you want to disconnect this student? This action cannot be undone." },
  "parents.resetSuccess": { tj: "Пайваст бомуваффақият бекор карда шуд", ru: "Привязка успешно сброшена", en: "Student connection has been successfully reset." },
  "parents.resetError": { tj: "Хатои бекор кардани пайваст", ru: "Ошибка сброса привязки", en: "Reset error" },
  "parents.cancel": { tj: "Бекор", ru: "Отмена", en: "Cancel" },
  "parents.confirm": { tj: "Тасдиқ", ru: "Подтвердить", en: "Confirm" },

  // Connectivity & error handling
  "conn.online": { tj: "Онлайн", ru: "В сети", en: "Online" },
  "conn.offline": { tj: "Офлайн", ru: "Не в сети", en: "Offline" },
  "conn.lost": { tj: "Пайвасти интернет қатъ шуд. Лутфан пайвасти интернетро тафтиш кунед.", ru: "Соединение потеряно. Пожалуйста, проверьте подключение к интернету.", en: "Connection lost. Please check your internet connection." },
  "conn.retry": { tj: "Аз нав кӯшиш кунед", ru: "Повторить", en: "Retry" },
  "conn.stale": { tj: "Маълумоти нишондодашуда метавонад кӯҳна бошад.", ru: "Отображаемые данные могут быть устаревшими.", en: "Showing last known data — it may be outdated." },

  // Messages / Notifications
  "nav.messages": { tj: "Паёмҳо", ru: "Сообщения", en: "Messages" },
  "messages.title": { tj: "Паёмҳо", ru: "Сообщения", en: "Messages" },
  "messages.markAll": { tj: "Ҳамаро хонда қайд кунед", ru: "Отметить все прочитанными", en: "Mark all read" },
  "messages.allRead": { tj: "Ҳама паёмҳо хонда шуданд", ru: "Все сообщения отмечены прочитанными", en: "All messages marked as read" },
  "messages.empty": { tj: "Ҳоло паёме нест", ru: "Пока нет сообщений", en: "No messages yet" },
  "messages.unknown": { tj: "Номаълум", ru: "Неизвестно", en: "Unknown" },
  "messages.clear": { tj: "Тоза кардан", ru: "Очистить", en: "Clear" },
  "messages.clearConfirm": { tj: "Оё шумо боварӣ доред, ки мехоҳед ҳамаи паёмҳоро нест кунед?", ru: "Вы уверены, что хотите удалить все сообщения?", en: "Are you sure you want to delete all messages?" },
  "messages.cleared": { tj: "Ҳама паёмҳо нест карда шуданд", ru: "Все сообщения удалены", en: "All messages deleted" },
  "messages.cancel": { tj: "Бекор кардан", ru: "Отмена", en: "Cancel" },

  // Message to Parents
  "msg.title": { tj: "Паём ба волидайн", ru: "Сообщение родителям", en: "Message to Parents" },
  "msg.search": { tj: "Ҷустуҷӯ бо ном...", ru: "Поиск по имени...", en: "Search by name..." },
  "msg.placeholder": { tj: "Матни паём...", ru: "Текст сообщения...", en: "Message text..." },
  "msg.send": { tj: "Фиристодан", ru: "Отправить", en: "Send" },
  "msg.sent": { tj: "Паём фиристода шуд", ru: "Сообщение отправлено", en: "Message sent" },
  "msg.sendError": { tj: "Хатои фиристодан", ru: "Ошибка отправки", en: "Send error" },
  "msg.empty": { tj: "Матн холӣ аст", ru: "Текст пуст", en: "Text is empty" },
  "msg.noChatId": { tj: "Chat ID сабт нашудааст", ru: "Chat ID не сохранён", en: "No Chat ID saved" },
  "msg.attach": { tj: "Замима кардани файл", ru: "Прикрепить файл", en: "Attach file" },
  "msg.fileTooBig": { tj: "Ҳаҷми файл аз 5MB зиёд аст", ru: "Размер файла больше 5МБ", en: "File is larger than 5MB" },
  "msg.record": { tj: "Сабти овоз", ru: "Записать голос", en: "Record" },
  "msg.stopRec": { tj: "Қатъ кардан", ru: "Остановить", en: "Stop" },
  "msg.voiceSent": { tj: "Паёми овозӣ фиристода шуд", ru: "Голосовое отправлено", en: "Voice message sent" },
  "msg.micError": { tj: "Микрофон дастрас нест", ru: "Микрофон недоступен", en: "Microphone unavailable" },
  "admin.existingPrefixes": { tj: "Префиксҳои мавҷуда", ru: "Существующие префиксы", en: "Existing prefixes" },
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
