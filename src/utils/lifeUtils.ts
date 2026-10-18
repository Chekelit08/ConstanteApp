import { FocusSession } from '../types/focus';
import { CalendarEvent, Currency, Transaction } from '../types/life';
import { getLocalData } from '../services/dataStorage';
import { addDays, parseDateString, getMondayIndexedDay, getTodayDateString, TIMEZONE } from './dateUtils';

/** Id corto, compatible con las reglas de Firestore (^[a-zA-Z0-9_-]+$) */
export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────
// Dinero
// ─────────────────────────────────────────────────────────────
const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number, currency: Currency = 'ARS'): string {
  if (!isFinite(amount)) return '—';
  return currency === 'USD' ? usdFormatter.format(amount).replace('US$', 'US$ ') : arsFormatter.format(amount);
}

/** Formato compacto: $ 1,2 M · $ 850 k */
export function formatCompactArs(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$ ${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',')} M`;
  if (abs >= 1_000) return `${sign}$ ${Math.round(abs / 1_000)} k`;
  return `${sign}$ ${Math.round(abs)}`;
}

export function toArs(amount: number, currency: Currency, usdRate: number): number {
  return currency === 'USD' ? amount * (usdRate || 0) : amount;
}

export function toUsd(amount: number, currency: Currency, usdRate: number): number {
  if (currency === 'USD') return amount;
  return usdRate > 0 ? amount / usdRate : 0;
}

/** Monto en USD de una transacción usando la cotización guardada en la operación (o la actual) */
export function txUsd(tx: Transaction, fallbackRate: number): number {
  return toUsd(tx.amount, tx.currency, tx.usdRate || fallbackRate);
}

export function txArs(tx: Transaction, fallbackRate: number): number {
  return toArs(tx.amount, tx.currency, tx.usdRate || fallbackRate);
}

/** Parsea "150.000", "150000", "1,5" de forma tolerante */
export function parseAmount(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/\s|\$/g, '');
  // Si tiene coma decimal (formato AR): 1.500,50
  if (cleaned.includes(',')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Solo puntos: si son separadores de miles (150.000)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, '')) || 0;
  }
  return Number(cleaned) || 0;
}

// ─────────────────────────────────────────────────────────────
// Fechas y horas
// ─────────────────────────────────────────────────────────────
export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKey(getTodayDateString());
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${names[m - 1]} ${y}`;
}

export function dayOfYear(dateStr: string): number {
  const d = parseDateString(dateStr);
  const start = new Date(d.getFullYear(), 0, 1, 12);
  return Math.round((d.getTime() - start.getTime()) / 86400000);
}

export function daysBetween(fromStr: string, toStr: string): number {
  return Math.round((parseDateString(toStr).getTime() - parseDateString(fromStr).getTime()) / 86400000);
}

