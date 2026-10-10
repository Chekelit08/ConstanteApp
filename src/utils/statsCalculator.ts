import { Habit, HabitLog } from '../types/habit';
import { isHabitScheduledOnDate, isHabitCompleted } from '../services/dataStorage';
import {
  getTodayDateString,
  addDays,
  parseDateString,
  getMondayIndexedDay,
  getDaysInMonth,
  DAY_NAMES_FULL,
} from './dateUtils';
import { HabitStreak, AchievementBadge } from '../types/stats';

export type TimeRangeFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

/**
 * Helper: get effective start date of a habit (startDate or createdAt or earliest known date)
 */
export function getHabitEffectiveStartDate(habit: Habit): string {
  if (habit.startDate && habit.startDate.trim()) {
    return habit.startDate.slice(0, 10);
  }
  if (habit.createdAt && habit.createdAt.trim()) {
    return habit.createdAt.slice(0, 10);
  }
  return '2020-01-01';
}

/**
 * Calculates expected and completed counts for a single habit in a given array of date strings.
 * Rules:
 * 1. Counts ONLY from the habit's start date / creation date up to today.
 * 2. Never counts future days (dateStr > todayStr).
 * 3. Never counts days before habit existed (dateStr < habitStartDate).
 * 4. Frequency handling:
 *    - 'daily': expected = 1 for each day in range where habit is scheduled.
 *    - 'specific_days': expected = 1 for each day matching habit.specificDays.
 *    - 'times_per_week': For each week (Monday to Sunday) overlapping the range:
 *      expected = Math.min(timesPerWeek, elapsedDaysInThisWeekThatAreInRange)
 *      completed = Math.min(timesPerWeek, actualCompletionsInThisWeekInRange)
 */
export function calculateHabitExpectedAndCompleted(
  habit: Habit,
  logs: Record<string, HabitLog>,
  dateRange: string[],
  todayStr: string = getTodayDateString()
): { expected: number; completed: number; rate: number } {
  if (habit.status === 'archived') {
    return { expected: 0, completed: 0, rate: 0 };
  }

  const habitStartDate = getHabitEffectiveStartDate(habit);

  // Filter only eligible days for this habit:
  // Must be within dateRange, >= habitStartDate, and <= todayStr
  const eligibleDays = dateRange.filter((d) => {
    if (d > todayStr) return false;
    if (d < habitStartDate) return false;
    if (habit.endDate && d > habit.endDate) return false;
    return true;
  });

  if (eligibleDays.length === 0) {
    return { expected: 0, completed: 0, rate: 0 };
  }

  if (habit.frequencyType === 'times_per_week') {
    const targetPerWeek = Math.max(1, habit.timesPerWeek || 3);
    // Group eligible days by their Monday-Sunday calendar week
    const weekGroups: Record<string, string[]> = {};
    eligibleDays.forEach((d) => {
      const date = parseDateString(d);
      const dow = getMondayIndexedDay(date); // 0 = Mon
      const mondayStr = addDays(d, -dow);
      if (!weekGroups[mondayStr]) weekGroups[mondayStr] = [];
      weekGroups[mondayStr].push(d);
    });

    let totalExpected = 0;
    let totalCompleted = 0;

    Object.values(weekGroups).forEach((weekDays) => {
      // Days elapsed in this week that are in range and active
      const daysCount = weekDays.length;
      // Expected is proportional to elapsed days with cap at targetPerWeek
      const weekExpected = Math.min(targetPerWeek, daysCount);
      totalExpected += weekExpected;

      // Count completions in this week
      let weekCompletions = 0;
      weekDays.forEach((d) => {
        if (isHabitCompleted(habit, logs[d]?.values?.[habit.id])) {
          weekCompletions++;
        }
      });
      // Cap at targetPerWeek so excess doesn't artificially skew percentages
      totalCompleted += Math.min(targetPerWeek, weekCompletions);
    });

    const rate = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
    return { expected: totalExpected, completed: totalCompleted, rate };
  }

  // Daily or specific days
  let expected = 0;
  let completed = 0;

  eligibleDays.forEach((d) => {
    if (isHabitScheduledOnDate(habit, d)) {
      expected++;
      if (isHabitCompleted(habit, logs[d]?.values?.[habit.id])) {
        completed++;
      }
    }
  });

  const rate = expected > 0 ? Math.round((completed / expected) * 100) : 0;
  return { expected, completed, rate };
}

