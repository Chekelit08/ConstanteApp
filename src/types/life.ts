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
  externalId?: string; // movimiento importado (Mercado Pago…), evita duplicados
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

export interface ImportRule {
  type: TxType;
  category: string;
  include: boolean;
}

export interface FinanceConfig {
  savingsPercent: number; // % del ingreso al ahorro (plan: 15%)
  funPercent: number; // % fondo de gustos (plan: 5%)
  momContributionMin: number; // aporte mensual a mamá (plan: 100k–150k)
  momContributionMax: number;
  usdRate: number; // cotización manual o traída de dolarapi
  usdRateSource?: string;
  usdRateUpdatedAt?: string;
  importRules?: Record<string, ImportRule>;
  scale?: ScaleConfig; // lo que aprendió el importador de tus correcciones
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
  source: 'event' | 'class' | 'evaluation' | 'birthday' | 'task' | 'system' | 'external';
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
  phone?: string;
  prayFor?: string;
  cares?: string; // lo que le importa / para acordarme
  gifts?: string; // ideas de regalo
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
// CURSOS / APRENDIZAJE
// ─────────────────────────────────────────────────────────────
export type CourseStatus = 'por_ver' | 'viendo' | 'visto' | 'aplicado';

export interface CourseAction {
  id: string;
  kind: 'task' | 'habit';
  refId: string;
  text: string;
}

export interface Course {
  id: string;
  title: string;
  author?: string;
  url?: string;
  area: LifeArea;
  status: CourseStatus;
  ideas: string; // las 3 ideas clave (tus notas)
  summary?: string; // resumen del video
  keyIdeas?: string[];
  suggested?: string[]; // acciones sugeridas para aplicar
  minutes?: number;
  actions: CourseAction[]; // "nota → acción": un curso se cierra cuando lo aplicaste
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// PLAN DEL DÍA Y REVISIONES
// ─────────────────────────────────────────────────────────────
export interface PlanItem {
  id: string;
  text: string;
  done: boolean;
}

/** "¿Qué es lo más importante hoy?" */
export interface DayPlan {
  id: string; // = date
  date: string;
  top: string;
  topDone: boolean;
  others: PlanItem[]; // hasta 3
  updatedAt: string;
}

export interface WeeklyReview {
  id: string; // lunes de la semana revisada (YYYY-MM-DD)
  weekStart: string;
  wentWell: string;
  improve: string;
  missionRead: boolean;
  nextFocus: string; // la prioridad de la semana que viene
  nextGoals: { roleId: string; text: string; done: boolean }[]; // logros por rol para la semana siguiente
  createdAt: string;
  updatedAt: string;
}

export type MatchState = 'ganando' | 'empatando' | 'perdiendo';

export interface QuarterReview {
  id: string; // 2026-Q4
  quarter: string;
  missionChange: string;
  visionChange: string;
  objectives: { text: string; met: boolean | null; why: string }[]; // revisión del trimestre que termina
  habitsReflection: string;
  match: Record<string, MatchState>; // por rol
  nextObjectives: string[]; // 1 a 3
  focus: string;
  dec31: string; // "mi yo del 31 de diciembre"
  createdAt: string;
  updatedAt: string;
}

/** Escala de objetivos: de la facturación de hoy a la meta (Visión a 5 años) */
export interface ScaleConfig {
  name: string; // ej. el nombre del emprendimiento
  startYear: number;
  startMonth?: string; // YYYY-MM en que arrancó la escala ("hoy")
  startRevenue: number; // USD/mes
  startHours: number; // h/semana
  targetYear: number;
  targetRevenue: number;
  targetHours: number;
  savePercent: number; // % que separás para invertir
  returnRate: number; // % anual
  logs: Record<string, { revenue: number; hours?: number }>; // YYYY-MM
  checks: Record<string, boolean>; // checklist del nivel
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
// HÁBITOS
// ─────────────────────────────────────────────────────────────
export type HabitSchedule = 'daily' | 'days' | 'weekly';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  area: LifeArea;
  kind: 'check' | 'count';
  target?: number; // para kind = count
  unit?: string;
  schedule: HabitSchedule;
  days?: number[]; // 0 = Lunes ... 6 = Domingo (schedule = days)
  timesPerWeek?: number; // schedule = weekly
  isNegative?: boolean; // "dejar de…": se marca el día que NO lo hiciste
  why?: string;
  minimum?: string; // hábito mínimo viable
  trigger?: string; // disparador: "cada vez que…"
  remindAt?: string; // HH:mm, aviso push
  reward?: string;
  challengeStart?: string; // reto de 30 días (hábito del mes)
  consolidatedAt?: string; // ya es automático
  archived?: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string; // = date
  date: string;
  values: Record<string, number>; // habitId -> valor (1 = hecho en check, 0.5 parcial, -1 no cumplí, -2 día libre)
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// ENFOQUE
// ─────────────────────────────────────────────────────────────
export interface FocusSession {
  id: string;
  date: string;
  start: string; // ISO
  minutes: number;
  area: LifeArea;
  subjectId?: string;
  label?: string;
  completed: boolean;
}

// ─────────────────────────────────────────────────────────────
// DIARIO / CIERRE DEL DÍA
// ─────────────────────────────────────────────────────────────
export interface DayEntry {
  id: string; // = date
  date: string;
  mood?: number; // 1..5
  energy?: number; // 1..5
  gratitude: string[];
  highlight?: string;
  learned?: string;
  improve?: string;
  note?: string;
  loveCheck?: 'amor' | 'presion'; // ¿desde el amor o desde la presión?
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// PREFERENCIAS DEL SISTEMA DE VIDA
// ─────────────────────────────────────────────────────────────
export interface LifePrefs {
  name: string;
  theme: 'dark' | 'light' | 'system';
  wakeTime: string; // para el "cielo del día"
  sleepTime: string;
  focusMinutes: number;
  breakMinutes: number;
  verseNotify: boolean;
  verseTime: string; // HH:mm
  lastVerseNotified?: string; // YYYY-MM-DD
  dailyStudyGoalMinutes: number; // 3 hs = 180
  booksPerYearGoal: number; // 12
  reminders?: ReminderPrefs;
  seedVersion: number;
}

/** Qué avisos push mandar (los minutos "antes" en 0 = apagado) */
export interface ReminderPrefs {
  classesLead: number;
  eventsLead: number;
  externalLead: number; // eventos de Google Calendar
  evaluations: boolean; // la noche anterior y 2 h antes
  tasks: boolean; // a la mañana del día que vencen
  birthdays: boolean;
  people?: boolean; // "hoy, cuidá a…"
  dayPlan?: boolean; // "¿qué es lo más importante hoy?"
  weeklyReview?: boolean; // domingo a la tarde
  habitReminders?: boolean; // hora propia de cada hábito
  habits: boolean; // si faltan hábitos a la noche
  habitsTime: string;
  closeDay: boolean;
  closeDayTime: string;
  morningTime: string; // hora de los avisos "del día"
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  classesLead: 15,
  eventsLead: 30,
  externalLead: 30,
  evaluations: true,
  tasks: true,
  birthdays: true,
  people: true,
  dayPlan: true,
  weeklyReview: true,
  habitReminders: true,
  habits: true,
  habitsTime: '21:00',
  closeDay: true,
  closeDayTime: '22:30',
  morningTime: '08:30',
};

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
  habits: Record<string, Habit>;
  habitLogs: Record<string, HabitLog>;
  focusSessions: Record<string, FocusSession>;
  days: Record<string, DayEntry>;
  dayPlans: Record<string, DayPlan>;
  weeklyReviews: Record<string, WeeklyReview>;
  quarterReviews: Record<string, QuarterReview>;
  courses: Record<string, Course>;
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
  'habits',
  'habitLogs',
  'focusSessions',
  'days',
  'dayPlans',
  'weeklyReviews',
  'quarterReviews',
  'courses',
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
