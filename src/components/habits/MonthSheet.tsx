import React, { useState, useMemo } from 'react';
import { Habit, HabitLog, HabitValue } from '../../types/habit';
import { JournalEntry } from '../../types/journal';
import {
  getDaysInMonth,
  MONTH_NAMES,
  getTodayDateString,
  getMondayIndexedDay,
  DAY_NAMES_SHORT,
  parseDateString,
  formatArgentineDate,
} from '../../utils/dateUtils';
import { isHabitScheduledOnDate, isHabitCompleted, getHabitProgress } from '../../services/dataStorage';
import { ValuePopover } from './ValuePopover';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Check,
  Calendar,
  Mic,
  Volume2,
  X,
  Sparkles,
} from 'lucide-react';

interface MonthSheetProps {
  habits: Habit[];
  logs: Record<string, HabitLog>;
  entries?: Record<string, JournalEntry>;
  onToggleHabit: (habitId: string, dateStr: string) => void;
  onSetHabitValue: (habitId: string, dateStr: string, val: HabitValue) => void;
  onNewHabit?: () => void;
  onOpenJournalDate?: (dateStr: string) => void;
}

export const MonthSheet: React.FC<MonthSheetProps> = ({
  habits,
  logs,
  entries = {},
  onToggleHabit,
  onSetHabitValue,
  onNewHabit,
  onOpenJournalDate,
}) => {
  const todayStr = getTodayDateString();
  const todayDate = parseDateString(todayStr);

  const [currentYear, setCurrentYear] = useState<number>(todayDate.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(todayDate.getMonth());

  // Horizontal scroll tracking on mobile
  const [hasScrolledHorizontal, setHasScrolledHorizontal] = useState<boolean>(false);

  // Habit full detail modal when tapped on mobile
  const [selectedHabitDetailModal, setSelectedHabitDetailModal] = useState<Habit | null>(null);

  // Popover state for counter/duration
  const [activePopover, setActivePopover] = useState<{
    habit: Habit;
    dateStr: string;
    currentVal: HabitValue | undefined;
  } | null>(null);

  // Day detail modal state when day header is tapped
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);

  const daysInMonth = useMemo(
    () => getDaysInMonth(currentYear, currentMonthIndex),
    [currentYear, currentMonthIndex]
  );

  const activeHabits = useMemo(
    () => habits.filter((h) => h.status !== 'archived'),
    [habits]
  );

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

  const handlePrint = () => {
    window.print();
  };

  // Day totals (bottom row)
  const dayTotals = useMemo(() => {
    return daysInMonth.map((dateStr) => {
      let completedCount = 0;
      let scheduledCount = 0;

      activeHabits.forEach((habit) => {
        if (isHabitScheduledOnDate(habit, dateStr)) {
          scheduledCount++;
          if (isHabitCompleted(habit, logs[dateStr]?.values?.[habit.id])) {
            completedCount++;
          }
        }
      });

      return { completedCount, scheduledCount };
    });
  }, [daysInMonth, activeHabits, logs]);

  // Habit monthly percentage (right column) - strictly up to today if current month
  const habitMonthlyStats = useMemo(() => {
    const stats: Record<string, { completed: number; scheduled: number; rate: number }> = {};
    let totalScheduledMonth = 0;
    let totalCompletedMonth = 0;

    activeHabits.forEach((habit) => {
      let completed = 0;
      let scheduled = 0;

      daysInMonth.forEach((dateStr) => {
        // Never count future days
        const isFuture = dateStr > todayStr;
        if (!isFuture && isHabitScheduledOnDate(habit, dateStr)) {
          scheduled++;
          totalScheduledMonth++;
          if (isHabitCompleted(habit, logs[dateStr]?.values?.[habit.id])) {
            completed++;
            totalCompletedMonth++;
          }
        }
      });

      const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
      stats[habit.id] = { completed, scheduled, rate };
    });

    const globalMonthRate =
      totalScheduledMonth > 0 ? Math.round((totalCompletedMonth / totalScheduledMonth) * 100) : 0;

    return { stats, globalMonthRate };
  }, [activeHabits, daysInMonth, logs, todayStr]);

  const handleCellClick = (habit: Habit, dateStr: string) => {
    if (habit.type === 'boolean') {
      onToggleHabit(habit.id, dateStr);
    } else {
      setActivePopover({
        habit,
        dateStr,
        currentVal: logs[dateStr]?.values?.[habit.id],
      });
    }
  };

  const dayDetailEntry = selectedDayDetail ? entries[selectedDayDetail] : null;

  return (
    <div className="space-y-6">
      {/* Editorial Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest uppercase text-muted">
            <span>PLANILLA EDITORIAL</span>
            <span>•</span>
            <span>AÑO {currentYear}</span>
          </div>
          <h2 className="font-['Oswald'] text-3xl sm:text-4xl font-bold uppercase tracking-wider text-main mt-0.5">
            Control de Hábitos
          </h2>
        </div>

        {/* Month Selector & Print Button */}
        <div className="flex flex-wrap items-center gap-2">
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

          <div className="hidden sm:flex items-center px-3 py-2 bg-surface-elevated rounded-xl border border-app font-['Oswald'] text-sm font-bold uppercase tracking-wider text-main min-h-[44px]">
            {MONTH_NAMES[currentMonthIndex]} {currentYear}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold uppercase tracking-wider hover:opacity-90 shadow-xs transition cursor-pointer min-h-[44px]"
            title="Imprimir planilla en formato A4"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* PRINT-ONLY EDITORIAL REPLICA (A4 Vertical, 2 rows of numbers) */}
      <div className="hidden print:block mb-4 text-center border-b-2 border-black pb-2 text-black">
        <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-widest">
          CONTROL DE HÁBITOS
        </h1>
        <div className="flex items-center justify-between text-[11px] font-mono mt-2 px-2">
          <span>MES: {MONTH_NAMES[currentMonthIndex].toUpperCase()}</span>
          <span>AÑO: {currentYear}</span>
          <span>FECHA: _______________</span>
          <span>FIRMA / OBJETIVO: _______________________</span>
        </div>
      </div>

      {/* SPREADSHEET CONTAINER WITH HORIZONTAL SCROLL HINT */}
      <div className="relative rounded-2xl border border-app bg-surface shadow-xs overflow-hidden print:border-black print:rounded-none">
        {/* Mobile scroll hint */}
        {!hasScrolledHorizontal && (
          <div className="md:hidden absolute top-2 right-2 z-30 pointer-events-none bg-neutral-900/85 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
            Deslizá →
          </div>
        )}
        <div
          onScroll={() => setHasScrolledHorizontal(true)}
          className="overflow-x-auto max-w-full shadow-[inset_-12px_0_8px_-8px_rgba(0,0,0,0.14)] md:shadow-none"
        >
          {/* Desktop: table-fixed fits all days without horizontal scroll. Mobile: scroll with fixed column */}
          <table className="w-full md:table-fixed border-collapse text-left select-none text-xs print:text-[8px] print:w-full">
            {/* TABLE HEADER (Days 1..31 with 2 rows of headers, pinned vertically & horizontally) */}
            <thead className="sticky top-0 z-30 shadow-xs bg-surface-elevated">
              {/* Row 1: Day of week letters */}
              <tr className="bg-surface-elevated border-b border-app print:bg-white print:border-black">
                {/* # Header */}
                <th
                  rowSpan={2}
                  className="sticky left-0 top-0 z-40 bg-surface-elevated print:bg-white w-7 min-w-[28px] md:w-[3%] md:min-w-0 text-center py-2 px-0.5 font-mono font-bold text-muted border-r border-app print:border-black shadow-xs"
                >
                  #
                </th>
                {/* Habit Name Header */}
                <th
                  rowSpan={2}
                  className="sticky left-7 top-0 z-40 bg-surface-elevated print:bg-white w-[160px] min-w-[160px] max-w-[200px] md:w-[24%] md:min-w-[180px] md:max-w-none py-2 px-2.5 font-['Oswald'] font-bold uppercase tracking-wider text-main border-r border-app print:border-black shadow-xs"
                >
                  HÁBITO
                </th>

                {/* Day Letters (L, M, M, J, V, S, D) */}
                {daysInMonth.map((dateStr) => {
                  const date = parseDateString(dateStr);
                  const dayOfWeek = getMondayIndexedDay(date);
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                  const isToday = dateStr === todayStr;

                  return (
                    <th
                      key={`dow-${dateStr}`}
                      className={`text-center py-0.5 px-0 border-r border-app print:border-black text-[9px] font-mono uppercase min-w-[40px] md:min-w-0 ${
                        isToday
                          ? 'bg-accent-subtle text-accent font-bold'
                          : isWeekend
                          ? 'bg-surface-muted text-muted'
                          : 'text-muted'
                      }`}
                    >
                      {DAY_NAMES_SHORT[dayOfWeek].charAt(0)}
                    </th>
                  );
                })}

                {/* % Rate Header */}
                <th
                  rowSpan={2}
                  className="w-10 min-w-[40px] md:w-[5%] md:min-w-0 text-center py-2 px-0.5 font-mono font-bold text-main uppercase tracking-wider print:border-black"
                >
                  %
                </th>
              </tr>

              {/* Row 2: Day numbers 1..31 (tappable to open detail modal) */}
              <tr className="bg-surface-elevated border-b border-app print:bg-white print:border-black">
                {daysInMonth.map((dateStr, idx) => {
                  const dayNum = idx + 1;
                  const date = parseDateString(dateStr);
                  const dayOfWeek = getMondayIndexedDay(date);
                  const isToday = dateStr === todayStr;
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                  return (
                    <th
                      key={`num-${dateStr}`}
                      className={`text-center py-1 px-0 border-r border-app print:border-black min-w-[40px] md:min-w-0 ${
                        isToday
                          ? 'bg-accent-subtle text-accent font-black'
                          : isWeekend
                          ? 'bg-surface-muted text-muted'
                          : 'text-main'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedDayDetail(dateStr)}
                        className="w-full flex items-center justify-center font-mono text-[10px] sm:text-xs py-0.5 hover:opacity-75 transition cursor-pointer"
                        title={`Tocar para ver detalle del día ${dayNum}`}
                      >
                        <span className={isToday ? 'underline font-black' : 'font-semibold'}>
                          {dayNum}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* TABLE BODY (Habit rows) */}
            <tbody className="divide-y divide-app print:divide-black">
              {activeHabits.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysInMonth.length + 3}
                    className="py-12 text-center text-muted font-medium"
                  >
                    No hay hábitos activos. Podés crear uno nuevo desde la pestaña de Hábitos.
                  </td>
                </tr>
              ) : (
                activeHabits.map((habit, habitIdx) => {
                  const stats = habitMonthlyStats.stats[habit.id] || { completed: 0, scheduled: 0, rate: 0 };
                  const rowNumber = String(habitIdx + 1).padStart(2, '0');

                  return (
                    <tr
                      key={habit.id}
                      className="hover:bg-surface-elevated/40 transition-colors"
                    >
                      {/* Number cell */}
                      <td className="sticky left-0 z-10 bg-surface print:bg-white text-center py-1.5 px-0.5 font-mono font-bold text-dim border-r border-app print:border-black">
                        {rowNumber}
                      </td>

                      {/* Habit Name cell */}
                      <td
                        onClick={() => setSelectedHabitDetailModal(habit)}
                        className="sticky left-7 z-10 bg-surface print:bg-white py-1.5 px-2.5 border-r border-app print:border-black overflow-hidden group cursor-pointer hover:bg-surface-elevated transition"
                        title="Tocar para ver nombre completo y detalles del hábito"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: habit.color || 'var(--color-accent)' }}
                          />
                          <span className="text-xs select-none shrink-0" role="img" aria-label={habit.name}>
                            {habit.emoji}
                          </span>
                          <span
                            className="font-medium text-xs text-main truncate whitespace-normal line-clamp-1 group-hover:underline"
                            title={habit.name}
                          >
                            {habit.name}
                          </span>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {daysInMonth.map((dateStr) => {
                        const isScheduled = isHabitScheduledOnDate(habit, dateStr);
                        const isFuture = dateStr > todayStr;
                        const isToday = dateStr === todayStr;
                        const val = logs[dateStr]?.values?.[habit.id];
                        const completed = isHabitCompleted(habit, val);
                        const progress = getHabitProgress(habit, val);

                        if (!isScheduled) {
                          return (
                            <td
                              key={dateStr}
                              className="text-center p-0.5 border-r border-app bg-surface-muted/30 print:border-black min-w-[40px] md:min-w-0"
                            >
                              <div className="w-full h-5 flex items-center justify-center opacity-25">
                                <span className="w-1 h-1 rounded-full bg-muted" />
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={dateStr}
                            className={`text-center p-0.5 border-r border-app print:border-black min-w-[40px] md:min-w-0 ${
                              isToday ? 'bg-accent-subtle/30' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCellClick(habit, dateStr)}
                              aria-label={`${habit.name}, ${formatArgentineDate(dateStr)}, ${completed ? 'cumplido' : 'no cumplido'}`}
                              aria-pressed={completed}
                              className={`w-full h-5 sm:h-6 rounded flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                                completed
                                  ? 'bg-accent text-accent-contrast shadow-2xs print:bg-black print:text-white'
                                  : isFuture
                                  ? 'opacity-35 hover:opacity-75 border border-dashed border-app'
                                  : 'border border-app hover:border-accent bg-surface'
                              }`}
                              title={`${habit.name} (${dateStr}): ${
                                completed ? 'Completado' : 'Pendiente'
                              }`}
                            >
                              {/* Partial progress indicator for counter/duration */}
                              {!completed && progress > 0 && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 bg-accent-subtle transition-all"
                                  style={{ height: `${Math.round(progress * 100)}%` }}
                                />
                              )}

                              {completed ? (
                                <Check className="w-3 h-3 stroke-[3]" />
                              ) : progress > 0 ? (
                                <span className="text-[8px] sm:text-[9px] font-mono font-bold z-10 text-main">
                                  {val}
                                </span>
                              ) : null}
                            </button>
                          </td>
                        );
                      })}

                      {/* Percentage rate cell */}
                      <td className="text-center py-1.5 px-0.5 font-mono font-bold text-xs text-main print:text-black">
                        {stats.rate}%
                      </td>
                    </tr>
                  );
                })
              )}

              {/* BOTTOM SUMMARY ROW (Totales por día y promedio global) */}
              <tr className="bg-surface-elevated font-bold border-t-2 border-app print:bg-white print:border-black">
                <td className="sticky left-0 z-10 bg-surface-elevated print:bg-white text-center py-2 px-0.5 font-mono text-dim border-r border-app">
                  ∑
                </td>
                <td className="sticky left-7 z-10 bg-surface-elevated print:bg-white py-2 px-2 font-['Oswald'] uppercase tracking-wider text-[11px] border-r border-app text-muted">
                  TOTAL DÍA
                </td>

                {dayTotals.map((tot, idx) => {
                  const dateStr = daysInMonth[idx];
                  const isToday = dateStr === todayStr;
                  return (
                    <td
                      key={dateStr}
                      className={`text-center py-1.5 px-0 border-r border-app font-mono text-[11px] ${
                        isToday ? 'bg-accent-subtle text-accent font-black' : 'text-main'
                      }`}
                    >
                      {tot.completedCount > 0 ? tot.completedCount : '-'}
                    </td>
                  );
                })}

                {/* Global month percentage */}
                <td className="text-center py-1.5 px-0.5 font-mono text-xs text-accent font-black">
                  {habitMonthlyStats.globalMonthRate}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Popover for counter/duration adjustments */}
      {activePopover && (
        <ValuePopover
          habit={activePopover.habit}
          dateStr={activePopover.dateStr}
          currentValue={activePopover.currentVal}
          onSave={(val) => {
            onSetHabitValue(activePopover.habit.id, activePopover.dateStr, val);
            setActivePopover(null);
          }}
          onClose={() => setActivePopover(null)}
        />
      )}

      {/* DAY DETAIL MODAL (WHEN DAY HEADER IS TAPPED) */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface border border-app p-6 shadow-2xl text-main animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-app">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                  DETALLE DEL DÍA
                </span>
                <h4 className="font-['Oswald'] text-xl font-bold uppercase text-main">
                  {formatArgentineDate(selectedDayDetail, { includeDayName: true })}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="p-1.5 rounded-lg text-muted hover:text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Habits on this day */}
            <div className="my-5 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted">
                Hábitos programados:
              </h5>
              <div className="space-y-1.5">
                {activeHabits
                  .filter((h) => isHabitScheduledOnDate(h, selectedDayDetail))
                  .map((h) => {
                    const isComp = isHabitCompleted(h, logs[selectedDayDetail]?.values?.[h.id]);
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated text-xs border border-app"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{h.emoji}</span>
                          <span className={isComp ? 'line-through text-muted' : 'font-medium text-main'}>
                            {h.name}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isComp ? 'bg-accent text-accent-contrast' : 'bg-surface-muted text-muted'
                          }`}
                        >
                          {isComp ? 'Cumplido' : 'Pendiente'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Journal Entry on this day (if any) */}
            <div className="pt-4 border-t border-app">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-accent" />
                <span>Entrada de Diario de Voz:</span>
              </h5>

              {dayDetailEntry ? (
                <div className="p-3.5 rounded-xl bg-surface-elevated border border-app space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted">
                      Duración: {Math.round(dayDetailEntry.durationSeconds || 0)}s
                    </span>
                    {dayDetailEntry.score && (
                      <span className="font-mono font-bold text-accent">
                        {dayDetailEntry.score}/10
                      </span>
                    )}
                  </div>
                  {dayDetailEntry.summary && (
                    <p className="text-xs italic text-main">"{dayDetailEntry.summary}"</p>
                  )}
                  {dayDetailEntry.transcriptEdited && (
                    <p className="text-xs text-muted line-clamp-3">
                      {dayDetailEntry.transcriptEdited}
                    </p>
                  )}
                  {onOpenJournalDate && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenJournalDate(selectedDayDetail);
                        setSelectedDayDetail(null);
                      }}
                      className="text-xs font-bold text-accent hover:underline block pt-1 cursor-pointer"
                    >
                      Abrir entrada completa en el diario →
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-muted">
                  <p>No se grabó bitácora para este día.</p>
                  {onOpenJournalDate && selectedDayDetail <= todayStr && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenJournalDate(selectedDayDetail);
                        setSelectedDayDetail(null);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline cursor-pointer"
                    >
                      <Mic className="w-3 h-3" /> Grabar para este día
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayDetail(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* FULL HABIT DETAIL MODAL (ON TAP) */}
      {selectedHabitDetailModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="habit-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-surface border border-app rounded-3xl p-6 shadow-2xl space-y-4 text-main">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-2xl bg-surface-elevated">
                  {selectedHabitDetailModal.emoji}
                </span>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                    {selectedHabitDetailModal.category}
                  </span>
                  <h3 id="habit-detail-title" className="text-lg font-['Oswald'] font-bold text-main uppercase">
                    {selectedHabitDetailModal.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHabitDetailModal(null)}
                aria-label="Cerrar detalle"
                className="p-1.5 text-muted hover:text-main rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-muted pt-2 border-t border-app">
              {selectedHabitDetailModal.description && (
                <p className="italic text-main leading-relaxed">
                  "{selectedHabitDetailModal.description}"
                </p>
              )}
              <div className="flex justify-between py-1 border-b border-app/60">
                <span>Frecuencia:</span>
                <span className="font-semibold text-main">
                  {selectedHabitDetailModal.frequencyType === 'daily'
                    ? 'Diaria'
                    : selectedHabitDetailModal.frequencyType === 'specific_days'
                    ? 'Días específicos'
                    : `${selectedHabitDetailModal.timesPerWeek || 3} veces por semana`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-app/60">
                <span>Tipo de registro:</span>
                <span className="font-semibold text-main">
                  {selectedHabitDetailModal.type === 'boolean'
                    ? 'Sí / No (Tilde)'
                    : selectedHabitDetailModal.type === 'counter'
                    ? `Contador (meta: ${selectedHabitDetailModal.targetValue} ${selectedHabitDetailModal.targetUnit || ''})`
                    : `Duración (meta: ${selectedHabitDetailModal.targetValue} min)`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Cumplimiento este mes:</span>
                <span className="font-bold text-accent font-mono text-sm">
                  {habitMonthlyStats.stats[selectedHabitDetailModal.id]?.rate || 0}%
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedHabitDetailModal(null)}
              className="w-full py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