/**
 * Calculates current streak and best streak strictly up to today and respecting start date
 */
export function calculateHabitStreak(
  habit: Habit,
  logs: Record<string, HabitLog>,
  todayStr: string = getTodayDateString()
): HabitStreak {
  let currentStreak = 0;
  let bestStreak = 0;
  let runningStreak = 0;

  const habitStartDate = getHabitEffectiveStartDate(habit);
  const checkDays = 365;

  // For current streak: check backwards from today or yesterday
  const todayScheduled = isHabitScheduledOnDate(habit, todayStr) && todayStr >= habitStartDate;
  const todayCompleted = todayScheduled && isHabitCompleted(habit, logs[todayStr]?.values?.[habit.id]);

  let pointerDate = todayStr;
  if (!todayCompleted) {
    pointerDate = addDays(todayStr, -1);
  }

  // Count backwards for current streak
  for (let i = 0; i < checkDays; i++) {
    const curDate = addDays(pointerDate, -i);
    if (curDate < habitStartDate) break; // Before habit existed
    if (!isHabitScheduledOnDate(habit, curDate)) {
      continue; // Skip unscheduled days without breaking streak
    }
    const completed = isHabitCompleted(habit, logs[curDate]?.values?.[habit.id]);
    if (completed) {
      currentStreak++;
    } else {
      break;
    }
  }

  if (todayCompleted && pointerDate !== todayStr) {
    currentStreak++;
  }

  // Calculate best streak chronologically from habitStartDate up to today
  const earliestDate = habitStartDate > addDays(todayStr, -checkDays) ? habitStartDate : addDays(todayStr, -checkDays);
  
  // Calculate difference in days
  let curPointer = earliestDate;
  while (curPointer <= todayStr) {
    if (isHabitScheduledOnDate(habit, curPointer)) {
      const completed = isHabitCompleted(habit, logs[curPointer]?.values?.[habit.id]);
      if (completed) {
        runningStreak++;
        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }
    curPointer = addDays(curPointer, 1);
  }

  // Calculate total completions and rate in the last 365 days
  const pastYearDays: string[] = [];
  let d = earliestDate;
  while (d <= todayStr) {
    pastYearDays.push(d);
    d = addDays(d, 1);
  }

  const { expected, completed } = calculateHabitExpectedAndCompleted(habit, logs, pastYearDays, todayStr);
  const completionRate = expected > 0 ? Math.round((completed / expected) * 100) : 0;

  return {
    habitId: habit.id,
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    totalCompletions: completed,
    completionRate,
  };
}

/**
 * Filter date range strictly up to today.
 * For 'month': returns the current calendar month from day 1 up to today.
 */
export function getDateRangeDays(range: TimeRangeFilter, todayStr: string = getTodayDateString()): string[] {
  const today = parseDateString(todayStr);

  if (range === 'month') {
    // Current calendar month up to today!
    const year = today.getFullYear();
    const month = today.getMonth();
    const allDaysInCurrentMonth = getDaysInMonth(year, month);
    return allDaysInCurrentMonth.filter((d) => d <= todayStr);
  }

  if (range === 'week') {
    // Current Monday-Sunday week up to today
    const dow = getMondayIndexedDay(today);
    const mondayStr = addDays(todayStr, -dow);
    const weekDays: string[] = [];
    for (let i = 0; i <= dow; i++) {
      weekDays.push(addDays(mondayStr, i));
    }
    return weekDays;
  }

  let count = 30;
  if (range === 'quarter') count = 90;
  else if (range === 'year') count = 365;
  else if (range === 'all') count = 730;

  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = addDays(todayStr, -i);
    if (d <= todayStr) {
      days.push(d);
    }
  }
  return days;
}

