import React, { useMemo, useState } from 'react';
import { CalendarCheck, Compass, Eye, Trophy, Flag, Layers, Lock, Mail, MountainSnow, NotebookPen, Plus, RefreshCcw, Target, Trash2, Unlock } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { Letter, MonthlyReview, PurposeData } from '../types/life';
import { computeIndicators, Indicator } from '../services/indicators';
import { formatArgentineDate, getTodayDateString } from '../utils/dateUtils';
import { currentMonthKey, daysBetween, lastSundayOfMonth, monthLabel, newId, nowIso, quarterOf } from '../utils/lifeUtils';
import { btnDanger, btnGhost, btnPrimary, btnSecondary, Card, Field, inputCls, Modal, PageHeader, ProgressBar, Tabs, textareaCls } from '../components/ui';
import { useToast } from '../components/Toast';
import { MatchCard, QuarterReviewTab, weekToReview, WeeklyReviewTab } from '../components/Reviews';

type PTab = 'panel' | 'week' | 'quarter' | 'vision' | 'roles' | 'quarters' | 'review' | 'struggles' | 'letters';

interface Props {
  life: LifeApi;
}

export const PurposeView: React.FC<Props> = ({ life }) => {
  const [tab, setTab] = useState<PTab>('panel');
  const purpose = life.store.purpose;
  const savePurpose = (patch: Partial<PurposeData>) => life.patchSingleton('purpose', patch);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`Palabra del año: ${purpose.wordOfYear}`}
        title="Brújula"
        subtitle="Dirección antes que velocidad. Tu visión, tu misión y tu plan 2026, conectados con lo que hacés cada día."
      />
      <Tabs
        value={tab}
        onChange={(v) => setTab(v as PTab)}
        tabs={[
          { id: 'panel', label: 'Panel 2026', icon: <Target className="w-3.5 h-3.5" /> },
          { id: 'week', label: 'Revisión semanal', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
          { id: 'quarter', label: 'Trimestral', icon: <Trophy className="w-3.5 h-3.5" /> },
          { id: 'vision', label: 'Visión & misión', icon: <Eye className="w-3.5 h-3.5" /> },
          { id: 'roles', label: 'Roles', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'quarters', label: 'Trimestres', icon: <Flag className="w-3.5 h-3.5" /> },
          { id: 'review', label: 'Revisión mensual', icon: <RefreshCcw className="w-3.5 h-3.5" /> },
          { id: 'struggles', label: 'Lo que cuesta', icon: <MountainSnow className="w-3.5 h-3.5" /> },
          { id: 'letters', label: 'Cartas', icon: <Mail className="w-3.5 h-3.5" /> },
        ]}
      />
      {tab === 'panel' && <PanelTab life={life} goTo={setTab} />}
      {tab === 'week' && <WeeklyReviewTab life={life} />}
      {tab === 'quarter' && <QuarterReviewTab life={life} />}
      {tab === 'vision' && <VisionTab purpose={purpose} save={savePurpose} />}
      {tab === 'roles' && <RolesTab life={life} />}
      {tab === 'quarters' && <QuartersTab purpose={purpose} />}
      {tab === 'review' && <ReviewTab life={life} />}
      {tab === 'struggles' && <StrugglesTab purpose={purpose} save={savePurpose} />}
      {tab === 'letters' && <LettersTab life={life} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PANEL
// ─────────────────────────────────────────────────────────────
const IndicatorRow: React.FC<{ ind: Indicator }> = ({ ind }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-main">{ind.label}</span>
      <span className={`font-mono font-bold shrink-0 ${ind.ok === true ? 'text-[var(--mint)]' : ind.ok === false ? 'text-[var(--danger)]' : 'text-muted'}`}>
        {ind.value} {ind.ok === true ? '✓' : ''}
      </span>
    </div>
    {typeof ind.progress === 'number' && <ProgressBar value={ind.progress} height="h-1.5" color={ind.ok ? 'var(--mint)' : undefined} />}
  </div>
);

const PanelTab: React.FC<{ life: LifeApi; goTo: (t: PTab) => void }> = ({ life, goTo }) => {
  const purpose = life.store.purpose;
  const today = getTodayDateString();
  const year = today.slice(0, 4);
  const daysLeft = daysBetween(today, `${year}-12-31`);
  const yearPct = Math.round(((365 - daysLeft) / 365) * 100);
  const q = purpose.quarters.find((x) => x.id === quarterOf(today));
  const indicators = useMemo(() => computeIndicators(life.store), [life.store]);
  const okCount = indicators.filter((i) => i.ok === true).length;
  const measured = indicators.filter((i) => i.ok !== null).length;
  const reviewDay = lastSundayOfMonth(currentMonthKey());
  const reviewDone = Boolean(life.store.reviews[currentMonthKey()]);

  const groups: { id: string; title: string }[] = [
    ...purpose.roles.map((r) => ({ id: r.id, title: `${r.emoji} ${r.letter}. ${r.area}` })),
    { id: 'finance', title: '💸 Finanzas' },
  ];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[26px] bg-surface border border-subtle p-6 sm:p-8">
        <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 font-num font-bold text-[90px] sm:text-[150px] leading-none text-accent opacity-10 select-none pointer-events-none">{purpose.wordOfYear}</div>
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-accent">🕊 Palabra del año</span>
        <h3 className="font-num font-bold text-6xl sm:text-7xl text-main leading-none mt-1">{purpose.wordOfYear}</h3>
        <p className="text-sm text-muted italic mt-2 max-w-xl">{purpose.wordMeaning}</p>
        <div className="mt-5 max-w-md space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-muted">
            <span>{year} recorrido</span>
            <span>
              {yearPct}% · quedan {daysLeft} días
            </span>
          </div>
          <ProgressBar value={yearPct} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {q && (
          <Card title={`${q.id} · ${q.months}`} icon={<Flag className="w-4 h-4" />} className="lg:col-span-2">
            <h4 className="font-display text-xl font-bold text-main">{q.title}</h4>
            <p className="text-sm text-accent italic mt-1">“{q.question}”</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {q.blocks.map((b) => (
                <div key={b.area} className="p-3 rounded-2xl bg-surface-elevated">
                  <div className="text-xs font-bold text-main mb-1.5">{b.area}</div>
                  <ul className="space-y-1">
                    {b.items.map((it) => (
                      <li key={it} className="text-[12px] text-muted flex gap-1.5">
                        <span className="text-accent">•</span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        )}
        <div className="space-y-4">
          <Card title="Revisión semanal" icon={<CalendarCheck className="w-4 h-4" />}>
            <p className="text-sm text-main">
              {life.store.weeklyReviews?.[weekToReview()] ? '✓ Ya revisaste esta semana.' : 'El domingo: 20 minutos para mirar tu semana y planear la que viene.'}
            </p>
            <button type="button" className={`${life.store.weeklyReviews?.[weekToReview()] ? btnSecondary : btnPrimary} w-full mt-3`} onClick={() => goTo('week')}>
              {life.store.weeklyReviews?.[weekToReview()] ? 'Ver revisión' : 'Hacer revisión semanal'}
            </button>
          </Card>
          <MatchCard life={life} onOpen={() => goTo('quarter')} />
          <Card title="Revisión mensual" icon={<RefreshCcw className="w-4 h-4" />}>
            <p className="text-sm text-main">
              {reviewDone ? '✓ Ya hiciste la revisión de este mes.' : `Toca el ${formatArgentineDate(reviewDay, { includeDayName: true })}.`}
            </p>
            <button type="button" className={`${reviewDone ? btnSecondary : btnPrimary} w-full mt-3`} onClick={() => goTo('review')}>
              {reviewDone ? 'Ver revisión' : 'Hacer revisión'}
            </button>
          </Card>
          <Card title="Principios rectores" icon={<Compass className="w-4 h-4" />}>
            <ul className="space-y-1.5">
              {purpose.principles.map((p) => (
                <li key={p} className="text-sm text-main">
                  {p}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card
        title={`Indicadores vivos · ${okCount}/${measured} en verde`}
        icon={<Target className="w-4 h-4" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((g) => {
            const list = indicators.filter((i) => i.roleId === g.id);
            if (!list.length) return null;
            return (
              <div key={g.id} className="p-4 rounded-2xl bg-surface-elevated space-y-2.5">
                <div className="text-xs font-semibold text-main">{g.title}</div>
                {list.map((ind) => (
                  <IndicatorRow key={ind.label} ind={ind} />
                ))}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-dim mt-3">Se calculan solos con lo que registrás en Finanzas, Universidad, Personas, Fe, Tiempo y Hábitos.</p>
      </Card>

      <Card title="Declaración final" icon={<NotebookPen className="w-4 h-4" />}>
        <p className="text-sm sm:text-base text-main whitespace-pre-line italic leading-relaxed">{purpose.finalDeclaration}</p>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VISIÓN & MISIÓN
// ─────────────────────────────────────────────────────────────
const EditableText: React.FC<{ title: string; value: string; onSave: (v: string) => void; rows?: number; icon?: React.ReactNode; serif?: boolean }> = ({ title, value, onSave, rows = 8, icon, serif }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <Card
      title={title}
      icon={icon}
      action={
        editing ? (
          <div className="flex gap-1">
            <button type="button" className={btnGhost} onClick={() => { setDraft(value); setEditing(false); }}>Cancelar</button>
            <button type="button" className={btnPrimary} onClick={() => { onSave(draft); setEditing(false); }}>Guardar</button>
          </div>
        ) : (
          <button type="button" className={btnGhost} onClick={() => { setDraft(value); setEditing(true); }}>Editar</button>
        )
      }
    >
      {editing ? (
        <textarea rows={rows} className={textareaCls} value={draft} onChange={(e) => setDraft(e.target.value)} />
      ) : value ? (
        <p className={`text-sm text-main whitespace-pre-line leading-relaxed ${serif ? 'font-serif text-base' : ''}`}>{value}</p>
      ) : (
        <p className="text-sm text-muted italic">Vacío. Tocá Editar para escribirlo.</p>
      )}
    </Card>
  );
};

const EditableList: React.FC<{ title: string; items: string[]; onSave: (v: string[]) => void; icon?: React.ReactNode; numbered?: boolean }> = ({ title, items, onSave, icon, numbered }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items.join('\n'));
  return (
    <Card
      title={title}
      icon={icon}
      action={
        editing ? (
          <div className="flex gap-1">
            <button type="button" className={btnGhost} onClick={() => setEditing(false)}>Cancelar</button>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                onSave(draft.split('\n').map((l) => l.trim()).filter(Boolean));
                setEditing(false);
              }}
            >
              Guardar
            </button>
          </div>
        ) : (
          <button type="button" className={btnGhost} onClick={() => { setDraft(items.join('\n')); setEditing(true); }}>Editar</button>
        )
      }
    >
      {editing ? (
        <textarea rows={Math.max(5, items.length + 2)} className={textareaCls} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Uno por línea" />
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="text-sm text-main flex gap-2">
              <span className="text-accent font-mono text-xs mt-0.5 shrink-0">{numbered ? `${i + 1}.` : '•'}</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const VisionTab: React.FC<{ purpose: PurposeData; save: (p: Partial<PurposeData>) => void }> = ({ purpose, save }) => (
  <div className="space-y-4">
    <EditableText title="Misión personal" value={purpose.mission} onSave={(v) => save({ mission: v })} icon={<Flag className="w-4 h-4" />} serif />
    <EditableText title="Visión personal (de por vida)" value={purpose.lifeVision} onSave={(v) => save({ lifeVision: v })} icon={<Eye className="w-4 h-4" />} rows={14} />
    <Card title="Visión diciembre 2026: así quiero verme" icon={<Target className="w-4 h-4" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {purpose.vision2026.map((v) => (
          <div key={v.area} className="p-3 rounded-2xl bg-surface-elevated">
            <div className="text-xs font-bold text-main">{v.area}</div>
            <p className="text-[13px] text-muted mt-1 leading-relaxed">{v.text}</p>
          </div>
        ))}
      </div>
    </Card>
    <EditableText title="Manifiesto 2026" value={purpose.manifesto} onSave={(v) => save({ manifesto: v })} icon={<NotebookPen className="w-4 h-4" />} rows={16} serif />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <EditableList title="Mis valores" items={purpose.values} onSave={(v) => save({ values: v })} />
      <EditableList title="Sueños antes de morir" items={purpose.dreams} onSave={(v) => save({ dreams: v })} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────
const RolesTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const indicators = useMemo(() => computeIndicators(life.store), [life.store]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {life.store.purpose.roles.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center font-num font-bold text-3xl shrink-0">{r.letter}</div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
                {r.emoji} {r.area}
              </div>
              <h4 className="font-display text-lg font-bold text-main leading-tight">{r.role}</h4>
            </div>
          </div>
          <p className="text-sm text-main mt-3">
            <b>🎯 Objetivo:</b> {r.objective}
          </p>
          <p className="text-sm text-accent italic mt-2">❤️ {r.loveCriterion}</p>
          <p className="text-xs text-muted mt-2">
            <b className="text-main">Identidad:</b> {r.identity}
          </p>
          <div className="mt-3 pt-3 border-t border-app space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Indicadores del plan</span>
            {r.indicators.map((i) => (
              <div key={i} className="text-xs text-main">
                • {i}
              </div>
            ))}
          </div>
          {indicators.some((i) => i.roleId === r.id) && (
            <div className="mt-3 p-3 rounded-2xl bg-surface-elevated space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Cómo vas hoy</span>
              {indicators
                .filter((i) => i.roleId === r.id)
                .map((ind) => (
                  <IndicatorRow key={ind.label} ind={ind} />
                ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TRIMESTRES
// ─────────────────────────────────────────────────────────────
const QuartersTab: React.FC<{ purpose: PurposeData }> = ({ purpose }) => {
  const current = quarterOf(getTodayDateString());
  return (
    <div className="space-y-4">
      {purpose.quarters.map((q) => (
        <Card key={q.id} className={q.id === current ? 'ring-2 ring-[var(--accent)]' : q.id < current ? 'opacity-70' : ''}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-display text-xl font-bold text-main">
              {q.id} · {q.title}
            </h4>
            <span className="text-xs font-mono text-muted">
              {q.months} {q.id === current ? '· AHORA' : q.id < current ? '· cerrado' : ''}
            </span>
          </div>
          <p className="text-sm text-accent italic mt-1">“{q.question}”</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {q.blocks.map((b) => (
              <div key={b.area} className="p-3 rounded-2xl bg-surface-elevated">
                <div className="text-xs font-bold text-main mb-1.5">{b.area}</div>
                <ul className="space-y-1">
                  {b.items.map((it) => (
                    <li key={it} className="text-[12px] text-muted">
                      • {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// REVISIÓN MENSUAL
// ─────────────────────────────────────────────────────────────
const ReviewTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const purpose = life.store.purpose;
  const [month, setMonth] = useState(currentMonthKey());
  const existing = life.store.reviews[month];
  const [answers, setAnswers] = useState<string[]>(existing?.answers || purpose.reviewQuestions.map(() => ''));
  const [ratings, setRatings] = useState<Record<string, number>>(existing?.ratings || {});
  const { showToast } = useToast();
  const history = Object.values(life.store.reviews).sort((a, b) => b.month.localeCompare(a.month));

  const load = (key: string) => {
    setMonth(key);
    const r = life.store.reviews[key];
    setAnswers(r?.answers || purpose.reviewQuestions.map(() => ''));
    setRatings(r?.ratings || {});
  };

  const save = () => {
    const now = nowIso();
    const r: MonthlyReview = { id: month, month, answers, ratings, createdAt: existing?.createdAt || now, updatedAt: now };
    life.upsert('reviews', r);
    showToast('Revisión guardada. Dirección antes que velocidad. 🧭', { type: 'success' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card title={`Revisión · ${monthLabel(month)}`} icon={<RefreshCcw className="w-4 h-4" />}>
          <p className="text-xs text-muted mb-4">Todos los últimos domingos del mes. Respondé con honestidad, sin castigarte.</p>
          <div className="space-y-4">
            {purpose.reviewQuestions.map((q, i) => (
              <Field key={i} label={`${i + 1}. ${q}`}>
                <textarea rows={2} className={textareaCls} value={answers[i] || ''} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} />
              </Field>
            ))}
          </div>
        </Card>
        <Card title="¿Cómo estuvo cada rol? (1 a 5)" icon={<Layers className="w-4 h-4" />}>
          <div className="space-y-2.5">
            {purpose.roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-main">
                  {r.emoji} {r.area}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRatings({ ...ratings, [r.id]: n })}
                      className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer border ${(ratings[r.id] || 0) >= n ? 'bg-accent text-accent-contrast border-accent' : 'bg-surface-elevated border-app text-muted'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <button type="button" className={`${btnPrimary} w-full`} onClick={save}>
          Guardar revisión de {monthLabel(month)}
        </button>
      </div>
      <Card title="Historial" icon={<NotebookPen className="w-4 h-4" />}>
        <div className="space-y-2">
          <button type="button" className={`${btnSecondary} w-full`} onClick={() => load(currentMonthKey())}>
            Este mes
          </button>
          {history.length === 0 && <p className="text-xs text-muted italic">Todavía no hay revisiones.</p>}
          {history.map((r) => {
            const vals = Object.values(r.ratings);
            const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
            return (
              <button key={r.id} type="button" onClick={() => load(r.month)} className={`w-full text-left p-3 rounded-xl border cursor-pointer ${r.month === month ? 'border-accent bg-accent-subtle' : 'border-app bg-surface-elevated'}`}>
                <div className="text-sm font-semibold text-main">{monthLabel(r.month)}</div>
                <div className="text-[11px] text-muted font-mono">{avg ? `promedio ${avg.toFixed(1)}/5` : 'sin puntajes'}</div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LO QUE CUESTA + ANTIVISIÓN
// ─────────────────────────────────────────────────────────────
const StrugglesTab: React.FC<{ purpose: PurposeData; save: (p: Partial<PurposeData>) => void }> = ({ purpose, save }) => (
  <div className="space-y-4">
    <div className="p-4 rounded-2xl bg-surface-elevated border border-app text-sm text-main italic">
      “No espero cambiar todo de un día para el otro. Mi compromiso es avanzar paso a paso, siendo constante. Cada pequeña decisión que tome hoy está formando al hombre que quiero ser mañana.”
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <EditableList title="🚨 Lo que hoy me cuesta" items={purpose.struggles} onSave={(v) => save({ struggles: v })} />
      <EditableList title="✅ Lo que debo hacer" items={purpose.actions} onSave={(v) => save({ actions: v })} numbered />
    </div>
    <EditableText
      title="Antivisión: en quién me convierto si elijo el camino cómodo"
      value={purpose.antiVision}
      onSave={(v) => save({ antiVision: v })}
      icon={<MountainSnow className="w-4 h-4" />}
      rows={8}
    />
    <p className="text-[11px] text-dim">
      Del curso de Adrià Solà: escribí con detalle cómo sería tu vida en 5 años si seguís tus peores hábitos. Genera el rechazo necesario para elegir distinto hoy.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CARTAS
// ─────────────────────────────────────────────────────────────
const LettersTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const today = getTodayDateString();
  const letters = Object.values(life.store.letters).sort((a, b) => b.writtenAt.localeCompare(a.writtenAt));
  const [open, setOpen] = useState<Letter | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className={btnPrimary} onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4" /> Escribir carta a mi yo futuro
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {letters.map((l) => {
          const sealed = l.openAt && l.openAt > today;
          return (
            <button key={l.id} type="button" onClick={() => setOpen(l)} className="text-left p-5 rounded-[26px] bg-surface border border-subtle hover:border-accent cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{l.emoji}</span>
                {sealed ? <Lock className="w-4 h-4 text-muted" /> : <Unlock className="w-4 h-4 text-accent" />}
              </div>
              <h4 className="font-display text-lg font-bold text-main mt-2">{l.title}</h4>
              <p className="text-[11px] font-mono text-muted">
                Escrita el {formatArgentineDate(l.writtenAt)}
                {l.openAt ? ` · ${sealed ? 'sellada hasta' : 'para abrir el'} ${formatArgentineDate(l.openAt)}` : ''}
              </p>
            </button>
          );
        })}
      </div>
      {open && (
        <Modal
          open
          wide
          onClose={() => setOpen(null)}
          kicker={`Carta · ${formatArgentineDate(open.writtenAt)}`}
          title={open.title}
          footer={
            <>
              <button type="button" className={btnDanger} onClick={() => { life.remove('letters', open.id); setOpen(null); }}>
                <Trash2 className="w-4 h-4" /> Borrar
              </button>
              <button type="button" className={btnSecondary} onClick={() => setOpen(null)}>Cerrar</button>
            </>
          }
        >
          {open.openAt && open.openAt > today && (
            <p className="text-xs text-accent font-semibold">🔒 La sellaste para abrirla el {formatArgentineDate(open.openAt)}. La podés leer igual, pero quizás vale la pena esperar.</p>
          )}
          <p className="font-serif text-base text-main whitespace-pre-line leading-relaxed">{open.body}</p>
        </Modal>
      )}
      {newOpen && <LetterModal life={life} onClose={() => setNewOpen(false)} />}
    </div>
  );
};

const LetterModal: React.FC<{ life: LifeApi; onClose: () => void }> = ({ life, onClose }) => {
  const today = getTodayDateString();
  const [title, setTitle] = useState(`Carta · ${formatArgentineDate(today)}`);
  const [emoji, setEmoji] = useState('✉️');
  const [openAt, setOpenAt] = useState(`${Number(today.slice(0, 4)) + 1}${today.slice(4)}`);
  const [body, setBody] = useState('Si estás leyendo esto, quiero que recuerdes dónde estabas cuando escribiste estas líneas…\n\n');
  const save = () => {
    if (!body.trim()) return;
    life.upsert('letters', { id: newId('letter'), title: title.trim() || 'Carta', emoji, writtenAt: today, openAt: openAt || undefined, body: body.trim(), createdAt: nowIso() });
    onClose();
  };
  return (
    <Modal
      open
      wide
      onClose={onClose}
      kicker="Nueva carta"
      title="A mi yo futuro"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save}>Sellar carta</button>
        </>
      }
    >
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <Field label="Emoji">
          <input className={`${inputCls} text-center`} value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
        </Field>
        <Field label="Título">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </div>
      <Field label="Abrir el">
        <input type="date" className={inputCls} value={openAt} onChange={(e) => setOpenAt(e.target.value)} />
      </Field>
      <Field label="Carta">
        <textarea rows={12} className={`${textareaCls} font-serif`} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
    </Modal>
  );
};
