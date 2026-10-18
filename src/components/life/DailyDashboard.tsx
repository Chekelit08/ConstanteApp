import React, { useMemo, useState } from 'react';
import { ArrowDownCircle, CalendarClock, ChevronRight, GraduationCap, HeartHandshake, ListTodo, Plus, Smartphone, Sun, Wallet } from 'lucide-react';
import { LifeApi } from '../../hooks/useLifeData';
import { MainSection } from '../common/Navbar';
import { getAgendaForDate, getUpcomingEvaluations } from '../../services/agenda';
import { getVerseForDate } from '../../services/verses';
import { addDays, getTodayDateString } from '../../utils/dateUtils';
import { currentMonthKey, daysBetween, formatCompactArs, formatDuration, nowIso, nowTimeAR, pct, timeToMinutes } from '../../utils/lifeUtils';
import { computeMonth, goalProgress, TxModal } from '../../views/FinanceView';
import { useStudyMinutes } from '../../views/UniversityView';
import { routineCompletion } from '../../views/TimeView';
import { contactStatus } from '../../views/PeopleView';
import { VerseCard } from '../../views/FaithView';
import { EVAL_TYPE_LABEL } from '../../types/life';
import { Card, ProgressBar, Ring } from './ui';
import { TaskList } from './TaskList';
import { EventModal } from './EventModal';

interface Props {
  life: LifeApi;
  onNavigate: (s: MainSection) => void;
}

