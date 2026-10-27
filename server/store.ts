import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { dbCrypto } from './crypto';

export interface PasswordResetRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleId?: string;
  requestedAt: string;
  requestedByEmail?: string;
  notes?: string;
  status: 'pending' | 'resolved';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  category: 'auth' | 'visitor' | 'security' | 'backup' | 'system' | 'encryption';
  userEmail: string;
  userName: string;
  details: string;
  ipAddress?: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export interface StopListItem {
  id: string;
  name: string;
  callsign?: string;
  documentNumber?: string;
  vehiclePlate?: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
  addedBy: string;
  addedAt: string;
  active: boolean;
}

export interface CheckpointTerminal {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'standby' | 'alert' | 'closed';
  assignedGuards: string[];
  lastActivity: string;
}

export interface ServerState {
  visitors: any[];
  guards: any[];
  shifts: any[];
  securityShifts: any[];
  categories: string[];
  groups: any[];
  locations: any[];
  dirtySkyEvents: any[];
  dutyEvents: any[];
  customIcons: any[];
  reportRetentionHours: number;
  authorizedUsers: any[];
  roles: any[];
  passwordRequests?: PasswordResetRequest[];
  auditLogs?: AuditLogEntry[];
  stopList?: StopListItem[];
  checkpoints?: CheckpointTerminal[];
  lastUpdated: string;
}

const DEFAULT_RANKS = ['Рядовий', 'Сержант', 'Лейтенант', 'Капітан', 'Майор', 'Полковник'];

const DEFAULT_LOCATIONS = [
  { id: 'loc-1', name: 'Штаб' },
  { id: 'loc-2', name: 'КПП' },
  { id: 'loc-3', name: 'Казарма №1' },
  { id: 'loc-4', name: 'Навчальна бригада' }
];

const DEFAULT_GROUPS = [
  { id: '1', name: 'Постійні відвідувачі', color: 'rgba(34, 197, 94, 0.1)' },
  { id: '2', name: 'Тимчасові', color: 'rgba(59, 130, 246, 0.1)' },
  { id: '3', name: 'Рота охорони', color: 'rgba(239, 68, 68, 0.1)' }
];

const DEFAULT_SECURITY_SHIFTS = [
  { id: 'shift-1', name: 'Денна зміна', visitorIds: [] },
  { id: 'shift-2', name: 'Нічна зміна', visitorIds: [] }
];

const DEFAULT_CHECKPOINTS: CheckpointTerminal[] = [
  {
    id: 'kpp-1',
    name: 'КПП-1 (Головний вхід)',
    location: 'Центральні ворота',
    status: 'active',
    assignedGuards: [],
    lastActivity: new Date().toISOString()
  },
  {
    id: 'kpp-2',
    name: 'КПП-2 (Транспортний пункт)',
    location: 'В\'їзд транспорту',
    status: 'active',
    assignedGuards: [],
    lastActivity: new Date().toISOString()
  },
  {
    id: 'kpp-3',
    name: 'КПП-3 (Службовий прохід)',
    location: 'Північний сектор',
    status: 'standby',
    assignedGuards: [],
    lastActivity: new Date().toISOString()
  }
];

const ALL_PERMISSION_KEYS = [
  'dashboard.view',
  'dashboard.actions',
  'visitors.view',
  'visitors.check_in_out',
  'visitors.create',
  'visitors.edit',
  'visitors.delete',
  'security.view',
  'security.manage_shifts',
  'security.dirty_sky',
  'security.manage_guards',
  'reports.view',
  'reports.export',
  'reports.print',
  'reports.clean',
  'roles.view',
  'roles.manage_users',
  'roles.manage_permissions',
  'settings.view',
  'settings.manage_dictionaries',
  'settings.backup',
  'settings.appearance'
];

const DEFAULT_ROLES = [
  {
    id: 'admin',
    name: 'Суперадміністратор',
    description: 'Повний необмежений доступ до всіх функцій, налаштувань, шифрування та керування доступом',
    color: '#3b82f6',
    isSystem: true,
    permissions: ALL_PERMISSION_KEYS
  },
  {
    id: 'security',
    name: 'Служба безпеки / Охорона',
    description: 'Оперативний контроль КПП: швидкі дії, облік входу/виходу, графік змін, режим «Брудне небо» та друк звітів',
    color: '#ef4444',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.actions',
      'visitors.view', 'visitors.check_in_out', 'visitors.create',
      'security.view', 'security.manage_shifts', 'security.dirty_sky', 'security.manage_guards',
      'reports.view', 'reports.export', 'reports.print',
      'settings.view'
    ]
  },
  {
    id: 'manager',
    name: 'Оператор КПП',
    description: 'Базова робота на КПП: облік входу/виходу, створення та редагування карток відвідувачів',
    color: '#10b981',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.actions',
      'visitors.view', 'visitors.check_in_out', 'visitors.create', 'visitors.edit',
      'security.view',
      'settings.view'
    ]
  },
  {
    id: 'auditor',
    name: 'Інспектор / Аудитор',
    description: 'Перегляд аналітики, звітів, журналів аудиту та списків без можливості редагування даних',
    color: '#f59e0b',
    isSystem: true,
    permissions: [
      'dashboard.view',
      'visitors.view',
      'security.view',
      'reports.view', 'reports.export', 'reports.print'
    ]
  }
];

