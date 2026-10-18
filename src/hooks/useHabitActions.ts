import { useCallback } from 'react';
import { LifeApi } from './useLifeData';
import { Habit, HabitLog, LifeArea } from '../types/life';
import { habitValue, isDone } from '../utils/habits';
import { nowIso } from '../utils/lifeUtils';

export function useHabitActions(life: LifeApi) {
  const setValue = useCallback(
    (habitId: string, date: string, value: number) => {
      const base: HabitLog = life.store.habitLogs[date] || { id: date, date, values: {}, updatedAt: nowIso() };
      life.upsert('habitLogs', { ...base, values: { ...base.values, [habitId]: Math.max(0, value) }, updatedAt: nowIso() });
    },
    [life]
  );

  const toggle = useCallback(
    (h: Habit, date: string) => {
      const v = habitValue(life.store.habitLogs, h.id, date);
      if (h.kind === 'count') setValue(h.id, date, isDone(h, v) ? 0 : h.target || 1);
      else setValue(h.id, date, v >= 1 ? 0 : 1);
    },
    [life, setValue]
  );

  /** Suma minutos a hábitos medidos en minutos del área (ej: estudio ← sesión de enfoque de facu) */
  const addMinutesForArea = useCallback(
    (area: LifeArea, date: string, minutes: number) => {
      const h = Object.values(life.store.habits).find((x) => !x.archived && x.area === area && x.kind === 'count' && (x.unit || '').startsWith('min'));
      if (h) setValue(h.id, date, habitValue(life.store.habitLogs, h.id, date) + minutes);
    },
    [life, setValue]
  );

  /** Marca el primer hábito de check del área (ej: leer la Biblia ← registrar lectura) */
  const completeFirstCheckOfArea = useCallback(
    (area: LifeArea, date: string) => {
      const h = Object.values(life.store.habits)
        .filter((x) => !x.archived && x.area === area && x.kind === 'check' && !x.isNegative)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      if (h && habitValue(life.store.habitLogs, h.id, date) < 1) setValue(h.id, date, 1);
    },
    [life, setValue]
  );

  return { setValue, toggle, addMinutesForArea, completeFirstCheckOfArea };
}
