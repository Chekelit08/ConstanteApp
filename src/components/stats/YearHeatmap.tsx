import React, { useState, useMemo } from 'react';
import { Habit, HabitLog } from '../../types/habit';
import {
  getTodayDateString,
  addDays,
  parseDateString,
  formatArgentineDate,
  MONTH_NAMES,
  getMondayIndexedDay,
} from '../../utils/dateUtils';
import { calculateHabitExpectedAndCompleted } from '../../utils/statsCalculator';
import { Filter, X, Calendar } from 'lucide-react';

interface YearHeatmapProps {
  habits: Habit[];
  logs: Record<string, HabitLog>;
  onSelectDate?: (dateStr: string) => void;
}

export const YearHeatmap: React.FC<YearHeatmapProps> = ({
  habits,
  logs,
  onSelectDate,
}) => {
  const todayStr = getTodayDateString();
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    rate: number;
    completed: number;
    scheduled: number;
    x: number;
    y: number;
  } | null>(null);

  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    date: string;
    completed: number;
    scheduled: number;
    rate: number;
    habitNames: string[];
  } | null>(null);

  // Generate weeks aligned with Monday (0) to Sunday (6)
  const weeks = useMemo(() => {
    const todayDate = parseDateString(todayStr);
    const todayDayOfWeek = getMondayIndexedDay(todayDate); // 0=Mon, 6=Sun
    // Go back 52 full weeks (364 days) + current week offset to ensure the first day is a Monday
    // This accurately covers leap years and complete calendar cycles
    const startMondayStr = addDays(todayStr, -(52 * 7 + todayDayOfWeek));

    const res: string[][] = [];
    let currentWeek: string[] = [];
    let d = 0;
    while (true) {
      const dateStr = addDays(startMondayStr, d);
      currentWeek.push(dateStr);
      if (currentWeek.length === 7) {
        res.push(currentWeek);
        currentWeek = [];
        if (dateStr >= todayStr) break;
      }
      d++;
    }

    return res;
  }, [todayStr]);

  // Month labels across the weeks with 3-letter names (Oct, Nov, Dic...)
  // and including the year when the year changes (e.g. "Dic", "Ene '26")
  const monthLabels = useMemo(() => {
    const labels: { index: number; name: string }[] = [];
    let lastMonth = -1;
    let lastYear = -1;

    weeks.forEach((week, wIdx) => {
      if (week.length > 0) {
        const date = parseDateString(week[0]);
        const m = date.getMonth();
        const y = date.getFullYear();

        if (m !== lastMonth) {
          const shortMonth = MONTH_NAMES[m].slice(0, 3);
          const nameWithYear = lastYear !== -1 && y !== lastYear
            ? `${shortMonth} '${String(y).slice(-2)}`
            : shortMonth;

          labels.push({ index: wIdx, name: nameWithYear });
          lastMonth = m;
          lastYear = y;
        }
      }
    });

    return labels;
  }, [weeks]);

  // Day calculations strictly up to today
  const getDayData = (dateStr: string) => {
    let completed = 0;
    let scheduled = 0;
    const completedNames: string[] = [];

    const habitsToEvaluate =
      selectedHabitId === 'all'
        ? habits.filter((h) => h.status !== 'archived')
        : habits.filter((h) => h.id === selectedHabitId);

    habitsToEvaluate.forEach((h) => {
      const res = calculateHabitExpectedAndCompleted(h, logs, [dateStr], todayStr);
      scheduled += res.expected;
      completed += res.completed;
      if (res.completed > 0) {
        completedNames.push(h.name);
      }
    });

    const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
    return { completed, scheduled, rate, completedNames };
  };

  const getCellClass = (rate: number, isFuture: boolean) => {
    if (isFuture) return 'bg-transparent border border-dashed border-app opacity-30';
    if (rate === 0) return 'bg-surface-elevated';
    if (rate < 30) return 'opacity-30 bg-accent';
    if (rate < 70) return 'opacity-60 bg-accent';
    if (rate < 100) return 'opacity-85 bg-accent';
    return 'opacity-100 bg-accent shadow-2xs';
  };

  return (
    <div className="rounded-3xl bg-surface border border-app p-6 sm:p-8 space-y-6 shadow-xs relative">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted font-bold">
            HISTÓRICO ANUAL (365 DÍAS)
          </span>
          <h3 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-wider text-main mt-0.5">
            Mapa de Calor Anual
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Visualización de consistencia diaria. Pasá el mouse o tocá cualquier celda para ver fecha y porcentaje.
          </p>
        </div>

        {/* Filter by habit selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted" />
          <select
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-app bg-surface-elevated text-xs font-semibold text-main focus:outline-hidden cursor-pointer"
          >
            <option value="all">Todos los hábitos combinados</option>
            {habits
              .filter((h) => h.status !== 'archived')
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.emoji} {h.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Heatmap Container with Month Labels & Day Labels */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-block min-w-[860px]">
          {/* Month labels header with 3-letter labels (no truncate) */}
          <div className="relative h-5 pl-7 mb-2 text-[11px] font-mono font-bold text-main">
            {monthLabels.map((lbl) => (
              <span
                key={lbl.index}
                className="absolute whitespace-nowrap"
                style={{ left: `${28 + lbl.index * 16}px` }}
              >
                {lbl.name}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Day of week labels on left (L, M, M, J, V, S, D) */}
            <div className="flex flex-col justify-between text-[10px] font-mono font-bold text-muted w-5 py-0.5 select-none text-center">
              <span>L</span>
              <span>M</span>
              <span>M</span>
              <span>J</span>
              <span>V</span>
              <span>S</span>
              <span>D</span>
            </div>

            {/* 52 Columns */}
            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((dateStr) => {
                    const isFuture = dateStr > todayStr;
                    const data = getDayData(dateStr);
                    const isToday = dateStr === todayStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          if (!isFuture) {
                            setSelectedDayDetail({
                              date: dateStr,
                              completed: data.completed,
                              scheduled: data.scheduled,
                              rate: data.rate,
                              habitNames: data.completedNames,
                            });
                            if (onSelectDate) onSelectDate(dateStr);
                          }
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            date: dateStr,
                            rate: data.rate,
                            completed: data.completed,
                            scheduled: data.scheduled,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-4 h-4 sm:w-3.5 sm:h-3.5 rounded-xs transition-transform hover:scale-125 cursor-pointer relative shrink-0 ${getCellClass(
                          data.rate,
                          isFuture
                        )} ${isToday ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                        aria-label={`${dateStr}: ${data.rate}%`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted pt-4 mt-3 border-t border-app">
          <span>Menos constante</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-surface-elevated" />
            <span className="w-3.5 h-3.5 rounded-xs opacity-30 bg-accent" />
            <span className="w-3.5 h-3.5 rounded-xs opacity-60 bg-accent" />
            <span className="w-3.5 h-3.5 rounded-xs opacity-85 bg-accent" />
            <span className="w-3.5 h-3.5 rounded-xs opacity-100 bg-accent" />
          </div>
          <span>100% Cumplido</span>
        </div>
      </div>

      {/* Floating Hover Tooltip with Date and Rate */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-xl bg-surface border border-app text-main text-xs shadow-lg font-mono -mt-2 animate-in fade-in flex flex-col items-center gap-0.5"
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
        >
          <span className="font-bold text-accent">
            {hoveredDay.date} · {hoveredDay.rate}%
          </span>
          <span className="text-[10px] text-muted">
            {hoveredDay.completed} de {hoveredDay.scheduled} cumplidos
          </span>
        </div>
      )}

      {/* Selected Day Detail Modal / Banner */}
      {selectedDayDetail && (
        <div className="p-4 rounded-2xl bg-surface-elevated border border-app space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              <h4 className="font-['Oswald'] text-base font-bold uppercase tracking-wider text-main">
                Detalle del {formatArgentineDate(selectedDayDetail.date, { includeDayName: true })}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDayDetail(null)}
              className="p-1 rounded-lg text-muted hover:text-main hover:bg-surface cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-baseline gap-3 text-xs">
            <span className="font-mono text-2xl font-black text-accent">
              {selectedDayDetail.rate}%
            </span>
            <span className="text-muted">
              ({selectedDayDetail.completed} de {selectedDayDetail.scheduled} hábitos previstos)
            </span>
          </div>

          {selectedDayDetail.habitNames.length > 0 ? (
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase text-muted font-bold">
                Hábitos cumplidos en esta fecha:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedDayDetail.habitNames.map((name, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-accent-subtle text-accent text-xs font-semibold"
                  >
                    ✓ {name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted italic">
              No hubo hábitos registrados para este día.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
