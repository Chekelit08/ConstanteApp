import React, { useMemo, useState } from 'react';
import { Check, LineChart, Pencil, Plus } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { ScaleConfig } from '../types/life';
import { getTodayDateString } from '../utils/dateUtils';
import { btnGhost, btnPrimary, btnSecondary, Card, Field, inputCls, Modal } from './ui';

/**
 * Escala de objetivos (ENS 2026 · Superhábitos): de lo que facturás hoy a tu visión a 5 años
 * con un crecimiento anual compuesto, más los niveles del emprendedor.
 */

const usd = (n: number) => `USD ${Math.round(n).toLocaleString('es-AR')}`;
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

/** Años (con decimales) desde el mes en que arrancó la escala */
function yearsSince(start: string, monthKey: string): number {
  const [y0, m0] = start.split('-').map(Number);
  const [y, m] = monthKey.split('-').map(Number);
  return y - y0 + (m - m0) / 12;
}

const startKey = (s: ScaleConfig) => s.startMonth || `${s.startYear}-01`;

export function scaleMath(s: ScaleConfig, today = getTodayDateString()) {
  const years = Math.max(1, s.targetYear - s.startYear);
  const g = s.startRevenue > 0 ? Math.pow(s.targetRevenue / s.startRevenue, 1 / years) - 1 : 0;
  const gh = s.startHours > 0 ? Math.pow(s.targetHours / s.startHours, 1 / years) - 1 : 0;
  const expected = (t: number) => s.startRevenue * Math.pow(1 + g, Math.max(0, t));
  const table = Array.from({ length: years + 1 }, (_, i) => ({
    year: s.startYear + i,
    revenue: s.startRevenue * Math.pow(1 + g, i),
    hours: s.startHours * Math.pow(1 + gh, i),
  }));
  const months = Object.keys(s.logs).sort();
  const recent = months.slice(-3);
  const actual = recent.length ? recent.reduce((a, k) => a + s.logs[k].revenue, 0) / recent.length : null;
  const nowKey = today.slice(0, 7);
  const tNow = yearsSince(startKey(s), nowKey);
  const expectedNow = expected(tNow);
  const remaining = Math.max(0.25, s.targetYear - s.startYear - tNow);
  const needed = actual && actual > 0 ? Math.pow(s.targetRevenue / actual, 1 / remaining) - 1 : null;
  const lastHours = recent.map((k) => s.logs[k].hours).filter((h): h is number => !!h);
  const hourValue = actual && lastHours.length ? actual / ((lastHours.reduce((a, b) => a + b, 0) / lastHours.length) * 4.33) : null;

  // separar un % de cada mes y que rinda al X% anual, hasta fin del año meta
  const sim = (growth: boolean) => {
    const r = s.returnRate / 100 / 12;
    let fv = 0;
    for (let i = 0; i < years * 12; i++) fv = fv * (1 + r) + (growth ? expected(i / 12) : s.startRevenue) * (s.savePercent / 100);
    return fv;
  };
  return { g, gh, table, actual, expectedNow, needed, hourValue, saveFlat: sim(false), saveScale: sim(true), expected, months };
}

const LEVELS = [
  {
    id: 1,
    name: 'De soñador a emprendedor',
    until: 'Se completa con tu primera venta como independiente',
    goal: 'Validar problema y solución',
    items: [
      'Identificar cliente y sus problemas',
      'Crear algo gratuito a lo que las personas se sumen',
      'Reunir y mostrar testimonios de resultados',
      'Lograr la primera venta',
      'Entender tu diferencial',
      'Que el primer cliente se vaya feliz',
      'Objetivo claro y capacidad de convertirlo en acciones',
    ],
  },
  {
    id: 2,
    name: 'Profesional independiente',
    until: 'De la primera venta hasta USD 1.999 promedio por mes',
    goal: 'Estandarizar servicio y separar finanzas',
    items: [
      'Precio sostenible',
      'Camino repetible de lo gratuito a la venta',
      'Credibilidad base: marca, fotos y dominio',
      'Medir y registrar el feedback de clientes',
      'Controlar tiempos de servicio',
      'Finanzas del negocio separadas y registradas',
      'Consulta #1 con contador',
      'Delegar cada tanto a freelancers',
      'Convertir acciones en procesos',
    ],
  },
];

