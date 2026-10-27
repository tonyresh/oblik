import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../store/DataContext';
import { useTheme } from '../store/ThemeContext';
import { Search, LogIn, LogOut, Download, Mic, MicOff, User, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useToast } from '../store/ToastContext';
import { differenceInMinutes } from 'date-fns';
import { formatNameAbbreviated, splitNameTwoLines } from '../utils/nameUtils';
import { 
  parseVoiceCommand, 
  matchVisitorVoice 
} from '../utils/voiceCommandUtils';
import { Visitor } from '../types';
import { isSpecialVisitor, compareVisitorsSpecialFirst, isSpecialGroup } from '../utils/visitorUtils';
import VisitorCard from '../components/VisitorCard';

export default function Visitors() {
  const { visitors, setVisitors, categories, groups, locations, shifts, customIcons, dirtySkyEvents, stopList, addAuditLog } = useData();
  const { visitorsColumns, setVisitorsColumns } = useTheme();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const activeDirtySky = dirtySkyEvents.find(e => !e.endTime);

  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [showOnlyIn, setShowOnlyIn] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [groups]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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

  // Update selectedVoiceVisitor whenever visitors list updates
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

  const markIn = (id: string | string[]) => {
    const ids = Array.isArray(id) ? id : [id];
    const now = new Date().toISOString();
    
    if (ids.length === 1) {
      const v = visitors.find(vis => vis.id === ids[0]);
      if (v) {
        // Tactical Stop-List check
        const stopItem = (stopList || []).find(item => 
          item.active && (
            item.name.toLowerCase().trim() === v.name.toLowerCase().trim() ||
            (v.callsign && item.callsign && item.callsign.toLowerCase().trim() === v.callsign.toLowerCase().trim())
          )
        );

        if (stopItem) {
          showToast(`🚨 УВАГА! ${v.name} перебуває в СТОП-ЛИСТІ! Причина: ${stopItem.reason}`, 'error');
          if (addAuditLog) {
            addAuditLog({
              action: '🚨 Спроба проходу зі стоп-листа',
              category: 'security',
              userEmail: 'kpp',
              userName: 'Оператор КПП',
              details: `Особа: ${v.name} (${v.callsign || 'без позивного'}). Причина: ${stopItem.reason} [Рівень: ${stopItem.severity}]`,
              status: 'warning'
            });
          }
        }

        if (v.status === 'in') {
          showToast(`ℹ️ ${v.name} вже на локації (ВХІД)`, 'info');
        } else {
          showToast(`🎙️ ${v.name}: ЗАЙШОВ (+)`, 'success');
        }
      }
    }

    setVisitors(prev => prev.map(v => {
      if (!ids.includes(v.id)) return v;
      if (v.status === 'in') return v;
      
      const logs = v.logs ? [...v.logs] : (v.lastEntry ? [{ in: v.lastEntry }] : []);
      if (logs.length === 0 || logs[logs.length - 1].out) {
        logs.push({ in: now });
      }
      
      return { ...v, status: 'in', lastEntry: now, logs };
    }));
  };

  const markOut = (id: string | string[]) => {
    const ids = Array.isArray(id) ? id : [id];
    const now = new Date().toISOString();
    
    if (ids.length === 1) {
      const v = visitors.find(vis => vis.id === ids[0]);
      if (v) {
        if (v.status === 'out' && !v.lastEntry) {
          showToast(`ℹ️ ${v.name} вже за межами локації (ВИХІД)`, 'info');
        } else {
          showToast(`🎙️ ${v.name}: ВИЙШОВ (-)`, 'info');
        }
      }
    }

    setVisitors(prev => prev.map(v => {
      if (!ids.includes(v.id)) return v;
      
      const isGuardOnDuty = shifts.some(s => s.guardId === v.id && !s.endTime);
      if (isGuardOnDuty) {
        showToast(`Не можна вийти: зміна чергування не може вийти з локації, поки не передасть зміну іншій групі`, 'error');
        return v;
      }

      if (v.status === 'out' && !v.lastEntry) return v;

      const logs = v.logs ? [...v.logs] : (v.lastEntry ? [{ in: v.lastEntry }] : []);
      
      let index = -1;
      for (let i = logs.length - 1; i >= 0; i--) {
        if (logs[i].in && !logs[i].out) {
          index = i;
          break;
        }
      }

      if (index !== -1) {
        logs[index] = { ...logs[index], out: now };
        const startTime = logs[index].in;
        const diff = startTime ? differenceInMinutes(new Date(now), new Date(startTime)) : 0;
        return { 
          ...v, 
          status: 'out', 
          lastEntry: undefined, 
          logs,
          totalTimeMinutes: (v.totalTimeMinutes || 0) + Math.max(0, diff) 
        };
      } else {
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
      }
    }));
  };

  const executeCommand = (nameQuery: string, action: 'in' | 'out', triggerWord?: string) => {
    if (!!activeDirtySky) return;
    
    let targetVisitor: Visitor | undefined = undefined;

    // 1. Spoken name together with command
    if (nameQuery && nameQuery.trim()) {
      const matching = visitors.filter(v => matchVisitorVoice(v, nameQuery));
      if (matching.length > 0) {
        targetVisitor = matching[0];
      }
    }

    // 2. Previously found visitor via voice search
    if (!targetVisitor && selectedVoiceVisitorRef.current) {
      targetVisitor = visitors.find(v => v.id === selectedVoiceVisitorRef.current?.id) || selectedVoiceVisitorRef.current;
    }

    // 3. Current search query
    if (!targetVisitor && latestSearch.current && latestSearch.current.trim()) {
      const matching = visitors.filter(v => matchVisitorVoice(v, latestSearch.current));
      if (matching.length > 0) {
        targetVisitor = matching[0];
      }
    }

    // 4. Single match in filtered list
    if (!targetVisitor) {
      const matching = visitors.filter(v => search.trim() ? matchesSearch(v.name, v.callsign, search) : false);
      if (matching.length === 1) {
        targetVisitor = matching[0];
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

    if (action === 'in') {
      markIn(targetVisitor.id);
    } else {
      markOut(targetVisitor.id);
    }

    setSelectedVoiceVisitor(targetVisitor);
    setTimeout(() => {
      setSearch('');
      setSelectedVoiceVisitor(null);
    }, 2500);
  };



  // We need an effect or ref to access the latest search state inside recognition callback
  const latestSearch = useRef(search);
  useEffect(() => {
    latestSearch.current = search;
  }, [search]);

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
        setSearch(parsed.targetQuery);
        setShowOnlyIn(false);
        const matches = visitors.filter(v => matchVisitorVoice(v, parsed.targetQuery));
        if (matches.length > 0) {
          setSelectedVoiceVisitor(matches[0]);
        }
      }

      const isFinal = event.results[event.results.length - 1].isFinal;

      if (isFinal) {
        if (parsed.isCommand && parsed.action) {
          executeCommand(parsed.targetQuery, parsed.action, parsed.triggerWord);
        } else if (parsed.targetQuery) {
          const matches = visitors.filter(v => matchVisitorVoice(v, parsed.targetQuery));
          if (matches.length > 0) {
            const found = matches[0];
            setSelectedVoiceVisitor(found);
            setShowOnlyIn(false);
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

  const visibleGroups = groups.filter(g => g.showInVisitors !== false && !isSpecialGroup(g));

  useEffect(() => {
    if (activeGroup !== 'all' && !visibleGroups.some(g => g.id === activeGroup)) {
      setActiveGroup('all');
    }
  }, [groups, visibleGroups, activeGroup]);

  const filtered = visitors
    .filter(v => matchesSearch(v.name, v.callsign, search))
    .filter(v => activeGroup === 'all' || isSpecialVisitor(v, groups) || v.groupId === activeGroup || v.group === activeGroup)
    .filter(v => showOnlyIn ? v.status === 'in' : true)
    .sort((a, b) => compareVisitorsSpecialFirst(a, b, { prioritizeInStatus: false, groups }));

  return (
    <div className="w-full">
      {/* Attached / Sticky Header with Search and Group Selector */}
      <div
        style={{
          paddingTop: 'clamp(6px, 0.6vw, 10px)',
          paddingBottom: 'clamp(6px, 0.6vw, 10px)',
          paddingLeft: 'clamp(10px, 1.4vw, 24px)',
          paddingRight: 'clamp(10px, 1.4vw, 24px)'
        }}
        className="sticky top-0 z-30 w-full bg-card/98 dark:bg-card/95 backdrop-blur-md border-b border-border shadow-xs transition-shadow print:static print:p-0 print:border-none print:shadow-none"
      >
        <div className="max-w-7xl mx-auto space-y-2">
          {/* 7) Поле пошуку в одному рядку з групами, ліворуч від них */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full">
            {/* 5) Блок пошуку зі зниженою на 30% прозорістю, ліворуч від груп */}
            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-64 md:w-72 lg:w-80">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/80 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder={isListening ? "Слухаю... Назвіть команду" : "Швидкий пошук..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    fontSize: 'clamp(11px, 0.85vw, 13.5px)',
                    paddingTop: 'clamp(6px, 0.55vw, 9px)',
                    paddingBottom: 'clamp(6px, 0.55vw, 9px)'
                  }}
                  className="w-full pl-9 sm:pl-10 pr-8 bg-card dark:bg-muted/70 border border-border/80 shadow-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground/75 font-normal text-foreground"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSelectedVoiceVisitor(null); setSearch(''); }}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Очистити пошук"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={toggleListening}
                style={{
                  width: 'clamp(32px, 2.5vw, 38px)',
                  height: 'clamp(32px, 2.5vw, 38px)'
                }}
                className={`border rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isListening 
                    ? 'bg-red-500 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' 
                    : 'bg-card dark:bg-muted/70 border-border/80 hover:bg-muted text-muted-foreground shadow-xs'
                }`}
                title={isListening ? "Зупинити голосовий ввід" : "Голосовий ввід команд"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Group Filter Navigation (Centered between search and column switcher) */}
            <div className="flex-1 min-w-0 flex items-center justify-center gap-2 group/nav relative">
              {showLeftArrow && (
                <button 
                  onClick={() => scroll('left')}
                  style={{
                    width: 'clamp(26px, 2vw, 32px)',
                    height: 'clamp(26px, 2vw, 32px)'
                  }}
                  className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-card border border-border/60 rounded-full shadow-lg hover:bg-muted transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              <div 
                ref={scrollContainerRef}
                onScroll={checkScroll}
                style={{ justifyContent: 'safe center' }}
                className="flex gap-1.5 sm:gap-2 w-full overflow-x-auto pb-1 hide-scrollbar scroll-smooth items-center justify-center"
              >
                <button
                  onClick={() => setShowOnlyIn(!showOnlyIn)}
                  style={{
                    height: 'clamp(32px, 2.5vw, 38px)',
                    fontSize: 'clamp(9.5px, 0.75vw, 11.5px)',
                    paddingLeft: 'clamp(8px, 0.8vw, 14px)',
                    paddingRight: 'clamp(8px, 0.8vw, 14px)'
                  }}
                  className={`rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 flex items-center justify-center gap-1.5 ${
                    showOnlyIn
                      ? 'bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-600/20 active:scale-95'
                      : 'bg-card hover:bg-muted border-border text-muted-foreground'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${showOnlyIn ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
                  На локації
                </button>
                <div className="w-px h-5 bg-border/60 mx-0.5 shrink-0 self-center" />
                {[{ id: 'all', name: 'Всі', color: '' }, ...visibleGroups].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroup(g.id)}
                    style={{
                      height: 'clamp(32px, 2.5vw, 38px)',
                      fontSize: 'clamp(9.5px, 0.75vw, 11.5px)',
                      paddingLeft: 'clamp(8px, 0.8vw, 14px)',
                      paddingRight: 'clamp(8px, 0.8vw, 14px)'
                    }}
                    className={`rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
                      activeGroup === g.id 
                        ? 'bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/20 scale-[1.02]' 
                        : 'bg-card hover:bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              {showRightArrow && (
                <button 
                  onClick={() => scroll('right')}
                  style={{
                    width: 'clamp(26px, 2vw, 32px)',
                    height: 'clamp(26px, 2vw, 32px)'
                  }}
                  className="absolute -right-1 sm:-right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-card border border-border/60 rounded-full shadow-lg hover:bg-muted transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick column density switcher */}
            <div className="flex items-center bg-muted/50 border border-border/60 rounded-xl p-0.5 shrink-0 self-end sm:self-center" title="Кількість колонок на екрані">
              <button
                onClick={() => setVisitorsColumns(Math.max(2, visitorsColumns - 1))}
                disabled={visitorsColumns <= 2}
                style={{
                  width: 'clamp(24px, 2vw, 30px)',
                  height: 'clamp(24px, 2vw, 30px)'
                }}
                className="flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-25 text-xs font-bold cursor-pointer transition-colors active:scale-95"
                title="Зменшити кількість колонок"
              >
                −
              </button>
              <div className="px-1 flex flex-col items-center justify-center min-w-[24px] select-none">
                <span style={{ fontSize: 'clamp(10px, 0.75vw, 11.5px)' }} className="font-black text-foreground leading-none">{visitorsColumns}</span>
                <span style={{ fontSize: 'clamp(6.5px, 0.5vw, 7.5px)' }} className="text-muted-foreground uppercase font-bold tracking-tight leading-none mt-0.5">кол</span>
              </div>
              <button
                onClick={() => setVisitorsColumns(Math.min(8, visitorsColumns + 1))}
                disabled={visitorsColumns >= 8}
                style={{
                  width: 'clamp(24px, 2vw, 30px)',
                  height: 'clamp(24px, 2vw, 30px)'
                }}
                className="flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-25 text-xs font-bold cursor-pointer transition-colors active:scale-95"
                title="Збільшити кількість колонок"
              >
                +
              </button>
            </div>
          </div>

          {/* Found visitor quick voice-action bar */}
          {selectedVoiceVisitor && (
            <div className="w-full max-w-xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 px-3 sm:px-4 bg-primary/10 border border-primary/25 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedVoiceVisitor.status === 'in' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                <div className="text-xs truncate">
                  <span className="font-bold text-foreground mr-1.5">{selectedVoiceVisitor.name}</span>
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
                  onClick={() => executeCommand('', 'in')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                  title="Вхід на локацію (або скажіть «ПЛЮС»)"
                >
                  + Вхід
                </button>
                <button 
                  onClick={() => executeCommand('', 'out')}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                  title="Вихід з локації (або скажіть «МІНУС»)"
                >
                  - Вихід
                </button>
                <button 
                  onClick={() => { setSelectedVoiceVisitor(null); setSearch(''); }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-all cursor-pointer"
                  title="Закрити"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 md:p-5 pt-3 md:pt-4">
        <div className="flex flex-col relative">

        <style>{`
          .visitors-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: clamp(4px, 1.2cqw, 10px);
            width: 100%;
          }
          @media (max-width: 479px) {
            .visitors-grid {
              grid-template-columns: repeat(${Math.min(visitorsColumns, 2)}, minmax(0, 1fr)) !important;
              gap: 5px;
            }
          }
          @media (min-width: 480px) and (max-width: 767px) {
            .visitors-grid {
              grid-template-columns: repeat(${Math.min(visitorsColumns, 3)}, minmax(0, 1fr)) !important;
              gap: 6px;
            }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            .visitors-grid {
              grid-template-columns: repeat(${visitorsColumns}, minmax(0, 1fr)) !important;
              gap: ${visitorsColumns >= 6 ? '5px' : '7px'};
            }
          }
          @media (min-width: 1024px) {
            .visitors-grid {
              grid-template-columns: repeat(${visitorsColumns}, minmax(0, 1fr)) !important;
              gap: ${visitorsColumns >= 7 ? '5px' : visitorsColumns >= 5 ? '7px' : '10px'};
            }
          }

          /* Container query for continuous, smooth proportional scaling inside each card */
          .visitor-card {
            container-type: inline-size;
            container-name: visitorCard;
            contain: layout style inline-size;
            transform: translateZ(0);
            backface-visibility: hidden;
          }

          .visitor-card-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
            padding-top: clamp(4px, 2.3cqw, 12px);
            padding-bottom: clamp(4px, 2.3cqw, 12px);
            padding-right: clamp(4px, 2.4cqw, 14px);
            /* 6) Зменшено на 20% відступ зліва від іконки */
            padding-left: clamp(4.8px, 2.7cqw, 12.8px);
            /* 6) Зменшено на 20% відступ справа від іконки */
            gap: clamp(2.4px, 1.4cqw, 8px);
          }

          .visitor-avatar-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            /* 6) Зменшено на 20% ширину колонки аватара */
            width: clamp(20px, 13cqw, 52px);
            text-align: center;
          }

          .visitor-avatar {
            width: clamp(20px, 11cqw, 46px);
            height: clamp(20px, 11cqw, 46px);
            border-radius: 9999px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          }

          .visitor-avatar-icon {
            width: clamp(10px, 5.5cqw, 22px);
            height: clamp(10px, 5.5cqw, 22px);
          }

          .visitor-status-dot {
            width: clamp(5px, 2.6cqw, 9.5px);
            height: clamp(5px, 2.6cqw, 9.5px);
          }

          .visitor-brigade-text {
            font-size: clamp(6px, 2.7cqw, 11px);
            font-weight: 600;
            line-height: 1.15;
            /* 4) Збільшено на 20% відступ назви бригади від іконки */
            margin-top: clamp(1.2px, 0.6cqw, 4.2px);
            text-align: center;
            word-break: break-word;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            width: 100%;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .visitor-info-col {
            display: flex;
            flex-direction: column;
            justify-content: center;
            flex: 0 1 auto;
            min-width: 0;
            max-width: 48%;
            padding-top: 1px;
            padding-bottom: 1px;
            overflow: hidden;
          }

          .visitor-rank-row {
            margin-bottom: clamp(0.5px, 0.25cqw, 2px);
          }

          .visitor-rank-text {
            font-size: clamp(5.6px, 2.2cqw, 9.5px);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            -webkit-font-smoothing: antialiased;
          }

          .visitor-name-col {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
            width: 100%;
            line-height: 1.14;
          }

          .visitor-name-line {
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: -0.015em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          .visitor-surname-text {
            color: var(--foreground);
            font-size: clamp(7.8px, 3.7cqw, 15px);
            font-weight: 500;
            line-height: 1.14;
          }

          .visitor-firstname-text {
            color: var(--foreground);
            font-size: clamp(7.8px, 3.7cqw, 15px);
            font-weight: 500;
            line-height: 1.14;
            margin-top: clamp(0.5px, 0.2cqw, 1.5px);
          }

          .visitor-patronymic-text {
            color: var(--foreground);
            font-size: clamp(7.8px, 3.7cqw, 15px);
            font-weight: 500;
            line-height: 1.14;
            margin-top: clamp(0.5px, 0.2cqw, 1.5px);
          }

          .visitor-callsign-text {
            font-size: clamp(5.8px, 2.4cqw, 10.5px);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            line-height: 1.1;
            margin-top: clamp(0.5px, 0.3cqw, 2px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            -webkit-font-smoothing: antialiased;
          }

          .visitor-time-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            flex-shrink: 0;
            margin-left: auto;
            margin-right: auto;
            padding: clamp(1.5px, 0.5cqw, 4px) clamp(3.5px, 1.2cqw, 8px);
            border-radius: clamp(3px, 1cqw, 6px);
            line-height: 1.18;
            font-family: monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-variant-numeric: tabular-nums;
            -webkit-font-smoothing: antialiased;
            min-width: clamp(48px, 22cqw, 88px);
            box-sizing: border-box;
          }

          .visitor-time-line {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: clamp(1.5px, 0.45cqw, 3.5px);
            font-size: clamp(7.8px, 3.1cqw, 13.5px);
            white-space: nowrap;
            text-align: center;
            line-height: 1.18;
          }

          .visitor-time-label {
            font-size: 0.88em;
            font-weight: 700;
            opacity: 0.72;
            letter-spacing: -0.02em;
          }

          .visitor-time-val {
            font-weight: 800;
            letter-spacing: -0.01em;
          }

          .visitor-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            height: clamp(19px, 8.2cqw, 36px);
            padding-left: clamp(3px, 1.8cqw, 13px);
            padding-right: clamp(3px, 1.8cqw, 13px);
            font-size: clamp(6px, 2.6cqw, 11px);
            gap: clamp(1.5px, 0.6cqw, 4.5px);
            border-radius: clamp(4px, 1.6cqw, 10px);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .visitor-btn-icon {
            width: clamp(7px, 2.7cqw, 13px);
            height: clamp(7px, 2.7cqw, 13px);
            flex-shrink: 0;
          }
        `}</style>
        
        <div className="visitors-grid">
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground rounded-2xl bg-muted/20">
              Немає даних для відображення
            </div>
          )}
          {filtered.map(v => {
            const visitorGroup = groups.find(g => g.id === v.groupId) || groups.find(g => g.name === v.group);
            const visitorLocation = locations.find(l => l.id === v.locationId) || locations.find(l => l.name === v.location);
            const customIcon = customIcons.find(icon => icon.id === v.customIconId) || (visitorLocation?.iconId ? customIcons.find(icon => icon.id === visitorLocation.iconId) : null);
            
            const isGuard = v.groupId === '3' || (v.location || v.locationId || v.group || '').toLowerCase().includes('охорон') || (v.location || v.locationId || v.group || '').toLowerCase().includes('рота');
            const isGuardOnDuty = isGuard && shifts.some(s => s.guardId === v.id && !s.endTime);

            return (
              <VisitorCard
                key={v.id}
                visitor={v}
                group={visitorGroup}
                location={visitorLocation}
                customIcon={customIcon}
                currentTime={currentTime}
                activeDirtySky={activeDirtySky}
                isGuardOnDuty={isGuardOnDuty}
                onMarkIn={markIn}
                onMarkOut={markOut}
              />
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
}
