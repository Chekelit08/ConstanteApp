import React, { useMemo, useState } from 'react';
import { CalendarCheck, Check, Flag, Trophy } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { LIFE_AREAS, LifeStore, MatchState, QuarterReview, WeeklyReview } from '../types/life';
import { addDays, getMondayIndexedDay, getTodayDateString, getWeekDays, parseDateString } from '../utils/dateUtils';
import { completionRate } from '../utils/habits';
import { daysBetween, formatCompactArs, formatDuration, nowIso, quarterOf, txArs } from '../utils/lifeUtils';
import { btnPrimary, btnSecondary, Card, Chip, Field, inputCls, textareaCls } from './ui';
import { useToast } from './Toast';

/** Roles para las metas semanales: los de tu plan o, si no hay, las áreas de vida */
export function reviewRoles(store: LifeStore): { id: string; emoji: string; label: string }[] {
  if (store.purpose.roles.length) return store.purpose.roles.map((r) => ({ id: r.id, emoji: r.emoji, label: r.area }));
  return LIFE_AREAS.filter((a) => ['universidad', 'trabajo', 'fe', 'familia', 'salud'].includes(a.id)).map((a) => ({ id: a.id, emoji: a.emoji, label: a.label }));
}

/** La semana a revisar: de lunes a miércoles, la anterior; de jueves a domingo, la actual */
export function weekToReview(today = getTodayDateString()): string {
  const monday = getWeekDays(today)[0];
  return getMondayIndexedDay(parseDateString(today)) <= 2 ? addDays(monday, -7) : monday;
}

export function weekStats(store: LifeStore, weekStart: string) {
  const today = getTodayDateString();
  const end = addDays(weekStart, 6) < today ? addDays(weekStart, 6) : today;
  const days = getWeekDays(weekStart).filter((d) => d <= end);
  const set = new Set(days);
  const habits = Object.values(store.habits)
    .filter((h) => !h.archived)
    .map((h) => ({ h, r: completionRate(h, store.habitLogs, weekStart, end) }))
    .filter((x) => x.r.total > 0);
  const plans = days.map((d) => store.dayPlans?.[d]).filter((p) => p?.top);
  const focus = Object.values(store.focusSessions).filter((s) => set.has(s.date)).reduce((a, s) => a + s.minutes, 0);
  const tx = Object.values(store.transactions).filter((t) => set.has(t.date));
  const income = tx.filter((t) => t.type === 'income').reduce((a, t) => a + txArs(t, store.financeConfig.usdRate), 0);
  const expense = tx.filter((t) => t.type === 'expense').reduce((a, t) => a + txArs(t, store.financeConfig.usdRate), 0);
  const moments = Object.values(store.interactions).filter((i) => set.has(i.date) && i.kind !== 'oracion');
  const journal = days.map((d) => store.days[d]).filter(Boolean);
  const prev = store.weeklyReviews?.[addDays(weekStart, -7)];
  return {
    end,
    habits,
    habitsPct: habits.length ? Math.round(habits.reduce((a, x) => a + x.r.pct, 0) / habits.length) : null,
    plans: plans.length,
    plansDone: plans.filter((p) => p!.topDone).length,
    focus,
    income,
    expense,
    moments: moments.length,
    people: new Set(moments.map((m) => m.personId)).size,
    highlights: journal.map((j) => j.highlight).filter(Boolean) as string[],
    gratitude: journal.flatMap((j) => j.gratitude || []).filter(Boolean),
    prevGoals: prev?.nextGoals || [],
  };
}

const MiniStat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="p-3 rounded-2xl bg-surface-elevated">
    <div className="font-num text-lg font-bold text-main leading-tight">{value}</div>
    <div className="text-[11px] text-dim">{label}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// REVISIÓN SEMANAL (el domingo)