export const ScaleCard: React.FC<{ life: LifeApi }> = ({ life }) => {
  const scale = life.store.financeConfig.scale;
  const [setup, setSetup] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const save = (s: ScaleConfig) => life.patchSingleton('financeConfig', { scale: s });

  if (!scale) {
    return (
      <Card title="Escala hacia tu visión" icon={<LineChart />}>
        <p className="text-sm text-muted leading-relaxed">
          Pasá tu visión a 5 años a números: cuánto facturás hoy, cuánto querés facturar y en cuántas horas. NORTE calcula cuánto tenés que crecer por año y te muestra cada mes si vas adelantado o atrasado.
        </p>
        <button type="button" className={`${btnPrimary} mt-4`} onClick={() => setSetup(true)}>
          Armar mi escala
        </button>
        {setup && <ScaleSetup onClose={() => setSetup(false)} onSave={save} />}
      </Card>
    );
  }

  return <ScaleBody life={life} scale={scale} save={save} setup={setup} setSetup={setSetup} logOpen={logOpen} setLogOpen={setLogOpen} />;
};

const ScaleBody: React.FC<{
  life: LifeApi;
  scale: ScaleConfig;
  save: (s: ScaleConfig) => void;
  setup: boolean;
  setSetup: (v: boolean) => void;
  logOpen: boolean;
  setLogOpen: (v: boolean) => void;
}> = ({ scale, save, setup, setSetup, logOpen, setLogOpen }) => {
  const today = getTodayDateString();
  const m = useMemo(() => scaleMath(scale, today), [scale, today]);
  const thisYear = Number(today.slice(0, 4));
  const ratio = m.actual !== null && m.expectedNow > 0 ? m.actual / m.expectedNow : null;
  const level = m.actual === null || m.actual <= 0 ? LEVELS[0] : m.actual < 2000 ? LEVELS[1] : null;

  // gráfico: curva esperada + puntos reales
  const W = 320;
  const H = 120;
  const totalYears = scale.targetYear - scale.startYear;
  const maxY = Math.max(scale.targetRevenue, ...Object.values(scale.logs).map((l) => l.revenue)) * 1.05;
  const x = (t: number) => (t / totalYears) * W;
  const y = (v: number) => H - (v / maxY) * H;
  const curve = Array.from({ length: totalYears * 12 + 1 }, (_, i) => `${x(i / 12).toFixed(1)},${y(m.expected(i / 12)).toFixed(1)}`).join(' ');

  return (
    <Card
      title={scale.name ? `Escala · ${scale.name}` : 'Escala hacia tu visión'}
      icon={<LineChart />}
      action={
        <button type="button" className={btnGhost} onClick={() => setSetup(true)} aria-label="Editar escala">
          <Pencil className="w-4 h-4" />
        </button>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-2xl bg-surface-elevated">
            <div className="font-num text-lg font-bold text-main">{m.actual !== null ? usd(m.actual) : '—'}</div>
            <div className="text-[11px] text-dim">hoy (prom. 3 meses)</div>
          </div>
          <div className="p-3 rounded-2xl bg-surface-elevated">
            <div className="font-num text-lg font-bold text-accent">{usd(m.expectedNow)}</div>
            <div className="text-[11px] text-dim">dónde deberías estar</div>
          </div>
          <div className="p-3 rounded-2xl bg-surface-elevated">
            <div className="font-num text-lg font-bold text-[var(--gold)]">{usd(scale.targetRevenue)}</div>
            <div className="text-[11px] text-dim">meta {scale.targetYear}</div>
          </div>
        </div>

        {ratio !== null && (
          <p className={`text-sm font-semibold ${ratio >= 1 ? 'text-[var(--mint)]' : ratio >= 0.8 ? 'text-[var(--gold)]' : 'text-[var(--danger)]'}`}>
            {ratio >= 1 ? `🚀 Vas ${Math.round((ratio - 1) * 100)}% adelantado a la escala` : `Vas al ${Math.round(ratio * 100)}% de la escala`}
            {m.needed !== null && <span className="text-muted font-normal"> · para llegar necesitás crecer {Math.round(m.needed * 100)}% por año (el plan era {Math.round(m.g * 100)}%)</span>}
          </p>
        )}

        <svg viewBox={`-4 -6 ${W + 8} ${H + 12}`} className="w-full h-auto" role="img" aria-label="Curva de la escala y lo facturado">
          <polyline points={curve} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />
          {m.months.map((k) => {
            const t = yearsSince(startKey(scale), k);
            if (t < 0 || t > totalYears) return null;
            return <circle key={k} cx={x(t)} cy={y(scale.logs[k].revenue)} r="4" fill="var(--mint)" />;
          })}
          {Array.from({ length: totalYears + 1 }, (_, i) => (
            <text key={i} x={x(i)} y={H + 6} fontSize="8" textAnchor="middle" fill="var(--text-dim)">
              {String(scale.startYear + i).slice(2)}
            </text>
          ))}
        </svg>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-dim text-left">
                <th className="py-1 font-medium">Año</th>
                <th className="py-1 font-medium">Facturación/mes</th>
                <th className="py-1 font-medium text-right">Horas/sem</th>
              </tr>
            </thead>
            <tbody>
              {m.table.map((r) => (
                <tr key={r.year} className={`border-t border-subtle ${r.year === thisYear ? 'text-accent font-semibold' : 'text-main'}`}>
                  <td className="py-1.5 font-mono">{r.year}</td>
                  <td className="py-1.5 font-num">{usd(r.revenue)}</td>
                  <td className="py-1.5 font-num text-right">{r.hours.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-dim mt-1">Crecimiento de la escala: {Math.round(m.g * 100)}% por año.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => setLogOpen(true)}>
            <Plus className="w-4 h-4" /> Cargar mes
          </button>
          {m.hourValue !== null && <span className="self-center text-xs text-muted">Tu hora hoy vale ≈ {usd(m.hourValue)}: delegá lo que valga menos.</span>}
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated space-y-1.5">
          <div className="text-sm font-semibold text-main">💰 Separando el {scale.savePercent}% al {scale.returnRate}% anual</div>
          <p className="text-xs text-muted">
            Sin cambiar nada: <b className="text-main">{usd(m.saveFlat)}</b> en {scale.targetYear}. Siguiendo la escala: <b className="text-[var(--mint)]">{usd(m.saveScale)}</b>.
          </p>
        </div>

        {level && <LevelChecklist level={level} scale={scale} save={save} />}
      </div>

      {setup && <ScaleSetup initial={scale} onClose={() => setSetup(false)} onSave={save} />}
      {logOpen && <MonthLog scale={scale} onClose={() => setLogOpen(false)} onSave={save} />}
    </Card>
  );
};

const LevelChecklist: React.FC<{ level: (typeof LEVELS)[number]; scale: ScaleConfig; save: (s: ScaleConfig) => void }> = ({ level, scale, save }) => {
  const done = level.items.filter((it) => scale.checks[`${level.id}:${it}`]).length;
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-accent">Nivel {level.id} · {level.name}</div>
        <p className="text-xs text-muted">
          {level.goal}. {level.until}. {done}/{level.items.length}
        </p>
      </div>
      {level.items.map((it) => {
        const key = `${level.id}:${it}`;
        const on = !!scale.checks[key];
        return (
          <button key={key} type="button" onClick={() => save({ ...scale, checks: { ...scale.checks, [key]: !on } })} className="w-full flex items-center gap-2.5 text-left cursor-pointer">
            <span className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center ${on ? 'bg-accent border-transparent text-accent-contrast' : 'border-app'}`}>{on && <Check className="w-3.5 h-3.5" />}</span>
            <span className={`text-sm ${on ? 'line-through text-dim' : 'text-main'}`}>{it}</span>
          </button>
        );
      })}
    </div>
  );
};

const ScaleSetup: React.FC<{ initial?: ScaleConfig; onClose: () => void; onSave: (s: ScaleConfig) => void }> = ({ initial, onClose, onSave }) => {
  const year = Number(getTodayDateString().slice(0, 4));
  const [f, setF] = useState({
    name: initial?.name || '',
    startYear: String(initial?.startYear || year),
    startRevenue: String(initial?.startRevenue ?? ''),
    startHours: String(initial?.startHours ?? ''),
    targetYear: String(initial?.targetYear || year + 5),
    targetRevenue: String(initial?.targetRevenue ?? ''),
    targetHours: String(initial?.targetHours ?? ''),
    savePercent: String(initial?.savePercent ?? 10),
    returnRate: String(initial?.returnRate ?? 7),
  });
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const n = (v: string) => Number(v.replace(',', '.')) || 0;
  const valid = n(f.startRevenue) > 0 && n(f.targetRevenue) > 0 && n(f.targetYear) > n(f.startYear);
  const num = (k: keyof typeof f, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input className={inputCls} inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </Field>
  );
  return (
    <Modal
      open
      onClose={onClose}
      kicker="Escala de objetivos"
      title="Tu visión en números"
      footer={
        <button
          type="button"
          className={btnPrimary}
          disabled={!valid}
          onClick={() => {
            onSave({
              name: f.name.trim(),
              startYear: n(f.startYear),
              startMonth: initial?.startMonth && Number(initial.startMonth.slice(0, 4)) === n(f.startYear) ? initial.startMonth : n(f.startYear) === year ? getTodayDateString().slice(0, 7) : `${n(f.startYear)}-01`,
              startRevenue: n(f.startRevenue),
              startHours: n(f.startHours),
              targetYear: n(f.targetYear),
              targetRevenue: n(f.targetRevenue),
              targetHours: n(f.targetHours),
              savePercent: n(f.savePercent),
              returnRate: n(f.returnRate),
              logs: initial?.logs || {},
              checks: initial?.checks || {},
            });
            onClose();
          }}
        >
          Guardar
        </button>
      }
    >
      <Field label="Nombre del proyecto (opcional)">
        <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: mi emprendimiento" />
      </Field>
      <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-dim">Hoy</div>
      <div className="grid grid-cols-3 gap-2">
        {num('startYear', 'Año')}
        {num('startRevenue', 'USD/mes')}
        {num('startHours', 'Horas/sem')}
      </div>
      <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-dim">Meta</div>
      <div className="grid grid-cols-3 gap-2">
        {num('targetYear', 'Año')}
        {num('targetRevenue', 'USD/mes')}
        {num('targetHours', 'Horas/sem')}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {num('savePercent', '% que separo', 'Para invertir')}
        {num('returnRate', 'Rinde % anual')}
      </div>
    </Modal>
  );
};

const MonthLog: React.FC<{ scale: ScaleConfig; onClose: () => void; onSave: (s: ScaleConfig) => void }> = ({ scale, onClose, onSave }) => {
  const today = getTodayDateString();
  const [y, mo] = today.split('-').map(Number);
  const prev = mo === 1 ? ym(y - 1, 12) : ym(y, mo - 1);
  const [month, setMonth] = useState(scale.logs[today.slice(0, 7)] ? today.slice(0, 7) : prev);
  const [revenue, setRevenue] = useState(String(scale.logs[month]?.revenue ?? ''));
  const [hours, setHours] = useState(String(scale.logs[month]?.hours ?? ''));
  const months = Object.keys(scale.logs).sort().reverse();
  return (
    <Modal
      open
      onClose={onClose}
      kicker="Escala"
      title="Facturación del mes"
      footer={
        <button
          type="button"
          className={btnPrimary}
          disabled={!revenue}
          onClick={() => {
            onSave({ ...scale, logs: { ...scale.logs, [month]: { revenue: Number(revenue.replace(',', '.')) || 0, hours: Number(hours) || undefined } } });
            onClose();
          }}
        >
          Guardar
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Field label="Mes">
          <input type="month" className={inputCls} value={month} onChange={(e) => {
            setMonth(e.target.value);
            setRevenue(String(scale.logs[e.target.value]?.revenue ?? ''));
            setHours(String(scale.logs[e.target.value]?.hours ?? ''));
          }} />
        </Field>
        <Field label="USD facturados">
          <input className={inputCls} inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
        </Field>
        <Field label="Horas/sem">
          <input className={inputCls} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </Field>
      </div>
      {months.length > 0 && (
        <ul className="text-sm divide-y divide-[var(--border-subtle)]">
          {months.map((k) => (
            <li key={k} className="flex justify-between py-1.5">
              <span className="font-mono text-dim">{k}</span>
              <span className="font-num text-main">
                {usd(scale.logs[k].revenue)}
                {scale.logs[k].hours ? ` · ${scale.logs[k].hours} h` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
