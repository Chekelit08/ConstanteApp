export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  id: string;
  userId: string;
  theme: ThemeMode;
  accentColor: string; // e.g., '#E11D48' (carmín), 'ink' (tinta negra/hueso), '#D97706' (ámbar), etc.
  firstDayOfWeek: number; // 1 = Lunes
  notificationsEnabled: boolean;
  reminderTime?: string; // HH:mm
  journalPin?: string; // 4 digits
  hasPin: boolean;
  autoAiSummary: boolean;
  geminiApiKey?: string;
  customCategories: string[];
  mission?: string; // Declaración de misión de vida / hábitos
  vision?: string;  // Visión a largo plazo
  balancePrivacyAccepted?: boolean; // Ha aceptado el aviso de privacidad de Gemini para Balance
  aiTransparencyAccepted?: boolean; // Aviso único de transparencia con IA (Qué, A quién, Dónde)
  aiEnabled?: boolean; // Activar o desactivar funciones de IA
  spotifyClientId?: string; // Client ID de Spotify (no secreto)
  spotifyModeDefaultPlaylists?: Record<string, string>; // timerMode -> playlistId
  spotifyAutoPlayOnFocus?: boolean; // Iniciar música al comenzar el enfoque y pausarla en descansos
  focusDailyGoalMinutes?: number; // Meta diaria de minutos de enfoque (default 120)
  updatedAt: string;
}

export const DEFAULT_CATEGORIES = [
  'Salud & Bienestar',
  'Estudio & Mente',
  'Trabajo & Foco',
  'Espiritualidad & Calma',
  'Finanzas',
  'Personal & Creativo',
];

export const ACCENT_PALETTE = [
  { id: 'carmine', name: 'Carmín Editorial', value: '#E11D48' },
  { id: 'ink', name: 'Tinta Negra / Hueso', value: 'ink' },
  { id: 'amber', name: 'Ámbar Sello', value: '#D97706' },
  { id: 'blue', name: 'Azul Estilográfica', value: '#2563EB' },
  { id: 'emerald', name: 'Verde Botánico', value: '#059669' },
  { id: 'purple', name: 'Violeta Imprenta', value: '#7C3AED' },
];
