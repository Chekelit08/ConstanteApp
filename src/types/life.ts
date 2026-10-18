/**
 * Modelo de datos del "Sistema de Vida" de CONSTANTE.
 * Agrupa finanzas, universidad, agenda, trabajo, tiempo & pantalla,
 * libros, personas, fe y propósito en un único store sincronizable.
 */

// ─────────────────────────────────────────────────────────────
// ÁREAS DE VIDA (compartidas por agenda, tareas y registro de tiempo)
// ─────────────────────────────────────────────────────────────
export type LifeArea =
  | 'universidad'
  | 'trabajo'
  | 'iglesia'
  | 'fe'
  | 'familia'
  | 'amigos'
  | 'salud'
  | 'finanzas'
  | 'personal';

export const LIFE_AREAS: { id: LifeArea; label: string; emoji: string; color: string }[] = [
  { id: 'universidad', label: 'Universidad', emoji: '🎓', color: '#2563EB' },
  { id: 'trabajo', label: 'Trabajo SMV', emoji: '💼', color: '#D97706' },
  { id: 'iglesia', label: 'Iglesia & Elegidos', emoji: '⛪', color: '#7C3AED' },
  { id: 'fe', label: 'Fe', emoji: '✝️', color: '#9333EA' },
  { id: 'familia', label: 'Familia', emoji: '👨‍👩‍👦', color: '#E11D48' },
  { id: 'amigos', label: 'Amigos', emoji: '🤝', color: '#0891B2' },
  { id: 'salud', label: 'Salud & Gym', emoji: '💪', color: '#059669' },
  { id: 'finanzas', label: 'Finanzas', emoji: '💸', color: '#16A34A' },
  { id: 'personal', label: 'Personal', emoji: '🧭', color: '#64748B' },
];

export function getArea(id?: string) {
  return LIFE_AREAS.find((a) => a.id === id) || LIFE_AREAS[LIFE_AREAS.length - 1];
}

// ─────────────────────────────────────────────────────────────
// FINANZAS
// ─────────────────────────────────────────────────────────────
export type Currency = 'ARS' | 'USD';
export type TxType = 'income' | 'expense' | 'saving' | 'withdrawal';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TxType;
  amount: number;
  currency: Currency;
  category: string;
  note?: string;
  usdRate?: number; // cotización usada (ARS por USD) para convertir
  goalId?: string; // ahorro asignado a una meta
  debtId?: string; // pago de una deuda
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currency: Currency;
  deadline?: string; // YYYY-MM-DD
  initialAmount?: number; // lo que ya tenías ahorrado antes de usar la app
  notes?: string;
  isPrimary?: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  name: string;
  creditor: string;
  totalAmount: number;
  currency: Currency;
  installments?: number;
  paidBefore?: number; // monto ya pagado antes de usar la app
  startDate?: string;
  notes?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceConfig {
  savingsPercent: number; // % del ingreso al ahorro (plan: 15%)
  funPercent: number; // % fondo de gustos (plan: 5%)
  momContributionMin: number; // aporte mensual a mamá (plan: 100k–150k)
  momContributionMax: number;
  usdRate: number; // cotización manual o traída de dolarapi
  usdRateSource?: string;
  usdRateUpdatedAt?: string;
  salaryGoalStart: number;
  salaryGoalEnd: number;
  categoryBudgets: Record<string, number>; // tope mensual ARS por categoría de gasto
  aguinaldoToSavings: boolean;
}

export const EXPENSE_CATEGORIES: { id: string; emoji: string }[] = [
  { id: 'Comida', emoji: '🍔' },
  { id: 'Transporte', emoji: '🚌' },
  { id: 'Facultad', emoji: '🎓' },
  { id: 'Salidas', emoji: '🍕' },
  { id: 'Ropa', emoji: '👕' },
  { id: 'Aporte a mamá', emoji: '💛' },
  { id: 'Cuota MacBook', emoji: '💻' },
  { id: 'Iglesia / Ofrenda', emoji: '⛪' },
  { id: 'Elegidos', emoji: '🎮' },
  { id: 'Gym & Salud', emoji: '💪' },
  { id: 'Celular & Suscripciones', emoji: '📱' },
  { id: 'Regalos', emoji: '🎁' },
  { id: 'Libros & Cursos', emoji: '📚' },
  { id: 'Viajes', emoji: '🏖️' },
  { id: 'Otros', emoji: '🧾' },
];

