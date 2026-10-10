export type HabitType = 'boolean' | 'counter' | 'duration';
export type HabitFrequency = 'daily' | 'specific_days' | 'times_per_week';
export type HabitStatus = 'active' | 'paused' | 'archived';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  emoji: string;
  color: string;
  category: string;
  type: HabitType;
  targetValue?: number; // e.g., 8 glasses, 30 minutes
  targetUnit?: string;  // e.g., "vasos", "minutos", "páginas"
  frequencyType: HabitFrequency;
  specificDays?: number[]; // 0 = Lunes, 1 = Martes, ... 6 = Domingo
  timesPerWeek?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  isNegative?: boolean; // Dejar de hacer algo (se marca cuando NO se hizo)
  reminderTime?: string; // HH:mm
  status: HabitStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type HabitValue = boolean | number; // boolean for check, number for counter/duration

export interface HabitLog {
  id: string; // usually the date YYYY-MM-DD
  userId: string;
  date: string; // YYYY-MM-DD
  values: Record<string, HabitValue>; // habitId -> value
  notes?: string;
  updatedAt: string;
}

export interface DayHabitSummary {
  date: string;
  totalScheduled: number;
  completed: number;
  percentage: number;
}