/** Panel superior de "Hoy": conecta todos los módulos en una sola mirada */
export const DailyDashboard: React.FC<Props> = ({ life, onNavigate }) => {
  const { store } = life;
  const today = getTodayDateString();
  const [txOpen, setTxOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const verse = getVerseForDate(today);
  const favId = verse.ref.replace(/[^a-zA-Z0-9]/g, '_');
  const nowMin = timeToMinutes(nowTimeAR());

  const agenda = useMemo(() => getAgendaForDate(store, today).filter((i) => i.source !== 'task'), [store, today]);
  const upcomingTimed = agenda.filter((i) => !i.allDay && i.start && (i.end ? timeToMinutes(i.end) : timeToMinutes(i.start) + 60) >= nowMin);
  const allDay = agenda.filter((i) => i.allDay);
  const tomorrow = useMemo(() => getAgendaForDate(store, addDays(today, 1)).filter((i) => i.source !== 'task'), [store, today]);

  const rate = store.financeConfig.usdRate;
  const month = useMemo(() => computeMonth(Object.values(store.transactions), currentMonthKey(), rate), [store.transactions, rate]);
  const goals = Object.values(store.goals).filter((g) => !g.archived);
  const primary = goals.find((g) => g.isPrimary) || goals[0];
  const primaryPct = primary ? pct(goalProgress(primary, Object.values(store.transactions), goals, rate), primary.targetAmount) : 0;

  const study = useStudyMinutes(life);
  const studyToday = study.byDate[today] || 0;
  const studyGoal = store.prefs.dailyStudyGoalMinutes || 180;

  const screenToday = store.screenLogs[today]?.totalMinutes;
  const screenYesterday = store.screenLogs[addDays(today, -1)]?.totalMinutes;
  const screenLimit = store.screenConfig.dailyLimitMinutes;

  const morning = store.routines.find((r) => r.id === 'morning');
  const routineLog = store.routineLogs[today];
  const morningPct = morning ? routineCompletion(morning, routineLog) : 0;

  const nextEval = getUpcomingEvaluations(store, today, 1)[0];
  const interactions = Object.values(store.interactions);
  const needAttention = Object.values(store.people).filter((p) => contactStatus(p, interactions, today).overdue);

  const toggleRoutineItem = (id: string) => {
    const base = routineLog || { id: today, date: today, done: {}, updatedAt: nowIso() };
    const done = { ...base.done, [id]: !base.done[id] };
    life.upsert('routineLogs', { ...base, done, wakeTime: id === 'm-levantarme' && done[id] && !base.wakeTime ? nowTimeAR() : base.wakeTime, updatedAt: nowIso() });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <VerseCard
            verse={verse}
            compact
            isFav={Boolean(store.verseFavs[favId])}
            onToggleFav={() => (store.verseFavs[favId] ? life.remove('verseFavs', favId) : life.upsert('verseFavs', { id: favId, ref: verse.ref, savedAt: nowIso() }))}
          />
        </div>
        <Card
          className="lg:col-span-2"
          title="Plan del día"
          icon={<CalendarClock className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setEventOpen(true)} className="p-2 rounded-lg text-muted hover:text-main hover:bg-surface-elevated cursor-pointer" aria-label="Agregar evento">
                <Plus className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onNavigate('agenda')} className="p-2 rounded-lg text-muted hover:text-main hover:bg-surface-elevated cursor-pointer" aria-label="Abrir agenda">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          }
        >
          <div className="space-y-1.5">
            {allDay.map((it) => (
              <div key={it.key} className="text-xs px-2.5 py-1.5 rounded-lg truncate" style={{ backgroundColor: `${it.color}1A`, color: it.color }}>
                {it.emoji} {it.title}
              </div>
            ))}
            {upcomingTimed.length === 0 && allDay.length === 0 && <p className="text-xs text-muted italic">Nada más agendado para hoy.</p>}
            {upcomingTimed.slice(0, 5).map((it) => (
              <div key={it.key} className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-elevated border-l-4" style={{ borderLeftColor: it.color }}>
                <span className="text-[11px] font-mono text-muted w-11 shrink-0">{it.start}</span>
                <span className="text-sm text-main font-medium truncate">{it.title}</span>
              </div>
            ))}
            {tomorrow.length > 0 && (
              <p className="text-[11px] text-muted pt-1 truncate">
                Mañana: {tomorrow.slice(0, 3).map((t) => `${t.start ? t.start + ' ' : ''}${t.title}`).join(' · ')}
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative p-4 rounded-2xl bg-surface border border-app hover:border-accent space-y-2">
          <button
            type="button"
            onClick={() => setTxOpen(true)}
            className="absolute top-3 right-3 flex items-center gap-0.5 text-[10px] font-mono font-bold uppercase text-accent hover:underline cursor-pointer z-10"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" /> gasto
          </button>
          <button type="button" onClick={() => onNavigate('finance')} className="w-full text-left cursor-pointer space-y-2">
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
              <Wallet className="w-3.5 h-3.5" /> Mes
            </div>
            <div className="font-['Bebas_Neue'] text-2xl text-main leading-none">{formatCompactArs(month.expenses)}</div>
            <div className="text-[11px] text-muted">gastado · disp. {formatCompactArs(month.available)}</div>
            {primary && <ProgressBar value={primaryPct} height="h-1.5" />}
            {primary && <div className="text-[10px] text-muted font-mono">{primary.name}: {primaryPct}%</div>}
          </button>
        </div>

        <button type="button" onClick={() => onNavigate('university')} className="p-4 rounded-2xl bg-surface border border-app hover:border-accent text-left cursor-pointer flex items-center gap-3">
          <Ring value={pct(studyToday, studyGoal)} size={54} stroke={6}>
            <GraduationCap className="w-4 h-4 text-accent" />
          </Ring>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">Estudio</div>
            <div className="font-['Bebas_Neue'] text-xl text-main leading-none">{formatDuration(studyToday)}</div>
            <div className="text-[10px] text-muted">de {formatDuration(studyGoal)}</div>
          </div>
        </button>

        <button type="button" onClick={() => onNavigate('time')} className="p-4 rounded-2xl bg-surface border border-app hover:border-accent text-left cursor-pointer space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
            <Smartphone className="w-3.5 h-3.5" /> Pantalla
          </div>
          {screenToday !== undefined ? (
            <>
              <div className={`font-['Bebas_Neue'] text-2xl leading-none ${screenToday > screenLimit ? 'text-red-500' : 'text-main'}`}>{formatDuration(screenToday)}</div>
              <div className="text-[11px] text-muted">límite {formatDuration(screenLimit)}</div>
            </>
          ) : (
            <>
              <div className="font-['Bebas_Neue'] text-2xl text-main leading-none">{screenYesterday !== undefined ? formatDuration(screenYesterday) : '—'}</div>
              <div className="text-[11px] text-muted">{screenYesterday !== undefined ? 'ayer · cargá hoy a la noche' : 'registrá tu tiempo'}</div>
            </>
          )}
        </button>

        <div className="p-4 rounded-2xl bg-surface border border-app space-y-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
            <span className="flex items-center gap-1">
              <Sun className="w-3.5 h-3.5" /> Mañana
            </span>
            <span className="text-accent">{morningPct}%</span>
          </div>
          <div className="space-y-1">
            {morning?.items.slice(0, 4).map((it) => (
              <button key={it.id} type="button" onClick={() => toggleRoutineItem(it.id)} className="w-full flex items-center gap-2 text-left text-[12px] cursor-pointer">
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${routineLog?.done?.[it.id] ? 'bg-accent border-accent text-accent-contrast' : 'border-app'}`}>
                  {routineLog?.done?.[it.id] ? '✓' : ''}
                </span>
                <span className={`truncate ${routineLog?.done?.[it.id] ? 'line-through text-muted' : 'text-main'}`}>{it.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-app space-y-2 col-span-2 lg:col-span-1">
          {nextEval ? (
            <button type="button" onClick={() => onNavigate('university')} className="w-full text-left cursor-pointer">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">Próxima evaluación</div>
              <div className="font-['Bebas_Neue'] text-2xl text-accent leading-none">
                {daysBetween(today, nextEval.date) === 0 ? 'HOY' : `${daysBetween(today, nextEval.date)} días`}
              </div>
              <div className="text-[11px] text-main truncate">
                {EVAL_TYPE_LABEL[nextEval.type]} · {store.subjects[nextEval.subjectId]?.name}
              </div>
            </button>
          ) : (
            <button type="button" onClick={() => onNavigate('people')} className="w-full text-left cursor-pointer">
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                <HeartHandshake className="w-3.5 h-3.5" /> Personas
              </div>
              <div className="font-['Bebas_Neue'] text-2xl text-main leading-none">{needAttention.length}</div>
              <div className="text-[11px] text-muted truncate">{needAttention.length ? `escribile a ${needAttention.slice(0, 2).map((p) => p.name).join(', ')}` : 'todos al día 💛'}</div>
            </button>
          )}
        </div>
      </div>

      <Card
        title="Tareas"
        icon={<ListTodo className="w-4 h-4" />}
        action={
          <button type="button" onClick={() => onNavigate('agenda')} className="text-[11px] font-semibold text-accent cursor-pointer">
            Ver todas
          </button>
        }
      >
        <TaskList life={life} limit={5} compact />
      </Card>

      {txOpen && <TxModal life={life} initial={{ type: 'expense' }} goals={goals} debts={Object.values(store.debts)} onClose={() => setTxOpen(false)} />}
      {eventOpen && <EventModal open life={life} initial={{ date: today }} onClose={() => setEventOpen(false)} />}
    </div>
  );
};
