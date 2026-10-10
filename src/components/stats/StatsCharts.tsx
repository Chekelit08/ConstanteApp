import React, { useState, useMemo } from 'react';
import { Habit, HabitLog } from '../../types/habit';
import {
  calculateHabitStreak,
  getDateRangeDays,
  calculateDayOfWeekPerformance,
  calculateCategoryPerformance,
  calculateWeeklyEvolution,
  generateInsights,
  calculateBadges,
  calculateHabitExpectedAndCompleted,
  getPeriodDescription,
  TimeRangeFilter,
} from '../../utils/statsCalculator';
import { getTodayDateString } from '../../utils/dateUtils';
import {
  Flame,
  Award,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart,
  LineChart,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface StatsChartsProps {
  habits: Habit[];
  logs: Record<string, HabitLog>;
}

export const StatsCharts: React.FC<StatsChartsProps> = ({ habits, logs }) => {
  const todayStr = getTodayDateString();
  const [rangeFilter, setRangeFilter] = useState<TimeRangeFilter>('month');

  const activeHabits = useMemo(
    () => habits.filter((h) => h.status !== 'archived'),
    [habits]
  );

  const daysInRange = useMemo(
    () => getDateRangeDays(rangeFilter, todayStr),
    [rangeFilter, todayStr]
  );

  const periodDescription = useMemo(
    () => getPeriodDescription(rangeFilter, todayStr),
    [rangeFilter, todayStr]
  );

  // Count how many days in the range actually have any logs or completions
  const daysWithDataCount = useMemo(() => {
    let count = 0;
    daysInRange.forEach((d) => {
      const log = logs[d];
      if (log && log.values && Object.keys(log.values).length > 0) {
        const hasAnyVal = Object.values(log.values).some((v) => v !== false && v !== 0 && v !== undefined);
        if (hasAnyVal) count++;
      }
    });
    return count;
  }, [daysInRange, logs]);

  // Streaks for all habits strictly up to today
  const streaks = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateHabitStreak>> = {};
    activeHabits.forEach((h) => {
      map[h.id] = calculateHabitStreak(h, logs, todayStr);
    });
    return map;
  }, [activeHabits, logs, todayStr]);

  // Day of week performance (strictly up to today)
  const dayOfWeekStats = useMemo(
    () => calculateDayOfWeekPerformance(activeHabits, logs, daysInRange),
    [activeHabits, logs, daysInRange]
  );

  // Category performance with coherent completed/expected
  const categoryStats = useMemo(
    () => calculateCategoryPerformance(activeHabits, logs, daysInRange),
    [activeHabits, logs, daysInRange]
  );

  // Weekly evolution (last 12 weeks) with period comparison
  const weeklyEvolutionData = useMemo(
    () => calculateWeeklyEvolution(activeHabits, logs, todayStr),
    [activeHabits, logs, todayStr]
  );

  // Coherent global totals in range up to today
  const globalSummary = useMemo(() => {
    let totalExpected = 0;
    let totalCompleted = 0;

    activeHabits.forEach((h) => {
      const res = calculateHabitExpectedAndCompleted(h, logs, daysInRange, todayStr);
      totalExpected += res.expected;
      totalCompleted += res.completed;
    });

    const rate = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
    return { expected: totalExpected, completed: totalCompleted, rate };
  }, [activeHabits, logs, daysInRange, todayStr]);

  // Insights
  const { insights, hasEnoughData: hasEnoughInsightsData } = useMemo(
    () => generateInsights(activeHabits, logs, streaks, dayOfWeekStats, categoryStats, daysWithDataCount),
    [activeHabits, logs, streaks, dayOfWeekStats, categoryStats, daysWithDataCount]
  );

  // Badges
  const badges = useMemo(
    () => calculateBadges(activeHabits, streaks, logs),
    [activeHabits, streaks, logs]
  );

  // Best habit and habit to reinforce (only shown if at least 3 days with data, handling ties separately)
  const habitPerformanceHighlights = useMemo(() => {
    if (daysWithDataCount < 3) return null;

    const list = activeHabits
      .map((h) => {
        const stats = calculateHabitExpectedAndCompleted(h, logs, daysInRange, todayStr);
        return {
          habit: h,
          ...stats,
        };
      })
      .filter((item) => item.expected > 0);

    if (list.length === 0) return null;

    const sorted = [...list].sort((a, b) => b.rate - a.rate);
    const maxRate = sorted[0].rate;
    const minRate = sorted[sorted.length - 1].rate;

    if (maxRate === minRate) {
      return { bestTies: [], toReinforceTies: [] };
    }

    const bestTies = maxRate > 0 ? sorted.filter((item) => item.rate === maxRate) : [];
    const toReinforceTies = minRate < 100 ? sorted.filter((item) => item.rate === minRate) : [];

    return { bestTies, toReinforceTies };
  }, [activeHabits, logs, daysInRange, todayStr, daysWithDataCount]);

  // Best active streak habit
  const topStreakHabit = useMemo(() => {
    if (daysWithDataCount === 0) return null;
    const sorted = Object.values(streaks)
      .filter((s) => s.currentStreak > 0)
      .sort((a, b) => b.currentStreak - a.currentStreak);
    const top = sorted[0];
    if (!top) return null;
    return {
      streak: top.currentStreak,
      habit: activeHabits.find((h) => h.id === top.habitId) || null,
    };
  }, [daysWithDataCount, streaks, activeHabits]);

  // SVG Line Path calculation for 12-week evolution chart
  const lineChartPoints = useMemo<{
    points: { x: number; y: number; rate: number; label: string }[];
    pathString: string;
  }>(() => {
    const weeks = weeklyEvolutionData.weeks;
    if (weeks.length === 0) return { points: [], pathString: '' };
    const width = 1000;
    const height = 140;
    const paddingX = 40;
    const paddingY = 20;

    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const points = weeks.map((w, idx) => {
      const x = paddingX + (idx / (weeks.length - 1)) * usableWidth;
      const y = height - paddingY - (w.rate / 100) * usableHeight;
      return { x, y, rate: w.rate, label: w.weekLabel };
    });

    const pathString = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    return { points, pathString };
  }, [weeklyEvolutionData]);

  return (
    <div className="space-y-8">
      {/* Time Range Filter Bar with Period Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted font-bold">
            MÉTRICAS & RENDIMIENTO
          </span>
          <h2 className="font-['Oswald'] text-3xl font-bold uppercase tracking-wider text-main mt-0.5">
            Estadísticas Globales
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-muted mt-1">
            <Info className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Período: <strong className="text-main font-medium">{periodDescription}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface-elevated rounded-xl p-1 border border-app self-start sm:self-auto">
          {[
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mes' },
            { id: 'quarter', label: 'Trimestre' },
            { id: 'year', label: 'Año' },
            { id: 'all', label: 'Histórico' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRangeFilter(tab.id as TimeRangeFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                rangeFilter === tab.id
                  ? 'bg-accent text-accent-contrast shadow-xs font-bold'
                  : 'text-muted hover:text-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Global rate and expected/completed */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cumplimiento Global</span>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-black text-main">
              {globalSummary.rate}%
            </span>
            <span className="text-xs text-muted font-mono font-medium">
              ({globalSummary.completed}/{globalSummary.expected} esperados)
            </span>
          </div>
          <p className="text-[11px] text-muted mt-1">
            Calculado solo en días programados desde el inicio de cada hábito hasta hoy.
          </p>
        </div>

        {/* Best active streak */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Mayor Racha Actual</span>
            <Flame className="w-4 h-4 text-accent" />
          </div>
          {topStreakHabit && topStreakHabit.habit ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-black text-accent">
                  {topStreakHabit.streak}
                </span>
                <span className="text-xs text-muted">
                  {topStreakHabit.streak === 1 ? 'día seguido' : 'días seguidos'}
                </span>
              </div>
              <p className="text-xs font-medium text-main truncate mt-1">
                {topStreakHabit.habit.emoji} {topStreakHabit.habit.name}
              </p>
            </div>
          ) : (
            <div>
              <span className="font-mono text-3xl font-bold text-muted">0 días</span>
              <p className="text-xs text-muted mt-1">
                {daysWithDataCount === 0
                  ? 'Registrá hábitos para activar rachas.'
                  : 'Sin racha activa hoy.'}
              </p>
            </div>
          )}
        </div>

        {/* Total Active Habits */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Hábitos en Seguimiento</span>
            <BarChart className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-black text-main">
              {activeHabits.length}
            </span>
            <span className="text-xs text-muted">activos</span>
          </div>
          <p className="text-[11px] text-muted mt-1">
            {daysWithDataCount} {daysWithDataCount === 1 ? 'día con registro' : 'días con registros'} en el período.
          </p>
        </div>
      </div>

      {/* BEST HABIT & REINFORCE HABIT CARDS (CONDITIONAL >= 3 DAYS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mejor hábito */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-accent">
            <CheckCircle className="w-4 h-4" />
            <span>Mejor Hábito del Período</span>
          </div>
          {habitPerformanceHighlights && habitPerformanceHighlights.bestTies.length > 0 ? (
            <div>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {habitPerformanceHighlights.bestTies.length > 1 ? (
                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded-md bg-accent-subtle text-accent">
                      Empate ({habitPerformanceHighlights.bestTies.length})
                    </span>
                  ) : null}
                  <span className="font-bold text-sm text-main">
                    {habitPerformanceHighlights.bestTies.map((b) => `${b.habit.emoji} ${b.habit.name}`).join(' · ')}
                  </span>
                </div>
                <span className="font-mono text-lg font-black text-accent ml-2 shrink-0">
                  {habitPerformanceHighlights.bestTies[0].rate}%
                </span>
              </div>
              <p className="text-xs text-muted font-mono mt-1">
                {habitPerformanceHighlights.bestTies.length === 1
                  ? `Cumplidos: ${habitPerformanceHighlights.bestTies[0].completed} de ${habitPerformanceHighlights.bestTies[0].expected} previstos`
                  : `Rendimiento máximo idéntico en ${habitPerformanceHighlights.bestTies.length} hábitos`}
              </p>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-xs text-muted">
                {daysWithDataCount < 3
                  ? 'Todavía no hay suficientes registros (se requieren al menos 3 días con datos).'
                  : 'Todavía no hay suficientes registros con diferencias para destacar.'}
              </p>
            </div>
          )}
        </div>

        {/* Hábito a reforzar */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-muted">
            <AlertCircle className="w-4 h-4 text-muted" />
            <span>Hábito a Reforzar</span>
          </div>
          {habitPerformanceHighlights && habitPerformanceHighlights.toReinforceTies.length > 0 ? (
            <div>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {habitPerformanceHighlights.toReinforceTies.length > 1 ? (
                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded-md bg-surface-muted text-muted">
                      Empate ({habitPerformanceHighlights.toReinforceTies.length})
                    </span>
                  ) : null}
                  <span className="font-bold text-sm text-main">
                    {habitPerformanceHighlights.toReinforceTies.map((b) => `${b.habit.emoji} ${b.habit.name}`).join(' · ')}
                  </span>
                </div>
                <span className="font-mono text-lg font-black text-main ml-2 shrink-0">
                  {habitPerformanceHighlights.toReinforceTies[0].rate}%
                </span>
              </div>
              <p className="text-xs text-muted font-mono mt-1">
                {habitPerformanceHighlights.toReinforceTies.length === 1
                  ? `Cumplidos: ${habitPerformanceHighlights.toReinforceTies[0].completed} de ${habitPerformanceHighlights.toReinforceTies[0].expected} previstos`
                  : `Rendimiento a reforzar en ${habitPerformanceHighlights.toReinforceTies.length} hábitos`}
              </p>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-xs text-muted">
                {daysWithDataCount < 3
                  ? 'Todavía no hay suficientes registros (se requieren al menos 3 días con datos).'
                  : 'Todavía no hay suficientes registros con diferencias para reforzar.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AUTOMATIC INSIGHTS BOX */}
      <div className="p-6 rounded-3xl bg-surface-elevated border border-app shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-accent">
          <Sparkles className="w-4 h-4" />
          <span>Insights Editoriales de Rendimiento</span>
        </div>
        <div className="space-y-2">
          {hasEnoughInsightsData && insights.length > 0 ? (
            insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-sm text-main leading-relaxed">
                <span className="text-accent font-bold">•</span>
                <p
                  dangerouslySetInnerHTML={{
                    __html: insight.replace(
                      /\*\*(.*?)\*\*/g,
                      '<strong class="text-main font-bold">$1</strong>'
                    ),
                  }}
                />
              </div>
            ))
          ) : (
            <p className="text-xs text-muted">
              {daysWithDataCount < 3
                ? 'Comenzá a marcar tus hábitos día a día (mínimo 3 días) para desbloquear insights personalizados de tu rutina.'
                : 'Registrá tus hábitos de forma continua para recibir observaciones y patrones de conducta.'}
            </p>
          )}
        </div>
      </div>

      {/* EVOLUCIÓN SEMANAL (12 SEMANAS CON GRÁFICO DE LÍNEA Y COMPARACIÓN) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main flex items-center gap-2">
              <LineChart className="w-5 h-5 text-accent" />
              <span>Evolución del Cumplimiento (Últimas 12 Semanas)</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Curva de adherencia calculada estrictamente hasta hoy según las frecuencias programadas.
            </p>
          </div>

          {/* Period comparison badge with '—' when no previous period data */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-elevated border border-app text-xs font-semibold">
            {weeklyEvolutionData.hasPreviousData ? (
              <>
                {weeklyEvolutionData.diff >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-accent" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-muted" />
                )}
                <span className="text-main">
                  {weeklyEvolutionData.diff >= 0
                    ? `+${weeklyEvolutionData.diff}%`
                    : `${weeklyEvolutionData.diff}%`}{' '}
                  <span className="text-muted font-normal">vs 12 semanas previas</span>
                </span>
              </>
            ) : (
              <span className="text-muted">
                Tendencia previa: <strong className="font-mono text-main">—</strong> (sin historial anterior)
              </span>
            )}
          </div>
        </div>

        {/* SVG Line Chart */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[500px]">
            <svg viewBox="0 0 1000 160" className="w-full h-40 overflow-visible">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid horizontal guidelines */}
              {[0, 25, 50, 75, 100].map((tick) => {
                const y = 140 - 20 - (tick / 100) * 100;
                return (
                  <g key={tick}>
                    <line
                      x1="40"
                      y1={y}
                      x2="960"
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x="25"
                      y={y + 3}
                      fill="var(--text-dim)"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* Area under curve */}
              {lineChartPoints.points && lineChartPoints.points.length > 0 && (
                <path
                  d={`${lineChartPoints.pathString} L 960 120 L 40 120 Z`}
                  fill="url(#lineGrad)"
                />
              )}

              {/* Smooth trend curve */}
              {lineChartPoints.pathString && (
                <path
                  d={lineChartPoints.pathString}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Point markers */}
              {lineChartPoints.points &&
                lineChartPoints.points.map((pt, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill="var(--bg-surface)"
                      stroke="var(--color-accent)"
                      strokeWidth="2.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      fill="var(--text-main)"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {pt.rate}%
                    </text>
                    <text
                      x={pt.x}
                      y="150"
                      fill="var(--text-dim)"
                      fontSize="8.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {pt.label.split(' ')[1]}
                    </text>
                  </g>
                ))}
            </svg>
          </div>
        </div>
      </div>

      {/* CHARTS GRID: DÍA DE LA SEMANA + CATEGORÍAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week Performance */}
        <div className="p-6 rounded-3xl bg-surface border border-app space-y-4">
          <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
            Rendimiento por Día de la Semana
          </h3>
          <p className="text-xs text-muted -mt-2">
            ¿En qué días de la semana sos más constante?
          </p>

          <div className="space-y-2.5 pt-2">
            {dayOfWeekStats.map((item) => (
              <div key={item.dayIndex} className="flex items-center gap-3">
                <span className="w-20 text-xs font-semibold text-main">
                  {item.dayName}
                </span>
                <div className="flex-1 bg-surface-elevated h-6 rounded-lg overflow-hidden flex items-center p-1">
                  <div
                    className="h-full rounded-md transition-all duration-500 bg-accent"
                    style={{
                      width: `${Math.max(item.rate > 0 ? 6 : 0, item.rate)}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-right font-mono text-xs font-bold text-main">
                  {item.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 rounded-3xl bg-surface border border-app space-y-4">
          <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
            Cumplimiento por Categoría
          </h3>
          <p className="text-xs text-muted -mt-2">
            Distribución coherente de efectividad en cada área (cumplidos / esperados).
          </p>

          <div className="space-y-3 pt-2">
            {categoryStats.length === 0 ? (
              <p className="text-xs text-muted italic py-6 text-center">
                Sin datos suficientes en el período seleccionado.
              </p>
            ) : (
              categoryStats.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-main">{cat.category}</span>
                    <span className="font-mono text-muted">
                      {cat.rate}% ({cat.completed}/{cat.scheduled})
                    </span>
                  </div>
                  <div className="w-full bg-surface-elevated h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-accent"
                      style={{ width: `${cat.rate}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RACHAS POR HÁBITO TABLE */}
      <div className="p-6 rounded-3xl bg-surface border border-app space-y-4">
        <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
          Rachas y Efectividad por Hábito
        </h3>
        <p className="text-xs text-muted -mt-2">
          Totales coherentes de cumplidos y esperados calculados desde la fecha de inicio de cada hábito hasta hoy.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-app text-muted font-mono font-bold uppercase">
                <th className="py-2.5 px-3">Hábito</th>
                <th className="py-2.5 px-3">Categoría</th>
                <th className="py-2.5 px-3 text-center">Racha Actual</th>
                <th className="py-2.5 px-3 text-center">Mejor Racha</th>
                <th className="py-2.5 px-3 text-center">Cumplidos / Esperados</th>
                <th className="py-2.5 px-3 text-center">% Período</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app font-medium">
              {activeHabits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted italic">
                    Sin hábitos activos actualmente.
                  </td>
                </tr>
              ) : (
                activeHabits.map((h) => {
                  const s = streaks[h.id] || { currentStreak: 0, bestStreak: 0, completionRate: 0 };
                  const inRange = calculateHabitExpectedAndCompleted(h, logs, daysInRange, todayStr);
                  return (
                    <tr key={h.id} className="hover:bg-surface-elevated/40">
                      <td className="py-3 px-3 flex items-center gap-2">
                        <span className="text-lg">{h.emoji}</span>
                        <span className="font-bold text-main">{h.name}</span>
                      </td>
                      <td className="py-3 px-3 text-muted">{h.category}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-accent">
                        {s.currentStreak > 0 ? `🔥 ${s.currentStreak} d` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-muted">
                        {s.bestStreak > 0 ? `⭐ ${s.bestStreak} d` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-muted">
                        {inRange.completed} / {inRange.expected}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-main">
                        {inRange.rate}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOGROS E INSIGNIAS CON DÍAS RESTANTES */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-accent" />
          <h3 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wider text-main">
            Insignias & Logros de Disciplina
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-between transition ${
                b.isUnlocked
                  ? 'border-accent bg-accent-subtle/30 shadow-xs'
                  : 'border-app bg-surface-elevated opacity-50'
              }`}
            >
              <span className="text-3xl mb-2 select-none">{b.icon}</span>
              <h4 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-main">
                {b.title}
              </h4>
              <p className="text-[11px] text-muted mt-1 leading-snug">
                {b.description}
              </p>
              <span
                className={`mt-3 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  b.isUnlocked
                    ? 'bg-accent text-accent-contrast font-black'
                    : 'bg-surface text-muted'
                }`}
              >
                {b.isUnlocked
                  ? 'Desbloqueado'
                  : b.daysRemaining && b.daysRemaining > 0
                  ? `Faltan ${b.daysRemaining} d`
                  : b.progressText}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
