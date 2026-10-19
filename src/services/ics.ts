import { addDays } from '../utils/dateUtils';

/**
 * Lector de calendarios .ics (Google Calendar, iCloud, Outlook).
 * Expande eventos repetidos dentro de un rango y lleva todo a la hora de Argentina.
 */

export interface ExternalEvent {
  uid: string;
  date: string; // YYYY-MM-DD (hora AR)
  start?: string; // HH:mm
  end?: string;
  allDay: boolean;
  title: string;
  location?: string;
}

interface RawProp {
  value: string;
  params: Record<string, string>;
}

interface RawEvent {
  props: Record<string, RawProp[]>;
}

const AR_OFFSET_MIN = -180; // Argentina no tiene horario de verano

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  // NOMBRE;PARAM=V;PARAM="V:X":valor (los dos puntos dentro de comillas no cortan)
  let inQuote = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ':' && !inQuote) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(';');
  const params: Record<string, string> = {};
  paramParts.forEach((p) => {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  });
  return { name: name.toUpperCase(), params, value };
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

function readEvents(text: string): RawEvent[] {
  const out: RawEvent[] = [];
  let cur: RawEvent | null = null;
  let depth = 0; // ignorar VALARM y otros bloques anidados
  for (const line of unfold(text)) {
    if (!line) continue;
    if (line === 'BEGIN:VEVENT') {
      cur = { props: {} };
      depth = 0;
      continue;
    }
    if (!cur) continue;
    if (line === 'END:VEVENT') {
      out.push(cur);
      cur = null;
      continue;
    }
    if (line.startsWith('BEGIN:')) {
      depth++;
      continue;
    }
    if (line.startsWith('END:')) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth > 0) continue;
    const p = parseLine(line);
    if (!p) continue;
    (cur.props[p.name] ||= []).push({ value: p.value, params: p.params });
  }
  return out;
}

// ── Fechas ────────────────────────────────────────────────────

/** Desfase (min) de una zona horaria en un instante dado, ej. Europe/Madrid → +60/+120 */
function tzOffsetMinutes(tz: string, utcMs: number): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(utcMs));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    return Math.round((asUtc - utcMs) / 60000);
  } catch {
    return AR_OFFSET_MIN;
  }
}

interface Stamp {
  allDay: boolean;
  /** para allDay: fecha; para hora: instante UTC en ms */
  date?: string;
  utc?: number;
}

function parseStamp(prop: RawProp | undefined): Stamp | null {
  if (!prop) return null;
  const v = prop.value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (prop.params.VALUE === 'DATE' || h === undefined) return { allDay: true, date: `${y}-${mo}-${d}` };
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0));
  if (z) return { allDay: false, utc: wall };
  const tz = prop.params.TZID;
  if (!tz) return { allDay: false, utc: wall - AR_OFFSET_MIN * 60000 }; // hora "flotante": se toma como hora local
  // convertir hora de pared en tz → UTC (dos pasadas por si cae en cambio de horario)
  let guess = wall - tzOffsetMinutes(tz, wall) * 60000;
  guess = wall - tzOffsetMinutes(tz, guess) * 60000;
  return { allDay: false, utc: guess };
}