export function timeToMinutes(t?: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Hora actual en Argentina HH:mm */
export function nowTimeAR(): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function isoToLocalDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function isoToLocalTime(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function relativeDayLabel(dateStr: string, today = getTodayDateString()): string {
  const diff = daysBetween(today, dateStr);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff < 7) return `En ${diff} días`;
  if (diff < -1 && diff > -7) return `Hace ${-diff} días`;
  const d = parseDateString(dateStr);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/** Último domingo del mes (día de la revisión mensual) */
export function lastSundayOfMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0, 12);
  while (last.getDay() !== 0) last.setDate(last.getDate() - 1);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

export function quarterOf(dateStr: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const m = Number(dateStr.slice(5, 7));
  if (m <= 3) return 'Q1';
  if (m <= 6) return 'Q2';
  if (m <= 9) return 'Q3';
  return 'Q4';
}

// ─────────────────────────────────────────────────────────────
// Recurrencia de eventos
// ─────────────────────────────────────────────────────────────
export function eventOccursOn(ev: CalendarEvent, dateStr: string): boolean {
  if (dateStr < ev.date) return false;
  if (ev.recurrenceUntil && dateStr > ev.recurrenceUntil) return false;
  if (ev.recurrence === 'none') return dateStr === ev.date;
  if (ev.recurrence === 'daily') return true;
  if (ev.recurrence === 'weekly') {
    return getMondayIndexedDay(parseDateString(ev.date)) === getMondayIndexedDay(parseDateString(dateStr));
  }
  if (ev.recurrence === 'monthly') return ev.date.slice(8) === dateStr.slice(8);
  if (ev.recurrence === 'yearly') return ev.date.slice(5) === dateStr.slice(5);
  return false;
}

// ─────────────────────────────────────────────────────────────
// Sesiones de enfoque (se guardan en dos claves históricas: se unifican)
// ─────────────────────────────────────────────────────────────
export function getAllFocusSessions(userId: string): FocusSession[] {
  const a = getLocalData<FocusSession[]>(`focus_sessions_${userId}`, []);
  const b = getLocalData<FocusSession[]>('constante_focus_sessions', []);
  const map = new Map<string, FocusSession>();
  [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach((s) => {
    if (s && s.id) map.set(s.id, s);
  });
  return Array.from(map.values());
}

const STUDY_TAG_RE = /estud|facu|univ|parcial|final|materia|lectura t[eé]cnica/i;

export function isStudySession(s: FocusSession): boolean {
  return s.mode === 'study' || STUDY_TAG_RE.test(s.tag || '') || STUDY_TAG_RE.test(s.taskName || '');
}

// ─────────────────────────────────────────────────────────────
// Exportar .ics (Google Calendar, Calendario de iPhone)
// ─────────────────────────────────────────────────────────────
function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function icsDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function icsDateTime(dateStr: string, time: string): string {
  return `${icsDate(dateStr)}T${time.replace(':', '')}00`;
}

/** Corta líneas a 75 octetos aprox. como pide RFC 5545 */
function foldLine(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 0) {
    parts.push(' ' + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  return parts.join('\r\n');
}

export interface IcsEventInput {
  uid: string;
  title: string;
  date: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  rrule?: string; // ej: FREQ=WEEKLY;UNTIL=20261128
  alarmMinutesBefore?: number;
}

export function buildIcs(calendarName: string, events: IcsEventInput[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CONSTANTE//Sistema de Vida//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
  ];

  events.forEach((ev) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}@constante.app`);
    lines.push(`DTSTAMP:${stamp}`);
    if (ev.allDay || !ev.start) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(ev.date)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(addDays(ev.date, 1))}`);
    } else {
      lines.push(`DTSTART;TZID=${TIMEZONE}:${icsDateTime(ev.date, ev.start)}`);
      const end = ev.end || minutesToTime(timeToMinutes(ev.start) + 60);
      lines.push(`DTEND;TZID=${TIMEZONE}:${icsDateTime(ev.date, end)}`);
    }
    if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
    if (typeof ev.alarmMinutesBefore === 'number') {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${icsEscape(ev.title)}`);
      lines.push(`TRIGGER:-PT${Math.max(0, ev.alarmMinutesBefore)}M`);
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function recurrenceToRrule(ev: CalendarEvent): string | undefined {
  const until = ev.recurrenceUntil ? `;UNTIL=${icsDate(ev.recurrenceUntil)}` : '';
  switch (ev.recurrence) {
    case 'daily':
      return `FREQ=DAILY${until}`;
    case 'weekly':
      return `FREQ=WEEKLY${until}`;
    case 'monthly':
      return `FREQ=MONTHLY${until}`;
    case 'yearly':
      return `FREQ=YEARLY${until}`;
    default:
      return undefined;
  }
}

/** Convierte a CSV seguro (comillas dobles escapadas) */
export function toCsv(rows: (string | number | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = cell === undefined || cell === null ? '' : String(cell);
          return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\n');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pct(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 100);
}
