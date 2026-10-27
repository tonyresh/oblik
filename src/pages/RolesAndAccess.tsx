import React, { useState, useRef } from 'react';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { SYSTEM_PERMISSIONS, PERMISSION_CATEGORY_NAMES, ALL_PERMISSIONS } from '../data/permissions';
import { PermissionKey, UserRole, AuthorizedUser } from '../types';
import {
  ShieldCheck,
  Users,
  KeyRound,
  FileCode,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  RotateCcw,
  ShieldAlert,
  Shield,
  Eye,
  EyeOff,
  Key,
  CheckCircle2,
  Info,
  Sliders,
  FileText,
  UserPlus,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  Copy,
  Mail,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import VoiceSearchInput from '../components/VoiceSearchInput';

type MainSection = 'users' | 'roles' | 'matrix';

export default function RolesAndAccess() {
  const {
    authorizedUsers,
    roles,
    currentUser,
    currentRole,
    hasPermission,
    addAuthorizedUser,
    updateAuthorizedUser,
    resetUserPassword,
    requestNewPassword,
    resolvePasswordRequest,
    passwordRequests,
    superadminEmails,
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
    importRolesFromJson
  } = useAuth();
  const { showToast } = useToast();

  const [activeSection, setActiveSection] = useState<MainSection>('users');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // User management state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRoleId, setNewRoleId] = useState(roles[0]?.id || 'manager');
  const [newNotes, setNewNotes] = useState('');
  const [newPassword, setNewPassword] = useState('admin');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // User editing state
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRoleId, setEditUserRoleId] = useState('');
  const [editUserNotes, setEditUserNotes] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Password visibility & copy states for user table
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);

  // Password request to Superadmin state
  const [passwordRequestTargetUser, setPasswordRequestTargetUser] = useState<AuthorizedUser | null>(null);
  const [passwordRequestNotes, setPasswordRequestNotes] = useState('');
  const [isSendingPasswordRequest, setIsSendingPasswordRequest] = useState(false);

  // Role management state
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'admin');
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3b82f6');

  // JSON Raw Editor Modal
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonContent, setJsonContent] = useState('');

  // Confirmation Modals (replacing window.confirm)
  const [userToDelete, setUserToDelete] = useState<AuthorizedUser | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<UserRole | null>(null);
  const [resetConfirmType, setResetConfirmType] = useState<'users' | 'roles' | null>(null);

  const usersFileRef = useRef<HTMLInputElement>(null);
  const rolesFileRef = useRef<HTMLInputElement>(null);

  // Check if current user has permission to manage users / permissions
  const canManageUsers = hasPermission('roles.manage_users') || currentRole?.id === 'admin';
  const canManagePermissions = hasPermission('roles.manage_permissions') || currentRole?.id === 'admin';

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  // Filtered users
  const filteredUsers = authorizedUsers.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.notes && user.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = selectedRoleFilter === 'all' || user.roleId === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Handlers for Users
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) {
      showToast('У вас немає прав для додавання користувачів', 'error');
      return;
    }

    const res = addAuthorizedUser({
      email: newEmail,
      name: newName,
      roleId: newRoleId,
      notes: newNotes,
      password: newPassword.trim() || 'admin'
    });

    if (res.success) {
      showToast(res.message, 'success');
      setShowAddUserModal(false);
      setNewEmail('');
      setNewName('');
      setNewNotes('');
      setNewPassword('admin');
      setShowNewPassword(false);
    } else {
      showToast(res.message, 'error');
    }
  };

  const startEditUser = (user: AuthorizedUser) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserRoleId(user.roleId);
    setEditUserNotes(user.notes || '');
    setEditUserPassword(user.password || 'admin');
    setShowEditPassword(false);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!canManageUsers) {
      showToast('У вас немає прав для редагування користувачів', 'error');
      return;
    }

    const res = updateAuthorizedUser(editingUser.id, {
      name: editUserName,
      email: editUserEmail,
      roleId: editUserRoleId,
      notes: editUserNotes,
      password: editUserPassword.trim() || 'admin'
    });

    if (res.success) {
      showToast(res.message, 'success');
      // If user had pending password requests, resolve them
      const pendingForUser = passwordRequests.find(r => 
        (r.userId === editingUser.id || r.userEmail.toLowerCase() === editingUser.email.toLowerCase()) && 
        r.status === 'pending'
      );
      if (pendingForUser) {
        resolvePasswordRequest(pendingForUser.id);
      }
      setEditingUser(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleOpenPasswordRequestModal = (user: AuthorizedUser) => {
    setPasswordRequestTargetUser(user);
    setPasswordRequestNotes('');
  };

  const handleConfirmPasswordRequest = async () => {
    if (!passwordRequestTargetUser) return;
    setIsSendingPasswordRequest(true);
    try {
      const res = await requestNewPassword({
        userId: passwordRequestTargetUser.id,
        userEmail: passwordRequestTargetUser.email,
        userName: passwordRequestTargetUser.name,
        notes: passwordRequestNotes
      });

      if (res.success) {
        showToast(res.message, 'success');
        setPasswordRequestTargetUser(null);
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsSendingPasswordRequest(false);
    }
  };

  const handleCopyPassword = (userId: string, pwd: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pwd);
    }
    setCopiedPasswordId(userId);
    showToast('Пароль скопійовано в буфер обміну', 'info');
    setTimeout(() => setCopiedPasswordId(null), 2000);
  };

  const handleToggleRevealPassword = (userId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleDeleteUser = (user: AuthorizedUser) => {
    if (!canManageUsers) {
      showToast('У вас немає прав для видалення користувачів', 'error');
      return;
    }
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    const res = deleteAuthorizedUser(userToDelete.id);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    setUserToDelete(null);
  };

  const handleCopyEmail = (email: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(email);
    }
    setCopiedEmail(email);
    showToast(`Email ${email} скопійовано`, 'info');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleUsersFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importUsersFromJson(content);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    };
    reader.readAsText(file);
    if (usersFileRef.current) usersFileRef.current.value = '';
  };

  // Open Raw JSON modal for users
  const openJsonEditor = () => {
    setJsonContent(JSON.stringify(authorizedUsers, null, 2));
    setShowJsonModal(true);
  };

  const handleSaveRawJson = () => {
    const res = importUsersFromJson(jsonContent);
    if (res.success) {
      showToast(res.message, 'success');
      setShowJsonModal(false);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Handlers for Roles & Permissions
  const handleTogglePermission = (key: PermissionKey) => {
    if (!canManagePermissions) {
      showToast('У вас немає прав для зміни прав доступу', 'error');
      return;
    }

    if (selectedRole.id === 'admin') {
      showToast('Роль "Суперадміністратор" завжди має повні права', 'info');
      return;
    }

    const currentPerms = selectedRole.permissions;
    const nextPerms = currentPerms.includes(key)
      ? currentPerms.filter(k => k !== key)
      : [...currentPerms, key];

    updateRolePermissions(selectedRole.id, nextPerms);
  };

  const handleSetAllPermissions = (enable: boolean) => {
    if (!canManagePermissions || selectedRole.id === 'admin') return;
    updateRolePermissions(selectedRole.id, enable ? [...ALL_PERMISSIONS] : []);
    showToast(enable ? 'Увімкнено всі права для цієї ролі' : 'Всі права знято', 'info');
  };

  const handleSetReadOnlyPermissions = () => {
    if (!canManagePermissions || selectedRole.id === 'admin') return;
    const readOnlyKeys: PermissionKey[] = [
      'dashboard.view',
      'visitors.view',
      'security.view',
      'reports.view',
      'roles.view',
      'settings.view'
    ];
    updateRolePermissions(selectedRole.id, readOnlyKeys);
    showToast('Встановлено права тільки для перегляду', 'info');
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePermissions) {
      showToast('Немає прав для створення ролей', 'error');
      return;
    }

    const res = addRole({
      name: newRoleName,
      description: newRoleDescription,
      color: newRoleColor,
      permissions: ['dashboard.view', 'visitors.view', 'reports.view']
    });

    if (res.success) {
      showToast(res.message, 'success');
      setShowAddRoleModal(false);
      setNewRoleName('');
      setNewRoleDescription('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDeleteRole = (role: UserRole) => {
    if (!canManagePermissions) {
      showToast('Немає прав для видалення ролей', 'error');
      return;
    }
    setRoleToDelete(role);
  };

  const confirmDeleteRole = () => {
    if (!roleToDelete) return;
    const res = deleteRole(roleToDelete.id);
    if (res.success) {
      showToast(res.message, 'success');
      setSelectedRoleId(roles[0]?.id || 'admin');
    } else {
      showToast(res.message, 'error');
    }
    setRoleToDelete(null);
  };

  // Grouped permissions
  const categories: Array<keyof typeof PERMISSION_CATEGORY_NAMES> = [
    'dashboard',
    'visitors',
    'security',
    'reports',
    'roles',
    'settings'
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-card rounded-2xl p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              Ролі та контроль доступу
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5">
              Авторизація за списком email у файлі <span className="font-mono text-foreground font-semibold">authorized_users.json</span>
            </p>
          </div>
        </div>

        {/* Current user badge info */}
        <div className="flex items-center gap-2.5 sm:gap-3 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-secondary/50 border border-border shrink-0 self-start sm:self-auto">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0"
            style={{ backgroundColor: currentUser?.avatarColor || '#3b82f6' }}
          >
            {currentUser?.name.slice(0, 1).toUpperCase() || 'U'}
          </div>
          <div className="text-left text-xs leading-tight">
            <p className="font-bold text-foreground truncate max-w-[150px] sm:max-w-none">{currentUser?.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full inline-block"
                style={{ backgroundColor: currentRole?.color || '#3b82f6' }}
              />
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">{currentRole?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section Navigation Pills */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2.5 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveSection('users')}
          className={`h-9 sm:h-11 px-3.5 sm:px-5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSection === 'users'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
              : 'bg-card hover:bg-secondary border border-border text-muted-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Email ({authorizedUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('roles')}
          className={`h-9 sm:h-11 px-3.5 sm:px-5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSection === 'roles'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
              : 'bg-card hover:bg-secondary border border-border text-muted-foreground'
          }`}
        >
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Ролі та права ({roles.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('matrix')}
          className={`h-9 sm:h-11 px-3.5 sm:px-5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSection === 'matrix'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
              : 'bg-card hover:bg-secondary border border-border text-muted-foreground'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Матриця прав</span>
        </button>
      </div>

      {/* SECTION 1: USERS (EMAIL LIST) */}
      {activeSection === 'users' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-200">
          {/* Action Toolbar */}
          <div className="flex flex-col gap-2.5 sm:gap-3 bg-card rounded-2xl p-3 sm:p-4 shadow-xs">
            {/* Search and filter row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <VoiceSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Пошук за email або ім'ям..."
                containerClassName="flex-1"
              />

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="py-2 sm:py-2.5 px-3 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shrink-0"
              >
                <option value="all">Усі ролі ({authorizedUsers.length})</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({authorizedUsers.filter(u => u.roleId === r.id).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Actions: Add user & File Operations */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border/50">
              <button
                onClick={() => setShowAddUserModal(true)}
                disabled={!canManageUsers}
                className="w-full sm:w-auto h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-primary/20 disabled:opacity-50 active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Додати Email</span>
              </button>

              <div className="grid grid-cols-4 sm:flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={exportUsersToJsonFile}
                  className="h-9 px-2 sm:px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
                  title="Завантажити поточний список у файл authorized_users.json"
                >
                  <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Експорт</span>
                </button>

                <button
                  onClick={() => usersFileRef.current?.click()}
                  disabled={!canManageUsers}
                  className="h-9 px-2 sm:px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Завантажити список користувачів з файлу JSON"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Імпорт</span>
                </button>
                <input
                  type="file"
                  ref={usersFileRef}
                  accept=".json"
                  onChange={handleUsersFileSelect}
                  className="hidden"
                />

                <button
                  onClick={openJsonEditor}
                  className="h-9 px-2 sm:px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
                  title="Редагувати JSON файлу напряму"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>JSON</span>
                </button>

                <button
                  onClick={() => setResetConfirmType('users')}
                  disabled={!canManageUsers}
                  className="h-9 px-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground border border-border text-[11px] sm:text-xs font-semibold flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                  title="Скинути до стандартного файлу"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden ml-1">Скинути</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pending Password Requests from Users (For Superadmin & Access Managers) */}
          {passwordRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-card border border-amber-500/30 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Запити нового паролю</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-700 dark:text-amber-300">
                        {passwordRequests.filter(r => r.status === 'pending').length} очікують
                      </span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Користувачі надіслали запит на пошту Суперадміністратора ({superadminEmails.join(', ')})
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-3">
                {passwordRequests.filter(r => r.status === 'pending').map((req) => {
                  const targetUser = authorizedUsers.find(u => u.id === req.userId || u.email.toLowerCase() === req.userEmail.toLowerCase());
                  const formattedTime = new Date(req.createdAt).toLocaleString('uk-UA', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-card border border-amber-500/25 flex flex-col justify-between gap-2.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">{req.userName || targetUser?.name || 'Користувач'}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">({req.userEmail})</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Час запиту: {formattedTime}
                          </span>
                          {req.notes && (
                            <p className="text-[11px] text-muted-foreground italic mt-1 bg-muted/40 p-1.5 rounded-lg border border-border/50">
                              «{req.notes}»
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                        {targetUser && (
                          <button
                            type="button"
                            onClick={() => startEditUser(targetUser)}
                            className="flex-1 h-8 px-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Встановити пароль</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await resolvePasswordRequest(req.id);
                            if (ok) showToast('Запит позначено як вирішений', 'success');
                          }}
                          className="h-8 px-3 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Вирішено</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Users View Container */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            {/* MOBILE & TABLET CARD VIEW (< md) */}
            <div className="block md:hidden divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Користувачів не знайдено. Перевірте запит або додайте новий email.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const userRole = roles.find(r => r.id === user.roleId);
                  const isCurrent = currentUser?.id === user.id;

                  return (
                    <div
                      key={user.id}
                      className={`p-3.5 space-y-2.5 transition-colors ${
                        isCurrent ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Top Header of Card: Avatar, Name, Role badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs overflow-hidden"
                            style={{ backgroundColor: user.avatarColor || '#3b82f6' }}
                          >
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              user.name.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-foreground truncate">{user.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground font-black uppercase">
                                  Ви
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {user.addedAt ? format(new Date(user.addedAt), 'dd.MM.yyyy HH:mm') : ''}
                            </p>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <div
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-border shrink-0"
                          style={{ backgroundColor: `${userRole?.color || '#3b82f6'}15`, color: userRole?.color || '#3b82f6' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: userRole?.color || '#3b82f6' }} />
                          <span>{userRole?.name || user.roleId}</span>
                        </div>
                      </div>

                      {/* Email block with 1-tap Copy */}
                      <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-secondary/40 border border-border/50 text-xs">
                        <span className="font-mono text-foreground font-semibold truncate select-all">{user.email}</span>
                        <button
                          onClick={() => handleCopyEmail(user.email)}
                          className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-1 cursor-pointer"
                          title="Скопіювати email"
                        >
                          {copiedEmail === user.email ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Password block */}
                      <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-secondary/30 border border-border/50 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground">Пароль:</span>
                          <span className="font-mono text-foreground font-semibold truncate">
                            {revealedPasswords[user.id] ? (user.password || 'admin') : '••••••••'}
                          </span>
                          {(user.password || 'admin') === 'admin' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold shrink-0">
                              admin
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleRevealPassword(user.id)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title={revealedPasswords[user.id] ? "Сховати пароль" : "Показати пароль"}
                          >
                            {revealedPasswords[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(user.id, user.password || 'admin')}
                            className="p-1 rounded text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title="Скопіювати пароль"
                          >
                            {copiedPasswordId === user.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordRequestModal(user)}
                            className="text-[10px] text-primary hover:underline px-1.5 py-0.5 rounded cursor-pointer font-semibold flex items-center gap-1 bg-primary/10 border border-primary/25 hover:bg-primary/20 transition-colors"
                            title="Запит нового паролю — надіслати лист Суперадміністратору"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Запит нового паролю</span>
                          </button>
                        </div>
                      </div>

                      {/* Notes (if any) */}
                      {user.notes && (
                        <p className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-muted/20">
                          <span className="font-medium text-foreground/80">Примітка:</span> {user.notes}
                        </p>
                      )}

                      {/* Action buttons (Touch friendly, full width) */}
                      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                        <button
                          onClick={() => startEditUser(user)}
                          disabled={!canManageUsers}
                          className="flex-1 h-9 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold flex items-center justify-center gap-1.5 border border-border/60 transition-colors disabled:opacity-40 cursor-pointer active:scale-98"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
                          <span>Редагувати</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={!canManageUsers}
                          className="flex-1 h-9 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center gap-1.5 border border-destructive/20 transition-colors disabled:opacity-40 cursor-pointer active:scale-98"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Видалити</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DESKTOP & LARGE TABLET TABLE VIEW (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/30 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="py-3 px-4">Користувач / ПІБ</th>
                    <th className="py-3 px-4">Дозволений Email</th>
                    <th className="py-3 px-4">Призначена роль</th>
                    <th className="py-3 px-4">Пароль</th>
                    <th className="py-3 px-4">Дата внесення</th>
                    <th className="py-3 px-4">Примітка</th>
                    <th className="py-3 px-4 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                        Користувачів не знайдено. Перевірте запит або додайте новий email.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const userRole = roles.find(r => r.id === user.roleId);
                      const isCurrent = currentUser?.id === user.id;

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-secondary/20 transition-colors ${
                            isCurrent ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs overflow-hidden"
                                style={{ backgroundColor: user.avatarColor || '#3b82f6' }}
                              >
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  user.name.slice(0, 1).toUpperCase()
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-foreground flex items-center gap-1.5">
                                  {user.name}
                                  {isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground font-extrabold uppercase">
                                      Ви
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-foreground bg-secondary/50 px-2 py-1 rounded-md border border-border/50">
                                {user.email}
                              </span>
                              <button
                                onClick={() => handleCopyEmail(user.email)}
                                className="text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
                                title="Скопіювати email"
                              >
                                {copiedEmail === user.email ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-border"
                              style={{ backgroundColor: `${userRole?.color || '#3b82f6'}15`, color: userRole?.color || '#3b82f6' }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: userRole?.color || '#3b82f6' }}
                              />
                              <span>{userRole?.name || user.roleId}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-foreground bg-secondary/50 px-2 py-1 rounded-md border border-border/50">
                                {revealedPasswords[user.id] ? (user.password || 'admin') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleRevealPassword(user.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                                title={revealedPasswords[user.id] ? "Сховати пароль" : "Показати пароль"}
                              >
                                {revealedPasswords[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(user.id, user.password || 'admin')}
                                className="text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
                                title="Скопіювати пароль"
                              >
                                {copiedPasswordId === user.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPasswordRequestModal(user)}
                                className="text-[10px] text-primary hover:underline px-1.5 py-0.5 rounded cursor-pointer font-semibold flex items-center gap-1 bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                                title="Запит нового паролю — надіслати лист Суперадміністратору"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Запит нового паролю</span>
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {user.addedAt ? format(new Date(user.addedAt), 'dd.MM.yyyy HH:mm') : '—'}
                          </td>

                          <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                            {user.notes || '—'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => startEditUser(user)}
                                disabled={!canManageUsers}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-30"
                                title="Редагувати користувача"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={!canManageUsers}
                                className="p-1.5 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-30"
                                title="Видалити зі списку"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ROLES & PERMISSIONS EDITOR */}
      {activeSection === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
          {/* Left Column: Role Selector Cards */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Вибір ролі ({roles.length})
              </h2>
              {canManagePermissions && (
                <button
                  onClick={() => setShowAddRoleModal(true)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Створити роль
                </button>
              )}
            </div>

            <div className="space-y-2">
              {roles.map((role) => {
                const isSelected = role.id === selectedRole.id;
                const userCount = authorizedUsers.filter(u => u.roleId === role.id).length;

                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative text-left ${
                      isSelected
                        ? 'bg-card border-primary ring-2 ring-primary/20 shadow-md'
                        : 'bg-card/60 hover:bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="font-bold text-sm text-foreground">{role.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {role.isSystem && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-semibold">
                            Системна
                          </span>
                        )}
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {userCount} ос.
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {role.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{role.permissions.length} дозволених прав</span>
                      {!role.isSystem && canManagePermissions && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          className="text-destructive hover:underline font-semibold"
                        >
                          Видалити
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick backup / restore of roles */}
            <div className="p-3 bg-secondary/30 border border-border rounded-xl flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Конфіг ролей:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportRolesToJsonFile}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  Експорт
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={() => setResetConfirmType('roles')}
                  disabled={!canManagePermissions}
                  className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  Скинути
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Permission Editor for Selected Role */}
          <div className="lg:col-span-8 space-y-4">
            {/* Selected Role Header */}
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs"
                    style={{ backgroundColor: selectedRole.color }}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                      {selectedRole.name}
                      {selectedRole.id === 'admin' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold uppercase">
                          Повний доступ
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedRole.description}</p>
                  </div>
                </div>

                {/* Preset Actions */}
                {selectedRole.id !== 'admin' && canManagePermissions && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSetAllPermissions(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-all cursor-pointer"
                    >
                      Вибрати всі
                    </button>
                    <button
                      onClick={handleSetReadOnlyPermissions}
                      className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-all cursor-pointer"
                    >
                      Тільки перегляд
                    </button>
                    <button
                      onClick={() => handleSetAllPermissions(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-destructive text-xs font-semibold border border-border transition-all cursor-pointer"
                    >
                      Зняти всі
                    </button>
                  </div>
                )}
              </div>

              {/* Notice for admin */}
              {selectedRole.id === 'admin' && (
                <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center gap-2.5">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    Суперадміністратор володіє непорушними системними правами до всіх розділів, налаштувань та керування доступом.
                  </span>
                </div>
              )}

              {/* Grouped Permission Toggles */}
              <div className="mt-5 space-y-6">
                {categories.map((category) => {
                  const categoryInfo = PERMISSION_CATEGORY_NAMES[category];
                  const categoryPermissions = SYSTEM_PERMISSIONS.filter(p => p.category === category);

                  return (
                    <div key={category} className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-border/40">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          {categoryInfo.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {categoryPermissions.filter(p => selectedRole.permissions.includes(p.key)).length} / {categoryPermissions.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {categoryPermissions.map((perm) => {
                          const isChecked = selectedRole.id === 'admin' || selectedRole.permissions.includes(perm.key);
                          const isDisabled = selectedRole.id === 'admin' || !canManagePermissions;

                          return (
                            <div
                              key={perm.key}
                              onClick={() => !isDisabled && handleTogglePermission(perm.key)}
                              className={`p-3 rounded-xl border transition-all flex items-start gap-3 select-none ${
                                isChecked
                                  ? 'bg-primary/5 border-primary/30 text-foreground'
                                  : 'bg-card/40 border-border/70 text-muted-foreground'
                              } ${!isDisabled ? 'hover:border-primary/60 cursor-pointer' : 'cursor-default'}`}
                            >
                              <div className="mt-0.5">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                                    isChecked
                                      ? 'bg-primary text-primary-foreground'
                                      : 'border border-border bg-secondary'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold leading-tight ${isChecked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {perm.label}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                  {perm.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: PERMISSION SUMMARY MATRIX */}
      {activeSection === 'matrix' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-200">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Зведена матриця доступу за всіма ролями</h2>
              <p className="text-xs text-muted-foreground">Наочне порівняння прав доступу для кожної ролі в системі</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 sm:px-4 min-w-[200px] sm:min-w-[240px] sticky left-0 bg-secondary/95 backdrop-blur-xs z-10 border-r border-border shadow-xs">
                    Право доступу / Розділ
                  </th>
                  {roles.map(r => (
                    <th key={r.id} className="py-3 px-3 text-center min-w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-foreground">{r.name}</span>
                        <span
                          className="w-2.5 h-1 rounded-full mt-1"
                          style={{ backgroundColor: r.color }}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SYSTEM_PERMISSIONS.map((perm) => (
                  <tr key={perm.key} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 px-3 sm:px-4 sticky left-0 bg-card/95 backdrop-blur-xs z-10 border-r border-border shadow-xs">
                      <div>
                        <p className="font-bold text-foreground">{perm.label}</p>
                        <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                      </div>
                    </td>
                    {roles.map(r => {
                      const hasPerm = r.id === 'admin' || r.permissions.includes(perm.key);
                      return (
                        <td key={r.id} className="py-2.5 px-3 text-center">
                          {hasPerm ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-muted-foreground/40 font-bold">
                              <X className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92dvh] sm:max-h-[86vh] flex flex-col my-auto overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <span>Додати дозволений Email</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email адреса співробітника *
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="operator@skud.local"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  ПІБ або позивний *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Петренко Василь Іванович"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Призначена роль *
                </label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-h-[44px]"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.description.slice(0, 40)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Примітка / Пост / Підрозділ
                </label>
                <input
                  type="text"
                  placeholder="Черговий посту №2, 1 зміна"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Пароль для входу</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword('admin')}
                    className="text-[10px] text-primary hover:underline cursor-pointer font-semibold"
                  >
                    За замовчуванням: admin
                  </button>
                </div>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="admin"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  За замовчуванням встановлюється пароль <span className="font-mono font-bold text-primary">admin</span>
                </p>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-border/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl bg-secondary text-foreground text-xs font-bold uppercase hover:bg-secondary/80 cursor-pointer flex items-center justify-center"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto h-11 sm:h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 cursor-pointer shadow-md shadow-primary/20 flex items-center justify-center active:scale-98"
                >
                  Зберегти користувача
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92dvh] sm:max-h-[86vh] flex flex-col my-auto overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                <span>Редагувати користувача</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email адреса *
                </label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  ПІБ або позивний *
                </label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Роль *
                </label>
                <select
                  value={editUserRoleId}
                  onChange={(e) => setEditUserRoleId(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-h-[44px]"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Примітка
                </label>
                <input
                  type="text"
                  value={editUserNotes}
                  onChange={(e) => setEditUserNotes(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Пароль для входу</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingUser) {
                        handleOpenPasswordRequestModal(editingUser);
                      }
                    }}
                    className="text-[10px] text-primary hover:underline cursor-pointer font-semibold flex items-center gap-1"
                    title="Запит нового паролю — надіслати лист Суперадміністратору"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Запит нового паролю</span>
                  </button>
                </div>
                <div className="relative mt-1">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="admin"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Пароль за замовчуванням для суперадміністратора та всіх користувачів — <span className="font-mono font-bold text-primary">admin</span>
                </p>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-border/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl bg-secondary text-foreground text-xs font-bold uppercase hover:bg-secondary/80 cursor-pointer flex items-center justify-center"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto h-11 sm:h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 cursor-pointer shadow-md shadow-primary/20 flex items-center justify-center active:scale-98"
                >
                  Оновити дані
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM ROLE */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92dvh] sm:max-h-[86vh] flex flex-col my-auto overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span>Створення нової ролі</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Назва ролі *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Черговий інженер"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Опис посадових обов'язків
                </label>
                <textarea
                  rows={3}
                  placeholder="Опис завдань та зони відповідальності..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Колір бейджа
                </label>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewRoleColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                        newRoleColor === c ? 'scale-125 ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-border/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl bg-secondary text-foreground text-xs font-bold uppercase hover:bg-secondary/80 cursor-pointer flex items-center justify-center"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto h-11 sm:h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 cursor-pointer shadow-md shadow-primary/20 flex items-center justify-center active:scale-98"
                >
                  Створити роль
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: JSON DIRECT EDITOR */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <FileCode className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  Прямий редактор файлу authorized_users.json
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Ручне редагування або вставка структури масиву користувачів
                </p>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto min-h-0">
              <textarea
                rows={10}
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="w-full h-full min-h-[200px] font-mono text-xs p-3 sm:p-3.5 bg-secondary/60 border border-border rounded-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed resize-y"
              />
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-border/50 shrink-0">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                Потрібен валідний JSON-масив з об'єктами {'{ email, name, roleId }'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-bold uppercase hover:bg-secondary/80 cursor-pointer h-10 flex items-center justify-center"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={handleSaveRawJson}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 cursor-pointer shadow-md shadow-primary/20 h-10 flex items-center justify-center"
                >
                  Застосувати зміни
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: DELETE USER */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto my-auto">
            <div className="w-11 h-11 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Видалити користувача?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ви дійсно бажаєте видалити <strong className="text-foreground">{userToDelete.name}</strong> (<span className="font-mono">{userToDelete.email}</span>) зі списку дозволених?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 h-10 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-destructive/20"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: DELETE ROLE */}
      {roleToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto my-auto">
            <div className="w-11 h-11 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Видалити роль?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Видалити роль <strong className="text-foreground">«{roleToDelete.name}»</strong>?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="flex-1 h-10 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={confirmDeleteRole}
                className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-destructive/20"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASSWORD RESET REQUEST TO SUPERADMIN */}
      {passwordRequestTargetUser && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Запит нового паролю</h3>
                  <p className="text-[11px] text-muted-foreground">Відправка листа на пошту Суперадміністратора</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordRequestTargetUser(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Користувач:</span>
                  <span className="font-bold text-foreground">{passwordRequestTargetUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email користувача:</span>
                  <span className="font-mono font-semibold text-foreground">{passwordRequestTargetUser.email}</span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-1.5">
                  <span className="text-muted-foreground">Одержувач (Суперадмін):</span>
                  <span className="font-mono font-bold text-primary">{superadminEmails.join(', ')}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Причина або коментар до запиту
                </label>
                <textarea
                  rows={3}
                  value={passwordRequestNotes}
                  onChange={(e) => setPasswordRequestNotes(e.target.value)}
                  placeholder="Наприклад: Співробітник змінив робочий пристрій або забув пароль для входу"
                  className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-[11px] text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  При підтвердженні на пошту Суперадміністратора (<strong className="text-foreground">{superadminEmails[0] || 'admin'}</strong>) буде негайно відправлено офіційний лист із запитом нового пароля для співробітника <strong>{passwordRequestTargetUser.name}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setPasswordRequestTargetUser(null)}
                className="flex-1 h-10 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={isSendingPasswordRequest}
                onClick={handleConfirmPasswordRequest}
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingPasswordRequest ? 'Відправка...' : 'Надіслати лист'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: RESET */}
      {resetConfirmType && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto my-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {resetConfirmType === 'users' ? 'Скинути список користувачів?' : 'Скинути конфіг ролей?'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {resetConfirmType === 'users'
                  ? 'Список дозволених email буде відновлено до початкового стану з файлу.'
                  : 'Налаштування всіх ролей та прав буде відновлено до стандартних значень.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setResetConfirmType(null)}
                className="flex-1 h-10 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => {
                  if (resetConfirmType === 'users') {
                    resetUsersToDefaultFile();
                    showToast('Список користувачів скинуто до початкових налаштувань', 'info');
                  } else {
                    resetRolesToDefault();
                    showToast('Ролі скинуто до стандартних значень', 'info');
                  }
                  setResetConfirmType(null);
                }}
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-primary/20"
              >
                Підтвердити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
