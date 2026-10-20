import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Heart, Minus, Moon, Play, Plus, Share2, Smartphone, Sun, Wallet } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { useHabitActions } from '../hooks/useHabitActions';
import { Section } from '../sections';
import { SkyHero } from '../components/SkyHero';
import { formatClock, useFocus } from '../components/FocusContext';
import { getAgendaForDate, getUpcomingEvaluations } from '../services/agenda';
import { useCalendarFeeds } from '../services/calendarFeeds';
import { getVerseForDate, THEME_INFO } from '../services/verses';
import { addDays, getTodayDateString } from '../utils/dateUtils';
import { dayCompletion, habitsForDate, habitValue, isDone, streak, weekCount } from '../utils/habits';
import { currentMonthKey, daysBetween, formatCompactArs, formatDuration, nowIso, nowTimeAR, pct, timeToMinutes } from '../utils/lifeUtils';
import { computeMonth, goalProgress } from './FinanceView';
import { routineCompletion } from './TimeView';
import { contactStatus } from '../utils/people';
import { EVAL_TYPE_LABEL, Habit } from '../types/life';
import { Card, ProgressBar, Ring } from '../components/ui';
import { TaskList } from '../components/TaskList';
import { useToast } from '../components/Toast';

interface Props {
  life: LifeApi;
  onNavigate: (s: Section) => void;
  onOpenJournal: () => void;
}

