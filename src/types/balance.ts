export interface MonthlyBalanceData {
  id: string; // e.g. "2026-10"
  year: number;
  month: number; // 0-11
  monthName: string;
  isPartial: boolean; // if current month
  generatedAt: string;
  overallRate: number;
  previousMonthRate: number | null;
  habitRates: {
    habitId: string;
    name: string;
    emoji: string;
    rate: number;
    completed: number;
    scheduled: number;
    previousRate: number | null;
  }[];
  focusMinutes?: number;
  focusSessionsCount?: number;
  // Gemini response structure
  resumen: string;
  logros: string[];
  a_mejorar: string[];
  patrones: string[];
  temas_del_diario: string[];
  sugerencias: string[];
  habito_foco: string;
  frase_final: string;
}

export interface WeeklyReviewData {
  id: string; // e.g. "2026-W41"
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  generatedAt: string;
  logros: string[]; // 3 logros
  a_mejorar: string; // 1 aspecto a mejorar
  objetivo: string; // 1 objetivo para la semana
}
