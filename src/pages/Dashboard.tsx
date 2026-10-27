import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../store/DataContext';
import { useToast } from '../store/ToastContext';
import { Users, User, Clock, X, Search, Mic, MicOff, LogIn, LogOut, Play, Square, CloudRain, TriangleAlert, CheckCircle2 } from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';
import { formatNameAbbreviated, splitNameTwoLines } from '../utils/nameUtils';
import { 
  parseVoiceCommand, 
  matchVisitorVoice 
} from '../utils/voiceCommandUtils';
import { Visitor } from '../types';
import { isSpecialVisitor, compareVisitorsSpecialFirst } from '../utils/visitorUtils';
import VisitorCard from '../components/VisitorCard';
import { useAuth } from '../store/AuthContext';

export default function Dashboard() {
  const { 
    visitors, setVisitors, groups, categories, shifts, securityShifts,
    dirtySkyEvents, startDirtySky, endDirtySky, customIcons, locations
  } = useData();
  const { showToast } = useToast();
  const { hasPermission, currentRole } = useAuth();

  const canCheckInOut = hasPermission('visitors.check_in_out') || hasPermission('dashboard.actions') || currentRole?.id === 'admin';
  const canToggleDirtySky = hasPermission('security.dirty_sky') || currentRole?.id === 'admin';

  const [currentTime, setCurrentTime] = useState(new Date());
  const [modalType, setModalType] = useState<'entered' | 'exited' | 'on_location' | 'unique_visitors' | 'all_visits' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  const [selectedVoiceVisitor, setSelectedVoiceVisitor] = useState<Visitor | null>(null);
  const selectedVoiceVisitorRef = useRef<Visitor | null>(null);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    selectedVoiceVisitorRef.current = selectedVoiceVisitor;
  }, [selectedVoiceVisitor]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update selectedVoiceVisitor whenever visitors update (e.g. status changes)
  useEffect(() => {
    if (selectedVoiceVisitor) {
      const updated = visitors.find(v => v.id === selectedVoiceVisitor.id);
      if (updated && updated.status !== selectedVoiceVisitor.status) {
        setSelectedVoiceVisitor(updated);
      }
    }
  }, [visitors, selectedVoiceVisitor]);

  const matchesSearch = (name: string, callsign: string | undefined, searchStr: string, category?: string) => {
    return matchVisitorVoice({ name, callsign, category } as any, searchStr);
  };

  const executeCommand = (nameQuery: string, action: 'in' | 'out', triggerWord?: string) => {
    if (!!activeDirtySky) return;
    
    let targetVisitor: Visitor | undefined = undefined;

    // 1. If a name was explicitly spoken with the command
    if (nameQuery && nameQuery.trim()) {
      const matching = visitors.filter(v => matchVisitorVoice(v, nameQuery));
      if (matching.length > 0) {
        targetVisitor = matching[0];
      }
    }

    // 2. If no target yet, use the visitor previously found by voice search
    if (!targetVisitor && selectedVoiceVisitorRef.current) {
      targetVisitor = visitors.find(v => v.id === selectedVoiceVisitorRef.current?.id) || selectedVoiceVisitorRef.current;
    }

    // 3. If still no target, check current search input
    if (!targetVisitor && latestSearch.current && latestSearch.current.trim()) {
      const matching = visitors.filter(v => matchVisitorVoice(v, latestSearch.current));
      if (matching.length > 0) {
        targetVisitor = matching[0];
      }
    }

    // 4. If still no target, check if exactly one visitor is in search results
    if (!targetVisitor) {
      const filteredCurrent = visitors.filter(v => searchQuery.trim() ? matchesSearch(v.name, v.callsign, searchQuery) : false);
      if (filteredCurrent.length === 1) {
        targetVisitor = filteredCurrent[0];
      }
    }

    if (!targetVisitor) {
      if (nameQuery && nameQuery.trim()) {
        showToast(`Голосова команда: Користувача "${nameQuery}" не знайдено`, 'info');
      } else {
        showToast('Спочатку назвіть прізвище або оберіть користувача, потім скажіть «ПЛЮС» чи «МІНУС»', 'info');
      }
      return;
    }

    if (!canCheckInOut) {
      showToast('У вашої ролі немає дозволу на облік входу/виходу відвідувачів у матриці прав', 'error');
      return;
    }

    // Execute the action
    if (action === 'in') {
      markIn(targetVisitor.id);
    } else {
      markOut(targetVisitor.id);
    }

    // Keep visitor selected briefly then clear
    setSelectedVoiceVisitor(targetVisitor);
    setTimeout(() => {
      setSearchQuery('');
      setSelectedVoiceVisitor(null);
    }, 2500);
  };

  const markIn = (id: string | string[]) => {
    if (!canCheckInOut) {
      showToast('У вашої ролі немає дозволу на облік входу/виходу відвідувачів у матриці прав', 'error');
      return;
    }
    const ids = Array.isArray(id) ? id : [id];
    const now = new Date().toISOString();
    
    // Find visitors to show toast for
    if (ids.length === 1) {
      const v = visitors.find(vis => vis.id === ids[0]);
      if (v) {
        if (v.status === 'in') {
          showToast(`ℹ️ ${v.name} вже на локації (ВХІД)`, 'info');
        } else {
          showToast(`🎙️ ${v.name}: ЗАЙШОВ (+)`, 'success');
        }
      }
    } else if (ids.length > 1) {
      showToast(`Успішно зайшло: ${ids.length} осіб`, 'success');
    }

    setVisitors(prev => prev.map(v => {
      if (!ids.includes(v.id)) return v;
      if (v.status === 'in') return v;
      
      const logs = v.logs ? [...v.logs] : (v.lastEntry ? [{ in: v.lastEntry }] : []);
      // Push new entry if last one is complete
      if (logs.length === 0 || logs[logs.length - 1].out) {
        logs.push({ in: now });
      }
      
      return { ...v, status: 'in', lastEntry: now, logs };
    }));
  };

  const markOut = (id: string | string[]) => {
    if (!canCheckInOut) {
      showToast('У вашої ролі немає дозволу на облік входу/виходу відвідувачів у матриці прав', 'error');
      return;
    }
    const ids = Array.isArray(id) ? id : [id];
    const now = new Date().toISOString();
    
    // Find visitors to show toast for
    if (ids.length === 1) {
      const v = visitors.find(vis => vis.id === ids[0]);
      if (v) {
        if (v.status === 'out' && !v.lastEntry) {
          showToast(`ℹ️ ${v.name} вже за межами локації (ВИХІД)`, 'info');
        } else {
          showToast(`🎙️ ${v.name}: ВИЙШОВ (-)`, 'info');
        }
      }
    } else if (ids.length > 1) {
      showToast(`Успішно вийшло: ${ids.length} осіб`, 'info');
    }

    setVisitors(prev => prev.map(v => {
      if (!ids.includes(v.id)) return v;
      if (v.status === 'out') return v;
      
      const logs = v.logs ? [...v.logs] : [];
      const fallbackIn = v.lastEntry || now;
      logs.push({ in: fallbackIn, out: now });
      const diff = differenceInMinutes(new Date(now), new Date(fallbackIn));
      return {
        ...v,
        status: 'out',
        lastEntry: undefined,
        logs,
        totalTimeMinutes: (v.totalTimeMinutes || 0) + Math.max(0, diff)
      };
    }));
  };

  const latestSearch = useRef(searchQuery);
  useEffect(() => {
    latestSearch.current = searchQuery;
  }, [searchQuery]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Stop error:', e);
        }
      }
      setIsListening(false);
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Ваш браузер не підтримує розпізнавання мови", 'error');
      return;
    }

    setIsListening(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'uk-UA';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      if (isListeningRef.current) {
        try {
          recognition.lang = 'uk-UA';
          recognition.start();
        } catch (e) {
          console.error('Restart error:', e);
          setIsListening(false);
        }
      }
    };

    recognition.onerror = (event: any) => { 
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Non-fatal, silence timeout or stop() called
        return;
      }
      console.warn('Speech recognition notice:', event.error);
      if (event.error === 'not-allowed') {
        showToast("Помилка: Надайте дозвіл на використання мікрофону у браузері.", 'error');
        setIsListening(false);
      } else {
        setIsListening(false);
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = (finalTranscript + ' ' + interimTranscript).trim();
      if (!text) return;

      const parsed = parseVoiceCommand(text);

      if (parsed.targetQuery) {
        setSearchQuery(parsed.targetQuery);
        const matches = visitors.filter(v => matchVisitorVoice(v, parsed.targetQuery));
        if (matches.length > 0) {
          setSelectedVoiceVisitor(matches[0]);
        }
      }

      const isFinal = event.results[event.results.length - 1].isFinal;

      if (isFinal) {
        if (parsed.isCommand && parsed.action) {
          // Command spoken ("мінус" / "плюс" standalone or "Коваленко мінус")
          executeCommand(parsed.targetQuery, parsed.action, parsed.triggerWord);
        } else if (parsed.targetQuery) {
          // Only name was spoken: find and prompt for plus/minus
          const matches = visitors.filter(v => matchVisitorVoice(v, parsed.targetQuery));
          if (matches.length > 0) {
            const found = matches[0];
            setSelectedVoiceVisitor(found);
            showToast(`🎯 Знайдено: ${found.name} (${found.status === 'in' ? 'НА ЛОКАЦІЇ' : 'ЗА МЕЖАМИ'}). Скажіть «ПЛЮС» або «МІНУС»`, 'info');
          } else {
            showToast(`Користувача "${parsed.targetQuery}" не знайдено`, 'info');
          }
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error('Start error:', err);
      setIsListening(false);
    }
  };

  const commandVisitors = visitors.filter(v => {
    if (searchQuery.trim()) {
      return matchesSearch(v.name, v.callsign, searchQuery);
    }
    if (isSpecialVisitor(v, groups)) return true;
    const groupName = groups.find(g => g.id === v.groupId)?.name || v.group;
    return groupName === 'Командування полку' || groupName === 'Керівництво' || groupName === 'Командування 412' || groupName === 'Управління';
  }).sort((a, b) => {
    const specialA = isSpecialVisitor(a, groups) ? 1 : 0;
    const specialB = isSpecialVisitor(b, groups) ? 1 : 0;
    if (specialA !== specialB) return specialB - specialA;

    const groupOrder: Record<string, number> = {
      'Командування 412': 1,
      'Управління': 2,
      'Керівництво': 3,
      'Командування полку': 4
    };

    const groupNameA = groups.find(g => g.id === a.groupId)?.name || a.group || '';
    const groupNameB = groups.find(g => g.id === b.groupId)?.name || b.group || '';

    const orderA = groupOrder[groupNameA] || 99;
    const orderB = groupOrder[groupNameB] || 99;

    if (orderA !== orderB) return orderA - orderB;
    
    if (a.status === 'in' && b.status !== 'in') return -1;
    if (a.status !== 'in' && b.status === 'in') return 1;
    return a.name.localeCompare(b.name);
  });

  const shiftStart = new Date(currentTime);
  if (shiftStart.getHours() < 8) {
    shiftStart.setDate(shiftStart.getDate() - 1);
  }
  shiftStart.setHours(8, 0, 0, 0);

  const enteredTodayVisitors: any[] = [];
  const exitedTodayVisitors: any[] = [];
  let totalEntriesCount = 0;
  let totalExitsCount = 0;
  
  visitors.forEach(v => {
    let enteredToday = false;
    let exitedToday = false;
    const logs = v.logs || [];
    
    let enterTime: Date | null = null;
    let exitTime: Date | null = null;
    
    if (v.lastEntry && new Date(v.lastEntry) >= shiftStart) {
      enteredToday = true;
      totalEntriesCount++;
      enterTime = new Date(v.lastEntry);
    }
    for (const log of logs) {
      if (log.in && new Date(log.in) >= shiftStart) {
        enteredToday = true;
        totalEntriesCount++;
        if (!enterTime || new Date(log.in) < enterTime) {
          enterTime = new Date(log.in);
        }
      }
      if (log.out && new Date(log.out) >= shiftStart) {
        exitedToday = true;
        totalExitsCount++;
        if (!exitTime || new Date(log.out) > exitTime) {
          exitTime = new Date(log.out);
        }
      }
    }
    
    if (enteredToday) enteredTodayVisitors.push({ ...v, shiftEnterTime: enterTime });
    if (exitedToday) exitedTodayVisitors.push({ ...v, shiftExitTime: exitTime });
  });

  enteredTodayVisitors.sort((a, b) => compareVisitorsSpecialFirst(a, b, { groups }));
  exitedTodayVisitors.sort((a, b) => compareVisitorsSpecialFirst(a, b, { groups }));

  const uniqueVisitorsCount = enteredTodayVisitors.length;
  const totalVisitsCount = Math.max(totalEntriesCount, uniqueVisitorsCount);
  const enteredTodayCount = totalEntriesCount > 0 ? totalEntriesCount : uniqueVisitorsCount;
  const exitedTodayCount = totalExitsCount;

  const currentlyInVisitors = visitors.filter(v => v.status === 'in').sort((a,b) => compareVisitorsSpecialFirst(a, b, { groups }));
  const currentlyInCount = currentlyInVisitors.length;

  const modalVisitors = 
    modalType === 'entered' || modalType === 'all_visits' || modalType === 'unique_visitors' ? enteredTodayVisitors : 
    modalType === 'exited' ? exitedTodayVisitors : 
    currentlyInVisitors;

  const modalTitle = 
    modalType === 'all_visits' ? "Всі відвідування за зміну" :
    modalType === 'unique_visitors' ? "Відвідувачі (унікальні особи) за зміну" :
    modalType === 'entered' ? "Зайшли за зміну" : 
    modalType === 'exited' ? "Вийшли за зміну" : 
    "Зараз на локації";

  const activeSecurityShift = (securityShifts || []).find(s => 
    s.visitorIds.some(id => shifts.some((session: any) => session.guardId === id && !session.endTime))
  );
  const activeShiftName = activeSecurityShift?.name;

  const activeDirtySky = dirtySkyEvents.find(e => !e.endTime);
  const lastCompletedDirtySky = [...dirtySkyEvents].reverse().find(e => e.endTime);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex landscape:hidden flex-row items-center justify-between gap-2 sm:gap-4 md:gap-6 py-4 mb-2 font-roboto font-normal border-b border-border/40 pb-6 w-full min-w-0 flex-nowrap">
        {/* Left column: Notifications like Large active "Dirty sky" + activation time */}
        <div className="flex flex-col items-start justify-center grow shrink min-w-0">
          {activeDirtySky ? (
            <div className="flex flex-col items-start text-red-500 animate-pulse min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <TriangleAlert className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
                <span className="text-base sm:text-lg md:text-xl font-extrabold uppercase tracking-wide leading-none truncate">Брудне небо</span>
              </div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-red-500/80 mt-1 pl-7.5">
                з {format(new Date(activeDirtySky.startTime), 'HH:mm')}
              </span>
            </div>
          ) : (
            <div className="text-muted-foreground/30 flex items-center gap-1.5 select-none min-w-0">
              <CloudRain className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-none truncate">Небо чисте</span>
            </div>
          )}
        </div>
        
        {/* Center column: Date and time */}
        <div className="text-center flex flex-col items-center justify-center grow shrink-0 min-w-0">
          <div className="text-lg sm:text-2xl md:text-3xl font-semibold tabular-nums leading-none tracking-tight">
            {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: false})}
          </div>
          <div className="text-[9px] sm:text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase mt-1">
            {currentTime.toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/\s*р\.?$/, '')}
          </div>
        </div>

        {/* Right column: Dirty sky title and ON/OFF status buttons */}
        <div className="flex justify-end items-center grow shrink-0">
          <div className="flex flex-col items-center md:items-end gap-1.5 w-[90px] sm:w-[110px] md:w-[130px]">
            <span className="text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.05em] text-muted-foreground uppercase whitespace-nowrap">
              Брудне небо
            </span>
            <div className="flex items-center gap-1 w-full">
              <button
                onClick={() => {
                  if (!canToggleDirtySky) {
                    showToast('У вашої ролі немає дозволу на управління режимом «Брудне небо» у матриці прав', 'error');
                    return;
                  }
                  if (!activeDirtySky) {
                    startDirtySky();
                    showToast('РЕЖИМ БРУДНЕ НЕБО АКТИВОВАНО!', 'error');
                  }
                }}
                disabled={!canToggleDirtySky}
                className={`flex-1 h-8 sm:h-9 md:h-10 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all flex flex-col items-center justify-center shrink-0 ${
                  !canToggleDirtySky
                    ? 'bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50'
                    : activeDirtySky 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-[1.03] cursor-pointer' 
                      : 'bg-muted text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer'
                }`}
                title={!canToggleDirtySky ? "У вашої ролі немає дозволу на управління режимом «Брудне небо»" : "Увімкнути режим Брудне небо"}
              >
                <span>ON</span>
              </button>
              
              <button
                onClick={() => {
                  if (!canToggleDirtySky) {
                    showToast('У вашої ролі немає дозволу на управління режимом «Брудне небо» у матриці прав', 'error');
                    return;
                  }
                  if (activeDirtySky) {
                    endDirtySky();
                    showToast('Режим Брудне небо завершено', 'success');
                  }
                }}
                disabled={!canToggleDirtySky}
                className={`flex-1 h-8 sm:h-9 md:h-10 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all flex flex-col items-center justify-center shrink-0 ${
                  !canToggleDirtySky
                    ? 'bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50'
                    : !activeDirtySky 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.03] cursor-pointer' 
                      : 'bg-muted text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer'
                }`}
                title={!canToggleDirtySky ? "У вашої ролі немає дозволу на управління режимом «Брудне небо»" : "Вимкнути режим Брудне небо"}
              >
                <span>OFF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Compact Metric Cards with Adaptive Scaling (Single Line: Label - Count in Middle - Icon) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full">
        {/* 1. Відвідувачів (унікальні особи) */}
        <div 
          onClick={() => setModalType('unique_visitors')}
          className="bg-indigo-500/10 hover:bg-indigo-500/15 rounded-xl px-2 sm:px-2 md:px-2.5 py-1 flex items-center justify-between min-w-0 flex-nowrap shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer h-9 sm:h-9 md:h-10"
          title="Унікальні відвідувачі за зміну"
        >
          <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[8.5px] md:text-[10px] lg:text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider shrink-0 select-none truncate">
            Відвідувачів:
          </span>
          <span className="flex-1 text-center text-xs min-[380px]:text-sm sm:text-xs md:text-sm lg:text-base font-black text-indigo-700 dark:text-indigo-300 tabular-nums px-1 min-w-0 truncate">
            {uniqueVisitorsCount}
          </span>
          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shrink-0 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>

        {/* 2. На локації (скільки зараз людей) */}
        <div 
          onClick={() => setModalType('on_location')}
          className="bg-emerald-500/10 hover:bg-emerald-500/15 rounded-xl px-2 sm:px-2 md:px-2.5 py-1 flex items-center justify-between min-w-0 flex-nowrap shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer h-9 sm:h-9 md:h-10"
          title="Кількість людей зараз на локації"
        >
          <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[8.5px] md:text-[10px] lg:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider shrink-0 select-none truncate">
            На локації:
          </span>
          <span className="flex-1 text-center text-xs min-[380px]:text-sm sm:text-xs md:text-sm lg:text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums px-1 min-w-0 truncate">
            {currentlyInCount}
          </span>
          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shrink-0 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>

        {/* 3. Зайшло (кількість входів) */}
        <div 
          onClick={() => setModalType('entered')}
          className="bg-sky-500/10 hover:bg-sky-500/15 rounded-xl px-2 sm:px-2 md:px-2.5 py-1 flex items-center justify-between min-w-0 flex-nowrap shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer h-9 sm:h-9 md:h-10"
          title="Кількість зафіксованих входів за зміну"
        >
          <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[8.5px] md:text-[10px] lg:text-[11px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider shrink-0 select-none truncate">
            Зайшло:
          </span>
          <span className="flex-1 text-center text-xs min-[380px]:text-sm sm:text-xs md:text-sm lg:text-base font-black text-sky-700 dark:text-sky-300 tabular-nums px-1 min-w-0 truncate">
            {enteredTodayCount}
          </span>
          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shrink-0 bg-sky-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <LogIn className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>

        {/* 4. Вийшло (кількість виходів) */}
        <div 
          onClick={() => setModalType('exited')}
          className="bg-rose-500/10 hover:bg-rose-500/15 rounded-xl px-2 sm:px-2 md:px-2.5 py-1 flex items-center justify-between min-w-0 flex-nowrap shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer h-9 sm:h-9 md:h-10"
          title="Кількість зафіксованих виходів за зміну"
        >
          <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[8.5px] md:text-[10px] lg:text-[11px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider shrink-0 select-none truncate">
            Вийшло:
          </span>
          <span className="flex-1 text-center text-xs min-[380px]:text-sm sm:text-xs md:text-sm lg:text-base font-black text-rose-700 dark:text-rose-300 tabular-nums px-1 min-w-0 truncate">
            {exitedTodayCount}
          </span>
          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shrink-0 bg-rose-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <LogOut className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>
      </div>

      <div className="bg-transparent shadow-none font-roboto font-normal flex items-center justify-center gap-1.5 sm:gap-3 w-full !mt-1 !mb-1 p-0">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/80 pointer-events-none" />
          <input 
            type="text"
            placeholder={isListening ? "Слухаю... Назвіть прізвище або команду" : "Швидкий пошук за іменем чи позивним..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 sm:pl-11 pr-8 sm:pr-9 py-2 bg-card dark:bg-muted/70 border border-border/80 shadow-xs rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground/75 font-normal text-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSelectedVoiceVisitor(null); setSearchQuery(''); }}
              className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Очистити пошук"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        <button
          onClick={toggleListening}
          className={`w-8 h-8 sm:w-10 sm:h-10 border rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
            isListening 
              ? 'bg-red-500 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' 
              : 'bg-card dark:bg-muted/70 border-border/80 hover:bg-muted text-muted-foreground shadow-xs'
          }`}
          title={isListening ? "Зупинити голосовий ввід" : "Голосовий ввід команд"}
        >
          {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </div>

      {/* Found visitor quick voice-action bar */}
      {selectedVoiceVisitor && (
        <div className="w-full max-w-xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 px-3 sm:px-4 bg-primary/10 border border-primary/25 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedVoiceVisitor.status === 'in' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
            <div className="text-xs truncate">
              <span className="font-medium text-foreground mr-1.5">{selectedVoiceVisitor.name}</span>
              {selectedVoiceVisitor.callsign && (
                <span className="text-muted-foreground font-medium mr-1.5">«{selectedVoiceVisitor.callsign}»</span>
              )}
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                selectedVoiceVisitor.status === 'in' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-700'
              }`}>
                {selectedVoiceVisitor.status === 'in' ? 'НА ЛОКАЦІЇ' : 'ЗА МЕЖАМИ'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <span className="text-[11px] text-muted-foreground hidden md:inline font-medium">
              Скажіть <strong>«ПЛЮС»</strong> чи <strong>«МІНУС»</strong>
            </span>
            <button 
              onClick={() => {
                if (!canCheckInOut) {
                  showToast('У вашої ролі немає дозволу на облік входу/виходу відвідувачів у матриці прав', 'error');
                  return;
                }
                executeCommand('', 'in');
              }}
              disabled={!canCheckInOut}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                !canCheckInOut
                  ? 'bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              }`}
              title={!canCheckInOut ? "У вашої ролі немає дозволу на облік входу" : "Вхід на локацію (або скажіть «ПЛЮС»)"}
            >
              + Вхід
            </button>
            <button 
              onClick={() => {
                if (!canCheckInOut) {
                  showToast('У вашої ролі немає дозволу на облік входу/виходу відвідувачів у матриці прав', 'error');
                  return;
                }
                executeCommand('', 'out');
              }}
              disabled={!canCheckInOut}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                !canCheckInOut
                  ? 'bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50'
                  : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
              }`}
              title={!canCheckInOut ? "У вашої ролі немає дозволу на облік виходу" : "Вихід з локації (або скажіть «МІНУС»)"}
            >
              - Вихід
            </button>
            <button 
              onClick={() => { setSelectedVoiceVisitor(null); setSearchQuery(''); }}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-all cursor-pointer"
              title="Закрити"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-3xl p-3.5 sm:p-5 flex flex-col shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          {commandVisitors.length > 0 ? (
            commandVisitors.map(v => {
              const visitorGroup = groups?.find((g: any) => g.id === v.groupId) || groups?.find((g: any) => g.name === v.group);
              const visitorLocation = locations.find(l => l.id === v.locationId) || locations.find(l => l.name === v.location);
              const customIcon = customIcons.find(icon => icon.id === v.customIconId) || (visitorLocation?.iconId ? customIcons.find(icon => icon.id === visitorLocation.iconId) : null);
              
              const isGuard = v.groupId === '3' || (v.location || v.locationId || v.group || '').toLowerCase().includes('охорон') || (v.location || v.locationId || v.group || '').toLowerCase().includes('рота');
              const isGuardOnDuty = isGuard && shifts.some(s => s.guardId === v.id && !s.endTime);

              const isNotEntered = v.status !== 'in';

              return (
                <div
                  key={v.id}
                  className={`h-full transition-opacity duration-200 ${
                    isNotEntered ? 'opacity-30 hover:opacity-100' : 'opacity-100'
                  }`}
                >
                  <VisitorCard
                    visitor={v}
                    group={visitorGroup}
                    location={visitorLocation}
                    customIcon={customIcon}
                    shiftStart={shiftStart}
                    activeDirtySky={activeDirtySky}
                    isGuardOnDuty={isGuardOnDuty}
                    onMarkIn={markIn}
                    onMarkOut={markOut}
                  />
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/10 rounded-2xl">
               Користувачів не знайдено
            </div>
          )}
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs sm:p-3 sm:items-center animate-in fade-in duration-150">
          <div className="bg-card w-full sm:w-[480px] h-full sm:h-[90dvh] sm:rounded-2xl sm:border border-border shadow-2xl flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border shrink-0">
              <h2 className="text-base sm:text-lg font-bold truncate">{modalTitle}</h2>
              <button 
                type="button"
                onClick={() => setModalType(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Закрити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-2.5">
              {modalVisitors.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground rounded-2xl bg-muted/20">
                  Немає даних
                </div>
              ) : (
                modalVisitors.map(v => {
                  const visitorGroup = groups?.find(g => g.id === v.groupId) || groups?.find(g => g.name === v.group);
                  const visitorLocation = locations.find(l => l.id === v.locationId) || locations.find(l => l.name === v.location);
                  const customIcon = customIcons.find(icon => icon.id === v.customIconId) || (visitorLocation?.iconId ? customIcons.find(icon => icon.id === visitorLocation.iconId) : null);
                  const blockColor = v.color || visitorGroup?.color;
                  const hasGroupColor = !!blockColor && blockColor !== 'transparent';
                  
                  const rowStyles = hasGroupColor ? {
                    backgroundColor: blockColor.startsWith('#') ? `${blockColor}15` : blockColor,
                    borderColor: blockColor.startsWith('#') ? `${blockColor}60` : blockColor,
                  } : {};

                  const isOnLocation = v.status === 'in';
                  return (
                    <div 
                      key={v.id} 
                      className={`flex justify-between items-center p-4 rounded-2xl shadow-sm transition-colors ${isOnLocation ? 'opacity-100' : 'opacity-30'} ${hasGroupColor ? '' : 'bg-background'}`}
                      style={rowStyles}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white overflow-hidden ${customIcon ? '' : 'shadow-sm'}`} style={{ backgroundColor: customIcon ? 'transparent' : (v.color || visitorGroup?.color || '#5b6984') }}>
                          {customIcon ? (
                            <img src={customIcon.data} alt="icon" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-[#e5e9ec]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider opacity-70 break-words leading-tight">
                              {v.category && !v.category.toLowerCase().includes('особлив') ? v.category : ''}
                              {v.location || v.locationId || (v.group && !v.group.toLowerCase().includes('особлив')) 
                                ? `${v.category && !v.category.toLowerCase().includes('особлив') ? ' • ' : ''}${v.location || v.locationId || v.group}` 
                                : ''}
                            </span>
                          </div>
                          <div className="font-medium text-sm">{formatNameAbbreviated(v.name)}</div>
                          {v.callsign && (
                            <div className="text-[11px] font-bold text-primary/80 uppercase tracking-widest leading-none mt-1">
                              {v.callsign}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {modalType === 'on_location' && v.lastEntry && (
                          <div className="text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg text-xs font-mono font-medium">
                            зайшов о {new Date(v.lastEntry).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                          </div>
                        )}
                        {modalType === 'entered' && v.shiftEnterTime && (
                          <div className="text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg text-xs font-mono font-medium">
                            {new Date(v.shiftEnterTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                          </div>
                        )}
                        {modalType === 'exited' && v.shiftExitTime && (
                          <div className="text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg text-xs font-mono font-medium mt-1">
                            {new Date(v.shiftExitTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
