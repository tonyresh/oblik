import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../store/DataContext';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { DirtySkyEvent } from '../types';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar as CalendarIcon, 
  Search, 
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowRightCircle,
  Printer,
  FileDown,
  X,
  Eye,
  Shield,
  Check,
  ShieldAlert,
  Trash2,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  LogIn,
  LogOut,
  Pencil
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  subMonths, 
  addMonths,
  parseISO,
  differenceInMinutes,
  isWithinInterval
} from 'date-fns';
import { uk } from 'date-fns/locale';

import { formatNameAbbreviated } from '../utils/nameUtils';
import PrintableReportDocument from '../components/PrintableReportDocument';
import VoiceSearchInput from '../components/VoiceSearchInput';

type SortField = 'date' | 'user' | 'brigade' | 'group' | 'timeIn' | 'timeOut';

export default function Reports() {
  const { currentRole, hasPermission } = useAuth();
  const { showToast } = useToast();
  const { 
    visitors, setVisitors, groups, dirtySkyEvents, securityShifts, dutyEvents,
    reportRetentionHours, setReportRetentionHours, purgeReportsByDateRange, purgeAllReports
  } = useData();

  const isSuperAdmin = currentRole?.id === 'admin' || 
                       (currentRole?.name || '').toLowerCase().includes('суперадмін') || 
                       hasPermission('reports.clean');

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Superadmin retention and cleanup modal states
  const currentRetentionDays = useMemo(() => {
    return Math.max(1, Math.round((reportRetentionHours || 1440) / 24));
  }, [reportRetentionHours]);

  const [customRetentionDays, setCustomRetentionDays] = useState<number>(() => {
    return Math.max(1, Math.round((reportRetentionHours || 1440) / 24));
  });
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showRetentionConfirmModal, setShowRetentionConfirmModal] = useState(false);
  const [cleanDays, setCleanDays] = useState<number>(30);
  const [cleanDaysScope, setCleanDaysScope] = useState<'older_than' | 'last_days'>('older_than');
  const [cleanMode, setCleanMode] = useState<'period' | 'all'>('period');
  const [cleanPeriodType, setCleanPeriodType] = useState<'days' | 'current_filter' | 'custom_range'>('days');
  const [customCleanStart, setCustomCleanStart] = useState<string>(startDate);
  const [customCleanEnd, setCustomCleanEnd] = useState<string>(endDate);
  const [confirmAllCheck, setConfirmAllCheck] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // 9) Редагування часу входу/виходу у звітах
  const [editingLogModal, setEditingLogModal] = useState<{
    visitor: any;
    log: any;
    dateStr: string;
    timeIn: string;
    timeOut: string;
    isCurrentlyIn: boolean;
  } | null>(null);

  const handleOpenEditLog = (visitor: any, log: any, date: Date) => {
    const timeIn = log?.in ? format(parseISO(log.in), 'HH:mm') : '08:00';
    const timeOut = log?.out ? format(parseISO(log.out), 'HH:mm') : '';
    const dateStr = log?.in ? format(parseISO(log.in), 'yyyy-MM-dd') : format(date, 'yyyy-MM-dd');
    const isCurrentlyIn = !log?.out;

    setEditingLogModal({
      visitor,
      log,
      dateStr,
      timeIn,
      timeOut,
      isCurrentlyIn
    });
  };

  const handleSaveLogEdit = () => {
    if (!editingLogModal) return;
    const { visitor, log, dateStr, timeIn, timeOut, isCurrentlyIn } = editingLogModal;

    if (!timeIn) {
      showToast('Вкажіть коректний час входу', 'error');
      return;
    }
    if (!isCurrentlyIn && !timeOut) {
      showToast('Вкажіть час виходу або позначте "Залишається на локації"', 'error');
      return;
    }

    // Build new ISO dates
    const [inH, inM] = timeIn.split(':').map(Number);
    const newInDate = parseISO(dateStr);
    newInDate.setHours(inH, inM, 0, 0);
    const newInIso = newInDate.toISOString();

    let newOutIso: string | undefined = undefined;
    if (!isCurrentlyIn && timeOut) {
      const [outH, outM] = timeOut.split(':').map(Number);
      const newOutDate = parseISO(dateStr);
      newOutDate.setHours(outH, outM, 0, 0);
      if (newOutDate < newInDate) {
        newOutDate.setDate(newOutDate.getDate() + 1);
      }
      newOutIso = newOutDate.toISOString();
    }

    setVisitors(prev => prev.map(v => {
      if (v.id !== visitor.id) return v;

      const rawLogs = v.logs ? [...v.logs] : (v.lastEntry ? [{ in: v.lastEntry }] : []);
      const logs = [...rawLogs];
      
      const targetIdx = logs.findIndex(l => l.in === log?.in && (l.out || undefined) === (log?.out || undefined));
      const updatedLog = { in: newInIso, out: newOutIso };

      if (targetIdx !== -1) {
        logs[targetIdx] = updatedLog;
      } else if (logs.length > 0) {
        logs[logs.length - 1] = updatedLog;
      } else {
        logs.push(updatedLog);
      }

      logs.sort((a, b) => new Date(a.in || 0).getTime() - new Date(b.in || 0).getTime());

      const lastLog = logs[logs.length - 1];
      const isLatest = lastLog && lastLog.in === newInIso;
      const newStatus: 'in' | 'out' = (isLatest && !newOutIso) ? 'in' : 'out';
      const newLastEntry = isLatest ? (newStatus === 'in' ? newInIso : undefined) : v.lastEntry;

      let totalMins = 0;
      logs.forEach(l => {
        if (l.in && l.out) {
          totalMins += Math.max(0, differenceInMinutes(parseISO(l.out), parseISO(l.in)));
        }
      });

      return {
        ...v,
        logs,
        status: isLatest ? newStatus : v.status,
        lastEntry: isLatest ? newLastEntry : v.lastEntry,
        totalTimeMinutes: totalMins
      };
    }));

    showToast(`Час входу/виходу для "${visitor.name}" успішно оновлено!`, 'success');
    setEditingLogModal(null);
  };

  useEffect(() => {
    if (reportRetentionHours) {
      setCustomRetentionDays(Math.max(1, Math.round(reportRetentionHours / 24)));
    }
  }, [reportRetentionHours]);

  const handleSaveRetentionDays = (days: number) => {
    if (isNaN(days) || days < 1) {
      showToast('Вкажіть коректну кількість діб (не менше 1)', 'error');
      return;
    }
    const safeDays = Math.max(1, Math.round(days));
    const safeHours = safeDays * 24;
    const cleared = setReportRetentionHours(safeHours);
    setCustomRetentionDays(safeDays);
    if (cleared > 0) {
      showToast(`Термін зберігання звітів встановлено: ${safeDays} діб (${safeHours} год). Видалено ${cleared} застарілих записів`, 'success');
    } else {
      showToast(`Термін зберігання звітів встановлено: ${safeDays} діб (${safeHours} год)`, 'success');
    }
  };

  useEffect(() => {
    if (securityShifts && securityShifts.length > 0 && !selectedShiftId) {
      setSelectedShiftId(securityShifts[0].id);
    }
  }, [securityShifts, selectedShiftId]);

  const selectedShift = useMemo(() => {
    if (!securityShifts || securityShifts.length === 0) return null;
    return securityShifts.find(s => s.id === selectedShiftId) || securityShifts[0];
  }, [securityShifts, selectedShiftId]);

  const selectedShiftComposition = useMemo(() => {
    if (!selectedShift) return 'склад зміни не встановлено';
    const members = (selectedShift.visitorIds || [])
      .map(id => visitors.find(v => v.id === id))
      .filter((v): v is NonNullable<typeof v> => !!v);
    
    if (members.length === 0) return 'склад зміни порожній';
    
    return members.map(m => {
      const parts = [m.category, formatNameAbbreviated(m.name)];
      if (m.callsign) parts.push(`[${m.callsign}]`);
      return parts.filter(Boolean).join(' ');
    }).join(', ');
  }, [selectedShift, visitors]);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const dateRange = useMemo(() => ({
    start: parseISO(startDate),
    end: parseISO(endDate + 'T23:59:59')
  }), [startDate, endDate]);

  const daysInRange = useMemo(() => {
    try {
      return eachDayOfInterval(dateRange);
    } catch (e) {
      return [];
    }
  }, [dateRange]);

  // Filter visitors who visited in the selected range
  const filteredData = useMemo(() => {
    const visitorVisits = visitors.filter(v => {
      const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
      const matchesSearch = (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (v.callsign || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = filterGroup === 'all' || v.group === filterGroup;
      
      const hasVisitInRange = logs.some(log => {
        if (!log.in) return false;
        const logDate = parseISO(log.in);
        return logDate >= dateRange.start && logDate <= dateRange.end;
      });

      return matchesSearch && matchesGroup && hasVisitInRange;
    });

    return visitorVisits;
  }, [visitors, searchQuery, filterGroup, dateRange]);

  const dirtySkyVisits = useMemo(() => {
    return (dirtySkyEvents || []).filter(e => {
      const logDate = parseISO(e.startTime);
      return logDate >= dateRange.start && logDate <= dateRange.end && (searchQuery === '' || 'брудне небо'.includes(searchQuery.toLowerCase()));
    });
  }, [dirtySkyEvents, dateRange, searchQuery]);

  const totalVisits = useMemo(() => {
    const vVisits = visitors.reduce((acc, v) => {
      const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
      const rangeLogs = logs.filter(log => log.in && parseISO(log.in) >= dateRange.start && parseISO(log.in) <= dateRange.end);
      return acc + rangeLogs.length;
    }, 0);
    const dsVisits = (dirtySkyEvents || []).filter(e => parseISO(e.startTime) >= dateRange.start && parseISO(e.startTime) <= dateRange.end).length;
    return vVisits + dsVisits;
  }, [visitors, dirtySkyEvents, dateRange]);

  const reportRows = useMemo(() => {
    const rows: any[] = [];
    
    visitors.forEach(v => {
      const matchesSearch = (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (v.callsign || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = filterGroup === 'all' || v.group === filterGroup;
      if (!matchesSearch || !matchesGroup) return;

      const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
      
      logs.forEach(log => {
        if (!log.in) return;
        const logDate = parseISO(log.in);
        if (logDate >= dateRange.start && logDate <= dateRange.end) {
          const start = logDate.getTime();
          const end = log.out ? parseISO(log.out).getTime() : Date.now();
          rows.push({
            type: 'visitor',
            visitor: v,
            date: logDate,
            maxTime: Math.max(start, end),
            log: log
          });
        }
      });
    });

    dirtySkyVisits.forEach(e => {
      const start = parseISO(e.startTime).getTime();
      const end = e.endTime ? parseISO(e.endTime).getTime() : Date.now();
      rows.push({
        type: 'dirtySky',
        event: e,
        date: parseISO(e.startTime),
        maxTime: Math.max(start, end),
        log: { in: e.startTime, out: e.endTime }
      });
    });

    (dutyEvents || []).forEach(de => {
      const eventDate = parseISO(de.timestamp);
      if (eventDate >= dateRange.start && eventDate <= dateRange.end) {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchShift = (de.shiftName || '').toLowerCase().includes(q);
          const matchAction = de.type === 'start' ? 'заступила'.includes(q) : 'закінчила'.includes(q);
          const matchGeneral = 'чергування'.includes(q) || 'чергова зміна'.includes(q) || 'охорона'.includes(q);
          if (!matchShift && !matchAction && !matchGeneral) return;
        }
        if (filterGroup !== 'all' && filterGroup !== 'Рота охорони' && filterGroup !== 'Охорона' && filterGroup !== 'Чергова служба') {
          return;
        }
        const t = eventDate.getTime();
        rows.push({
          type: 'dutyEvent',
          event: de,
          date: eventDate,
          maxTime: t,
          log: de.type === 'start' ? { in: de.timestamp } : { out: de.timestamp }
        });
      }
    });

    return rows;
  }, [visitors, dirtySkyVisits, dutyEvents, dateRange, searchQuery, filterGroup]);

  // Dynamic sorting of the results
  const sortedReportRows = useMemo(() => {
    const sorted = [...reportRows];
    
    sorted.sort((a, b) => {
      let valA: any = null;
      let valB: any = null;

      if (sortField === 'date') {
        const timeA = a.date.getTime();
        const timeB = b.date.getTime();
        if (timeA !== timeB) {
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }
        return sortOrder === 'asc' ? a.maxTime - b.maxTime : b.maxTime - a.maxTime;
      } else if (sortField === 'user') {
        const nameA = a.type === 'dirtySky' ? 'Брудне небо' : a.type === 'dutyEvent' ? `Чергова зміна ${a.event?.shiftName}` : (a.visitor?.name || '');
        const nameB = b.type === 'dirtySky' ? 'Брудне небо' : b.type === 'dutyEvent' ? `Чергова зміна ${b.event?.shiftName}` : (b.visitor?.name || '');
        valA = nameA.toLowerCase();
        valB = nameB.toLowerCase();
      } else if (sortField === 'brigade') {
        const locA = a.type === 'dirtySky' ? '' : a.type === 'dutyEvent' ? 'КПП' : (a.visitor?.location || '');
        const locB = b.type === 'dirtySky' ? '' : b.type === 'dutyEvent' ? 'КПП' : (b.visitor?.location || '');
        
        // Extract numbers for sorting: "по бригадах по номеру в назві бригади"
        const numA = parseInt(locA.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(locB.match(/\d+/)?.[0] || '0', 10);
        
        if (numA !== numB) {
          valA = numA;
          valB = numB;
        } else {
          valA = locA.toLowerCase();
          valB = locB.toLowerCase();
        }
      } else if (sortField === 'group') {
        const grpA = a.type === 'dirtySky' ? 'Спец. події' : a.type === 'dutyEvent' ? 'Рота охорони' : (a.visitor?.group || '');
        const grpB = b.type === 'dirtySky' ? 'Спец. події' : b.type === 'dutyEvent' ? 'Рота охорони' : (b.visitor?.group || '');
        valA = grpA.toLowerCase();
        valB = grpB.toLowerCase();
      } else if (sortField === 'timeIn') {
        const insA = a.log?.in ? new Date(a.log.in).getTime() : 0;
        const insB = b.log?.in ? new Date(b.log.in).getTime() : 0;
        valA = insA;
        valB = insB;
      } else if (sortField === 'timeOut') {
        const outA = a.log?.out ? new Date(a.log.out).getTime() : (a.type === 'dirtySky' && a.event?.endTime ? new Date(a.event.endTime).getTime() : 0);
        const outB = b.log?.out ? new Date(b.log.out).getTime() : (b.type === 'dirtySky' && b.event?.endTime ? new Date(b.event.endTime).getTime() : 0);
        valA = outA;
        valB = outB;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === '') return 1;
      if (valB === null || valB === '') return -1;
      
      const comparison = valA < valB ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [reportRows, sortField, sortOrder]);

  const uniqueVisitors = filteredData.length;

  const currentlyOnSiteCount = useMemo(() => {
    return visitors.filter(v => {
      const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
      const lastLog = logs[logs.length - 1];
      return (v.status === 'in') || (lastLog && lastLog.in && !lastLog.out);
    }).length;
  }, [visitors]);

  const enteredCount = useMemo(() => {
    let count = 0;
    visitors.forEach(v => {
      const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
      logs.forEach(log => {
        if (!log.in) return;
        const d = parseISO(log.in);
        if (d >= dateRange.start && d <= dateRange.end) count++;
      });
    });
    return count;
  }, [visitors, dateRange]);

  const exitedCount = useMemo(() => {
    let count = 0;
    visitors.forEach(v => {
      const logs = v.logs || [];
      logs.forEach(log => {
        if (!log.out) return;
        const d = parseISO(log.out);
        if (d >= dateRange.start && d <= dateRange.end) count++;
      });
    });
    return count;
  }, [visitors, dateRange]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <span className="opacity-30 text-[9px] ml-1">↕</span>;
    return sortOrder === 'asc' 
      ? <span className="text-primary font-bold text-[9px] ml-1">▲</span> 
      : <span className="text-primary font-bold text-[9px] ml-1">▼</span>;
  };

  const downloadCSV = () => {
    const headers = [
      'Дата', 'Звання', 'ПІБ', 'Позивний', 'Група', 'Бригада', 'Час входу', 'Час виходу'
    ];

    const csvRows = sortedReportRows.map(row => {
      const dateStr = format(row.date, 'dd.MM.yyyy');
      if (row.type === 'dirtySky') {
        const e = row.event;
        return [
          dateStr,
          '—',
          'Брудне небо',
          '—',
          'Спец. події',
          '—',
          format(parseISO(e.startTime), 'HH:mm'),
          e.endTime ? format(parseISO(e.endTime), 'HH:mm') : 'триває'
        ];
      } else if (row.type === 'dutyEvent') {
        const e = row.event;
        const isStart = e.type === 'start';
        const timeStr = format(parseISO(e.timestamp), 'HH:mm');
        return [
          dateStr,
          'Чергування',
          `Чергова зміна "${e.shiftName}" (${isStart ? 'Заступила на чергування' : 'Закінчила чергування'})`,
          isStart ? 'Заступила' : 'Закінчила',
          'Рота охорони',
          'КПП',
          isStart ? timeStr : '—',
          !isStart ? timeStr : '—'
        ];
      } else {
        const v = row.visitor;
        const log = row.log;
        const ins = log?.in ? format(parseISO(log.in), 'HH:mm') : '—';
        const outs = log?.out ? format(parseISO(log.out), 'HH:mm') : 'на посту';
        return [
          dateStr,
          v.category || '',
          formatNameAbbreviated(v.name),
          v.callsign || '',
          v.group || '',
          v.location || '',
          ins,
          outs
        ];
      }
    });

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    let filename = '';
    const formattedStart = format(parseISO(startDate), 'ddMMyyyy');
    const formattedEnd = format(parseISO(endDate), 'ddMMyyyy');
    if (formattedStart === formattedEnd) {
      filename = `Звіт_${formattedStart}.csv`;
    } else {
      filename = `Звіт_${formattedStart}-${formattedEnd}.csv`;
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const isLandscape = pdfOrientation === 'landscape';
      const doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const marginX = 10;
      const printableWidth = pageWidth - (marginX * 2);

      // Load fonts from local public directory
      try {
        const fontRes = await fetch('/fonts/Roboto-Regular.ttf');
        if (fontRes.ok) {
          const blob = await fontRes.blob();
          const base64Font = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          doc.addFileToVFS('Roboto-Regular.ttf', base64Font);
          doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
          doc.setFont('Roboto', 'normal');
        }
      } catch (fontErr) {
        console.warn('Could not load local font', fontErr);
      }

      try {
        const fontBoldRes = await fetch('/fonts/Roboto-Bold.ttf');
        if (fontBoldRes.ok) {
          const blobB = await fontBoldRes.blob();
          const base64Bold = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blobB);
          });
          doc.addFileToVFS('Roboto-Bold.ttf', base64Bold);
          doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        }
      } catch (boldErr) {
        console.warn('Could not load bold font', boldErr);
      }

      const formattedStart = format(parseISO(startDate), 'dd.MM.yyyy');
      const formattedEnd = format(parseISO(endDate), 'dd.MM.yyyy');
      const docRegNumber = `ЗВ-${format(new Date(), 'yyyyMMdd')}/${format(parseISO(startDate), 'dd')}`;

      // Column widths based on orientation
      const colWidths = isLandscape
        ? { num: 10, date: 24, name: 78, brigade: 48, group: 40, in: 22, out: 22, status: 21 }
        : { num: 9, date: 20, name: 54, brigade: 33, group: 30, in: 16, out: 16, status: 12 };

      const colX = {
        num: marginX,
        date: marginX + colWidths.num,
        name: marginX + colWidths.num + colWidths.date,
        brigade: marginX + colWidths.num + colWidths.date + colWidths.name,
        group: marginX + colWidths.num + colWidths.date + colWidths.name + colWidths.brigade,
        in: marginX + colWidths.num + colWidths.date + colWidths.name + colWidths.brigade + colWidths.group,
        out: marginX + colWidths.num + colWidths.date + colWidths.name + colWidths.brigade + colWidths.group + colWidths.in,
        status: marginX + colWidths.num + colWidths.date + colWidths.name + colWidths.brigade + colWidths.group + colWidths.in + colWidths.out
      };

      const truncateText = (text: string, maxLen: number) => {
        if (!text) return '—';
        return text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
      };

      let pageNum = 1;

      const renderHeader = (isFirstPage: boolean) => {
        if (isFirstPage) {
          // Document Title & Subtitle
          doc.setFont('Roboto', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(20, 20, 20);
          doc.text('ЖУРНАЛ ОБЛІКУ ВІДВІДУВАЧІВ ТА ПЕРЕМІЩЕНЬ (КПП)', marginX, 13);
          
          doc.setFont('Roboto', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('Контрольно-пропускний пункт • Військова частина • Офіційний зведений звіт', marginX, 17.5);
          
          doc.text(`Реєстраційний номер: ${docRegNumber}   |   Сформовано: ${format(new Date(), 'dd.MM.yyyy HH:mm:ss')}`, marginX, 22);
          doc.text(`Період звітування: ${formattedStart} — ${formattedEnd}`, marginX, 26);
          doc.text(`Чергова зміна: ${selectedShift?.name || '—'}   |   Склад наряду: ${truncateText(selectedShiftComposition, isLandscape ? 110 : 70)}`, marginX, 30);
          doc.text(`Всього фіксацій: ${totalVisits}   |   Унікальних осіб: ${uniqueVisitors}   |   «Брудне небо»: ${dirtySkyVisits.length}   |   На території (на посту): ${currentlyOnSiteCount}`, marginX, 34);

          doc.setDrawColor(30, 30, 30);
          doc.setLineWidth(0.4);
          doc.line(marginX, 37, marginX + printableWidth, 37);

          return 40;
        } else {
          // Running header on page 2+
          doc.setFont('Roboto', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(120, 120, 120);
          doc.text(`Журнал обліку КПП (${formattedStart} — ${formattedEnd}) • Реєстр: ${docRegNumber}`, marginX, 10);
          doc.line(marginX, 12, marginX + printableWidth, 12);
          return 14;
        }
      };

      const renderTableHeader = (currentY: number) => {
        doc.setFillColor(242, 242, 245);
        doc.rect(marginX, currentY, printableWidth, 7, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(marginX, currentY, printableWidth, 7, 'S');

        doc.setFont('Roboto', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(50, 50, 50);

        doc.text('№', colX.num + colWidths.num / 2, currentY + 4.8, { align: 'center' });
        doc.text('Дата', colX.date + colWidths.date / 2, currentY + 4.8, { align: 'center' });
        doc.text('Звання, ПІБ, Позивний', colX.name + 2, currentY + 4.8);
        doc.text('Звідки (Бригада)', colX.brigade + 2, currentY + 4.8);
        doc.text('Група', colX.group + 2, currentY + 4.8);
        doc.text('Вхід', colX.in + colWidths.in / 2, currentY + 4.8, { align: 'center' });
        doc.text('Вихід', colX.out + colWidths.out / 2, currentY + 4.8, { align: 'center' });
        doc.text('Статус', colX.status + colWidths.status / 2, currentY + 4.8, { align: 'center' });

        return currentY + 7;
      };

      let y = renderHeader(true);
      y = renderTableHeader(y);

      sortedReportRows.forEach((row, idx) => {
        const rowHeight = 7.5;
        if (y + rowHeight > pageHeight - 20) {
          // Bottom footer
          doc.setFont('Roboto', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(140, 140, 140);
          doc.text(`Сторінка ${pageNum}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

          doc.addPage();
          pageNum++;
          y = renderHeader(false);
          y = renderTableHeader(y);
        }

        // Row background
        if (row.type === 'dirtySky') {
          doc.setFillColor(254, 243, 199); // amber 100
          doc.rect(marginX, y, printableWidth, rowHeight, 'F');
        } else if (row.type === 'dutyEvent') {
          if (row.event?.type === 'start') {
            doc.setFillColor(236, 253, 245); // emerald 50
          } else {
            doc.setFillColor(255, 241, 242); // rose 50
          }
          doc.rect(marginX, y, printableWidth, rowHeight, 'F');
        } else if (idx % 2 === 1) {
          doc.setFillColor(249, 250, 251);
          doc.rect(marginX, y, printableWidth, rowHeight, 'F');
        }

        // Thin separator
        doc.setDrawColor(225, 225, 230);
        doc.setLineWidth(0.1);
        doc.line(marginX, y + rowHeight, marginX + printableWidth, y + rowHeight);

        const dateStr = format(row.date, 'dd.MM.yyyy');

        // Column 1: Index
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`${idx + 1}`, colX.num + colWidths.num / 2, y + 4.8, { align: 'center' });

        // Column 2: Date
        doc.setTextColor(50, 50, 50);
        doc.text(dateStr, colX.date + colWidths.date / 2, y + 4.8, { align: 'center' });

        if (row.type === 'dirtySky') {
          const e = row.event;
          const timeInStr = format(parseISO(e.startTime), 'HH:mm');
          const timeOutStr = e.endTime ? format(parseISO(e.endTime), 'HH:mm') : 'триває';
          const isOngoing = !e.endTime;

          doc.setFont('Roboto', 'bold');
          doc.setTextColor(180, 83, 9);
          doc.text('⚠️ БРУДНЕ НЕБО (Спец. подія)', colX.name + 2, y + 4.8);

          doc.setFont('Roboto', 'normal');
          doc.setTextColor(120, 120, 120);
          doc.text('—', colX.brigade + 2, y + 4.8);
          doc.text('Спец. події', colX.group + 2, y + 4.8);

          doc.setFont('Roboto', 'bold');
          doc.setTextColor(180, 83, 9);
          doc.text(timeInStr, colX.in + colWidths.in / 2, y + 4.8, { align: 'center' });
          doc.setTextColor(isOngoing ? 220 : 50, isOngoing ? 38 : 50, isOngoing ? 38 : 50);
          doc.text(timeOutStr, colX.out + colWidths.out / 2, y + 4.8, { align: 'center' });

          doc.setFontSize(6.5);
          doc.setTextColor(isOngoing ? 180 : 100, isOngoing ? 83 : 100, isOngoing ? 9 : 100);
          doc.text(isOngoing ? 'Триває' : 'Закрито', colX.status + colWidths.status / 2, y + 4.8, { align: 'center' });
        } else if (row.type === 'dutyEvent') {
          const e = row.event;
          const isStart = e.type === 'start';
          const timeStr = format(parseISO(e.timestamp), 'HH:mm');
          const actionText = isStart ? 'Заступила на чергування' : 'Закінчила чергування';

          doc.setFont('Roboto', 'bold');
          if (isStart) {
            doc.setTextColor(5, 150, 105);
          } else {
            doc.setTextColor(225, 29, 72);
          }
          doc.text(`[ЧЕРГУВАННЯ] ${e.shiftName}: ${actionText}`, colX.name + 2, y + 4.8);

          doc.setFont('Roboto', 'normal');
          doc.setTextColor(120, 120, 120);
          doc.text('КПП', colX.brigade + 2, y + 4.8);
          doc.text('Рота охорони', colX.group + 2, y + 4.8);

          if (isStart) {
            doc.setFont('Roboto', 'bold');
            doc.setTextColor(5, 150, 105);
            doc.text(timeStr, colX.in + colWidths.in / 2, y + 4.8, { align: 'center' });
            doc.setFont('Roboto', 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text('—', colX.out + colWidths.out / 2, y + 4.8, { align: 'center' });
          } else {
            doc.setFont('Roboto', 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text('—', colX.in + colWidths.in / 2, y + 4.8, { align: 'center' });
            doc.setFont('Roboto', 'bold');
            doc.setTextColor(225, 29, 72);
            doc.text(timeStr, colX.out + colWidths.out / 2, y + 4.8, { align: 'center' });
          }

          doc.setFontSize(6.5);
          doc.setTextColor(isStart ? 5 : 225, isStart ? 150 : 29, isStart ? 105 : 72);
          doc.text(isStart ? 'Заступила' : 'Закінчила', colX.status + colWidths.status / 2, y + 4.8, { align: 'center' });
        } else {
          const v = row.visitor;
          const log = row.log;
          const timeInStr = log?.in ? format(parseISO(log.in), 'HH:mm') : '—';
          const timeOutStr = log?.out ? format(parseISO(log.out), 'HH:mm') : 'на посту';
          const isOnSite = !log?.out;

          // Person
          const categoryStr = v.category ? `${v.category.toUpperCase()} ` : '';
          const namePart = formatNameAbbreviated(v.name);
          const callsignPart = v.callsign ? ` [${v.callsign}]` : '';
          const fullPersonText = truncateText(`${categoryStr}${namePart}${callsignPart}`, isLandscape ? 45 : 30);

          doc.setFont('Roboto', 'normal');
          doc.setTextColor(20, 20, 20);
          doc.text(fullPersonText, colX.name + 2, y + 4.8);

          // Brigade
          doc.setTextColor(60, 60, 60);
          doc.text(truncateText(v.location, isLandscape ? 28 : 18), colX.brigade + 2, y + 4.8);

          // Group
          doc.text(truncateText(v.group, isLandscape ? 24 : 16), colX.group + 2, y + 4.8);

          // In time
          doc.setFont('Roboto', 'normal');
          doc.setTextColor(5, 150, 105);
          doc.text(timeInStr, colX.in + colWidths.in / 2, y + 4.8, { align: 'center' });

          // Out time
          doc.setTextColor(isOnSite ? 180 : 50, isOnSite ? 83 : 50, isOnSite ? 9 : 50);
          doc.text(timeOutStr, colX.out + colWidths.out / 2, y + 4.8, { align: 'center' });

          // Status badge
          doc.setFontSize(6.5);
          doc.setTextColor(isOnSite ? 5 : 120, isOnSite ? 150 : 120, isOnSite ? 105 : 120);
          doc.text(isOnSite ? 'На посту' : 'Вибув', colX.status + colWidths.status / 2, y + 4.8, { align: 'center' });
        }

        y += rowHeight;
      });

      // Signature block on the last page
      if (y + 32 > pageHeight - 15) {
        // Bottom footer
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        doc.text(`Сторінка ${pageNum}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

        doc.addPage();
        pageNum++;
        y = 15;
      }

      y += 8;
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.3);
      doc.line(marginX, y, marginX + printableWidth, y);
      y += 5;

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);

      const sigColW = printableWidth / 3;
      // Col 1: Звіт склав
      doc.text('Звіт склав (Черговий КПП):', marginX, y);
      doc.text('Підпис: ____________ / ПІБ: ________________', marginX, y + 6);

      // Col 2: Зміну здав
      doc.text('Зміну здав:', marginX + sigColW, y);
      doc.text('Підпис: ____________ / ПІБ: ________________', marginX + sigColW, y + 6);

      // Col 3: Зміну прийняв
      doc.text('Зміну прийняв:', marginX + sigColW * 2, y);
      doc.text('Підпис: ____________ / ПІБ: ________________', marginX + sigColW * 2, y + 6);

      y += 12;
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('Дата засвідчення: «___» ____________ 2026 р.         М. П.         Автоматизований комплекс КПП', marginX, y);

      // Last page footer
      doc.text(`Сторінка ${pageNum}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

      let pdfFilename = '';
      const formattedStartFile = format(parseISO(startDate), 'ddMMyyyy');
      const formattedEndFile = format(parseISO(endDate), 'ddMMyyyy');
      if (formattedStartFile === formattedEndFile) {
        pdfFilename = `Звіт_КПП_${formattedStartFile}.pdf`;
      } else {
        pdfFilename = `Звіт_КПП_${formattedStartFile}-${formattedEndFile}.pdf`;
      }

      doc.save(pdfFilename);
    } catch (e) {
      console.error(e);
      if (confirm('Помилка при генерації файлу. Відкрити вікно друку / збереження в PDF браузера?')) {
        window.print();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Count candidate records for the cleanup modal
  const cleanCandidateCount = useMemo(() => {
    if (cleanMode === 'all') {
      const allVisitorLogs = visitors.reduce((acc, v) => acc + (v.logs?.length || (v.lastEntry ? 1 : 0)), 0);
      const allDs = dirtySkyEvents?.length || 0;
      const allDuty = dutyEvents?.length || 0;
      return allVisitorLogs + allDs + allDuty;
    }

    let from: Date;
    let to: Date;

    if (cleanPeriodType === 'days') {
      if (cleanDaysScope === 'older_than') {
        from = new Date(0);
        to = new Date(Date.now() - cleanDays * 24 * 60 * 60 * 1000);
      } else {
        from = new Date(Date.now() - cleanDays * 24 * 60 * 60 * 1000);
        to = new Date();
      }
    } else if (cleanPeriodType === 'current_filter') {
      from = parseISO(startDate);
      to = parseISO(endDate + 'T23:59:59.999');
    } else {
      // custom_range
      try {
        from = parseISO(customCleanStart);
        to = parseISO(customCleanEnd + 'T23:59:59.999');
      } catch {
        return 0;
      }
    }

    let count = 0;
    visitors.forEach(v => {
      const logs = v.logs || (v.lastEntry ? [{ in: v.lastEntry }] : []);
      logs.forEach(log => {
        if (!log.in) return;
        const d = parseISO(log.in);
        if (d >= from && d <= to) count++;
      });
    });

    (dirtySkyEvents || []).forEach(e => {
      const d = parseISO(e.startTime);
      if (d >= from && d <= to) count++;
    });

    (dutyEvents || []).forEach(de => {
      const d = parseISO(de.timestamp);
      if (d >= from && d <= to) count++;
    });

    return count;
  }, [cleanMode, cleanPeriodType, cleanDays, cleanDaysScope, customCleanStart, customCleanEnd, startDate, endDate, visitors, dirtySkyEvents, dutyEvents]);

  const handleExecuteClean = () => {
    setIsCleaning(true);
    try {
      if (cleanMode === 'all') {
        if (!confirmAllCheck) {
          showToast('Позначте прапорець підтвердження повного очищення', 'error');
          setIsCleaning(false);
          return;
        }
        const res = purgeAllReports();
        const total = res.logsCleared + res.eventsCleared + res.dutyEventsCleared;
        showToast(`Повне очищення виконано: видалено ${total} записів звітів`, 'success');
        setShowCleanModal(false);
        setConfirmAllCheck(false);
      } else {
        let fromDate: Date;
        let toDate: Date;

        if (cleanPeriodType === 'days') {
          if (cleanDaysScope === 'older_than') {
            fromDate = new Date(0);
            toDate = new Date(Date.now() - cleanDays * 24 * 60 * 60 * 1000);
          } else {
            fromDate = new Date(Date.now() - cleanDays * 24 * 60 * 60 * 1000);
            toDate = new Date();
          }
        } else if (cleanPeriodType === 'current_filter') {
          fromDate = parseISO(startDate);
          toDate = parseISO(endDate + 'T23:59:59.999');
        } else {
          fromDate = parseISO(customCleanStart);
          toDate = parseISO(customCleanEnd + 'T23:59:59.999');
        }

        const res = purgeReportsByDateRange(fromDate, toDate);
        const total = res.logsCleared + res.eventsCleared + res.dutyEventsCleared;
        if (total === 0) {
          showToast('За вказаний період немає записів для видалення', 'info');
        } else {
          const detail = cleanPeriodType === 'days' ? `за ${cleanDays} діб` : 'за вказаний період';
          showToast(`Очищено ${total} записів звітів (${detail})`, 'success');
        }
        setShowCleanModal(false);
      }
    } catch (err) {
      console.error('Clean error:', err);
      showToast('Помилка при очищенні даних', 'error');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-2.5 max-w-7xl mx-auto pb-12 font-roboto font-normal">
      {/* Summary Metrics Row: 4 compact blocks with adaptive scaling (Single Line: Label - Count in Middle - Icon) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full no-print">
        {/* 1. Відвідувачів (унікальних) */}
        <div className="bg-indigo-500/10 hover:bg-indigo-500/15 rounded-xl px-2 sm:px-2 md:px-2.5 py-1 flex items-center justify-between min-w-0 flex-nowrap shadow-2xs hover:shadow-xs transition-all h-9 sm:h-9 md:h-10">
          <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[8.5px] md:text-[10px] lg:text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider shrink-0 select-none truncate">
            Відвідувачів:
          </span>
          <span className="flex-1 text-center text-xs min-[380px]:text-sm sm:text-xs md:text-sm lg:text-base font-black text-indigo-700 dark:text-indigo-300 tabular-nums px-1 min-w-0 truncate">
            {uniqueVisitors}
          </span>
          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shrink-0 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>

        {/* 2. На локації */}
        <div className="bg-emerald-500/10 hover:bg-emerald-500/15 rounded-xl px-2 sm:px-2 md:px-2.5 py-1 flex items-center justify-between min-w-0 flex-nowrap shadow-2xs hover:shadow-xs transition-all h-9 sm:h-9 md:h-10">
          <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[8.5px] md:text-[10px] lg:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider shrink-0 select-none truncate">
            На локації:
          </span>
          <span className="flex-1 text-center text-xs min-[380px]:text-sm sm:text-xs md:text-sm lg:text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums px-1 min-w-0 truncate">
            {currentlyOnSiteCount}
          </span>
          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shrink-0 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>

        {/* 3. Зайшло */}
        <div className="bg-sky-500/10 hover:bg-sky-500/15 rounded-xl px-2 sm:px-2 md:px-2.5 py-1 flex items-center justify-between min-w-0 flex-nowrap shadow-2xs hover:shadow-xs transition-all h-9 sm:h-9 md:h-10">
          <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[8.5px] md:text-[10px] lg:text-[11px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider shrink-0 select-none truncate">
            Зайшло:
          </span>
          <span className="flex-1 text-center text-xs min-[380px]:text-sm sm:text-xs md:text-sm lg:text-base font-black text-sky-700 dark:text-sky-300 tabular-nums px-1 min-w-0 truncate">
            {enteredCount}
          </span>
          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shrink-0 bg-sky-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <LogIn className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>

        {/* 4. Вийшло */}
        <div className="bg-rose-500/10 hover:bg-rose-500/15 rounded-xl px-2 sm:px-2 md:px-2.5 py-1 flex items-center justify-between min-w-0 flex-nowrap shadow-2xs hover:shadow-xs transition-all h-9 sm:h-9 md:h-10">
          <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[8.5px] md:text-[10px] lg:text-[11px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider shrink-0 select-none truncate">
            Вийшло:
          </span>
          <span className="flex-1 text-center text-xs min-[380px]:text-sm sm:text-xs md:text-sm lg:text-base font-black text-rose-700 dark:text-rose-300 tabular-nums px-1 min-w-0 truncate">
            {exitedCount}
          </span>
          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 shrink-0 bg-rose-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
            <LogOut className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>
      </div>

      {/* Superadministrator Management Panel: Retention in days & Reports Cleaning (No outer border) */}
      {isSuperAdmin && (
        <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 no-print animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                    Адміністрування збереження та очищення звітів
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-black uppercase tracking-wider">
                    Суперадміністратор
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  Встановлення терміну зберігання даних у добах та очищення бази звітів
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
            {/* 1. Retention period in days (No quick selection, only input field for days) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/20 rounded-xl p-2.5 sm:p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">
                    Термін зберігання звітів:
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Активно: <span className="font-bold text-primary">{currentRetentionDays} діб</span> ({reportRetentionHours} год)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customRetentionDays}
                  onChange={(e) => setCustomRetentionDays(parseInt(e.target.value, 10) || 1)}
                  className="w-16 px-2 py-1.5 bg-background border-0 shadow-2xs rounded-lg text-xs font-bold text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Діб"
                  title="Вкажіть кількість діб для зберігання звітів"
                />
                <span className="text-xs text-muted-foreground font-semibold">діб</span>
                <button
                  type="button"
                  onClick={() => setShowRetentionConfirmModal(true)}
                  disabled={customRetentionDays === currentRetentionDays}
                  className="px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:hover:bg-primary rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Зберегти термін зберігання"
                >
                  Зберегти
                </button>
              </div>
            </div>

            {/* 2. Clear database by number of days (Clean reports button without ellipsis) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-destructive/5 rounded-xl p-2.5 sm:p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">
                    Очистити базу за:
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Кількість діб для очищення
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={cleanDays}
                  onChange={(e) => setCleanDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 px-2 py-1.5 bg-background border-0 shadow-2xs rounded-lg text-xs font-bold text-foreground text-center focus:outline-none focus:ring-1 focus:ring-destructive"
                  placeholder="Діб"
                  title="Вкажіть за яку кількість діб треба очистити базу"
                />
                <span className="text-xs text-muted-foreground font-semibold">діб</span>
                <button
                  type="button"
                  onClick={() => {
                    setCleanMode('period');
                    setCleanPeriodType('days');
                    setConfirmAllCheck(false);
                    setShowCleanModal(true);
                  }}
                  className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg flex items-center gap-1.5 font-bold text-xs uppercase cursor-pointer select-none active:scale-95 transition-all shadow-xs shrink-0"
                  title="Очистити базу звітів за вказану кількість діб"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Очистити звіти</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range, Shift Selector and Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 no-print">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex flex-row items-center gap-2 sm:gap-3 bg-card rounded-2xl p-2 shadow-sm text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2">
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/60" />
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">З:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs sm:text-sm font-normal focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="h-4 w-[1px] bg-border/40" />
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">По:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs sm:text-sm font-normal focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {securityShifts && securityShifts.length > 0 && (
            <div className="flex items-center gap-2 bg-card rounded-2xl px-3 py-2 shadow-sm text-xs">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground uppercase font-bold tracking-wider text-[10px]">Зміна:</span>
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="bg-transparent border-none outline-none font-semibold text-foreground text-xs cursor-pointer focus:ring-0"
              >
                {securityShifts.map((s, idx) => (
                  <option key={s.id || `shift-opt-${idx}`} value={s.id} className="bg-card text-foreground">
                    {s.name} {s.status === 'active' ? '(чергує)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-card rounded-2xl p-1.5 shadow-sm ml-auto">
          <button 
            type="button"
            onClick={() => setShowPdfPreview(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-1.5 font-bold text-[10px] sm:text-xs uppercase cursor-pointer select-none active:scale-95 transition-all shadow-md shadow-red-600/20"
            title="Експорт та друк у форматі PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button 
            type="button"
            onClick={() => {
              setShowPdfPreview(true);
              setTimeout(() => window.print(), 250);
            }}
            className="px-2.5 sm:px-3 py-1.5 bg-secondary hover:bg-muted text-foreground rounded-xl flex items-center justify-center gap-1.5 font-bold text-[10px] sm:text-xs uppercase cursor-pointer select-none active:scale-95 transition-all"
            title="Швидкий друк офіційного звіту"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Друк</span>
          </button>
          <button 
            type="button"
            onClick={downloadCSV}
            className="px-2.5 sm:px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-1.5 font-bold text-[10px] sm:text-xs uppercase cursor-pointer select-none active:scale-95 transition-all shadow-md shadow-emerald-500/10"
            title="Експорт таблиці в CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Print-Only Professional Document Layout (Rendered on A4 landscape/portrait printer output) */}
      <div className="hidden print:block">
        <PrintableReportDocument
          startDate={startDate}
          endDate={endDate}
          reportRows={sortedReportRows}
          totalVisits={totalVisits}
          uniqueVisitors={uniqueVisitors}
          dirtySkyCount={dirtySkyVisits.length}
          currentlyOnSiteCount={currentlyOnSiteCount}
          selectedShift={selectedShift}
          selectedShiftComposition={selectedShiftComposition}
          orientation={pdfOrientation}
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-card rounded-3xl overflow-hidden shadow-sm no-print">
        <div className="p-3 sm:p-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 no-print">
              <VoiceSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Пошук за іменем чи позивним..."
                containerClassName="flex-1"
              />
              <div className="flex gap-2">
                <select 
                  className="w-full sm:w-auto px-3.5 py-2 border-0 rounded-xl bg-muted/40 outline-none focus:ring-2 focus:ring-primary/20 font-medium text-xs sm:text-sm cursor-pointer hover:bg-muted/60 transition-colors min-w-[140px]"
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                >
                  <option key="default-all-groups" value="all">Всі групи</option>
                  {(groups || []).map((g, idx) => (
                    <option key={g.id ? `report-grp-${g.id}` : `report-grp-idx-${idx}`} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable table container that preserves exact desktop table columns on all resolutions */}
            <div className="rounded-2xl overflow-hidden bg-card/60 mt-3 print:mt-0">
              <div className="overflow-x-auto">
                <div className="min-w-[660px]">
                  {/* Table Header with interactive Sorting */}
                  <div className="reports-table-grid grid grid-cols-[75px_1fr_120px_130px_65px_70px_36px] sm:grid-cols-[85px_1fr_130px_140px_70px_75px_40px] items-center bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 select-none">
                    <button 
                      onClick={() => handleSort('date')}
                      className="px-2 py-2.5 text-center justify-center flex items-center cursor-pointer hover:bg-muted/80 transition-colors focus:outline-none h-full"
                    >
                      Дата{renderSortIndicator('date')}
                    </button>
                    <button 
                      onClick={() => handleSort('user')}
                      className="px-3 sm:px-4 py-2.5 text-left flex items-center cursor-pointer hover:bg-muted/80 transition-colors focus:outline-none h-full"
                    >
                      Користувач{renderSortIndicator('user')}
                    </button>
                    <button 
                      onClick={() => handleSort('brigade')}
                      className="px-3 sm:px-4 py-2.5 text-left flex items-center cursor-pointer hover:bg-muted/80 transition-colors focus:outline-none h-full"
                    >
                      Звідки{renderSortIndicator('brigade')}
                    </button>
                    <button 
                      onClick={() => handleSort('group')}
                      className="px-3 sm:px-4 py-2.5 text-left flex items-center cursor-pointer hover:bg-muted/80 transition-colors focus:outline-none h-full"
                    >
                      Група{renderSortIndicator('group')}
                    </button>
                    <button 
                      onClick={() => handleSort('timeIn')}
                      className="px-2 py-2.5 text-center justify-center flex items-center cursor-pointer hover:bg-muted/80 transition-colors focus:outline-none h-full"
                    >
                      Вхід{renderSortIndicator('timeIn')}
                    </button>
                    <button 
                      onClick={() => handleSort('timeOut')}
                      className="px-2 py-2.5 text-center justify-center flex items-center cursor-pointer hover:bg-muted/80 transition-colors focus:outline-none h-full"
                    >
                      Вихід{renderSortIndicator('timeOut')}
                    </button>
                    <div className="px-1 py-2.5 text-center justify-center flex items-center h-full text-muted-foreground" title="Редагування часу входу/виходу">
                      <Pencil className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </div>

                  <div className="divide-y divide-border/40">
                    {sortedReportRows.length > 0 ? (
                      sortedReportRows.map((row, idx) => {
                        const dateStr = format(row.date, 'dd.MM.yyyy');
                        
                        if (row.type === 'dirtySky') {
                          const e = row.event;
                          return (
                            <div 
                              key={`report-ds-${e.id || 'ds'}-${idx}-${e.startTime || ''}`} 
                              className="reports-table-grid grid grid-cols-[75px_1fr_120px_130px_65px_70px_36px] sm:grid-cols-[85px_1fr_130px_140px_70px_75px_40px] items-center hover:bg-amber-500/10 bg-amber-500/5 transition-colors py-2 px-0"
                            >
                              <div className="px-2 py-1.5 text-xs flex items-center justify-center text-center font-mono h-full">
                                {dateStr}
                              </div>
                              <div className="px-3 sm:px-4 py-1.5 h-full flex flex-col justify-center min-w-0">
                                <div className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400">Брудне небо</div>
                                <div className="text-[10px] text-muted-foreground uppercase font-medium">Спеціальна подія</div>
                              </div>
                              <div className="px-3 sm:px-4 py-1.5 text-xs flex items-center truncate text-muted-foreground h-full">
                                —
                              </div>
                              <div className="px-3 sm:px-4 py-1.5 text-xs font-semibold flex items-center truncate text-amber-600 h-full">
                                Спец. події
                              </div>
                              <div className="px-2 py-1.5 text-xs tabular-nums text-amber-600 font-bold flex items-center justify-center text-center h-full">
                                {format(parseISO(e.startTime), 'HH:mm')}
                              </div>
                              <div className="px-2 py-1.5 text-xs tabular-nums text-red-600 font-bold flex items-center justify-center text-center h-full">
                                {e.endTime ? format(parseISO(e.endTime), 'HH:mm') : 'триває'}
                              </div>
                              <div className="px-1 py-1.5 flex items-center justify-center text-xs text-muted-foreground h-full">
                                —
                              </div>
                            </div>
                          );
                        }

                        if (row.type === 'dutyEvent') {
                          const e = row.event;
                          const isStart = e.type === 'start';
                          const timeStr = format(parseISO(e.timestamp), 'HH:mm');
                          return (
                            <div 
                              key={`report-duty-${e.id || 'duty'}-${idx}-${e.timestamp || ''}`} 
                              className={`reports-table-grid grid grid-cols-[75px_1fr_120px_130px_65px_70px_36px] sm:grid-cols-[85px_1fr_130px_140px_70px_75px_40px] items-center transition-colors py-2 px-0 ${
                                isStart ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'bg-rose-500/5 hover:bg-rose-500/10'
                              }`}
                            >
                              <div className="px-2 py-1.5 text-xs flex items-center justify-center text-center font-mono h-full">
                                {dateStr}
                              </div>
                              <div className="px-3 sm:px-4 py-1.5 h-full flex flex-col justify-center min-w-0">
                                <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 text-muted-foreground">
                                  <Shield className={`w-3 h-3 ${isStart ? 'text-emerald-500' : 'text-rose-500'}`} />
                                  <span>Чергова служба • Охорона</span>
                                </div>
                                <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                  Чергова зміна: {e.shiftName}
                                </div>
                                <div className={`text-[10px] font-medium truncate ${isStart ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {isStart ? `Заступила на чергування о ${timeStr}` : `Закінчила чергування о ${timeStr}`}
                                </div>
                              </div>
                              <div className="px-3 sm:px-4 py-1.5 text-xs font-medium flex items-center truncate text-muted-foreground h-full">
                                КПП
                              </div>
                              <div className="px-3 sm:px-4 py-1.5 text-xs font-semibold flex items-center truncate text-muted-foreground h-full">
                                Рота охорони
                              </div>
                              <div className="px-2 py-1.5 text-xs tabular-nums text-emerald-600 font-bold flex items-center justify-center text-center h-full">
                                {isStart ? timeStr : '—'}
                              </div>
                              <div className="px-2 py-1.5 text-xs tabular-nums text-rose-600 font-bold flex items-center justify-center text-center h-full">
                                {!isStart ? timeStr : '—'}
                              </div>
                              <div className="px-1 py-1.5 flex items-center justify-center text-xs text-muted-foreground h-full">
                                —
                              </div>
                            </div>
                          );
                        }

                        const v = row.visitor;
                        const visitorGroup = groups.find(g => g.name === v.group);
                        const blockColor = v.color || visitorGroup?.color;
                        const hasGroupColor = !!blockColor && blockColor !== 'transparent';
                        const rowStyles = hasGroupColor ? {
                          backgroundColor: blockColor.startsWith('#') ? `${blockColor}15` : blockColor,
                        } : {};

                        return (
                          <div 
                            key={`report-vis-${v.id || 'vis'}-${idx}-${row.log?.in || ''}`} 
                            className="reports-table-grid grid grid-cols-[75px_1fr_120px_130px_65px_70px_36px] sm:grid-cols-[85px_1fr_130px_140px_70px_75px_40px] items-center hover:bg-secondary/30 transition-colors py-2 px-0" 
                            style={rowStyles}
                          >
                            <div className="px-2 py-1.5 text-xs flex items-center justify-center text-center font-mono h-full">
                              {dateStr}
                            </div>
                            <div className="px-3 sm:px-4 py-1.5 h-full flex flex-col justify-center min-w-0">
                              {v.category && (
                                <span className="text-[9px] text-muted-foreground uppercase font-semibold leading-tight truncate">
                                  {v.category}
                                </span>
                              )}
                              <div className="text-xs sm:text-sm font-medium text-foreground truncate leading-snug">
                                {formatNameAbbreviated(v.name)}
                              </div>
                              {v.callsign && (
                                <div className="text-[10px] font-bold text-primary/80 uppercase tracking-wider truncate leading-tight">
                                  {v.callsign}
                                </div>
                              )}
                            </div>
                            <div className="px-3 sm:px-4 py-1.5 text-xs font-medium flex items-center truncate h-full" title={v.location}>
                              {v.location || '—'}
                            </div>
                            <div className="px-3 sm:px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 truncate h-full" title={v.group}>
                              {visitorGroup?.color && visitorGroup.color !== 'transparent' && (
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: visitorGroup.color }} />
                              )}
                              <span className="truncate">{v.group || '—'}</span>
                            </div>
                            {/* Interactive In Time */}
                            <div 
                              onClick={() => handleOpenEditLog(v, row.log, row.date)}
                              className="px-2 py-1.5 text-xs tabular-nums text-emerald-600 font-bold flex items-center justify-center text-center h-full cursor-pointer hover:bg-emerald-500/15 transition-colors group/in"
                              title="Натисніть для зміни часу входу/виходу"
                            >
                              <span className="group-hover/in:underline decoration-emerald-500/50 underline-offset-2">
                                {row.log?.in ? format(parseISO(row.log.in), 'HH:mm') : '—'}
                              </span>
                            </div>
                            {/* Interactive Out Time */}
                            <div 
                              onClick={() => handleOpenEditLog(v, row.log, row.date)}
                              className="px-2 py-1.5 text-xs tabular-nums text-red-600 font-bold flex items-center justify-center text-center h-full cursor-pointer hover:bg-rose-500/15 transition-colors group/out"
                              title="Натисніть для зміни часу входу/виходу"
                            >
                              <span className="group-hover/out:underline decoration-rose-500/50 underline-offset-2">
                                {row.log?.out ? format(parseISO(row.log.out), 'HH:mm') : 'на посту'}
                              </span>
                            </div>
                            {/* Edit Action Button */}
                            <div className="px-1 py-1.5 flex items-center justify-center h-full">
                              <button
                                onClick={() => handleOpenEditLog(v, row.log, row.date)}
                                className="w-7 h-7 rounded-lg bg-muted/60 hover:bg-primary text-muted-foreground hover:text-primary-foreground transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                                title="Редагувати час входу та виходу"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-6 py-12 text-center text-muted-foreground italic text-xs sm:text-sm">
                        Даних за обраний період не знайдено
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Export & Printable Document Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col no-print animate-in fade-in duration-200">
          {/* Modal Header Toolbar */}
          <div className="bg-neutral-900 border-b border-neutral-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-wide flex items-center gap-2">
                  <span>Експорт та друк звіту</span>
                  <span className="text-[10px] bg-red-600/30 text-red-300 font-semibold px-2 py-0.5 rounded-full border border-red-500/30 uppercase">PDF A4</span>
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Офіційний бланк зведеного обліку КПП з електронним реєстром та блоком підписів
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Shift selection */}
              {securityShifts && securityShifts.length > 0 && (
                <div className="flex items-center gap-1.5 bg-neutral-800 px-2.5 py-1.5 rounded-xl border border-neutral-700 text-xs">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Зміна:</span>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="bg-transparent text-white border-none outline-none text-xs cursor-pointer font-medium focus:ring-0"
                  >
                    {securityShifts.map((s, idx) => (
                      <option key={`modal-shift-${s.id || idx}`} value={s.id} className="bg-neutral-900 text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Orientation toggle */}
              <div className="flex items-center bg-neutral-800 p-0.5 rounded-xl border border-neutral-700 text-xs">
                <button
                  type="button"
                  onClick={() => setPdfOrientation('portrait')}
                  className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                    pdfOrientation === 'portrait' ? 'bg-neutral-700 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Книжкова
                </button>
                <button
                  type="button"
                  onClick={() => setPdfOrientation('landscape')}
                  className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                    pdfOrientation === 'landscape' ? 'bg-neutral-700 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Альбомна
                </button>
              </div>

              {/* Print / Save to PDF */}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Відкрити системне вікно друку або збереження в PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Зберегти як PDF / Друк</span>
              </button>

              {/* Direct PDF Download button */}
              <button
                type="button"
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Завантажити готовий PDF-файл на пристрій"
              >
                <FileDown className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Формування...' : 'Завантажити .PDF'}</span>
              </button>

              {/* Close Modal button */}
              <button
                type="button"
                onClick={() => setShowPdfPreview(false)}
                className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Закрити вікно перегляду"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Preview Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-neutral-950/80">
            <div className="my-auto shadow-2xl rounded bg-white">
              <PrintableReportDocument
                startDate={startDate}
                endDate={endDate}
                reportRows={sortedReportRows}
                totalVisits={totalVisits}
                uniqueVisitors={uniqueVisitors}
                dirtySkyCount={dirtySkyVisits.length}
                currentlyOnSiteCount={currentlyOnSiteCount}
                selectedShift={selectedShift}
                selectedShiftComposition={selectedShiftComposition}
                orientation={pdfOrientation}
              />
            </div>
          </div>
        </div>
      )}

      {/* Superadmin Reports Cleanup Modal */}
      {showCleanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 no-print animate-in fade-in duration-200">
          <div className="bg-card border border-destructive/30 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Очищення звітів та журналів
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-destructive/15 text-destructive text-[10px] font-black uppercase tracking-wider">
                      Суперадмін
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Видалення записів відвідувань, подій «Брудне небо» та чергувань
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Закрити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selection: Period vs All */}
            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-2xl border border-border/50">
              <button
                type="button"
                onClick={() => setCleanMode('period')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  cleanMode === 'period'
                    ? 'bg-card text-foreground shadow-xs font-black border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>За період</span>
              </button>
              <button
                type="button"
                onClick={() => setCleanMode('all')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  cleanMode === 'all'
                    ? 'bg-destructive text-destructive-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-destructive'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Всі звіти (повністю)</span>
              </button>
            </div>

            {/* Mode Content: Period options */}
            {cleanMode === 'period' ? (
              <div className="space-y-3 bg-muted/20 border border-border/50 rounded-2xl p-3.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Параметри періоду для очищення:
                </span>

                <div className="space-y-2">
                  {/* Option 1: By specified days */}
                  <label
                    onClick={() => setCleanPeriodType('days')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      cleanPeriodType === 'days'
                        ? 'bg-primary/10 border-primary/40 text-foreground'
                        : 'bg-card hover:bg-muted/40 border-border/60 text-muted-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cleanPeriodType"
                      checked={cleanPeriodType === 'days'}
                      onChange={() => setCleanPeriodType('days')}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">
                        За вказану кількість діб ({cleanDays} діб)
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {cleanDaysScope === 'older_than' 
                          ? `Очистити всі записи, старіші за ${cleanDays} діб` 
                          : `Очистити записи за останні ${cleanDays} діб`}
                      </div>

                      {cleanPeriodType === 'days' && (
                        <div className="mt-2.5 pt-2 border-t border-border/40 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground font-medium">Кількість:</span>
                            <input
                              type="number"
                              min="1"
                              max="3650"
                              value={cleanDays}
                              onChange={(e) => setCleanDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-xs font-bold text-foreground text-center focus:ring-1 focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-muted-foreground font-semibold">діб</span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCleanDaysScope('older_than');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                cleanDaysScope === 'older_than'
                                  ? 'bg-primary text-primary-foreground font-black shadow-xs'
                                  : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Старіші за {cleanDays} діб
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCleanDaysScope('last_days');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                cleanDaysScope === 'last_days'
                                  ? 'bg-primary text-primary-foreground font-black shadow-xs'
                                  : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              За останні {cleanDays} діб
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Option 2: Current filter */}
                  <label
                    onClick={() => setCleanPeriodType('current_filter')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      cleanPeriodType === 'current_filter'
                        ? 'bg-primary/10 border-primary/40 text-foreground'
                        : 'bg-card hover:bg-muted/40 border-border/60 text-muted-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cleanPeriodType"
                      checked={cleanPeriodType === 'current_filter'}
                      onChange={() => setCleanPeriodType('current_filter')}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">
                        Поточний фільтр вкладки
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        З <span className="font-semibold text-foreground">{startDate}</span> по <span className="font-semibold text-foreground">{endDate}</span>
                      </div>
                    </div>
                  </label>

                  {/* Option 3: Custom range */}
                  <label
                    onClick={() => setCleanPeriodType('custom_range')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      cleanPeriodType === 'custom_range'
                        ? 'bg-primary/10 border-primary/40 text-foreground'
                        : 'bg-card hover:bg-muted/40 border-border/60 text-muted-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cleanPeriodType"
                      checked={cleanPeriodType === 'custom_range'}
                      onChange={() => setCleanPeriodType('custom_range')}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">
                        Власний діапазон дат
                      </div>
                      {cleanPeriodType === 'custom_range' && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-1 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">З дати:</span>
                            <input
                              type="date"
                              value={customCleanStart}
                              onChange={(e) => setCustomCleanStart(e.target.value)}
                              className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">По дату:</span>
                            <input
                              type="date"
                              value={customCleanEnd}
                              onChange={(e) => setCustomCleanEnd(e.target.value)}
                              className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              /* Mode Content: All reports warning & confirmation */
              <div className="space-y-3 bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-destructive uppercase tracking-wide">
                      Увага: Повне видалення всієї історії звітів!
                    </h4>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      Ця дія безповоротно видалить усі журнали входів та виходів відвідувачів, усі записи спеціальних подій «Брудне небо» та всі події чергувань охорони.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 pt-2 border-t border-destructive/20 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmAllCheck}
                    onChange={(e) => setConfirmAllCheck(e.target.checked)}
                    className="mt-0.5 rounded border-destructive text-destructive focus:ring-destructive cursor-pointer"
                  />
                  <span className="text-xs font-bold text-destructive">
                    Я підтверджую, що хочу безповоротно видалити абсолютно всі звіти
                  </span>
                </label>
              </div>
            )}

            {/* Found candidate count */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border border-border/40 rounded-xl text-xs">
              <span className="text-muted-foreground">Знайдено для видалення:</span>
              <span className={`font-black ${cleanCandidateCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {cleanCandidateCount} записів
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleExecuteClean}
                disabled={isCleaning || (cleanMode === 'all' && !confirmAllCheck) || cleanCandidateCount === 0}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-destructive hover:bg-destructive/90 disabled:opacity-40 disabled:hover:bg-destructive text-destructive-foreground flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isCleaning ? 'Очищення...' : cleanMode === 'all' ? 'Видалити всі звіти' : 'Очистити за період'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Superadmin Retention Confirmation Modal */}
      {showRetentionConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 no-print animate-in fade-in duration-200">
          <div className="bg-card border border-primary/30 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Підтвердження терміну зберігання
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Автоматичне очищення застарілих звітів
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRetentionConfirmModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Закрити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-muted/30 border border-border/50 rounded-2xl p-4">
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                Встановити новий термін зберігання звітів у{' '}
                <span className="font-bold text-primary underline underline-offset-2">
                  {customRetentionDays} діб ({customRetentionDays * 24} год)
                </span>
                ?
              </p>
              <div className="flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Усі записи, старші за {customRetentionDays} діб від поточного моменту, будуть автоматично і безповоротно видалені з бази даних.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowRetentionConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveRetentionDays(customRetentionDays);
                  setShowRetentionConfirmModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Підтвердити</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Dialog for Editing Entry/Exit Time */}
      {editingLogModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 no-print animate-in fade-in duration-150">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Pencil className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Редагування часу запису</h3>
                  <p className="text-xs text-muted-foreground">Коригування відмітки входу та виходу на КПП</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLogModal(null)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visitor Brief Card */}
            <div className="p-3 bg-muted/40 border border-border/60 rounded-2xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  {editingLogModal.visitor?.category || 'Відвідувач'}
                </div>
                <div className="text-sm font-bold text-foreground truncate">
                  {editingLogModal.visitor?.name}
                </div>
                {editingLogModal.visitor?.callsign && (
                  <div className="text-[11px] font-semibold text-primary">
                    «{editingLogModal.visitor?.callsign}»
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-foreground">
                  {editingLogModal.visitor?.group || '—'}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {editingLogModal.visitor?.location || ''}
                </div>
              </div>
            </div>

            {/* Time inputs */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Дата відвідування
                </label>
                <input
                  type="date"
                  value={editingLogModal.dateStr}
                  onChange={(e) => setEditingLogModal({ ...editingLogModal, dateStr: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Час входу</span>
                  </label>
                  <input
                    type="time"
                    value={editingLogModal.timeIn}
                    onChange={(e) => setEditingLogModal({ ...editingLogModal, timeIn: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm font-bold tabular-nums text-foreground focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1.5 flex items-center gap-1">
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Час виходу</span>
                  </label>
                  <input
                    type="time"
                    disabled={editingLogModal.isCurrentlyIn}
                    value={editingLogModal.timeOut}
                    onChange={(e) => setEditingLogModal({ ...editingLogModal, timeOut: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold tabular-nums border transition-all ${
                      editingLogModal.isCurrentlyIn
                        ? 'bg-muted/30 border-border text-muted-foreground cursor-not-allowed opacity-60'
                        : 'bg-rose-500/10 border-rose-500/30 text-foreground focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              {/* Toggle still on location */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/50 cursor-pointer select-none hover:bg-secondary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={editingLogModal.isCurrentlyIn}
                  onChange={(e) => setEditingLogModal({
                    ...editingLogModal,
                    isCurrentlyIn: e.target.checked,
                    timeOut: e.target.checked ? '' : editingLogModal.timeOut
                  })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Залишається на локації (без виходу)</span>
                  <span className="text-[10px] text-muted-foreground">Статус особи буде збережено як присутній на локації</span>
                </div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setEditingLogModal(null)}
                className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground font-semibold text-xs transition-colors cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleSaveLogEdit}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Зберегти зміни</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
