/**
 * Datos iniciales del Sistema de Vida.
 * El repo trae solo valores genéricos. Tus datos personales (visión, misión,
 * cartas, metas, personas…) viven en `personalSeed.ts`, que está en .gitignore
 * y se suma automáticamente al build si existe (ver personalSeed.example.ts).
 * Todo es editable desde la app y, con sesión de Google, queda guardado en tu cuenta.
 */
import {
  Book,
  CalendarEvent,
  Debt,
  FinanceConfig,
  LifePrefs,
  LifeStore,
  Letter,
  Person,
  PurposeData,
  Routine,
  SavingsGoal,
  ScreenConfig,
  Task,
  TimeCategory,
} from '../types/life';
import { Habit } from '../types/habit';

export const LIFE_SEED_VERSION = 1;

export interface PersonalSeed {
  purpose?: PurposeData;
  letters?: Letter[];
  books?: Book[];
  bookCategories?: string[];
  people?: Person[];
  tasks?: Task[];
  events?: CalendarEvent[];
  financeConfig?: FinanceConfig;
  goals?: SavingsGoal[];
  debts?: Debt[];
  planHabits?: Omit<Habit, 'userId'>[];
}

// Carga opcional: si el archivo no existe, el glob devuelve {} y el build sigue funcionando
const personalModules = import.meta.glob<{ PERSONAL_SEED?: PersonalSeed }>('./personalSeed.ts', { eager: true });
const PERSONAL: PersonalSeed = Object.values(personalModules)[0]?.PERSONAL_SEED || {};

// ─────────────────────────────────────────────────────────────
// VALORES GENÉRICOS
// ─────────────────────────────────────────────────────────────
const GENERIC_PURPOSE: PurposeData = {
  wordOfYear: 'PROPÓSITO',
  wordMeaning: 'Elegí tu palabra del año y escribí qué significa para vos.',
  manifesto: '',
  principles: [
    '🧭 Dirección antes que velocidad',
    '🧱 Orden antes que motivación',
    '🔁 Constancia antes que intensidad',
    '👥 Personas antes que tareas',
    '🎯 Enfoque antes que dispersión',
  ],
  lifeVision: '',
  mission: '',
  vision2026: [],
  roles: [],
  quarters: [],
  struggles: [],
  actions: [],
  antiVision: '',
  finalDeclaration: '',
  reviewQuestions: [
    '¿Avancé en mis estudios este mes?',
    '¿Di valor en mi trabajo?',
    '¿Cómo están las personas que tengo a cargo?',
    '¿Pasé tiempo significativo con mi familia?',
    '¿Cómo está mi vida espiritual?',
    '¿Qué debo ajustar?',
    '¿Qué agradezco?',
    '¿Lo que hice este mes fue desde el amor o desde la presión?',
  ],
  values: [],
  dreams: [],
};

const GENERIC_FINANCE_CONFIG: FinanceConfig = {
  savingsPercent: 15,
  funPercent: 5,
  momContributionMin: 0,
  momContributionMax: 0,
  usdRate: 1450,
  usdRateSource: 'Estimado — tocá "Actualizar cotización"',
  salaryGoalStart: 0,
  salaryGoalEnd: 0,
  categoryBudgets: {},
  aguinaldoToSavings: true,
};

const GENERIC_BOOK_CATEGORIES = ['🧱 Núcleo', '🏗️ Sistemas + negocio', '🗣️ Personas', '✝️ Fe', '📚 Otros'];

export const SEED_PURPOSE: PurposeData = PERSONAL.purpose || GENERIC_PURPOSE;
export const SEED_FINANCE_CONFIG: FinanceConfig = PERSONAL.financeConfig || GENERIC_FINANCE_CONFIG;
export const BOOK_CATEGORIES: string[] = PERSONAL.bookCategories || GENERIC_BOOK_CATEGORIES;

// ─────────────────────────────────────────────────────────────
// TIEMPO & PANTALLA
// ─────────────────────────────────────────────────────────────
export const SEED_SCREEN_CONFIG: ScreenConfig = {
  dailyLimitMinutes: 150,
  appLimits: { Instagram: 30, TikTok: 20, YouTube: 45, WhatsApp: 60 },
  trackedApps: ['Instagram', 'TikTok', 'YouTube', 'WhatsApp', 'X', 'Juegos'],
  noSocialBefore: '11:00',
  rules: [
    { id: 'rule-manana', text: 'Sin redes por la mañana (hasta las 11:00)' },
    { id: 'rule-estudio', text: 'Al estudiar: modo Estudio activado y celular en otra habitación' },
    { id: 'rule-noche', text: 'Celular a cargar fuera del cuarto al dormir' },
    { id: 'rule-cama', text: 'Nada de scroll en la cama' },
    { id: 'rule-notif', text: 'Notificaciones solo de personas (no de apps)' },
  ],
};

