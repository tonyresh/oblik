import fs from 'fs';
import path from 'path';
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
    description: 'Оперативний контроль КПП: швидкі дії, графік змін, режим «Брудне небо» та друк звітів',
    color: '#ef4444',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.actions',
      'visitors.view', 'visitors.create',
      'security.view', 'security.manage_shifts', 'security.dirty_sky', 'security.manage_guards',
      'reports.view', 'reports.export', 'reports.print',
      'settings.view'
    ]
  },
  {
    id: 'manager',
    name: 'Оператор КПП',
    description: 'Базова робота на КПП: відмітка входу/виходу, створення та редагування карток відвідувачів',
    color: '#10b981',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.actions',
      'visitors.view', 'visitors.create', 'visitors.edit',
      'security.view', 'security.dirty_sky',
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
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.encStateFilePath = path.join(this.dataDir, 'system_state.enc');
    this.legacyStateFilePath = path.join(this.dataDir, 'system_state.json');

    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
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

  public updateKey<K extends keyof ServerState>(key: K, value: ServerState[K]): ServerState {
    this.state[key] = value;
    this.state.lastUpdated = new Date().toISOString();
    this.scheduleSave();
    return this.state;
  }

  public patch(partial: Partial<ServerState>): ServerState {
    Object.assign(this.state, partial);
    this.state.lastUpdated = new Date().toISOString();
    this.scheduleSave();
    return this.state;
  }

  public seedIfEmpty(clientData: Partial<ServerState>): boolean {
    let seeded = false;

    if (this.state.visitors.length === 0 && Array.isArray(clientData.visitors) && clientData.visitors.length > 0) {
      this.state.visitors = clientData.visitors;
      seeded = true;
    }

    if (this.state.customIcons.length === 0 && Array.isArray(clientData.customIcons) && clientData.customIcons.length > 0) {
      this.state.customIcons = clientData.customIcons;
      seeded = true;
    }

    if (this.state.dutyEvents.length === 0 && Array.isArray(clientData.dutyEvents) && clientData.dutyEvents.length > 0) {
      this.state.dutyEvents = clientData.dutyEvents;
      seeded = true;
    }

    if (this.state.dirtySkyEvents.length === 0 && Array.isArray(clientData.dirtySkyEvents) && clientData.dirtySkyEvents.length > 0) {
      this.state.dirtySkyEvents = clientData.dirtySkyEvents;
      seeded = true;
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
      Object.assign(this.state, payload);
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