// ─────────────────────────────────────────────────────────────
export const WeeklyReviewTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(weekToReview());
  const existing = life.store.weeklyReviews?.[weekStart];
  const roles = reviewRoles(life.store);
  const st = useMemo(() => weekStats(life.store, weekStart), [life.store, weekStart]);
  const [f, setF] = useState<WeeklyReview>(
    () =>
      existing || {
        id: weekStart,
        weekStart,
        wentWell: '',
        improve: '',
        missionRead: false,
        nextFocus: '',
        nextGoals: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
  );
  const goalFor = (roleId: string) => f.nextGoals.find((g) => g.roleId === roleId)?.text || '';
  const setGoal = (roleId: string, text: string) => {
    const others = f.nextGoals.filter((g) => g.roleId !== roleId);
    setF({ ...f, nextGoals: text ? [...others, { roleId, text, done: f.nextGoals.find((g) => g.roleId === roleId)?.done || false }] : others });
  };
  const history = Object.values(life.store.weeklyReviews || {}).sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  const save = () => {
    life.upsert('weeklyReviews', { ...f, id: weekStart, weekStart, nextGoals: f.nextGoals.filter((g) => g.text.trim()), updatedAt: nowIso() });
    showToast('Revisión guardada. Tus metas aparecen en Hoy toda la semana 💪', { type: 'success' });
  };

  const prevWeekLabel = `${weekStart.slice(8)}/${weekStart.slice(5, 7)} al ${st.end.slice(8)}/${st.end.slice(5, 7)}`;

  return (
    <div className="space-y-4">
      <Card title={`Tu semana · ${prevWeekLabel}`} icon={<CalendarCheck className="w-4 h-4" />}>
        <div className="flex gap-1.5 mb-4">
          <Chip active={weekStart === weekToReview()} onClick={() => setWeekStart(weekToReview())}>
            Esta revisión
          </Chip>
          {history.slice(0, 4).map((h) =>
            h.weekStart === weekToReview() ? null : (
              <Chip key={h.id} active={weekStart === h.weekStart} onClick={() => { setWeekStart(h.weekStart); setF(h); }}>
                {h.weekStart.slice(8)}/{h.weekStart.slice(5, 7)}
              </Chip>
            )
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MiniStat label="hábitos cumplidos" value={st.habitsPct !== null ? `${st.habitsPct}%` : '—'} />
          <MiniStat label="prioridades del día" value={st.plans ? `${st.plansDone}/${st.plans}` : '—'} />
          <MiniStat label="de enfoque" value={st.focus ? formatDuration(st.focus) : '—'} />
          <MiniStat label={`momentos con ${st.people} personas`} value={st.moments} />
          <MiniStat label="entró" value={formatCompactArs(st.income)} />
          <MiniStat label="salió" value={formatCompactArs(st.expense)} />
          {st.prevGoals.length > 0 && <MiniStat label="metas de la semana" value={`${st.prevGoals.filter((g) => g.done).length}/${st.prevGoals.length}`} />}
        </div>
        {st.habits.length > 0 && (
          <div className="mt-4 space-y-1">
            {st.habits.map(({ h, r }) => (
              <div key={h.id} className="flex items-center gap-2 text-sm">
                <span>{h.emoji}</span>
                <span className="flex-1 text-main truncate">{h.name}</span>
                <span className={`font-mono text-xs ${r.pct >= 80 ? 'text-[var(--mint)]' : r.pct >= 50 ? 'text-[var(--gold)]' : 'text-[var(--danger)]'}`}>{r.pct}%</span>
              </div>
            ))}
          </div>
        )}
        {(st.highlights.length > 0 || st.gratitude.length > 0) && (
          <div className="mt-4 p-3 rounded-2xl bg-surface-elevated text-sm space-y-1">
            {st.highlights.slice(0, 4).map((x, i) => (
              <p key={`h${i}`} className="text-main">⭐ {x}</p>
            ))}
            {st.gratitude.slice(0, 5).map((x, i) => (
              <p key={`g${i}`} className="text-muted">🙏 {x}</p>
            ))}
          </div>
        )}
      </Card>

      <Card title="Mirar atrás">
        <div className="space-y-4">
          <Field label="¿Qué salió bien esta semana?">
            <textarea rows={2} className={textareaCls} value={f.wentWell} onChange={(e) => setF({ ...f, wentWell: e.target.value })} />
          </Field>
          <Field label="¿Qué podría haber hecho mejor?">
            <textarea rows={2} className={textareaCls} value={f.improve} onChange={(e) => setF({ ...f, improve: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card title="Reconectar con lo importante">
        {life.store.purpose.mission && <p className="text-sm text-main italic leading-relaxed">“{life.store.purpose.mission}”</p>}
        <label className="flex items-center gap-2 mt-3 text-sm text-main cursor-pointer">
          <input type="checkbox" checked={f.missionRead} onChange={(e) => setF({ ...f, missionRead: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
          Releí mi misión y mi visión
        </label>
      </Card>

      <Card title="La semana que viene">
        <div className="space-y-4">
          <Field label="Mi foco principal" hint="Si lográs solo esto, la semana valió la pena">
            <input className={inputCls} value={f.nextFocus} onChange={(e) => setF({ ...f, nextFocus: e.target.value })} />
          </Field>
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted">Un pequeño logro por rol (en equilibrio)</span>
            {roles.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="w-8 text-center text-lg shrink-0">{r.emoji}</span>
                <input className={inputCls} value={goalFor(r.id)} onChange={(e) => setGoal(r.id, e.target.value)} placeholder={r.label} aria-label={`Logro para ${r.label}`} />
              </div>
            ))}
          </div>
          <button type="button" className={`${btnPrimary} w-full`} onClick={save}>
            <Check className="w-4 h-4" /> {existing ? 'Actualizar revisión' : 'Guardar revisión'}
          </button>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// REVISIÓN TRIMESTRAL + "EL PARTIDO DEL AÑO"
// ─────────────────────────────────────────────────────────────
export function quarterKey(date = getTodayDateString()) {
  return `${date.slice(0, 4)}-${quarterOf(date)}`;
}

function prevQuarterKey(key: string): string {
  const [y, q] = key.split('-Q').map(Number);
  return q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`;
}

const MATCH: { id: MatchState; label: string; color: string }[] = [
  { id: 'ganando', label: '⚽ Ganando', color: 'var(--mint)' },
  { id: 'empatando', label: '🤝 Empatando', color: 'var(--gold)' },
  { id: 'perdiendo', label: '😬 Perdiendo', color: 'var(--danger)' },
];

/** ¿Vas ganando, empatando o perdiendo el partido del año? */
export const MatchCard: React.FC<{ life: LifeApi; onOpen: () => void }> = ({ life, onOpen }) => {
  const today = getTodayDateString();
  const daysLeft = daysBetween(today, `${today.slice(0, 4)}-12-31`);
  const reviews = Object.values(life.store.quarterReviews || {}).sort((a, b) => b.quarter.localeCompare(a.quarter));
  const last = reviews[0];
  const roles = reviewRoles(life.store);
  const counts = last ? MATCH.map((m) => ({ ...m, n: Object.values(last.match).filter((x) => x === m.id).length })) : [];
  return (
    <Card title="El partido del año" icon={<Trophy className="w-4 h-4" />}>
      <div className="flex items-baseline gap-2">
        <span className="font-num text-4xl font-bold text-main">{daysLeft}</span>
        <span className="text-sm text-muted">días para el 31/12 · los "últimos 20 minutos" se juegan con cabeza</span>
      </div>
      {last ? (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            {counts.map((c) => (
              <span key={c.id} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: c.color, backgroundColor: `color-mix(in srgb, ${c.color} 14%, transparent)` }}>
                {c.label} · {c.n}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs text-muted">
            {roles.map((r) => (last.match[r.id] ? <span key={r.id}>{r.emoji} {last.match[r.id]}</span> : null))}
          </div>
          {last.focus && <p className="text-sm text-main">🎯 Foco: {last.focus}</p>}
          {last.dec31 && <p className="text-xs text-muted italic">“{last.dec31}”</p>}
        </div>
      ) : (
        <p className="text-sm text-muted mt-2">Hacé tu primera revisión trimestral para ver el marcador.</p>
      )}
      <button type="button" className={`${btnSecondary} w-full mt-3`} onClick={onOpen}>
        {last?.quarter === quarterKey() ? 'Ver revisión trimestral' : 'Hacer revisión trimestral'}
      </button>
    </Card>
  );
};

export const QuarterReviewTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { showToast } = useToast();
  const key = quarterKey();
  const existing = life.store.quarterReviews?.[key];
  const prev = life.store.quarterReviews?.[prevQuarterKey(key)];
  const roles = reviewRoles(life.store);
  const [f, setF] = useState<QuarterReview>(
    () =>
      existing || {
        id: key,
        quarter: key,
        missionChange: '',
        visionChange: '',
        objectives: (prev?.nextObjectives || []).map((text) => ({ text, met: null, why: '' })),
        habitsReflection: '',
        match: {},
        nextObjectives: ['', '', ''],
        focus: '',
        dec31: '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
  );

  // datos del trimestre: % de hábitos y semanas revisadas
  const qStart = `${key.slice(0, 4)}-${String((Number(key.slice(-1)) - 1) * 3 + 1).padStart(2, '0')}-01`;
  const today = getTodayDateString();
  const habitRates = Object.values(life.store.habits)
    .filter((h) => !h.archived)
    .map((h) => ({ h, r: completionRate(h, life.store.habitLogs, qStart, today) }))
    .filter((x) => x.r.total > 0);
  const weeks = Object.values(life.store.weeklyReviews || {}).filter((w) => w.weekStart >= qStart).length;

  const save = () => {
    life.upsert('quarterReviews', { ...f, nextObjectives: f.nextObjectives.filter((o) => o.trim()), updatedAt: nowIso() });
    showToast('Revisión trimestral guardada 🏁', { type: 'success' });
  };

  return (
    <div className="space-y-4">
      <Card title={`Revisión trimestral · ${key.replace('-', ' ')}`} icon={<Flag className="w-4 h-4" />}>
        <p className="text-sm text-muted">Reservá un rato de calma (1 a 2 horas). Primero mirás lo que pasó, después planificás las próximas 12 semanas.</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <MiniStat label="revisiones semanales" value={weeks} />
          <MiniStat label="hábitos en el trimestre" value={habitRates.length ? `${Math.round(habitRates.reduce((a, x) => a + x.r.pct, 0) / habitRates.length)}%` : '—'} />
        </div>
        {habitRates.length > 0 && (
          <div className="mt-3 space-y-1">
            {habitRates.map(({ h, r }) => (
              <div key={h.id} className="flex justify-between text-sm">
                <span className="text-main">{h.emoji} {h.name}</span>
                <span className="font-mono text-xs text-muted">{r.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="1 · Revisá tu misión y tu visión">
        <div className="space-y-4">
          <Field label="¿Hay algo que quiera corregir de mi misión? ¿Hay algo que no esté priorizando bien?">
            <textarea rows={2} className={textareaCls} value={f.missionChange} onChange={(e) => setF({ ...f, missionChange: e.target.value })} />
          </Field>
          <Field label="¿Algo cambió en mi visión? ¿Algo de mi día a día no me acerca a ella?">
            <textarea rows={2} className={textareaCls} value={f.visionChange} onChange={(e) => setF({ ...f, visionChange: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card title="2 · Objetivos del trimestre que termina">
        <div className="space-y-3">
          {f.objectives.map((o, i) => (
            <div key={i} className="p-3 rounded-2xl bg-surface-elevated space-y-2">
              <input className={inputCls} value={o.text} onChange={(e) => setF({ ...f, objectives: f.objectives.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} placeholder="Objetivo" aria-label="Objetivo" />
              <div className="flex gap-1.5">
                <Chip active={o.met === true} color="var(--mint)" onClick={() => setF({ ...f, objectives: f.objectives.map((x, j) => (j === i ? { ...x, met: true } : x)) })}>
                  ✓ Cumplí
                </Chip>
                <Chip active={o.met === false} color="var(--danger)" onClick={() => setF({ ...f, objectives: f.objectives.map((x, j) => (j === i ? { ...x, met: false } : x)) })}>
                  ✕ No cumplí
                </Chip>
              </div>
              <input className={inputCls} value={o.why} onChange={(e) => setF({ ...f, objectives: f.objectives.map((x, j) => (j === i ? { ...x, why: e.target.value } : x)) })} placeholder="¿Por qué?" aria-label="¿Por qué?" />
            </div>
          ))}
          <button type="button" className={btnSecondary} onClick={() => setF({ ...f, objectives: [...f.objectives, { text: '', met: null, why: '' }] })}>
            + Objetivo
          </button>
          <Field label="¿Estoy siendo constante con mis hábitos? ¿Algo cambió y tengo que ajustar un hábito u objetivo?">
            <textarea rows={2} className={textareaCls} value={f.habitsReflection} onChange={(e) => setF({ ...f, habitsReflection: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card title="3 · El partido del año, por rol">
        <div className="space-y-2.5">
          {roles.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <span className="text-sm text-main sm:w-44 shrink-0">
                {r.emoji} {r.label}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {MATCH.map((m) => (
                  <Chip key={m.id} active={f.match[r.id] === m.id} color={m.color} onClick={() => setF({ ...f, match: { ...f.match, [r.id]: m.id } })}>
                    {m.label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="4 · Las próximas 12 semanas">
        <div className="space-y-3">
          <p className="text-xs text-muted">De 1 a 3 objetivos: realistas pero desafiantes, con impacto y que te entusiasmen.</p>
          {f.nextObjectives.map((o, i) => (
            <input key={i} className={inputCls} value={o} onChange={(e) => setF({ ...f, nextObjectives: f.nextObjectives.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Objetivo ${i + 1} · de … a …`} aria-label={`Objetivo ${i + 1}`} />
          ))}
          <Field label="Foco principal" hint="¿Hay algún objetivo que, si lo lográs, hace todos los demás más fáciles?">
            <input className={inputCls} value={f.focus} onChange={(e) => setF({ ...f, focus: e.target.value })} />
          </Field>
          <Field label="Mi yo del 31 de diciembre" hint="Visualizalo: ¿cómo querés estar y sentirte?">
            <textarea rows={2} className={textareaCls} value={f.dec31} onChange={(e) => setF({ ...f, dec31: e.target.value })} />
          </Field>
          <button type="button" className={`${btnPrimary} w-full`} onClick={save}>
            <Check className="w-4 h-4" /> {existing ? 'Actualizar' : 'Guardar revisión trimestral'}
          </button>
        </div>
      </Card>
    </div>
  );
};
