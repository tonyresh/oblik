import React from 'react';
import { format, parseISO } from 'date-fns';
import { formatNameAbbreviated } from '../utils/nameUtils';
import { SecurityShift } from '../types';
import { Shield, AlertTriangle, Clock, Users, ArrowRightCircle } from 'lucide-react';

interface PrintableReportDocumentProps {
  startDate: string;
  endDate: string;
  reportRows: any[];
  totalVisits: number;
  uniqueVisitors: number;
  dirtySkyCount: number;
  currentlyOnSiteCount: number;
  selectedShift: SecurityShift | null;
  selectedShiftComposition: string;
  orientation?: 'portrait' | 'landscape';
}

export default function PrintableReportDocument({
  startDate,
  endDate,
  reportRows,
  totalVisits,
  uniqueVisitors,
  dirtySkyCount,
  currentlyOnSiteCount,
  selectedShift,
  selectedShiftComposition,
  orientation = 'portrait'
}: PrintableReportDocumentProps) {
  const generatedAt = new Date();
  const formattedStart = format(parseISO(startDate), 'dd.MM.yyyy');
  const formattedEnd = format(parseISO(endDate), 'dd.MM.yyyy');
  const docRegNumber = `ЗВ-${format(generatedAt, 'yyyyMMdd')}/${format(parseISO(startDate), 'dd')}`;

  return (
    <div className={`printable-document bg-white text-neutral-900 font-sans p-6 sm:p-8 md:p-10 ${orientation === 'landscape' ? 'w-full max-w-[297mm]' : 'w-full max-w-[210mm]'} mx-auto leading-normal select-text`}>
      {/* Official Header */}
      <div className="border-b-2 border-neutral-900 pb-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-sm print:border print:border-black">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-500">
                Контрольно-пропускний пункт • Військова частина
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-neutral-900">
                Журнал обліку відвідувачів та переміщень
              </h1>
              <div className="text-xs font-medium text-neutral-600">
                Офіційний зведений звіт пропускного режиму за період
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 border-l border-neutral-300 pl-4 text-xs space-y-1">
            <div className="font-mono text-[11px] text-neutral-500">Реєстраційний номер:</div>
            <div className="font-bold text-neutral-900 text-sm font-mono">{docRegNumber}</div>
            <div className="text-[11px] text-neutral-500">
              Сформовано: <span className="text-neutral-800 font-medium">{format(generatedAt, 'dd.MM.yyyy HH:mm:ss')}</span>
            </div>
          </div>
        </div>

        {/* Period bar */}
        <div className="mt-4 pt-2 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-neutral-700 uppercase tracking-wider text-[11px]">Звітний період: </span>
            <span className="font-semibold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300 font-mono">
              {formattedStart} — {formattedEnd}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 italic">
            Гриф: Для службового користування
          </div>
        </div>
      </div>

      {/* Duty Shift & Team Info Card */}
      <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-3.5 mb-5 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Чергова зміна:</span>
            <span className="text-sm font-bold text-neutral-900">{selectedShift?.name || 'Чергова зміна не обрана'}</span>
            <div className="mt-1">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                selectedShift?.status === 'active' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-neutral-200 text-neutral-700 border border-neutral-300'
              }`}>
                {selectedShift?.status === 'active' ? '● На чергуванні' : '○ Зміну передано'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Склад чергової зміни (наряд):</span>
            <p className="text-xs text-neutral-800 font-medium leading-relaxed mt-0.5">
              {selectedShiftComposition}
            </p>
          </div>
        </div>
      </div>

      {/* Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 text-xs">
        <div className="border border-neutral-300 rounded-lg p-2.5 bg-neutral-50/60 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Зафіксовано записів</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-neutral-900 font-mono">{totalVisits}</span>
            <ArrowRightCircle className="w-4 h-4 text-neutral-400" />
          </div>
        </div>

        <div className="border border-neutral-300 rounded-lg p-2.5 bg-neutral-50/60 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Унікальних осіб</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-neutral-900 font-mono">{uniqueVisitors}</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
        </div>

        <div className="border border-neutral-300 rounded-lg p-2.5 bg-neutral-50/60 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">«Брудне небо» (подій)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-700 font-mono">{dirtySkyCount}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        <div className="border border-neutral-300 rounded-lg p-2.5 bg-neutral-50/60 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">На території (на посту)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-700 font-mono">{currentlyOnSiteCount}</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Official Table */}
      <div className="mb-6 overflow-hidden">
        <table className="doc-table w-full border-collapse border border-neutral-400 text-xs">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-400 text-[10px] font-bold uppercase tracking-wider text-neutral-700 text-left">
              <th className="border border-neutral-300 p-2 text-center w-10">№</th>
              <th className="border border-neutral-300 p-2 text-center w-20">Дата</th>
              <th className="border border-neutral-300 p-2">Звання, ПІБ, Позивний</th>
              <th className="border border-neutral-300 p-2">Звідки (Бригада)</th>
              <th className="border border-neutral-300 p-2">Група / Підрозділ</th>
              <th className="border border-neutral-300 p-2 text-center w-14">Вхід</th>
              <th className="border border-neutral-300 p-2 text-center w-14">Вихід</th>
              <th className="border border-neutral-300 p-2 text-center w-20">Статус</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.length > 0 ? (
              reportRows.map((row, idx) => {
                const dateStr = format(row.date, 'dd.MM.yyyy');

                if (row.type === 'dirtySky') {
                  const e = row.event;
                  const timeInStr = format(parseISO(e.startTime), 'HH:mm');
                  const timeOutStr = e.endTime ? format(parseISO(e.endTime), 'HH:mm') : 'триває';
                  const isCurrent = !e.endTime;

                  return (
                    <tr 
                      key={`print-row-ds-${e.id || 'ds'}-${idx}-${e.startTime || ''}`} 
                      className="bg-amber-50/70 border-b border-amber-200"
                    >
                      <td className="border border-neutral-300 p-2 text-center font-mono text-neutral-600 font-bold">{idx + 1}</td>
                      <td className="border border-neutral-300 p-2 text-center font-mono text-neutral-800">{dateStr}</td>
                      <td className="border border-neutral-300 p-2">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>БРУДНЕ НЕБО</span>
                        </div>
                        <div className="text-[10px] text-amber-700 uppercase font-semibold">Спеціальна подія (укриття)</div>
                      </td>
                      <td className="border border-neutral-300 p-2 text-neutral-500 italic">—</td>
                      <td className="border border-neutral-300 p-2 font-semibold text-neutral-700">Спец. події</td>
                      <td className="border border-neutral-300 p-2 text-center font-mono font-bold text-amber-800">{timeInStr}</td>
                      <td className="border border-neutral-300 p-2 text-center font-mono font-bold text-neutral-800">{timeOutStr}</td>
                      <td className="border border-neutral-300 p-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          isCurrent ? 'bg-amber-200 text-amber-900' : 'bg-neutral-200 text-neutral-800'
                        }`}>
                          {isCurrent ? 'Триває' : 'Завершено'}
                        </span>
                      </td>
                    </tr>
                  );
                }

                if (row.type === 'dutyEvent') {
                  const e = row.event;
                  const isStart = e.type === 'start';
                  const timeStr = format(parseISO(e.timestamp), 'HH:mm');

                  return (
                    <tr 
                      key={`print-row-duty-${e.id || 'duty'}-${idx}-${e.timestamp || ''}`} 
                      className={isStart ? "bg-emerald-50/70 border-b border-emerald-200" : "bg-rose-50/70 border-b border-rose-200"}
                    >
                      <td className="border border-neutral-300 p-2 text-center font-mono text-neutral-600 font-bold">{idx + 1}</td>
                      <td className="border border-neutral-300 p-2 text-center font-mono text-neutral-800">{dateStr}</td>
                      <td className="border border-neutral-300 p-2">
                        <div className={`font-bold flex items-center gap-1.5 ${isStart ? 'text-emerald-900' : 'text-rose-900'}`}>
                          <Shield className={`w-3.5 h-3.5 shrink-0 ${isStart ? 'text-emerald-600' : 'text-rose-600'}`} />
                          <span>Чергова зміна: {e.shiftName}</span>
                        </div>
                        <div className={`text-[10px] uppercase font-semibold ${isStart ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isStart ? `Заступила на чергування о ${timeStr}` : `Закінчила чергування о ${timeStr}`}
                        </div>
                      </td>
                      <td className="border border-neutral-300 p-2 text-neutral-600">КПП</td>
                      <td className="border border-neutral-300 p-2 font-semibold text-neutral-700">Рота охорони</td>
                      <td className="border border-neutral-300 p-2 text-center font-mono font-bold text-emerald-800">
                        {isStart ? timeStr : '—'}
                      </td>
                      <td className="border border-neutral-300 p-2 text-center font-mono font-bold text-neutral-800">
                        {!isStart ? timeStr : '—'}
                      </td>
                      <td className="border border-neutral-300 p-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          isStart ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          {isStart ? 'Заступила' : 'Закінчила'}
                        </span>
                      </td>
                    </tr>
                  );
                }

                const v = row.visitor;
                const log = row.log;
                const timeInStr = log?.in ? format(parseISO(log.in), 'HH:mm') : '—';
                const timeOutStr = log?.out ? format(parseISO(log.out), 'HH:mm') : 'на посту';
                const isOnSite = !log?.out;

                return (
                  <tr 
                    key={`print-row-vis-${v.id || 'vis'}-${idx}-${log?.in || ''}`} 
                    className={idx % 2 === 1 ? 'bg-neutral-50/50' : 'bg-white'}
                  >
                    <td className="border border-neutral-300 p-2 text-center font-mono text-neutral-600">{idx + 1}</td>
                    <td className="border border-neutral-300 p-2 text-center font-mono text-neutral-800">{dateStr}</td>
                    <td className="border border-neutral-300 p-2">
                      {v.category && (
                        <div className="text-[9px] text-neutral-500 uppercase font-semibold tracking-wider">{v.category}</div>
                      )}
                      <div className="font-medium text-neutral-900">
                        {formatNameAbbreviated(v.name)}
                        {v.callsign && (
                          <span className="ml-1.5 text-neutral-600 font-mono font-bold text-[10px]">[{v.callsign}]</span>
                        )}
                      </div>
                    </td>
                    <td className="border border-neutral-300 p-2 text-neutral-800 font-medium">
                      {v.location || '—'}
                    </td>
                    <td className="border border-neutral-300 p-2 text-neutral-800">
                      {v.group || '—'}
                    </td>
                    <td className="border border-neutral-300 p-2 text-center font-mono font-semibold text-emerald-800">
                      {timeInStr}
                    </td>
                    <td className="border border-neutral-300 p-2 text-center font-mono font-semibold text-neutral-800">
                      {timeOutStr}
                    </td>
                    <td className="border border-neutral-300 p-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isOnSite 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}>
                        {isOnSite ? 'На посту' : 'Вибув'}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-neutral-500 italic border border-neutral-300">
                  Записи за обраний звітний період відсутні
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Signatures & Certification Block */}
      <div className="doc-signatures border-t-2 border-neutral-900 pt-5 mt-6 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] mb-1">
              Звіт сформував (Черговий КПП):
            </div>
            <div className="mt-8 border-b border-neutral-400 pb-1 flex justify-between text-[11px] text-neutral-500">
              <span>(підпис)</span>
              <span>/ ______________________ /</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Звання, ПІБ чергового</div>
          </div>

          <div>
            <div className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] mb-1">
              Зміну здав:
            </div>
            <div className="mt-8 border-b border-neutral-400 pb-1 flex justify-between text-[11px] text-neutral-500">
              <span>(підпис)</span>
              <span>/ ______________________ /</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Черговий попередньої зміни</div>
          </div>

          <div>
            <div className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] mb-1">
              Зміну прийняв:
            </div>
            <div className="mt-8 border-b border-neutral-400 pb-1 flex justify-between text-[11px] text-neutral-500">
              <span>(підпис)</span>
              <span>/ ______________________ /</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">Черговий наступної зміни</div>
          </div>
        </div>

        <div className="mt-8 pt-3 border-t border-neutral-200 flex flex-wrap justify-between items-center text-[10px] text-neutral-500">
          <div>
            Дата засвідчення: «___» ____________ 2026 р.
          </div>
          <div className="font-bold tracking-widest text-neutral-400">
            М. П.
          </div>
          <div>
            Автоматизований комплекс обліку КПП • Сторінка 1
          </div>
        </div>
      </div>
    </div>
  );
}
