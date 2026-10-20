import { ImportRule, TxType } from '../types/life';

export type { ImportRule };

/**
 * Importa movimientos de Mercado Pago (y otros bancos/billeteras) desde CSV, Excel o el PDF del resumen.
 * Detecta columnas por nombre, categoriza por palabras clave y aprende de tus correcciones.
 */

export interface ImportedRow {
  key: string; // id externo para no duplicar
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // con signo: + entra, − sale
  type: TxType;
  category: string;
  include: boolean;
  internal?: boolean; // movimiento entre tus cuentas (reservas, pago de tarjeta…)
}

// ── Números y fechas ──────────────────────────────────────────

export function parseMoney(raw: unknown): number | null {
  if (typeof raw === 'number') return isFinite(raw) ? raw : null;
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || /^-|-\s*\$|\$\s*-|−/.test(s) || /-$/.test(s);
  s = s.replace(/[^\d.,]/g, '');
  if (!s || !/\d/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // el que aparece último es el decimal
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const decimals = s.length - lastComma - 1;
    s = decimals <= 2 && s.split(',').length === 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts[1]?.length === 3 && parts[0].length <= 3)) s = s.replace(/\./g, '');
  }
  const n = Number(s);
  if (!isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/** Clave para movimientos sin ID: fecha+monto+descripción (+n° si se repite igual el mismo día) */
function fallbackKey(prefix: string, date: string, amount: number, description: string, seen: Map<string, number>): string {
  const base = `${prefix}:${date}:${amount}:${ruleKey(description)}`;
  const n = (seen.get(base) || 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : `${base}#${n}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) return `${raw.getUTCFullYear()}-${pad(raw.getUTCMonth() + 1)}-${pad(raw.getUTCDate())}`;
  if (typeof raw === 'number' && raw > 30000 && raw < 80000) {
    // número de serie de Excel
    const d = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(raw ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    const mo = Number(m[2]);
    const d = Number(m[1]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return null;
}

// ── Categorías ────────────────────────────────────────────────

const KEYWORDS: [RegExp, string][] = [
  [/\b(sube|uber|cabify|didi|ypf|shell|axion|puma energy|peaje|estacionamiento|subte|tren|colectivo|nafta)\b/i, 'Transporte'],
  [/\b(rappi|pedidos ?ya|mc ?donald|burger|mostaza|carrefour|coto|jumbo|disco|vea|changomas|supermercado|super\b|verduler|carnicer|panader|almac[eé]n|kiosco|starbucks|caf[eé]|havanna|grido|freddo|dia %|diarco|chino)/i, 'Comida'],
  [/\b(netflix|spotify|youtube|disney|hbo|max\b|prime video|amazon prime|apple|icloud|google (one|play|storage)|personal|claro|movistar|tuenti|chatgpt|openai|anthropic|claude|paramount|star\+|crunchyroll|canva|notion)/i, 'Celular & Suscripciones'],
  [/\b(gym|gimnasio|megatlon|sportclub|smart ?fit|farmacia|farmacity|osde|swiss medical|galeno|m[eé]dic|odont|kinesi)/i, 'Gym & Salud'],
  [/\b(udemy|coursera|platzi|domestika|librer[ií]a|cuspide|yenny|el ateneo|kindle|libro)/i, 'Libros & Cursos'],
  [/\b(zara|nike|adidas|dexter|grimoldi|h&m|mercado libre.*ropa|kevingston|equus|levi|vans|topper)/i, 'Ropa'],
  [/\b(cine|cinemark|hoyts|showcase|bar\b|cervecer|ticketek|passline|all ?access|boliche|pizzer|parrilla|restaurant|resto\b|sushi|helad)/i, 'Salidas'],
  [/\b(iglesia|ofrenda|diezmo|ministerio)/i, 'Iglesia / Ofrenda'],
  [/\b(universidad|facultad|uba\b|utn|unlam|unsam|austral|cbc|apunte|fotocopia|cuota universitaria)/i, 'Facultad'],
  [/\b(despegar|aerol[ií]neas|flybondi|jetsmart|airbnb|hotel|booking|almundo|turismo)/i, 'Viajes'],
  [/\b(regalo|florer[ií]a)/i, 'Regalos'],
];

const INCOME_KEYWORDS: [RegExp, string][] = [
  [/\b(sueldo|haberes|salario|n[oó]mina|smv)\b/i, 'Sueldo SMV'],
  [/\baguinaldo|\bsac\b/i, 'Aguinaldo'],
  [/\b(rendimiento|inter[eé]s)/i, 'Otros ingresos'],
];

// movimientos que no son gasto ni ingreso real (se traen destildados)
const INTERNAL = /(reserv|dinero reservado|retiro de reserva|ingreso de dinero|pago de (tu |la )?tarjeta|pago tarjeta|resumen de tarjeta|transferencia (entre|a) (tus|mis) cuentas|inversi[oó]n|fondo com[uú]n|compra de d[oó]lar|venta de d[oó]lar|carga de saldo)/i;

/** Clave estable para aprender: la descripción sin números ni ruido */
export function ruleKey(description: string): string {
  return description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\d#*.,:;/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 4)
    .join(' ');
}

export function categorize(description: string, amount: number, rules: Record<string, ImportRule>): Pick<ImportedRow, 'type' | 'category' | 'include' | 'internal'> {
  const learned = rules[ruleKey(description)];
  if (learned) return { ...learned, internal: !learned.include };
  if (INTERNAL.test(description)) return { type: amount >= 0 ? 'income' : 'expense', category: amount >= 0 ? 'Otros ingresos' : 'Otros', include: false, internal: true };
  if (amount >= 0) {
    const hit = INCOME_KEYWORDS.find(([re]) => re.test(description));
    return { type: 'income', category: hit?.[1] || 'Otros ingresos', include: true };
  }
  const hit = KEYWORDS.find(([re]) => re.test(description));
  return { type: 'expense', category: hit?.[1] || 'Otros', include: true };
}

// ── Lectura de archivos ───────────────────────────────────────

type Grid = unknown[][];

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const COLS = {
  date: [/^fecha$/, /fecha de (origen|operacion|creacion|aprobacion|liberacion)/, /^transaction_date$/, /^date$/, /^date_created$/, /^fecha/],
  desc: [/^descripcion/, /^detalle/, /^concepto/, /^description$/, /^transaction_type$/, /^tipo de operacion/, /^operacion$/, /^movimiento/],
  amount: [/^settlement_net_amount$/, /^net_amount$/, /^valor$/, /^monto( neto)?$/, /^importe/, /^neto/, /^transaction_amount$/, /^amount$/, /^monto/],
  credit: [/^net_credit_amount$/, /^credito/, /^ingreso/, /^haber$/],
  debit: [/^net_debit_amount$/, /^debito/, /^egreso/, /^debe$/],
  id: [/^source_id$/, /id de (la )?operacion/, /numero de operacion/, /^id$/, /^operation_id$/, /^reference_id$/, /^external_reference$/],
};

function findCol(header: string[], patterns: RegExp[]): number {
  for (const re of patterns) {
    const i = header.findIndex((h) => re.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

function gridToRows(grid: Grid, prefix: string): Omit<ImportedRow, 'type' | 'category' | 'include' | 'internal'>[] {
  // buscar la fila de encabezados en las primeras 15
  for (let h = 0; h < Math.min(15, grid.length); h++) {
    const header = grid[h].map(norm);
    const c = {
      date: findCol(header, COLS.date),
      desc: findCol(header, COLS.desc),
      amount: findCol(header, COLS.amount),
      credit: findCol(header, COLS.credit),
      debit: findCol(header, COLS.debit),
      id: findCol(header, COLS.id),
    };
    if (c.date < 0 || (c.amount < 0 && c.credit < 0 && c.debit < 0)) continue;
    const out: Omit<ImportedRow, 'type' | 'category' | 'include' | 'internal'>[] = [];
    const seen = new Map<string, number>();
    grid.slice(h + 1).forEach((row) => {
      const date = parseDate(row[c.date]);
      if (!date) return;
      let amount = c.amount >= 0 ? parseMoney(row[c.amount]) : null;
      if (amount === null || amount === 0) {
        const cr = c.credit >= 0 ? parseMoney(row[c.credit]) || 0 : 0;
        const db = c.debit >= 0 ? parseMoney(row[c.debit]) || 0 : 0;
        amount = Math.abs(cr) - Math.abs(db);
      }
      if (!amount) return;
      const description = String((c.desc >= 0 ? row[c.desc] : '') || 'Movimiento').trim();
      const id = c.id >= 0 ? String(row[c.id] ?? '').trim() : '';
      out.push({ key: id ? `${prefix}:${id}:${amount < 0 ? 'd' : 'c'}` : fallbackKey(prefix, date, amount, description, seen), date, description, amount });
    });
    if (out.length) return out;
  }
  return [];
}

function parseCsv(text: string): Grid {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const sep = [';', ',', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Texto del resumen PDF: una línea por renglón (agrupando por altura) */
async function pdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    content.items.forEach((it) => {
      if (!('str' in it) || !it.str.trim()) return;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: it.transform[4], s: it.str.trim() });
    });
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => lines.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ')));
  }
  return lines;
}

const MONEY_RE = /-?\s?\$\s?-?\s?[\d.]+,\d{2}|-?[\d.]{1,15},\d{2}/g;

/** Renglones tipo "01-10-2026 Pago en Rappi 123456789012 $ -5.400,00 $ 120.000,00" */
export function parseStatementLines(lines: string[], prefix: string) {
  const out: Omit<ImportedRow, 'type' | 'category' | 'include' | 'internal'>[] = [];
  let pending: { date: string; text: string } | null = null;
  const seen = new Map<string, number>();
  const flush = (line: string, date: string) => {
    const amounts = line.match(MONEY_RE) || [];
    if (!amounts.length) return false;
    // con 2 montos: [valor, saldo]; con 1: valor
    const amount = parseMoney(amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0]);
    if (!amount) return true;
    const firstMoney = line.search(MONEY_RE);
    let desc = line.slice(0, firstMoney).replace(/^\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\s*/, '');
    const idMatch = desc.match(/\b(\d{9,14})\b\s*$/);
    desc = (idMatch ? desc.slice(0, idMatch.index) : desc).replace(/\s+/g, ' ').trim() || 'Movimiento';
    out.push({ key: idMatch ? `${prefix}:${idMatch[1]}:${amount < 0 ? 'd' : 'c'}` : fallbackKey(prefix, date, amount, desc, seen), date, description: desc, amount });
    return true;
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const dm = line.match(/^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/);
    if (dm) {
      const date = parseDate(dm[1]);
      if (!date) continue;
      if (!flush(line, date)) pending = { date, text: line };
      else pending = null;
    } else if (pending) {
      // descripción partida en dos renglones
      const joined = `${pending.text} ${line}`;
      if (flush(joined, pending.date)) pending = null;
      else pending.text = joined;
    }
  }
  return out;
}

export async function readBankFile(file: File, rules: Record<string, ImportRule>): Promise<ImportedRow[]> {
  const prefix = 'mp';
  const name = file.name.toLowerCase();
  let base: Omit<ImportedRow, 'type' | 'category' | 'include' | 'internal'>[];
  if (name.endsWith('.pdf')) {
    base = parseStatementLines(await pdfLines(file), prefix);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const { default: readXlsxFile } = await import('read-excel-file');
    base = gridToRows((await readXlsxFile(file)) as Grid, prefix);
  } else {
    const text = await file.text();
    base = gridToRows(parseCsv(text.replace(/^﻿/, '')), prefix);
    if (!base.length) base = parseStatementLines(text.split(/\r?\n/), prefix);
  }
  return base.map((r) => ({ ...r, ...categorize(r.description, r.amount, rules) })).sort((a, b) => b.date.localeCompare(a.date));
}
