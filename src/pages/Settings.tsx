import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../store/ThemeContext';
import { useData } from '../store/DataContext';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { X, Check, Type, AppWindow, Database, Download, Upload, MapPin, Users, UserRound, Archive, Palette, LayoutDashboard, Bell, BellOff, Volume2, Clock, Pencil, Trash2, Sliders, Sun, Moon, ShieldCheck, BookOpen, Printer, CloudUpload, Server, HardDrive, RefreshCw, CheckCircle2, Lock, KeyRound, Shield, FileKey } from 'lucide-react';
import { Visitor } from '../types';
import VisitorManagement from '../components/VisitorManagement';
import { Logo } from '../components/Logo';
import UserManualView from '../components/UserManualView';

type SettingsTab = 'database' | 'ranks' | 'locations' | 'groups' | 'backup' | 'appearance' | 'other' | 'manual';

export default function Settings() {
  const { 
    theme, setTheme,
    fontSize, setFontSize, 
    toastsEnabled, setToastsEnabled,
    soundsEnabled, setSoundsEnabled,
    toastDuration, setToastDuration,
    visitorsColumns, setVisitorsColumns
  } = useTheme();
  const { showToast } = useToast();
  const dataContext = useData();
  const { 
    categories, setCategories, groups, setGroups, visitors, setVisitors, 
    guards, setGuards, shifts, setShifts, securityShifts, setSecurityShifts, 
    locations, setLocations, customIcons, setCustomIcons, cleanCurrentShiftLogs, 
    cleanLogsByPeriod, lastAutoBackupTime, isAutoUploading, isAutoUploadEnabled, 
    setIsAutoUploadEnabled, triggerServerDatabaseSync, encryptionStatus, 
    verifyEncryptionIntegrity, fetchEncryptionStatus 
  } = dataContext;

  const [activeTab, setActiveTab] = useState<SettingsTab>('database');

  const [newCat, setNewCat] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newLocationIconId, setNewLocationIconId] = useState<string | undefined>();
  const [newGroup, setNewGroup] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('');
  const [newGroupShowInVisitors, setNewGroupShowInVisitors] = useState(true);
  
  const [editingRank, setEditingRank] = useState<string | null>(null);
  const [editRankValue, setEditRankValue] = useState('');

  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editGroupValue, setEditGroupValue] = useState('');
  const [editGroupColor, setEditGroupColor] = useState('');
  const [editGroupShowInVisitors, setEditGroupShowInVisitors] = useState(true);

  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [editLocationValue, setEditLocationValue] = useState('');
  const [editLocationIconId, setEditLocationIconId] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const usersFileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const GUARD_COLORS = [
    'rgba(239, 68, 68, 0.1)', 'rgba(249, 115, 22, 0.1)', 'rgba(245, 158, 11, 0.1)', 
    'rgba(132, 204, 22, 0.1)', 'rgba(34, 197, 94, 0.1)', 'rgba(16, 185, 129, 0.1)', 
    'rgba(6, 182, 212, 0.1)', 'rgba(59, 130, 246, 0.1)', 'rgba(99, 102, 241, 0.1)', 
    'rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)', 'rgba(100, 116, 139, 0.1)'
  ];

  const addCat = () => {
    if (!newCat.trim()) return;
    if (categories.includes(newCat.trim())) {
      showToast(`Звання "${newCat.trim()}" вже є в довіднику!`, 'error');
      return;
    }
    setCategories([...categories, newCat.trim()]);
    showToast(`Звання "${newCat.trim()}" успішно додано`, 'success');
    setNewCat('');
  }

  const saveRankEdit = (oldValue: string) => {
    const trimmed = editRankValue.trim();
    if (!trimmed || trimmed === oldValue) {
      setEditingRank(null);
      return;
    }
    if (categories.includes(trimmed)) {
      alert(`Звання "${trimmed}" вже є в довіднику!`);
      return;
    }
    setCategories(prev => prev.map(c => c === oldValue ? trimmed : c));
    showToast(`Звання за замінено на "${trimmed}"`, 'success');
    
    // Propagate change to visitors
    setVisitors(prev => prev.map(v => {
      if (v.category === oldValue) {
        return { ...v, category: trimmed };
      }
      return v;
    }));
    
    setEditingRank(null);
  };

  const [selectedCleanGroups, setSelectedCleanGroups] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<'period' | 'shift' | null>(null);

  const CLEAN_PERIODS = [
    { label: '5 хв', value: 5 },
    { label: '15 хв', value: 15 },
    { label: '30 хв', value: 30 },
    { label: '1 год', value: 60 },
    { label: '3 год', value: 180 },
    { label: '6 год', value: 360 },
    { label: '12 год', value: 720 },
  ];

  const handlePeriodClean = () => {
    if (selectedPeriod === null) return;
    cleanLogsByPeriod(selectedPeriod, selectedCleanGroups);
    showToast(`Записи за останні ${CLEAN_PERIODS.find(p => p.value === selectedPeriod)?.label} успішно очищено`, 'success');
    setShowConfirmModal(null);
    setSelectedPeriod(null);
  };

  const handleShiftClean = () => {
    cleanCurrentShiftLogs(selectedCleanGroups);
    showToast(`Дані про вхід/вихід за зміну успішно очищено`, 'success');
    setShowConfirmModal(null);
  };

  const addLocation = () => {
    if (!newLocation.trim()) return;
    if (locations.find(l => l.name === newLocation.trim())) {
      showToast(`Бригада "${newLocation.trim()}" вже є в довіднику!`, 'error');
      return;
    }
    setLocations([...locations, { id: Date.now().toString(), name: newLocation.trim(), iconId: newLocationIconId }]);
    showToast(`Бригаду "${newLocation.trim()}" додано`, 'success');
    setNewLocation('');
    setNewLocationIconId(undefined);
  }

  const saveLocationEdit = () => {
    if (!editingLocation || !editLocationValue.trim()) return;
    const trimmed = editLocationValue.trim();
    
    setLocations(prev => prev.map(l => l.id === editingLocation.id ? { ...l, name: trimmed, iconId: editLocationIconId } : l));
    
    // Propagate change to visitors
    if (trimmed !== editingLocation.name) {
      setVisitors(prev => prev.map(v => {
        if (v.location === editingLocation.name || v.locationId === editingLocation.id) {
          return { ...v, location: trimmed, locationId: editingLocation.id };
        }
        return v;
      }));
    }

    showToast(`Бригаду "${trimmed}" оновлено`, 'success');
    setEditingLocation(null);
  };

  const addGroup = () => {
    if (!newGroup.trim()) return;
    if (groups.find(g => g.name === newGroup.trim())) {
      showToast(`Група "${newGroup.trim()}" вже існує!`, 'error');
      return;
    }
    setGroups([...groups, { 
      id: Date.now().toString(), 
      name: newGroup.trim(), 
      color: newGroupColor,
      showInVisitors: newGroupShowInVisitors 
    }]);
    showToast(`Групу "${newGroup.trim()}" створено`, 'success');
    setNewGroup('');
    setNewGroupColor('');
    setNewGroupShowInVisitors(true);
  };

  const saveGroupEdit = () => {
    if (!editingGroup || !editGroupValue.trim()) return;
    
    const trimmed = editGroupValue.trim();
    setGroups(prev => prev.map(g => g.id === editingGroup.id ? { 
      ...g, 
      name: trimmed, 
      color: editGroupColor,
      showInVisitors: editGroupShowInVisitors 
    } : g));
    
    // Propagate name change to visitors
    if (trimmed !== editingGroup.name) {
      setVisitors(prev => prev.map(v => {
        if (v.groupId === editingGroup.id || v.group === editingGroup.name) {
          return { ...v, group: trimmed, groupId: editingGroup.id };
        }
        return v;
      }));
    }
    
    showToast(`Групу "${trimmed}" оновлено`, 'success');
    setEditingGroup(null);
  };

  const toggleGroupShowInVisitors = (id: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== id) return g;
      const nextVal = g.showInVisitors === false ? true : false;
      showToast(nextVal ? `Кнопку фільтра "${g.name}" увімкнено у Відвідувачах` : `Кнопку фільтра "${g.name}" приховано з панелі фільтрів`, 'info');
      return { ...g, showInVisitors: nextVal };
    }));
  };

  const removeCat = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
    showToast(`Звання "${cat}" видалено`, 'info');
  };
  const removeLocation = (id: string) => {
    const location = locations.find(l => l.id === id);
    setLocations(locations.filter(l => l.id !== id));
    showToast(`Бригаду "${location?.name || ''}" видалено`, 'info');
  };
  const removeGroup = (id: string) => {
    const group = groups.find(g => g.id === id);
    setGroups(groups.filter(g => g.id !== id));
    showToast(`Групу "${group?.name || ''}" видалено`, 'info');
  };

  const { authorizedUsers, roles, currentUser } = useAuth();
  const [isUploadingToServer, setIsUploadingToServer] = useState(false);
  const [isRestoringServerBackup, setIsRestoringServerBackup] = useState<string | null>(null);
  const [serverBackups, setServerBackups] = useState<Array<{ filename: string; timestamp: string; size: number; totalVisitors: number }>>([]);
  const [lastServerBackupSuccess, setLastServerBackupSuccess] = useState<string | null>(null);
  const [isLoadingServerBackups, setIsLoadingServerBackups] = useState(false);
  const encFileInputRef = useRef<HTMLInputElement>(null);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{ valid: boolean; details: string } | null>(null);

  const handleVerifyIntegrity = async () => {
    setIsVerifyingIntegrity(true);
    try {
      const res = await verifyEncryptionIntegrity();
      setIntegrityResult(res);
      if (res.valid) {
        showToast('Цілісність шифрування (AES-256-GCM) успішно підтверджена!', 'success');
      } else {
        showToast(`Помилка цілісності: ${res.details}`, 'error');
      }
    } finally {
      setIsVerifyingIntegrity(false);
    }
  };

  const handleDownloadEncryptedBundle = () => {
    window.location.href = '/api/backup/export-encrypted';
    showToast('Завантаження зашифрованого контейнера (.enc) розпочато', 'info');
  };

  const handleImportEncryptedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/backup/import-encrypted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload })
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast(json.message, 'success');
          fetchServerBackups();
        } else {
          showToast(json.error || 'Помилка імпорту зашифрованого файлу', 'error');
        }
      } catch (err: any) {
        showToast('Невірний формат файлу .enc', 'error');
      }
      if (encFileInputRef.current) encFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const fetchServerBackups = useCallback(async () => {
    setIsLoadingServerBackups(true);
    try {
      const res = await fetch('/api/backup/server-backups');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.backups)) {
          setServerBackups(json.backups);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch server backups:', e);
    } finally {
      setIsLoadingServerBackups(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchServerBackups();
    }
  }, [activeTab, fetchServerBackups]);

  const handleToggleAutoUpload = async (enabled: boolean) => {
    if (enabled === isAutoUploadEnabled) return;
    setIsAutoUploadEnabled(enabled);
    if (enabled) {
      showToast('Автоматичне вивантаження на сервер увімкнено (ON)', 'success');
      await triggerServerDatabaseSync();
    } else {
      showToast('Автоматичне вивантаження на сервер вимкнено (OFF)', 'info');
    }
  };

  const handleUploadFullDatabaseToServer = async () => {
    setIsUploadingToServer(true);
    try {
      const fullDatabasePayload = {
        visitors,
        guards,
        shifts,
        securityShifts,
        categories,
        groups,
        locations,
        dirtySkyEvents: dataContext.dirtySkyEvents,
        dutyEvents: dataContext.dutyEvents,
        customIcons,
        reportRetentionHours: dataContext.reportRetentionHours,
        authorizedUsers,
        roles
      };

      const res = await fetch('/api/backup/upload-to-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: fullDatabasePayload,
          userEmail: currentUser?.email || 'operator'
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        setLastServerBackupSuccess(new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast(`Повну базу успішно вивантажено на сервер (${visitors.length} осіб)`, 'success');
        fetchServerBackups();
      } else {
        throw new Error(json.error || 'Помилка вивантаження');
      }
    } catch (err: any) {
      console.error('Upload to server failed:', err);
      showToast('Не вдалося вивантажити базу на сервер. Перевірте зв\'язок із сервером', 'error');
    } finally {
      setIsUploadingToServer(false);
    }
  };

  const handleRestoreFromServer = async (filename: string) => {
    if (!window.confirm(`Відновити базу даних із серверного знімка ${filename}? Поточні дані будуть замінені цим станом.`)) {
      return;
    }

    setIsRestoringServerBackup(filename);
    try {
      const res = await fetch('/api/backup/restore-from-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Базу успішно відновлено із серверного знімка!', 'success');
      } else {
        throw new Error(json.error || 'Помилка відновлення');
      }
    } catch (e: any) {
      console.error('Restore error:', e);
      showToast(e.message || 'Не вдалося відновити базу із сервера', 'error');
    } finally {
      setIsRestoringServerBackup(null);
    }
  };

  const handleExportData = () => {
    const backup = {
      visitors,
      guards,
      shifts,
      securityShifts,
      categories,
      groups,
      locations
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `cp-manager-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportToCSV = () => {
    const headers = [
      'Дата',
      '№ п/п',
      'Звання',
      'Прізвище Ім\'я По батькові',
      'Позивний',
      'Бригада',
      'Група',
      ...Array.from({length: 4}).flatMap((_, i) => [`Вхід ${i+1}`, `Вихід ${i+1}`]),
      'Загальний час (хв)'
    ];

    const rows = visitors.map((v, i) => {
      const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
      const date = logs[0]?.in ? new Date(logs[0].in).toLocaleDateString() : new Date().toLocaleDateString();
      
      const timeCols = Array.from({length: 4}).flatMap((_, idx) => {
        const log = logs[idx];
        const timeIn = log?.in ? new Date(log.in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const timeOut = log?.out ? new Date(log.out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        return [timeIn, timeOut];
      });
      
      return [
        date,
        i + 1,
        v.category,
        v.name,
        v.callsign || '',
        v.location || v.locationId || v.group,
        v.group,
        ...timeCols,
        v.totalTimeMinutes
      ].map(val => `"${val}"`).join(',');
    });

    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `visitors_export_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.visitors) setVisitors(json.visitors);
        if (json.guards) setGuards(json.guards);
        if (json.shifts) setShifts(json.shifts);
        if (json.securityShifts) setSecurityShifts(json.securityShifts);
        if (json.categories) setCategories(json.categories);
        if (json.groups) setGroups(json.groups);
        if (json.locations) setLocations(json.locations);
        alert('База даних успішно відновлена з резервної копії!');
      } catch (error) {
        alert('Помилка файлу. Переконайтеся, що ви вибрали правильний JSON файл.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleImportUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let importedUsers: any[] = [];

        if (file.name.endsWith('.json')) {
          const json = JSON.parse(text);
          importedUsers = Array.isArray(json) ? json : (json.visitors || []);
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length < 2) return;
          
          // Basic CSV parsing safely handles quotes
          const parseCSVLine = (line: string) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          const headers = parseCSVLine(lines[0]);
          importedUsers = lines.slice(1).map(line => {
            const values = parseCSVLine(line);
            const obj: any = {};
            headers.forEach((h, idx) => {
              const cleanHeader = h.toLowerCase();
              if (cleanHeader.includes('ім\'я') || cleanHeader.includes('name')) obj.name = values[idx];
              if (cleanHeader.includes('позивний') || cleanHeader.includes('callsign')) obj.callsign = values[idx];
              if (cleanHeader.includes('звання') || cleanHeader.includes('rank') || cleanHeader.includes('category')) obj.category = values[idx];
              if (cleanHeader.includes('група') || cleanHeader.includes('group')) obj.group = values[idx];
              if (cleanHeader.includes('особлив') || cleanHeader.includes('special')) {
                const val = (values[idx] || '').trim().toLowerCase();
                obj.isSpecial = val === 'true' || val === '1' || val === '+' || val === 'так' || val === 'yes' || val === 'особливий';
              }
            });
            return obj;
          });
        }

        if (importedUsers.length > 0) {
          const newVisitors: Visitor[] = importedUsers.map(u => {
            const groupObj = groups.find(g => g.name === u.group) || groups[0];
            const isSpecial = u.isSpecial === true || u.isSpecial === 'true' || u.isSpecial === 1 ||
              String(u.category || '').trim().toLowerCase() === 'особливий' ||
              String(u.group || '').trim().toLowerCase() === 'особливий';
            return {
              id: u.id || Math.random().toString(36).substr(2, 9),
              name: u.name || 'Невідомий',
              callsign: u.callsign || '',
              category: u.category || categories[0] || 'Рядовий',
              group: groupObj?.name || u.group || '',
              groupId: groupObj?.id || 'default',
              status: 'out',
              totalTimeMinutes: 0,
              isSpecial: isSpecial ? true : undefined
            };
          });

          setVisitors(prev => {
            const existingNames = new Set(prev.map(v => v.name));
            const uniqueNew = newVisitors.filter(v => !existingNames.has(v.name));
            if (uniqueNew.length < newVisitors.length) {
              const skippedCount = newVisitors.length - uniqueNew.length;
              alert(`Імпортовано ${uniqueNew.length} нових користувачів. ${skippedCount} дублікатів пропущено.`);
            } else {
              alert(`Успішно імпортовано ${newVisitors.length} користувачів!`);
            }
            return [...prev, ...uniqueNew];
          });
        }
      } catch (err) {
        alert('Помилка при читанні файлу');
      }
      if (usersFileInputRef.current) usersFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) { // 500kb limit
      showToast('Файл занадто великий (макс 500КБ)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newIcon = {
        id: 'icon-' + Date.now(),
        name: file.name,
        data: base64
      };
      setCustomIcons(prev => [...prev, newIcon]);
      showToast('Іконку бригади успішно завантажено', 'success');
      if (editingLocation) {
        setEditLocationIconId(newIcon.id);
      } else {
        setNewLocationIconId(newIcon.id);
      }
    };
    reader.readAsDataURL(file);
    if (iconInputRef.current) iconInputRef.current.value = '';
  };

  const removeIcon = (id: string) => {
    setCustomIcons(prev => prev.filter(icon => icon.id !== id));
    showToast('Іконку видалено', 'info');
  };

  const menuItems: { id: SettingsTab; label: string; icon: any; color: string }[] = [
    { id: 'database', label: 'Користувачі', icon: Database, color: 'text-blue-500' },
    { id: 'ranks', label: 'Звання', icon: UserRound, color: 'text-emerald-500' },
    { id: 'locations', label: 'Бригада', icon: MapPin, color: 'text-orange-500' },
    { id: 'groups', label: 'Групи', icon: Users, color: 'text-amber-500' },
    { id: 'backup', label: 'Бэкап', icon: Archive, color: 'text-indigo-500' },
    { id: 'appearance', label: 'Зовнішній вигляд', icon: Palette, color: 'text-primary' },
    { id: 'other', label: 'Інше', icon: Sliders, color: 'text-rose-500' },
    { id: 'manual', label: 'Посібник (PDF)', icon: BookOpen, color: 'text-primary' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <div className="mb-2 overflow-x-auto pb-1.5 hide-scrollbar">
        <div className="flex gap-2 min-w-max">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`h-10 px-4 rounded-xl flex items-center gap-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
                activeTab === item.id 
                  ? 'bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20 scale-[1.02]' 
                  : 'bg-card hover:bg-muted border-border text-muted-foreground'
              }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              <span>{item.label}</span>
            </button>
          ))}

          <Link
            to="/roles"
            className="h-10 px-4 rounded-xl flex items-center gap-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary cursor-pointer"
            title="Перейти до керування ролями та списком email"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Ролі та доступ (СКУД)</span>
          </Link>
        </div>
      </div>

      {/* Divider line between submenu and main settings content area */}
      <div className="h-px bg-border/60 w-full mb-6 no-print" />

      <div className="flex flex-col gap-4">
        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-transparent rounded-none p-0 min-h-[500px]">
            {activeTab === 'database' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <VisitorManagement />
              </div>
            )}

            {activeTab === 'ranks' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
                <div className="flex gap-3 mb-6">
                  <input 
                    value={newCat} onChange={e => setNewCat(e.target.value)}
                    className="flex-1 px-4 py-2 border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    placeholder="Введіть нове звання..."
                  />
                  <button onClick={addCat} className="bg-emerald-500 text-emerald-950 px-6 py-2 rounded-xl hover:bg-emerald-400 text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20">
                    Додати
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((c, idx) => (
                    <div key={`rank-${c}-${idx}`} className="flex justify-between items-center p-3 bg-muted/40 rounded-xl border border-border/50 text-sm group transition-colors hover:bg-muted/60">
                      {editingRank === c ? (
                        <div className="flex-1 flex gap-2">
                          <input 
                            autoFocus
                            value={editRankValue}
                            onChange={e => setEditRankValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveRankEdit(c)}
                            className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none"
                          />
                          <button 
                            onClick={() => saveRankEdit(c)} 
                            title="Зберегти"
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingRank(null)} 
                            title="Скасувати"
                            className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium truncate">{c}</span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setEditingRank(c);
                                setEditRankValue(c);
                              }} 
                              className="text-muted-foreground hover:text-blue-500 p-1.5 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                              title="Редагувати"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => removeCat(c)}
                              className="text-muted-foreground hover:text-red-500 p-1.5 rounded-md transition-all"
                              title="Видалити"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'locations' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl space-y-6">
                {/* 1. Add New Brigade Form */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span>Додати нову бригаду</span>
                  </h3>
                  <div className="flex gap-3">
                    <input 
                      value={newLocation} onChange={e => setNewLocation(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addLocation()}
                      className="flex-1 px-4 py-2 border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                      placeholder="Введіть назву нової бригади..."
                    />
                    <button onClick={addLocation} className="bg-orange-500 text-orange-950 px-6 py-2 rounded-xl hover:bg-orange-400 text-sm font-medium transition-colors shadow-lg shadow-orange-500/20">
                      Додати
                    </button>
                  </div>
                  
                  {/* Select Icon for New Brigade */}
                  <div className="flex gap-2 flex-wrap items-center pt-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Іконка бригади:</span>
                    <div className="flex flex-wrap gap-2 bg-background/50 p-2 rounded-xl border border-border/50 items-center max-w-full">
                      <button 
                        type="button"
                        onClick={() => setNewLocationIconId(undefined)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border text-[10px] font-bold ${!newLocationIconId ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20' : 'border-border text-muted-foreground hover:bg-muted'}`}
                        title="Без шеврону (стандартна)"
                      >
                        DEF
                      </button>
                      {customIcons.map(icon => (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => setNewLocationIconId(icon.id)}
                          className={`w-8 h-8 rounded-lg overflow-hidden border transition-all ${newLocationIconId === icon.id ? 'border-primary scale-110 ring-2 ring-primary/20' : 'border-border opacity-60 hover:opacity-100'}`}
                          title={icon.name}
                        >
                          <img src={icon.data} alt={icon.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      <button 
                        type="button"
                        onClick={() => iconInputRef.current?.click()}
                        className="h-8 px-2.5 bg-background border border-dashed border-orange-500/50 rounded-lg flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-all font-medium shrink-0"
                        title="Завантажити нову іконку з пристрою"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold">Завантажити</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hidden File Input for Brigade Icons */}
                <input 
                  type="file" 
                  accept="image/*,.svg,image/svg+xml" 
                  className="hidden" 
                  ref={iconInputRef} 
                  onChange={handleIconUpload} 
                />

                {/* 3. List of Brigades */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Список бригад ({locations.length})</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {locations.map((loc, idx) => (
                      <div key={loc.id ? `loc-${loc.id}` : `loc-idx-${idx}`} className="flex flex-col p-3 rounded-xl border border-border/50 text-sm group transition-colors hover:bg-muted/60 bg-muted/40">
                        {editingLocation?.id === loc.id ? (
                          <div className="flex-1 flex flex-col gap-3">
                            <input 
                              autoFocus
                              value={editLocationValue}
                              onChange={e => setEditLocationValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveLocationEdit()}
                              className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none"
                            />

                            <div className="flex flex-wrap gap-2 items-center bg-background/30 p-1.5 rounded-lg border border-border/20 max-w-full">
                              <button 
                                type="button"
                                onClick={() => setEditLocationIconId(undefined)}
                                className={`w-6 h-6 rounded-md flex items-center justify-center border text-[8px] font-bold ${!editLocationIconId ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                              >
                                DEF
                              </button>
                              {customIcons.map(icon => (
                                <button
                                  key={icon.id}
                                  type="button"
                                  onClick={() => setEditLocationIconId(icon.id)}
                                  className={`w-6 h-6 rounded-md overflow-hidden border transition-all ${editLocationIconId === icon.id ? 'border-primary scale-110 ring-1 ring-primary' : 'border-border opacity-60 hover:opacity-100'}`}
                                  title={icon.name}
                                >
                                  <img src={icon.data} alt={icon.name} className="w-full h-full object-cover" />
                                </button>
                              ))}
                              <button 
                                type="button"
                                onClick={() => iconInputRef.current?.click()}
                                className="h-6 px-1.5 bg-background border border-dashed border-orange-500/50 rounded-md flex items-center gap-1 text-[9px] text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-all font-medium shrink-0"
                                title="Завантажити іконку"
                              >
                                <Upload className="w-2.5 h-2.5" />
                                <span>+</span>
                              </button>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={saveLocationEdit} 
                                className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
                              >
                                Зберегти
                              </button>
                              <button 
                                onClick={() => setEditingLocation(null)} 
                                className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-[10px] font-bold uppercase transition-colors"
                              >
                                Скасувати
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-card/40 flex items-center justify-center text-foreground shrink-0 overflow-hidden border border-border/40">
                                {loc.iconId && customIcons.find(i => i.id === loc.iconId) ? (
                                  <img src={customIcons.find(i => i.id === loc.iconId)?.data} alt="icon" className="w-full h-full object-cover" />
                                ) : (
                                  <MapPin className="w-4 h-4 opacity-40 text-orange-500" />
                                )}
                              </div>
                              <span className="font-medium truncate">{loc.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  setEditingLocation(loc);
                                  setEditLocationValue(loc.name);
                                  setEditLocationIconId(loc.iconId);
                                }} 
                                className="text-muted-foreground hover:text-blue-500 p-1.5 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                                title="Редагувати"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => removeLocation(loc.id)}
                                className="text-muted-foreground hover:text-red-500 p-1.5 rounded-md transition-all"
                                title="Видалити"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
                <div className="space-y-4 mb-8 p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <div className="flex gap-3">
                    <input 
                      value={newGroup} onChange={e => setNewGroup(e.target.value)}
                      className="flex-1 px-4 py-2 border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
                      placeholder="Назва нової групи..."
                    />
                    <button onClick={addGroup} className="bg-amber-500 text-amber-950 px-6 py-2 rounded-xl hover:bg-amber-400 text-sm font-medium transition-colors shadow-lg shadow-amber-500/20 cursor-pointer">
                      Додати
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Колір групи:</span>
                    {GUARD_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewGroupColor(c)}
                        className={`w-6 h-6 rounded-full border-2 ${newGroupColor === c ? 'border-primary scale-110 shadow-sm' : 'border-border/50'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground w-fit">
                      <input 
                        type="checkbox" 
                        checked={newGroupShowInVisitors} 
                        onChange={e => setNewGroupShowInVisitors(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                      />
                      <span>Відображати в панелі фільтрів «Відвідувачі»</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groups.map((g, idx) => (
                    <div key={g.id ? `group-${g.id}` : `group-idx-${idx}`} className="flex flex-col p-3 rounded-xl border border-border/50 text-sm transition-colors group relative" style={{ backgroundColor: g.color || 'var(--muted)' }}>
                      {editingGroup?.id === g.id ? (
                        <div className="flex-1 flex flex-col gap-3">
                           <input 
                            autoFocus
                            value={editGroupValue}
                            onChange={e => setEditGroupValue(e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none"
                          />
                          
                          <div className="flex gap-2 flex-wrap items-center">
                             {GUARD_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditGroupColor(c)}
                                className={`w-4 h-4 rounded-full border ${editGroupColor === c ? 'border-primary ring-1 ring-primary' : 'border-border/50'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-foreground font-medium my-0.5">
                            <input 
                              type="checkbox" 
                              checked={editGroupShowInVisitors} 
                              onChange={e => setEditGroupShowInVisitors(e.target.checked)}
                              className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                            />
                            <span>Відображати в панелі фільтрів «Відвідувачі»</span>
                          </label>

                          <div className="flex gap-2 justify-end mt-1">
                            <button 
                                onClick={saveGroupEdit} 
                                className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                              >
                                Зберегти
                              </button>
                              <button 
                                onClick={() => setEditingGroup(null)} 
                                className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                              >
                                Скасувати
                              </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-card/40 flex items-center justify-center text-foreground shrink-0 overflow-hidden">
                                <Users className="w-4 h-4 opacity-40" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium truncate block">{g.name}</span>
                              <span className={`text-[10px] font-semibold ${g.showInVisitors !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/70'}`}>
                                {g.showInVisitors !== false ? '✓ У панелі фільтрів' : '✕ Без кнопки фільтра'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label 
                              onClick={e => e.stopPropagation()} 
                              className="flex items-center gap-1 cursor-pointer select-none text-[11px] px-2 py-1 rounded-lg bg-background/80 hover:bg-background border border-border/50 transition-colors shadow-2xs"
                              title="Відображати кнопку цієї групи в панелі фільтрів вкладки Відвідувачі чи ні"
                            >
                              <input 
                                type="checkbox" 
                                checked={g.showInVisitors !== false} 
                                onChange={() => toggleGroupShowInVisitors(g.id)}
                                className="rounded border-border w-3.5 h-3.5 text-primary focus:ring-primary/30 cursor-pointer" 
                              />
                              <span className="text-[10px] hidden sm:inline font-medium">
                                {g.showInVisitors !== false ? "Вкл" : "Викл"}
                              </span>
                            </label>
                            <button 
                              onClick={() => {
                                setEditingGroup(g);
                                setEditGroupValue(g.name);
                                setEditGroupColor(g.color);
                                setEditGroupShowInVisitors(g.showInVisitors !== false);
                              }} 
                              className="text-muted-foreground hover:text-blue-500 p-1.5 rounded-md transition-all cursor-pointer sm:opacity-0 group-hover:opacity-100"
                              title="Редагувати"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => removeGroup(g.id)}
                              className="text-muted-foreground hover:text-red-500 p-1.5 rounded-md transition-all cursor-pointer"
                              title="Видалити"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-6">
                  {/* 0. AES-256-GCM Military Database Encryption Control Center */}
                  <div className="p-5 sm:p-6 bg-gradient-to-br from-card via-card to-primary/5 border border-primary/30 rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-xs">
                          <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                              Шифрування бази даних (AES-256-GCM)
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              АКТИВНЕ • MILITARY-GRADE
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Всі записи відвідувачів, журнали входу/виходу, чергування та конфігурація автоматично шифруються на диску за стандартом AES-256-GCM із автентифікацією тегу цілісності.
                          </p>
                        </div>
                      </div>

                      {/* Integrity Verification Button */}
                      <button
                        type="button"
                        onClick={handleVerifyIntegrity}
                        disabled={isVerifyingIntegrity}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                        title="Запустити криптографічну перевірку тегу автентифікації GCM та SHA-256 контрольної суми"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingIntegrity ? 'animate-spin text-primary' : 'text-primary'}`} />
                        <span>{isVerifyingIntegrity ? 'Перевірка...' : 'Перевірити цілісність'}</span>
                      </button>
                    </div>

                    {/* Encryption Parameters Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-background/80 border border-border/50">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Алгоритм шифрування:</span>
                        <span className="text-xs font-mono font-bold text-foreground">AES-256-GCM (256-bit)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-background/80 border border-border/50">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Деривація ключів (KDF):</span>
                        <span className="text-xs font-mono font-bold text-foreground">PBKDF2-HMAC-SHA256 (100k)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-background/80 border border-border/50">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Відбиток ключа (Fingerprint):</span>
                        <span className="text-xs font-mono font-bold text-primary">
                          {encryptionStatus?.keyFingerprint ? `SHA256:${encryptionStatus.keyFingerprint}` : '256-BIT-SECURE'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-background/80 border border-border/50">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Контроль цілісності:</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          GCM MAC Tag Valid
                        </span>
                      </div>
                    </div>

                    {/* Encrypted Export & Import Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="text-xs text-muted-foreground">
                        Експортуйте зашифрований контейнер <code className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">.enc</code> для захищеного перенесення між серверами СКУД.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadEncryptedBundle}
                          className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          title="Завантажити зашифрований файл (.enc)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Завантажити .enc</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => encFileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          title="Імпортувати зашифрований файл (.enc)"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Імпорт .enc</span>
                        </button>
                        <input
                          type="file"
                          accept=".enc,.json"
                          ref={encFileInputRef}
                          onChange={handleImportEncryptedFile}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 1. Main Server Database Backup & Snapshot Section */}
                  <div className="p-5 sm:p-6 bg-card border border-border/70 rounded-2xl shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Server className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                            Зашифровані знімки бази на сервері
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              AES-256-GCM
                            </span>
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Створює криптографічно захищений архівний знімок системи (відвідувачі, журнальні записи, чергування, ролі та довідники).
                          </p>
                        </div>
                      </div>

                      {/* Main Action Button */}
                      <button
                        onClick={handleUploadFullDatabaseToServer}
                        disabled={isUploadingToServer}
                        className={`inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-md select-none shrink-0 ${
                          isUploadingToServer
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 active:scale-95'
                        }`}
                        title="Зберегти та створити зашифрований знімок бази на сервері"
                      >
                        {isUploadingToServer ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Збереження...</span>
                          </>
                        ) : (
                          <>
                            <CloudUpload className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Створити зашифрований знімок</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Automatic Database Sync to Server Status & ON/OFF Controls */}
                    <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
                      isAutoUploadEnabled
                        ? 'bg-gradient-to-r from-emerald-500/10 via-primary/5 to-card border-emerald-500/30 shadow-2xs'
                        : 'bg-muted/30 border-border/60'
                    }`}>
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="relative flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                          <div className={`w-3.5 h-3.5 rounded-full ${
                            !isAutoUploadEnabled 
                              ? 'bg-muted-foreground/40' 
                              : isAutoUploading 
                                ? 'bg-amber-500 animate-ping' 
                                : 'bg-emerald-500'
                          }`} />
                          <div className={`w-2.5 h-2.5 rounded-full absolute ${
                            !isAutoUploadEnabled 
                              ? 'bg-muted-foreground/60' 
                              : isAutoUploading 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground text-xs sm:text-sm">
                              Автоматичне вивантаження на сервер:
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              !isAutoUploadEnabled
                                ? 'bg-muted text-muted-foreground border border-border/80'
                                : isAutoUploading 
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {!isAutoUploadEnabled ? 'ВИМКНЕНО (OFF)' : isAutoUploading ? 'Вивантаження...' : 'АКТИВНО (ON)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                            {isAutoUploadEnabled
                              ? 'Після будь-якої зміни в базі даних оновлена версія автоматично зберігається на сервері.'
                              : 'Автоматичне збереження призупинено. Зміни зберігаються локально в браузері. Використовуйте кнопку «Вивантажити всю базу на сервер» для ручного збереження.'}
                          </p>
                        </div>
                      </div>

                      {/* Controls and Last sync timestamp */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        {/* ON / OFF Toggle Buttons */}
                        <div className="inline-flex items-center p-1 rounded-xl bg-background border border-border shadow-xs select-none">
                          <button
                            type="button"
                            onClick={() => handleToggleAutoUpload(true)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              isAutoUploadEnabled
                                ? 'bg-emerald-500 text-white shadow-sm scale-100'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                            }`}
                            title="Увімкнути автоматичне вивантаження на сервер"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>ON</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAutoUpload(false)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              !isAutoUploadEnabled
                                ? 'bg-destructive text-destructive-foreground shadow-sm scale-100'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                            }`}
                            title="Вимкнути автоматичне вивантаження на сервер"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>OFF</span>
                          </button>
                        </div>

                        {/* Last Sync Timestamp */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Останнє збереження:
                          </span>
                          <span className={`font-mono text-xs font-bold ${
                            isAutoUploadEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                          }`}>
                            {lastAutoBackupTime 
                              ? lastAutoBackupTime.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                              : (lastServerBackupSuccess || 'При зміні даних')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Відвідувачів у базі:</span>
                        <span className="text-sm font-black text-foreground">{visitors.length}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Бригад / Локацій:</span>
                        <span className="text-sm font-black text-foreground">{locations.length}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Підрозділів / Груп:</span>
                        <span className="text-sm font-black text-foreground">{groups.length}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Останнє вивантаження:</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {lastAutoBackupTime 
                            ? lastAutoBackupTime.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                            : (lastServerBackupSuccess || 'Синхронізовано')}
                        </span>
                      </div>
                    </div>

                    {/* Server Backups Archive List */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5" />
                          Архів серверних копій бази ({serverBackups.length})
                        </span>
                        <button
                          type="button"
                          onClick={fetchServerBackups}
                          disabled={isLoadingServerBackups}
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoadingServerBackups ? 'animate-spin' : ''}`} />
                          <span>Оновити</span>
                        </button>
                      </div>

                      {serverBackups.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/60">
                          Серверні копії бази створюються автоматично при вивантаженні. Натисніть кнопку «Вивантажити всю базу на сервер» вище.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {serverBackups.slice(0, 8).map((b) => (
                            <div
                              key={b.filename}
                              className="flex items-center justify-between p-2 sm:px-3 bg-muted/30 border border-border/40 rounded-xl text-xs gap-2"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <Archive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <div className="truncate flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-medium text-foreground">{b.filename}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary/15 text-primary border border-primary/25">
                                    AES-256-GCM
                                  </span>
                                  <span className="text-[10px] text-muted-foreground ml-1">
                                    {new Date(b.timestamp).toLocaleString('uk-UA')} • {b.totalVisitors} осіб • {(b.size / 1024).toFixed(1)} КБ
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRestoreFromServer(b.filename)}
                                disabled={isRestoringServerBackup === b.filename}
                                className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-[10px] font-bold uppercase shrink-0 transition-colors cursor-pointer"
                                title="Відновити стан бази з цього файлу"
                              >
                                {isRestoringServerBackup === b.filename ? 'Відновлення...' : 'Відновити'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Local File Export & Import Options */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Локальний експорт та імпорт файлів (на пристрій)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <button 
                        onClick={handleExportData} 
                        className="flex items-center justify-center gap-2.5 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-sm font-medium text-xs sm:text-sm cursor-pointer"
                      >
                        <Download className="w-4 h-4"/> 
                        <span>Експорт бази (.json)</span>
                      </button>
                      <button 
                        onClick={exportToCSV} 
                        className="flex items-center justify-center gap-2.5 px-4 py-3 bg-emerald-500 text-emerald-950 rounded-xl hover:bg-emerald-400 transition-all shadow-sm font-medium text-xs sm:text-sm cursor-pointer"
                      >
                        <Download className="w-4 h-4"/> 
                        <span>Експорт відвідувань (.csv)</span>
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex items-center justify-center gap-2.5 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-medium text-xs sm:text-sm cursor-pointer"
                      >
                        <Upload className="w-4 h-4"/> 
                        <span>Імпорт бази (.json)</span>
                      </button>
                      <button 
                        onClick={() => usersFileInputRef.current?.click()} 
                        className="flex items-center justify-center gap-2.5 px-4 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-sm font-medium text-xs sm:text-sm cursor-pointer"
                      >
                        <Upload className="w-4 h-4"/> 
                        <span>Імпорт користувачів (.csv)</span>
                      </button>
                    </div>
                  </div>
                  
                  <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportData} />
                  <input type="file" accept=".json,.csv" className="hidden" ref={usersFileInputRef} onChange={handleImportUsers} />
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-4">Сповіщення в системі</label>
                    <div className="space-y-4">
                      {/* Visual Notifications Toggle */}
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${toastsEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                            {toastsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">Спливаючі повідомлення</p>
                            <p className="text-xs text-muted-foreground">Показувати вікна про успішні дії або помилки</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setToastsEnabled(!toastsEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${toastsEnabled ? 'bg-primary' : 'bg-muted'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toastsEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>

                      {/* Sound Notifications Toggle */}
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${soundsEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                            {soundsEnabled ? <Volume2 className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">Звукові сповіщення</p>
                            <p className="text-xs text-muted-foreground">Відтворювати звук при завершенні операцій</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSoundsEnabled(!soundsEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${soundsEnabled ? 'bg-primary' : 'bg-muted'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${soundsEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>

                      {/* Toast Duration Setting */}
                      <div className="p-5 bg-muted/30 rounded-2xl border border-border/50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Тривалість сповіщень</p>
                              <p className="text-xs text-muted-foreground">Час показу вікна в секундах</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="1"
                              max="30"
                              value={toastDuration}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) setToastDuration(Math.min(30, Math.max(1, val)));
                              }}
                              className="w-16 px-3 py-1.5 bg-background border border-border rounded-xl text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <span className="text-xs text-muted-foreground font-medium">сек</span>
                          </div>
                        </div>
                        <input 
                          type="range"
                          min="1"
                          max="30"
                          step="1"
                          value={toastDuration}
                          onChange={(e) => setToastDuration(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between mt-2 px-1">
                          <span className="text-[10px] text-muted-foreground">1с</span>
                          <span className="text-[10px] text-muted-foreground">15с</span>
                          <span className="text-[10px] text-muted-foreground">30с</span>
                        </div>
                      </div>
                    </div>
                  </div>


                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-4">Кількість колонок на сторінці відвідувачів</label>
                    <div className="flex flex-wrap gap-2">
                      {[2, 3, 4, 5, 6, 7, 8].map(cols => (
                        <button
                          key={cols}
                          onClick={() => setVisitorsColumns(cols)}
                          className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${
                            visitorsColumns === cols 
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                              : 'bg-muted text-muted-foreground hover:bg-secondary/50 border border-border/50'
                          }`}
                        >
                          {cols}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground opacity-70">Виберіть скільки карток відображати в одному рядку на великих екранах</p>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-4">Розмір шрифту інтерфейсу</label>
                    <div className="flex flex-wrap gap-3">
                      {(['normal', 'large', 'xlarge'] as const).map(size => (
                        <button
                          key={size}
                          onClick={() => setFontSize(size)}
                          className={`px-8 py-3 rounded-xl text-sm font-medium transition-all ${
                            fontSize === size 
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                              : 'bg-muted text-muted-foreground hover:bg-secondary/50 hover:text-foreground border border-border/50'
                          }`}
                        >
                          {size === 'normal' ? 'Стандартний' : size === 'large' ? 'Великий' : 'Дуже великий'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Тема оформлення системи (Світла / Темна)
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        Виберіть світлу або темну тему інтерфейсу
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl">
                      {[
                        {
                          id: 'light' as const,
                          name: 'Світла тема',
                          badge: 'Класична',
                          desc: 'Чистий світлий інтерфейс для денної зміни та яскравого освітлення',
                          icon: Sun,
                          bg: '#ffffff',
                          card: '#f1f5f9',
                          accent: '#2563eb',
                          border: '#cbd5e1'
                        },
                        {
                          id: 'dark' as const,
                          name: 'Темна тема',
                          badge: 'За замовчуванням',
                          desc: 'Глибока темна графітова палітра для роботи та чергування (встановлена за замовчуванням)',
                          icon: Moon,
                          bg: '#0b1120',
                          card: '#151f32',
                          accent: '#3b82f6',
                          border: '#334155'
                        }
                      ].map((t) => {
                        const isCurrent = theme === t.id;
                        const Icon = t.icon;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`relative rounded-2xl p-4 border transition-all cursor-pointer select-none flex flex-col justify-between ${
                              isCurrent
                                ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-md scale-[1.01]'
                                : 'bg-card hover:bg-muted/40 border-border hover:border-border/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    isCurrent ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  <Icon className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                    <span>{t.name}</span>
                                    {isCurrent && (
                                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                                    )}
                                  </div>
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t.badge}
                                  </span>
                                </div>
                              </div>

                              {/* Color palette preview circles */}
                              <div className="flex items-center -space-x-1.5 shrink-0 bg-background/60 p-1 rounded-full border border-border/50">
                                <span className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: t.bg }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: t.card }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: t.accent }} />
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {t.desc}
                            </p>

                            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] font-bold">
                              <span className={isCurrent ? 'text-primary' : 'text-muted-foreground'}>
                                {isCurrent ? '✓ Активна тема' : 'Натисніть для вибору'}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 uppercase font-mono">
                                {t.id}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'other' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-8">
                  <div className="p-6 bg-rose-500/5 rounded-2xl relative overflow-hidden">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                       <Trash2 className="w-4 h-4 text-rose-500" /> 
                       Очищення помилкових записів
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                      Виберіть період часу та натисніть кнопку "Очистити". Будуть видалені записи лише для користувачів, які вже **вийшли** з локації. 
                    </p>

                    <div className="mb-6">
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Виберіть групи для очищення (якщо нічого не вибрано - очистяться всі):</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            if (selectedCleanGroups.length === groups.length) {
                              setSelectedCleanGroups([]);
                            } else {
                              setSelectedCleanGroups(groups.map(g => g.id));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedCleanGroups.length === groups.length ? 'bg-primary text-white border-transparent shadow-sm' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                        >
                          ВСІ ГРУПИ
                        </button>
                        <div className="w-px h-6 bg-border/60 mx-1 self-center" />
                        {groups.map((g, idx) => (
                          <button
                            key={g.id ? `clean-group-${g.id}` : `clean-group-idx-${idx}`}
                            onClick={() => setSelectedCleanGroups(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedCleanGroups.includes(g.id) ? 'bg-primary text-white border-transparent shadow-sm' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex flex-col gap-4">
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Очистити за період:</label>
                        <div className="flex flex-wrap gap-2">
                          {CLEAN_PERIODS.map((period) => (
                            <button
                              key={period.value}
                              onClick={() => setSelectedPeriod(period.value)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${selectedPeriod === period.value ? 'bg-primary text-white border-primary shadow-md' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                            >
                              {period.label}
                            </button>
                          ))}
                        </div>
                        <button
                          disabled={selectedPeriod === null}
                          onClick={() => setShowConfirmModal('period')}
                          className={`w-full sm:w-auto px-10 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-lg ${selectedPeriod !== null ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20' : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'}`}
                        >
                          Очистити
                        </button>
                      </div>

                      <div className="h-px bg-border/50" />

                      <div className="flex flex-col gap-3">
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Швидкі дії:</label>
                        <button
                          onClick={() => setShowConfirmModal('shift')}
                          className="w-full sm:w-auto self-start px-6 py-2.5 bg-muted border border-border text-muted-foreground rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white hover:border-transparent transition-all active:scale-95"
                        >
                          Всю зміну
                        </button>
                        <p className="text-[10px] text-muted-foreground">Видаляє дані за поточне чергування для тих, хто вже вийшов</p>
                      </div>
                    </div>

                    {/* Confirmation Modal */}
                    {showConfirmModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                        <div className="bg-card border border-border w-full max-w-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto my-auto">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 mx-auto">
                            <Trash2 className="w-6 h-6" />
                          </div>
                          <h3 className="text-lg font-bold text-center mb-2">Підтвердження очищення</h3>
                          <p className="text-sm text-muted-foreground text-center mb-6">
                            Ви впевнені, що хочете видалити записи для груп: <span className="font-bold text-foreground">{selectedCleanGroups.length > 0 ? groups.filter(g => selectedCleanGroups.includes(g.id)).map(g => g.name).join(', ') : 'Всіх'}</span>? 
                            <br/><br/>
                            {showConfirmModal === 'period' 
                              ? `Це видалить записи за останні ${CLEAN_PERIODS.find(p => p.value === selectedPeriod)?.label} для користувачів, які вже вийшли.` 
                              : 'Це видалить всі записи за поточне чергування для користувачів, які вже вийшли.'}
                          </p>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => setShowConfirmModal(null)}
                              className="flex-1 py-3 px-4 bg-muted text-muted-foreground rounded-2xl text-xs font-bold hover:bg-muted/80 transition-colors"
                            >
                              Скасувати
                            </button>
                            <button 
                              onClick={showConfirmModal === 'period' ? handlePeriodClean : handleShiftClean}
                              className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-2xl text-xs font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                            >
                              Підтвердити
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <UserManualView embeddedInSettings={true} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