function utcToAr(utc: number): { date: string; time: string } {
  const d = new Date(utc + AR_OFFSET_MIN * 60000);
  const iso = d.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function stampKey(s: Stamp): string {
  return s.allDay ? s.date! : String(s.utc);
}

// ── Repeticiones ──────────────────────────────────────────────

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function parseRrule(v: string): Record<string, string> {
  const out: Record<string, string> = {};
  v.split(';').forEach((kv) => {
    const [k, val] = kv.split('=');
    if (k && val) out[k.toUpperCase()] = val;
  });
  return out;
}

/** Genera los inicios de cada repetición (como Stamp) hasta `limit` */
function expand(start: Stamp, rule: Record<string, string>, rangeEndMs: number): Stamp[] {
  const freq = rule.FREQ;
  const interval = Math.max(1, Number(rule.INTERVAL) || 1);
  const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const untilStamp = rule.UNTIL ? parseStamp({ value: rule.UNTIL, params: {} }) : null;
  const untilMs = untilStamp ? (untilStamp.allDay ? Date.parse(`${untilStamp.date}T23:59:59Z`) : untilStamp.utc!) : Infinity;
  const byDay = rule.BYDAY ? rule.BYDAY.split(',').map((d) => d.slice(-2)) : null;
  const byMonthDay = rule.BYMONTHDAY ? rule.BYMONTHDAY.split(',').map(Number) : null;

  // trabajamos sobre la fecha/hora de pared AR para que las repeticiones mantengan la hora local
  const base = start.allDay ? { date: start.date!, time: '00:00' } : utcToAr(start.utc!);
  const timeMs = start.allDay ? 0 : (Number(base.time.slice(0, 2)) * 60 + Number(base.time.slice(3))) * 60000;
  const toStamp = (date: string): Stamp => (start.allDay ? { allDay: true, date } : { allDay: false, utc: Date.parse(`${date}T00:00:00Z`) + timeMs - AR_OFFSET_MIN * 60000 });
  const msOf = (date: string) => Date.parse(`${date}T00:00:00Z`) + timeMs;

  const out: Stamp[] = [];
  const push = (date: string): boolean => {
    if (date < base.date) return true;
    if (out.length >= count) return false;
    const ms = msOf(date);
    if (ms > untilMs || ms - AR_OFFSET_MIN * 60000 > rangeEndMs) return false;
    out.push(toStamp(date));
    return true;
  };

  const [y0, m0, d0] = base.date.split('-').map(Number);
  const MAX = 3000;
  if (freq === 'DAILY') {
    for (let i = 0; i < MAX; i++) if (!push(addDays(base.date, i * interval))) break;
  } else if (freq === 'WEEKLY') {
    const days = byDay?.length ? byDay : [WEEKDAYS[new Date(Date.UTC(y0, m0 - 1, d0)).getUTCDay()]];
    const dow = new Date(Date.UTC(y0, m0 - 1, d0)).getUTCDay();
    const weekStart = addDays(base.date, -((dow + 6) % 7)); // lunes
    outer: for (let w = 0; w < MAX; w++) {
      const monday = addDays(weekStart, w * 7 * interval);
      for (let k = 0; k < 7; k++) {
        const d = addDays(monday, k);
        const wd = WEEKDAYS[(k + 1) % 7];
        if (days.includes(wd) && !push(d)) break outer;
      }
    }
  } else if (freq === 'MONTHLY') {
    for (let i = 0; i < MAX; i++) {
      const mIdx = m0 - 1 + i * interval;
      const y = y0 + Math.floor(mIdx / 12);
      const mo = (mIdx % 12) + 1;
      const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const ym = `${y}-${String(mo).padStart(2, '0')}`;
      let dates: string[] = [];
      if (byDay && /^[+-]?\d/.test(rule.BYDAY)) {
        // ej. 2MO (segundo lunes) o -1FR (último viernes)
        dates = rule.BYDAY.split(',').map((spec) => {
          const n = parseInt(spec, 10);
          const wd = WEEKDAYS.indexOf(spec.slice(-2));
          const matches: number[] = [];
          for (let day = 1; day <= dim; day++) if (new Date(Date.UTC(y, mo - 1, day)).getUTCDay() === wd) matches.push(day);
          const day = n > 0 ? matches[n - 1] : matches[matches.length + n];
          return day ? `${ym}-${String(day).padStart(2, '0')}` : '';
        });
      } else {
        dates = (byMonthDay || [d0]).map((day) => (day <= dim && day > 0 ? `${ym}-${String(day).padStart(2, '0')}` : ''));
      }
      let stop = false;
      for (const d of dates.filter(Boolean).sort()) if (!push(d)) { stop = true; break; }
      if (stop) break;
    }
  } else if (freq === 'YEARLY') {
    for (let i = 0; i < MAX / 10; i++) {
      const y = y0 + i * interval;
      const d = `${y}-${String(m0).padStart(2, '0')}-${String(d0).padStart(2, '0')}`;
      if (m0 === 2 && d0 === 29 && new Date(Date.UTC(y, 1, 29)).getUTCMonth() !== 1) continue;
      if (!push(d)) break;
    }
  } else {
    out.push(start);
  }
  return out;
}

// ── API ──────────────────────────────────────────────────────

/** Eventos del .ics que caen entre `from` y `to` (YYYY-MM-DD, inclusive), ya en hora AR */
export function parseIcs(text: string, from: string, to: string): ExternalEvent[] {
  const raw = readEvents(text);
  const rangeStartMs = Date.parse(`${from}T03:00:00Z`);
  const rangeEndMs = Date.parse(`${addDays(to, 1)}T03:00:00Z`);
  const first = (e: RawEvent, k: string) => e.props[k]?.[0];

  // excepciones de una serie (RECURRENCE-ID) reemplazan a la repetición original
  const overrides = new Map<string, Set<string>>();
  raw.forEach((e) => {
    const rid = parseStamp(first(e, 'RECURRENCE-ID'));
    const uid = first(e, 'UID')?.value;
    if (rid && uid) {
      if (!overrides.has(uid)) overrides.set(uid, new Set());
      overrides.get(uid)!.add(stampKey(rid));
    }
  });

  const out: ExternalEvent[] = [];
  raw.forEach((e, idx) => {
    if (first(e, 'STATUS')?.value.toUpperCase() === 'CANCELLED') return;
    const start = parseStamp(first(e, 'DTSTART'));
    if (!start) return;
    const uid = first(e, 'UID')?.value || `ev${idx}`;
    const title = unescapeText(first(e, 'SUMMARY')?.value || '(sin título)');
    const location = first(e, 'LOCATION') ? unescapeText(first(e, 'LOCATION')!.value) || undefined : undefined;
    const end = parseStamp(first(e, 'DTEND'));
    const durMatch = first(e, 'DURATION')?.value.match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
    const durationMs = end
      ? end.allDay && start.allDay
        ? Date.parse(`${end.date}T00:00:00Z`) - Date.parse(`${start.date}T00:00:00Z`)
        : (end.utc ?? 0) - (start.utc ?? 0)
      : durMatch
        ? (((Number(durMatch[1]) || 0) * 7 + (Number(durMatch[2]) || 0)) * 1440 + (Number(durMatch[3]) || 0) * 60 + (Number(durMatch[4]) || 0)) * 60000
        : start.allDay
          ? 86400000
          : 3600000;

    const isOverride = !!first(e, 'RECURRENCE-ID');
    const rrule = first(e, 'RRULE');
    let starts: Stamp[] = rrule && !isOverride ? expand(start, parseRrule(rrule.value), rangeEndMs) : [start];

    const excluded = new Set<string>();
    (e.props.EXDATE || []).forEach((p) =>
      p.value.split(',').forEach((v) => {
        const s = parseStamp({ value: v, params: p.params });
        if (s) excluded.add(stampKey(s));
      })
    );
    const replaced = !isOverride ? overrides.get(uid) : undefined;
    starts = starts.filter((s) => !excluded.has(stampKey(s)) && !replaced?.has(stampKey(s)));

    starts.forEach((s) => {
      if (s.allDay) {
        const days = Math.max(1, Math.round(durationMs / 86400000));
        for (let i = 0; i < days; i++) {
          const d = addDays(s.date!, i);
          if (d < from || d > to) continue;
          out.push({ uid: `${uid}-${d}`, date: d, allDay: true, title, location });
        }
      } else {
        const endMs = s.utc! + Math.max(0, durationMs);
        if (endMs < rangeStartMs || s.utc! > rangeEndMs) return;
        const a = utcToAr(s.utc!);
        const b = utcToAr(endMs);
        if (a.date < from || a.date > to) return;
        out.push({ uid: `${uid}-${s.utc}`, date: a.date, start: a.time, end: b.date === a.date ? b.time : '23:59', allDay: false, title, location });
      }
    });
  });
  return out.sort((x, y) => (x.date + (x.start || '')).localeCompare(y.date + (y.start || '')));
}
