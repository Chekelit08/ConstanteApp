import React, { useState, useMemo } from 'react';
import {
  JournalEntry,
  getEntryBlockTypes,
  getCombinedEntryText,
  normalizeJournalEntry,
} from '../../types/journal';
import {
  getDaysInMonth,
  MONTH_NAMES,
  getTodayDateString,
  parseDateString,
  getMondayIndexedDay,
  DAY_NAMES_SHORT,
  formatArgentineDate,
} from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  FileText,
  Camera,
} from 'lucide-react';

interface JournalCalendarProps {
  entries: Record<string, JournalEntry>;
  onSelectDate: (dateStr: string) => void;
}

const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '🔥',
};

export const JournalCalendar: React.FC<JournalCalendarProps> = ({
  entries,
  onSelectDate,
}) => {
  const todayStr = getTodayDateString();
  const todayDate = parseDateString(todayStr);

  const [currentYear, setCurrentYear] = useState<number>(todayDate.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(todayDate.getMonth());

  const daysInMonth = useMemo(
    () => getDaysInMonth(currentYear, currentMonthIndex),
    [currentYear, currentMonthIndex]
  );

  const firstDayOffset = useMemo(() => {
    if (daysInMonth.length === 0) return 0;
    const firstDate = parseDateString(daysInMonth[0]);
    return getMondayIndexedDay(firstDate); // 0 = Lun, 6 = Dom
  }, [daysInMonth]);

  const prevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonthIndex(todayDate.getMonth());
  };

  return (
    <div className="rounded-3xl bg-surface border border-app p-6 shadow-xs space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted font-bold">
            CALENDARIO DEL DIARIO
          </span>
          <h3 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-wider text-main mt-0.5">
            {MONTH_NAMES[currentMonthIndex]} {currentYear}
          </h3>
        </div>

        {/* Navigation */}
        <div className="flex items-center bg-surface-elevated rounded-xl p-1 border border-app">
          <button
            type="button"
            onClick={prevMonth}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-main hover:bg-surface transition cursor-pointer min-h-[44px]"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>
          <button
            type="button"
            onClick={goToCurrentMonth}
            className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-main hover:bg-surface rounded-lg transition min-h-[44px] cursor-pointer"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-main hover:bg-surface transition cursor-pointer min-h-[44px]"
            aria-label="Mes siguiente"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-bold uppercase text-muted">
        {DAY_NAMES_SHORT.map((name) => (
          <div key={name} className="py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty offset padding cells */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`offset-${i}`} className="min-h-[75px] sm:min-h-[90px] rounded-2xl bg-transparent" />
        ))}

        {/* Month Day Cells */}
        {daysInMonth.map((dateStr, idx) => {
          const dayNum = idx + 1;
          const raw = entries[dateStr];
          const entry = raw ? normalizeJournalEntry(raw) : null;
          const isToday = dateStr === todayStr;
          const { hasVoice, hasText, hasPhoto } = entry ? getEntryBlockTypes(entry) : { hasVoice: false, hasText: false, hasPhoto: false };
          const snippet = entry ? getCombinedEntryText(entry).slice(0, 70) : '';

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              title={entry ? `${formatArgentineDate(dateStr)}: ${snippet}` : `Escribir o grabar para el ${dayNum}`}
              className={`min-h-[75px] sm:min-h-[90px] p-2 sm:p-2.5 rounded-2xl border text-left flex flex-col justify-between transition group relative cursor-pointer ${
                isToday
                  ? 'border-accent bg-accent-subtle/30 ring-1 ring-accent'
                  : entry
                  ? 'border-app bg-surface-elevated hover:border-accent'
                  : 'border-subtle bg-surface hover:border-app'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`font-mono text-xs font-bold ${
                    isToday ? 'text-accent underline font-black' : 'text-main'
                  }`}
                >
                  {dayNum}
                </span>

                {/* Small indicator dots/icons */}
                <div className="flex items-center gap-1">
                  {hasVoice && <Mic className="w-3 h-3 text-accent" />}
                  {hasText && <FileText className="w-3 h-3 text-main" />}
                  {hasPhoto && <Camera className="w-3 h-3 text-main" />}
                </div>
              </div>

              {entry ? (
                <div className="space-y-1 mt-auto pt-1 w-full">
                  {snippet && (
                    <p className="text-[10px] text-muted line-clamp-1 leading-tight hidden sm:block">
                      {snippet}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs select-none">
                      {entry.mood ? MOOD_EMOJIS[entry.mood] : ''}
                    </span>
                    {entry.score && (
                      <span className="text-[9px] font-mono font-bold text-dim">
                        {entry.score}/10
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                  <span className="text-[9px] font-mono text-muted">+ Agregar</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