export const INCOME_CATEGORIES: { id: string; emoji: string }[] = [
  { id: 'Sueldo SMV', emoji: '💼' },
  { id: 'Aguinaldo', emoji: '🎄' },
  { id: 'Extra / Freelance', emoji: '🧑‍💻' },
  { id: 'Regalo', emoji: '🎁' },
  { id: 'Otros ingresos', emoji: '💵' },
];

// ─────────────────────────────────────────────────────────────
// UNIVERSIDAD
// ─────────────────────────────────────────────────────────────
export type SubjectStatus =
  | 'cursando'
  | 'promocionada'
  | 'regularizada'
  | 'aprobada'
  | 'recursar'
  | 'pendiente';

export const SUBJECT_STATUS_LABEL: Record<SubjectStatus, string> = {
  cursando: 'Cursando',
  promocionada: 'Promocionada',
  regularizada: 'Regularizada (debe final)',
  aprobada: 'Aprobada (final)',
  recursar: 'A recursar',
  pendiente: 'Pendiente',
};

export interface ClassSlot {
  id: string;
  day: number; // 0 = Lunes ... 6 = Domingo
  start: string; // HH:mm
  end: string; // HH:mm
  room?: string;
  kind?: string; // Teoría, Práctica, Lab
}

export interface SyllabusUnit {
  id: string;
  title: string;
  done: boolean;
  notesUrl?: string; // link a resumen (Notion, Drive)
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  period: string; // ej: "2026 · 2C"
  professor?: string;
  color: string;
  status: SubjectStatus;
  promotionGrade: number; // nota mínima para promocionar
  schedule: ClassSlot[];
  units: SyllabusUnit[];
  finalGrade?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EvalType = 'parcial' | 'recuperatorio' | 'tp' | 'final' | 'coloquio' | 'quiz';

export const EVAL_TYPE_LABEL: Record<EvalType, string> = {
  parcial: 'Parcial',
  recuperatorio: 'Recuperatorio',
  tp: 'Trabajo práctico',
  final: 'Final',
  coloquio: 'Coloquio',
  quiz: 'Quiz / Control',
};

export interface Evaluation {
  id: string;
  subjectId: string;
  type: EvalType;
  title: string;
  date: string;
  time?: string;
  grade?: number;
  topics?: string;
  status: 'pendiente' | 'aprobado' | 'desaprobado' | 'ausente';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyLog {
  id: string;
  subjectId?: string;
  date: string;
  minutes: number;
  note?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// AGENDA & TAREAS
// ─────────────────────────────────────────────────────────────
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (inicio)
  start?: string; // HH:mm
  end?: string; // HH:mm
  allDay: boolean;
  area: LifeArea;
  recurrence: Recurrence;
  recurrenceUntil?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'alta' | 'media' | 'baja';

export interface Task {
  id: string;
  title: string;
  area: LifeArea;
  dueDate?: string;
  priority: TaskPriority;
  done: boolean;
  doneAt?: string;
  notes?: string;
  subtasks?: { id: string; title: string; done: boolean }[];
  createdAt: string;
  updatedAt: string;
}

/** Ítem unificado para mostrar en la agenda (eventos, clases, evaluaciones, cumpleaños…) */
export interface AgendaItem {
  key: string;
  date: string;
  start?: string;
  end?: string;
  allDay: boolean;
  title: string;
  subtitle?: string;
  area: LifeArea;
  color: string;
  emoji: string;
  source: 'event' | 'class' | 'evaluation' | 'birthday' | 'task' | 'system';
  refId?: string;
  done?: boolean;
}

// ─────────────────────────────────────────────────────────────
// TRABAJO SMV
// ─────────────────────────────────────────────────────────────
export type IdeaStatus = 'idea' | 'propuesta' | 'en_curso' | 'implementada' | 'descartada';

export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = {
  idea: 'Idea',
  propuesta: 'Propuesta',
  en_curso: 'En curso',
  implementada: 'Implementada',
  descartada: 'Descartada',
};

export interface WorkIdea {
  id: string;
  title: string;
  description?: string;
  kind: 'proceso' | 'automatizacion' | 'comunicacion' | 'otro';
  status: IdeaStatus;
  impact: 'alto' | 'medio' | 'bajo';
  implementedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkWin {
  id: string;
  date: string;
  kind: 'logro' | 'feedback' | 'aprendizaje' | 'error';
  text: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// TIEMPO & PANTALLA
// ─────────────────────────────────────────────────────────────
export interface TimeCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  weeklyTargetHours?: number;
  isLeisure?: boolean;
}

export interface TimeEntry {
  id: string;
  categoryId: string;
  start: string; // ISO
  end?: string; // ISO (sin end = cronómetro en marcha)
  note?: string;
}

export interface ScreenLog {
  id: string; // = date
  date: string;
  totalMinutes: number;
  apps: Record<string, number>; // app -> minutos
  pickups?: number;
  firstSocialTime?: string; // HH:mm primera vez que abriste redes
  notes?: string;
  updatedAt: string;
}

export interface ScreenConfig {
  dailyLimitMinutes: number;
  appLimits: Record<string, number>;
  trackedApps: string[];
  noSocialBefore: string; // HH:mm — "sin redes por la mañana"
  rules: { id: string; text: string }[];
}

export interface RoutineItem {
  id: string;
  time?: string;
  text: string;
}

export interface Routine {
  id: 'morning' | 'night';
  name: string;
  targetTime?: string; // hora objetivo (despertar / dormir)
  items: RoutineItem[];
}

export interface RoutineLog {
  id: string; // = date
  date: string;
  done: Record<string, boolean>;
  wakeTime?: string;
  sleepTime?: string;
  updatedAt: string;
}

export interface PauseLog {
  id: string;
  date: string;
  time: string;
  app: string;
  decision: 'volvi' | 'abri';
  intention?: string;
}

// ─────────────────────────────────────────────────────────────
// LIBROS
// ─────────────────────────────────────────────────────────────
export type BookStatus = 'pendiente' | 'leyendo' | 'terminado' | 'abandonado';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: BookStatus;
  totalPages?: number;
  currentPage?: number;
  startDate?: string;
  finishDate?: string;
  rating?: number;
  summary?: string; // por qué leerlo
  takeaways?: string;
  notionUrl?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// PERSONAS
// ─────────────────────────────────────────────────────────────
export type PersonGroup = 'familia' | 'elegidos' | 'amigos' | 'mentores' | 'trabajo' | 'iglesia';

export const PERSON_GROUPS: { id: PersonGroup; label: string; emoji: string }[] = [
  { id: 'familia', label: 'Familia', emoji: '👨‍👩‍👦' },
  { id: 'elegidos', label: 'Elegidos (mis 2–3)', emoji: '🤝' },
  { id: 'amigos', label: 'Amigos', emoji: '🫂' },
  { id: 'mentores', label: 'Mentores', emoji: '🧭' },
  { id: 'iglesia', label: 'Iglesia', emoji: '⛪' },
  { id: 'trabajo', label: 'Trabajo', emoji: '💼' },
];

export interface Person {
  id: string;
  name: string;
  group: PersonGroup;
  relation?: string;
  emoji?: string;
  birthday?: string; // MM-DD
  contactEveryDays?: number;
  prayFor?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InteractionKind = 'charla' | 'salida' | 'mensaje' | 'llamada' | 'oracion' | 'ayuda' | 'actividad';

export const INTERACTION_LABEL: Record<InteractionKind, string> = {
  charla: '💬 Charla',
  salida: '🚶 Salida / merienda',
  mensaje: '📱 Mensaje',
  llamada: '📞 Llamada',
  oracion: '🙏 Oré por él/ella',
  ayuda: '🤲 Ayuda concreta',
  actividad: '⚽ Actividad / juego',
};

export interface Interaction {
  id: string;
  personId: string;
  date: string;
  kind: InteractionKind;
  note?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// FE
// ─────────────────────────────────────────────────────────────
export interface PrayerRequest {
  id: string;
  text: string;
  personId?: string;
  status: 'activa' | 'respondida';
  answeredAt?: string;
  answerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BibleReading {
  id: string;
  date: string;
  passage: string;
  insight?: string; // lo que Dios me habló
  application?: string; // cómo lo aplico hoy
  createdAt: string;
}

export interface VerseFavorite {
  id: string; // referencia normalizada
  ref: string;
  savedAt: string;
  note?: string;
}

// ─────────────────────────────────────────────────────────────
// PROPÓSITO / BRÚJULA
// ─────────────────────────────────────────────────────────────
export interface YearRole {
  id: string;
  letter: string;
  area: string;
  emoji: string;
  role: string;
  objective: string;
  loveCriterion: string;
  identity: string;
  indicators: string[];
}

export interface QuarterPlan {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  months: string;
  question: string;
  blocks: { area: string; items: string[] }[];
}

export interface PurposeData {
  wordOfYear: string;
  wordMeaning: string;
  manifesto: string;
  principles: string[];
  lifeVision: string;
  mission: string;
  vision2026: { area: string; text: string }[];
  roles: YearRole[];
  quarters: QuarterPlan[];
  struggles: string[]; // Lo que me cuesta
  actions: string[]; // Lo que debo hacer
  antiVision: string;
  finalDeclaration: string;
  reviewQuestions: string[];
  values: string[];
  dreams: string[]; // bucket list
}

export interface MonthlyReview {
  id: string; // YYYY-MM
  month: string;
  answers: string[];
  ratings: Record<string, number>; // roleId -> 1..5
  createdAt: string;
  updatedAt: string;
}

export interface Letter {
  id: string;
  title: string;
  emoji: string;
  writtenAt: string;
  openAt?: string;
  body: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// PREFERENCIAS DEL SISTEMA DE VIDA
// ─────────────────────────────────────────────────────────────
export interface LifePrefs {
  verseNotify: boolean;
  verseTime: string; // HH:mm
  lastVerseNotified?: string; // YYYY-MM-DD
  dailyStudyGoalMinutes: number; // 3 hs = 180
  booksPerYearGoal: number; // 12
  seedVersion: number;
}

// ─────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────
export interface LifeCollections {
  transactions: Record<string, Transaction>;
  goals: Record<string, SavingsGoal>;
  debts: Record<string, Debt>;
  subjects: Record<string, Subject>;
  evaluations: Record<string, Evaluation>;
  studyLogs: Record<string, StudyLog>;
  events: Record<string, CalendarEvent>;
  tasks: Record<string, Task>;
  ideas: Record<string, WorkIdea>;
  wins: Record<string, WorkWin>;
  timeEntries: Record<string, TimeEntry>;
  screenLogs: Record<string, ScreenLog>;
  routineLogs: Record<string, RoutineLog>;
  pauseLogs: Record<string, PauseLog>;
  books: Record<string, Book>;
  people: Record<string, Person>;
  interactions: Record<string, Interaction>;
  prayers: Record<string, PrayerRequest>;
  readings: Record<string, BibleReading>;
  reviews: Record<string, MonthlyReview>;
  letters: Record<string, Letter>;
  verseFavs: Record<string, VerseFavorite>;
}

export interface LifeSingletons {
  financeConfig: FinanceConfig;
  screenConfig: ScreenConfig;
  routines: Routine[];
  timeCategories: TimeCategory[];
  purpose: PurposeData;
  prefs: LifePrefs;
}

export type LifeStore = LifeCollections & LifeSingletons;

export type CollectionKey = keyof LifeCollections;
export type SingletonKey = keyof LifeSingletons;

export const COLLECTION_KEYS: CollectionKey[] = [
  'transactions',
  'goals',
  'debts',
  'subjects',
  'evaluations',
  'studyLogs',
  'events',
  'tasks',
  'ideas',
  'wins',
  'timeEntries',
  'screenLogs',
  'routineLogs',
  'pauseLogs',
  'books',
  'people',
  'interactions',
  'prayers',
  'readings',
  'reviews',
  'letters',
  'verseFavs',
];

export const SINGLETON_KEYS: SingletonKey[] = [
  'financeConfig',
  'screenConfig',
  'routines',
  'timeCategories',
  'purpose',
  'prefs',
];

export type CollectionItem<K extends CollectionKey> = LifeCollections[K][string];