export const SEED_ROUTINES: Routine[] = [
  {
    id: 'morning',
    name: 'Rutina de mañana',
    targetTime: '07:00',
    items: [
      { id: 'm-levantarme', time: '07:00', text: 'Levantarme sin posponer la alarma' },
      { id: 'm-agua', time: '07:05', text: 'Agua + hacer la cama' },
      { id: 'm-biblia', time: '07:15', text: 'Biblia y oración (rutina corta)' },
      { id: 'm-escritura', time: '07:30', text: 'Escribir 3 líneas: lo que Dios me habló' },
      { id: 'm-agenda', time: '07:40', text: 'Revisar agenda y tareas del día' },
      { id: 'm-redes', text: 'Sin redes hasta las 11:00' },
    ],
  },
  {
    id: 'night',
    name: 'Rutina de noche',
    targetTime: '23:30',
    items: [
      { id: 'n-cerrar', time: '22:30', text: 'Cerrar el día en CONSTANTE' },
      { id: 'n-preparar', time: '22:45', text: 'Preparar el día de mañana (mochila, ropa)' },
      { id: 'n-leer', time: '23:00', text: 'Leer 10 páginas' },
      { id: 'n-celu', time: '23:15', text: 'Celular a cargar fuera del cuarto' },
      { id: 'n-orar', time: '23:20', text: 'Oración y gratitud' },
    ],
  },
];

export const SEED_TIME_CATEGORIES: TimeCategory[] = [
  { id: 'tc-facultad', label: 'Facultad / Estudio', emoji: '🎓', color: '#2563EB', weeklyTargetHours: 21 },
  { id: 'tc-trabajo', label: 'Trabajo SMV', emoji: '💼', color: '#D97706' },
  { id: 'tc-iglesia', label: 'Iglesia & Elegidos', emoji: '⛪', color: '#7C3AED', weeklyTargetHours: 5 },
  { id: 'tc-dios', label: 'Biblia & Oración', emoji: '✝️', color: '#9333EA', weeklyTargetHours: 3.5 },
  { id: 'tc-familia', label: 'Familia', emoji: '👨‍👩‍👦', color: '#E11D48', weeklyTargetHours: 5 },
  { id: 'tc-gym', label: 'Gym & Deporte', emoji: '💪', color: '#059669', weeklyTargetHours: 4 },
  { id: 'tc-lectura', label: 'Lectura', emoji: '📚', color: '#0891B2', weeklyTargetHours: 3 },
  { id: 'tc-ingles', label: 'Inglés', emoji: '🇬🇧', color: '#0EA5E9', weeklyTargetHours: 2 },
  { id: 'tc-redes', label: 'Celular & Redes', emoji: '📱', color: '#64748B', isLeisure: true },
  { id: 'tc-ocio', label: 'Ocio & Amigos', emoji: '🎮', color: '#F59E0B', isLeisure: true },
];

export const SEED_PREFS: LifePrefs = {
  verseNotify: false,
  verseTime: '07:15',
  dailyStudyGoalMinutes: 180,
  booksPerYearGoal: 12,
  seedVersion: LIFE_SEED_VERSION,
};

// ─────────────────────────────────────────────────────────────
// HÁBITOS DEL PLAN (se importan desde Brújula)
// ─────────────────────────────────────────────────────────────
export const PLAN_2026_HABITS: Omit<Habit, 'userId'>[] = PERSONAL.planHabits || [];

// ─────────────────────────────────────────────────────────────
// STORE INICIAL
// ─────────────────────────────────────────────────────────────
function toRecord<T extends { id: string }>(list: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  list.forEach((x) => (out[x.id] = x));
  return out;
}

export function createEmptyLifeStore(): LifeStore {
  return {
    transactions: {},
    goals: {},
    debts: {},
    subjects: {},
    evaluations: {},
    studyLogs: {},
    events: {},
    tasks: {},
    ideas: {},
    wins: {},
    timeEntries: {},
    screenLogs: {},
    routineLogs: {},
    pauseLogs: {},
    books: {},
    people: {},
    interactions: {},
    prayers: {},
    readings: {},
    reviews: {},
    letters: {},
    verseFavs: {},
    financeConfig: SEED_FINANCE_CONFIG,
    screenConfig: SEED_SCREEN_CONFIG,
    routines: SEED_ROUTINES,
    timeCategories: SEED_TIME_CATEGORIES,
    purpose: SEED_PURPOSE,
    prefs: SEED_PREFS,
  };
}

export function createSeededLifeStore(): LifeStore {
  return {
    ...createEmptyLifeStore(),
    goals: toRecord(PERSONAL.goals || []),
    debts: toRecord(PERSONAL.debts || []),
    events: toRecord(PERSONAL.events || []),
    tasks: toRecord(PERSONAL.tasks || []),
    books: toRecord(PERSONAL.books || []),
    people: toRecord(PERSONAL.people || []),
    letters: toRecord(PERSONAL.letters || []),
  };
}
