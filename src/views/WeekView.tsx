import React, { useState, useMemo } from 'react';
import { Habit, HabitLog, HabitValue } from '../types/habit';
import {
  getWeekDays,
  getTodayDateString,
  addDays,
  formatArgentineDate,
  parseDateString,
  DAY_NAMES_SHORT,
  getMondayIndexedDay,
} from '../utils/dateUtils';
import { isHabitScheduledOnDate, isHabitCompleted, getHabitProgress } from '../services/dataStorage';
import { ValuePopover } from '../components/habits/ValuePopover';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Award,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface WeekViewProps {
  habits: Habit[];
  logs: Record<string, HabitLog>;
  onToggleHabit: (habitId: string, dateStr: string) => void;
  onSetHabitValue: (habitId: string, dateStr: string, val: HabitValue) => void;
  onSwitchToMonth?: () => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  habits,
  logs,
  onToggleHabit,
  onSetHabitValue,
  onSwitchToMonth,
}) => {
  const todayStr = getTodayDateString();
  const [currentDateStr, setCurrentDateStr] = useState<string>(todayStr);

  const [activePopover, setActivePopover] = useState<{
    habit: Habit;
    dateStr: string;
    currentVal: HabitValue | undefined;
  } | null>(null);

  const weekDays = useMemo(() => getWeekDays(currentDateStr), [currentDateStr]);
  const prevWeekDays = useMemo(() => getWeekDays(addDays(currentDateStr, -7)), [currentDateStr]);

  const activeHabits = useMemo(
    () => habits.filter((h) => h.status !== 'archived'),
    [habits]
  );

  const prevWeek = () => setCurrentDateStr(addDays(currentDateStr, -7));
  const nextWeek = () => setCurrentDateStr(addDays(currentDateStr, 7));

  // Count days with logged habits in this week
  const daysWithDataCount = useMemo(() => {
    let count = 0;
    weekDays.forEach((d) => {
      if (d <= todayStr && logs[d]?.values && Object.values(logs[d].values).some((v) => v !== false && v !== 0 && v !== undefined)) {
        count++;
      }
    });
    return count;
  }, [weekDays, logs, todayStr]);

  // Current week stats strictly up to today
  const currentWeekStats = useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    let perfectDays = 0;

    const habitCompletions: Record<string, { completed: number; scheduled: number; name: string }> = {};

    weekDays.forEach((d) => {
      if (d > todayStr) return;

      let dayCompleted = 0;
      let dayScheduled = 0;

      activeHabits.forEach((h) => {
        if (!habitCompletions[h.id]) {
          habitCompletions[h.id] = { completed: 0, scheduled: 0, name: h.name };
        }

        if (isHabitScheduledOnDate(h, d)) {
          scheduled++;
          dayScheduled++;
          habitCompletions[h.id].scheduled++;

          if (isHabitCompleted(h, logs[d]?.values?.[h.id])) {
            completed++;
            dayCompleted++;
            habitCompletions[h.id].completed++;
          }
        }
      });

      if (dayScheduled > 0 && dayCompleted === dayScheduled) {
        perfectDays++;
      }
    });

    const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

    const rankedHabits = Object.values(habitCompletions)
      .filter((h) => h.scheduled > 0)
      .map((h) => ({
        ...h,
        rate: Math.round((h.completed / h.scheduled) * 100),
      }))
      .sort((a, b) => b.rate - a.rate);

    let bestHabit: { name: string; rate: number } | null = null;
    let worstHabit: { name: string; rate: number } | null = null;

    // Strictly at least 3 days with data before picking best or to-reinforce habit
    if (daysWithDataCount >= 3 && rankedHabits.length > 0) {
      const maxRate = rankedHabits[0].rate;
      const minRate = rankedHabits[rankedHabits.length - 1].rate;
      // If tie across all habits, do not pick either
      if (maxRate !== minRate) {
        if (maxRate > 0) bestHabit = rankedHabits[0];
        if (rankedHabits.length > 1 && minRate < 70) worstHabit = rankedHabits[rankedHabits.length - 1];
      }
    }

    return { rate, completed, scheduled, perfectDays, bestHabit, worstHabit };
  }, [weekDays, activeHabits, logs, todayStr, daysWithDataCount]);

  // Previous week rate strictly up to today
  const { prevWeekRate, prevWeekHasData } = useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    let hasData = false;

    prevWeekDays.forEach((d) => {
      if (d > todayStr) return;

      if (logs[d]?.values && Object.values(logs[d].values).some((v) => v !== false && v !== 0 && v !== undefined)) {
        hasData = true;
      }

      activeHabits.forEach((h) => {
        if (isHabitScheduledOnDate(h, d)) {
          scheduled++;
          if (isHabitCompleted(h, logs[d]?.values?.[h.id])) {
            completed++;
          }
        }
      });
    });

    const rate = scheduled > 0 && hasData ? Math.round((completed / scheduled) * 100) : 0;
    return { prevWeekRate: rate, prevWeekHasData: hasData };
  }, [prevWeekDays, activeHabits, logs, todayStr]);

  const diffRate = prevWeekHasData ? currentWeekStats.rate - prevWeekRate : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
              PANEL SEMANAL
            </span>
            {onSwitchToMonth && (
              <button
                type="button"
                onClick={onSwitchToMonth}
                className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer ml-2"
              >
                <span>Ver Mes</span>
                <span>→</span>
              </button>
            )}
          </div>
          <h2 className="font-['Oswald'] text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wider text-main mt-0.5 clamp-title truncate">
            Semana del {formatArgentineDate(weekDays[0])} al {formatArgentineDate(weekDays[6])}
          </h2>
        </div>

        {/* Clear Prominent Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-surface-elevated rounded-xl p-1 border border-app">
            <button
              type="button"
              onClick={prevWeek}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-main hover:bg-surface transition cursor-pointer min-h-[44px]"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentDateStr(todayStr)}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-main hover:bg-surface rounded-lg transition min-h-[44px] cursor-pointer"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={nextWeek}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-main hover:bg-surface transition cursor-pointer min-h-[44px]"
              aria-label="Semana siguiente"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Compliance */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Cumplimiento Semanal</span>
            {diffRate === null ? (
              <span className="text-xs font-bold text-muted font-mono">—</span>
            ) : diffRate >= 0 ? (
              <span className="flex items-center text-xs font-bold text-accent">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{diffRate}%
              </span>
            ) : (
              <span className="flex items-center text-xs font-bold text-muted">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {diffRate}%
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black text-main">
              {currentWeekStats.rate}%
            </span>
            <span className="text-xs text-muted">
              {prevWeekHasData ? `vs ${prevWeekRate}% sem. anterior` : 'sin período previo'}
            </span>
          </div>
        </div>

        {/* Perfect days */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Días Perfectos</span>
            <Award className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black text-main">
              {currentWeekStats.perfectDays} / 7
            </span>
            <span className="text-xs text-muted">con 100% de hábitos</span>
          </div>
        </div>

        {/* Highlights */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
            Mejor Hábito
          </span>
          {currentWeekStats.bestHabit ? (
            <p className="text-sm font-bold text-main truncate">
              {currentWeekStats.bestHabit.name} ({currentWeekStats.bestHabit.rate}%)
            </p>
          ) : (
            <p className="text-xs text-muted">
              Todavía no hay suficientes registros
            </p>
          )}

          {currentWeekStats.worstHabit && (
            <p className="text-[11px] text-muted truncate mt-1">
              A reforzar: {currentWeekStats.worstHabit.name} ({currentWeekStats.worstHabit.rate}%)
            </p>
          )}
        </div>
      </div>

      {/* 7-COLUMN TABLE (CELLS AT LEAST 44px) */}
      <div className="rounded-2xl border border-app bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-surface-elevated border-b border-app">
                <th scope="col" className="py-3 px-4 min-w-[170px] font-['Oswald'] font-bold uppercase tracking-wider text-muted">
                  Hábito
                </th>
                {weekDays.map((dateStr) => {
                  const date = parseDateString(dateStr);
                  const dow = getMondayIndexedDay(date);
                  const isToday = dateStr === todayStr;

                  return (
                    <th
                      scope="col"
                      key={dateStr}
                      className={`py-2 px-1 text-center font-mono border-l border-app min-w-[50px] ${
                        isToday ? 'bg-accent-subtle text-accent font-bold' : 'text-muted'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold">
                        {DAY_NAMES_SHORT[dow]}
                      </div>
                      <div className="text-sm font-bold">{date.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {activeHabits.map((habit) => (
                <tr key={habit.id} className="hover:bg-surface-elevated/40">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: habit.color || 'var(--color-accent)' }}
                      />
                      <span className="text-base">{habit.emoji}</span>
                      <span className="font-semibold text-main text-xs truncate max-w-[130px] sm:max-w-none">
                        {habit.name}
                      </span>
                    </div>
                  </td>

                  {weekDays.map((dateStr) => {
                    const isScheduled = isHabitScheduledOnDate(habit, dateStr);
                    const isToday = dateStr === todayStr;
                    const val = logs[dateStr]?.values?.[habit.id];
                    const completed = isHabitCompleted(habit, val);
                    const progress = getHabitProgress(habit, val);

                    if (!isScheduled) {
                      return (
                        <td
                          key={dateStr}
                          className="border-l border-app text-center bg-surface-muted/30 min-w-[44px]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-muted inline-block opacity-40" />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={dateStr}
                        className={`border-l border-app text-center p-1.5 min-w-[44px] ${
                          isToday ? 'bg-accent-subtle/30' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (habit.type === 'boolean') {
                              onToggleHabit(habit.id, dateStr);
                            } else {
                              setActivePopover({
                                habit,
                                dateStr,
                                currentVal: val,
                              });
                            }
                          }}
                          aria-label={`${habit.name}, ${formatArgentineDate(dateStr)}, ${completed ? 'cumplido' : 'no cumplido'}`}
                          aria-pressed={completed}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                            completed
                              ? 'bg-accent text-accent-contrast shadow-xs'
                              : 'border border-app hover:border-accent bg-surface'
                          }`}
                        >
                          {!completed && progress > 0 && (
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-accent-subtle"
                              style={{ height: `${Math.round(progress * 100)}%` }}
                            />
                          )}

                          {completed ? (
                            <Check className="w-5 h-5 stroke-[3]" />
                          ) : progress > 0 ? (
                            <span className="text-xs font-mono font-bold z-10 text-main">{val}</span>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popover for numerical / duration input */}
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
    </div>
  );
};
