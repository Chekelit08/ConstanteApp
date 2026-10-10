export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate: number; // 0 to 100
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressText: string;
}

export interface DayStats {
  date: string;
  dayOfWeek: number; // 0 = Lunes, 6 = Domingo
  completedCount: number;
  scheduledCount: number;
  percentage: number;
}
