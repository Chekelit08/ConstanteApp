import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { Habit, LifeArea, LIFE_AREAS } from '../types/life';
import { getTodayDateString } from '../utils/dateUtils';
import { challengeDay, completionRate } from '../utils/habits';
import { newId, nowIso } from '../utils/lifeUtils';
import { btnGhost, btnPrimary, btnSecondary, Chip, Field, inputCls, Modal, Ring, textareaCls } from './ui';
import { useToast } from './Toast';

/**
 * "Cómo formar cualquier hábito en 30 días" (Superhábitos):
 * de a uno por vez, con motivación, disparador, rutina medible, recompensa y recordatorio.
 */

const CHALLENGE_DAYS = 30;

/** Tarjeta del hábito del mes (o invitación a empezar uno) */
export const MonthHabitCard: React.FC<{ life: LifeApi; habit?: Habit; onStart: () => void }> = ({ life, habit, onStart }) => {
  const today = getTodayDateString();
  const { showToast } = useToast();

  if (!habit) {
    const consolidated = Object.values(life.store.habits).filter((h) => h.consolidatedAt).length;
    return (
      <section className="rounded-[28px] p-5 border border-dashed border-app bg-surface flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-accent text-xs font-mono uppercase tracking-[0.14em]">
            <Sparkles className="w-3.5 h-3.5" /> Hábito del mes
          </div>
          <p className="text-sm text-main mt-1.5">Un hábito nuevo por vez, 30 días, hasta que se vuelva automático.</p>
          {consolidated > 0 && <p className="text-xs text-dim mt-1">Ya consolidaste {consolidated} {consolidated === 1 ? 'hábito' : 'hábitos'} 💪</p>}
        </div>
        <button type="button" className={btnPrimary} onClick={onStart}>
          Empezar el reto de 30 días
        </button>
      </section>
    );
  }

  const day = challengeDay(habit, today) || 1;
  const rate = completionRate(habit, life.store.habitLogs, habit.challengeStart!, today);
  const finished = day > CHALLENGE_DAYS;

  const consolidate = () => {
    life.upsert('habits', { ...habit, consolidatedAt: today, updatedAt: nowIso() });
    showToast(`¡${habit.name} ya es parte tuyo! Elegí el próximo desafío 🎉`, { type: 'success' });
  };
  const extend = () => {
    life.upsert('habits', { ...habit, challengeStart: today, updatedAt: nowIso() });
    showToast('Otros 30 días. Ajustá la versión mínima si hace falta.');
  };

  return (
    <section className="rounded-[28px] p-5 border border-subtle shadow-card bg-[radial-gradient(120%_140%_at_100%_0%,color-mix(in_srgb,var(--accent)_20%,transparent),transparent_60%),var(--bg-surface)]">
      <div className="flex items-center gap-4">
        <Ring value={(Math.min(day, CHALLENGE_DAYS) / CHALLENGE_DAYS) * 100} size={88} stroke={8} color={habit.color}>
          <span className="font-num text-2xl font-bold text-main leading-none">{Math.min(day, CHALLENGE_DAYS)}</span>
          <span className="text-[10px] text-dim font-mono">de {CHALLENGE_DAYS}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-accent text-[11px] font-mono uppercase tracking-[0.14em]">Hábito del mes</div>
          <div className="font-display text-xl font-bold text-main truncate">
            {habit.emoji} {habit.name}
          </div>
          <div className="text-xs text-muted mt-1">
            {rate.total ? `Cumpliste ${rate.pct}% de los días` : 'Arranca hoy'}
            {habit.trigger ? ` · ${habit.trigger}` : ''}
          </div>
          {habit.reward && <div className="text-xs text-dim mt-0.5">🎁 {habit.reward}</div>}
        </div>
      </div>
      {finished ? (
        <div className="mt-4 p-3 rounded-2xl bg-surface-elevated space-y-2">
          <p className="text-sm text-main font-semibold">Pasaron 30 días. ¿Ya es automático, o todavía te cuesta fuerza de voluntad?</p>
          <div className="flex gap-2">
            <button type="button" className={`${btnPrimary} flex-1`} onClick={consolidate}>
              <Check className="w-4 h-4" /> Ya es automático
            </button>
            <button type="button" className={`${btnSecondary} flex-1`} onClick={extend}>
              30 días más
            </button>
          </div>
        </div>
      ) : (
        day % 7 === 0 && (
          <p className="mt-3 text-xs text-muted">📅 Semana {day / 7}: ¿cómo vas? Proponete una pequeña mejora para la que viene.</p>
        )
      )}
    </section>
  );
};

const COLORS = ['#FF8A5B', '#FFC861', '#5FD4A8', '#8FB3FF', '#B69CFF', '#FF8A9B'];

const STEPS = ['Qué', 'Por qué', 'Disparador', 'Rutina', 'Recompensa'];