/**
 * Returns user-friendly explanation of the selected period
 */
export function getPeriodDescription(range: TimeRangeFilter, todayStr: string = getTodayDateString()): string {
  const today = parseDateString(todayStr);
  if (range === 'month') {
    const monthName = MONTH_NAMES_EXP[today.getMonth()];
    return `Mes calendario actual (${monthName} ${today.getFullYear()}) desde el día 1 hasta hoy`;
  }
  if (range === 'week') {
    return 'Semana actual en curso (desde el lunes hasta hoy)';
  }
  if (range === 'quarter') {
    return 'Últimos 90 días hasta hoy';
  }
  if (range === 'year') {
    return 'Últimos 365 días hasta hoy';
  }
  return 'Histórico completo de hábitos registrados hasta hoy';
}

const MONTH_NAMES_EXP = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Weekly evolution for the last 12 weeks with period-over-period comparison
 */
export function calculateWeeklyEvolution(
  habits: Habit[],
  logs: Record<string, HabitLog>,
  todayStr: string = getTodayDateString()
): {
  weeks: { weekLabel: string; rate: number; completed: number; scheduled: number }[];
  currentPeriodRate: number;
  previousPeriodRate: number;
  diff: number;
  hasPreviousData: boolean;
} {
  const weeks: { weekLabel: string; rate: number; completed: number; scheduled: number }[] = [];
  let currentPeriodCompleted = 0;
  let currentPeriodExpected = 0;

  for (let w = 11; w >= 0; w--) {
    const endDaysAgo = w * 7;
    const startDaysAgo = endDaysAgo + 6;

    const weekDays: string[] = [];
    for (let d = startDaysAgo; d >= endDaysAgo; d--) {
      const dateStr = addDays(todayStr, -d);
      if (dateStr <= todayStr) {
        weekDays.push(dateStr);
      }
    }

    let weekExp = 0;
    let weekComp = 0;

    habits.forEach((h) => {
      if (h.status === 'archived') return;
      const res = calculateHabitExpectedAndCompleted(h, logs, weekDays, todayStr);
      weekExp += res.expected;
      weekComp += res.completed;
    });

    currentPeriodExpected += weekExp;
    currentPeriodCompleted += weekComp;

    const weekEndDate = parseDateString(addDays(todayStr, -endDaysAgo));
    const label = `Sem ${12 - w} (${weekEndDate.getDate()}/${weekEndDate.getMonth() + 1})`;
    const rate = weekExp > 0 ? Math.round((weekComp / weekExp) * 100) : 0;

    weeks.push({ weekLabel: label, rate, completed: weekComp, scheduled: weekExp });
  }

  // Previous 12 weeks (days 84 to 168 ago)
  const prevDays: string[] = [];
  for (let d = 167; d >= 84; d--) {
    prevDays.push(addDays(todayStr, -d));
  }

  let prevPeriodCompleted = 0;
  let prevPeriodExpected = 0;

  habits.forEach((h) => {
    if (h.status === 'archived') return;
    const res = calculateHabitExpectedAndCompleted(h, logs, prevDays, todayStr);
    prevPeriodExpected += res.expected;
    prevPeriodCompleted += res.completed;
  });

  const currentPeriodRate =
    currentPeriodExpected > 0 ? Math.round((currentPeriodCompleted / currentPeriodExpected) * 100) : 0;
  const previousPeriodRate =
    prevPeriodExpected > 0 ? Math.round((prevPeriodCompleted / prevPeriodExpected) * 100) : 0;
  
  const hasPreviousData = prevPeriodExpected > 0;
  const diff = currentPeriodRate - previousPeriodRate;

  return {
    weeks,
    currentPeriodRate,
    previousPeriodRate,
    diff,
    hasPreviousData,
  };
}

