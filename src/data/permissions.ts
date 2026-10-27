import { PermissionDefinition, PermissionKey, UserRole } from '../types';

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Дашборд
  {
    key: 'dashboard.view',
    label: 'Перегляд дашборду',
    description: 'Доступ до головної сторінки з лічильниками та картками відвідувачів',
    category: 'dashboard'
  },
  {
    key: 'dashboard.actions',
    label: 'Швидкі дії на дашборді',
    description: 'Фіксація входу/виходу в один клік, зміна статусу присутності',
    category: 'dashboard'
  },

  // Відвідувачі
  {
    key: 'visitors.view',
    label: 'Перегляд бази відвідувачів',
    description: 'Доступ до списку зареєстрованих осіб, пошуку та фільтрації',
    category: 'visitors'
  },
  {
    key: 'visitors.check_in_out',
    label: 'Облік входу / виходу відвідувачів',
    description: 'Фіксація прибуття та відбуття (вхід/вихід) на дашборді, у списках та через голосові команди',
    category: 'visitors'
  },
  {
    key: 'visitors.create',
    label: 'Реєстрація нових осіб',
    description: 'Можливість створювати нові картки відвідувачів та співробітників',
    category: 'visitors'
  },
  {
    key: 'visitors.edit',
    label: 'Редагування карток',
    description: 'Зміна ПІБ, звання, позивного, групи та закріпленої бригади',
    category: 'visitors'
  },
  {
    key: 'visitors.delete',
    label: 'Видалення відвідувачів',
    description: 'Видалення карток відвідувачів з бази даних',
    category: 'visitors'
  },

  // Служба безпеки / Охорона
  {
    key: 'security.view',
    label: 'Перегляд розділу охорони',
    description: 'Доступ до моніторингу чергувань, графіків та складу змін',
    category: 'security'
  },
  {
    key: 'security.manage_shifts',
    label: 'Управління чергуваннями',
    description: 'Початок та завершення чергування, облік періодів відпочинку',
    category: 'security'
  },
  {
    key: 'security.dirty_sky',
    label: 'Режим «Брудне небо»',
    description: 'Активація та деактивація тривожного режиму у шапці системи та на дашборді',
    category: 'security'
  },
  {
    key: 'security.manage_guards',
    label: 'Склад постової служби',
    description: 'Додавання та видалення постових та змін охорони',
    category: 'security'
  },

  // Звіти
  {
    key: 'reports.view',
    label: 'Перегляд журналів та звітів',
    description: 'Формування звітів за зміни, часові проміжки та категорії',
    category: 'reports'
  },
  {
    key: 'reports.export',
    label: 'Експорт звітів',
    description: 'Вивантаження звітів у формати CSV / Excel',
    category: 'reports'
  },
  {
    key: 'reports.print',
    label: 'Друк бланка звіту',
    description: 'Генерація друкованої форми офіційного звіту відвідування',
    category: 'reports'
  },
  {
    key: 'reports.clean',
    label: 'Очищення журналів',
    description: 'Очищення логів відвідувань за вибраний період або зміну',
    category: 'reports'
  },

  // Ролі та доступ
  {
    key: 'roles.view',
    label: 'Перегляд ролей та списку користувачів',
    description: 'Доступ до вкладки керування ролями та перегляд дозволених email',
    category: 'roles'
  },
  {
    key: 'roles.manage_users',
    label: 'Керування дозволеними email',
    description: 'Ручне додавання, редагування, видалення email та імпорт/експорт файлу',
    category: 'roles'
  },
  {
    key: 'roles.manage_permissions',
    label: 'Редагування прав доступу ролей',
    description: 'Налаштування матриці прав для кожної ролі та створення нових ролей',
    category: 'roles'
  },

  // Налаштування
  {
    key: 'settings.view',
    label: 'Доступ до налаштувань',
    description: 'Перегляд розділу конфігурації системи',
    category: 'settings'
  },
  {
    key: 'settings.manage_dictionaries',
    label: 'Довідники системи',
    description: 'Редагування списків звань, бригад, груп та іконок',
    category: 'settings'
  },
  {
    key: 'settings.backup',
    label: 'Резервне копіювання',
    description: 'Експорт повної резервної копії бази та відновлення з JSON-файлу',
    category: 'settings'
  },
  {
    key: 'settings.appearance',
    label: 'Зовнішній вигляд і звук',
    description: 'Зміна теми, розміру шрифту, сповіщень та кількості колонок',
    category: 'settings'
  }
];

export const ALL_PERMISSIONS: PermissionKey[] = SYSTEM_PERMISSIONS.map(p => p.key);

export const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'admin',
    name: 'Суперадміністратор',
    description: 'Повний необмежений доступ до всіх функцій, налаштувань та керування доступом',
    color: '#3b82f6', // blue
    isSystem: true,
    permissions: [...ALL_PERMISSIONS]
  },
  {
    id: 'security',
    name: 'Служба безпеки / Охорона',
    description: 'Оперативний контроль КПП: швидкі дії, облік входу/виходу, графік змін, режим «Брудне небо» та друк звітів',
    color: '#ef4444', // red
    isSystem: true,
    permissions: [
      'dashboard.view',
      'dashboard.actions',
      'visitors.view',
      'visitors.check_in_out',
      'visitors.edit',
      'security.view',
      'security.manage_shifts',
      'security.dirty_sky',
      'security.manage_guards',
      'reports.view',
      'reports.print'
    ]
  },
  {
    id: 'manager',
    name: 'Оператор обліку (КПП)',
    description: 'Реєстрація та редагування карток відвідувачів, облік входу/виходу, контроль присутності, експорт звітів',
    color: '#10b981', // emerald
    isSystem: true,
    permissions: [
      'dashboard.view',
      'dashboard.actions',
      'visitors.view',
      'visitors.check_in_out',
      'visitors.create',
      'visitors.edit',
      'visitors.delete',
      'reports.view',
      'reports.export',
      'reports.print'
    ]
  },
  {
    id: 'auditor',
    name: 'Аудитор / Аналітик',
    description: 'Режим перегляду: аналітика, формування журналів та вивантаження статистичних звітів',
    color: '#f59e0b', // amber
    isSystem: true,
    permissions: [
      'dashboard.view',
      'visitors.view',
      'security.view',
      'reports.view',
      'reports.export',
      'reports.print'
    ]
  }
];

export const PERMISSION_CATEGORY_NAMES: Record<PermissionDefinition['category'], { title: string; color: string }> = {
  dashboard: { title: 'Дашборд (Монітор)', color: 'blue' },
  visitors: { title: 'Відвідувачі та персонал', color: 'emerald' },
  security: { title: 'Охорона та чергування', color: 'red' },
  reports: { title: 'Журнали та звітність', color: 'indigo' },
  roles: { title: 'Ролі та безпека доступу', color: 'purple' },
  settings: { title: 'Налаштування системи', color: 'amber' }
};
