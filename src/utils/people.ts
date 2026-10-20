import { Interaction, Person } from '../types/life';
import { daysBetween } from './lifeUtils';

export function lastContact(personId: string, interactions: Interaction[]): string | undefined {
  return interactions
    .filter((i) => i.personId === personId && i.kind !== 'oracion')
    .map((i) => i.date)
    .sort()
    .pop();
}

export function contactStatus(p: Person, interactions: Interaction[], today: string) {
  const last = lastContact(p.id, interactions);
  const days = last ? daysBetween(last, today) : undefined;
  const every = p.contactEveryDays;
  // Sin registros: se cuenta desde que la persona fue agregada
  const since = days ?? daysBetween(p.createdAt.slice(0, 10), today);
  const overdue = every ? since > every : false;
  const dueSoon = every && days !== undefined ? days >= every - 1 && !overdue : false;
  // "calidez": 1 = recién hablaron, 0 = se pasó el plazo
  const warmth = every ? Math.max(0, Math.min(1, 1 - since / every)) : days === undefined ? 0.5 : Math.max(0.15, 1 - days / 30);
  return { last, days, since, overdue, dueSoon, warmth };
}

export function warmthColor(w: number, overdue: boolean): string {
  if (overdue) return 'var(--danger)';
  if (w < 0.3) return 'var(--gold)';
  return 'var(--mint)';
}

export function nextBirthday(p: Person, today: string): { date: string; inDays: number } | null {
  if (!p.birthday) return null;
  let d = `${today.slice(0, 4)}-${p.birthday}`;
  if (d < today) d = `${Number(today.slice(0, 4)) + 1}-${p.birthday}`;
  return { date: d, inDays: daysBetween(today, d) };
}

export function nextBirthdays(people: Person[], today: string, withinDays = 45) {
  return people
    .map((p) => ({ p, nb: nextBirthday(p, today) }))
    .filter((x): x is { p: Person; nb: { date: string; inDays: number } } => !!x.nb && x.nb.inDays <= withinDays)
    .map(({ p, nb }) => ({ p, date: nb.date, inDays: nb.inDays }))
    .sort((a, b) => a.inDays - b.inDays);
}

const GROUP_WEIGHT: Record<string, number> = { familia: 1.3, elegidos: 1.3, mentores: 1.1, amigos: 1, iglesia: 1, trabajo: 0.8 };

/** A quién conviene cuidar hoy, con el motivo */
export function peopleToCare(people: Person[], interactions: Interaction[], today: string, limit = 3) {
  return people
    .map((p) => {
      const st = contactStatus(p, interactions, today);
      const nb = nextBirthday(p, today);
      let score = 0;
      let reason = '';
      if (nb && nb.inDays <= 1) {
        score = 100 - nb.inDays;
        reason = nb.inDays === 0 ? '🎂 ¡Hoy es su cumpleaños!' : '🎂 Mañana cumple años';
      } else if (p.contactEveryDays) {
        const ratio = st.since / p.contactEveryDays;
        score = ratio * (GROUP_WEIGHT[p.group] || 1) * 10;
        reason = st.days === undefined ? 'Todavía no registraste ningún momento' : `Hace ${st.days} ${st.days === 1 ? 'día' : 'días'} · tu meta es cada ${p.contactEveryDays}`;
      }
      return { p, st, score, reason };
    })
    .filter((x) => x.score >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

const AVATAR_COLORS = ['#ff8a5b', '#8fb3ff', '#b69cff', '#5fd4a8', '#ffc861', '#ff6b9a'];
export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/** Normaliza un teléfono argentino para WhatsApp: 11 1234-5678 → 5491112345678 */
export function waNumber(phone?: string): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) {
    d = d.slice(2);
    if (d.startsWith('9')) d = d.slice(1);
  }
  if (d.startsWith('0')) d = d.slice(1);
  // quitar el 15 de celulares viejos (ej. 11 15 1234 5678)
  const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
  if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
  if (d.length !== 10) return phone.replace(/\D/g, '').length >= 11 ? phone.replace(/\D/g, '') : null; // número extranjero
  return `549${d}`;
}

export function waLink(phone: string | undefined, text: string): string | null {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

export function telLink(phone?: string): string | null {
  const d = phone?.replace(/[^\d+]/g, '');
  return d ? `tel:${d}` : null;
}

export function greetingFor(p: Person, birthdayToday: boolean): string {
  const first = p.name.split(' ')[0];
  return birthdayToday ? `¡Feliz cumple, ${first}! 🎉 Que Dios te bendiga mucho en este nuevo año.` : `¡Hola ${first}! ¿Cómo andás?`;
}

// ── Importar contactos (.vcf del iPhone / Google) ─────────────
export interface VCardContact {
  name: string;
  phone?: string;
  birthday?: string; // MM-DD
}

export function parseVCards(text: string): VCardContact[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const out: VCardContact[] = [];
  let cur: VCardContact | null = null;
  let n = '';
  for (const line of lines) {
    const up = line.toUpperCase();
    if (up.startsWith('BEGIN:VCARD')) {
      cur = { name: '' };
      n = '';
    } else if (up.startsWith('END:VCARD')) {
      if (cur) {
        if (!cur.name && n) cur.name = n;
        if (cur.name) out.push(cur);
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const key = line.slice(0, idx).split(';')[0].replace(/^item\d+\./i, '').toUpperCase();
      const val = line.slice(idx + 1).trim();
      if (key === 'FN') cur.name = val.replace(/\\,/g, ',');
      else if (key === 'N') n = val.split(';').slice(0, 2).reverse().filter(Boolean).join(' ').trim();
      else if (key === 'TEL' && !cur.phone) cur.phone = val;
      else if (key === 'BDAY') {
        const m = val.match(/(\d{4}|--)-?(\d{2})-?(\d{2})/);
        if (m) cur.birthday = `${m[2]}-${m[3]}`;
      }
    }
  }
  return out;
}
