export type Category = string;

export interface Group {
  id: string;
  name: string;
  color: string;
  showInVisitors?: boolean; // Controls whether this group is displayed in the "Відвідувачі" tab
}

export interface Location {
  id: string;
  name: string;
  iconId?: string;
}

export interface TimeLog {
  in?: string; // ISO string
  out?: string; // ISO string
}

export interface Visitor {
  id: string;
  name: string;
  callsign?: string;
  category: Category;
  groupId: string;
  group: string; // Legacy string for groups
  locationId?: string;
  location?: string;
  status: 'in' | 'out';
  lastEntry?: string; // ISO string
  totalTimeMinutes: number;
  logs?: TimeLog[];
  color?: string;
  isSpecial?: boolean;
  customIconId?: string;
}

export interface CustomIcon {
  id: string;
  name: string;
  data: string; // base64
}

export interface SecurityShift {
  id: string;
  name: string;
  visitorIds: string[];
  status?: 'active' | 'inactive';
}

export interface Guard {
  id: string;
  name: string;
}

export interface RestPeriod {
  start: string; // ISO string
  end?: string;
}

export interface Shift {
  id: string;
  guardId: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  restPeriods: RestPeriod[];
}

export interface DirtySkyEvent {
  id: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
}

export interface DutyEvent {
  id: string;
  shiftId: string;
  shiftName: string;
  type: 'start' | 'end';
  timestamp: string; // ISO string
}

export type PermissionKey =
  // Dashboard
  | 'dashboard.view'
  | 'dashboard.actions'
  // Visitors
  | 'visitors.view'
  | 'visitors.check_in_out'
  | 'visitors.create'
  | 'visitors.edit'
  | 'visitors.delete'
  // Security
  | 'security.view'
  | 'security.manage_shifts'
  | 'security.dirty_sky'
  | 'security.manage_guards'
  // Reports
  | 'reports.view'
  | 'reports.export'
  | 'reports.print'
  | 'reports.clean'
  // Roles & Access Control
  | 'roles.view'
  | 'roles.manage_users'
  | 'roles.manage_permissions'
  // Settings
  | 'settings.view'
  | 'settings.manage_dictionaries'
  | 'settings.backup'
  | 'settings.appearance';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  category: 'dashboard' | 'visitors' | 'security' | 'reports' | 'roles' | 'settings';
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  color: string;
  isSystem?: boolean;
  permissions: PermissionKey[];
}

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  addedAt: string;
  notes?: string;
  avatarColor?: string;
  avatarUrl?: string; // Custom uploaded avatar icon/photo saved on server
  customIconId?: string;
  password?: string;
  theme?: 'light' | 'dark';
  fontSize?: 'small' | 'medium' | 'large';
}

export interface ServerArchive {
  filename: string;
  timestamp: string;
  size: number;
  stats?: {
    visitors: number;
    guards: number;
    shifts: number;
    locations: number;
    groups: number;
    customIcons: number;
    authorizedUsers: number;
    roles: number;
    auditLogs?: number;
  };
  sha256?: string;
  manifest?: any;
}

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

export interface EncryptionStatus {
  enabled: boolean;
  algorithm: string;
  keyFingerprint: string;
  kdf: string;
  mode: string;
  keyLength: number;
  ivLength: number;
  hasMasterKey: boolean;
  lastCheck: string;
  integrityVerified?: boolean;
}