export const TodayView: React.FC<Props> = ({ life, onNavigate, onOpenJournal }) => {
  const { store } = life;
  const today = getTodayDateString();
  const actions = useHabitActions(life);
  const focus = useFocus();
  const { showToast } = useToast();
  const nowMin = timeToMinutes(nowTimeAR());

  const habits = habitsForDate(store, today);
  const comp = dayCompletion(store, today);
  const purpose = store.purpose;

  const { eventsOn } = useCalendarFeeds();
  const agenda = useMemo(() => getAgendaForDate(store, today, eventsOn(today)).filter((i) => i.source !== 'task'), [store, today, eventsOn]);
  const upcoming = agenda.filter((i) => !i.allDay && i.start && (i.end ? timeToMinutes(i.end) : timeToMinutes(i.start) + 60) >= nowMin);
  const allDay = agenda.filter((i) => i.allDay);
  const nowItem = upcoming.find((i) => timeToMinutes(i.start) <= nowMin);
  const nextItem = upcoming.find((i) => timeToMinutes(i.start) > nowMin);

  const verse = getVerseForDate(today);
  const favId = verse.ref.replace(/[^a-zA-Z0-9]/g, '_');
  const isFav = Boolean(store.verseFavs[favId]);

  const rate = store.financeConfig.usdRate;
  const month = useMemo(() => computeMonth(Object.values(store.transactions), currentMonthKey(), rate), [store.transactions, rate]);
  const goals = Object.values(store.goals).filter((g) => !g.archived);
  const primary = goals.find((g) => g.isPrimary) || goals[0];
  const primaryPct = primary ? pct(goalProgress(primary, Object.values(store.transactions), goals, rate), primary.targetAmount) : 0;

  const studyToday = Object.values(store.focusSessions).filter((s) => s.date === today && s.area === 'universidad').reduce((s, x) => s + x.minutes, 0) +
    Object.values(store.studyLogs).filter((l) => l.date === today).reduce((s, l) => s + l.minutes, 0);
  const studyGoal = store.prefs.dailyStudyGoalMinutes || 180;

  const screenToday = store.screenLogs[today]?.totalMinutes;
  const screenLimit = store.screenConfig.dailyLimitMinutes;
  const morning = store.routines.find((r) => r.id === 'morning');
  const routineLog = store.routineLogs[today];
  const nextEval = getUpcomingEvaluations(store, today, 1)[0];
  const interactions = Object.values(store.interactions);
  const needAttention = Object.values(store.people).filter((p) => contactStatus(p, interactions, today).overdue);
  const dayEntry = store.days[today];
  const isEvening = nowMin >= 19 * 60;

  const toggleRoutine = (id: string) => {
    const base = routineLog || { id: today, date: today, done: {}, updatedAt: nowIso() };
    const done = { ...base.done, [id]: !base.done[id] };
    life.upsert('routineLogs', { ...base, done, wakeTime: id === 'm-levantarme' && done[id] && !base.wakeTime ? nowTimeAR() : base.wakeTime, updatedAt: nowIso() });
  };

  const share = async () => {
    const text = `"${verse.text}" — ${verse.ref} (RVR1960)`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        showToast('Versículo copiado');
      }
    } catch {
      /* cancelado */
    }
  };

  return (
    <div className="space-y-5">
      <SkyHero
        name={store.prefs.name}
        date={today}
        wakeTime={store.prefs.wakeTime}
        sleepTime={store.prefs.sleepTime}
        word={purpose.wordOfYear}
        habitsDone={comp.done}
        habitsTotal={comp.total}
      >
        {focus.running ? (
          <button
            type="button"
            onClick={() => onNavigate('focus')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-sm font-semibold cursor-pointer hover:bg-white/25"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {focus.running.phase === 'focus' ? 'Enfoque' : 'Descanso'} · {formatClock(focus.remainingMs)}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('focus')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-[#141633] text-sm font-semibold cursor-pointer hover:bg-white/90 shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" /> Empezar a enfocarme
          </button>
        )}
      </SkyHero>

      {/* AHORA / DESPUÉS */}
      {(nowItem || nextItem || allDay.length > 0) && (
        <button
          type="button"
          onClick={() => onNavigate('agenda')}
          className="w-full text-left rounded-[26px] bg-surface border border-subtle shadow-card p-4 sm:p-5 flex items-stretch gap-4 cursor-pointer hover:border-app animate-rise"
        >
          <div className="flex-1 min-w-0 space-y-2">
            {allDay.slice(0, 2).map((it) => (
              <div key={it.key} className="text-xs font-semibold truncate" style={{ color: it.color }}>
                {it.emoji} {it.title}
              </div>
            ))}
            {nowItem && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Ahora</span>
                <div className="font-display text-xl font-semibold text-main truncate">{nowItem.title}</div>
                <div className="text-xs text-muted">
                  {nowItem.start}–{nowItem.end} {nowItem.subtitle ? `· ${nowItem.subtitle}` : ''}
                </div>
              </div>
            )}
            {nextItem && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">Después · {nextItem.start}</span>
                <div className="text-[15px] font-semibold text-main truncate">{nextItem.title}</div>
              </div>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-dim self-center shrink-0" />
        </button>
      )}

      {/* HÁBITOS */}
      <section className="space-y-3 animate-rise">
        <div className="flex items-end justify-between">
          <h3 className="font-display text-2xl font-bold text-main">Tus hábitos</h3>
          <button type="button" onClick={() => onNavigate('habits')} className="text-sm font-semibold text-accent cursor-pointer">
            Ver todos
          </button>
        </div>
        {habits.length === 0 ? (
          <p className="text-sm text-muted">No hay hábitos para hoy. Creá uno en Hábitos.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {habits.map((h) => (
              <HabitTile key={h.id} habit={h} life={life} date={today} onToggle={() => actions.toggle(h, today)} onStep={(d) => actions.setValue(h.id, today, habitValue(store.habitLogs, h.id, today) + d)} />
            ))}
          </div>
        )}
      </section>

      {/* VERSÍCULO */}
      <section className="relative overflow-hidden rounded-[26px] border border-subtle shadow-card p-6 sm:p-7 bg-surface animate-rise">
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: 'linear-gradient(180deg,var(--gold),var(--accent))' }} />
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            {THEME_INFO[verse.theme].emoji} Palabra de hoy · {THEME_INFO[verse.theme].label}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              onClick={() => (isFav ? life.remove('verseFavs', favId) : life.upsert('verseFavs', { id: favId, ref: verse.ref, savedAt: nowIso() }))}
              className="p-2 rounded-full hover:bg-surface-elevated cursor-pointer"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-[var(--accent)] text-accent' : 'text-muted'}`} />
            </button>
            <button type="button" aria-label="Compartir versículo" onClick={share} className="p-2 rounded-full hover:bg-surface-elevated cursor-pointer">
              <Share2 className="w-4 h-4 text-muted" />
            </button>
          </div>
        </div>
        <blockquote className="font-display text-[22px] sm:text-[26px] font-medium leading-snug text-main mt-3">“{verse.text}”</blockquote>
        <p className="mt-3 text-sm font-semibold text-accent">{verse.ref}</p>
        <p className="mt-4 text-sm text-muted leading-relaxed">{THEME_INFO[verse.theme].prompt}</p>
      </section>

      {/* INSTRUMENTOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 animate-rise">
        <button type="button" onClick={() => onNavigate('finance')} className="text-left p-4 rounded-[22px] bg-surface border border-subtle shadow-card hover:border-app cursor-pointer space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Wallet className="w-3.5 h-3.5" /> Gastado este mes
          </div>
          <div className="font-num text-[28px] font-bold leading-none text-main">{formatCompactArs(month.expenses)}</div>
          {primary && (
            <>
              <ProgressBar value={primaryPct} height="h-1.5" color="var(--gold)" />
              <div className="text-[11px] text-dim truncate">
                {primary.name} · {primaryPct}%
              </div>
            </>
          )}
        </button>

        <button type="button" onClick={() => onNavigate('university')} className="text-left p-4 rounded-[22px] bg-surface border border-subtle shadow-card hover:border-app cursor-pointer flex items-center gap-3">
          <Ring value={pct(studyToday, studyGoal)} size={58} stroke={6} color="var(--sky)">
            <span className="text-[11px] font-mono text-main">{pct(studyToday, studyGoal)}%</span>
          </Ring>
          <div className="min-w-0">
            <div className="text-xs text-muted">Estudio</div>
            <div className="font-num text-xl font-bold text-main leading-tight">{formatDuration(studyToday)}</div>
            <div className="text-[11px] text-dim">de {formatDuration(studyGoal)}</div>
          </div>
        </button>

        <button type="button" onClick={() => onNavigate('time')} className="text-left p-4 rounded-[22px] bg-surface border border-subtle shadow-card hover:border-app cursor-pointer space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Smartphone className="w-3.5 h-3.5" /> Pantalla hoy
          </div>
          <div className="font-num text-[28px] font-bold leading-none" style={{ color: screenToday !== undefined && screenToday > screenLimit ? 'var(--danger)' : 'var(--text-main)' }}>
            {screenToday !== undefined ? formatDuration(screenToday) : '—'}
          </div>
          <div className="text-[11px] text-dim">{screenToday !== undefined ? `límite ${formatDuration(screenLimit)}` : 'Registralo a la noche'}</div>
        </button>

        {nextEval ? (
          <button type="button" onClick={() => onNavigate('university')} className="text-left p-4 rounded-[22px] bg-surface border border-subtle shadow-card hover:border-app cursor-pointer space-y-1.5">
            <div className="text-xs text-muted">Próxima evaluación</div>
            <div className="font-num text-[28px] font-bold leading-none text-accent">
              {daysBetween(today, nextEval.date) === 0 ? 'Hoy' : `${daysBetween(today, nextEval.date)} días`}
            </div>
            <div className="text-[11px] text-dim truncate">
              {EVAL_TYPE_LABEL[nextEval.type]} · {store.subjects[nextEval.subjectId]?.name}
            </div>
          </button>
        ) : (
          <button type="button" onClick={() => onNavigate('people')} className="text-left p-4 rounded-[22px] bg-surface border border-subtle shadow-card hover:border-app cursor-pointer space-y-1.5">
            <div className="text-xs text-muted">Personas</div>
            <div className="font-num text-[28px] font-bold leading-none text-main">{needAttention.length || '✓'}</div>
            <div className="text-[11px] text-dim truncate">{needAttention.length ? `Escribile a ${needAttention.slice(0, 2).map((p) => p.name).join(' y ')}` : 'Todos al día'}</div>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* RUTINA DE MAÑANA */}
        {morning && (
          <Card
            className="lg:col-span-2"
            title={`${morning.name} · ${routineCompletion(morning, routineLog)}%`}
            icon={<Sun />}
            action={
              <button type="button" onClick={() => onNavigate('time')} className="text-sm font-semibold text-accent cursor-pointer">
                Editar
              </button>
            }
          >
            <div className="space-y-1">
              {morning.items.map((it) => {
                const done = Boolean(routineLog?.done?.[it.id]);
                return (
                  <button key={it.id} type="button" onClick={() => toggleRoutine(it.id)} className="w-full flex items-center gap-3 py-2 text-left cursor-pointer group">
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${done ? 'bg-accent border-transparent text-accent-contrast' : 'border-app group-hover:border-accent'}`}>
                      {done && <Check className="w-3.5 h-3.5" />}
                    </span>
                    {it.time && <span className="font-mono text-xs text-dim w-11 shrink-0">{it.time}</span>}
                    <span className={`text-[15px] ${done ? 'line-through text-dim' : 'text-main'}`}>{it.text}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* TAREAS */}
        <Card
          className="lg:col-span-3"
          title="Para hacer"
          action={
            <button type="button" onClick={() => onNavigate('agenda')} className="text-sm font-semibold text-accent cursor-pointer">
              Todas
            </button>
          }
        >
          <TaskList life={life} limit={5} compact />
        </Card>
      </div>

      {/* CIERRE DEL DÍA */}
      <button
        type="button"
        onClick={onOpenJournal}
        className={`w-full text-left rounded-[26px] p-5 sm:p-6 flex items-center gap-4 cursor-pointer border transition ${
          isEvening && !dayEntry ? 'border-transparent text-white shadow-[0_20px_40px_-24px_#4a2f72]' : 'bg-surface border-subtle shadow-card'
        }`}
        style={isEvening && !dayEntry ? { background: 'linear-gradient(120deg,#1c1f4d,#4a2f72 60%,#7b3f86)' } : undefined}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isEvening && !dayEntry ? 'bg-white/15' : 'bg-accent-subtle text-accent'}`}>
          <Moon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl font-semibold">{dayEntry ? 'Día cerrado' : 'Cerrar el día'}</div>
          <div className={`text-sm ${isEvening && !dayEntry ? 'text-white/75' : 'text-muted'}`}>
            {dayEntry ? `Ánimo ${'●'.repeat(dayEntry.mood || 0)} · ${dayEntry.gratitude.filter(Boolean).length} gratitudes` : 'Ánimo, gratitud y lo que aprendiste. 2 minutos.'}
          </div>
        </div>
        <ArrowRight className="w-5 h-5 shrink-0 opacity-70" />
      </button>

      <WeekStrip life={life} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
const HabitTile: React.FC<{ habit: Habit; life: LifeApi; date: string; onToggle: () => void; onStep: (delta: number) => void }> = ({ habit: h, life, date, onToggle, onStep }) => {
  const v = habitValue(life.store.habitLogs, h.id, date);
  const done = isDone(h, v);
  const p = h.kind === 'count' ? Math.min(100, Math.round((v / (h.target || 1)) * 100)) : done ? 100 : 0;
  const st = streak(h, life.store.habitLogs, date);
  const step = h.kind === 'count' ? ((h.unit || '').startsWith('min') ? 15 : (h.target || 1) >= 10 ? 5 : 1) : 0;
  const weekly = h.schedule === 'weekly' ? `${weekCount(h, life.store.habitLogs, date)}/${h.timesPerWeek} sem.` : null;

  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border p-3.5 transition ${done ? 'border-transparent' : 'bg-surface border-subtle shadow-card'}`}
      style={done ? { background: `linear-gradient(140deg, color-mix(in srgb, ${h.color} 38%, var(--bg-surface)), color-mix(in srgb, ${h.color} 14%, var(--bg-surface)))` } : undefined}
    >
      <button type="button" onClick={onToggle} className="w-full text-left cursor-pointer" aria-pressed={done} aria-label={`${h.name}: ${done ? 'hecho' : 'pendiente'}`}>
        <div className="flex items-start justify-between">
          <span className={`text-2xl ${done ? 'animate-pop' : ''}`}>{h.emoji}</span>
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition ${done ? 'border-transparent text-[#141633]' : 'border-app'}`}
            style={done ? { backgroundColor: h.color } : undefined}
          >
            {done && <Check className="w-4 h-4" strokeWidth={3} />}
          </span>
        </div>
        <div className="mt-3 text-[15px] font-semibold text-main leading-tight line-clamp-2">{h.name}</div>
        <div className="text-[11px] text-muted mt-1 font-mono">
          {h.kind === 'count' ? `${v}/${h.target} ${h.unit || ''}` : h.isNegative ? 'evitado' : done ? 'hecho' : 'pendiente'}
          {weekly ? ` · ${weekly}` : st > 1 ? ` · 🔥${st}` : ''}
        </div>
      </button>
      {h.kind === 'count' && (
        <div className="flex items-center gap-1.5 mt-2.5">
          <button type="button" onClick={() => onStep(-step)} disabled={v <= 0} aria-label="Restar" className="w-8 h-8 rounded-full border border-app flex items-center justify-center text-muted hover:text-main cursor-pointer disabled:opacity-30">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: h.color }} />
          </div>
          <button type="button" onClick={() => onStep(step)} aria-label={`Sumar ${step}`} className="w-8 h-8 rounded-full border border-app flex items-center justify-center text-muted hover:text-main cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
const WeekStrip: React.FC<{ life: LifeApi }> = ({ life }) => {
  const today = getTodayDateString();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const names = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  return (
    <Card title="Tus últimas dos semanas">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
        {days.map((d) => {
          const c = dayCompletion(life.store, d);
          const mood = life.store.days[d]?.mood;
          const dow = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)), 12).getDay();
          return (
            <div key={d} className="flex flex-col items-center gap-1" title={`${d}: ${c.pct}% hábitos${mood ? ` · ánimo ${mood}/5` : ''}`}>
              <div className="w-full max-w-[30px] h-20 rounded-full bg-surface-muted overflow-hidden flex items-end">
                <div className="w-full rounded-full transition-all" style={{ height: `${Math.max(c.pct ? 8 : 0, c.pct)}%`, background: d === today ? 'var(--accent)' : 'linear-gradient(180deg,var(--gold),var(--accent))', opacity: d === today ? 1 : 0.75 }} />
              </div>
              <span className={`text-[10px] font-mono ${d === today ? 'text-accent' : 'text-dim'}`}>{names[dow]}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

