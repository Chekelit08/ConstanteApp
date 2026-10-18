import React, { useMemo, useState } from 'react';
import { BookMarked, CalendarClock, CheckCircle2, Clock, GraduationCap, Link2, Plus, Timer, Trash2, Trophy } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import {
  ClassSlot,
  EVAL_TYPE_LABEL,
  Evaluation,
  EvalType,
  Subject,
  SUBJECT_STATUS_LABEL,
  SubjectStatus,
  SyllabusUnit,
} from '../types/life';
import { addDays, DAY_NAMES_FULL, DAY_NAMES_SHORT, formatArgentineDate, getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { daysBetween, formatDuration, getAllFocusSessions, isStudySession, minutesToTime, newId, nowIso, pct, relativeDayLabel, timeToMinutes } from '../utils/lifeUtils';
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  MiniBars,
  Modal,
  PageHeader,
  ProgressBar,
  Ring,
  Stat,
  Tabs,
  textareaCls,
} from '../components/life/ui';
import { TaskList } from '../components/life/TaskList';

type UniTab = 'subjects' | 'schedule' | 'evals' | 'study';

const SUBJECT_COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#E11D48', '#0891B2', '#9333EA', '#16A34A', '#64748B'];
const SUGGESTED_SUBJECTS = [
  'Algoritmos y Estructuras de Datos',
  'Análisis Matemático I',
  'Álgebra y Geometría Analítica',
  'Matemática Discreta',
  'Sistemas y Procesos de Negocio',
  'Arquitectura de Computadoras',
  'Física I',
  'Inglés I',
  'Paradigmas de Programación',
  'Bases de Datos',
];

/** Minutos de estudio por día: registros manuales + sesiones de enfoque de estudio */
export function useStudyMinutes(life: LifeApi) {
  return useMemo(() => {
    const byDate: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    Object.values(life.store.studyLogs).forEach((l) => {
      byDate[l.date] = (byDate[l.date] || 0) + l.minutes;
      if (l.subjectId) bySubject[l.subjectId] = (bySubject[l.subjectId] || 0) + l.minutes;
    });
    getAllFocusSessions(life.userId)
      .filter(isStudySession)
      .forEach((s) => {
        byDate[s.date] = (byDate[s.date] || 0) + (Number(s.durationMinutes) || 0);
      });
    return { byDate, bySubject };
  }, [life.store.studyLogs, life.userId]);
}

