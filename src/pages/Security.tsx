import React, { useState, useEffect } from 'react';
import { useData } from '../store/DataContext';
import { useToast } from '../store/ToastContext';
import { 
  ShieldAlert, Plus, Play, Square, Trash2, Settings, Users, X, Check, 
  ArrowRightLeft, Clock, ShieldCheck, AlertCircle, MapPin, Building2, 
  AlertOctagon, Activity, Search, Shield, Filter, Car, FileBadge
} from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { formatNameAbbreviated } from '../utils/nameUtils';
import VisitorCard from '../components/VisitorCard';

export default function Security() {
  const { 
    visitors, securityShifts, setSecurityShifts, shifts, setShifts, 
    performShiftBackupAndReset, dirtySkyEvents, customIcons, addDutyEvent,
    groups, locations, stopList, addToStopList, removeFromStopList,
    checkpoints, updateCheckpointStatus, auditLogs
  } = useData();
  const { showToast } = useToast();
  
  const activeDirtySky = dirtySkyEvents.find(e => !e.endTime);
  
  const [activeTab, setActiveTab] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeTab && securityShifts.length > 0) {
      setActiveTab(securityShifts[0].id);
    } else if (securityShifts.length > 0 && !securityShifts.find(s => s.id === activeTab)) {
      setActiveTab(securityShifts[0].id);
    }
  }, [securityShifts, activeTab]);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftNameInput, setShiftNameInput] = useState('');
  const [rosterSelection, setRosterSelection] = useState<string[]>([]);
  
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState('');

  const [subSection, setSubSection] = useState<'shifts' | 'checkpoints' | 'stoplist' | 'audit'>('shifts');

  // Stop-list state
  const [isStopListModalOpen, setIsStopListModalOpen] = useState(false);
  const [stopName, setStopName] = useState('');
  const [stopCallsign, setStopCallsign] = useState('');
  const [stopDoc, setStopDoc] = useState('');
  const [stopPlate, setStopPlate] = useState('');
  const [stopReason, setStopReason] = useState('');
  const [stopSeverity, setStopSeverity] = useState<'critical' | 'warning' | 'info'>('warning');
  const [stopSearch, setStopSearch] = useState('');

  // Audit filter state
  const [auditFilter, setAuditFilter] = useState<'all' | 'auth' | 'visitor' | 'security' | 'backup' | 'encryption'>('all');

  const handleAddStopItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopName.trim() || !stopReason.trim()) {
      showToast('Вкажіть ім\'я та причину орієнтування', 'error');
      return;
    }
    const res = await addToStopList({
      name: stopName.trim(),
      callsign: stopCallsign.trim() || undefined,
      documentNumber: stopDoc.trim() || undefined,
      vehiclePlate: stopPlate.trim() || undefined,
      reason: stopReason.trim(),
      severity: stopSeverity,
      addedBy: 'Охорона',
      active: true
    });
    if (res) {
      showToast(`Орієнтування на "${res.name}" додано до стоп-листа`, 'success');
      setIsStopListModalOpen(false);
      setStopName('');
      setStopCallsign('');
      setStopDoc('');
      setStopPlate('');
      setStopReason('');
    }
  };

  const handleRemoveStopItem = async (id: string, name: string) => {
    const ok = await removeFromStopList(id);
    if (ok) {
      showToast(`Орієнтування на "${name}" знято`, 'info');
    }
  };

  const activeShift = securityShifts.find(s => s.id === activeTab);

  const executeHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTarget) return;

    const now = new Date().toISOString();
    
    // End all active guard work sessions across ALL shifts to be safe
    setShifts(prev => prev.map(s => s.endTime ? s : { ...s, endTime: now }));

    // Start work sessions for the target group's guards
    const targetGroup = securityShifts.find(s => s.id === handoverTarget);
    if (targetGroup) {
      const newShifts = targetGroup.visitorIds.map(id => ({
        id: Date.now().toString() + '-' + id + '-' + Math.random(),
        guardId: id,
        startTime: now,
        restPeriods: []
      }));
      
      setTimeout(() => {
        setShifts(prev => [...prev, ...newShifts]);
        setActiveTab(targetGroup.id);
        showToast(`Чергову зміну передано групі: ${targetGroup.name}`, 'success');
      }, 50);

      setSecurityShifts(prev => prev.map(s => ({
        ...s,
        status: s.id === targetGroup.id ? 'active' : 'inactive'
      })));

      if (activeShift) {
        addDutyEvent(activeShift.id, activeShift.name, 'end', now);
      }
      addDutyEvent(targetGroup.id, targetGroup.name, 'start', now);
    }
    
    performShiftBackupAndReset();
    setIsHandoverModalOpen(false);
  };

  const openAddModal = () => {
    setEditingShiftId(null);
    setShiftNameInput('');
    setRosterSelection([]);
    setIsShiftModalOpen(true);
  };

  const openEditModal = (shift: any) => {
    setEditingShiftId(shift.id);
    setShiftNameInput(shift.name);
    setRosterSelection(shift.visitorIds);
    setIsShiftModalOpen(true);
  };

  const saveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftNameInput.trim()) return;
    
    if (editingShiftId) {
      setSecurityShifts(prev => prev.map(s => s.id === editingShiftId ? { ...s, name: shiftNameInput, visitorIds: rosterSelection } : s));
      showToast('Зміни в черговій зміні збережено', 'success');
    } else {
      const newId = Date.now().toString();
      setSecurityShifts(prev => [...prev, { id: newId, name: shiftNameInput, visitorIds: rosterSelection }]);
      setActiveTab(newId);
      showToast(`Чергову зміну "${shiftNameInput}" створено`, 'success');
    }
    setIsShiftModalOpen(false);
  };

  const deleteShift = (id: string) => {
    setShiftToDelete(id);
  };

  const confirmDeleteShift = () => {
    if (shiftToDelete) {
      const shift = securityShifts.find(s => s.id === shiftToDelete);
      setSecurityShifts(prev => prev.filter(s => s.id !== shiftToDelete));
      showToast(`Чергову зміну "${shift?.name || ''}" видалено`, 'info');
      setShiftToDelete(null);
    }
  };

  const toggleRosterSelection = (id: string) => {
    setRosterSelection(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const getActiveWorkSession = (guardId: string) => {
    return shifts.find(s => s.guardId === guardId && !s.endTime);
  };

  const stopShiftWorkSession = () => {
    if (!activeShift) return;
    const now = new Date().toISOString();
    
    // Stop all active guard sessions
    setShifts(prev => prev.map(s => s.endTime ? s : { ...s, endTime: now }));

    // Update shift statuses to inactive
    setSecurityShifts(prev => prev.map(s => ({ ...s, status: 'inactive' })));

    // Record in reports: which shift and at what time finished duty
    addDutyEvent(activeShift.id, activeShift.name, 'end', now);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    showToast(`Чергування зміни "${activeShift.name}" зупинено о ${timeStr}`, 'info');
  };

  const startShiftWorkSession = () => {
    if (!activeShift) return;
    const now = new Date().toISOString();
    
    // Set endTime for all guards from previous shifts who are currently active
    setShifts(prev => {
      const endedShifts = prev.map(s => s.endTime ? s : { ...s, endTime: now });

      const newShifts = (activeShift.visitorIds || []).map((guardId, i) => ({
        id: Date.now().toString() + i + '-' + Math.random(),
        guardId: guardId,
        startTime: now,
        restPeriods: []
      }));

      return [...endedShifts, ...newShifts];
    });

    // Mark this shift as active and others as inactive
    setSecurityShifts(prev => prev.map(s => ({
      ...s,
      status: s.id === activeShift.id ? 'active' : 'inactive'
    })));

    // Record in reports: which shift and at what time started duty
    addDutyEvent(activeShift.id, activeShift.name, 'start', now);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    showToast(`Зміна "${activeShift.name}" заступила на чергування о ${timeStr}`, 'success');
  };

  // Find the sessions for the active shift's guards
  const getActiveShiftSessions = () => {
    if (!activeShift) return [];
    return shifts.filter(s => activeShift.visitorIds.includes(s.guardId) && !s.endTime);
  };

  const getFinishedShiftSessions = () => {
    if (!activeShift) return [];
    const groupShifts = shifts.filter(s => activeShift.visitorIds.includes(s.guardId) && s.endTime).sort((a,b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime());
    if (groupShifts.length === 0) return [];
    const lastEnd = new Date(groupShifts[0].endTime!).getTime();
    return groupShifts.filter(s => Math.abs(new Date(s.endTime!).getTime() - lastEnd) < 60000);
  };

  const activeSessions = getActiveShiftSessions();
  const finishedSessions = getFinishedShiftSessions();

  const formatDuration = (start: string, end?: string) => {
    const min = differenceInMinutes(end ? new Date(end) : new Date(), new Date(start));
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}г ${m}хв`;
  };

  const shiftVisitors = visitors.filter(v => activeShift?.visitorIds.includes(v.id));
  const isShiftOnDuty = activeSessions.length > 0 || activeShift?.status === 'active';
  const isAnyShiftOnDuty = securityShifts.some(s => s.status === 'active') || shifts.some(s => !s.endTime);
  const isAfter600 = currentTime.getHours() >= 6;
  const allGuardsIn = shiftVisitors.length > 0 && shiftVisitors.every(guard => guard.status === 'in');
  const guardsOnLocationCount = shiftVisitors.filter(guard => guard.status === 'in').length;
  
  const isAnyOtherShiftReady = securityShifts.some(s => 
    s.id !== activeShift?.id && 
    s.visitorIds.length > 0 && 
    s.visitorIds.every(id => visitors.find(v => v.id === id)?.status === 'in')
  );

  const canHandover = isShiftOnDuty && isAfter600 && allGuardsIn && isAnyOtherShiftReady;

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-1 sm:px-0">
      {/* Security Operations Sub-Navigation Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        <button
          type="button"
          onClick={() => setSubSection('shifts')}
          className={`h-9 px-3.5 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subSection === 'shifts'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]'
              : 'bg-card text-muted-foreground hover:bg-muted border border-border'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Чергові зміни ({securityShifts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubSection('checkpoints')}
          className={`h-9 px-3.5 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subSection === 'checkpoints'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]'
              : 'bg-card text-muted-foreground hover:bg-muted border border-border'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Моніторинг КПП ({checkpoints.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubSection('stoplist')}
          className={`h-9 px-3.5 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subSection === 'stoplist'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]'
              : 'bg-card text-muted-foreground hover:bg-muted border border-border'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
          <span>Стоп-лист / Орієнтування ({stopList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubSection('audit')}
          className={`h-9 px-3.5 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            subSection === 'audit'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]'
              : 'bg-card text-muted-foreground hover:bg-muted border border-border'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Журнал аудиту ({auditLogs.length})</span>
        </button>
      </div>

      {subSection === 'shifts' && (
        <>
          {/* Top Shift Tabs - Compact & Adaptive */}
          <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 hide-scrollbar snap-x items-center">
        {securityShifts.map(s => {
          const shiftActive = shifts.some(session => s.visitorIds.includes(session.guardId) && !session.endTime) || s.status === 'active';
          return (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all shadow-2xs snap-start flex items-center gap-2 cursor-pointer ${
                activeTab === s.id 
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold' 
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <span>{s.name}</span>
              {shiftActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="На чергуванні" />
              )}
            </button>
          );
        })}
        <button 
          onClick={openAddModal} 
          className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium bg-card text-muted-foreground hover:bg-muted/80 hover:text-foreground whitespace-nowrap flex items-center gap-1.5 transition-colors snap-start shrink-0 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5"/>
          <span>Нова зміна</span>
        </button>
      </div>

      {activeShift ? (
        <>
          {/* Active Shift Console - Borderless & Clean */}
          <div className="bg-card rounded-2xl shadow-xs p-3.5 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
              {/* Left Column: Shift Name, Status & Metrics */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold truncate text-foreground">{activeShift.name}</h2>
                  {isShiftOnDuty ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      На чергуванні
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-muted text-muted-foreground">
                      Не на чергуванні
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Склад чергової зміни: <strong>{activeShift.visitorIds.length}</strong></span>
                  </span>
                </div>
              </div>

              {/* Right Column: Actions Toolbar */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
                {isShiftOnDuty ? (
                  <>
                    <button 
                      onClick={stopShiftWorkSession}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all text-xs shadow-xs active:scale-95 cursor-pointer"
                      title="Зупинити чергування цієї зміни"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Зупинити</span>
                    </button>
                    <button 
                      onClick={() => {
                        setHandoverTarget('');
                        setIsHandoverModalOpen(true);
                      }}
                      disabled={!canHandover}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 font-semibold rounded-xl transition-all text-xs shadow-xs cursor-pointer ${
                        canHandover 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none'
                      }`}
                      title={!canHandover ? (!isShiftOnDuty ? "Зміна не на посту" : !isAfter600 ? "Передача можлива тільки після 06:00" : !allGuardsIn ? "Не всі охоронці поточної зміни на локації" : !isAnyOtherShiftReady ? "Немає іншої групи, де всі охоронці зайшли" : "") : "Передати чергову зміну іншій групі"}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Передати зміну</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startShiftWorkSession}
                    disabled={isAnyShiftOnDuty && !isShiftOnDuty}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      !isAnyShiftOnDuty || isShiftOnDuty
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95 cursor-pointer'
                        : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none'
                    }`}
                    title={isAnyShiftOnDuty ? "Інша зміна вже на чергуванні. Спочатку зупиніть її чергування або здійсніть передачу" : "Заступити на чергування"}
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Заступити</span>
                  </button>
                )}

                <button 
                  onClick={() => openEditModal(activeShift)} 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors text-xs cursor-pointer"
                  title="Налаштування складу зміни"
                >
                  <Settings className="w-3.5 h-3.5"/>
                  <span className="hidden sm:inline">Склад</span>
                </button>
                
                <button 
                  onClick={() => deleteShift(activeShift.id)} 
                  className="p-1.5 sm:p-2 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors cursor-pointer"
                  title="Видалити чергову зміну"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            </div>

            {/* Bottom Status Panel */}
            <div className="mt-3.5 pt-3">
              {isShiftOnDuty ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {(() => {
                    const firstStart = activeSessions.sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]?.startTime || new Date().toISOString();
                    const now = new Date();
                    const shiftStart = new Date(now);
                    if (now.getHours() < 8) shiftStart.setDate(shiftStart.getDate() - 1);
                    shiftStart.setHours(8, 0, 0, 0);
                    const effectiveStart = new Date(firstStart) > shiftStart ? new Date(firstStart) : shiftStart;
                    
                    return (
                      <>
                        <div className="flex items-center justify-between bg-emerald-500/10 px-3.5 py-2.5 rounded-xl">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600/80 block">Початок чергування</span>
                            <span className="text-foreground font-bold text-sm sm:text-base font-mono">
                              {new Date(firstStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-emerald-600" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-primary/10 px-3.5 py-2.5 rounded-xl">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-primary/80 block">Тривалість</span>
                            <span className="text-foreground font-bold text-sm sm:text-base font-mono">
                              {formatDuration(effectiveStart.toISOString())}
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-muted/60 px-3.5 py-2.5 rounded-xl sm:col-span-2 lg:col-span-1">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Готовність до передачі</span>
                            <span className={`text-xs font-semibold ${canHandover ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                              {canHandover ? '✓ Можна передати іншій групі' : 'Очікування умов передачі'}
                            </span>
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${canHandover ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/30 px-3.5 py-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                    <span>
                      {!isAnyShiftOnDuty 
                        ? 'Чергування зупинено. Натисніть «Заступити», щоб розпочати зміну.' 
                        : 'Група очікує чергової зміни (інша зміна зараз на посту).'}
                    </span>
                  </div>
                  {finishedSessions.length > 0 && (
                    <span className="text-[11px] font-mono text-muted-foreground/80 shrink-0 hidden sm:inline">
                      Попередня зміна: {formatDuration(finishedSessions[0].startTime, finishedSessions[0].endTime)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Guards Grid - Strictly 3 Columns & Borderless Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
            {shiftVisitors.map(guard => {
              const activeWorkSession = getActiveWorkSession(guard.id);
              const customIcon = customIcons.find(icon => icon.id === guard.customIconId);
              const guardGroup = groups?.find(g => g.id === guard.groupId) || groups?.find(g => g.name === guard.group);
              const guardLocation = locations?.find(l => l.id === guard.locationId) || locations?.find(l => l.name === guard.location);
              
              return (
                <VisitorCard
                  key={guard.id}
                  visitor={guard}
                  group={guardGroup}
                  location={guardLocation}
                  customIcon={customIcon}
                  mode="security"
                  activeWorkSession={activeWorkSession}
                  activeDirtySky={activeDirtySky}
                />
              );
            })}

            {shiftVisitors.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground rounded-2xl bg-muted/20 text-xs sm:text-sm">
                У цій черговій зміні поки що немає чергових співробітників. Додайте їх у налаштуваннях складу.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="py-12 sm:py-16 text-center text-muted-foreground bg-card rounded-2xl shadow-xs p-4">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-50 text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">Чергові зміни не знайдені</p>
          <p className="text-xs sm:text-sm mt-1 text-muted-foreground">Створіть нову чергову зміну для початку роботи</p>
          <button 
            onClick={openAddModal} 
            className="mt-4 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            Створити чергову зміну
          </button>
        </div>
      )}
        </>
      )}

      {/* SUB-SECTION 2: Checkpoints Monitoring */}
      {subSection === 'checkpoints' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span>Оперативні пости та КПП</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Моніторинг робочого стану пропускних пунктів, постів та чергових змін
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Активних постів:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {checkpoints.filter(c => c.status === 'active').length} з {checkpoints.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {checkpoints.map(cp => {
              const statusColors = {
                active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                standby: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
                alert: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse',
                closed: 'bg-muted text-muted-foreground border-border'
              };

              const statusLabels = {
                active: 'АКТИВНИЙ',
                standby: 'ЧЕРГОВИЙ',
                alert: 'ТРИВОГА / ПОСИЛЕНО',
                closed: 'ЗАКРИТО'
              };

              return (
                <div key={cp.id} className="p-4 sm:p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between space-y-3.5">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-foreground truncate">{cp.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>{cp.location}</span>
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${statusColors[cp.status]}`}>
                        {statusLabels[cp.status]}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Остання активність:</span>
                        <span className="font-mono text-foreground">{new Date(cp.lastActivity).toLocaleTimeString('uk-UA')}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Поточна зміна:</span>
                        <span className="font-medium text-foreground">{activeShift?.name || 'Не призначено'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Status Control Buttons */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Режим:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateCheckpointStatus(cp.id, { status: 'active' });
                          showToast(`${cp.name}: переведено в активний режим`, 'success');
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          cp.status === 'active' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        Норма
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateCheckpointStatus(cp.id, { status: 'alert' });
                          showToast(`🚨 ${cp.name}: ОГОЛОШЕНО ПОСИЛЕНИЙ РЕЖИМ!`, 'error');
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          cp.status === 'alert' ? 'bg-rose-600 text-white shadow-xs animate-pulse' : 'bg-muted hover:bg-rose-500/20 text-rose-500'
                        }`}
                      >
                        Тривога
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateCheckpointStatus(cp.id, { status: cp.status === 'closed' ? 'active' : 'closed' });
                          showToast(`${cp.name}: статус змінено`, 'info');
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          cp.status === 'closed' ? 'bg-muted-foreground text-background' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        {cp.status === 'closed' ? 'Відкрити' : 'Закрити'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-SECTION 3: Tactical Stop-List & Watchlist */}
      {subSection === 'stoplist' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                <span>Оперативне орієнтування та Стоп-лист</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Особи та транспортні засоби, що підлягають обмеженню входу або особливій увазі на КПП
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsStopListModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Додати орієнтування</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Швидкий пошук за ПІБ, позивним, номером документа або номером авто..."
              value={stopSearch}
              onChange={e => setStopSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
            />
          </div>

          {/* Stop-List Cards */}
          {stopList.filter(item => {
            if (!stopSearch.trim()) return true;
            const q = stopSearch.toLowerCase();
            return item.name.toLowerCase().includes(q) ||
                   (item.callsign && item.callsign.toLowerCase().includes(q)) ||
                   (item.vehiclePlate && item.vehiclePlate.toLowerCase().includes(q)) ||
                   (item.documentNumber && item.documentNumber.toLowerCase().includes(q)) ||
                   item.reason.toLowerCase().includes(q);
          }).length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-dashed border-border p-4">
              {stopSearch ? 'Нічого не знайдено за вашим пошуковим запитом' : 'Стоп-лист порожній. Всі відвідувачі мають штатний статус.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stopList.filter(item => {
                if (!stopSearch.trim()) return true;
                const q = stopSearch.toLowerCase();
                return item.name.toLowerCase().includes(q) ||
                       (item.callsign && item.callsign.toLowerCase().includes(q)) ||
                       (item.vehiclePlate && item.vehiclePlate.toLowerCase().includes(q)) ||
                       (item.documentNumber && item.documentNumber.toLowerCase().includes(q)) ||
                       item.reason.toLowerCase().includes(q);
              }).map(item => {
                const severityColors = {
                  critical: 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400',
                  warning: 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400',
                  info: 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                };

                return (
                  <div key={item.id} className="p-4 bg-card border border-border rounded-2xl shadow-xs space-y-2.5 relative group hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-foreground">{item.name}</h4>
                          {item.callsign && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-foreground font-mono font-bold">
                              «{item.callsign}»
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${severityColors[item.severity]}`}>
                            {item.severity === 'critical' ? 'Критично (Заборонено)' : item.severity === 'warning' ? 'Увага' : 'Інформація'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {item.vehiclePlate && (
                            <span className="flex items-center gap-1 font-mono text-foreground font-semibold">
                              <Car className="w-3.5 h-3.5 text-primary" />
                              {item.vehiclePlate}
                            </span>
                          )}
                          {item.documentNumber && (
                            <span className="flex items-center gap-1 font-mono text-muted-foreground">
                              <FileBadge className="w-3.5 h-3.5 text-muted-foreground" />
                              Док: {item.documentNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStopItem(item.id, item.name)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        title="Зняти орієнтування"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">Підстава:</span>
                      <p className="text-foreground leading-relaxed font-medium">{item.reason}</p>
                    </div>

                    <div className="text-[10px] text-muted-foreground flex justify-between pt-1">
                      <span>Вніс: {item.addedBy}</span>
                      <span>{new Date(item.addedAt).toLocaleString('uk-UA')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-SECTION 4: Tamper-Evident Server Audit Log */}
      {subSection === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <span>Серверний журнал аудиту та безпеки</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Хронологічний реєстр дій персоналу, авторизацій, змін статусів та криптографічних операцій
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Запис захищено сервером</span>
            </div>
          </div>

          {/* Audit Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {[
              { id: 'all', label: 'Всі події' },
              { id: 'auth', label: 'Авторизація' },
              { id: 'visitor', label: 'КПП / Прохід' },
              { id: 'security', label: 'Охорона' },
              { id: 'backup', label: 'Бекапи' },
              { id: 'encryption', label: 'Шифрування' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAuditFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  auditFilter === tab.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-card text-muted-foreground hover:bg-muted border border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Audit Log Table / List */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs divide-y divide-border/60">
            {auditLogs.filter(log => auditFilter === 'all' || log.category === auditFilter).length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground p-4">
                Поки що немає записів у цій категорії
              </div>
            ) : (
              auditLogs.filter(log => auditFilter === 'all' || log.category === auditFilter).map(log => {
                const statusDots = {
                  success: 'bg-emerald-500',
                  warning: 'bg-amber-500',
                  error: 'bg-rose-500',
                  info: 'bg-blue-500'
                };

                return (
                  <div key={log.id} className="p-3 sm:px-4 flex items-start justify-between gap-3 text-xs hover:bg-muted/40 transition-colors">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDots[log.status] || 'bg-muted-foreground'}`} />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">{log.action}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase">
                            {log.category}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed">{log.details}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-[11px] font-medium text-foreground block">
                        {new Date(log.timestamp).toLocaleTimeString('uk-UA')}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[120px]">
                        {log.userName}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal: Add to Stop-List */}
      {isStopListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-border p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                <span>Нове оперативне орієнтування</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsStopListModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStopItem} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  ПІБ особи або опис <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Іванов Петро Сергійович"
                  value={stopName}
                  onChange={e => setStopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Позивний
                  </label>
                  <input
                    type="text"
                    placeholder="«Стріла»"
                    value={stopCallsign}
                    onChange={e => setStopCallsign(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Номер авто / ТЗ
                  </label>
                  <input
                    type="text"
                    placeholder="АА 1234 ВВ"
                    value={stopPlate}
                    onChange={e => setStopPlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Рівень орієнтування
                </label>
                <select
                  value={stopSeverity}
                  onChange={e => setStopSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="critical">Критичний (Заборона входу / Затримання)</option>
                  <option value="warning">Попередження (Особливий контроль)</option>
                  <option value="info">Інформаційний (Доповідь черговому)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Причина / Підстава <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Вкажіть причину внесення, розпорядження чи орієнтування..."
                  value={stopReason}
                  onChange={e => setStopReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStopListModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                >
                  Зберегти в стоп-лист
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Add/Edit Shift - Adaptive & Responsive */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg max-h-[92dvh] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-border/70 flex items-center justify-between shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                {editingShiftId ? 'Налаштування чергової зміни' : 'Створити нову чергову зміну'}
              </h2>
              <button 
                type="button" 
                onClick={() => setIsShiftModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Закрити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={saveShift} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    Назва чергової зміни *
                  </label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={shiftNameInput}
                    onChange={e => setShiftNameInput(e.target.value)}
                    placeholder="Наприклад: Зміна 1 (Денна)"
                    className="w-full px-3.5 py-2 border border-border bg-background rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[40px]"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      Склад чергових ({rosterSelection.length} обрано)
                    </label>
                  </div>
                  
                  <div className="border border-border/80 rounded-xl bg-background/50 divide-y divide-border/40 max-h-56 sm:max-h-64 overflow-y-auto">
                    {visitors.filter(v => (v.groupId === '3' || (v.group || '').toLowerCase().includes('охорон') || (v.group || '').toLowerCase().includes('рота') || (v.category || '').toLowerCase().includes('охорон') || (v.location || '').toLowerCase().includes('охорон')) && v.name !== 'Невідомий').length === 0 ? (
                      <p className="text-center text-muted-foreground p-4 text-xs">Немає співробітників з групи охорони або роти</p>
                    ) : (
                      visitors.filter(v => (v.groupId === '3' || (v.group || '').toLowerCase().includes('охорон') || (v.group || '').toLowerCase().includes('рота') || (v.category || '').toLowerCase().includes('охорон') || (v.location || '').toLowerCase().includes('охорон')) && v.name !== 'Невідомий').map(v => {
                        const isChecked = rosterSelection.includes(v.id);
                        return (
                          <label key={v.id} className="flex items-center gap-3 p-2.5 sm:p-3 hover:bg-muted/60 cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleRosterSelection(v.id)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary/50 accent-primary cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">{v.category || 'Черговий'}</span>
                              <span className="font-medium text-xs sm:text-sm text-foreground truncate block">{formatNameAbbreviated(v.name)}</span>
                            </div>
                            {v.status === 'in' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold shrink-0">
                                На локації
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-border/70 bg-muted/20 shrink-0 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                >
                  Скасувати
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary/90 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Зберегти</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Handover Shift - Adaptive & Responsive */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-md max-h-[92dvh] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-border/70 flex items-center justify-between shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="w-4.5 h-4.5 text-primary" />
                <span>Передати чергову зміну</span>
              </h2>
              <button 
                type="button" 
                onClick={() => setIsHandoverModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={executeHandover} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Ця дія завершить чергування співробітників поточної зміни та передасть чергування обраній групі.
                </p>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                    Оберіть зміну для прийому чергування *
                  </label>
                  <select 
                    required
                    value={handoverTarget}
                    onChange={e => setHandoverTarget(e.target.value)}
                    className="w-full px-3.5 py-2 border border-border bg-background rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[40px] cursor-pointer"
                  >
                    <option value="">Виберіть групу...</option>
                    {securityShifts.filter(s => s.id !== activeShift?.id).map((s, idx) => (
                      <option key={s.id ? `sec-shift-${s.id}` : `sec-shift-idx-${idx}`} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {handoverTarget && (() => {
                  const targetShift = securityShifts.find(s => s.id === handoverTarget);
                  if (!targetShift) return null;
                  const missingGuards = targetShift.visitorIds
                    .filter(id => visitors.find(v => v.id === id)?.status !== 'in')
                    .map(id => formatNameAbbreviated(visitors.find(v => v.id === id)?.name || 'Невідомий'));
                  
                  if (missingGuards.length > 0) {
                    return (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Зміна не готова до прийому!</span>
                        </p>
                        <p className="text-[11px] opacity-90">Наступні співробітники ще не зайшли на КПП:</p>
                        <ul className="list-disc pl-4 text-[11px] opacity-90 space-y-0.5">
                          {missingGuards.map((name, i) => <li key={i}>{name}</li>)}
                        </ul>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
                      <p className="font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Всі співробітники зміни присутні на локації</span>
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-border/70 bg-muted/20 shrink-0 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                >
                  Скасувати
                </button>
                <button 
                  type="submit"
                  disabled={!handoverTarget || (handoverTarget && securityShifts.find(s => s.id === handoverTarget)?.visitorIds.some(id => visitors.find(v => v.id === id)?.status !== 'in'))}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Передати</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Shift Confirmation - Adaptive & Responsive */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-border p-4 sm:p-5 text-center my-auto animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Видалити чергову зміну?</h2>
            <p className="text-xs text-muted-foreground mt-1.5 mb-5 leading-relaxed">
              Ви впевнені, що хочете видалити цю чергову зміну? Історію та дані чергувань буде збережено.
            </p>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setShiftToDelete(null)}
                className="flex-1 py-2 px-3 border border-border rounded-xl text-xs font-semibold hover:bg-muted text-muted-foreground transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button 
                type="button"
                onClick={confirmDeleteShift}
                className="flex-1 py-2 px-3 bg-destructive text-destructive-foreground rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-destructive/90 shadow-sm transition-all cursor-pointer"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
