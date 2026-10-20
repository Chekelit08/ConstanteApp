import { useCallback } from 'react';
import { LifeApi } from './useLifeData';
import { Habit, HabitLog, LifeArea } from '../types/life';
import { DAY_OFF, HabitState, habitValue, isDone, MISSED, PARTIAL } from '../utils/habits';
import { nowIso } from '../utils/lifeUtils';

export function useHabitActions(life: LifeApi) {
  const setValue = useCallback(
    (habitId: string, date: string, value: number) => {
      const base: HabitLog = life.store.habitLogs[date] || { id: date, date, values: {}, updatedAt: nowIso() };
      // negativos solo para los estados especiales (no cumplí / día libre)
      const v = value === MISSED || value === DAY_OFF ? value : Math.max(0, value);
      life.upsert('habitLogs', { ...base, values: { ...base.values, [habitId]: v }, updatedAt: nowIso() });
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

  const setState = useCallback(
    (h: Habit, date: string, state: HabitState) => {
      const map: Record<HabitState, number> = {
        done: h.kind === 'count' ? h.target || 1 : 1,
        partial: h.kind === 'count' ? Math.max(1, Math.round((h.target || 2) / 2)) : PARTIAL,
        missed: MISSED,
        off: DAY_OFF,
        none: 0,
      };
      setValue(h.id, date, map[state]);
    },
    [setValue]
  );

  /** Suma minutos a hábitos medidos en minutos del área (ej: estudio ← sesión de enfoque de facu) */
  const addMinutesForArea = useCallback(
    (area: LifeArea, date: string, minutes: number) => {
      const h = Object.values(life.store.habits).find((x) => !x.archived && x.area === area && x.kind === 'count' && (x.unit || '').startsWith('min'));
      if (h) setValue(h.id, date, Math.max(0, habitValue(life.store.habitLogs, h.id, date)) + minutes);
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

  return { setValue, setState, toggle, addMinutesForArea, completeFirstCheckOfArea };
}
