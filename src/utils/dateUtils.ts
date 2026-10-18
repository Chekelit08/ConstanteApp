/**
 * Date and calendar utilities configured for America/Argentina/Buenos_Aires (GMT-3)
 * Week starts on Monday.
 */

export const TIMEZONE = 'America/Argentina/Buenos_Aires';

export const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Returns today's date string YYYY-MM-DD in Argentina timezone
 */
export function getTodayDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Produces YYYY-MM-DD
}

/**
 * Convert YYYY-MM-DD to a Date object at noon (avoiding DST shifts)
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Format Date or YYYY-MM-DD string to Argentine Spanish readable date
 */
export function formatArgentineDate(
  dateOrStr: Date | string,
  options: { includeDayName?: boolean; shortMonth?: boolean } = {}
): string {
  const date = typeof dateOrStr === 'string' ? parseDateString(dateOrStr) : dateOrStr;
  const dayName = DAY_NAMES_FULL[getMondayIndexedDay(date)];
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();

  if (options.includeDayName) {
    return `${dayName} ${day} de ${month} de ${year}`;
  }
  return `${day} de ${month} de ${year}`;
}

/**
 * Returns 0 for Lunes, 1 for Martes, ... 6 for Domingo
 */
export function getMondayIndexedDay(date: Date): number {
  const jsDay = date.getDay(); // 0 is Sunday, 1 is Monday
  return (jsDay + 6) % 7;
}

/**
 * Returns array of date strings for an entire month YYYY-MM
 */
export function getDaysInMonth(year: number, monthIndex: number): string[] {
  const date = new Date(year, monthIndex, 1);
  const days: string[] = [];
  while (date.getMonth() === monthIndex) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/**
 * Returns array of 7 dates for the week containing the given date string (starts on Monday)
 */
export function getWeekDays(dateStr: string): string[] {
  const date = parseDateString(dateStr);
  const dayOfWeek = getMondayIndexedDay(date); // 0 = Mon
  
  // Go back to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
  }
  return days;
}

/**
 * Shift date string by N days
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compare two date strings YYYY-MM-DD
 */
export function isBeforeOrEqual(d1: string, d2: string): boolean {
  return d1 <= d2;
}

export function isAfter(d1: string, d2: string): boolean {
  return d1 > d2;
}
