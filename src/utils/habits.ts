import { Habit, HabitLog, LifeStore } from '../types/life';
import { addDays, getMondayIndexedDay, getWeekDays, parseDateString } from './dateUtils';

export function isScheduled(h: Habit, date: string): boolean {
  if (h.archived) return false;
  if (h.createdAt && date < h.createdAt.slice(0, 10) && date > '2000-01-01') {
    // permitir registrar días anteriores a la creación solo si ya hay datos
  }
  if (h.schedule === 'days') return (h.days || []).includes(getMondayIndexedDay(parseDateString(date)));
  return true; // daily y weekly (cuota semanal) se ofrecen todos los días
}

export function habitValue(logs: Record<string, HabitLog>, habitId: string, date: string): number {
  return logs[date]?.values?.[habitId] || 0;
}

export function isDone(h: Habit, value: number): boolean {
  if (h.kind === 'count') return value >= (h.target || 1);
  return value >= 1;
}

/** Progreso 0..1 del hábito en una fecha */
export function habitProgress(h: Habit, value: number): number {
  if (h.kind === 'count') return Math.min(1, value / (h.target || 1));
  return value >= 1 ? 1 : 0;
}

export function weekCount(h: Habit, logs: Record<string, HabitLog>, date: string): number {
  return getWeekDays(date).filter((d) => isDone(h, habitValue(logs, h.id, d))).length;
}

/** Hábitos que corresponden hoy (los semanales desaparecen si ya cumpliste la cuota) */
export function habitsForDate(store: LifeStore, date: string) {
  return Object.values(store.habits)
    .filter((h) => !h.archived && isScheduled(h, date))
    .filter((h) => {
      if (h.schedule !== 'weekly') return true;
      const done = weekCount(h, store.habitLogs, date);
      const today = isDone(h, habitValue(store.habitLogs, h.id, date));
      return today || done < (h.timesPerWeek || 1);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function dayCompletion(store: LifeStore, date: string): { done: number; total: number; pct: number } {
  const list = habitsForDate(store, date);
  const done = list.filter((h) => isDone(h, habitValue(store.habitLogs, h.id, date))).length;
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

export function streak(h: Habit, logs: Record<string, HabitLog>, today: string): number {
  if (h.schedule === 'weekly') {
    // racha en semanas que cumplieron la cuota
    let n = 0;
    let d = addDays(today, -7);
    if (weekCount(h, logs, today) >= (h.timesPerWeek || 1)) n++;
    while (weekCount(h, logs, d) >= (h.timesPerWeek || 1)) {
      n++;
      d = addDays(d, -7);
    }
    return n;
  }
  let n = 0;
  let d = isDone(h, habitValue(logs, h.id, today)) ? today : addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    if (!isScheduled(h, d)) {
      d = addDays(d, -1);
      continue;
    }
    if (!isDone(h, habitValue(logs, h.id, d))) break;
    n++;
    d = addDays(d, -1);
  }
  return n;
}
