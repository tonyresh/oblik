import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AuthorizedUser, PermissionKey, UserRole, PasswordResetRequest } from '../types';
import { DEFAULT_ROLES, ALL_PERMISSIONS } from '../data/permissions';
import initialAuthorizedUsers from '../data/authorized_users.json';
import { realtimeSync } from '../services/realtimeSync';

const USERS_STORAGE_KEY = 'checkpoint_authorized_users';
const ROLES_STORAGE_KEY = 'checkpoint_roles';
const CURRENT_USER_STORAGE_KEY = 'checkpoint_current_user';

interface LoginResult {
  success: boolean;
  message: string;
  user?: AuthorizedUser;
}

interface OperationResult {
  success: boolean;
  message: string;
}

interface AuthContextType {
  authorizedUsers: AuthorizedUser[];
  roles: UserRole[];
  currentUser: AuthorizedUser | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  superadminEmails: string[];
  passwordRequests: PasswordResetRequest[];
  
  // Auth operations
  login: (email: string, password?: string) => LoginResult;
  logout: () => void;
  hasPermission: (permission: PermissionKey) => boolean;
  canAccessRoute: (route: string) => boolean;

  // Authorized Users (Email list) management
  addAuthorizedUser: (data: { email: string; name: string; roleId: string; notes?: string; password?: string }) => OperationResult;
  updateAuthorizedUser: (id: string, updates: Partial<AuthorizedUser>) => OperationResult;
  resetUserPassword: (id: string) => OperationResult;
  requestNewPassword: (data: { userId: string; userEmail?: string; userName?: string; notes?: string }) => Promise<{
    success: boolean;
    message: string;
    mailtoUrl?: string;
    superadminEmails?: string[];
  }>;
  resolvePasswordRequest: (requestId: string) => Promise<boolean>;
  deleteAuthorizedUser: (id: string) => OperationResult;
  importUsersFromJson: (jsonStr: string) => { success: boolean; count: number; message: string };
  exportUsersToJsonFile: () => void;
  resetUsersToDefaultFile: () => void;