/**
 * Performance grouped by day of week (strictly up to today)
 */
export function calculateDayOfWeekPerformance(
  habits: Habit[],
  logs: Record<string, HabitLog>,
  days: string[]
): { dayIndex: number; dayName: string; completed: number; scheduled: number; rate: number }[] {
  const result = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    dayName: DAY_NAMES_FULL[i],
    completed: 0,
    scheduled: 0,
    rate: 0,
  }));

  const todayStr = getTodayDateString();

  days.forEach((dateStr) => {
    if (dateStr > todayStr) return; // STRICT GUARD

    const dayOfWeek = getMondayIndexedDay(parseDateString(dateStr));

    habits.forEach((habit) => {
      if (habit.status === 'archived') return;
      const res = calculateHabitExpectedAndCompleted(habit, logs, [dateStr], todayStr);
      result[dayOfWeek].scheduled += res.expected;
      result[dayOfWeek].completed += res.completed;
    });
  });

  result.forEach((item) => {
    item.rate = item.scheduled > 0 ? Math.round((item.completed / item.scheduled) * 100) : 0;
  });

  return result;
}

/**
 * Performance grouped by category (strictly up to today)
 */
export function calculateCategoryPerformance(
  habits: Habit[],
  logs: Record<string, HabitLog>,
  days: string[]
): { category: string; completed: number; scheduled: number; rate: number }[] {
  const catMap: Record<string, { completed: number; scheduled: number }> = {};
  const todayStr = getTodayDateString();

  habits.forEach((habit) => {
    if (habit.status === 'archived') return;
    const cat = habit.category || 'General';
    if (!catMap[cat]) catMap[cat] = { completed: 0, scheduled: 0 };

    const res = calculateHabitExpectedAndCompleted(habit, logs, days, todayStr);
    catMap[cat].scheduled += res.expected;
    catMap[cat].completed += res.completed;
  });

  return Object.entries(catMap).map(([category, stats]) => ({
    category,
    completed: stats.completed,
    scheduled: stats.scheduled,
    rate: stats.scheduled > 0 ? Math.round((stats.completed / stats.scheduled) * 100) : 0,
  }));
}

/**
 * Generate smart Argentine Spanish insights (only when data exists with at least 3 active days)
 */
export function generateInsights(
  habits: Habit[],
  logs: Record<string, HabitLog>,
  streaks: Record<string, HabitStreak>,
  dayOfWeekStats: { dayIndex: number; dayName: string; rate: number; scheduled: number }[],
  categoryStats: { category: string; rate: number; scheduled: number }[],
  daysCountWithData: number
): { insights: string[]; hasEnoughData: boolean } {
  if (daysCountWithData < 3) {
    return {
      insights: [],
      hasEnoughData: false,
    };
  }

  const insights: string[] = [];

  const daysWithData = dayOfWeekStats.filter((d) => d.scheduled > 0 && d.rate > 0);
  if (daysWithData.length > 0) {
    const sortedDays = [...daysWithData].sort((a, b) => b.rate - a.rate);
    insights.push(
      `Tu día con mayor rendimiento es el **${sortedDays[0].dayName.toLowerCase()}** con un **${sortedDays[0].rate}%** de cumplimiento.`
    );
  }

  const activeStreaks = Object.values(streaks)
    .filter((s) => s.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak);

  if (activeStreaks.length > 0) {
    const topHabit = habits.find((h) => h.id === activeStreaks[0].habitId);
    if (topHabit) {
      insights.push(
        `¡Excelente constancia! Llevás **${activeStreaks[0].currentStreak} ${activeStreaks[0].currentStreak === 1 ? 'día seguido' : 'días seguidos'}** cumpliendo "${topHabit.name}".`
      );
    }
  }

  const catsWithData = categoryStats.filter((c) => c.scheduled > 0 && c.rate > 0);
  if (catsWithData.length > 0) {
    const sortedCats = [...catsWithData].sort((a, b) => b.rate - a.rate);
    insights.push(
      `Tu categoría más sólida es **${sortedCats[0].category}** con un **${sortedCats[0].rate}%** de efectividad.`
    );
  }

  const struggleHabits = Object.values(streaks)
    .filter((s) => s.totalCompletions > 0 && s.completionRate < 60)
    .sort((a, b) => a.completionRate - b.completionRate);

  if (struggleHabits.length > 0) {
    const struggleHabit = habits.find((h) => h.id === struggleHabits[0].habitId);
    if (struggleHabit) {
      insights.push(
        `Foco recomendado: "${struggleHabit.name}" ronda el ${struggleHabits[0].completionRate}%. Quizás convenga ajustar la meta o asociarlo a una rutina diaria ya consolidada.`
      );
    }
  }

  return { insights, hasEnoughData: true };
}

