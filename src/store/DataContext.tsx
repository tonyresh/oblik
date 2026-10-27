import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { differenceInMinutes } from 'date-fns';
import { 
  Visitor, Guard, Shift, Category, Group, SecurityShift, DirtySkyEvent, 
  CustomIcon, Location, DutyEvent, StopListItem, CheckpointTerminal, 
  AuditLogEntry, EncryptionStatus 
} from '../types';
import { realtimeSync, SyncStatus } from '../services/realtimeSync';

interface DataContextType {
  visitors: Visitor[];
  setVisitors: React.Dispatch<React.SetStateAction<Visitor[]>>;
  guards: Guard[];
  setGuards: React.Dispatch<React.SetStateAction<Guard[]>>;
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  securityShifts: SecurityShift[];
  setSecurityShifts: React.Dispatch<React.SetStateAction<SecurityShift[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  dirtySkyEvents: DirtySkyEvent[];
  dutyEvents: DutyEvent[];
  setDutyEvents: React.Dispatch<React.SetStateAction<DutyEvent[]>>;
  addDutyEvent: (shiftId: string, shiftName: string, type: 'start' | 'end', timestamp?: string) => void;
  customIcons: CustomIcon[];
  setCustomIcons: React.Dispatch<React.SetStateAction<CustomIcon[]>>;
  startDirtySky: () => void;
  endDirtySky: () => void;
  performShiftBackupAndReset: () => void;
  cleanLogsByPeriod: (minutes: number, groupIds?: string[]) => void;
  cleanCurrentShiftLogs: (groupIds?: string[]) => void;
  reportRetentionHours: number;
  setReportRetentionHours: (hours: number) => number;
  purgeReportsByDateRange: (startDate: string | Date, endDate: string | Date) => { logsCleared: number; eventsCleared: number; dutyEventsCleared: number };
  purgeAllReports: () => { logsCleared: number; eventsCleared: number; dutyEventsCleared: number };
  syncStatus: SyncStatus;
  onlineClientsCount: number;
  lastAutoBackupTime: Date | null;
  isAutoUploading: boolean;
  isAutoUploadEnabled: boolean;
  setIsAutoUploadEnabled: (enabled: boolean) => void;
  triggerServerDatabaseSync: () => Promise<boolean>;

  // Security, Audit, Stop-List, Checkpoints & Encryption
  stopList: StopListItem[];
  setStopList: React.Dispatch<React.SetStateAction<StopListItem[]>>;
  addToStopList: (item: Omit<StopListItem, 'id' | 'addedAt'>) => Promise<StopListItem | null>;
  removeFromStopList: (id: string) => Promise<boolean>;
  checkpoints: CheckpointTerminal[];
  setCheckpoints: React.Dispatch<React.SetStateAction<CheckpointTerminal[]>>;
  updateCheckpointStatus: (id: string, updates: Partial<CheckpointTerminal>) => Promise<boolean>;
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => Promise<void>;
  encryptionStatus: EncryptionStatus | null;
  verifyEncryptionIntegrity: () => Promise<{ valid: boolean; details: string }>;
  fetchEncryptionStatus: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [visitors, setVisitors] = useState<Visitor[]>(() => {
    try {
      const saved = localStorage.getItem('visitors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [guards, setGuards] = useState<Guard[]>(() => {
    try {
      const saved = localStorage.getItem('guards');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [shifts, setShifts] = useState<Shift[]>(() => {
    try {
      const saved = localStorage.getItem('shifts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [securityShifts, setSecurityShifts] = useState<SecurityShift[]>(() => {
    try {
      const saved = localStorage.getItem('securityShifts');
      return saved ? JSON.parse(saved) : [
        { id: 'shift-1', name: 'Денна зміна', visitorIds: [] },
        { id: 'shift-2', name: 'Нічна зміна', visitorIds: [] }
      ];
    } catch {
      return [
        { id: 'shift-1', name: 'Денна зміна', visitorIds: [] },
        { id: 'shift-2', name: 'Нічна зміна', visitorIds: [] }
      ];
    }
  });
  const [categories, setCategoriesState] = useState<Category[]>(() => {
    const defaultRanks = ['Рядовий', 'Сержант', 'Лейтенант', 'Капітан', 'Майор', 'Полковник'];
    try {
      const saved = localStorage.getItem('categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const unique = Array.from(new Set(parsed.map(String).map(s => s.trim()).filter(Boolean)));
          return unique.length > 0 ? unique : defaultRanks;
        }
      }
      return defaultRanks;
    } catch {
      return defaultRanks;
    }
  });

  const setCategories = useCallback((action: React.SetStateAction<Category[]>) => {
    setCategoriesState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      return Array.from(new Set(next.map(String).map(s => s.trim()).filter(Boolean)));
    });
  }, []);
  const [locations, setLocations] = useState<Location[]>(() => {
    try {
      const saved = localStorage.getItem('locations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          return (parsed as string[]).map(l => ({ id: Math.random().toString(36).substr(2, 9), name: l }));
        }
        return parsed;
      }
    } catch {}
    return [
      { id: 'loc-1', name: 'Штаб' },
      { id: 'loc-2', name: 'КПП' },
      { id: 'loc-3', name: 'Казарма №1' },
      { id: 'loc-4', name: 'Навчальна бригада' }
    ];
  });
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const saved = localStorage.getItem('groups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          return [
            { id: '1', name: 'Постійні відвідувачі', color: 'rgba(34, 197, 94, 0.1)' },
            { id: '2', name: 'Тимчасові', color: 'rgba(59, 130, 246, 0.1)' },
            { id: '3', name: 'Рота охорони', color: 'rgba(239, 68, 68, 0.1)' },
          ];
        }
        return parsed;
      }
    } catch {}
    return [
      { id: '1', name: 'Постійні відвідувачі', color: 'rgba(34, 197, 94, 0.1)' },
      { id: '2', name: 'Тимчасові', color: 'rgba(59, 130, 246, 0.1)' },
      { id: '3', name: 'Рота охорони', color: 'rgba(239, 68, 68, 0.1)' },
    ];
  });

  // Migration: Move "Рота охорони" from locations to groups and de-duplicate
  useEffect(() => {
    // Migration from old location to group
    const hasSecurityLocation = locations.some(loc => loc.name === 'Рота охорони');
    if (hasSecurityLocation) {
      setLocations(prev => prev.filter(loc => loc.name !== 'Рота охорони'));
    }
    
    // Always check for duplicates and ensure Рота охорони exists
    setGroups(prev => {
      const seen = new Set();
      const unique: Group[] = [];
      
      // First ensure core groups exist if missing
      const coreGroups = [
        { id: '1', name: 'Постійні відвідувачі', color: 'rgba(34, 197, 94, 0.1)' },
        { id: '2', name: 'Тимчасові', color: 'rgba(59, 130, 246, 0.1)' },
        { id: '3', name: 'Рота охорони', color: 'rgba(239, 68, 68, 0.1)' },
      ];

      // Use a combined list to filter
      const allPossible = [...prev];
      coreGroups.forEach(cg => {
        if (!allPossible.some(g => g.name === cg.name)) {
          allPossible.push(cg);
        }
      });

      allPossible.forEach(g => {
        if (!seen.has(g.name)) {
          seen.add(g.name);
          unique.push(g);
        }
      });

      return unique.length === prev.length && prev.length > 0 ? prev : unique;
    });
  }, [locations]);

  const [dirtySkyEvents, setDirtySkyEvents] = useState<DirtySkyEvent[]>(() => {
    const saved = localStorage.getItem('dirtySkyEvents');
    return saved ? JSON.parse(saved) : [];
  });

  const [dutyEvents, setDutyEvents] = useState<DutyEvent[]>(() => {
    try {
      const saved = localStorage.getItem('dutyEvents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addDutyEvent = useCallback((shiftId: string, shiftName: string, type: 'start' | 'end', timestamp?: string) => {
    const newEvent: DutyEvent = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
      shiftId,
      shiftName,
      type,
      timestamp: timestamp || new Date().toISOString()
    };
    setDutyEvents(prev => [...prev, newEvent]);
  }, []);

  const [customIcons, setCustomIcons] = useState<CustomIcon[]>(() => {
    try {
      const saved = localStorage.getItem('customIcons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Enterprise Security State: Stop-List, Checkpoints, Audit & Encryption
  const [stopList, setStopList] = useState<StopListItem[]>(() => {
    try {
      const saved = localStorage.getItem('stopList');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [checkpoints, setCheckpoints] = useState<CheckpointTerminal[]>(() => {
    try {
      const saved = localStorage.getItem('checkpoints');
      return saved ? JSON.parse(saved) : [
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
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [encryptionStatus, setEncryptionStatus] = useState<EncryptionStatus | null>(null);

  const fetchEncryptionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/encryption/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.encryption) {
          setEncryptionStatus(json.encryption);
        }
      }
    } catch (e) {
      console.warn('[Crypto] Failed to fetch encryption status:', e);
    }
  }, []);

  const verifyEncryptionIntegrity = useCallback(async () => {
    try {
      const res = await fetch('/api/encryption/verify', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.integrity) {
          setEncryptionStatus(prev => prev ? { ...prev, integrityVerified: json.integrity.valid } : null);
          return json.integrity;
        }
      }
      return { valid: false, details: 'Помилка зв\'язку з сервером' };
    } catch (err: any) {
      return { valid: false, details: err.message || 'Мережева помилка' };
    }
  }, []);

  const addToStopList = useCallback(async (item: Omit<StopListItem, 'id' | 'addedAt'>) => {
    try {
      const res = await fetch('/api/security/stoplist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.item) {
          setStopList(prev => [json.item, ...prev.filter(i => i.id !== json.item.id)]);
          return json.item;
        }
      }
    } catch (e) {
      console.error('[StopList] Error adding item:', e);
    }
    return null;
  }, []);

  const removeFromStopList = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/security/stoplist/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStopList(prev => prev.filter(item => item.id !== id));
        return true;
      }
    } catch (e) {
      console.error('[StopList] Error removing item:', e);
    }
    return false;
  }, []);

  const updateCheckpointStatus = useCallback(async (id: string, updates: Partial<CheckpointTerminal>) => {
    try {
      const res = await fetch(`/api/security/checkpoints/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setCheckpoints(prev => prev.map(c => c.id === id ? { ...c, ...updates, lastActivity: new Date().toISOString() } : c));
        return true;
      }
    } catch (e) {
      console.error('[Checkpoint] Error updating:', e);
    }
    return false;
  }, []);

  const addAuditLog = useCallback(async (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    try {
      const res = await fetch('/api/audit-logs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.log) {
          setAuditLogs(prev => [json.log, ...prev.slice(0, 499)]);
        }
      }
    } catch (e) {
      console.warn('[Audit] Error adding log:', e);
    }
  }, []);

  // Fetch initial audit logs and encryption status
  useEffect(() => {
    fetchEncryptionStatus();
    fetch('/api/audit-logs?limit=150')
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.logs)) setAuditLogs(d.logs); })
      .catch(() => {});
    fetch('/api/security/stoplist')
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.stopList)) setStopList(d.stopList); })
      .catch(() => {});
    fetch('/api/security/checkpoints')
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.checkpoints)) setCheckpoints(d.checkpoints); })
      .catch(() => {});
  }, [fetchEncryptionStatus]);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => realtimeSync.getStatus());
  const [onlineClientsCount, setOnlineClientsCount] = useState<number>(() => realtimeSync.getOnlineCount());
  const isRemoteUpdateRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    // 1. Connect WebSocket
    realtimeSync.connect();

    // 2. Subscribe to status & presence
    const unsubStatus = realtimeSync.onStatusChange(setSyncStatus);
    const unsubPresence = realtimeSync.onPresenceChange(setOnlineClientsCount);

    // 3. Handle full sync init from server
    const unsubInit = realtimeSync.onInit((serverState) => {
      if (!serverState) return;

      if (Array.isArray(serverState.visitors)) {
        isRemoteUpdateRef.current.visitors = true;
        setVisitors(serverState.visitors);
      }
      if (Array.isArray(serverState.locations)) {
        isRemoteUpdateRef.current.locations = true;
        setLocations(serverState.locations);
      }
      if (Array.isArray(serverState.groups)) {
        isRemoteUpdateRef.current.groups = true;
        setGroups(serverState.groups);
      }
      if (Array.isArray(serverState.categories)) {
        isRemoteUpdateRef.current.categories = true;
        setCategories(serverState.categories);
      }
      if (Array.isArray(serverState.securityShifts)) {
        isRemoteUpdateRef.current.securityShifts = true;
        setSecurityShifts(serverState.securityShifts);
      }
      if (Array.isArray(serverState.shifts)) {
        isRemoteUpdateRef.current.shifts = true;
        setShifts(serverState.shifts);
      }
      if (Array.isArray(serverState.dirtySkyEvents)) {
        isRemoteUpdateRef.current.dirtySkyEvents = true;
        setDirtySkyEvents(serverState.dirtySkyEvents);
      }
      if (Array.isArray(serverState.dutyEvents)) {
        isRemoteUpdateRef.current.dutyEvents = true;
        setDutyEvents(serverState.dutyEvents);
      }
      if (Array.isArray(serverState.customIcons)) {
        isRemoteUpdateRef.current.customIcons = true;
        setCustomIcons(serverState.customIcons);
      }
      if (typeof serverState.reportRetentionHours === 'number') {
        isRemoteUpdateRef.current.reportRetentionHours = true;
        setReportRetentionHoursState(serverState.reportRetentionHours);
      }
    });

    // 4. Handle incoming incremental updates from other clients
    const unsubUpdate = realtimeSync.onUpdate((key, data, updatedBy) => {
      if (updatedBy === realtimeSync.getClientId()) return;

      isRemoteUpdateRef.current[key] = true;
      switch (key) {
        case 'visitors': setVisitors(data); break;
        case 'guards': setGuards(data); break;
        case 'shifts': setShifts(data); break;
        case 'securityShifts': setSecurityShifts(data); break;
        case 'categories': setCategories(data); break;
        case 'locations': setLocations(data); break;
        case 'groups': setGroups(data); break;
        case 'dirtySkyEvents': setDirtySkyEvents(data); break;
        case 'dutyEvents': setDutyEvents(data); break;
        case 'customIcons': setCustomIcons(data); break;
        case 'reportRetentionHours': setReportRetentionHoursState(data); break;
      }
    });

    // 5. Handle patch updates
    const unsubPatch = realtimeSync.onPatch((patch, updatedBy) => {
      if (updatedBy === realtimeSync.getClientId()) return;

      Object.entries(patch).forEach(([key, val]) => {
        isRemoteUpdateRef.current[key] = true;
        switch (key) {
          case 'visitors': setVisitors(val); break;
          case 'guards': setGuards(val); break;
          case 'shifts': setShifts(val); break;
          case 'securityShifts': setSecurityShifts(val); break;
          case 'categories': setCategories(val); break;
          case 'locations': setLocations(val); break;
          case 'groups': setGroups(val); break;
          case 'dirtySkyEvents': setDirtySkyEvents(val); break;
          case 'dutyEvents': setDutyEvents(val); break;
          case 'customIcons': setCustomIcons(val); break;
          case 'reportRetentionHours': setReportRetentionHoursState(val); break;
        }
      });
    });

    // 6. Fast HTTP bootstrap + seed if server has no visitors
    realtimeSync.fetchStateViaHttp().then((serverState) => {
      if (serverState) {
        if (serverState.visitors && serverState.visitors.length > 0) {
          isRemoteUpdateRef.current.visitors = true;
          setVisitors(serverState.visitors);
        } else {
          // If server has no visitors, but this client has some in localStorage, seed server
          try {
            const localVis = localStorage.getItem('visitors');
            if (localVis) {
              const parsed = JSON.parse(localVis);
              if (Array.isArray(parsed) && parsed.length > 0) {
                realtimeSync.seedIfEmpty({ visitors: parsed });
              }
            }
          } catch (e) {}
        }
      }
    });

    return () => {
      unsubStatus();
      unsubPresence();
      unsubInit();
      unsubUpdate();
      unsubPatch();
    };
  }, []);

  const startDirtySky = () => {
    const newEvent: DirtySkyEvent = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
    };
    setDirtySkyEvents(prev => [...prev, newEvent]);
  };

  const endDirtySky = () => {
    setDirtySkyEvents(prev => {
      const lastEvent = prev[prev.length - 1];
      if (lastEvent && !lastEvent.endTime) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastEvent,
          endTime: new Date().toISOString(),
        };
        return updated;
      }
      return prev;
    });
  };

  const performShiftBackupAndReset = () => {
    const now = new Date();
    const shiftDateString = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString().split('T')[0] + '-' + Date.now();
    
    // Backup Settings
    const settings = { categories, locations, groups };
    const blobOptions = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const urlOptions = URL.createObjectURL(blobOptions);
    const aOptions = document.createElement('a');
    aOptions.href = urlOptions;
    aOptions.download = `backup_settings_${shiftDateString}.json`;
    document.body.appendChild(aOptions);
    aOptions.click();
    document.body.removeChild(aOptions);

    // Report of Visitors
    setTimeout(() => {
      const headers = [
        'Дата',
        '№ п/п',
        'Звання',
        'Прізвище Ім\'я По батькові',
        'Звідки прибув',
        'Група',
        ...Array.from({length: 4}).flatMap((_, i) => [`Вхід ${i+1}`, `Вихід ${i+1}`]),
        'Загальний час (хв)'
      ];

      const sortedVisitors = [...visitors].sort((a, b) => a.name.localeCompare(b.name));

      const rows = sortedVisitors.map((v, i) => {
        const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
        const date = logs[0]?.in ? new Date(logs[0].in).toLocaleDateString() : now.toLocaleDateString();
        
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
          v.location || v.locationId || v.group,
          v.group,
          ...timeCols,
          v.totalTimeMinutes || 0
        ].map(val => `"${val}"`).join(',');
      });

      const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
      const blobReport = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const urlReport = URL.createObjectURL(blobReport);
      const aReport = document.createElement('a');
      aReport.href = urlReport;
      aReport.download = `report_visitors_${shiftDateString}.csv`;
      document.body.appendChild(aReport);
      aReport.click();
      document.body.removeChild(aReport);
    }, 500);

    // Clean cells for new shift visibility while preserving history
    setVisitors(prev => prev.map(v => {
      const nowIso = now.toISOString();
      if (v.status === 'in') {
        // Close current log for the report but keep history
        const logs = [...(v.logs || [])];
        const lastLog = logs[logs.length - 1];
        if (lastLog && !lastLog.out) {
          lastLog.out = nowIso;
        }
        // Start new log segment for the new shift
        logs.push({ in: nowIso });
        
        return { 
          ...v, 
          lastEntry: nowIso, 
          logs, 
          totalTimeMinutes: 0 // Reset daily counter
        };
      } else {
        // Reset "Out" visitors status but keep their logs!
        return { ...v, status: 'out' as const, totalTimeMinutes: 0 };
      }
    }));
    
    // Do NOT clear dirtySkyEvents anymore, they are filtered by date in reports and dashboard
  };
  
  const cleanLogsByPeriod = (minutes: number, groupIds?: string[]) => {
    const cutOff = new Date();
    cutOff.setMinutes(cutOff.getMinutes() - minutes);

    setVisitors(prev => prev.map(v => {
      // Only clean data for users who have status 'out'
      if (v.status !== 'out') return v;

      // Filter by groups if provided
      if (groupIds && groupIds.length > 0) {
        const matchesGroupId = groupIds.includes(v.groupId);
        const matchesGroupName = groupIds.includes(v.group);
        if (!matchesGroupId && !matchesGroupName) return v;
      }

      const logs = v.logs || [];
      const updatedLogs = logs.filter(log => {
        const entryTime = log.in ? new Date(log.in) : null;
        return entryTime && entryTime < cutOff;
      }).map(log => {
        const exitTime = log.out ? new Date(log.out) : null;
        if (exitTime && exitTime >= cutOff) {
          return { ...log, out: undefined };
        }
        return log;
      });

      let lastEntry = v.lastEntry;
      let status = v.status;

      if (lastEntry && new Date(lastEntry) >= cutOff) {
        status = 'out';
        lastEntry = undefined;
      }
      
      if (updatedLogs.length > 0 && !updatedLogs[updatedLogs.length - 1].out) {
        status = 'in';
        lastEntry = updatedLogs[updatedLogs.length - 1].in;
      } else if (updatedLogs.length === 0 || updatedLogs[updatedLogs.length - 1].out) {
        status = 'out';
        lastEntry = undefined;
      }

      // Recalculate totalTimeMinutes based on NEW logs
      const totalTime = updatedLogs.reduce((acc, log) => {
        if (log.in && log.out) {
          return acc + differenceInMinutes(new Date(log.out), new Date(log.in));
        }
        return acc;
      }, 0);

      return { ...v, status, lastEntry, logs: updatedLogs, totalTimeMinutes: totalTime };
    }));
  };

  const cleanCurrentShiftLogs = (groupIds?: string[]) => {
    const now = new Date();
    const shiftStart = new Date(now);
    if (shiftStart.getHours() < 8) {
      shiftStart.setDate(shiftStart.getDate() - 1);
    }
    shiftStart.setHours(8, 0, 0, 0);

    setVisitors(prev => prev.map(v => {
      // Only clean data for users who have status 'out'
      if (v.status !== 'out') return v;

      if (groupIds && groupIds.length > 0) {
         const matchesGroupId = groupIds.includes(v.groupId);
         const matchesGroupName = groupIds.includes(v.group);
         if (!matchesGroupId && !matchesGroupName) return v;
      }

      const logs = v.logs || [];
      const updatedLogs = logs.filter(log => {
        const entryTime = log.in ? new Date(log.in) : null;
        return entryTime && entryTime < shiftStart;
      });

      let status = v.status;
      let lastEntry = v.lastEntry;
      
      // If they were "in" during current shift, they should be "out" after cleaning
      if (lastEntry && new Date(lastEntry) >= shiftStart) {
        status = 'out';
        lastEntry = undefined;
      }
      
      // Check last log of remaining logs
      if (updatedLogs.length > 0 && !updatedLogs[updatedLogs.length - 1].out) {
        status = 'in';
        lastEntry = updatedLogs[updatedLogs.length - 1].in;
      } else {
        status = 'out';
        lastEntry = undefined;
      }

      const totalTime = updatedLogs.reduce((acc, log) => {
        if (log.in && log.out) {
          return acc + differenceInMinutes(new Date(log.out), new Date(log.in));
        }
        return acc;
      }, 0);

      return { ...v, status, lastEntry, logs: updatedLogs, totalTimeMinutes: totalTime };
    }));
  };

  useEffect(() => {
    localStorage.setItem('visitors', JSON.stringify(visitors));
    if (isRemoteUpdateRef.current.visitors) {
      isRemoteUpdateRef.current.visitors = false;
      return;
    }
    realtimeSync.sendUpdate('visitors', visitors);
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem('guards', JSON.stringify(guards));
    if (isRemoteUpdateRef.current.guards) {
      isRemoteUpdateRef.current.guards = false;
      return;
    }
    realtimeSync.sendUpdate('guards', guards);
  }, [guards]);

  useEffect(() => {
    localStorage.setItem('shifts', JSON.stringify(shifts));
    if (isRemoteUpdateRef.current.shifts) {
      isRemoteUpdateRef.current.shifts = false;
      return;
    }
    realtimeSync.sendUpdate('shifts', shifts);
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem('securityShifts', JSON.stringify(securityShifts));
    if (isRemoteUpdateRef.current.securityShifts) {
      isRemoteUpdateRef.current.securityShifts = false;
      return;
    }
    realtimeSync.sendUpdate('securityShifts', securityShifts);
  }, [securityShifts]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
    if (isRemoteUpdateRef.current.categories) {
      isRemoteUpdateRef.current.categories = false;
      return;
    }
    realtimeSync.sendUpdate('categories', categories);
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('locations', JSON.stringify(locations));
    if (isRemoteUpdateRef.current.locations) {
      isRemoteUpdateRef.current.locations = false;
      return;
    }
    realtimeSync.sendUpdate('locations', locations);
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('groups', JSON.stringify(groups));
    if (isRemoteUpdateRef.current.groups) {
      isRemoteUpdateRef.current.groups = false;
      return;
    }
    realtimeSync.sendUpdate('groups', groups);
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('dirtySkyEvents', JSON.stringify(dirtySkyEvents));
    if (isRemoteUpdateRef.current.dirtySkyEvents) {
      isRemoteUpdateRef.current.dirtySkyEvents = false;
      return;
    }
    realtimeSync.sendUpdate('dirtySkyEvents', dirtySkyEvents);
  }, [dirtySkyEvents]);

  useEffect(() => {
    localStorage.setItem('dutyEvents', JSON.stringify(dutyEvents));
    if (isRemoteUpdateRef.current.dutyEvents) {
      isRemoteUpdateRef.current.dutyEvents = false;
      return;
    }
    realtimeSync.sendUpdate('dutyEvents', dutyEvents);
  }, [dutyEvents]);

  useEffect(() => {
    localStorage.setItem('customIcons', JSON.stringify(customIcons));
    if (isRemoteUpdateRef.current.customIcons) {
      isRemoteUpdateRef.current.customIcons = false;
      return;
    }
    realtimeSync.sendUpdate('customIcons', customIcons);
  }, [customIcons]);

  const [reportRetentionHours, setReportRetentionHoursState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('report_retention_hours');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return 1440; // Default: 60 days (1440 hours)
  });

  const setReportRetentionHours = useCallback((hours: number): number => {
    const safe = Math.max(1, Math.round(hours));
    setReportRetentionHoursState(safe);
    localStorage.setItem('report_retention_hours', safe.toString());
    realtimeSync.sendUpdate('reportRetentionHours', safe);

    // Immediately remove logs older than safe hours
    const cutoff = new Date(Date.now() - safe * 60 * 60 * 1000);
    let totalCleared = 0;

    setVisitors(prev => prev.map(v => {
      if (!v.logs || v.logs.length === 0) return v;
      const remaining = v.logs.filter(log => {
        if (!log.in) return false;
        return new Date(log.in) >= cutoff;
      });
      if (remaining.length !== v.logs.length) {
        totalCleared += (v.logs.length - remaining.length);
        const totalTime = remaining.reduce((acc, log) => {
          if (log.in && log.out) {
            return acc + differenceInMinutes(new Date(log.out), new Date(log.in));
          }
          return acc;
        }, 0);
        return { ...v, logs: remaining, totalTimeMinutes: totalTime };
      }
      return v;
    }));

    setDirtySkyEvents(prev => prev.filter(e => new Date(e.startTime) >= cutoff || !e.endTime));
    setDutyEvents(prev => prev.filter(de => new Date(de.timestamp) >= cutoff));

    return totalCleared;
  }, []);

  const purgeReportsByDateRange = useCallback((startDate: string | Date, endDate: string | Date) => {
    const from = typeof startDate === 'string' ? new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00`) : new Date(startDate);
    const to = typeof endDate === 'string' ? new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`) : new Date(endDate);

    let logsCleared = 0;
    let eventsCleared = 0;
    let dutyEventsCleared = 0;

    setVisitors(prev => prev.map(v => {
      if (!v.logs || v.logs.length === 0) return v;

      const remainingLogs = v.logs.filter(log => {
        if (!log.in) return false;
        const logDate = new Date(log.in);
        const isInside = logDate >= from && logDate <= to;
        if (isInside) {
          logsCleared++;
          return false;
        }
        return true;
      });

      if (remainingLogs.length === v.logs.length) return v;

      const totalTime = remainingLogs.reduce((acc, log) => {
        if (log.in && log.out) {
          return acc + differenceInMinutes(new Date(log.out), new Date(log.in));
        }
        return acc;
      }, 0);

      let lastEntry = v.lastEntry;
      let status = v.status;
      if (lastEntry && new Date(lastEntry) >= from && new Date(lastEntry) <= to) {
        if (remainingLogs.length > 0 && !remainingLogs[remainingLogs.length - 1].out) {
          status = 'in';
          lastEntry = remainingLogs[remainingLogs.length - 1].in;
        } else {
          status = 'out';
          lastEntry = undefined;
        }
      }

      return { ...v, status, lastEntry, logs: remainingLogs, totalTimeMinutes: totalTime };
    }));

    setDirtySkyEvents(prev => {
      const remaining = prev.filter(e => {
        const eDate = new Date(e.startTime);
        const isInside = eDate >= from && eDate <= to;
        if (isInside) {
          eventsCleared++;
          return false;
        }
        return true;
      });
      return remaining;
    });

    setDutyEvents(prev => {
      const remaining = prev.filter(de => {
        const deDate = new Date(de.timestamp);
        const isInside = deDate >= from && deDate <= to;
        if (isInside) {
          dutyEventsCleared++;
          return false;
        }
        return true;
      });
      return remaining;
    });

    return { logsCleared, eventsCleared, dutyEventsCleared };
  }, []);

  const purgeAllReports = useCallback(() => {
    let logsCleared = 0;
    let eventsCleared = 0;
    let dutyEventsCleared = 0;

    setVisitors(prev => prev.map(v => {
      logsCleared += (v.logs?.length || 0);
      if (v.status === 'in' && v.lastEntry) {
        return { ...v, logs: [{ in: v.lastEntry }], totalTimeMinutes: 0 };
      }
      return { ...v, logs: [], totalTimeMinutes: 0, lastEntry: undefined, status: 'out' };
    }));

    setDirtySkyEvents(prev => {
      eventsCleared += prev.filter(e => !!e.endTime).length;
      return prev.filter(e => !e.endTime);
    });

    setDutyEvents(prev => {
      dutyEventsCleared += prev.length;
      return [];
    });

    return { logsCleared, eventsCleared, dutyEventsCleared };
  }, []);

  // Data retention: based on reportRetentionHours (default 1440 hours / 60 days)
  useEffect(() => {
    const cutoff = new Date(Date.now() - reportRetentionHours * 60 * 60 * 1000);

    setVisitors(prev => {
      let changed = false;
      const updated = prev.map(v => {
        if (!v.logs) return v;
        const filteredLogs = v.logs.filter(log => {
          const logDate = log.in ? new Date(log.in) : null;
          return logDate && logDate >= cutoff;
        });
        if (filteredLogs.length === v.logs.length) return v;
        changed = true;
        const totalTime = filteredLogs.reduce((acc, log) => {
          if (log.in && log.out) {
            return acc + differenceInMinutes(new Date(log.out), new Date(log.in));
          }
          return acc;
        }, 0);
        return { ...v, logs: filteredLogs, totalTimeMinutes: totalTime };
      });
      return changed ? updated : prev;
    });

    setDirtySkyEvents(prev => {
      const filtered = prev.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate >= cutoff || !event.endTime;
      });
      return filtered.length === prev.length ? prev : filtered;
    });

    setDutyEvents(prev => {
      const filtered = prev.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= cutoff;
      });
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [reportRetentionHours]);

  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem('last_server_backup_time');
      return saved ? new Date(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAutoUploading, setIsAutoUploading] = useState<boolean>(false);
  const [isAutoUploadEnabled, setIsAutoUploadEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('auto_server_backup_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const setIsAutoUploadEnabled = useCallback((enabled: boolean) => {
    setIsAutoUploadEnabledState(enabled);
    try {
      localStorage.setItem('auto_server_backup_enabled', String(enabled));
    } catch {}
  }, []);

  const autoBackupDebounceRef = useRef<any>(null);

  const triggerServerDatabaseSync = useCallback(async (): Promise<boolean> => {
    try {
      setIsAutoUploading(true);
      const payload = {
        visitors,
        guards,
        shifts,
        securityShifts,
        categories,
        groups,
        locations,
        dirtySkyEvents,
        dutyEvents,
        customIcons,
        reportRetentionHours
      };
      const res = await fetch('/api/backup/upload-to-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: payload,
          userEmail: 'auto-database-sync'
        })
      });
      if (res.ok) {
        const now = new Date();
        setLastAutoBackupTime(now);
        try {
          localStorage.setItem('last_server_backup_time', now.toISOString());
        } catch {}
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[AutoBackup] Error syncing database to server:', e);
      return false;
    } finally {
      setIsAutoUploading(false);
    }
  }, [visitors, guards, shifts, securityShifts, categories, groups, locations, dirtySkyEvents, dutyEvents, customIcons, reportRetentionHours]);

  // Automatic upload of updated database to server after ANY change in the database
  useEffect(() => {
    if (!isAutoUploadEnabled) return;

    if (autoBackupDebounceRef.current) {
      clearTimeout(autoBackupDebounceRef.current);
    }

    autoBackupDebounceRef.current = setTimeout(() => {
      triggerServerDatabaseSync();
    }, 1200);

    return () => {
      if (autoBackupDebounceRef.current) {
        clearTimeout(autoBackupDebounceRef.current);
      }
    };
  }, [visitors, guards, shifts, securityShifts, categories, groups, locations, dirtySkyEvents, dutyEvents, customIcons, reportRetentionHours, isAutoUploadEnabled, triggerServerDatabaseSync]);

  return (
    <DataContext.Provider value={{ 
      visitors, setVisitors, 
      guards, setGuards, 
      shifts, setShifts, 
      securityShifts, setSecurityShifts, 
      categories, setCategories, 
      groups, setGroups, 
      locations, setLocations, 
      dirtySkyEvents, startDirtySky, endDirtySky,
      dutyEvents, setDutyEvents, addDutyEvent,
      customIcons, setCustomIcons,
      performShiftBackupAndReset, cleanLogsByPeriod, cleanCurrentShiftLogs,
      reportRetentionHours, setReportRetentionHours, purgeReportsByDateRange, purgeAllReports,
      syncStatus, onlineClientsCount,
      lastAutoBackupTime, isAutoUploading, isAutoUploadEnabled, setIsAutoUploadEnabled, triggerServerDatabaseSync,
      stopList, setStopList, addToStopList, removeFromStopList,
      checkpoints, setCheckpoints, updateCheckpointStatus,
      auditLogs, addAuditLog,
      encryptionStatus, verifyEncryptionIntegrity, fetchEncryptionStatus
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
