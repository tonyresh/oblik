import React from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { Visitor, Group, Location, CustomIcon, Shift } from '../types';
import { splitNameTwoLines } from '../utils/nameUtils';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';

export interface VisitorCardProps {
  key?: React.Key;
  visitor: Visitor;
  group?: Group;
  location?: Location;
  customIcon?: CustomIcon | null;
  shiftStart?: Date;
  currentTime?: Date;
  activeDirtySky?: any;
  isGuardOnDuty?: boolean;
  onMarkIn?: (id: string | any) => void;
  onMarkOut?: (id: string | any) => void;
  mode?: 'visitor' | 'security';
  activeWorkSession?: Shift;
}

export default function VisitorCard({
  visitor,
  group,
  location,
  customIcon,
  shiftStart,
  currentTime,
  activeDirtySky,
  isGuardOnDuty = false,
  onMarkIn,
  onMarkOut,
  mode = 'visitor',
  activeWorkSession,
}: VisitorCardProps) {
  const { hasPermission, currentRole } = useAuth();
  const { showToast } = useToast();
  const canCheckInOut = hasPermission('visitors.check_in_out') || hasPermission('dashboard.actions') || currentRole?.id === 'admin';

  const isSecurity = mode === 'security';
  const bgColor = visitor.color || group?.color || 'transparent';
  const hasGroupColor = bgColor !== 'transparent';
  const brigadeName = visitor.location || location?.name || (visitor.group && !visitor.group.toLowerCase().includes('особлив') ? visitor.group : '');

  const cardStyles = hasGroupColor ? {
    backgroundColor: bgColor.startsWith('#') ? `${bgColor}15` : bgColor,
    borderColor: bgColor.startsWith('#') ? `${bgColor}40` : bgColor,
  } : {};

  const isInDisabled = !canCheckInOut || !!activeDirtySky;
  const isOutDisabled = !canCheckInOut || isGuardOnDuty || !!activeDirtySky;

  const effShiftStart = React.useMemo(() => {
    if (shiftStart) return shiftStart;
    const d = currentTime ? new Date(currentTime) : new Date();
    if (d.getHours() < 8) {
      d.setDate(d.getDate() - 1);
    }
    d.setHours(8, 0, 0, 0);
    return d;
  }, [shiftStart]);

  const shiftLogs = (visitor.logs || []).filter(log => new Date(log.in!) >= effShiftStart);
  const displayLogs = shiftLogs.length > 0 ? shiftLogs : (visitor.status === 'in' && visitor.lastEntry ? [{ in: visitor.lastEntry }] : []);
  const hasLogs = displayLogs.length > 0;
  const inTime = hasLogs && displayLogs[0].in
    ? new Date(displayLogs[0].in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';
  const lastLog = hasLogs ? displayLogs[displayLogs.length - 1] : null;
  const isOnLocation = visitor.status === 'in' && !lastLog?.out;
  const outTime = lastLog?.out
    ? new Date(lastLog.out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : (isSecurity ? '--:--' : (visitor.status === 'in' ? 'на локації' : '--:--'));

  return (
    <div 
      className={`visitor-card flex flex-col relative rounded-xl h-full overflow-hidden shadow-sm hover:shadow transition-all ${
        hasGroupColor ? 'opacity-100 ring-1 ring-inset ring-white/10' : 'bg-card'
      }`}
      style={cardStyles}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5"
        style={{ backgroundColor: hasGroupColor ? bgColor : 'var(--border)' }}
      />
      
      <div className="visitor-card-inner">
        {/* Left: Avatar / Brigade icon + Brigade name centered below */}
        <div className="visitor-avatar-col">
          <div className="relative">
            <div 
              className="visitor-avatar shadow-xs" 
              style={{ backgroundColor: customIcon ? 'transparent' : (visitor.color || group?.color || '#5b6984') }}
            >
              {customIcon ? (
                <img src={customIcon.data} alt="icon" className="w-full h-full object-cover" />
              ) : (
                <User className="visitor-avatar-icon text-[#e5e9ec]" />
              )}
            </div>
            {!isSecurity && visitor.status === 'in' && (
              <span className="visitor-status-dot absolute -top-0.5 -left-0.5 rounded-full bg-emerald-500 border-2 border-card ring-1 ring-emerald-500/40 animate-pulse" />
            )}
          </div>
          {brigadeName && (
            <span className="visitor-brigade-text text-foreground/80 font-semibold">
              {brigadeName}
            </span>
          )}
        </div>

        {/* Middle-Left: Rank, Name (Surname & First name in 2 lines, no patronymic), Callsign */}
        <div className="visitor-info-col">
          {visitor.category && !visitor.category.toLowerCase().includes('особлив') && (
            <div className="visitor-rank-row flex items-center gap-1.5 flex-wrap">
              <span className="visitor-rank-text text-muted-foreground/80 font-bold">
                {visitor.category}
              </span>
            </div>
          )}
          {(() => {
            const { first: surname, second: firstName } = splitNameTwoLines(visitor.name);
            return (
              <div className="visitor-name-col" title={visitor.name}>
                <div className="visitor-name-line visitor-surname-text font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {surname}
                </div>
                {firstName && (
                  <div className="visitor-name-line visitor-firstname-text font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {firstName}
                  </div>
                )}
              </div>
            );
          })()}
          {visitor.callsign && (
            <span className="visitor-callsign-text text-primary font-bold">
              {visitor.callsign}
            </span>
          )}
        </div>

        {/* Center: Entry and Exit times in two lines */}
        <div 
          className={`visitor-time-col ${
            hasLogs 
              ? 'bg-muted/50 border border-border/40 shadow-2xs' 
              : 'bg-muted/15 border border-border/20 text-muted-foreground/30'
          }`}
          title={hasLogs ? `Вхід: ${inTime} | Вихід: ${!isSecurity && isOnLocation ? 'на локації' : outTime}` : 'Немає записів у зміні'}
        >
          <div 
            className={`visitor-time-line ${hasLogs && displayLogs[0].in ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}
          >
            <span className="visitor-time-label">Вх:</span>
            <span className="visitor-time-val">{inTime}</span>
          </div>
          <div 
            className={`visitor-time-line ${
              !isSecurity && isOnLocation 
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 
                : (hasLogs && lastLog?.out ? 'text-red-500 dark:text-red-400 font-bold' : '')
            }`}
          >
            {!isSecurity && isOnLocation ? (
              <span className="visitor-time-val tracking-tight">
                на локації
              </span>
            ) : (
              <>
                <span className="visitor-time-label">Вих:</span>
                <span className="visitor-time-val">{outTime}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Action button (Visitors / Dashboard) OR Duty Status Badge (Security) */}
        {isSecurity ? (
          <div className="flex flex-col items-end justify-center shrink-0">
            {(() => {
              const activeBreak = activeWorkSession?.restPeriods?.find(r => !r.end);
              const isDuty = !!activeWorkSession;
              return (
                <span 
                  className={`visitor-btn border ${
                    isDuty 
                      ? (activeBreak 
                          ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/15' 
                          : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/15')
                      : 'border-border/60 text-muted-foreground bg-muted/60'
                  }`}
                >
                  <span 
                    className={`rounded-full shrink-0 ${
                      isDuty 
                        ? (activeBreak ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse') 
                        : 'bg-muted-foreground/50'
                    }`} 
                    style={{ width: 'clamp(5px, 2.4cqw, 8px)', height: 'clamp(5px, 2.4cqw, 8px)' }}
                  />
                  <span>{isDuty ? (activeBreak ? 'ВІДПОЧИНОК' : 'НА ПОСТУ') : 'ПОЗА ЗМІНОЮ'}</span>
                </span>
              );
            })()}
          </div>
        ) : (
          <div className="flex flex-col items-end justify-center shrink-0">
            {visitor.status !== 'in' && onMarkIn && (
              <button
                onClick={() => {
                  if (!canCheckInOut) {
                    showToast('У вашої ролі немає дозволу на облік входу/виходу (згідно з матрицею прав)', 'error');
                    return;
                  }
                  if (!activeDirtySky) {
                    onMarkIn(visitor.id);
                  }
                }}
                disabled={isInDisabled}
                title={
                  !canCheckInOut
                    ? "У вашої ролі немає дозволу на облік входу/виходу (перевірте матрицю прав)"
                    : activeDirtySky
                      ? "Вхід заблоковано режимом Брудне небо"
                      : "Зафіксувати вхід"
                }
                className={`visitor-btn border ${
                  isInDisabled
                    ? 'border-muted bg-muted/40 text-muted-foreground/60 cursor-not-allowed opacity-60'
                    : 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 shadow-sm active:scale-95 cursor-pointer'
                }`}
              >
                <LogIn className="visitor-btn-icon" />
                <span>Зайшов</span>
              </button>
            )}
            {visitor.status === 'in' && onMarkOut && (
              <button
                onClick={() => {
                  if (!canCheckInOut) {
                    showToast('У вашої ролі немає дозволу на облік входу/виходу (згідно з матрицею прав)', 'error');
                    return;
                  }
                  if (!isOutDisabled) {
                    onMarkOut(visitor.id);
                  }
                }}
                disabled={isOutDisabled}
                title={
                  !canCheckInOut
                    ? "У вашої ролі немає дозволу на облік входу/виходу (перевірте матрицю прав)"
                    : isGuardOnDuty
                      ? "Не можна вийти до передачі зміни"
                      : activeDirtySky
                        ? "Вихід заблоковано режимом Брудне небо"
                        : "Зафіксувати вихід"
                }
                className={`visitor-btn border ${
                  isOutDisabled 
                    ? 'border-muted bg-muted/40 text-muted-foreground/60 cursor-not-allowed opacity-60'
                    : 'border-red-500/40 text-red-600 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 shadow-sm active:scale-95 cursor-pointer'
                }`}
              >
                <LogOut className="visitor-btn-icon" />
                <span>Вийшов</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