function subjectStats(s: Subject, evals: Evaluation[]) {
  const mine = evals.filter((e) => e.subjectId === s.id);
  const graded = mine.filter((e) => typeof e.grade === 'number' && (e.type === 'parcial' || e.type === 'recuperatorio' || e.type === 'final' || e.type === 'coloquio'));
  const avg = graded.length ? graded.reduce((sum, e) => sum + (e.grade || 0), 0) / graded.length : undefined;
  const parciales = mine.filter((e) => (e.type === 'parcial' || e.type === 'recuperatorio') && typeof e.grade === 'number');
  const minParcial = parciales.length ? Math.min(...parciales.map((e) => e.grade || 0)) : undefined;
  const onTrackPromo = minParcial === undefined ? undefined : minParcial >= s.promotionGrade;
  const next = mine.filter((e) => e.status === 'pendiente' && e.date >= getTodayDateString()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const unitsDone = s.units.filter((u) => u.done).length;
  return { mine, avg, minParcial, onTrackPromo, next, unitsDone };
}

export const UniversityView: React.FC<{ life: LifeApi; onStartFocus: () => void }> = ({ life, onStartFocus }) => {
  const [tab, setTab] = useState<UniTab>('subjects');
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; subject?: Partial<Subject> }>({ open: false });
  const [evalModal, setEvalModal] = useState<{ open: boolean; ev?: Partial<Evaluation> }>({ open: false });
  const [logOpen, setLogOpen] = useState(false);
  const today = getTodayDateString();
  const goal = life.store.prefs.dailyStudyGoalMinutes || 180;

  const subjects = useMemo(() => Object.values(life.store.subjects).sort((a, b) => a.name.localeCompare(b.name)), [life.store.subjects]);
  const active = subjects.filter((s) => s.status === 'cursando');
  const evals = useMemo(() => Object.values(life.store.evaluations), [life.store.evaluations]);
  const study = useStudyMinutes(life);
  const todayMin = study.byDate[today] || 0;

  // Indicadores del rol A
  const recursadas = subjects.filter((s) => s.status === 'recursar').length;
  const parcialesRendidos = evals.filter((e) => (e.type === 'parcial' || e.type === 'recuperatorio') && e.status !== 'pendiente');
  const parcialesAprobados = parcialesRendidos.filter((e) => e.status === 'aprobado').length;
  const week = getWeekDays(today);
  const weekMin = week.reduce((s, d) => s + (study.byDate[d] || 0), 0);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const avg7 = last7.reduce((s, d) => s + (study.byDate[d] || 0), 0) / 7;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Rol A · Estudiante responsable, aplicado y en formación técnica"
        title="Universidad"
        subtitle="Estudio por amor a la oportunidad que Dios me dio, aunque no tenga ganas, aunque cueste, aunque canse."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => setEvalModal({ open: true, ev: { type: 'parcial' } })} disabled={subjects.length === 0}>
              <CalendarClock className="w-4 h-4" /> Evaluación
            </button>
            <button type="button" className={btnPrimary} onClick={() => setSubjectModal({ open: true })}>
              <Plus className="w-4 h-4" /> Materia
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-app flex items-center gap-3">
          <Ring value={pct(todayMin, goal)} size={64} stroke={7}>
            <span className="text-[11px] font-mono font-bold text-main">{pct(todayMin, goal)}%</span>
          </Ring>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">Estudio hoy</div>
            <div className="font-['Bebas_Neue'] text-2xl text-main leading-none">{formatDuration(todayMin)}</div>
            <div className="text-[11px] text-muted">meta {formatDuration(goal)}</div>
          </div>
        </div>
        <Stat label="Promedio 7 días" value={formatDuration(avg7)} sub={`semana: ${formatDuration(weekMin)}`} tone={avg7 >= goal ? 'good' : 'accent'} />
        <Stat label="Parciales aprobados" value={parcialesRendidos.length ? `${pct(parcialesAprobados, parcialesRendidos.length)}%` : '—'} sub={`${parcialesAprobados}/${parcialesRendidos.length} · meta 100%`} tone={parcialesAprobados === parcialesRendidos.length ? 'good' : 'bad'} />
        <Stat label="Recursadas" value={recursadas} sub="meta: 0" tone={recursadas === 0 ? 'good' : 'bad'} />
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as UniTab)}
        tabs={[
          { id: 'subjects', label: 'Materias', icon: <GraduationCap className="w-3.5 h-3.5" /> },
          { id: 'schedule', label: 'Horario', icon: <Clock className="w-3.5 h-3.5" /> },
          { id: 'evals', label: 'Parciales & finales', icon: <CalendarClock className="w-3.5 h-3.5" /> },
          { id: 'study', label: 'Estudio', icon: <Timer className="w-3.5 h-3.5" /> },
        ]}
      />

      {tab === 'subjects' && (
        <div className="space-y-4">
          {subjects.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="w-12 h-12" />}
              title="Cargá tus materias"
              text="Agregá las materias que estás cursando con su horario, nota de promoción y unidades. Así armo tu horario, tu agenda y el seguimiento de parciales."
              action={
                <button type="button" className={btnPrimary} onClick={() => setSubjectModal({ open: true })}>
                  <Plus className="w-4 h-4" /> Agregar materia
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subjects.map((s) => {
                const st = subjectStats(s, evals);
                return (
                  <Card key={s.id} className="border-l-4" padded>
                    <div className="flex items-start justify-between gap-3" style={{}}>
                      <button type="button" onClick={() => setSubjectModal({ open: true, subject: s })} className="text-left min-w-0 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <h4 className="font-['Oswald'] text-lg font-bold uppercase tracking-wide text-main truncate">{s.name}</h4>
                        </div>
                        <div className="text-[11px] text-muted font-mono mt-0.5">
                          {s.period} {s.professor ? `· ${s.professor}` : ''}
                        </div>
                      </button>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 ${
                          s.status === 'promocionada' || s.status === 'aprobada'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : s.status === 'recursar'
                              ? 'bg-red-500/15 text-red-500'
                              : 'bg-accent-subtle text-accent'
                        }`}
                      >
                        {SUBJECT_STATUS_LABEL[s.status]}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="p-2 rounded-xl bg-surface-elevated">
                        <div className="font-['Bebas_Neue'] text-2xl text-main leading-none">{st.avg !== undefined ? st.avg.toFixed(1) : '—'}</div>
                        <div className="text-[9px] font-mono uppercase text-muted">promedio</div>
                      </div>
                      <div className="p-2 rounded-xl bg-surface-elevated">
                        <div className={`font-['Bebas_Neue'] text-2xl leading-none ${st.onTrackPromo === false ? 'text-red-500' : st.onTrackPromo ? 'text-emerald-500' : 'text-main'}`}>
                          {st.onTrackPromo === undefined ? '—' : st.onTrackPromo ? 'SÍ' : 'NO'}
                        </div>
                        <div className="text-[9px] font-mono uppercase text-muted">promo (≥{s.promotionGrade})</div>
                      </div>
                      <div className="p-2 rounded-xl bg-surface-elevated">
                        <div className="font-['Bebas_Neue'] text-2xl text-main leading-none">{formatDuration(study.bySubject[s.id] || 0).replace(' min', 'm')}</div>
                        <div className="text-[9px] font-mono uppercase text-muted">estudiado</div>
                      </div>
                    </div>

                    {s.units.length > 0 && (
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono text-muted">
                          <span>Temas dominados</span>
                          <span>
                            {st.unitsDone}/{s.units.length}
                          </span>
                        </div>
                        <ProgressBar value={pct(st.unitsDone, s.units.length)} color={s.color} />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.units.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => life.upsert('subjects', { ...s, units: s.units.map((x) => (x.id === u.id ? { ...x, done: !x.done } : x)), updatedAt: nowIso() })}
                              className={`text-[11px] px-2 py-1 rounded-lg border cursor-pointer ${u.done ? 'border-transparent text-white' : 'border-app text-muted bg-surface-elevated'}`}
                              style={u.done ? { backgroundColor: s.color } : undefined}
                              title={u.done ? 'Marcar como pendiente' : 'Marcar como dominado'}
                            >
                              {u.done ? '✓ ' : ''}
                              {u.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {st.next && (
                      <div className="mt-4 p-2.5 rounded-xl bg-accent-subtle text-xs text-main flex items-center justify-between gap-2">
                        <span className="truncate">
                          📝 {EVAL_TYPE_LABEL[st.next.type]} {st.next.title ? `· ${st.next.title}` : ''}
                        </span>
                        <span className="font-mono font-bold text-accent shrink-0">{relativeDayLabel(st.next.date)}</span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <Card title="Tareas de la facu" icon={<CheckCircle2 className="w-4 h-4" />}>
            <TaskList life={life} area="universidad" compact />
          </Card>
        </div>
      )}

      {tab === 'schedule' && <ScheduleGrid subjects={active} onEdit={(s) => setSubjectModal({ open: true, subject: s })} />}

      {tab === 'evals' && (
        <EvalsTab life={life} subjects={subjects} evals={evals} onEdit={(ev) => setEvalModal({ open: true, ev })} />
      )}

      {tab === 'study' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={onStartFocus}>
              <Timer className="w-4 h-4" /> Iniciar bloque de estudio
            </button>
            <button type="button" className={btnSecondary} onClick={() => setLogOpen(true)}>
              <Plus className="w-4 h-4" /> Registrar estudio a mano
            </button>
          </div>
          <Card title="Últimos 14 días" icon={<Timer className="w-4 h-4" />}>
            <MiniBars
              data={Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => ({
                label: d.slice(8),
                value: study.byDate[d] || 0,
                color: (study.byDate[d] || 0) >= goal ? '#16A34A' : 'var(--color-accent)',
                hint: `${formatArgentineDate(d)}: ${formatDuration(study.byDate[d] || 0)}`,
              }))}
              limit={goal}
              format={(v) => `${Math.round(v / 60 * 10) / 10}h`}
              height={160}
            />
            <p className="text-[11px] text-dim mt-3">
              Se suman las sesiones del módulo Enfoque en modo Estudio (o con etiqueta "Estudio/Facu") y lo que registres a mano. La línea roja es tu meta diaria.
            </p>
          </Card>
          <Card title="Registros manuales" icon={<BookMarked className="w-4 h-4" />}>
            {Object.values(life.store.studyLogs).length === 0 ? (
              <p className="text-xs text-muted italic">Todavía no hay registros manuales.</p>
            ) : (
              <div className="space-y-1.5">
                {Object.values(life.store.studyLogs)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 20)
                  .map((l) => (
                    <div key={l.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-subtle last:border-0">
                      <span className="font-mono text-xs text-muted w-16">{relativeDayLabel(l.date)}</span>
                      <span className="flex-1 text-main truncate">
                        {l.subjectId ? life.store.subjects[l.subjectId]?.name || 'Materia' : 'General'} {l.note ? `· ${l.note}` : ''}
                      </span>
                      <span className="font-mono text-xs text-main">{formatDuration(l.minutes)}</span>
                      <button type="button" className="text-dim hover:text-red-500 p-1" onClick={() => life.remove('studyLogs', l.id)} aria-label="Borrar registro">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {subjectModal.open && <SubjectModal life={life} initial={subjectModal.subject} onClose={() => setSubjectModal({ open: false })} />}
      {evalModal.open && <EvalModal life={life} subjects={subjects} initial={evalModal.ev} onClose={() => setEvalModal({ open: false })} />}
      {logOpen && <StudyLogModal life={life} subjects={active} onClose={() => setLogOpen(false)} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Horario semanal
// ─────────────────────────────────────────────────────────────
const ScheduleGrid: React.FC<{ subjects: Subject[]; onEdit: (s: Subject) => void }> = ({ subjects, onEdit }) => {
  const slots = subjects.flatMap((s) => s.schedule.map((slot) => ({ s, slot })));
  if (slots.length === 0) {
    return <EmptyState icon={<Clock className="w-12 h-12" />} title="Sin horarios cargados" text="Editá una materia en curso y agregale sus días y horarios de cursada." />;
  }
  const minStart = Math.min(...slots.map((x) => timeToMinutes(x.slot.start)));
  const maxEnd = Math.max(...slots.map((x) => timeToMinutes(x.slot.end)));
  const startH = Math.floor(minStart / 60);
  const endH = Math.ceil(maxEnd / 60);
  const pxPerMin = 1;
  const days = [0, 1, 2, 3, 4, 5].filter((d) => d < 5 || slots.some((x) => x.slot.day === d));

  return (
    <>
      {/* Mobile: lista por día */}
      <div className="md:hidden space-y-3">
        {days.map((d) => {
          const daySlots = slots.filter((x) => x.slot.day === d).sort((a, b) => timeToMinutes(a.slot.start) - timeToMinutes(b.slot.start));
          if (daySlots.length === 0) return null;
          return (
            <Card key={d} title={DAY_NAMES_FULL[d]}>
              <div className="space-y-2">
                {daySlots.map(({ s, slot }) => (
                  <button key={slot.id} type="button" onClick={() => onEdit(s)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border-l-4 bg-surface-elevated text-left cursor-pointer" style={{ borderLeftColor: s.color }}>
                    <span className="font-mono text-xs text-muted w-24 shrink-0">
                      {slot.start}–{slot.end}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-main truncate">{s.name}</span>
                      <span className="block text-[11px] text-muted truncate">{[slot.kind, slot.room].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {/* Desktop: grilla */}
      <Card padded={false} className="hidden md:block overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div className="border-b border-app bg-surface-elevated" />
          {days.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-mono font-bold uppercase tracking-widest text-muted border-b border-l border-app bg-surface-elevated">
              {DAY_NAMES_SHORT[d]}
            </div>
          ))}
          <div className="relative" style={{ height: (endH - startH) * 60 * pxPerMin }}>
            {Array.from({ length: endH - startH }, (_, i) => (
              <span key={i} className="absolute right-2 text-[10px] font-mono text-muted" style={{ top: i * 60 * pxPerMin - 6 }}>
                {minutesToTime((startH + i) * 60)}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className="relative border-l border-app" style={{ height: (endH - startH) * 60 * pxPerMin }}>
              {Array.from({ length: endH - startH }, (_, i) => (
                <div key={i} className="absolute left-0 right-0 border-t border-subtle" style={{ top: i * 60 * pxPerMin }} />
              ))}
              {slots
                .filter((x) => x.slot.day === d)
                .map(({ s, slot }) => {
                  const top = (timeToMinutes(slot.start) - startH * 60) * pxPerMin;
                  const h = (timeToMinutes(slot.end) - timeToMinutes(slot.start)) * pxPerMin;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onEdit(s)}
                      className="absolute left-1 right-1 rounded-lg p-1.5 text-left overflow-hidden border-l-4 cursor-pointer hover:opacity-90"
                      style={{ top, height: Math.max(28, h - 2), backgroundColor: `color-mix(in srgb, ${s.color} 18%, var(--bg-surface))`, borderLeftColor: s.color }}
                    >
                      <div className="text-[11px] font-bold text-main leading-tight truncate">{s.name}</div>
                      <div className="text-[10px] font-mono text-muted truncate">
                        {slot.start}–{slot.end}
                      </div>
                      {(slot.kind || slot.room) && <div className="text-[10px] text-muted truncate">{[slot.kind, slot.room].filter(Boolean).join(' · ')}</div>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Evaluaciones
// ─────────────────────────────────────────────────────────────
const EvalsTab: React.FC<{ life: LifeApi; subjects: Subject[]; evals: Evaluation[]; onEdit: (e: Evaluation) => void }> = ({ subjects, evals, onEdit }) => {
  const today = getTodayDateString();
  const upcoming = evals.filter((e) => e.status === 'pendiente').sort((a, b) => a.date.localeCompare(b.date));
  const past = evals.filter((e) => e.status !== 'pendiente').sort((a, b) => b.date.localeCompare(a.date));
  const subj = (id: string) => subjects.find((s) => s.id === id);

  const Row = ({ e }: { e: Evaluation }) => {
    const s = subj(e.subjectId);
    const days = daysBetween(today, e.date);
    return (
      <button type="button" onClick={() => onEdit(e)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface border border-app hover:border-accent text-left cursor-pointer">
        <div className="w-14 text-center shrink-0">
          <div className={`font-['Bebas_Neue'] text-2xl leading-none ${e.status === 'pendiente' ? (days <= 7 ? 'text-accent' : 'text-main') : e.status === 'aprobado' ? 'text-emerald-500' : 'text-red-500'}`}>
            {e.status === 'pendiente' ? (days >= 0 ? days : '!') : (e.grade ?? '—')}
          </div>
          <div className="text-[9px] font-mono uppercase text-muted">{e.status === 'pendiente' ? (days >= 0 ? 'días' : 'vencida') : 'nota'}</div>
        </div>
        <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: s?.color || '#999' }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-main truncate">
            {EVAL_TYPE_LABEL[e.type]} · {s?.name || 'Materia'}
          </div>
          <div className="text-[11px] text-muted truncate">
            {formatArgentineDate(e.date, { includeDayName: true })}
            {e.time ? ` · ${e.time}` : ''} {e.topics ? `· ${e.topics}` : ''}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main">Próximas</h3>
        {upcoming.length === 0 ? <p className="text-xs text-muted italic">No hay evaluaciones pendientes cargadas.</p> : upcoming.map((e) => <Row key={e.id} e={e} />)}
      </div>
      <div className="space-y-2">
        <h3 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" /> Rendidas
        </h3>
        {past.length === 0 ? <p className="text-xs text-muted italic">Cuando cargues notas aparecen acá.</p> : past.map((e) => <Row key={e.id} e={e} />)}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Modales
// ─────────────────────────────────────────────────────────────
const SubjectModal: React.FC<{ life: LifeApi; initial?: Partial<Subject>; onClose: () => void }> = ({ life, initial, onClose }) => {
  const year = getTodayDateString().slice(0, 4);
  const [name, setName] = useState(initial?.name || '');
  const [code, setCode] = useState(initial?.code || '');
  const [period, setPeriod] = useState(initial?.period || `${year} · 2C`);
  const [professor, setProfessor] = useState(initial?.professor || '');
  const [color, setColor] = useState(initial?.color || SUBJECT_COLORS[Object.keys(life.store.subjects).length % SUBJECT_COLORS.length]);
  const [status, setStatus] = useState<SubjectStatus>(initial?.status || 'cursando');
  const [promotionGrade, setPromotionGrade] = useState(String(initial?.promotionGrade ?? 7));
  const [finalGrade, setFinalGrade] = useState(initial?.finalGrade !== undefined ? String(initial.finalGrade) : '');
  const [startDate, setStartDate] = useState(initial?.startDate || '');
  const [endDate, setEndDate] = useState(initial?.endDate || '2026-11-28');
  const [schedule, setSchedule] = useState<ClassSlot[]>(initial?.schedule || []);
  const [units, setUnits] = useState<SyllabusUnit[]>(initial?.units || []);
  const [unitsText, setUnitsText] = useState('');
  const [notes, setNotes] = useState(initial?.notes || '');
  const isEdit = Boolean(initial?.id);

  const save = () => {
    if (!name.trim()) return;
    const now = nowIso();
    const extraUnits = unitsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((title) => ({ id: newId('unit'), title, done: false }));
    life.upsert('subjects', {
      id: initial?.id || newId('subj'),
      name: name.trim(),
      code: code.trim() || undefined,
      period,
      professor: professor.trim() || undefined,
      color,
      status,
      promotionGrade: Number(promotionGrade) || 7,
      finalGrade: finalGrade ? Number(finalGrade) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      schedule,
      units: [...units, ...extraUnits],
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      kicker={isEdit ? 'Editar materia' : 'Nueva materia'}
      title={name || 'Materia'}
      footer={
        <>
          {isEdit && (
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                Object.values(life.store.evaluations)
                  .filter((e) => e.subjectId === initial!.id)
                  .forEach((e) => life.remove('evaluations', e.id));
                life.remove('subjects', initial!.id!);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={!name.trim()}>Guardar</button>
        </>
      }
    >
      <Field label="Nombre de la materia">
        <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Algoritmos y Estructuras de Datos" />
      </Field>
      {!isEdit && !name && (
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {SUGGESTED_SUBJECTS.map((s) => (
            <button key={s} type="button" onClick={() => setName(s)} className="text-[11px] px-2 py-1 rounded-full bg-surface-elevated border border-app text-muted hover:text-main cursor-pointer">
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Período">
          <input className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
        <Field label="Código">
          <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Profesor/a">
          <input className={inputCls} value={professor} onChange={(e) => setProfessor(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Estado">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as SubjectStatus)}>
            {Object.entries(SUBJECT_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Nota para promocionar">
          <input className={inputCls} inputMode="decimal" value={promotionGrade} onChange={(e) => setPromotionGrade(e.target.value)} />
        </Field>
        <Field label="Nota final">
          <input className={inputCls} inputMode="decimal" value={finalGrade} onChange={(e) => setFinalGrade(e.target.value)} placeholder="—" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inicio de cursada">
          <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Fin de cursada">
          <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Color" group>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} className={`w-8 h-8 rounded-full border-2 cursor-pointer ${color === c ? 'border-main scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Horario de cursada</span>
          <button
            type="button"
            className={btnGhost}
            onClick={() => setSchedule([...schedule, { id: newId('slot'), day: 0, start: '18:00', end: '21:00', kind: 'Teoría' }])}
          >
            <Plus className="w-3.5 h-3.5" /> Agregar día
          </button>
        </div>
        {schedule.map((slot) => (
          <div key={slot.id} className="grid grid-cols-[1fr_1fr_1fr_auto] sm:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
            <select className={inputCls} value={slot.day} onChange={(e) => setSchedule(schedule.map((x) => (x.id === slot.id ? { ...x, day: Number(e.target.value) } : x)))}>
              {DAY_NAMES_FULL.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
            <input type="time" className={inputCls} value={slot.start} onChange={(e) => setSchedule(schedule.map((x) => (x.id === slot.id ? { ...x, start: e.target.value } : x)))} />
            <input type="time" className={inputCls} value={slot.end} onChange={(e) => setSchedule(schedule.map((x) => (x.id === slot.id ? { ...x, end: e.target.value } : x)))} />
            <input className={`${inputCls} hidden sm:block`} value={slot.kind || ''} placeholder="Teoría" onChange={(e) => setSchedule(schedule.map((x) => (x.id === slot.id ? { ...x, kind: e.target.value } : x)))} />
            <input className={`${inputCls} hidden sm:block`} value={slot.room || ''} placeholder="Aula" onChange={(e) => setSchedule(schedule.map((x) => (x.id === slot.id ? { ...x, room: e.target.value } : x)))} />
            <button type="button" className="p-2 text-dim hover:text-red-500" onClick={() => setSchedule(schedule.filter((x) => x.id !== slot.id))} aria-label="Quitar horario">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Unidades / temas del programa</span>
        {units.map((u) => (
          <div key={u.id} className="flex items-center gap-2">
            <input type="checkbox" checked={u.done} onChange={() => setUnits(units.map((x) => (x.id === u.id ? { ...x, done: !x.done } : x)))} className="w-4 h-4 accent-[var(--color-accent)]" />
            <input className={inputCls} value={u.title} onChange={(e) => setUnits(units.map((x) => (x.id === u.id ? { ...x, title: e.target.value } : x)))} />
            <input className={`${inputCls} hidden sm:block`} value={u.notesUrl || ''} placeholder="Link al resumen (Notion)" onChange={(e) => setUnits(units.map((x) => (x.id === u.id ? { ...x, notesUrl: e.target.value } : x)))} />
            {u.notesUrl && (
              <a href={u.notesUrl} target="_blank" rel="noreferrer" className="p-2 text-accent" aria-label="Abrir resumen">
                <Link2 className="w-4 h-4" />
              </a>
            )}
            <button type="button" className="p-2 text-dim hover:text-red-500" onClick={() => setUnits(units.filter((x) => x.id !== u.id))} aria-label="Quitar unidad">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <textarea rows={3} className={textareaCls} value={unitsText} onChange={(e) => setUnitsText(e.target.value)} placeholder={'Pegá una unidad por línea:\nUnidad 1 · Lógica proposicional\nUnidad 2 · Conjuntos'} />
      </div>
      <Field label="Notas (condiciones de cursada, criterios, links)">
        <textarea rows={2} className={textareaCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
};

const EvalModal: React.FC<{ life: LifeApi; subjects: Subject[]; initial?: Partial<Evaluation>; onClose: () => void }> = ({ life, subjects, initial, onClose }) => {
  const [subjectId, setSubjectId] = useState(initial?.subjectId || subjects.find((s) => s.status === 'cursando')?.id || subjects[0]?.id || '');
  const [type, setType] = useState<EvalType>(initial?.type || 'parcial');
  const [title, setTitle] = useState(initial?.title || '');
  const [date, setDate] = useState(initial?.date || getTodayDateString());
  const [time, setTime] = useState(initial?.time || '');
  const [grade, setGrade] = useState(initial?.grade !== undefined ? String(initial.grade) : '');
  const [status, setStatus] = useState<Evaluation['status']>(initial?.status || 'pendiente');
  const [topics, setTopics] = useState(initial?.topics || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const isEdit = Boolean(initial?.id);
  const subj = subjects.find((s) => s.id === subjectId);

  const save = () => {
    if (!subjectId) return;
    const now = nowIso();
    const g = grade ? Number(grade.replace(',', '.')) : undefined;
    let st = status;
    if (g !== undefined && status === 'pendiente') st = g >= 4 ? 'aprobado' : 'desaprobado';
    life.upsert('evaluations', {
      id: initial?.id || newId('eval'),
      subjectId,
      type,
      title: title.trim(),
      date,
      time: time || undefined,
      grade: g,
      status: st,
      topics: topics.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker={isEdit ? 'Editar evaluación' : 'Nueva evaluación'}
      title={`${EVAL_TYPE_LABEL[type]}${subj ? ` · ${subj.name}` : ''}`}
      footer={
        <>
          {isEdit && (
            <button type="button" className={btnDanger} onClick={() => { life.remove('evaluations', initial!.id!); onClose(); }}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={!subjectId}>Guardar</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Materia">
          <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as EvalType)}>
            {Object.entries(EVAL_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Título">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Primer parcial" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Hora">
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Temas que entran">
        <textarea rows={2} className={textareaCls} value={topics} onChange={(e) => setTopics(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nota" hint="Al cargarla se marca aprobado (≥4) o desaprobado.">
          <input className={inputCls} inputMode="decimal" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="—" />
        </Field>
        <Field label="Estado">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as Evaluation['status'])}>
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="desaprobado">Desaprobado</option>
            <option value="ausente">Ausente</option>
          </select>
        </Field>
      </div>
      <Field label="Notas / aprendizajes">
        <textarea rows={2} className={textareaCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
};

const StudyLogModal: React.FC<{ life: LifeApi; subjects: Subject[]; onClose: () => void }> = ({ life, subjects, onClose }) => {
  const [subjectId, setSubjectId] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');
  const save = () => {
    const m = Number(minutes);
    if (!m) return;
    life.upsert('studyLogs', { id: newId('study'), subjectId: subjectId || undefined, date, minutes: m, note: note.trim() || undefined, createdAt: nowIso() });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      kicker="Registro manual"
      title="Estudié"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save}>Guardar</button>
        </>
      }
    >
      <Field label="Materia">
        <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">General</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Minutos">
          <input className={inputCls} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        <Field label="Fecha">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2">
        {[30, 60, 90, 120, 180].map((m) => (
          <button key={m} type="button" onClick={() => setMinutes(String(m))} className="flex-1 px-2 py-1.5 rounded-lg bg-surface-elevated border border-app text-xs font-mono cursor-pointer">
            {m >= 60 ? `${m / 60}h` : `${m}m`}
          </button>
        ))}
      </div>
      <Field label="¿Qué estudiaste?">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: ejercicios de recursividad" />
      </Field>
    </Modal>
  );
};