/**
 * Badges and achievements list with progress and days remaining
 */
export function calculateBadges(
  habits: Habit[],
  streaks: Record<string, HabitStreak>,
  logs: Record<string, HabitLog>
): (AchievementBadge & { daysRemaining?: number })[] {
  const allStreaks = Object.values(streaks);
  const maxBest = allStreaks.reduce((max, s) => Math.max(max, s.bestStreak), 0);
  const totalCompletedCount = allStreaks.reduce((sum, s) => sum + s.totalCompletions, 0);

  const todayStr = getTodayDateString();
  let perfectDaysCount = 0;
  for (let i = 0; i < 60; i++) {
    const d = addDays(todayStr, -i);
    const log = logs[d];
    if (!log) continue;
    const scheduled = habits.filter((h) => isHabitScheduledOnDate(h, d));
    if (scheduled.length > 0 && scheduled.every((h) => isHabitCompleted(h, log.values?.[h.id]))) {
      perfectDaysCount++;
    }
  }

  return [
    {
      id: 'first-step',
      title: 'Primer Trazo',
      description: 'Registrar tu primer hábito cumplido.',
      icon: '🌱',
      isUnlocked: totalCompletedCount >= 1,
      progressText: `${Math.min(1, totalCompletedCount)}/1`,
      daysRemaining: totalCompletedCount >= 1 ? 0 : 1,
    },
    {
      id: 'streak-7',
      title: 'Semana de Acero',
      description: 'Alcanzar una racha ininterrumpida de 7 días.',
      icon: '🔥',
      isUnlocked: maxBest >= 7,
      progressText: `${Math.min(7, maxBest)}/7 días`,
      daysRemaining: Math.max(0, 7 - maxBest),
    },
    {
      id: 'streak-21',
      title: 'Hábito Consolidado',
      description: 'Completar 21 días consecutivos en un hábito.',
      icon: '⚡',
      isUnlocked: maxBest >= 21,
      progressText: `${Math.min(21, maxBest)}/21 días`,
      daysRemaining: Math.max(0, 21 - maxBest),
    },
    {
      id: 'perfect-day-3',
      title: 'Tríptico Impecable',
      description: 'Lograr 3 días con el 100% de hábitos cumplidos.',
      icon: '🎯',
      isUnlocked: perfectDaysCount >= 3,
      progressText: `${Math.min(3, perfectDaysCount)}/3 días`,
      daysRemaining: Math.max(0, 3 - perfectDaysCount),
    },
    {
      id: 'century-club',
      title: 'Club de las Cien Firmas',
      description: 'Registrar un total de 100 hábitos cumplidos.',
      icon: '💎',
      isUnlocked: totalCompletedCount >= 100,
      progressText: `${Math.min(100, totalCompletedCount)}/100`,
      daysRemaining: Math.max(0, 100 - totalCompletedCount),
    },
  ];
}
