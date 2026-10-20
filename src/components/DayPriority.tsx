import React, { useState } from 'react';
import { Check, Mountain, Plus, Target, X } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { DayPlan, WeeklyReview } from '../types/life';
import { addDays, getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { newId, nowIso } from '../utils/lifeUtils';
import { inputCls } from './ui';

/** Revisión semanal que planificó esta semana (la de la semana anterior) */
export function currentWeekPlan(reviews: Record<string, WeeklyReview>, today = getTodayDateString()): WeeklyReview | undefined {
  const monday = getWeekDays(today)[0];
  return reviews[addDays(monday, -7)];
}

/** Días del mes con la prioridad cumplida: las "primeras piedras" de la represa */
export function stonesThisMonth(plans: Record<string, DayPlan>, today = getTodayDateString()): number {
  const month = today.slice(0, 7);
  return Object.values(plans).filter((p) => p.date.startsWith(month) && p.topDone).length;
}

/**
 * "¿Qué es lo más importante hoy?" — una sola prioridad grande y hasta 3 cosas más.
 * Criterio: algo que, si lo lográs, te deja un poquito más cerca de tu visión.
 */
export const DayPriority: React.FC<{ life: LifeApi }> = ({ life }) => {
  const today = getTodayDateString();
  const plan = life.store.dayPlans?.[today];
  const [draft, setDraft] = useState('');
  const [extra, setExtra] = useState('');
  const [editing, setEditing] = useState(false);
  const week = currentWeekPlan(life.store.weeklyReviews || {}, today);
  const roles = life.store.purpose.roles;
  const stones = stonesThisMonth(life.store.dayPlans || {}, today);

  const save = (patch: Partial<DayPlan>) => {
    const base: DayPlan = plan || { id: today, date: today, top: '', topDone: false, others: [], updatedAt: nowIso() };
    life.upsert('dayPlans', { ...base, ...patch, updatedAt: nowIso() });
  };
  const toggleWeekGoal = (i: number) => {
    if (!week) return;
    life.upsert('weeklyReviews', { ...week, nextGoals: week.nextGoals.map((g, j) => (j === i ? { ...g, done: !g.done } : g)), updatedAt: nowIso() });
  };

  return (
    <section className="rounded-[28px] p-5 bg-surface border border-subtle shadow-card space-y-4 animate-rise">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <h3 className="font-display text-lg font-bold text-main">Lo más importante hoy</h3>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-mono text-dim whitespace-nowrap" title="Días de este mes con tu prioridad cumplida (primeras piedras)">
          <Mountain className="w-3.5 h-3.5" /> {stones} {stones === 1 ? 'piedra' : 'piedras'}
        </span>
      </div>

      {!plan?.top || editing ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            save({ top: draft.trim(), topDone: false });
            setEditing(false);
          }}
        >
          <p className="text-xs text-muted">Si hoy solo pudieras hacer una cosa que te acerque a tu visión, ¿cuál sería?</p>
          <div className="flex gap-2">
            <input className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ej: terminar el TP de Análisis" aria-label="Lo más importante hoy" autoFocus={editing} />
            <button type="submit" className="shrink-0 w-12 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center cursor-pointer disabled:opacity-40" disabled={!draft.trim()} aria-label="Guardar prioridad">
              <Check className="w-5 h-5" />
            </button>
          </div>
        </form>
      ) : (
        <div className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition ${plan.topDone ? 'border-transparent bg-[color-mix(in_srgb,var(--mint)_16%,transparent)]' : 'border-accent bg-accent-subtle'}`}>
          <button
            type="button"
            onClick={() => save({ topDone: !plan.topDone })}
            aria-label={plan.topDone ? 'Marcar como pendiente' : 'Marcar como hecha'}
            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center border-2 cursor-pointer ${plan.topDone ? 'bg-[var(--mint)] border-transparent text-[#141633]' : 'border-accent'}`}
          >
            {plan.topDone && <Check className="w-5 h-5" />}
          </button>
          <button
            type="button"
            className={`flex-1 text-left font-display text-lg font-semibold cursor-pointer ${plan.topDone ? 'line-through text-muted' : 'text-main'}`}
            onClick={() => {
              setDraft(plan.top);
              setEditing(true);
            }}
          >
            {plan.top}
          </button>
        </div>
      )}
      {plan?.topDone && <p className="text-xs text-[var(--mint)]">🪨 Primera piedra puesta. Lo que venga ahora es ganancia.</p>}

      {plan?.top && (
        <div className="space-y-1.5">
          {plan.others.map((o) => (
            <div key={o.id} className="flex items-center gap-2.5 group">
              <button
                type="button"
                onClick={() => save({ others: plan.others.map((x) => (x.id === o.id ? { ...x, done: !x.done } : x)) })}
                className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center cursor-pointer ${o.done ? 'bg-accent border-transparent text-accent-contrast' : 'border-app'}`}
                aria-label={o.text}
              >
                {o.done && <Check className="w-3.5 h-3.5" />}
              </button>
              <span className={`flex-1 text-sm ${o.done ? 'line-through text-dim' : 'text-main'}`}>{o.text}</span>
              <button type="button" onClick={() => save({ others: plan.others.filter((x) => x.id !== o.id) })} className="text-dim hover:text-[var(--danger)] cursor-pointer" aria-label="Quitar">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {plan.others.length < 3 && (
            <form
              className="flex items-center gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!extra.trim()) return;
                save({ others: [...plan.others, { id: newId('pi'), text: extra.trim(), done: false }] });
                setExtra('');
              }}
            >
              <Plus className="w-5 h-5 text-dim shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-main placeholder:text-dim outline-none py-1"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder={`Otra cosa importante (${3 - plan.others.length} más, como mucho)`}
                aria-label="Otra prioridad"
              />
            </form>
          )}
        </div>
      )}

      {week && week.nextGoals.length > 0 && (
        <div className="pt-3 border-t border-subtle space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-dim">Esta semana{week.nextFocus ? ` · foco: ${week.nextFocus}` : ''}</div>
          {week.nextGoals.map((g, i) => {
            const role = roles.find((r) => r.id === g.roleId);
            return (
              <button key={i} type="button" onClick={() => toggleWeekGoal(i)} className="w-full flex items-center gap-2.5 text-left cursor-pointer">
                <span className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${g.done ? 'bg-[var(--mint)] border-transparent text-[#141633]' : 'border-app'}`}>
                  {g.done && <Check className="w-3 h-3" />}
                </span>
                <span className={`text-sm ${g.done ? 'line-through text-dim' : 'text-main'}`}>
                  {role ? `${role.emoji} ` : ''}
                  {g.text}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