  // Roles & permissions editor
  addRole: (data: { name: string; description: string; color: string; permissions: PermissionKey[] }) => OperationResult;
  updateRole: (id: string, updates: Partial<UserRole>) => OperationResult;
  updateRolePermissions: (roleId: string, permissions: PermissionKey[]) => OperationResult;
  deleteRole: (id: string) => OperationResult;
  resetRolesToDefault: () => void;
  exportRolesToJsonFile: () => void;
  importRolesFromJson: (jsonStr: string) => { success: boolean; count: number; message: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 1. Authorized users list
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: any) => ({
            ...u,
            password: u.password || 'admin'
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load authorized users from localStorage', e);
    }
    return (initialAuthorizedUsers as AuthorizedUser[]).map(u => ({
      ...u,
      password: u.password || 'admin'
    }));
  });

  // 2. Roles and permissions
  const [roles, setRoles] = useState<UserRole[]>(() => {
    try {
      const saved = localStorage.getItem(ROLES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r: UserRole) => {
            if (r.id === 'admin') {
              return { ...r, permissions: [...ALL_PERMISSIONS] };
            }
            if (r.permissions && r.permissions.includes('dashboard.actions') && !r.permissions.includes('visitors.check_in_out')) {
              return { ...r, permissions: [...r.permissions, 'visitors.check_in_out'] };
            }
            return r;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load roles from localStorage', e);
    }
    return DEFAULT_ROLES;
  });

  // 3. Current active user
  const [currentUser, setCurrentUser] = useState<AuthorizedUser | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load active user from localStorage', e);
    }
    return null;
  });

  const isRemoteAuthUpdateRef = useRef<Record<string, boolean>>({});
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>([]);

  // Superadmin emails list
  const superadminEmails = useMemo(() => {
    const admins = authorizedUsers.filter(u => u.roleId === 'admin').map(u => u.email);
    return admins.length > 0 ? Array.from(new Set(admins)) : ['tonyreshua@gmail.com'];
  }, [authorizedUsers]);

  // Fetch initial password requests
  useEffect(() => {
    fetch('/api/auth/password-requests')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.requests)) {
          setPasswordRequests(d.requests);
        }
      })
      .catch(() => {});
  }, []);

  // Sync authorized users and roles from server in real-time
  useEffect(() => {
    if (currentUser?.email) {
      realtimeSync.setUserEmail(currentUser.email);
    }

    const unsubInit = realtimeSync.onInit((serverState) => {
      if (!serverState) return;
      if (Array.isArray(serverState.authorizedUsers) && serverState.authorizedUsers.length > 0) {
        isRemoteAuthUpdateRef.current.authorizedUsers = true;
        setAuthorizedUsers(serverState.authorizedUsers);
      }
      if (Array.isArray(serverState.roles) && serverState.roles.length > 0) {
        isRemoteAuthUpdateRef.current.roles = true;
        setRoles(serverState.roles);
      }
    });

    const unsubUpdate = realtimeSync.onUpdate((key, data, updatedBy) => {
      if (updatedBy === realtimeSync.getClientId()) return;
      if (key === 'authorizedUsers' && Array.isArray(data)) {
        isRemoteAuthUpdateRef.current.authorizedUsers = true;
        setAuthorizedUsers(data);
      }
      if (key === 'roles' && Array.isArray(data)) {
        isRemoteAuthUpdateRef.current.roles = true;
        setRoles(data);
      }
    });

    return () => {
      unsubInit();
      unsubUpdate();
    };
  }, [currentUser?.email]);

  // Save authorized users to localStorage on change and broadcast to server
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(authorizedUsers));
    } catch (e) {
      console.error('Failed to save authorized users to localStorage', e);
    }

    if (isRemoteAuthUpdateRef.current.authorizedUsers) {
      isRemoteAuthUpdateRef.current.authorizedUsers = false;
      return;
    }
    realtimeSync.sendUpdate('authorizedUsers', authorizedUsers);
  }, [authorizedUsers]);

  // Save roles to localStorage on change and broadcast to server
  useEffect(() => {
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    } catch (e) {
      console.error('Failed to save roles to localStorage', e);
    }

    if (isRemoteAuthUpdateRef.current.roles) {
      isRemoteAuthUpdateRef.current.roles = false;
      return;
    }
    realtimeSync.sendUpdate('roles', roles);
  }, [roles]);

  // Keep current user in sync if authorized users change
  useEffect(() => {
    if (currentUser) {
      const existing = authorizedUsers.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
      if (existing) {
        if (existing.roleId !== currentUser.roleId || existing.name !== currentUser.name || existing.email !== currentUser.email) {
          setCurrentUser(existing);
          localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(existing));
        }
      } else {
        // User was removed from authorized list while logged in
        setCurrentUser(null);
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
    }
  }, [authorizedUsers]);

  // Derive current role
  const currentRole = useMemo(() => {
    if (!currentUser) return null;
    return roles.find(r => r.id === currentUser.roleId) || null;
  }, [currentUser, roles]);

  const isAuthenticated = !!currentUser;

  // Login handler
  const login = useCallback((inputEmail: string, inputPassword?: string): LoginResult => {
    const emailNormalized = inputEmail.trim().toLowerCase();
    if (!emailNormalized) {
      return { success: false, message: 'Будь ласка, введіть адресу електронної пошти.' };
    }

    const matchedUser = authorizedUsers.find(
      u => u.email.trim().toLowerCase() === emailNormalized
    );

    if (!matchedUser) {
      return {
        success: false,
        message: `Доступ заборонено: адреса "${emailNormalized}" відсутня у списку дозволених користувачів.`
      };
    }

    // Password validation (default: 'admin')
    const expectedPassword = matchedUser.password?.trim() || 'admin';
    const providedPassword = (inputPassword || '').trim();

    if (!providedPassword) {
      return {
        success: false,
        message: 'Будь ласка, введіть пароль для входу.'
      };
    }

    if (providedPassword !== expectedPassword) {
      return {
        success: false,
        message: 'Невірний пароль! Перевірте правильність введеного пароля.'
      };
    }

    setCurrentUser(matchedUser);
    realtimeSync.setUserEmail(matchedUser.email);
    try {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(matchedUser));
    } catch (e) {
      console.error('Failed to save session', e);
    }

    const userRole = roles.find(r => r.id === matchedUser.roleId);
    return {
      success: true,
      message: `Вхід виконано: ${matchedUser.name} (${userRole?.name || 'Користувач'})`,
      user: matchedUser
    };
  }, [authorizedUsers, roles]);

  // Logout handler
  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove session', e);
    }
  }, []);

  // Permission checker
  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    if (!currentUser || !currentRole) return false;
    // Superadmin has all permissions
    if (currentRole.id === 'admin') return true;
    return currentRole.permissions.includes(permission);
  }, [currentUser, currentRole]);

  // Route checker
  const canAccessRoute = useCallback((route: string): boolean => {
    if (!currentUser) return false;
    // 1) Вкладка Доступ повинна відображатись лише у користувачів з правами Суперадмін
    if (route === '/roles') {
      return currentRole?.id === 'admin';
    }
    if (currentRole?.id === 'admin') return true;

    switch (route) {
      case '/':
        return hasPermission('dashboard.view');
      case '/visitors':
        return hasPermission('visitors.view');
      case '/security':
        return hasPermission('security.view');
      case '/reports':
        // 2) Вкладка Звіти лише у тих користувачів у яких є доступ до них
        return hasPermission('reports.view');
      case '/settings':
        return hasPermission('settings.view');
      default:
        return true;
    }
  }, [currentUser, currentRole, hasPermission]);

  // Add authorized user
  const addAuthorizedUser = useCallback((data: { email: string; name: string; roleId: string; notes?: string; password?: string }): OperationResult => {
    const emailNormalized = data.email.trim().toLowerCase();
    if (!emailNormalized || !emailNormalized.includes('@')) {
      return { success: false, message: 'Вкажіть коректний формат електронної пошти.' };
    }

    const exists = authorizedUsers.some(u => u.email.trim().toLowerCase() === emailNormalized);
    if (exists) {
      return { success: false, message: `Користувач з email "${emailNormalized}" вже є у списку!` };
    }

    const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newUser: AuthorizedUser = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      email: emailNormalized,
      name: data.name.trim() || emailNormalized.split('@')[0],
      roleId: data.roleId,
      addedAt: new Date().toISOString(),
      notes: data.notes?.trim() || '',
      avatarColor: randomColor,
      password: data.password?.trim() || 'admin'
    };

    setAuthorizedUsers(prev => [newUser, ...prev]);
    return { success: true, message: `Користувача "${newUser.name}" (${newUser.email}) успішно додано до списку!` };
  }, [authorizedUsers]);

  // Update authorized user
  const updateAuthorizedUser = useCallback((id: string, updates: Partial<AuthorizedUser>): OperationResult => {
    if (updates.email) {
      const emailNormalized = updates.email.trim().toLowerCase();
      const duplicate = authorizedUsers.some(u => u.id !== id && u.email.trim().toLowerCase() === emailNormalized);
      if (duplicate) {
        return { success: false, message: `Користувач з email "${emailNormalized}" вже існує!` };
      }
      updates.email = emailNormalized;
    }

    setAuthorizedUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    return { success: true, message: 'Дані користувача оновлено.' };
  }, [authorizedUsers]);

  // Reset user password to default 'admin'
  const resetUserPassword = useCallback((id: string): OperationResult => {
    const target = authorizedUsers.find(u => u.id === id);
    if (!target) return { success: false, message: 'Користувача не знайдено.' };

    setAuthorizedUsers(prev => prev.map(u => (u.id === id ? { ...u, password: 'admin' } : u)));
    return { success: true, message: `Пароль для "${target.name}" (${target.email}) успішно скинуто на стандартний ("admin").` };
  }, [authorizedUsers]);

  // Request new password (Sends email notification to Superadministrator)
  const requestNewPassword = useCallback(async (data: { userId: string; userEmail?: string; userName?: string; notes?: string }) => {
    try {
      const targetUser = authorizedUsers.find(u => u.id === data.userId || (data.userEmail && u.email.toLowerCase() === data.userEmail.toLowerCase()));
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser?.id || data.userId,
          userEmail: targetUser?.email || data.userEmail,
          userName: targetUser?.name || data.userName,
          requestedByEmail: currentUser?.email,
          notes: data.notes
        })
      });
      const json = await res.json();
      if (json.success) {
        if (json.request) {
          setPasswordRequests(prev => [json.request, ...prev.filter(r => r.id !== json.request.id)]);
        }
        return {
          success: true,
          message: json.message || `Лист із запитом нового пароля успішно надіслано на пошту Суперадміністратора (${json.superadminEmails?.join(', ') || 'admin'})`,
          mailtoUrl: json.mailtoUrl,
          superadminEmails: json.superadminEmails
        };
      } else {
        return {
          success: false,
          message: json.error || 'Помилка надсилання запиту на сервер'
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: e.message || 'Помилка мережі при відправці запиту'
      };
    }
  }, [authorizedUsers, currentUser]);

  // Resolve password reset request
  const resolvePasswordRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/resolve-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      const json = await res.json();
      if (json.success) {
        setPasswordRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'resolved' } : r));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Delete authorized user
  const deleteAuthorizedUser = useCallback((id: string): OperationResult => {
    const target = authorizedUsers.find(u => u.id === id);
    if (!target) return { success: false, message: 'Користувача не знайдено.' };

    if (authorizedUsers.length <= 1) {
      return { success: false, message: 'Неможливо видалити останнього користувача зі списку!' };
    }

    // Prevent deleting oneself if only 1 admin left
    const adminCount = authorizedUsers.filter(u => u.roleId === 'admin').length;
    if (target.roleId === 'admin' && adminCount <= 1) {
      return { success: false, message: 'Неможливо видалити єдиного адміністратора системи!' };
    }

    setAuthorizedUsers(prev => prev.filter(u => u.id !== id));
    return { success: true, message: `Користувача "${target.email}" видалено зі списку дозволених.` };
  }, [authorizedUsers]);

  // Export authorized users to JSON file
  const exportUsersToJsonFile = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(authorizedUsers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `authorized_users_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [authorizedUsers]);

  // Import authorized users from JSON string
  const importUsersFromJson = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        return { success: false, count: 0, message: 'Файл повинен містити масив користувачів.' };
      }

      const validList: AuthorizedUser[] = [];
      const existingEmails = new Set(authorizedUsers.map(u => u.email.toLowerCase()));
      let added = 0;

      for (const item of parsed) {
        if (item && typeof item.email === 'string' && item.email.includes('@')) {
          const email = item.email.trim().toLowerCase();
          if (!existingEmails.has(email)) {
            existingEmails.add(email);
            validList.push({
              id: item.id || 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              email,
              name: item.name || email.split('@')[0],
              roleId: item.roleId && roles.some(r => r.id === item.roleId) ? item.roleId : 'manager',
              addedAt: item.addedAt || new Date().toISOString(),
              notes: item.notes || '',
              avatarColor: item.avatarColor || '#3b82f6',
              password: item.password?.trim() || 'admin'
            });
            added++;
          }
        }
      }

      if (validList.length === 0) {
        return { success: false, count: 0, message: 'Нових унікальних користувачів не знайдено або некоректний формат.' };
      }

      setAuthorizedUsers(prev => [...validList, ...prev]);
      return { success: true, count: added, message: `Успішно імпортовано ${added} користувачів до списку!` };
    } catch (e: any) {
      return { success: false, count: 0, message: `Помилка читання JSON файлу: ${e.message || 'Некоректний синтаксис'}` };
    }
  }, [authorizedUsers, roles]);

  // Reset authorized users to initial bundled JSON
  const resetUsersToDefaultFile = useCallback(() => {
    setAuthorizedUsers((initialAuthorizedUsers as AuthorizedUser[]).map(u => ({
      ...u,
      password: u.password || 'admin'
    })));
  }, []);

  // Add new role
  const addRole = useCallback((data: { name: string; description: string; color: string; permissions: PermissionKey[] }): OperationResult => {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Вкажіть назву ролі.' };
    }

    if (roles.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, message: `Роль з назвою "${trimmedName}" вже існує!` };
    }

    const newRole: UserRole = {
      id: 'role-' + Date.now().toString(36),
      name: trimmedName,
      description: data.description.trim(),
      color: data.color || '#6366f1',
      isSystem: false,
      permissions: data.permissions
    };

    setRoles(prev => [...prev, newRole]);
    return { success: true, message: `Роль "${newRole.name}" успішно створено.` };
  }, [roles]);

  // Update role info
  const updateRole = useCallback((id: string, updates: Partial<UserRole>): OperationResult => {
    if (updates.name) {
      const trimmed = updates.name.trim();
      if (roles.some(r => r.id !== id && r.name.toLowerCase() === trimmed.toLowerCase())) {
        return { success: false, message: `Роль з назвою "${trimmed}" вже існує!` };
      }
      updates.name = trimmed;
    }

    setRoles(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
    return { success: true, message: 'Параметри ролі збережено.' };
  }, [roles]);

  // Update permissions for a role
  const updateRolePermissions = useCallback((roleId: string, permissions: PermissionKey[]): OperationResult => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        // Admin role always keeps all permissions
        if (r.id === 'admin') {
          return { ...r, permissions: [...ALL_PERMISSIONS] };
        }
        return { ...r, permissions };
      }
      return r;
    }));
    return { success: true, message: 'Права доступу для ролі успішно оновлено.' };
  }, []);

  // Delete custom role
  const deleteRole = useCallback((id: string): OperationResult => {
    const target = roles.find(r => r.id === id);
    if (!target) return { success: false, message: 'Роль не знайдено.' };
    if (target.isSystem || target.id === 'admin') {
      return { success: false, message: 'Неможливо видалити системну роль!' };
    }

    // Check if any users have this role
    const assignedUsers = authorizedUsers.filter(u => u.roleId === id);
    if (assignedUsers.length > 0) {
      return {
        success: false,
        message: `Неможливо видалити роль: вона призначена ${assignedUsers.length} користувачам. Спочатку змініть їх роль.`
      };
    }

    setRoles(prev => prev.filter(r => r.id !== id));
    return { success: true, message: `Роль "${target.name}" видалено.` };
  }, [roles, authorizedUsers]);

  // Reset roles to defaults
  const resetRolesToDefault = useCallback(() => {
    setRoles(DEFAULT_ROLES);
  }, []);

  // Export roles to JSON
  const exportRolesToJsonFile = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(roles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `roles_config_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [roles]);

  // Import roles from JSON
  const importRolesFromJson = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        return { success: false, count: 0, message: 'Некоректний формат файлу конфігурації ролей.' };
      }

      setRoles(parsed);
      return { success: true, count: parsed.length, message: `Завантажено ${parsed.length} ролей з файлу.` };
    } catch (e: any) {
      return { success: false, count: 0, message: `Помилка імпорту ролей: ${e.message || 'Некоректний JSON'}` };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authorizedUsers,
        roles,
        currentUser,
        currentRole,
        isAuthenticated,
        superadminEmails,
        passwordRequests,
        login,
        logout,
        hasPermission,
        canAccessRoute,
        addAuthorizedUser,
        updateAuthorizedUser,
        resetUserPassword,
        requestNewPassword,
        resolvePasswordRequest,
        deleteAuthorizedUser,
        importUsersFromJson,
        exportUsersToJsonFile,
        resetUsersToDefaultFile,
        addRole,
        updateRole,
        updateRolePermissions,
        deleteRole,
        resetRolesToDefault,
        exportRolesToJsonFile,
        importRolesFromJson,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
