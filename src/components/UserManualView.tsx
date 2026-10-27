import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Download, Printer, ShieldAlert, Mic, Users, 
  ShieldCheck, FileText, CheckCircle2, AlertTriangle, 
  HelpCircle, ChevronRight, Layers, Lock, Cpu, Settings, 
  Home, Shield, Archive, Database, UserRound, MapPin, 
  Sliders, Clock, Search, ArrowRightCircle, LogIn, LogOut, 
  Activity, Radio, Volume2, Sparkles, CheckSquare, Square,
  Info, AlertOctagon, Terminal, RefreshCw, Eye, ArrowUpRight,
  BatteryCharging, HardDrive, Monitor, Check, X, FileDown
} from 'lucide-react';
import { Logo } from './Logo';
import { SECTIONS_LIST, MANUAL_METADATA } from '../data/userManualData';
import PrintableUserManualDocument from './PrintableUserManualDocument';
import VoiceSearchInput from './VoiceSearchInput';

interface UserManualViewProps {
  embeddedInSettings?: boolean;
}

interface MockupWindowProps {
  title: string;
  status?: string;
  statusColor?: 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
  children: React.ReactNode;
  className?: string;
}

function MockupWindow({ title, status, statusColor = 'emerald', children, className = '' }: MockupWindowProps) {
  const statusClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  return (
    <div className={`mockup-window rounded-2xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4 shadow-xl space-y-3 font-mono text-neutral-300 select-none ${className}`}>
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2 text-neutral-400 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/90 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block" />
          </div>
          <span className="font-bold text-neutral-200 ml-1 truncate">
            {title}
          </span>
        </div>
        {status && (
          <div className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border shrink-0 ml-2 ${statusClasses[statusColor]}`}>
            {status}
          </div>
        )}
      </div>
      {/* Content */}
      <div className="space-y-2.5 text-xs">
        {children}
      </div>
    </div>
  );
}

export default function UserManualView({ embeddedInSettings = false }: UserManualViewProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');

  // Interactive pre-shift checklist state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'ups': true,
    'browser': true,
    'time': true,
    'backup': false,
    'guard': true,
    'mic': false,
  });

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // PDF Modal Preview State (Аналогічно Reports.tsx)
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const a = document.createElement('a');
      a.href = '/Posibnyk_Korystuvacha_SKUD_412_Nemesis.pdf';
      a.download = 'Posibnyk_Korystuvacha_SKUD_412_Nemesis.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      if (confirm('Помилка при генерації файлу. Відкрити вікно друку / збереження в PDF браузера?')) {
        window.print();
      }
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 300);
    }
  };

  const isSectionVisible = (secId: string) => {
    if (activeSectionId !== 'all') return activeSectionId === secId;
    if (audienceFilter !== 'all') {
      const sec = SECTIONS_LIST.find(s => s.id === secId);
      if (sec && !sec.targetAudience.some(a => a.toLowerCase().includes(audienceFilter.toLowerCase())) && !sec.targetAudience.includes('Усі категорії користувачів')) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sec = SECTIONS_LIST.find(s => s.id === secId);
      return sec ? (sec.title.toLowerCase().includes(q) || sec.summary.toLowerCase().includes(q)) : true;
    }
    return true;
  };

  const filteredSections = useMemo(() => {
    return SECTIONS_LIST.filter(sec => {
      if (activeSectionId !== 'all' && sec.id !== activeSectionId) return false;
      if (audienceFilter !== 'all') {
        const matches = sec.targetAudience.some(a => a.toLowerCase().includes(audienceFilter.toLowerCase())) || sec.targetAudience.includes('Усі категорії користувачів');
        if (!matches) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return sec.title.toLowerCase().includes(q) || sec.summary.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeSectionId, audienceFilter, searchQuery]);

  return (
    <div className={`user-manual-root text-foreground font-sans ${embeddedInSettings ? 'space-y-6' : 'h-full flex flex-col'}`}>
      
      {/* HEADER BANNER */}
      <div id="user-manual-header-banner" className="user-manual-banner p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/25 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
          <div className="shrink-0 p-2 rounded-2xl bg-card border border-border shadow-xs">
            <Logo className="w-auto h-11 sm:h-12" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20">
                {MANUAL_METADATA.classification}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground bg-muted border border-border/60">
                {MANUAL_METADATA.version}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                {MANUAL_METADATA.architecture}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight break-words">
              {MANUAL_METADATA.systemName}: Комплексна інструкція користувача
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Повний методичний посібник та довідник чергового КПП, начальника варти та адміністратора системи СКУД зі скріншотами кожного модуля та сценарію.
            </p>
          </div>
        </div>

        {/* Export Buttons (Аналогічно формуванню звіту відвідувань) */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-card rounded-2xl p-1.5 shadow-sm ml-auto no-print">
          <button 
            type="button"
            onClick={() => setShowPdfPreview(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-1.5 font-bold text-[10px] sm:text-xs uppercase cursor-pointer select-none active:scale-95 transition-all shadow-md shadow-red-600/20"
            title="Експорт та друк інструкції у форматі PDF"
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
            title="Швидкий друк посібника користувача"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Друк</span>
          </button>
        </div>
      </div>

      {/* Print-Only Professional Document Layout (Аналогічно Reports.tsx) */}
      <div className="hidden print:block">
        <PrintableUserManualDocument />
      </div>

      {/* FILTER & NAVIGATION BAR */}
      <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 no-print">
        {/* Search Input */}
        <VoiceSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Швидкий пошук за інструкцією (напр., «Брудне небо», «бекап»)..."
          containerClassName="flex-1 min-w-[240px]"
        />

        {/* Audience Pill Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold shrink-0">
          <span className="text-muted-foreground text-[11px] uppercase mr-1 hidden sm:inline">Аудиторія:</span>
          {['all', 'Новачок', 'Оператор', 'Начальник варти', 'Адміністратор'].map(aud => (
            <button
              key={aud}
              onClick={() => setAudienceFilter(aud)}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs ${
                audienceFilter === aud
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:bg-muted border border-transparent'
              }`}
            >
              {aud === 'all' ? 'Всі ролі' : aud}
            </button>
          ))}
        </div>
      </div>

      {/* 12 SECTIONS HORIZONTAL PILL NAV */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/50 no-print text-xs font-bold scrollbar-thin">
        <button
          onClick={() => setActiveSectionId('all')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSectionId === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Весь посібник (12 розділів)
        </button>
        {SECTIONS_LIST.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSectionId(sec.id)}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeSectionId === sec.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {sec.shortTitle}
          </button>
        ))}
      </div>

      {/* DOCUMENT BODY */}
      <div id="user-manual-export-container" className="user-manual-content space-y-10 leading-relaxed text-sm sm:text-base no-print">

        {/* ========================================================= */}
        {/* OFFICIAL TITLE PAGE (ТИТУЛЬНА СТОРІНКА З ОПИСОМ СИСТЕМИ) */}
        {/* ========================================================= */}
        {activeSectionId === 'all' && (
          <div id="user-manual-title-page" className="user-manual-section p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-xs space-y-8 select-none">
            {/* Top Military Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-border/80 text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">СЛУЖБА ОХОРОНИ ТА КОНТРОЛЬНО-ПРОПУСКНИЙ ПУНКТ (КПП)</span>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20">
                ГРИФ: ДСП (ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ) • ПРИМІРНИК №1
              </span>
            </div>

            {/* Emblem & Main Title Block */}
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="p-4 rounded-3xl bg-muted/40 border border-border/80 shadow-inner">
                <Logo className="w-auto h-16 sm:h-20" />
              </div>

              <div className="space-y-2 max-w-3xl">
                <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary">
                  Автоматизована інформаційна система контролю та управління доступом
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight uppercase">
                  АІС КПП «412 NEMESIS»
                </h1>
                <p className="text-sm sm:text-lg font-bold text-muted-foreground">
                  Комплексний практичний посібник користувача та інструкція добового наряду
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Стандарт організації пропускного режиму, обліку особового складу та дій в особливих умовах (Форма А-412)
                </p>
              </div>

              {/* Badges Grid */}
              <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  Версія: 3.4.2 (2026 р.)
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Архітектура: 100% Local-First
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Автономна робота 24/7 без Інтернету
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-muted text-muted-foreground border border-border">
                  База: Локальна IndexedDB
                </span>
              </div>
            </div>

            {/* Brief System Description Box */}
            <div className="p-6 sm:p-7 rounded-2xl bg-muted/30 border border-border space-y-4 text-left">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
                  Короткий опис та призначення системи:
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                <strong>АІС КПП «412 NEMESIS»</strong> — це спеціалізований програмний комплекс оперативного обліку та контролю пропуску особового складу, військової техніки та відвідувачів на контрольно-пропускних пунктах режимних об'єктів та військових частин. Система спроектована за архітектурою <strong>Local-First</strong>, що забезпечує безвідмовну працездатність без підключення до Інтернету та захист від впливу засобів радіоелектронної боротьби (РЕБ).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Миттєва фіксація проходу (&lt; 0.5 с)</span>
                  </div>
                  <p className="text-muted-foreground">
                    Фіксація в 1 клік, миттєвий пошук за прізвищем/позивним або розпізнавання голосу Hands-Free.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                  <div className="font-bold text-rose-500 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Протокол «Брудне небо»</span>
                  </div>
                  <p className="text-muted-foreground">
                    Блокування виходу з частини за тривогою та негайне спрямування особового складу в укриття.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                  <div className="font-bold text-emerald-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Облік варти та постів</span>
                  </div>
                  <p className="text-muted-foreground">
                    Контроль чатових на постах (шлагбаум, КПП №1/2), таймер зміни та передача чергування.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                  <div className="font-bold text-amber-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Повна ізоляція даних</span>
                  </div>
                  <p className="text-muted-foreground">
                    Дані зберігаються виключно локально у захищеному сховищі IndexedDB без передачі в хмару.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                <strong>Цільова аудиторія:</strong> Документ є обов'язковим для чергового КПП, помічника чергового, чатових, начальника варти та адміністраторів безпеки військової частини.
              </div>
            </div>

            {/* Approval Footnote */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/80 text-xs text-muted-foreground font-mono">
              <div>Введено в дію наказом по військовій частині № 412</div>
              <div className="font-bold text-foreground">Затверджено командуванням • 2026 рік</div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TABLE OF CONTENTS (ОГЛАВЛЕНИЕ / ЗМІСТ ПОСІБНИКА) */}
        {/* ========================================================= */}
        {activeSectionId === 'all' && (
          <div id="user-manual-table-of-contents" className="user-manual-section p-8 sm:p-10 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/70 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight">
                    Зміст посібника користувача (Оглавление)
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Повний перелік 12 розділів, операційних модулів, сценаріїв та регламентів СКУД
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 font-mono">
                12 РОЗДІЛІВ • ДОДАТКИ A-412
              </span>
            </div>

            {/* TOC Grid List */}
            <div className="space-y-3 font-sans">
              {[
                { num: 1, id: 'section-1', title: 'Введення та огляд архітектури системи Local-First', sub: 'Призначення продукту, тактичні завдання, показники надійності, обмеження', page: '3' },
                { num: 2, id: 'section-2', title: 'Що знадобиться перед початком роботи (Чекліст)', sub: 'Вимоги до обладнання, автономне живлення ДБЖ, чекліст підготовки зміни', page: '4' },
                { num: 3, id: 'section-3', title: 'Важлива інформація з безпеки та режим «Брудне небо»', sub: 'Застереження, тривожні протоколи при обстрілі, захист персональних даних', page: '5' },
                { num: 4, id: 'section-4', title: 'Встановлення та первинне налаштування термінала', sub: 'Покроковий алгоритм розгортання з 5 кроків, імпорт довідників підрозділів', page: '6' },
                { num: 5, id: 'section-5', title: 'Перший запуск та інтерфейс робочого місця оператора', sub: 'Огляд робочого простору, стартові параметри, рекомендовані налаштування', page: '7' },
                { num: 6, id: 'section-6', title: 'Основні операційні модулі СКУД (зі скріншотами)', sub: '6.1 Перепустки, 6.2 Швидкий вхід, 6.3 Охорона, 6.4 Голос, 6.5 Брудне небо', page: '8' },
                { num: 7, id: 'section-7', title: 'Типові сценарії дій добового наряду КПП', sub: 'Реєстрація входу/виходу, повітряна тривога, перезмінка наряду варти', page: '10' },
                { num: 8, id: 'section-8', title: 'Розширені можливості та системне архівування', sub: 'Retention Policy, hands-free розпізнавання голосу, резервне копіювання JSON', page: '11' },
                { num: 9, id: 'section-9', title: 'Зведена таблиця налаштувань та конфігурації', sub: 'Повна матриця системних параметрів, теми, шрифти, категорії, звання', page: '12' },
                { num: 10, id: 'section-10', title: 'Часті помилки та матриця усунення несправностей', sub: 'Таблиця несправностей, ланцюжки: Симптом → Перевірка → Рішення', page: '13' },
                { num: 11, id: 'section-11', title: 'Діагностика цілісності та системний монітор КПП', sub: 'Алгоритм покрокової перевірки 4 компонентів, аварійне відновлення бази', page: '14' },
                { num: 12, id: 'section-12', title: 'Регламент оновлення, бекапи та відмітка затвердження', sub: 'Золоте правило бекапу, дії при збої, офіційна форма затвердження А-412', page: '15' },
              ].map(item => (
                <a
                  key={item.num}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-start sm:items-center justify-between p-3 rounded-2xl bg-muted/20 hover:bg-muted/50 border border-border/60 transition-all group cursor-pointer gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground font-black text-xs flex items-center justify-center shrink-0 transition-colors">
                      {item.num}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        РОЗДІЛ {item.num}. {item.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate hidden sm:block">
                        {item.sub}
                      </div>
                    </div>
                  </div>

                  {/* Dot Leader & Page Number */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden md:inline-block text-muted-foreground/30 font-mono tracking-widest text-xs select-none">
                      . . . . . . . . . . . . . .
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-mono font-bold text-foreground">
                      Стор. {item.page}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 1: ВВЕДЕННЯ */}
        {/* ========================================================= */}
        {isSectionVisible('intro') && (
          <section id="section-1" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg shrink-0">
                  1
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    1. Введення та огляд системи
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Призначення продукту, вирішувані завдання, архітектура Local-First, можливості та обмеження
                  </p>
                </div>
              </div>
              <span className="hidden md:inline-flex px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                Загальний огляд
              </span>
            </div>

            {/* SCREENSHOT 1: SYSTEM ARCHITECTURE & RELIABILITY */}
            <MockupWindow
              title="Скріншот 1: Архітектура та статус надійності терміналу СКУД «412 Nemesis»"
              status="Local-First • 100% Автономність"
              statusColor="emerald"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="text-emerald-400 font-bold mb-0.5">Швидкість фіксації</div>
                  <div className="text-white text-base sm:text-lg font-black">&lt; 0.5 секунди</div>
                  <div className="text-neutral-400 text-xs mt-0.5">В 1 клік або через мікрофон голосом</div>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="text-sky-400 font-bold mb-0.5">Енергонезалежність</div>
                  <div className="text-white text-base sm:text-lg font-black">IndexedDB local</div>
                  <div className="text-neutral-400 text-xs mt-0.5">Повне збереження при знеструмленні</div>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="text-rose-400 font-bold mb-0.5">Захист «Брудне небо»</div>
                  <div className="text-white text-base sm:text-lg font-black">Блокування виходу</div>
                  <div className="text-neutral-400 text-xs mt-0.5">Вільний доступ в укриття та бліндажі</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Мережевий контур: Ізольований (No-Cloud)</span>
                <span className="text-emerald-400 font-bold">РЕБ-стійкість: АКТИВНА</span>
                <span>Сховище: Local Storage 100%</span>
              </div>
            </MockupWindow>

            <div className="space-y-4 text-foreground/90">
              <p>
                <strong>АІС КПП «412 NEMESIS»</strong> — це спеціалізований програмний комплекс оперативно-тактичного обліку особового складу, підрозділів, тимчасових відвідувачів та транспортних засобів на контрольно-пропускних пунктах (КПП), опорних пунктах, гарнізонах та штабах військових частин.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Ключові завдання, які вирішує комплекс:
                  </h4>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li>Миттєва фіксація прибуття та відбуття особового складу через прохідну (менше секунди на людину).</li>
                    <li>Постійний моніторинг чисельності: скільки людей зараз на території, а скільки поза нею.</li>
                    <li>Захист наряду та особового складу при загрозі обстрілу / дронів («Брудне небо»).</li>
                    <li>Автоматизований журнал несення служби добового наряду варти без паперової тяганини.</li>
                    <li>Формування офіційних звітів та відомостей із реєстраційними номерами діловодства.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-amber-500" />
                    Технічні обмеження системи:
                  </h4>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li><strong>Автономність пам'яті:</strong> Дані зберігаються в захищеному сховищі браузера (IndexedDB/LocalStorage). Заборонено чистити кеш та історію браузера без створення бекапу.</li>
                    <li><strong>Роздільна здатність:</strong> Оптимізовано для екранів від 1280×720 пікселів (планшети, ноутбуки, монітори чергового).</li>
                    <li><strong>Голосовий ввід:</strong> Вимагає підключеного мікрофона та наданого дозволу браузера на використання аудіо.</li>
                  </ul>
                </div>
              </div>

              {/* Target Audience Definition */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <h4 className="font-bold text-sm text-primary uppercase tracking-wider">
                  Цільова аудиторія інструкції:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-card border border-border">
                    <span className="font-bold text-foreground block">Новачок:</span>
                    <span className="text-muted-foreground">Вперше бачить термінал, потребує покрокових інструкцій без складної термінології.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border">
                    <span className="font-bold text-foreground block">Оператор КПП:</span>
                    <span className="text-muted-foreground">Здійснює щоденну фіксацію проходу бійців та відвідувачів на прохідній.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border">
                    <span className="font-bold text-foreground block">Начальник варти:</span>
                    <span className="text-muted-foreground">Керує зміною чатових, оголошує «Брудне небо», здає зміну та друкує звіти.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border">
                    <span className="font-bold text-foreground block">Адміністратор:</span>
                    <span className="text-muted-foreground">Керує довідниками звань, підрозділів, налаштовує бекапи та матрицю СКУД.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 2: ЩО ЗНАДОБИТЬСЯ ПЕРЕД ПОЧАТКОМ */}
        {/* ========================================================= */}
        {isSectionVisible('prerequisites') && (
          <section id="section-2" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-black text-lg shrink-0">
                  2
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    2. Що знадобиться перед початком роботи
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Обладнання, програмне забезпечення, живлення, аксесуари та практичний чек-лист
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20">
                Підготовка
              </span>
            </div>

            {/* SCREENSHOT 2: HARDWARE & PERIPHERALS MONITOR */}
            <MockupWindow
              title="Скріншот 2: Панель стану апаратно-програмного комплексу чергового КПП"
              status="ПЕРИФЕРІЯ: 100% ГОТОВО"
              statusColor="sky"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <Monitor className="w-5 h-5 mx-auto mb-1 text-sky-400" />
                  <div className="font-bold text-white">Дисплей КПП</div>
                  <div className="text-[10px] text-neutral-400">1920×1080 FHD</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">АКТИВНИЙ</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <BatteryCharging className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <div className="font-bold text-white">ДБЖ / EcoFlow</div>
                  <div className="text-[10px] text-neutral-400">Заряд: 98% (4.5 год)</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">ЖИВЛЕННЯ ОК</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <Mic className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <div className="font-bold text-white">USB-гарнітура</div>
                  <div className="text-[10px] text-neutral-400">Web Speech API</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">ПІДКЛЮЧЕНО</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <Printer className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                  <div className="font-bold text-white">Принтер А4</div>
                  <div className="text-[10px] text-neutral-400">Тонер: 92% • Папір є</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">ГОТОВИЙ</div>
                </div>
              </div>
            </MockupWindow>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">
                  Необхідне апаратне забезпечення:
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Робоча станція чергового:</strong> ПК, захищений ноутбук або планшет з ОС Windows 10/11, Linux або Android.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Дисплей:</strong> Монітор або екран з комфортною роздільною здатністю від 1280×720 (рекомендовано 1920×1080 Full HD).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Джерело безперебійного живлення (ДБЖ/UPS):</strong> Зарядна станція (EcoFlow, Bluetti) або ДБЖ мінімум на 2 години автономної роботи.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Аудіогарнітура / мікрофон:</strong> USB або 3.5mm мікрофон для зручного голосового вводу без клавіатури.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">
                  Програмне забезпечення та права:
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <span><strong>Веб-браузер:</strong> Сучасний браузер на базі Chromium (Google Chrome, Microsoft Edge, Brave) з підтримкою Web Speech API.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <span><strong>Підключення до мережі:</strong> Інтернет НЕ потрібен для роботи системи. Комплекс повністю автономний (Local-First).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <span><strong>Доступ та паролі:</strong> Пін-код або профіль оператора для авторизації в системі.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* INTERACTIVE PRE-SHIFT CHECKLIST */}
            <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-foreground uppercase tracking-wide flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  Чек-лист чергового перед заступом на зміну (натискайте для перевірки):
                </h4>
                <span className="text-xs font-bold text-muted-foreground">
                  Готовність: {Object.values(checkedItems).filter(Boolean).length} / {Object.keys(checkedItems).length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                <div 
                  onClick={() => toggleCheck('ups')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    checkedItems['ups'] ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground' : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {checkedItems['ups'] ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                  <span>1. Перевірено живлення та заряд батареї станції ДБЖ.</span>
                </div>

                <div 
                  onClick={() => toggleCheck('browser')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    checkedItems['browser'] ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground' : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {checkedItems['browser'] ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                  <span>2. Відкрито систему в браузері Chrome / Edge.</span>
                </div>

                <div 
                  onClick={() => toggleCheck('time')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    checkedItems['time'] ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground' : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {checkedItems['time'] ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                  <span>3. Звірено системний час терміналу з точним військовим часом.</span>
                </div>

                <div 
                  onClick={() => toggleCheck('backup')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    checkedItems['backup'] ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground' : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {checkedItems['backup'] ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                  <span>4. Збережено свіжий файл бекапу бази на зовнішню флешку.</span>
                </div>

                <div 
                  onClick={() => toggleCheck('guard')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    checkedItems['guard'] ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground' : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {checkedItems['guard'] ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                  <span>5. Перевірено склад зміни у вкладці «Охорона».</span>
                </div>

                <div 
                  onClick={() => toggleCheck('mic')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    checkedItems['mic'] ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground' : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {checkedItems['mic'] ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                  <span>6. Протестовано мікрофон для голосового пошуку.</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 3: ВАЖЛИВА ІНФОРМАЦІЯ З БЕЗПЕКИ */}
        {/* ========================================================= */}
        {isSectionVisible('safety') && (
          <section id="section-3" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black text-lg shrink-0">
                  3
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    3. Важлива інформація з безпеки
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Правила роботи, запобігання втраті даних, захист інформації ДСП та система позначень
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                Безпека
              </span>
            </div>

            {/* SCREENSHOT 3: SECURITY & DATA PROTECTION MONITOR */}
            <MockupWindow
              title="Скріншот 3: Монітор рівнів безпеки та захисту персональних даних (ДСП)"
              status="ГРИФ: ДСП • ЗАХИЩЕНО"
              statusColor="rose"
            >
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-sky-400 shrink-0" />
                    <span><strong>ВАЖЛИВО:</strong> Регулярне створення копії backup.json на флешку наряду</span>
                  </div>
                  <span className="text-[10px] bg-sky-500/20 px-2 py-0.5 rounded text-sky-200">РЕГЛАМЕНТ</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>УВАГА:</strong> Заборонено змінювати системний годинник комп'ютера під час зміни</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">КОНТРОЛЬ</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span><strong>ПОПЕРЕДЖЕННЯ:</strong> Заборонено очищати історію/кеш браузера «за весь час» (IndexedDB)</span>
                  </div>
                  <span className="text-[10px] bg-rose-500/20 px-2 py-0.5 rounded text-rose-200">КРИТИЧНО</span>
                </div>
              </div>
            </MockupWindow>

            {/* Notation system */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-black text-xs sm:text-sm uppercase">
                  <Info className="w-4 h-4 shrink-0" />
                  Важливо:
                </div>
                <p className="text-xs text-sky-950 dark:text-sky-200 leading-relaxed">
                  Обов'язкові вказівки та практичні рекомендації, які забезпечують коректність обліку та швидкість роботи оператора на посту.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs sm:text-sm uppercase">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Увага:
                </div>
                <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                  Дії, помилка в яких може призвести до збою підрахунку статистики, блокування чергового або спотворення звітних відомостей.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs sm:text-sm uppercase">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Попередження:
                </div>
                <p className="text-xs text-rose-950 dark:text-rose-200 leading-relaxed">
                  Критично небезпечні дії (очищення пам'яті браузера, відключення живлення без бекапу), які ведуть до безповоротної втрати бази!
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-foreground/90">
              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Правила роботи з персональними даними особового складу (ДСП):
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                  <li>Заборонено підключати робочу станцію КПП до загальнодоступних або відкритих мереж Wi-Fi.</li>
                  <li>Екран монітора чергового КПП має бути розташований так, щоб відвідувачі з боку вулиці не бачили списків та прізвищ бійців.</li>
                  <li>Файли резервних копій бази даних (*.json) та друковані звіти мають гриф «Для службового користування» та зберігаються виключно на службових накопичувачах.</li>
                  <li>Після завершення чергування черговий зобов'язаний заблокувати термінал або виконати вихід із профілю.</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 4: ВСТАНОВЛЕННЯ ТА ПЕРВИННЕ НАЛАШТУВАННЯ */}
        {/* ========================================================= */}
        {isSectionVisible('installation') && (
          <section id="section-4" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-lg shrink-0">
                  4
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    4. Встановлення та первинне налаштування
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Покроковий порядок підготовки системи: довідники звань, шеврони, групи та імпорт бази
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Розгортання
              </span>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-primary tracking-wider">Крок 1. Запуск терміналу в браузері</span>
                  <span className="text-xs font-bold text-muted-foreground">Тривалість: 1 хв</span>
                </div>
                
                {/* SCREENSHOT 4.1: KIOSK MODE F11 */}
                <MockupWindow
                  title="Скріншот 4.1: Повноекранний тактичний запуск термінала (Kiosk Mode F11)"
                  status="KIOSK: АКТИВНО"
                  statusColor="sky"
                >
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-5 h-5 text-sky-400" />
                      <div>
                        <div className="text-white font-bold">http://localhost:3000/dashboard</div>
                        <div className="text-[11px] text-neutral-400">Натисніть F11 для входу в повноекранний режим КПП</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-sky-500/20 text-sky-300 font-bold text-xs">F11 FULLSCREEN</span>
                  </div>
                </MockupWindow>

                <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <p><strong>Що зробити:</strong> Відкрийте ярлик системи на робочому столі або введіть адресу локального сервера у браузері Google Chrome чи Edge.</p>
                  <p><strong>Що натиснути:</strong> Натисніть клавішу <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono">F11</kbd> для переходу в зручний повноекранний тактичний режим роботи.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-primary tracking-wider">Крок 2. Налаштування довідників</span>
                  <span className="text-xs font-bold text-muted-foreground">Тривалість: 3-5 хв</span>
                </div>

                {/* SCREENSHOT 4.2: DICTIONARIES */}
                <MockupWindow
                  title="Скріншот 4.2: Довідники військових звань та підрозділів бригади"
                  status="ДОВІДНИКИ: СИНХРОНІЗОВАНО"
                  statusColor="emerald"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                      <div className="text-[10px] text-emerald-400 font-bold mb-1">ЗВАННЯ ЗСУ</div>
                      <div className="text-white font-mono text-[11px] space-y-0.5">
                        <div>• Солдат / Старший солдат</div>
                        <div>• Молодший сержант / Сержант</div>
                        <div>• Лейтенант / Старший лейтенант / Майор</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                      <div className="text-[10px] text-sky-400 font-bold mb-1">ПІДРОЗДІЛИ (КОЛІРНЕ МАРКУВАННЯ)</div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 1-ша рота охорони</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Розвідувальний взвод</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Медична служба</div>
                      </div>
                    </div>
                  </div>
                </MockupWindow>

                <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <p><strong>Де зробити:</strong> Перейдіть до вкладки <strong>«Налаштування»</strong> у верхньому меню системи.</p>
                  <p><strong>Підрозділ «Звання» та «Бригада»:</strong> Створіть підрозділи вашої частини та виберіть фірмовий колір для миттєвої візуальної ідентифікації карток на дашборді.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-primary tracking-wider">Крок 3. Завантаження нарукавних знаків (шевронів)</span>
                  <span className="text-xs font-bold text-muted-foreground">Тривалість: 2 хв</span>
                </div>

                {/* SCREENSHOT 4.3: CHEVRONS UPLOAD */}
                <MockupWindow
                  title="Скріншот 4.3: Вікно закріплення нарукавних знаків / шевронів"
                  status="ЕМБЛЕМИ: АКТИВНО"
                  statusColor="purple"
                >
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-black text-amber-400">
                        412
                      </div>
                      <div>
                        <div className="text-white font-bold">Шеврон 412 Окремого Батальйону</div>
                        <div className="text-[11px] text-neutral-400">Формат: PNG 512×512 • Прозорий фон • Прив'язано до 1 роти</div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-bold">
                      Змінити емблему
                    </button>
                  </div>
                </MockupWindow>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-primary tracking-wider">Крок 4. Імпорт особового складу</span>
                  <span className="text-xs font-bold text-muted-foreground">Тривалість: 2-5 хв</span>
                </div>

                {/* SCREENSHOT 4.4: CSV IMPORT */}
                <MockupWindow
                  title="Скріншот 4.4: Масовий імпорт особового складу зі списків (CSV/JSON)"
                  status="ІМПОРТ: 14 БІЙЦІВ"
                  statusColor="emerald"
                >
                  <div className="p-3 rounded-xl bg-neutral-900 border border-dashed border-neutral-700 text-center space-y-1">
                    <Database className="w-6 h-6 mx-auto text-emerald-400" />
                    <div className="text-white font-bold">Файл: `spysok_biytsiv_412.csv` успішно розпізнано</div>
                    <div className="text-[11px] text-emerald-400 font-bold">Успішно імпортовано: 14 осіб • Помилок: 0</div>
                  </div>
                </MockupWindow>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 5: ПЕРШИЙ ЗАПУСК */}
        {/* ========================================================= */}
        {isSectionVisible('first-launch') && (
          <section id="section-5" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-lg shrink-0">
                  5
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    5. Перший запуск та робочий екран
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Що користувач бачить на екрані, елементи керування та рекомендовані параметри
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Старт
              </span>
            </div>

            {/* SCREENSHOT 5: DASHBOARD FULL OVERVIEW */}
            <MockupWindow
              title="Скріншот 5: Повний робочий екран Дашборду КПП з 3-колонковою сіткою"
              status="РЕЖИМ: ОПЕРАТИВНИЙ"
              statusColor="emerald"
            >
              {/* 5 Metrics in One Line */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-sky-400 font-bold">ВІДВІДУВАЧІ</div>
                  <div className="text-sm sm:text-base font-black text-white">14</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-indigo-400 font-bold">ОСІБ У БАЗІ</div>
                  <div className="text-sm sm:text-base font-black text-white">9</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-emerald-400 font-bold">НА ЛОКАЦІЇ</div>
                  <div className="text-sm sm:text-base font-black text-white">6</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-sky-400 font-bold">ЗАЙШЛО СЬОГОДНІ</div>
                  <div className="text-sm sm:text-base font-black text-white">8</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-rose-400 font-bold">ВИЙШЛО СЬОГОДНІ</div>
                  <div className="text-sm sm:text-base font-black text-white">6</div>
                </div>
              </div>

              {/* Search & Mic Bar */}
              <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-neutral-400 text-xs">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-neutral-500" />
                  <span>Пошук за прізвищем, званням або позивним...</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800 text-neutral-300 font-bold text-[11px]">
                  <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Голосовий ввід активний</span>
                </div>
              </div>

              {/* Sample 3-column visitor cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px]">МО</div>
                    <div>
                      <div className="text-white font-bold leading-tight">МЕЛЬНИК О.</div>
                      <div className="text-neutral-400 text-[10px]">майор • 1 рота</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold text-[11px]">08:15</div>
                    <div className="text-[9px] text-neutral-400">1 год 20 хв</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px]">КІ</div>
                    <div>
                      <div className="text-white font-bold leading-tight">КОВАЛЕНКО І.</div>
                      <div className="text-neutral-400 text-[10px]">с-т • Розвідка</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-neutral-400 font-bold text-[11px]">08:30</div>
                    <div className="text-[9px] text-neutral-400">Вийшов 14:10</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-[11px]">БВ</div>
                    <div>
                      <div className="text-white font-bold leading-tight">БОНДАР В.</div>
                      <div className="text-neutral-400 text-[10px]">солдат • Ремрота</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold text-[11px]">09:00</div>
                    <div className="text-[9px] text-neutral-400">35 хв</div>
                  </div>
                </div>
              </div>
            </MockupWindow>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 6: ОСНОВНІ ФУНКЦІЇ */}
        {/* ========================================================= */}
        {isSectionVisible('core-functions') && (
          <section id="section-6" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black text-lg shrink-0">
                  6
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    6. Основні функції (модулі системи)
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Детальний розбір 6 робочих вкладок: алгоритми, правила, типові помилки та результати
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Модулі
              </span>
            </div>

            {/* TAB 1: DASHBOARD */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                <h3 className="font-black text-base sm:text-lg text-foreground">
                  6.1. Вкладка «Дашборд» (Головний оперативний екран)
                </h3>
              </div>

              {/* SCREENSHOT 6.1: DASHBOARD CARD ACTIONS */}
              <MockupWindow
                title="Скріншот 6.1: Вкладка «Дашборд» — картка військовослужбовця та кнопки дій"
                status="ОПЕРАТИВНИЙ ОБЛІК"
                statusColor="emerald"
              >
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-500 flex items-center justify-center font-black text-blue-300">
                      МО
                    </div>
                    <div>
                      <div className="text-white font-black text-sm">МЕЛЬНИК ОЛЕГ ВАСИЛЬОВИЧ</div>
                      <div className="text-neutral-400 text-xs">майор • 1 рота охорони • КПП-1</div>
                    </div>
                  </div>
                  <div className="text-center font-mono">
                    <div className="text-xs font-bold text-emerald-400">ВХІД: 08:15:30</div>
                    <div className="text-[10px] text-neutral-400">Тривалість: 1 год 20 хв</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xs cursor-pointer">
                      + Вхід
                    </button>
                    <button className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-xs cursor-pointer">
                      - Вихід
                    </button>
                  </div>
                </div>
              </MockupWindow>
            </div>

            {/* TAB 2: DIRTY SKY */}
            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/30 space-y-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black text-base sm:text-lg">
                  6.2. Протокол безпеки «Брудне небо» (Повітряна тривога / Загроза БПЛА)
                </h3>
              </div>

              {/* SCREENSHOT 6.2: DIRTY SKY ENFORCEMENT */}
              <MockupWindow
                title="Скріншот 6.2: Протокол «Брудне небо» — активна повітряна тривога / БПЛА"
                status="ТРИВОГА: ВИХІД ЗАБЛОКОВАНО"
                statusColor="rose"
              >
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 text-rose-300 font-bold">
                    <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse shrink-0" />
                    <span>УВАГА: ЗАГРОЗА УДАРУ З ПОВІТРЯ! КНОПКИ ВИХОДУ «-» ЗАБЛОКОВАНО. ВСІ В УКРИТТЯ!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled className="px-3 py-1 rounded bg-neutral-800 text-neutral-500 font-bold border border-neutral-700 cursor-not-allowed">
                      <Lock className="w-3 h-3 inline mr-1" /> - Вихід (Блок)
                    </button>
                    <button className="px-3 py-1 rounded bg-emerald-600 text-white font-bold animate-bounce">
                      + Вхід (В укриття)
                    </button>
                  </div>
                </div>
              </MockupWindow>
            </div>

            {/* TAB 3: VISITORS */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" />
                <h3 className="font-black text-base sm:text-lg text-foreground">
                  6.3. Вкладка «Відвідувачі» (Повний реєстр та картотека)
                </h3>
              </div>

              {/* SCREENSHOT 6.3: VISITORS TAB */}
              <MockupWindow
                title="Скріншот 6.3: Вкладка «Відвідувачі» — фільтри підрозділів та налаштування колонок"
                status="КАРТОТЕКА: 14 БІЙЦІВ"
                statusColor="sky"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">Всі (14)</span>
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800">1 рота (5)</span>
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800">Розвідка (3)</span>
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800">Штаб (2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 text-[11px]">Колонки:</span>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">1</span>
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">2</span>
                      <span className="px-2 py-0.5 rounded bg-primary text-white font-bold">3</span>
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">4</span>
                    </div>
                    <button className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs">
                      + Додати бійця
                    </button>
                  </div>
                </div>
              </MockupWindow>
            </div>

            {/* TAB 4: SECURITY */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3 className="font-black text-base sm:text-lg text-foreground">
                  6.4. Вкладка «Охорона» (Служба безпеки та наряд варти)
                </h3>
              </div>

              {/* SCREENSHOT 6.4: SECURITY SHIFT GUARDS */}
              <MockupWindow
                title="Скріншот 6.4: Вкладка «Охорона» — добовий наряд, чатові на посту та зміна варти"
                status="ВАРТА: 3 ЧАТОВИХ НА ПОСТУ"
                statusColor="emerald"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">с-т Коваленко І.С.</div>
                      <div className="text-[11px] text-neutral-400">Пост №1 (Шлагбаум) • На посту: 2 год 15 хв</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                      НА ПОСТУ
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">солдат Бондар В.М.</div>
                      <div className="text-[11px] text-neutral-400">Вільна зміна • Караульне приміщення</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px] border border-amber-500/30">
                      ВІДПОЧИНОК
                    </span>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button className="px-3.5 py-1.5 rounded-xl bg-rose-600/90 text-white font-bold text-xs flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Здати зміну та експортувати бекап
                  </button>
                </div>
              </MockupWindow>
            </div>

            {/* TAB 5: REPORTS */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base sm:text-lg text-foreground">
                  6.5. Вкладка «Звіти» (Журнал руху та діловодство)
                </h3>
              </div>

              {/* SCREENSHOT 6.5: REPORTS LOG TABLE */}
              <MockupWindow
                title="Скріншот 6.5: Вкладка «Звіти» — офіційний журнал переміщень діловодства частини"
                status="ЗВІТ: А4 PDF ГОТОВИЙ"
                statusColor="amber"
              >
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400 font-bold">
                        <th className="p-1.5">№</th>
                        <th className="p-1.5">ЧАС</th>
                        <th className="p-1.5">ЗВАННЯ ТА ПІБ</th>
                        <th className="p-1.5">ПІДРОЗДІЛ</th>
                        <th className="p-1.5">ВХІД</th>
                        <th className="p-1.5">ВИХІД</th>
                        <th className="p-1.5">СТАТУС</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-neutral-300">
                      <tr>
                        <td className="p-1.5">1</td>
                        <td className="p-1.5">08:15</td>
                        <td className="p-1.5 text-white font-bold">майор Мельник О.В.</td>
                        <td className="p-1.5">1 рота охорони</td>
                        <td className="p-1.5 text-emerald-400 font-bold">08:15</td>
                        <td className="p-1.5">—</td>
                        <td className="p-1.5 text-emerald-400 font-bold">НА ЛОКАЦІЇ</td>
                      </tr>
                      <tr>
                        <td className="p-1.5">2</td>
                        <td className="p-1.5">08:30</td>
                        <td className="p-1.5 text-white font-bold">с-т Коваленко І.С.</td>
                        <td className="p-1.5">Розвідвзвод</td>
                        <td className="p-1.5 text-emerald-400 font-bold">08:30</td>
                        <td className="p-1.5 text-rose-400 font-bold">14:10</td>
                        <td className="p-1.5 text-neutral-400">ПОЗА МЕЖАМИ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </MockupWindow>
            </div>

            {/* TAB 6: ROLES */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-500" />
                <h3 className="font-black text-base sm:text-lg text-foreground">
                  6.6. Вкладка «Доступ» (Матриця прав СКУД)
                </h3>
              </div>

              {/* SCREENSHOT 6.6: ACCESS CONTROL RBAC */}
              <MockupWindow
                title="Скріншот 6.6: Вкладка «Доступ» — розподіл повноважень (RBAC)"
                status="МАТРИЦЯ СКУД: СУПЕРАДМІНІСТРАТОР"
                statusColor="purple"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">ОПЕРАТОР КПП</span>
                    <div className="text-white font-bold mt-1">Реєстрація проходу</div>
                    <div className="text-[10px] text-neutral-400">Кнопки «+»/«-», Брудне небо, пошук</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">НАЧАЛЬНИК ВАРТИ</span>
                    <div className="text-white font-bold mt-1">Управління нарядом</div>
                    <div className="text-[10px] text-neutral-400">Пости чатових, здача зміни, звіти A4</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">СУПЕРАДМІНІСТРАТОР</span>
                    <div className="text-white font-bold mt-1">Повний доступ</div>
                    <div className="text-[10px] text-neutral-400">Довідники, бекап бази, матриця ролей</div>
                  </div>
                </div>
              </MockupWindow>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 7: ТИПОВІ СЦЕНАРІЇ ВИКОРИСТАННЯ */}
        {/* ========================================================= */}
        {isSectionVisible('scenarios') && (
          <section id="section-7" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black text-lg shrink-0">
                  7
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    7. Типові сценарії використання
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Покрокові інструкції виконання стандартних бойових та чергових завдань зі скріншотами
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                Сценарії
              </span>
            </div>

            <div className="space-y-6">
              {/* Scenario 1 */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
                <h4 className="font-black text-sm sm:text-base text-foreground flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">Сценарій 1</span>
                  Реєстрація прибуття групи військовослужбовців через КПП
                </h4>
                
                {/* SCREENSHOT 7.1 */}
                <MockupWindow
                  title="Скріншот 7.1: Сценарій 1 — миттєвий пошук та фіксація групи бійців"
                  status="ЧАС: &lt; 1 СЕКУНДИ"
                  statusColor="emerald"
                >
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">Пошук: «Мель» → Знайдено: Майор Мельник О.В.</span>
                    <button className="px-3 py-1 rounded bg-emerald-600 text-white font-bold text-xs">
                      + Зафіксувати ВХІД
                    </button>
                  </div>
                </MockupWindow>

                <div className="text-xs sm:text-sm text-muted-foreground space-y-1 pl-2">
                  <p><strong>Покрокове рішення:</strong> 1. Тримайте екран Дашборду. 2. Введіть перші літери прізвища або назвіть у мікрофон. 3. Натисніть «+». Час на одного бійця — до 1 секунди.</p>
                </div>
              </div>

              {/* Scenario 2 */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
                <h4 className="font-black text-sm sm:text-base text-foreground flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 text-xs font-bold">Сценарій 2</span>
                  Оголошення сигналу «Брудне небо» при загрозі дрона
                </h4>

                {/* SCREENSHOT 7.2 */}
                <MockupWindow
                  title="Скріншот 7.2: Сценарій 2 — укриття бійців при загрозі скиду БПЛА"
                  status="ТРИВОГА: АКТИВНА"
                  statusColor="rose"
                >
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
                    <span>1. Натиснуто кнопку тривоги → 2. Вихід автоматично заблоковано → 3. Вхід в укриття відкритий</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold text-[10px]">СИРЕНА УВІМКНЕНА</span>
                  </div>
                </MockupWindow>
              </div>

              {/* Scenario 3 */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
                <h4 className="font-black text-sm sm:text-base text-foreground flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-xs font-bold">Сценарій 3</span>
                  Виправлення випадкового кліку (помилкове натискання)
                </h4>

                {/* SCREENSHOT 7.3 */}
                <MockupWindow
                  title="Скріншот 7.3: Сценарій 3 — скасування помилкового кліку за останні 5 хв"
                  status="ВІДНОВЛЕННЯ СТАТУСУ"
                  statusColor="amber"
                >
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs flex items-center justify-between">
                    <span className="text-neutral-300">«Скасувати помилкові кліки за 5 хв» (лише для тих, хто вже вийшов)</span>
                    <button className="px-3 py-1 rounded bg-amber-600 text-white font-bold text-xs">
                      Скасувати помилку
                    </button>
                  </div>
                </MockupWindow>
              </div>

              {/* Scenario 4 */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
                <h4 className="font-black text-sm sm:text-base text-foreground flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-xs font-bold">Сценарій 4</span>
                  Здача добового чергування (Перезмінка варти)
                </h4>

                {/* SCREENSHOT 7.4 */}
                <MockupWindow
                  title="Скріншот 7.4: Сценарій 4 — фіксація варти та створення бекапу бази"
                  status="ЗМІНА ВАРТИ: ЗБЕРЕЖЕНО"
                  statusColor="emerald"
                >
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs flex items-center justify-between">
                    <span className="text-emerald-400 font-bold">Звіт за добу сформовано • Файл backup_2026-10-05.json завантажено</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">ГОТОВО ДЛЯ НОВОЇ ВАРТИ</span>
                  </div>
                </MockupWindow>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 8: РОЗШИРЕНІ МОЖЛИВОСТІ */}
        {/* ========================================================= */}
        {isSectionVisible('advanced') && (
          <section id="section-8" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-black text-lg shrink-0">
                  8
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    8. Розширені можливості та автоматизація
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Голосове керування, адаптивні сітки 1-4 колонок, шеврони, архівація та Retention Policy
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                Розширені опції
              </span>
            </div>

            {/* SCREENSHOT 8.1: VOICE RECOGNITION */}
            <MockupWindow
              title="Скріншот 8.1: Голосовий ввід Hands-free — розпізнавання швидких команд"
              status="MIC: АКТИВНИЙ"
              statusColor="amber"
            >
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Mic className="w-5 h-5 text-amber-400 animate-pulse" />
                  <div>
                    <span className="text-white font-bold">Розпізнано: «Мельник — Вхід»</span>
                    <div className="text-[11px] text-emerald-400">Команда виконана: Мельник О.В. відзначений НА ЛОКАЦІЇ</div>
                  </div>
                </div>
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">ГОЛОСОВИЙ КОНТРОЛЬ</span>
              </div>
            </MockupWindow>

            {/* SCREENSHOT 8.2: CONTAINER QUERIES GRID */}
            <MockupWindow
              title="Скріншот 8.2: Адаптивна сітка Container Queries (масштабування 1-4 колонок)"
              status="АДАПТИВНІСТЬ: CONTAINER QUERIES"
              statusColor="sky"
            >
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-center">
                  <div className="font-bold text-sky-400">1-2 КОЛОНКИ (МОБІЛЬНИЙ / ПЛАНШЕТ)</div>
                  <div className="text-[11px] text-neutral-400 mt-1">Збільшений шрифт ПІБ для сенсорних екранів</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-center">
                  <div className="font-bold text-emerald-400">3-4 КОЛОНКИ (ТАКТИЧНИЙ МОНІТОР КПП)</div>
                  <div className="text-[11px] text-neutral-400 mt-1">Максимальний огляд особового складу в один екран</div>
                </div>
              </div>
            </MockupWindow>

            {/* SCREENSHOT 8.3: RETENTION POLICY */}
            <MockupWindow
              title="Скріншот 8.3: Панель політики збереження даних (Retention Policy)"
              status="АРХІВ: 90 ДНІВ"
              statusColor="purple"
            >
              <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <div className="text-white font-bold">Термін зберігання журналів: 90 діб</div>
                  <div className="text-[11px] text-neutral-400">Автоматичне вивантаження в архів штабу • Розмір бази: 2.4 МБ</div>
                </div>
                <button className="px-3 py-1 rounded bg-purple-600/80 text-white font-bold text-xs">
                  Налаштувати Retention
                </button>
              </div>
            </MockupWindow>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 9: НАЛАШТУВАННЯ ТА ДОВІДНИКИ */}
        {/* ========================================================= */}
        {isSectionVisible('settings-ref') && (
          <section id="section-9" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black text-lg shrink-0">
                  9
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    9. Системні налаштування та довідники
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Повна матриця параметрів системи: значення, рекомендації та наслідки змін
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                Довідники
              </span>
            </div>

            {/* SCREENSHOT 9: SETTINGS PANEL */}
            <MockupWindow
              title="Скріншот 9: Панель параметрів інтерфейсу та системних довідників СКУД"
              status="КОНФІГУРАЦІЯ: ЗБЕРЕЖЕНО"
              statusColor="rose"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">ТЕМА</div>
                  <div className="font-bold text-white">Темна тактична</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">ШРИФТИ</div>
                  <div className="font-bold text-emerald-400">Збільшені</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">СІТКА</div>
                  <div className="font-bold text-sky-400">3 колонки</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">ЗВУКИ</div>
                  <div className="font-bold text-amber-400">Увімкнено</div>
                </div>
              </div>
            </MockupWindow>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-border/80 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-muted/70 text-foreground border-b border-border font-bold">
                    <th className="p-3">Назва параметра</th>
                    <th className="p-3">Призначення</th>
                    <th className="p-3">Можливі значення</th>
                    <th className="p-3">За замовчуванням</th>
                    <th className="p-3">Рекомендоване</th>
                    <th className="p-3">Наслідки зміни</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-muted-foreground">
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">Тема оформлення</td>
                    <td className="p-3">Колірна схема екрана</td>
                    <td className="p-3">Темна / Світла / Системна</td>
                    <td className="p-3">Темна</td>
                    <td className="p-3 text-emerald-600 font-bold">Темна</td>
                    <td className="p-3">Зміна яскравості екрана вночі</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">Розмір шрифтів</td>
                    <td className="p-3">Масштаб тексту</td>
                    <td className="p-3">Нормальний / Збільшений / Великий</td>
                    <td className="p-3">Нормальний</td>
                    <td className="p-3 text-emerald-600 font-bold">Збільшений</td>
                    <td className="p-3">Краща видимість з відстані 1-2 метри</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">Колонки відвідувачів</td>
                    <td className="p-3">Кількість стовпців карток</td>
                    <td className="p-3">1, 2, 3 або 4 колонки</td>
                    <td className="p-3">3 колонки</td>
                    <td className="p-3 text-emerald-600 font-bold">3 колонки</td>
                    <td className="p-3">Щільність розміщення карток на екрані</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">Звуковий супровід</td>
                    <td className="p-3">Аудіосигнали кліків та тривог</td>
                    <td className="p-3">Увімкнено / Вимкнено</td>
                    <td className="p-3">Увімкнено</td>
                    <td className="p-3 text-emerald-600 font-bold">Увімкнено</td>
                    <td className="p-3">Аудіоконтроль дій оператора</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 10: ЧАСТІ ПОМИЛКИ ТА СПОСОБИ ЇХ УСУНЕННЯ */}
        {/* ========================================================= */}
        {isSectionVisible('troubleshooting') && (
          <section id="section-10" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-lg shrink-0">
                  10
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    10. Часті помилки та способи їх усунення
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Зведена таблиця проблем та детальний розбір: Симптом → Причина → Рішення
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Помилки (FAQ)
              </span>
            </div>

            {/* SCREENSHOT 10: ERROR IDENTIFICATION & TOOLTIPS */}
            <MockupWindow
              title="Скріншот 10: Візуальні індикатори помилок та блокувань інтерфейсу"
              status="ДІАГНОСТИКА БЛОКУВАНЬ"
              statusColor="amber"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-rose-500/40">
                  <div className="text-rose-400 font-bold mb-1">СИМПТОМ: КНОПКА ВИХОДУ СІРА</div>
                  <div className="text-neutral-300 text-[11px]">Підказка: «Діє режим Брудне небо» або «Вартовий на посту»</div>
                  <div className="text-emerald-400 font-bold text-[10px] mt-1">РІШЕННЯ: Вимкніть тривогу або ротуйте вартового</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-amber-500/40">
                  <div className="text-amber-400 font-bold mb-1">СИМПТОМ: МІКРОФОН НЕ СЛУХАЄ</div>
                  <div className="text-neutral-300 text-[11px]">Підказка: «Браузер не має дозволу на аудіо»</div>
                  <div className="text-emerald-400 font-bold text-[10px] mt-1">РІШЕННЯ: Замок в адресному рядку → Дозволити мікрофон</div>
                </div>
              </div>
            </MockupWindow>

            {/* Quick Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-border/80 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-muted/70 text-foreground border-b border-border font-bold">
                    <th className="p-3 w-1/3">Проблема / Симптом</th>
                    <th className="p-3 w-1/3">Можлива причина</th>
                    <th className="p-3 w-1/3">Швидке рішення</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-muted-foreground">
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">Кнопка «-» (вихід) сіра або заблокована</td>
                    <td className="p-3">Активовано «Брудне небо» або боєць є чатовим на посту</td>
                    <td className="p-3 text-emerald-600 font-bold">Вимкніть тривогу або зніміть бійця з поста у вкладці «Охорона»</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">Голосовий ввід не реагує на голос</td>
                    <td className="p-3">Браузер не має дозволу на мікрофон або відійшов кабель</td>
                    <td className="p-3 text-emerald-600 font-bold">Натисніть на замок біля адреси сайту та дозвольте мікрофон</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground">Не видно нового бійця у списку Дашборду</td>
                    <td className="p-3">Активний фільтр пошуку або підрозділу</td>
                    <td className="p-3 text-emerald-600 font-bold">Очистіть рядок пошуку та натисніть «Всі групи»</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 11: ДІАГНОСТИКА НЕСПРАВНОСТЕЙ */}
        {/* ========================================================= */}
        {isSectionVisible('diagnostics') && (
          <section id="section-11" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black text-lg shrink-0">
                  11
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    11. Покрокова діагностика несправностей
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Універсальний алгоритм перевірки від найпростішого до розширеної діагностики
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 border border-teal-500/20">
                Діагностика
              </span>
            </div>

            {/* SCREENSHOT 11: SYSTEM HEALTH MONITOR */}
            <MockupWindow
              title="Скріншот 11: Системний монітор самодіагностики терміналу КПП"
              status="СТАТУС: ШТАТНО 24/7"
              statusColor="emerald"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <HardDrive className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                  <div className="text-white font-bold text-[11px]">IndexedDB Local</div>
                  <div className="text-[10px] text-emerald-400 font-bold">100% ЦІЛІСНІСТЬ</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <Mic className="w-4 h-4 mx-auto mb-1 text-sky-400" />
                  <div className="text-white font-bold text-[11px]">Speech API</div>
                  <div className="text-[10px] text-emerald-400 font-bold">ДОЗВОЛЕНО</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <Activity className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                  <div className="text-white font-bold text-[11px]">ДБЖ / Мережа</div>
                  <div className="text-[10px] text-emerald-400 font-bold">СТАБІЛЬНО</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                  <div className="text-white font-bold text-[11px]">Ізоляція КПП</div>
                  <div className="text-[10px] text-emerald-400 font-bold">АВТОНОМНО</div>
                </div>
              </div>
            </MockupWindow>

            <div className="space-y-3">
              {[
                { step: '1', title: 'Перевірте електроживлення та стан батареї ДБЖ', text: 'Переконайтеся, що робоча станція КПП підключена до мережі або зарядної станції, кабель живлення не пошкоджено, екран світиться стабільно без мерехтіння.' },
                { step: '2', title: 'Перевірте фізичне підключення периферії (USB)', text: 'Перевірте підключення миші, клавіатури та мікрофона. За потреби перепідключіть USB-штекер у сусідній роз\'єм комп\'ютера.' },
                { step: '3', title: 'Перевірте дозволи браузера', text: 'Якщо не працює звук або мікрофон — натисніть на значок замочка зліва від адреси у браузері та переконайтеся, що параметри «Мікрофон» та «Звук» встановлені у положення «Дозволити».' },
                { step: '4', title: 'Перезавантажте сторінку терміналу', text: 'Натисніть комбінацію клавіш Ctrl + F5 (або кнопку оновлення сторінки). Дані системи зберігаються в IndexedDB і НЕ зникнуть.' },
                { step: '5', title: 'Перевірте цілісність бази у вкладці «Налаштування»', text: 'Перейдіть у «Налаштування» → «База даних». Перевірте загальну кількість бійців у базі. Якщо список порожній — натисніть «Відновити з бекапу».' },
                { step: '6', title: 'Аварійне відновлення з файлу резервної копії', text: 'Вставте службову флешку варти, відкрийте вкладку «Налаштування» → «Бекап» → виберіть останній файл *.json та натисніть «Завантажити».' }
              ].map(d => (
                <div key={d.step} className="p-3.5 rounded-2xl bg-card border border-border/80 flex items-start gap-3.5 text-xs sm:text-sm">
                  <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center shrink-0">
                    {d.step}
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground">{d.title}</h5>
                    <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{d.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 12: ОНОВЛЕННЯ ТА ОБСЛУГОВУВАННЯ */}
        {/* ========================================================= */}
        {isSectionVisible('updates') && (
          <section id="section-12" className="user-manual-section p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">
                  12
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    12. Оновлення та технічне обслуговування
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Порядок оновлення версії, обов'язковий бекап, регламентні щотижневі роботи
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Обслуговування
              </span>
            </div>

            {/* SCREENSHOT 12: BACKUP EXPORT & RECOVERY */}
            <MockupWindow
              title="Скріншот 12: Екран резервного копіювання бази та штамп діловодства"
              status="БЕКАП: СТВОРЕНО"
              statusColor="emerald"
            >
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <div className="text-white font-bold">Остання резервна копія: 05.10.2026 08:00:00</div>
                  <div className="text-[11px] text-neutral-400">Файл: `nemesis_backup_full_2026-10-05.json` (2.4 МБ) • Захищено ДСП</div>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Завантажити бекап JSON
                </button>
              </div>
            </MockupWindow>

            <div className="space-y-4 text-xs sm:text-sm text-foreground/90">
              <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-bold text-foreground text-sm uppercase tracking-wide">
                  Золоте правило безпечного оновлення:
                </h4>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <strong>ПЕРЕД БУДЬ-ЯКИМ ОНОВЛЕННЯМ ОБОВ'ЯЗКОВО СТВОРІТЬ БЕКАП!</strong><br />
                  Перейдіть у «Налаштування» → «Бекап» → натисніть «Експорт бази (JSON)» та скопіюйте файл на зовнішній захищений USB-накопичувач.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <h4 className="font-bold text-foreground text-sm">Щотижневий регламент обслуговування:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                    <li>Створення щотижневого архівного бекапу бази в папку штабу.</li>
                    <li>Очищення вентиляційних отворів терміналу від пилу та бруду.</li>
                    <li>Тестування працездатності резервного живлення від зарядної станції.</li>
                    <li>Звірка загальної чисельності особового складу зі стройовою частиною.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <h4 className="font-bold text-foreground text-sm">Дії при збої оновлення:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                    <li>Не панікувати: дані попередніх чергувань збережено у файлі резервної копії.</li>
                    <li>Очистіть кеш вкладки та відкрийте стабільну версію системи.</li>
                    <li>Натисніть «Імпорт бази» та оберіть щойно збережений файл бекапу.</li>
                    <li>Перевірте збіг кількості бійців у базі та продовжуйте несення служби.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Official Military Stamp & Signatures */}
            <div className="p-6 rounded-2xl bg-card border-2 border-dashed border-border/80 space-y-3 select-none">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <h4 className="font-black text-sm text-foreground uppercase tracking-wider">
                  Відмітка про затвердження та проведення інструктажу на посту:
                </h4>
                <span className="text-xs font-bold text-muted-foreground">Форма А-412</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Даний посібник затверджений командуванням військової частини як обов'язковий стандарт несення служби на контрольно-пропускних пунктах. Особовий склад добового наряду ознайомлений під підпис з безпековими протоколами, порядком дій у режимі «Брудне небо» та веденням журналів СКУД.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-bold text-foreground">
                <div>
                  <span>Командир підрозділу охорони / Начальник варти: ____________________ / ____________________</span>
                </div>
                <div>
                  <span>Дата: «___» ____________ 2026 р. • М.П.</span>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* PDF Modal Preview (Аналогічно формуванню звіту відвідувань в Reports.tsx) */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex flex-col no-print animate-in fade-in duration-200">
          {/* Modal Header Bar */}
          <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-900/90 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>Попередній перегляд: Посібник користувача</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase font-mono">
                    ДСП
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono hidden sm:inline">
                    15 сторінок • A4
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs text-neutral-400">
                  АІС КПП «412 NEMESIS» • Офіційний методичний посібник
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
              <PrintableUserManualDocument />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
