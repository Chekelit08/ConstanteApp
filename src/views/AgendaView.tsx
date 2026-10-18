import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, Download, ListTodo, Plus } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { AgendaItem, CalendarEvent, LIFE_AREAS, Task } from '../types/life';
import { getAgendaForDate } from '../services/agenda';
import { addDays, DAY_NAMES_SHORT, formatArgentineDate, getMondayIndexedDay, getTodayDateString, getWeekDays, MONTH_NAMES, parseDateString } from '../utils/dateUtils';
import { buildIcs, downloadTextFile, IcsEventInput, nowTimeAR, recurrenceToRrule, timeToMinutes } from '../utils/lifeUtils';
import { btnGhost, btnPrimary, btnSecondary, Card, Chip, EmptyState, PageHeader, Tabs } from '../components/ui';
import { EventModal } from '../components/EventModal';
import { TaskList, TaskModal } from '../components/TaskList';

type AgendaTab = 'day' | 'week' | 'month' | 'tasks';

interface Props {
  life: LifeApi;
  onOpenUniversity: () => void;
}

export const AgendaView: React.FC<Props> = ({ life, onOpenUniversity }) => {
  const today = getTodayDateString();
  const [tab, setTab] = useState<AgendaTab>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'month'));
  const [selected, setSelected] = useState(today);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [eventModal, setEventModal] = useState<{ open: boolean; ev?: Partial<CalendarEvent> }>({ open: false });
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Partial<Task> }>({ open: false });

  const agendaFor = (d: string) => {
    const items = getAgendaForDate(life.store, d);
    return areaFilter ? items.filter((i) => i.area === areaFilter) : items;
  };

  const openItem = (item: AgendaItem) => {
    if (item.source === 'event' && item.refId) setEventModal({ open: true, ev: life.store.events[item.refId] });
    else if (item.source === 'task' && item.refId) setTaskModal({ open: true, task: life.store.tasks[item.refId] });
    else if (item.source === 'class' || item.source === 'evaluation') onOpenUniversity();
  };

  const exportIcs = () => {
    const evs: IcsEventInput[] = [];
    Object.values(life.store.events).forEach((e) =>
      evs.push({
        uid: e.id,
        title: e.title,
        date: e.date,
        start: e.allDay ? undefined : e.start,
        end: e.allDay ? undefined : e.end,
        allDay: e.allDay,
        location: e.location,
        description: e.notes,
        rrule: recurrenceToRrule(e),
        alarmMinutesBefore: e.allDay ? undefined : 30,
      })
    );
    Object.values(life.store.subjects)
      .filter((s) => s.status === 'cursando')
      .forEach((s) => {
        s.schedule.forEach((slot) => {
          // primera fecha que cae ese día de la semana desde el inicio (o hoy)
          let d = s.startDate && s.startDate > today ? s.startDate : today;
          for (let i = 0; i < 7 && getMondayIndexedDay(parseDateString(d)) !== slot.day; i++) d = addDays(d, 1);
          const until = (s.endDate || addDays(today, 120)).replace(/-/g, '');
          evs.push({
            uid: `${s.id}-${slot.id}`,
            title: `🎓 ${s.name}${slot.kind ? ` (${slot.kind})` : ''}`,
            date: d,
            start: slot.start,
            end: slot.end,
            location: slot.room,
            rrule: `FREQ=WEEKLY;UNTIL=${until}`,
            alarmMinutesBefore: 20,
          });
        });
      });
    Object.values(life.store.evaluations).forEach((e) => {
      const s = life.store.subjects[e.subjectId];
      evs.push({
        uid: e.id,
        title: `📝 ${e.type.toUpperCase()} ${s?.name || ''}`.trim(),
        date: e.date,
        start: e.time,
        allDay: !e.time,
        description: e.topics,
        alarmMinutesBefore: e.time ? 60 * 24 : undefined,
      });
    });
    Object.values(life.store.people)
      .filter((p) => p.birthday)
      .forEach((p) =>
        evs.push({ uid: `bday-${p.id}`, title: `🎂 ${p.name}`, date: `${today.slice(0, 4)}-${p.birthday}`, allDay: true, rrule: 'FREQ=YEARLY' })
      );
    downloadTextFile('constante-agenda.ics', buildIcs('CONSTANTE · Agenda', evs), 'text/calendar');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Calendario · Tareas · Clases"
        title="Agenda"
        subtitle="Todo lo que tiene fecha en tu vida en un solo lugar: eventos, clases, parciales, cumpleaños, tareas y recordatorios del plan."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={exportIcs} title="Descargá un .ics e importalo en Google Calendar o en el Calendario del iPhone">
              <Download className="w-4 h-4" /> Exportar .ics
            </button>
            <button type="button" className={btnPrimary} onClick={() => setEventModal({ open: true, ev: { date: selected } })}>
              <Plus className="w-4 h-4" /> Evento
            </button>
          </>
        }
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as AgendaTab)}
          tabs={[
            { id: 'day', label: 'Día', icon: <Clock className="w-3.5 h-3.5" /> },
            { id: 'week', label: 'Semana', icon: <CalendarDays className="w-3.5 h-3.5" /> },
            { id: 'month', label: 'Mes', icon: <CalendarRange className="w-3.5 h-3.5" /> },
            { id: 'tasks', label: 'Tareas', icon: <ListTodo className="w-3.5 h-3.5" /> },
          ]}
        />
        {tab !== 'tasks' && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <Chip active={!areaFilter} onClick={() => setAreaFilter(null)}>
              Todo
            </Chip>
            {LIFE_AREAS.map((a) => (
              <Chip key={a.id} active={areaFilter === a.id} color={a.color} onClick={() => setAreaFilter(areaFilter === a.id ? null : a.id)}>
                {a.emoji} {a.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {tab === 'month' && (
        <MonthGrid selected={selected} onSelect={setSelected} agendaFor={agendaFor} today={today} />
      )}
      {tab === 'week' && <WeekList selected={selected} onSelect={setSelected} agendaFor={agendaFor} today={today} onOpen={openItem} />}
      {(tab === 'day' || tab === 'month') && (
        <DayTimeline
          date={selected}
          setDate={setSelected}
          items={agendaFor(selected)}
          today={today}
          onOpen={openItem}
          onAdd={(start) => setEventModal({ open: true, ev: { date: selected, start, end: start ? `${String(Number(start.slice(0, 2)) + 1).padStart(2, '0')}:00` : undefined, allDay: !start } })}
          compact={tab === 'month'}
        />
      )}
      {tab === 'tasks' && (
        <Card title="Todas mis tareas" icon={<ListTodo className="w-4 h-4" />}>
          <TaskList life={life} />
        </Card>
      )}

      <p className="text-[11px] text-dim">
        Tip: con "Exportar .ics" llevás tu agenda (clases, parciales, eventos y cumpleaños) a Google Calendar o al Calendario del iPhone para recibir avisos aunque no abras la app.
      </p>

      {eventModal.open && <EventModal open life={life} initial={eventModal.ev} onClose={() => setEventModal({ open: false })} />}
      {taskModal.open && <TaskModal open life={life} initial={taskModal.task} onClose={() => setTaskModal({ open: false })} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MES
// ─────────────────────────────────────────────────────────────
const MonthGrid: React.FC<{
  selected: string;
  onSelect: (d: string) => void;
  agendaFor: (d: string) => AgendaItem[];
  today: string;
}> = ({ selected, onSelect, agendaFor, today }) => {
  const [cursor, setCursor] = useState(() => selected.slice(0, 7));
  const [y, m] = cursor.split('-').map(Number);

  const cells = useMemo(() => {
    const first = `${cursor}-01`;
    const offset = getMondayIndexedDay(parseDateString(first));
    const start = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-app">
        <button type="button" className={btnGhost} onClick={() => shift(-1)} aria-label="Mes anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h3 className="font-display text-xl font-bold text-main">
            {MONTH_NAMES[m - 1]} {y}
          </h3>
          <button type="button" className="text-[11px] text-accent font-semibold" onClick={() => { setCursor(today.slice(0, 7)); onSelect(today); }}>
            Ir a hoy
          </button>
        </div>
        <button type="button" className={btnGhost} onClick={() => shift(1)} aria-label="Mes siguiente">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-app bg-surface-elevated">
        {DAY_NAMES_SHORT.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const items = agendaFor(d);
          const inMonth = d.slice(0, 7) === cursor;
          const isToday = d === today;
          const isSel = d === selected;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              className={`min-h-[64px] sm:min-h-[96px] p-1 sm:p-1.5 border-b border-r border-subtle text-left align-top flex flex-col gap-0.5 transition cursor-pointer ${
                isSel ? 'bg-accent-subtle' : 'hover:bg-surface-elevated'
              } ${inMonth ? '' : 'opacity-40'}`}
            >
              <span
                className={`text-[11px] font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-accent text-accent-contrast' : 'text-main'
                }`}
              >
                {Number(d.slice(8))}
              </span>
              {/* Mobile: puntos */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {items.slice(0, 4).map((it) => (
                  <span key={it.key} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: it.color }} />
                ))}
              </div>
              {/* Desktop: etiquetas */}
              <div className="hidden sm:flex flex-col gap-0.5 w-full">
                {items.slice(0, 3).map((it) => (
                  <span
                    key={it.key}
                    className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${it.done ? 'line-through opacity-60' : ''}`}
                    style={{ backgroundColor: `${it.color}22`, color: it.color }}
                  >
                    {it.start ? `${it.start} ` : ''}
                    {it.title}
                  </span>
                ))}
                {items.length > 3 && <span className="text-[10px] text-muted font-mono">+{items.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────
// SEMANA
// ─────────────────────────────────────────────────────────────
const WeekList: React.FC<{
  selected: string;
  onSelect: (d: string) => void;
  agendaFor: (d: string) => AgendaItem[];
  today: string;
  onOpen: (i: AgendaItem) => void;
}> = ({ selected, onSelect, agendaFor, today, onOpen }) => {
  const days = getWeekDays(selected);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" className={btnGhost} onClick={() => onSelect(addDays(selected, -7))}>
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <span className="text-xs font-mono uppercase tracking-[0.1em] text-muted">
          {formatArgentineDate(days[0])} — {formatArgentineDate(days[6])}
        </span>
        <button type="button" className={btnGhost} onClick={() => onSelect(addDays(selected, 7))}>
          Siguiente <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d, i) => {
          const items = agendaFor(d);
          return (
            <div key={d} className={`rounded-2xl border p-2.5 min-h-[120px] ${d === today ? 'border-accent bg-accent-subtle/40' : 'border-app bg-surface'}`}>
              <button type="button" onClick={() => onSelect(d)} className="w-full flex md:flex-col items-baseline md:items-start gap-2 mb-2 cursor-pointer text-left">
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">{DAY_NAMES_SHORT[i]}</span>
                <span className={`font-num font-bold text-2xl leading-none ${d === today ? 'text-accent' : 'text-main'}`}>{Number(d.slice(8))}</span>
              </button>
              <div className="space-y-1">
                {items.length === 0 && <p className="text-[11px] text-dim italic">Libre</p>}
                {items.map((it) => (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => onOpen(it)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] leading-snug border-l-[3px] bg-surface-elevated hover:opacity-80 cursor-pointer ${it.done ? 'line-through opacity-60' : ''}`}
                    style={{ borderLeftColor: it.color }}
                  >
                    {it.start && <span className="font-mono text-muted mr-1">{it.start}</span>}
                    <span className="text-main font-medium">{it.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DÍA (línea de tiempo)
// ─────────────────────────────────────────────────────────────
const HOUR_START = 6;
const HOUR_END = 24;
const PX_PER_MIN = 0.9;

export const DayTimeline: React.FC<{
  date: string;
  setDate: (d: string) => void;
  items: AgendaItem[];
  today: string;
  onOpen: (i: AgendaItem) => void;
  onAdd: (start?: string) => void;
  compact?: boolean;
}> = ({ date, setDate, items, today, onOpen, onAdd, compact }) => {
  const allDay = items.filter((i) => i.allDay);
  const timed = items.filter((i) => !i.allDay && i.start);
  const nowMin = timeToMinutes(nowTimeAR());
  const totalMin = (HOUR_END - HOUR_START) * 60;

  return (
    <Card
      title={formatArgentineDate(date, { includeDayName: true })}
      icon={<Clock className="w-4 h-4" />}
      action={
        <div className="flex items-center gap-1">
          <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {date !== today && (
            <button type="button" className={btnGhost} onClick={() => setDate(today)}>
              Hoy
            </button>
          )}
          <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      }
    >
      {allDay.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {allDay.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => onOpen(it)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left cursor-pointer hover:opacity-80 ${it.done ? 'line-through opacity-60' : ''}`}
              style={{ backgroundColor: `${it.color}1A`, color: it.color }}
            >
              <span>{it.emoji}</span>
              <span className="font-semibold truncate">{it.title}</span>
              {it.subtitle && <span className="text-[11px] opacity-80 truncate">· {it.subtitle}</span>}
            </button>
          ))}
        </div>
      )}

      {compact ? (
        timed.length === 0 && allDay.length === 0 ? (
          <EmptyState title="Día libre" text="No hay nada agendado. Tocá + Evento para planificarlo." />
        ) : (
          <div className="space-y-1.5">
            {timed.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => onOpen(it)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-surface-elevated border-l-4 text-left cursor-pointer hover:opacity-80"
                style={{ borderLeftColor: it.color }}
              >
                <span className="text-xs font-mono text-muted w-24 shrink-0">
                  {it.start}
                  {it.end ? `–${it.end}` : ''}
                </span>
                <span className="text-sm font-semibold text-main truncate">{it.title}</span>
                {it.subtitle && <span className="text-[11px] text-muted truncate hidden sm:inline">{it.subtitle}</span>}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="relative border-l border-app ml-12" style={{ height: totalMin * PX_PER_MIN }}>
          {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onAdd(`${String(h).padStart(2, '0')}:00`)}
              className="absolute left-0 right-0 border-t border-subtle text-left cursor-copy hover:bg-surface-elevated/50"
              style={{ top: (h - HOUR_START) * 60 * PX_PER_MIN, height: 60 * PX_PER_MIN }}
              aria-label={`Agregar evento a las ${h}:00`}
            >
              <span className="absolute -left-12 -top-2 text-[10px] font-mono text-muted w-10 text-right">{String(h).padStart(2, '0')}:00</span>
            </button>
          ))}
          {date === today && nowMin >= HOUR_START * 60 && (
            <div className="absolute left-0 right-0 border-t-2 border-accent z-10 pointer-events-none" style={{ top: (nowMin - HOUR_START * 60) * PX_PER_MIN }}>
              <span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-accent" />
            </div>
          )}
          {timed.map((it, idx) => {
            const s = Math.max(timeToMinutes(it.start), HOUR_START * 60);
            const e = it.end ? timeToMinutes(it.end) : s + 60;
            const overlapIdx = timed.slice(0, idx).filter((o) => {
              const os = timeToMinutes(o.start);
              const oe = o.end ? timeToMinutes(o.end) : os + 60;
              return os < e && oe > s;
            }).length;
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => onOpen(it)}
                className="absolute rounded-lg px-2 py-1 text-left overflow-hidden border-l-4 shadow-2xs cursor-pointer hover:opacity-90 z-20"
                style={{
                  top: (s - HOUR_START * 60) * PX_PER_MIN,
                  height: Math.max(26, (e - s) * PX_PER_MIN - 2),
                  left: `calc(${overlapIdx * 18}% + 6px)`,
                  right: 6,
                  backgroundColor: `color-mix(in srgb, ${it.color} 16%, var(--bg-surface))`,
                  borderLeftColor: it.color,
                }}
              >
                <div className="text-[11px] font-semibold text-main truncate">
                  {it.emoji} {it.title}
                </div>
                <div className="text-[10px] font-mono text-muted truncate">
                  {it.start}
                  {it.end ? `–${it.end}` : ''} {it.subtitle ? `· ${it.subtitle}` : ''}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {!compact && (
        <p className="text-[11px] text-dim mt-3">Tocá cualquier hora vacía para agendar algo en ese bloque.</p>
      )}
    </Card>
  );
};