/** Asistente para crear el hábito del mes */
export const HabitWizard: React.FC<{ life: LifeApi; current?: Habit; onClose: () => void }> = ({ life, current, onClose }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: '',
    emoji: '✨',
    area: 'personal' as LifeArea,
    why: '',
    trigger: '',
    remindAt: '',
    kind: 'check' as Habit['kind'],
    target: '',
    unit: '',
    minimum: '',
    reward: '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });
  const canNext = [f.name.trim(), f.why.trim(), f.trigger.trim(), f.kind === 'check' || Number(f.target) > 0, true][step];

  const save = () => {
    const now = nowIso();
    const today = getTodayDateString();
    life.upsert('habits', {
      id: newId('habit'),
      name: f.name.trim(),
      emoji: f.emoji || '✨',
      color: COLORS[Object.keys(life.store.habits).length % COLORS.length],
      area: f.area,
      kind: f.kind,
      target: f.kind === 'count' ? Number(f.target) || 1 : undefined,
      unit: f.kind === 'count' ? f.unit.trim() || undefined : undefined,
      schedule: 'daily',
      why: f.why.trim(),
      minimum: f.minimum.trim() || undefined,
      trigger: f.trigger.trim(),
      reward: f.reward.trim() || undefined,
      remindAt: f.remindAt || undefined,
      challengeStart: today,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
    showToast('¡Arrancó tu reto de 30 días! 🔥', { type: 'success' });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker={`Hábito del mes · paso ${step + 1} de ${STEPS.length}`}
      title={STEPS[step]}
      footer={
        <>
          {step > 0 && (
            <button type="button" className={btnGhost} onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className={btnPrimary} disabled={!canNext} onClick={() => setStep(step + 1)}>
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" className={btnPrimary} onClick={save}>
              <Sparkles className="w-4 h-4" /> Empezar los 30 días
            </button>
          )}
        </>
      }
    >
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface-elevated'}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          {current && (
            <p className="text-sm p-3 rounded-2xl bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] text-main">
              Ya tenés un reto activo: <b>{current.emoji} {current.name}</b>. La guía recomienda un hábito por vez; si igual querés sumar otro, seguí.
            </p>
          )}
          <p className="text-sm text-muted">Empezá de a poco: un solo hábito, concreto y específico. "Leer 10 páginas" en vez de "leer más".</p>
          <div className="grid grid-cols-[72px_1fr] gap-2">
            <Field label="Emoji">
              <input className={`${inputCls} text-center text-xl`} value={f.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={4} />
            </Field>
            <Field label="Mi hábito">
              <input autoFocus className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: 10 flexiones" />
            </Field>
          </div>
          <Field label="Área" group>
            <div className="flex flex-wrap gap-1.5">
              {LIFE_AREAS.map((a) => (
                <Chip key={a.id} active={f.area === a.id} color={a.color} onClick={() => set('area', a.id)}>
                  {a.emoji} {a.label}
                </Chip>
              ))}
            </div>
          </Field>
        </>
      )}

      {step === 1 && (
        <>
          <p className="text-sm text-muted">La motivación es más importante que la disciplina. Dejá las expectativas de lado y anotá el sentido real.</p>
          <Field label="¿Por qué quiero este hábito?">
            <textarea autoFocus rows={3} className={textareaCls} value={f.why} onChange={(e) => set('why', e.target.value)} placeholder="Ej: quiero tener energía para estudiar y servir" />
          </Field>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-sm text-muted">Atalo a algo que ya hacés todos los días. Así no depende de acordarte.</p>
          <Field label="Cada vez que…">
            <input autoFocus className={inputCls} value={f.trigger} onChange={(e) => set('trigger', e.target.value)} placeholder="Ej: me lavo los dientes a la mañana" />
          </Field>
          <Field label="Recordatorio (opcional)" hint="Te llega un aviso a esa hora si tenés los recordatorios activos">
            <input type="time" className={inputCls} value={f.remindAt} onChange={(e) => set('remindAt', e.target.value)} />
          </Field>
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-sm text-muted">Que sea simple saber si cumpliste.</p>
          <Field label="¿Cómo lo medís?" group>
            <div className="flex gap-1.5">
              <Chip active={f.kind === 'check'} onClick={() => set('kind', 'check')}>
                Sí / no
              </Chip>
              <Chip active={f.kind === 'count'} onClick={() => set('kind', 'count')}>
                Cantidad
              </Chip>
            </div>
          </Field>
          {f.kind === 'count' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Meta por día">
                <input className={inputCls} inputMode="numeric" value={f.target} onChange={(e) => set('target', e.target.value)} placeholder="10" />
              </Field>
              <Field label="Unidad">
                <input className={inputCls} value={f.unit} onChange={(e) => set('unit', e.target.value)} placeholder="flexiones, min, pág." />
              </Field>
            </div>
          )}
          <Field label="Versión mínima (para los días difíciles)">
            <input className={inputCls} value={f.minimum} onChange={(e) => set('minimum', e.target.value)} placeholder="Ej: 3 flexiones" />
          </Field>
        </>
      )}

      {step === 4 && (
        <>
          <p className="text-sm text-muted">Una recompensa chica e inmediata le enseña al cerebro que vale la pena.</p>
          <Field label="Mi recompensa">
            <input autoFocus className={inputCls} value={f.reward} onChange={(e) => set('reward', e.target.value)} placeholder="Ej: un mate tranquilo" />
          </Field>
          <div className="p-3 rounded-2xl bg-surface-elevated text-sm text-main space-y-1">
            <p>✅ Contáselo a alguien con quien vivís o a un amigo: el entorno ayuda.</p>
            <p>✅ Un día libre no corta la racha; un día fallado tampoco te define.</p>
            <p>✅ Cada semana te voy a preguntar cómo vas.</p>
          </div>
        </>
      )}
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// MICROHÁBITO DE LA SEMANA ("integrar un microhábito cada semana")
// ─────────────────────────────────────────────────────────────
const MICRO: { name: string; emoji: string; how: string }[] = [
  { name: 'Visualizá tu día antes de vivirlo', emoji: '🌅', how: '2 minutos a la mañana imaginando cómo querés que salga tu día.' },
  { name: 'Una más', emoji: '➕', how: 'Cuando quieras cortar (una página, una repetición, un pomodoro), hacé una más.' },
  { name: 'Elijo en vez de tengo que', emoji: '🗣️', how: 'Cambiá "tengo que estudiar" por "elijo estudiar". Cambia cómo lo vivís.' },
  { name: '¿Amor o miedo?', emoji: '💛', how: 'Antes de decidir, preguntate si lo hacés desde el amor o desde el miedo.' },
  { name: 'Tu yo de 80 años', emoji: '👴', how: 'Ante una duda: ¿qué te aconsejaría tu yo de 80 años?' },
  { name: 'Hablá en voz alta y con intención', emoji: '🎙️', how: 'Decí tu compromiso del día en voz alta. Lo que decís, lo hacés.' },
  { name: 'Decisión lenta, acción rápida', emoji: '⚡', how: 'Pensá bien antes de decidir; una vez decidido, movete sin vueltas.' },
  { name: 'Su nombre', emoji: '🙋', how: 'Aprendé y usá el nombre de cada persona con la que hablás.' },
  { name: 'Consecuencias de segundo grado', emoji: '🔭', how: 'Preguntate "¿y después qué?" antes de elegir lo cómodo.' },
  { name: 'Acción mínima viable', emoji: '🪨', how: 'Si no tenés ganas, hacé la versión más chica posible. Pero hacela.' },
  { name: 'Comete la rana', emoji: '🐸', how: 'Lo más difícil del día, primero.' },
  { name: 'Agradecé antes de comer', emoji: '🙏', how: 'Un momento de gratitud antes de cada comida.' },
  { name: 'Mirá a los ojos y sonreí', emoji: '😊', how: 'En cada saludo, contacto visual y una sonrisa.' },
  { name: 'Abrazos largos', emoji: '🤗', how: 'Abrazos de verdad con tu familia y amigos, sin apuro.' },
  { name: 'Pedí perdón rápido', emoji: '🕊️', how: 'Cuando te equivocás, no lo estires: pedí perdón ese mismo día.' },
];