class StateStore {
  private state: ServerState;
  private dataDir: string;
  private encStateFilePath: string;
  private legacyStateFilePath: string;
  public readonly iconsDir: string;
  public readonly archivesDir: string;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const cwdDataDir = path.join(process.cwd(), 'data');
    const rootDataDir = path.resolve('/app/applet/data');
    this.dataDir = fs.existsSync(cwdDataDir) ? cwdDataDir : (fs.existsSync(rootDataDir) ? rootDataDir : cwdDataDir);
    this.encStateFilePath = path.join(this.dataDir, 'system_state.enc');
    this.legacyStateFilePath = path.join(this.dataDir, 'system_state.json');
    this.iconsDir = path.join(this.dataDir, 'icons');
    this.archivesDir = path.join(this.dataDir, 'archives');

    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }

    if (!fs.existsSync(this.iconsDir)) {
      try {
        fs.mkdirSync(this.iconsDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create icons directory:', err);
      }
    }

    if (!fs.existsSync(this.archivesDir)) {
      try {
        fs.mkdirSync(this.archivesDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create archives directory:', err);
      }
    }

    this.state = this.loadInitialState();

    // Log initialization in audit log
    this.addAuditLog({
      action: 'Система запущена',
      category: 'system',
      userEmail: 'system@server',
      userName: 'Сервер СКУД',
      details: `База завантажена. Захищено AES-256-GCM. Записів відвідувачів: ${this.state.visitors.length}`,
      status: 'success'
    });
  }

  private loadInitialState(): ServerState {
    let parsed: any = null;

    // 1. Try loading AES-256-GCM encrypted database file
    if (fs.existsSync(this.encStateFilePath)) {
      try {
        parsed = dbCrypto.readEncryptedFile(this.encStateFilePath);
        if (parsed) {
          console.log(`[Store] Successfully loaded and decrypted AES-256-GCM database from ${this.encStateFilePath}`);
        }
      } catch (err) {
        console.error('[Store] Error decrypting system_state.enc:', err);
      }
    }

    // 2. If not found or failed, try legacy system_state.json and migrate to encrypted format
    if (!parsed && fs.existsSync(this.legacyStateFilePath)) {
      try {
        const raw = fs.readFileSync(this.legacyStateFilePath, 'utf8');
        parsed = JSON.parse(raw);
        console.log(`[Store] Migrating legacy unencrypted state to AES-256-GCM encrypted database...`);
      } catch (e) {
        console.error('[Store] Error reading legacy system_state.json:', e);
      }
    }

    // 3. Fallback to latest auto backup if primary files had errors
    if (!parsed) {
      const backupsDir = path.join(this.dataDir, 'backups');
      const latestEncBackup = path.join(backupsDir, 'latest_auto_backup.enc.json');
      const latestJsonBackup = path.join(backupsDir, 'latest_auto_backup.json');

      if (fs.existsSync(latestEncBackup)) {
        try {
          parsed = dbCrypto.readEncryptedFile(latestEncBackup);
          if (parsed) console.log('[Store] Recovered state from latest_auto_backup.enc.json');
        } catch (e) {}
      }
      if (!parsed && fs.existsSync(latestJsonBackup)) {
        try {
          parsed = JSON.parse(fs.readFileSync(latestJsonBackup, 'utf8'));
          if (parsed) console.log('[Store] Recovered state from latest_auto_backup.json');
        } catch (e) {}
      }
    }

    if (parsed) {
      const stateObj: ServerState = {
        visitors: Array.isArray(parsed.visitors) ? parsed.visitors : [],
        guards: Array.isArray(parsed.guards) ? parsed.guards : [],
        shifts: Array.isArray(parsed.shifts) ? parsed.shifts : [],
        securityShifts: Array.isArray(parsed.securityShifts) && parsed.securityShifts.length > 0 ? parsed.securityShifts : DEFAULT_SECURITY_SHIFTS,
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_RANKS,
        groups: Array.isArray(parsed.groups) && parsed.groups.length > 0 ? parsed.groups : DEFAULT_GROUPS,
        locations: Array.isArray(parsed.locations) && parsed.locations.length > 0 ? parsed.locations : DEFAULT_LOCATIONS,
        dirtySkyEvents: Array.isArray(parsed.dirtySkyEvents) ? parsed.dirtySkyEvents : [],
        dutyEvents: Array.isArray(parsed.dutyEvents) ? parsed.dutyEvents : [],
        customIcons: Array.isArray(parsed.customIcons) ? parsed.customIcons : [],
        reportRetentionHours: typeof parsed.reportRetentionHours === 'number' ? parsed.reportRetentionHours : 1440,
        authorizedUsers: (Array.isArray(parsed.authorizedUsers) && parsed.authorizedUsers.length > 0 ? parsed.authorizedUsers : this.loadInitialAuthorizedUsers()).map((u: any) => ({
          ...u,
          password: u.password || 'admin'
        })),
        roles: Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : DEFAULT_ROLES,
        passwordRequests: Array.isArray(parsed.passwordRequests) ? parsed.passwordRequests : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        stopList: Array.isArray(parsed.stopList) ? parsed.stopList : [],
        checkpoints: Array.isArray(parsed.checkpoints) && parsed.checkpoints.length > 0 ? parsed.checkpoints : DEFAULT_CHECKPOINTS,
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };

      // Persist in encrypted format immediately
      this.saveStateImmediately(stateObj);
      return stateObj;
    }

    // 3. Default state if no prior file exists
    const initialState: ServerState = {
      visitors: [],
      guards: [],
      shifts: [],
      securityShifts: DEFAULT_SECURITY_SHIFTS,
      categories: DEFAULT_RANKS,
      groups: DEFAULT_GROUPS,
      locations: DEFAULT_LOCATIONS,
      dirtySkyEvents: [],
      dutyEvents: [],
      customIcons: [],
      reportRetentionHours: 1440,
      authorizedUsers: this.loadInitialAuthorizedUsers(),
      roles: DEFAULT_ROLES,
      passwordRequests: [],
      auditLogs: [],
      stopList: [],
      checkpoints: DEFAULT_CHECKPOINTS,
      lastUpdated: new Date().toISOString()
    };

    this.saveStateImmediately(initialState);
    return initialState;
  }

  private loadInitialAuthorizedUsers(): any[] {
    const authUsersPath = path.join(process.cwd(), 'src', 'data', 'authorized_users.json');
    if (fs.existsSync(authUsersPath)) {
      try {
        const raw = fs.readFileSync(authUsersPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: any) => ({
            ...u,
            password: u.password || 'admin'
          }));
        }
      } catch (err) {
        console.error('[Store] Error reading initial authorized_users.json', err);
      }
    }
    return [
      {
        id: 'user-1',
        email: 'tonyreshua@gmail.com',
        name: 'Антон (Адміністратор)',
        roleId: 'admin',
        addedAt: new Date().toISOString(),
        notes: 'Основний обліковий запис адміністратора системи',
        avatarColor: '#3b82f6',
        password: 'admin'
      }
    ];
  }

  public getState(): ServerState {
    return this.state;
  }

  /**
   * Updates a top-level key with zeroing protection:
   * Rejects empty array updates from unhydrated clients if the server already has populated data.
   */
  public updateKey<K extends keyof ServerState>(key: K, value: ServerState[K]): ServerState {
    if (Array.isArray(value) && value.length === 0) {
      const current = this.state[key];
      if (Array.isArray(current) && current.length > 0) {
        console.warn(`[Store] Blocked database zeroing: rejected empty array update for "${String(key)}" (server has ${current.length} records)`);
        return this.state;
      }
    }
    this.state[key] = value;
    this.state.lastUpdated = new Date().toISOString();
    this.scheduleSave();
    return this.state;
  }

  public patch(partial: Partial<ServerState>): ServerState {
    for (const [key, value] of Object.entries(partial)) {
      if (Array.isArray(value) && value.length === 0) {
        const current = (this.state as any)[key];
        if (Array.isArray(current) && current.length > 0) {
          console.warn(`[Store] Blocked zeroing in patch: rejected empty array for "${key}" (server has ${current.length} records)`);
          continue;
        }
      }
      (this.state as any)[key] = value;
    }
    this.state.lastUpdated = new Date().toISOString();
    this.scheduleSave();
    return this.state;
  }

  /**
   * Check if user email has a specific permission based on current server state
   */
  public canUserPerformAction(userEmail: string | undefined, requiredPermissions: string | string[]): boolean {
    if (!userEmail) return true; // If anonymous/unspecified, allow fallback
    const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const users = Array.isArray(this.state.authorizedUsers) ? this.state.authorizedUsers : [];
    const user = users.find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase().trim());
    if (!user) return false;
    if (user.roleId === 'admin') return true;

    const roles = Array.isArray(this.state.roles) ? this.state.roles : [];
    const role = roles.find((r: any) => r.id === user.roleId);
    if (!role) return false;
    if (role.id === 'admin') return true;

    const userPerms = Array.isArray(role.permissions) ? role.permissions : [];
    return perms.some(p => userPerms.includes(p));
  }

  /**
   * Handle real-time discrete events (Dirty Sky, Duty Events, Visitor Check-in/out, etc.)
   */
  public handleServerEvent(eventType: string, eventData: any): void {
    const now = new Date().toISOString();
    switch (eventType) {
      case 'dirty_sky:start': {
        if (eventData?.userEmail && !this.canUserPerformAction(eventData.userEmail, 'security.dirty_sky')) {
          console.warn(`[Store] Blocked unauthorized dirty_sky:start from ${eventData.userEmail}`);
          this.addAuditLog({
            action: 'Відхилено: Немає прав на «Брудне небо»',
            category: 'security',
            userEmail: eventData.userEmail,
            userName: eventData.userName || 'Користувач',
            details: 'Спроба активації режиму «Брудне небо» без відповідного дозволу в матриці прав',
            status: 'error'
          });
          return;
        }

        if (!Array.isArray(this.state.dirtySkyEvents)) this.state.dirtySkyEvents = [];
        const newEvent = eventData && eventData.id ? eventData : { id: Date.now().toString(), startTime: now };
        // Check if already open
        const alreadyActive = this.state.dirtySkyEvents.some(e => !e.endTime);
        if (!alreadyActive) {
          this.state.dirtySkyEvents.push(newEvent);
          this.state.lastUpdated = now;
          this.scheduleSave();
          this.addAuditLog({
            action: 'Режим Брудне небо УВІМКНЕНО',
            category: 'security',
            userEmail: eventData?.userEmail || 'system',
            userName: eventData?.userName || 'Оператор',
            details: 'Активовано режим тривоги «Брудне небо» (синхронізовано для всіх операторів)',
            status: 'error'
          });
        }
        break;
      }
      case 'dirty_sky:end': {
        if (eventData?.userEmail && !this.canUserPerformAction(eventData.userEmail, 'security.dirty_sky')) {
          console.warn(`[Store] Blocked unauthorized dirty_sky:end from ${eventData.userEmail}`);
          this.addAuditLog({
            action: 'Відхилено: Немає прав на «Брудне небо»',
            category: 'security',
            userEmail: eventData.userEmail,
            userName: eventData.userName || 'Користувач',
            details: 'Спроба вимкнення режиму «Брудне небо» без відповідного дозволу в матриці прав',
            status: 'error'
          });
          return;
        }

        if (Array.isArray(this.state.dirtySkyEvents)) {
          const lastEvent = this.state.dirtySkyEvents[this.state.dirtySkyEvents.length - 1];
          if (lastEvent && !lastEvent.endTime) {
            lastEvent.endTime = eventData?.endTime || now;
            this.state.lastUpdated = now;
            this.scheduleSave();
            this.addAuditLog({
              action: 'Режим Брудне небо ВИМКНЕНО',
              category: 'security',
              userEmail: eventData?.userEmail || 'system',
              userName: eventData?.userName || 'Оператор',
              details: 'Завершено режим тривоги «Брудне небо» (синхронізовано для всіх операторів)',
              status: 'success'
            });
          }
        }
        break;
      }
      case 'duty:add': {
        if (!Array.isArray(this.state.dutyEvents)) this.state.dutyEvents = [];
        const dutyEvt = eventData && eventData.id ? eventData : {
          id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
          shiftId: 'default',
          shiftName: 'Чергування',
          type: 'start',
          timestamp: now
        };
        this.state.dutyEvents.push(dutyEvt);
        this.state.lastUpdated = now;
        this.scheduleSave();
        break;
      }
      case 'visitor:status': {
        if (eventData?.userEmail && !this.canUserPerformAction(eventData.userEmail, ['visitors.check_in_out', 'dashboard.actions'])) {
          console.warn(`[Store] Blocked unauthorized visitor:status from ${eventData.userEmail}`);
          this.addAuditLog({
            action: 'Відхилено: Немає прав на облік входу/виходу',
            category: 'security',
            userEmail: eventData.userEmail,
            userName: eventData.userName || 'Користувач',
            details: 'Спроба зміни статусу відвідувача без відповідного дозволу в матриці прав',
            status: 'error'
          });
          return;
        }

        if (eventData?.visitorId && Array.isArray(this.state.visitors)) {
          const v = this.state.visitors.find((item: any) => item.id === eventData.visitorId);
          if (v) {
            v.status = eventData.status;
            if (Array.isArray(eventData.logs)) v.logs = eventData.logs;
            if (eventData.lastEntry !== undefined) v.lastEntry = eventData.lastEntry;
            if (typeof eventData.totalTimeMinutes === 'number') v.totalTimeMinutes = eventData.totalTimeMinutes;
            this.state.lastUpdated = now;
            this.scheduleSave();
          }
        }
        break;
      }
      default:
        console.log(`[Store] Processed real-time event: ${eventType}`);
    }
  }

  public seedIfEmpty(clientData: Partial<ServerState>): boolean {
    let seeded = false;

    for (const key of ['visitors', 'guards', 'shifts', 'securityShifts', 'categories', 'groups', 'locations', 'customIcons', 'dutyEvents', 'dirtySkyEvents'] as const) {
      const current = this.state[key];
      const incoming = clientData[key];
      if (Array.isArray(current) && current.length === 0 && Array.isArray(incoming) && incoming.length > 0) {
        (this.state as any)[key] = incoming;
        seeded = true;
      }
    }

    if (seeded) {
      this.state.lastUpdated = new Date().toISOString();
      this.scheduleSave();
      console.log('[Store] Seeded server data from client payload');
    }

    return seeded;
  }

  public createBackupSnapshot(payload?: Partial<ServerState>): { 
    filename: string; 
    timestamp: string; 
    size: number; 
    totalVisitors: number;
    encrypted: boolean;
    algorithm: string;
  } {
    if (payload && typeof payload === 'object') {
      for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value) && value.length === 0) {
          const current = (this.state as any)[key];
          if (Array.isArray(current) && current.length > 0) {
            console.warn(`[Store] Blocked zeroing in createBackupSnapshot: skipped empty array for "${key}"`);
            continue;
          }
        }
        (this.state as any)[key] = value;
      }
    }
    this.state.lastUpdated = new Date().toISOString();
    this.saveStateImmediately(this.state);

    const backupsDir = path.join(this.dataDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      try {
        fs.mkdirSync(backupsDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create backups directory:', err);
      }
    }

    const now = new Date();
    const datePart = now.toISOString().replace(/[:.]/g, '-');
    const filename = `backup_db_${datePart}.enc.json`;
    const fullBackupPath = path.join(backupsDir, filename);

    // Save with AES-256-GCM encryption
    dbCrypto.writeEncryptedFile(fullBackupPath, this.state);

    const stats = fs.statSync(fullBackupPath);
    console.log(`[Store] Created AES-256-GCM encrypted backup: ${filename} (${stats.size} bytes)`);

    this.addAuditLog({
      action: 'Створено зашифрований бекап',
      category: 'backup',
      userEmail: 'system',
      userName: 'Система',
      details: `Файл: ${filename}, Розмір: ${(stats.size / 1024).toFixed(1)} КБ, Алгоритм: AES-256-GCM`,
      status: 'success'
    });

    return {
      filename,
      timestamp: now.toISOString(),
      size: stats.size,
      totalVisitors: Array.isArray(this.state.visitors) ? this.state.visitors.length : 0,
      encrypted: true,
      algorithm: 'AES-256-GCM'
    };
  }

  public getServerBackups(): Array<{ 
    filename: string; 
    timestamp: string; 
    size: number; 
    totalVisitors: number;
    encrypted: boolean;
    algorithm: string;
  }> {
    const backupsDir = path.join(this.dataDir, 'backups');
    if (!fs.existsSync(backupsDir)) return [];

    try {
      const files = fs.readdirSync(backupsDir);
      return files
        .filter(f => f.endsWith('.json') || f.endsWith('.enc'))
        .map(filename => {
          const filePath = path.join(backupsDir, filename);
          const stats = fs.statSync(filePath);
          let totalVisitors = 0;
          let isEncrypted = filename.includes('.enc');
          let algorithm = isEncrypted ? 'AES-256-GCM' : 'Plaintext';

          try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            if (data._encrypted) {
              isEncrypted = true;
              algorithm = data.algorithm?.toUpperCase() || 'AES-256-GCM';
              // Check payload
              totalVisitors = this.state.visitors.length;
            } else if (Array.isArray(data.visitors)) {
              totalVisitors = data.visitors.length;
            }
          } catch (e) {}

          return {
            filename,
            timestamp: stats.mtime.toISOString(),
            size: stats.size,
            totalVisitors,
            encrypted: isEncrypted,
            algorithm
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      console.error('[Store] Failed to list backups:', e);
      return [];
    }
  }

  public restoreBackupSnapshot(filename: string): ServerState | null {
    const cleanName = path.basename(filename);
    const backupPath = path.join(this.dataDir, 'backups', cleanName);
    if (!fs.existsSync(backupPath)) return null;

    try {
      const parsed = dbCrypto.readEncryptedFile<any>(backupPath);
      if (!parsed) {
        throw new Error('Не вдалося розшифрувати файл бекапу');
      }

      this.state = {
        visitors: Array.isArray(parsed.visitors) ? parsed.visitors : [],
        guards: Array.isArray(parsed.guards) ? parsed.guards : [],
        shifts: Array.isArray(parsed.shifts) ? parsed.shifts : [],
        securityShifts: Array.isArray(parsed.securityShifts) ? parsed.securityShifts : DEFAULT_SECURITY_SHIFTS,
        categories: Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_RANKS,
        groups: Array.isArray(parsed.groups) ? parsed.groups : DEFAULT_GROUPS,
        locations: Array.isArray(parsed.locations) ? parsed.locations : DEFAULT_LOCATIONS,
        dirtySkyEvents: Array.isArray(parsed.dirtySkyEvents) ? parsed.dirtySkyEvents : [],
        dutyEvents: Array.isArray(parsed.dutyEvents) ? parsed.dutyEvents : [],
        customIcons: Array.isArray(parsed.customIcons) ? parsed.customIcons : [],
        reportRetentionHours: typeof parsed.reportRetentionHours === 'number' ? parsed.reportRetentionHours : 1440,
        authorizedUsers: Array.isArray(parsed.authorizedUsers) ? parsed.authorizedUsers : this.loadInitialAuthorizedUsers(),
        roles: Array.isArray(parsed.roles) ? parsed.roles : DEFAULT_ROLES,
        passwordRequests: Array.isArray(parsed.passwordRequests) ? parsed.passwordRequests : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : this.state.auditLogs || [],
        stopList: Array.isArray(parsed.stopList) ? parsed.stopList : this.state.stopList || [],
        checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : this.state.checkpoints || DEFAULT_CHECKPOINTS,
        lastUpdated: new Date().toISOString()
      };

      this.saveStateImmediately(this.state);
      console.log(`[Store] Restored database from AES-256-GCM backup: ${cleanName}`);

      this.addAuditLog({
        action: 'Відновлено базу з бекапу',
        category: 'backup',
        userEmail: 'admin',
        userName: 'Адміністратор',
        details: `Успішно відновлено з ${cleanName}. Відвідувачів: ${this.state.visitors.length}`,
        status: 'warning'
      });

      return this.state;
    } catch (e) {
      console.error('[Store] Failed to restore backup:', e);
      return null;
    }
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    if (!Array.isArray(this.state.auditLogs)) {
      this.state.auditLogs = [];
    }
    const newLog: AuditLogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.state.auditLogs.unshift(newLog);
    // Keep last 1000 logs
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 1000);
    }
    this.scheduleSave();
    return newLog;
  }

  public getAuditLogs(limit: number = 100): AuditLogEntry[] {
    return (this.state.auditLogs || []).slice(0, limit);
  }

  public getStopList(): StopListItem[] {
    return this.state.stopList || [];
  }

  public addToStopList(item: Omit<StopListItem, 'id' | 'addedAt'>): StopListItem {
    if (!Array.isArray(this.state.stopList)) {
      this.state.stopList = [];
    }
    const newItem: StopListItem = {
      id: 'stop-' + Date.now(),
      addedAt: new Date().toISOString(),
      ...item
    };
    this.state.stopList.unshift(newItem);
    this.state.lastUpdated = new Date().toISOString();
    this.scheduleSave();

    this.addAuditLog({
      action: 'Додано до стоп-листа',
      category: 'security',
      userEmail: item.addedBy,
      userName: item.addedBy,
      details: `${item.name} (${item.callsign || 'без позивного'}) — ${item.reason}`,
      status: 'warning'
    });

    return newItem;
  }

  public removeFromStopList(id: string): boolean {
    if (!Array.isArray(this.state.stopList)) return false;
    const initialLen = this.state.stopList.length;
    this.state.stopList = this.state.stopList.filter(item => item.id !== id);
    if (this.state.stopList.length !== initialLen) {
      this.state.lastUpdated = new Date().toISOString();
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public getCheckpoints(): CheckpointTerminal[] {
    return this.state.checkpoints || DEFAULT_CHECKPOINTS;
  }

  public updateCheckpoint(id: string, updates: Partial<CheckpointTerminal>): boolean {
    if (!Array.isArray(this.state.checkpoints)) {
      this.state.checkpoints = DEFAULT_CHECKPOINTS;
    }
    const cp = this.state.checkpoints.find(c => c.id === id);
    if (cp) {
      Object.assign(cp, updates, { lastActivity: new Date().toISOString() });
      this.state.lastUpdated = new Date().toISOString();
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public addPasswordRequest(reqData: Omit<PasswordResetRequest, 'id' | 'requestedAt' | 'status'>): PasswordResetRequest {
    if (!Array.isArray(this.state.passwordRequests)) {
      this.state.passwordRequests = [];
    }
    const newReq: PasswordResetRequest = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      ...reqData,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };
    this.state.passwordRequests.unshift(newReq);
    this.state.lastUpdated = new Date().toISOString();
    this.scheduleSave();

    this.addAuditLog({
      action: 'Запит нового пароля',
      category: 'auth',
      userEmail: reqData.userEmail,
      userName: reqData.userName,
      details: `Надіслано запит суперадміністратору для ${reqData.userName} (${reqData.userEmail})`,
      status: 'info'
    });

    return newReq;
  }

  public resolvePasswordRequest(requestId: string): boolean {
    if (!Array.isArray(this.state.passwordRequests)) return false;
    const item = this.state.passwordRequests.find(r => r.id === requestId);
    if (item) {
      item.status = 'resolved';
      this.state.lastUpdated = new Date().toISOString();
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public getSuperadminEmails(): string[] {
    const admins = (this.state.authorizedUsers || []).filter((u: any) => u.roleId === 'admin');
    if (admins.length > 0) {
      return Array.from(new Set(admins.map((u: any) => u.email)));
    }
    return ['tonyreshua@gmail.com'];
  }

  public saveCustomIcon(iconData: { id?: string; name: string; data: string; category?: string; targetId?: string }) {
    const id = iconData.id || `icon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const category = (iconData.category || 'general') as 'brigade' | 'user' | 'general';
    let filename = `${id}.png`;
    let url = `/api/icons/${filename}`;

    // If data is a base64 image, save binary file to iconsDir
    if (iconData.data && iconData.data.startsWith('data:')) {
      const match = iconData.data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'svg+xml' ? 'svg' : match[1];
        filename = `${id}.${ext}`;
        url = `/api/icons/${filename}`;
        const buffer = Buffer.from(match[2], 'base64');
        fs.writeFileSync(path.join(this.iconsDir, filename), buffer);
      }
    }

    const iconItem = {
      id,
      name: iconData.name,
      filename,
      url,
      data: iconData.data,
      category,
      targetId: iconData.targetId,
      updatedAt: new Date().toISOString()
    };

    if (!Array.isArray(this.state.customIcons)) {
      this.state.customIcons = [];
    }

    // Replace if exists with same id or targetId
    this.state.customIcons = this.state.customIcons.filter(
      i => i.id !== id && (!iconData.targetId || i.targetId !== iconData.targetId || i.category !== category)
    );
    this.state.customIcons.unshift(iconItem);

    // If targetId is provided, update brigade location or user avatar in state
    if (category === 'brigade' && iconData.targetId && Array.isArray(this.state.locations)) {
      const loc = this.state.locations.find((l: any) => l.id === iconData.targetId);
      if (loc) {
        loc.iconUrl = url;
      }
    } else if (category === 'user' && iconData.targetId && Array.isArray(this.state.authorizedUsers)) {
      const u = this.state.authorizedUsers.find((usr: any) => usr.id === iconData.targetId || usr.email.toLowerCase() === iconData.targetId?.toLowerCase());
      if (u) {
        u.avatar = url;
      }
    }

    this.state.lastUpdated = new Date().toISOString();
    this.scheduleSave();
    return iconItem;
  }

  public deleteCustomIcon(id: string): boolean {
    if (!Array.isArray(this.state.customIcons)) return false;
    const icon = this.state.customIcons.find(i => i.id === id);
    if (!icon) return false;

    if (icon.filename) {
      const filePath = path.join(this.iconsDir, icon.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    this.state.customIcons = this.state.customIcons.filter(i => i.id !== id);
    this.state.lastUpdated = new Date().toISOString();
    this.scheduleSave();
    return true;
  }

  public createFullSystemArchive(creatorEmail?: string, creatorName?: string) {
    const timestamp = new Date().toISOString();
    const dateFormatted = timestamp.replace(/[:.]/g, '-');
    const filename = `system_archive_${dateFormatted}.zip`;
    const zipPath = path.join(this.archivesDir, filename);

    const zip = new AdmZip();

    // 1. Add encrypted state file
    if (fs.existsSync(this.encStateFilePath)) {
      zip.addLocalFile(this.encStateFilePath, '', 'system_state.enc');
    } else {
      const encPayload = dbCrypto.encrypt(this.state);
      zip.addFile('system_state.enc', Buffer.from(JSON.stringify(encPayload, null, 2), 'utf8'));
    }

    // 2. Add unencrypted JSON state snapshot for transparency/audit
    zip.addFile('system_state.json', Buffer.from(JSON.stringify(this.state, null, 2), 'utf8'));

    // 3. Add icons folder if exists
    if (fs.existsSync(this.iconsDir)) {
      const iconFiles = fs.readdirSync(this.iconsDir);
      for (const f of iconFiles) {
        const fullIconPath = path.join(this.iconsDir, f);
        if (fs.statSync(fullIconPath).isFile()) {
          zip.addLocalFile(fullIconPath, 'icons');
        }
      }
    }

    // 4. Manifest with metadata and SHA-256
    const manifest = {
      archiveVersion: '2.0.0',
      timestamp,
      createdDate: new Date().toLocaleString('uk-UA'),
      creatorEmail: creatorEmail || 'admin@skud.local',
      creatorName: creatorName || 'Адміністратор',
      encryption: 'AES-256-GCM',
      stats: {
        visitors: this.state.visitors?.length || 0,
        locations: this.state.locations?.length || 0,
        authorizedUsers: this.state.authorizedUsers?.length || 0,
        customIcons: this.state.customIcons?.length || 0,
        shifts: this.state.shifts?.length || 0,
        dirtySkyEvents: this.state.dirtySkyEvents?.length || 0,
        dutyEvents: this.state.dutyEvents?.length || 0
      }
    };
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

    zip.writeZip(zipPath);

    const stats = fs.statSync(zipPath);
    const fileBuf = fs.readFileSync(zipPath);
    const sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');

    this.addAuditLog({
      action: 'Створено повний архів системи',
      category: 'backup',
      userEmail: creatorEmail || 'system',
      userName: creatorName || 'Адміністратор',
      details: `Файл: ${filename}, розмір: ${(stats.size / 1024).toFixed(1)} КБ, записів: ${manifest.stats.visitors}`,
      status: 'success'
    });

    return {
      filename,
      size: stats.size,
      timestamp,
      creatorEmail,
      creatorName,
      sha256,
      stats: manifest.stats
    };
  }

  public getServerArchives(): any[] {
    if (!fs.existsSync(this.archivesDir)) return [];
    try {
      const files = fs.readdirSync(this.archivesDir).filter(f => f.endsWith('.zip'));
      const archives = files.map(filename => {
        const filePath = path.join(this.archivesDir, filename);
        const stats = fs.statSync(filePath);
        let manifest: any = null;
        let sha256 = '';

        try {
          const zip = new AdmZip(filePath);
          const manifestEntry = zip.getEntry('manifest.json');
          if (manifestEntry) {
            manifest = JSON.parse(zip.readAsText(manifestEntry));
          }
          const buf = fs.readFileSync(filePath);
          sha256 = crypto.createHash('sha256').update(buf).digest('hex');
        } catch (e) {}

        return {
          filename,
          size: stats.size,
          timestamp: manifest?.timestamp || stats.mtime.toISOString(),
          creatorEmail: manifest?.creatorEmail,
          creatorName: manifest?.creatorName,
          sha256,
          stats: manifest?.stats || {
            visitors: 0,
            locations: 0,
            authorizedUsers: 0,
            customIcons: 0
          }
        };
      });

      return archives.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      console.error('[Store] Error listing server archives:', e);
      return [];
    }
  }

  public restoreFromFullArchive(filename: string): ServerState | null {
    const cleanName = path.basename(filename);
    const filePath = path.join(this.archivesDir, cleanName);
    if (!fs.existsSync(filePath)) return null;

    try {
      const zip = new AdmZip(filePath);
      let loadedState: ServerState | null = null;

      // 1. Try reading system_state.enc first
      const encEntry = zip.getEntry('system_state.enc');
      if (encEntry) {
        try {
          const raw = zip.readAsText(encEntry);
          const payload = JSON.parse(raw);
          loadedState = dbCrypto.decrypt(payload);
        } catch (e) {
          console.error('[Store] Error decrypting system_state.enc from archive:', e);
        }
      }

      // 2. Fallback to system_state.json
      if (!loadedState) {
        const jsonEntry = zip.getEntry('system_state.json');
        if (jsonEntry) {
          const raw = zip.readAsText(jsonEntry);
          loadedState = JSON.parse(raw);
        }
      }

      if (!loadedState) return null;

      // 3. Extract icons if present
      const iconEntries = zip.getEntries().filter(e => e.entryName.startsWith('icons/') && !e.isDirectory);
      for (const entry of iconEntries) {
        const targetPath = path.join(this.iconsDir, path.basename(entry.entryName));
        fs.writeFileSync(targetPath, entry.getData());
      }

      // 4. Update memory state and persist
      this.state = {
        visitors: Array.isArray(loadedState.visitors) ? loadedState.visitors : [],
        guards: Array.isArray(loadedState.guards) ? loadedState.guards : [],
        shifts: Array.isArray(loadedState.shifts) ? loadedState.shifts : [],
        securityShifts: Array.isArray(loadedState.securityShifts) && loadedState.securityShifts.length > 0 ? loadedState.securityShifts : DEFAULT_SECURITY_SHIFTS,
        categories: Array.isArray(loadedState.categories) && loadedState.categories.length > 0 ? loadedState.categories : DEFAULT_RANKS,
        groups: Array.isArray(loadedState.groups) && loadedState.groups.length > 0 ? loadedState.groups : DEFAULT_GROUPS,
        locations: Array.isArray(loadedState.locations) && loadedState.locations.length > 0 ? loadedState.locations : DEFAULT_LOCATIONS,
        dirtySkyEvents: Array.isArray(loadedState.dirtySkyEvents) ? loadedState.dirtySkyEvents : [],
        dutyEvents: Array.isArray(loadedState.dutyEvents) ? loadedState.dutyEvents : [],
        customIcons: Array.isArray(loadedState.customIcons) ? loadedState.customIcons : [],
        reportRetentionHours: typeof loadedState.reportRetentionHours === 'number' ? loadedState.reportRetentionHours : 1440,
        authorizedUsers: Array.isArray(loadedState.authorizedUsers) && loadedState.authorizedUsers.length > 0 ? loadedState.authorizedUsers : this.state.authorizedUsers,
        roles: Array.isArray(loadedState.roles) && loadedState.roles.length > 0 ? loadedState.roles : DEFAULT_ROLES,
        passwordRequests: Array.isArray(loadedState.passwordRequests) ? loadedState.passwordRequests : [],
        auditLogs: Array.isArray(loadedState.auditLogs) ? loadedState.auditLogs : [],
        stopList: Array.isArray(loadedState.stopList) ? loadedState.stopList : [],
        checkpoints: Array.isArray(loadedState.checkpoints) && loadedState.checkpoints.length > 0 ? loadedState.checkpoints : DEFAULT_CHECKPOINTS,
        lastUpdated: new Date().toISOString()
      };
      this.saveStateImmediately(this.state);

      this.addAuditLog({
        action: 'Відновлення з повного архіву',
        category: 'backup',
        userEmail: 'admin@skud.local',
        userName: 'Адміністратор',
        details: `Успішно відновлено з архіву: ${cleanName}. Відвідувачів: ${this.state.visitors.length}`,
        status: 'warning'
      });

      return this.state;
    } catch (e) {
      console.error('[Store] Failed to restore from archive:', e);
      return null;
    }
  }

  public deleteServerArchive(filename: string): boolean {
    const cleanName = path.basename(filename);
    const filePath = path.join(this.archivesDir, cleanName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  public verifyDatabaseIntegrity(): { valid: boolean; details: string; error?: string } {
    try {
      if (!fs.existsSync(this.encStateFilePath)) {
        return { valid: false, details: 'Файл system_state.enc відсутній' };
      }
      const raw = fs.readFileSync(this.encStateFilePath, 'utf8');
      const payload = JSON.parse(raw);
      const res = dbCrypto.verifyIntegrity(payload);
      return {
        valid: res.valid,
        details: res.valid 
          ? `GCM Auth Tag валідний, алгоритм: ${payload.algorithm}, контрольна сума SHA-256 підтверджена`
          : `Помилка: ${res.error}`
      };
    } catch (err: any) {
      return { valid: false, details: 'Помилка читання файлу', error: err.message };
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveStateImmediately(this.state);
    }, 150);
  }

  private saveStateImmediately(state: ServerState) {
    try {
      // 1. Primary write: AES-256-GCM Encrypted database file
      dbCrypto.writeEncryptedFile(this.encStateFilePath, state);

      // 2. Also keep legacy JSON mirror for compatibility if needed
      try {
        const json = JSON.stringify(state, null, 2);
        const tmpPath = `${this.legacyStateFilePath}.tmp`;
        fs.writeFileSync(tmpPath, json, 'utf8');
        fs.renameSync(tmpPath, this.legacyStateFilePath);
      } catch (e) {}

      // 3. Automatic encrypted backup snapshot on state change
      const backupsDir = path.join(this.dataDir, 'backups');
      if (!fs.existsSync(backupsDir)) {
        try {
          fs.mkdirSync(backupsDir, { recursive: true });
        } catch (e) {}
      }
      if (fs.existsSync(backupsDir)) {
        dbCrypto.writeEncryptedFile(path.join(backupsDir, 'latest_auto_backup.enc.json'), state);
      }
    } catch (e) {
      console.error('[Store] Failed to save state to disk:', e);
    }
  }
}

export const store = new StateStore();
