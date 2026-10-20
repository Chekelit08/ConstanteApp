import React, { useMemo, useState } from 'react';
import { Archive, ChevronLeft, ChevronRight, Flame, Plus, Sparkles, Trash2 } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { useHabitActions } from '../hooks/useHabitActions';
import { Habit, HabitSchedule, LifeArea, LIFE_AREAS } from '../types/life';
import { addDays, DAY_NAMES_SHORT, getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { challengeDay, completionRate, HabitState, habitState, habitValue, isScheduled, streak, weekCount } from '../utils/habits';
import { HabitWizard, MicroHabitCard, MonthHabitCard } from '../components/HabitChallenge';
import { newId, nowIso, pct } from '../utils/lifeUtils';
import { btnDanger, btnGhost, btnPrimary, btnSecondary, Card, EmptyState, Field, inputCls, Modal, PageHeader, Stat, textareaCls } from '../components/ui';

const NEXT_STATE: Record<HabitState, HabitState> = { none: 'done', done: 'partial', partial: 'missed', missed: 'off', off: 'none' };
const STATE_MARK: Record<HabitState, string> = { none: '', done: '✓', partial: '½', missed: '✕', off: '🌙' };
const STATE_LABEL: Record<HabitState, string> = { none: 'sin marcar', done: 'cumplí', partial: 'parcial', missed: 'no cumplí', off: 'día libre' };

export const COLORS = ['#FF8A5B', '#FFC861', '#5FD4A8', '#8FB3FF', '#B69CFF', '#FF8A9B', '#7FD3F7', '#C9A8FF', '#FFB27A'];

export const HabitsView: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { store } = life;
  const today = getTodayDateString();
  const [anchor, setAnchor] = useState(today);
  const [modal, setModal] = useState<{ open: boolean; habit?: Partial<Habit> }>({ open: false });
  const [showArchived, setShowArchived] = useState(false);
  const [wizard, setWizard] = useState(false);
  const actions = useHabitActions(life);
  const week = getWeekDays(anchor);

  const habits = useMemo(() => Object.values(store.habits).sort((a, b) => a.sortOrder - b.sortOrder), [store.habits]);
  const active = habits.filter((h) => !h.archived);

  // Consistencia de los últimos 30 días
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const consistency = (h: Habit) => {
    const sched = last30.filter((d) => isScheduled(h, d) && d >= h.createdAt.slice(0, 10));
    if (h.schedule === 'weekly') {
      const weeks = [0, 7, 14, 21].map((o) => addDays(today, -o));
      return pct(weeks.filter((w) => weekCount(h, store.habitLogs, w) >= (h.timesPerWeek || 1)).length, weeks.length);
    }
    return sched.length ? completionRate(h, store.habitLogs, last30[0], today).pct : 0;
  };
  const challenge = active.find((h) => challengeDay(h, today) !== null);
  const bestStreak = Math.max(0, ...active.map((h) => streak(h, store.habitLogs, today)));
  const avg = active.length ? Math.round(active.reduce((s, h) => s + consistency(h), 0) / active.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Constancia antes que intensidad"
        title="Hábitos"
        subtitle="Cada tilde es un voto por la persona que querés ser. Si un día cuesta, hacé la versión mínima."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setModal({ open: true, habit: {} })}>
            <Plus className="w-4 h-4" /> Nuevo hábito
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MonthHabitCard life={life} habit={challenge} onStart={() => setWizard(true)} />
        <MicroHabitCard life={life} />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Activos" value={active.length} />
        <Stat label="Mejor racha" value={`${bestStreak}`} sub="días seguidos" tone="accent" icon={<Flame className="w-3.5 h-3.5" />} />
        <Stat label="Constancia 30 d" value={`${avg}%`} tone={avg >= 70 ? 'good' : 'default'} />
      </div>

      {active.length === 0 ? (
        <EmptyState title="Empezá por uno" text="Elegí un hábito chiquito que puedas sostener aunque no tengas ganas." action={<button type="button" className={btnPrimary} onClick={() => setModal({ open: true, habit: {} })}><Plus className="w-4 h-4" /> Crear hábito</button>} />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-subtle">
            <button type="button" className={btnGhost} onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Semana anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-muted">
              {week[0].slice(8)}/{week[0].slice(5, 7)} — {week[6].slice(8)}/{week[6].slice(5, 7)}
            </span>
            <button type="button" className={btnGhost} onClick={() => setAnchor(addDays(anchor, 7))} disabled={week[6] >= today} aria-label="Semana siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className="text-left px-4 sm:px-5 py-2 text-xs font-medium text-dim">Hábito</th>
                  {week.map((d, i) => (
                    <th key={d} className={`py-2 text-center text-[11px] font-mono ${d === today ? 'text-accent' : 'text-dim'}`}>
                      {DAY_NAMES_SHORT[i]}
                      <div className="text-[10px]">{d.slice(8)}</div>
                    </th>
                  ))}
                  <th className="py-2 pr-4 text-right text-xs font-medium text-dim">Racha</th>
                </tr>
              </thead>
              <tbody>
                {active.map((h) => (
                  <tr key={h.id} className="border-t border-subtle">
                    <td className="px-4 sm:px-5 py-2.5">
                      <button type="button" onClick={() => setModal({ open: true, habit: h })} className="flex items-center gap-2.5 text-left cursor-pointer min-w-0">
                        <span className="text-xl">{h.emoji}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-main truncate max-w-[160px]">{h.name}</span>
                          <span className="block text-[11px] text-dim font-mono">
                            {h.schedule === 'weekly' ? `${h.timesPerWeek}× por semana` : h.schedule === 'days' ? (h.days || []).map((d) => DAY_NAMES_SHORT[d][0]).join(' ') : 'todos los días'}
                            {h.kind === 'count' ? ` · ${h.target} ${h.unit || ''}` : ''}
                          </span>
                        </span>
                      </button>
                    </td>
                    {week.map((d) => {
                      const sched = isScheduled(h, d);
                      const v = habitValue(store.habitLogs, h.id, d);
                      const st = habitState(h, v);
                      const future = d > today;
                      return (
                        <td key={d} className="text-center py-2">
                          <button
                            type="button"
                            disabled={future || !sched}
                            onClick={() => actions.setState(h, d, NEXT_STATE[st])}
                            aria-label={`${h.name} ${d}: ${STATE_LABEL[st]}`}
                            className="w-9 h-9 rounded-full inline-flex items-center justify-center border-2 transition cursor-pointer disabled:cursor-default disabled:opacity-25 text-sm font-bold"
                            style={{
                              backgroundColor: st === 'done' ? h.color : st === 'partial' ? `color-mix(in srgb, ${h.color} 30%, transparent)` : st === 'missed' ? 'color-mix(in srgb, var(--danger) 14%, transparent)' : 'transparent',
                              borderColor: st === 'done' ? 'transparent' : st === 'missed' ? 'color-mix(in srgb, var(--danger) 45%, transparent)' : st === 'off' ? 'transparent' : sched ? 'var(--border-app)' : 'transparent',
                              color: st === 'done' ? '#141633' : st === 'missed' ? 'var(--danger)' : 'var(--text-main)',
                            }}
                          >
                            {!sched ? '·' : STATE_MARK[st]}
                          </button>
                        </td>
                      );
                    })}
                    <td className="pr-4 text-right font-num font-bold text-main">{streak(h, store.habitLogs, today)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 sm:px-5 py-2.5 border-t border-subtle text-[11px] text-dim">
            Tocá para cambiar: <b className="text-main">✓</b> cumplí · <b className="text-main">½</b> parcial · <b className="text-[var(--danger)]">✕</b> no cumplí · 🌙 día libre (no corta la racha)
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {active.map((h) => {
          const c = consistency(h);
          return (
            <Card key={h.id}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{h.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg font-semibold text-main">{h.name}</div>
                  {h.why && <p className="text-sm text-muted mt-0.5">{h.why}</p>}
                  {h.minimum && <p className="text-xs mt-2 px-2.5 py-1.5 rounded-xl bg-surface-elevated text-main w-fit">Mínimo viable: {h.minimum}</p>}
                </div>
                <div className="text-right">
                  <div className="font-num text-2xl font-bold" style={{ color: h.color }}>
                    {c}%
                  </div>
                  <div className="text-[10px] font-mono text-dim">30 días</div>
                </div>
              </div>
              <div className="flex gap-[3px] mt-4">
                {last30.map((d) => {
                  const st = habitState(h, habitValue(store.habitLogs, h.id, d));
                  const bg = st === 'done' ? h.color : st === 'partial' ? `color-mix(in srgb, ${h.color} 45%, var(--bg-muted))` : st === 'missed' ? 'color-mix(in srgb, var(--danger) 35%, var(--bg-muted))' : 'var(--bg-muted)';
                  return <div key={d} title={`${d}: ${STATE_LABEL[st]}`} className="flex-1 h-5 rounded-[4px]" style={{ backgroundColor: bg, opacity: isScheduled(h, d) && st !== 'off' ? 1 : 0.35 }} />;
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {habits.some((h) => h.archived) && (
        <div>
          <button type="button" className={btnGhost} onClick={() => setShowArchived(!showArchived)}>
            <Archive className="w-4 h-4" /> Archivados ({habits.filter((h) => h.archived).length})
          </button>
          {showArchived && (
            <div className="flex flex-wrap gap-2 mt-2">
              {habits
                .filter((h) => h.archived)
                .map((h) => (
                  <button key={h.id} type="button" className={btnSecondary} onClick={() => setModal({ open: true, habit: h })}>
                    {h.emoji} {h.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {wizard && <HabitWizard life={life} current={challenge} onClose={() => setWizard(false)} />}
      {modal.open && <HabitModal life={life} initial={modal.habit} onClose={() => setModal({ open: false })} />}
    </div>
  );
};

const HabitModal: React.FC<{ life: LifeApi; initial?: Partial<Habit>; onClose: () => void }> = ({ life, initial, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '✨');
  const [color, setColor] = useState(initial?.color || COLORS[Object.keys(life.store.habits).length % COLORS.length]);
  const [area, setArea] = useState<LifeArea>(initial?.area || 'personal');
  const [kind, setKind] = useState<Habit['kind']>(initial?.kind || 'check');
  const [target, setTarget] = useState(String(initial?.target || ''));
  const [unit, setUnit] = useState(initial?.unit || '');
  const [schedule, setSchedule] = useState<HabitSchedule>(initial?.schedule || 'daily');
  const [days, setDays] = useState<number[]>(initial?.days || [0, 1, 2, 3, 4]);
  const [times, setTimes] = useState(String(initial?.timesPerWeek || 3));
  const [isNegative, setIsNegative] = useState(Boolean(initial?.isNegative));
  const [why, setWhy] = useState(initial?.why || '');
  const [minimum, setMinimum] = useState(initial?.minimum || '');
  const [trigger, setTrigger] = useState(initial?.trigger || '');
  const [reward, setReward] = useState(initial?.reward || '');
  const [remindAt, setRemindAt] = useState(initial?.remindAt || '');
  const isEdit = Boolean(initial?.id);

  const save = () => {
    if (!name.trim()) return;
    const now = nowIso();
    life.upsert('habits', {
      id: initial?.id || newId('habit'),
      name: name.trim(),
      emoji,
      color,
      area,
      kind,
      target: kind === 'count' ? Number(target) || 1 : undefined,
      unit: kind === 'count' ? unit.trim() || undefined : undefined,
      schedule,
      days: schedule === 'days' ? days : undefined,
      timesPerWeek: schedule === 'weekly' ? Number(times) || 1 : undefined,
      isNegative: kind === 'check' ? isNegative : undefined,
      why: why.trim() || undefined,
      minimum: minimum.trim() || undefined,
      trigger: trigger.trim() || undefined,
      reward: reward.trim() || undefined,
      remindAt: remindAt || undefined,
      challengeStart: initial?.challengeStart,
      consolidatedAt: initial?.consolidatedAt,
      archived: initial?.archived,
      sortOrder: initial?.sortOrder ?? Object.keys(life.store.habits).length + 1,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker={isEdit ? 'Editar hábito' : 'Nuevo hábito'}
      title={name || 'Hábito'}
      footer={
        <>
          {isEdit && (
            <>
              <button type="button" className={btnDanger} onClick={() => { life.remove('habits', initial!.id!); onClose(); }}>
                <Trash2 className="w-4 h-4" />
              </button>
              <button type="button" className={btnSecondary} onClick={() => { life.upsert('habits', { ...(initial as Habit), archived: !initial?.archived, updatedAt: nowIso() }); onClose(); }}>
                {initial?.archived ? 'Reactivar' : 'Archivar'}
              </button>
            </>
          )}
          <button type="button" className={btnPrimary} onClick={save} disabled={!name.trim()}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <Field label="Emoji">
          <input className={`${inputCls} text-center text-xl`} value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
        </Field>
        <Field label="Nombre">
          <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Leer la Biblia" />
        </Field>
      </div>
      <Field label="Color" group>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} className={`w-8 h-8 rounded-full cursor-pointer transition ${color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-surface)] ring-[var(--text-main)]' : ''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Área">
          <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value as LifeArea)}>
            {LIFE_AREAS.map((a) => (
              <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as Habit['kind'])}>
            <option value="check">Sí / no</option>
            <option value="count">Cantidad</option>
          </select>
        </Field>
      </div>
      {kind === 'count' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Meta por día">
            <input className={inputCls} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Ej: 30" />
          </Field>
          <Field label="Unidad" hint="Con 'min' se suma solo desde Enfoque">
            <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="min, pág., vasos" />
          </Field>
        </div>
      )}
      {kind === 'check' && (
        <label className="flex items-center gap-2 text-sm text-main cursor-pointer">
          <input type="checkbox" checked={isNegative} onChange={(e) => setIsNegative(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
          Es algo que quiero dejar (lo marco el día que NO lo hice)
        </label>
      )}
      <Field label="Frecuencia" group>
        <div className="flex gap-1.5">
          {([
            ['daily', 'Todos los días'],
            ['days', 'Algunos días'],
            ['weekly', 'X por semana'],
          ] as [HabitSchedule, string][]).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setSchedule(k)} className={`flex-1 px-2 py-2 rounded-full text-xs font-semibold border cursor-pointer ${schedule === k ? 'bg-[var(--text-main)] text-[var(--bg-app)] border-transparent' : 'border-app text-muted'}`}>
              {l}
            </button>
          ))}
        </div>
      </Field>
      {schedule === 'days' && (
        <div className="flex gap-1.5">
          {DAY_NAMES_SHORT.map((d, i) => (
            <button key={d} type="button" onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())} className={`flex-1 py-2 rounded-full text-xs font-semibold border cursor-pointer ${days.includes(i) ? 'bg-accent text-accent-contrast border-transparent' : 'border-app text-muted'}`}>
              {d}
            </button>
          ))}
        </div>
      )}
      {schedule === 'weekly' && (
        <Field label="Veces por semana">
          <input className={inputCls} inputMode="numeric" value={times} onChange={(e) => setTimes(e.target.value)} />
        </Field>
      )}
      <Field label="¿Por qué lo hago?">
        <textarea rows={2} className={textareaCls} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Lo que te recuerda el sentido" />
      </Field>
      <Field label="Versión mínima (para los días difíciles)">
        <input className={inputCls} value={minimum} onChange={(e) => setMinimum(e.target.value)} placeholder="Ej: 1 página, 5 flexiones" />
      </Field>
      <Field label="Disparador" hint="Cada vez que…">
        <input className={inputCls} value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Ej: cada vez que me lavo los dientes a la noche" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Recompensa">
          <input className={inputCls} value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Ej: un mate tranquilo" />
        </Field>
        <Field label="Recordatorio" hint="Aviso push a esa hora">
          <input type="time" className={inputCls} value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
};