const MICRO_KEY = 'norte_micro_offset';

export const MicroHabitCard: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { showToast } = useToast();
  const today = getTodayDateString();
  const week = Math.floor(Date.parse(`${today}T12:00:00Z`) / (7 * 86400000));
  const [offset, setOffset] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(MICRO_KEY) || 'null') as { week: number; offset: number } | null;
      return raw && raw.week === week ? raw.offset : 0;
    } catch {
      return 0;
    }
  });
  const m = MICRO[(week + offset) % MICRO.length];
  const already = Object.values(life.store.habits).some((h) => h.name === m.name && !h.archived);

  const shuffle = () => {
    const next = offset + 1;
    setOffset(next);
    try {
      localStorage.setItem(MICRO_KEY, JSON.stringify({ week, offset: next }));
    } catch {
      /* sin storage */
    }
  };
  const adopt = () => {
    const now = nowIso();
    life.upsert('habits', {
      id: newId('habit'),
      name: m.name,
      emoji: m.emoji,
      color: '#B69CFF',
      area: 'personal',
      kind: 'check',
      schedule: 'daily',
      why: m.how,
      sortOrder: Object.keys(life.store.habits).length + 1,
      createdAt: now,
      updatedAt: now,
    });
    showToast('Microhábito sumado por esta semana ✓', { type: 'success' });
  };

  return (
    <section className="rounded-[24px] p-4 border border-subtle bg-surface flex items-start gap-3">
      <span className="text-3xl leading-none">{m.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--violet)]">Microhábito de la semana</div>
        <div className="font-display text-lg font-bold text-main">{m.name}</div>
        <p className="text-sm text-muted">{m.how}</p>
        <div className="flex gap-2 mt-2">
          {!already && (
            <button type="button" className={btnSecondary} onClick={adopt}>
              Sumarlo esta semana
            </button>
          )}
          <button type="button" className={btnGhost} onClick={shuffle}>
            Otro
          </button>
        </div>
      </div>
    </section>
  );
};
