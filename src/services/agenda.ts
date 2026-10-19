import { AgendaItem, getArea, LifeStore, EVAL_TYPE_LABEL } from '../types/life';
import { addDays, getMondayIndexedDay, parseDateString } from '../utils/dateUtils';
import { eventOccursOn, lastSundayOfMonth, monthKey, timeToMinutes } from '../utils/lifeUtils';
import type { FeedEvent } from './calendarFeeds';

/**
 * Une en una sola agenda todo lo que tiene fecha en tu vida:
 * eventos, clases de la facu, parciales/finales, cumpleaños, tareas con vencimiento
 * y recordatorios del sistema (revisión mensual, aguinaldo).
 */
export function getAgendaForDate(store: LifeStore, dateStr: string, external: FeedEvent[] = []): AgendaItem[] {
  const items: AgendaItem[] = [];
  const weekday = getMondayIndexedDay(parseDateString(dateStr));

  // Calendarios conectados (Google, iCloud…)
  external.forEach((e) => {
    items.push({
      key: `ext-${e.feedId}-${e.uid}`,
      date: dateStr,
      start: e.allDay ? undefined : e.start,
      end: e.allDay ? undefined : e.end,
      allDay: e.allDay,
      title: e.title,
      subtitle: [e.location, e.feedName].filter(Boolean).join(' · '),
      area: 'personal',
      color: e.color,
      emoji: e.feedId === 'feriados' ? '🇦🇷' : '📅',
      source: 'external',
    });
  });

  // Eventos propios
  Object.values(store.events).forEach((ev) => {
    if (!eventOccursOn(ev, dateStr)) return;
    const area = getArea(ev.area);
    items.push({
      key: `ev-${ev.id}-${dateStr}`,
      date: dateStr,
      start: ev.allDay ? undefined : ev.start,
      end: ev.allDay ? undefined : ev.end,
      allDay: ev.allDay || !ev.start,
      title: ev.title,
      subtitle: ev.location,
      area: ev.area,
      color: area.color,
      emoji: area.emoji,
      source: 'event',
      refId: ev.id,
    });
  });

  // Clases de materias en curso
  Object.values(store.subjects).forEach((s) => {
    if (s.status !== 'cursando') return;
    if (s.startDate && dateStr < s.startDate) return;
    if (s.endDate && dateStr > s.endDate) return;
    s.schedule
      .filter((slot) => slot.day === weekday)
      .forEach((slot) => {
        items.push({
          key: `class-${s.id}-${slot.id}-${dateStr}`,
          date: dateStr,
          start: slot.start,
          end: slot.end,
          allDay: false,
          title: s.name,
          subtitle: [slot.kind, slot.room].filter(Boolean).join(' · ') || 'Clase',
          area: 'universidad',
          color: s.color,
          emoji: '🎓',
          source: 'class',
          refId: s.id,
        });
      });
  });

  // Evaluaciones
  Object.values(store.evaluations).forEach((e) => {
    if (e.date !== dateStr) return;
    const subj = store.subjects[e.subjectId];
    items.push({
      key: `eval-${e.id}`,
      date: dateStr,
      start: e.time,
      allDay: !e.time,
      title: `${EVAL_TYPE_LABEL[e.type]}: ${subj?.name || 'Materia'}`,
      subtitle: e.title || e.topics,
      area: 'universidad',
      color: subj?.color || '#2563EB',
      emoji: e.type === 'final' ? '🏁' : '📝',
      source: 'evaluation',
      refId: e.id,
      done: e.status !== 'pendiente',
    });
  });

  // Cumpleaños
  Object.values(store.people).forEach((p) => {
    if (p.birthday && p.birthday === dateStr.slice(5)) {
      items.push({
        key: `bday-${p.id}-${dateStr}`,
        date: dateStr,
        allDay: true,
        title: `🎂 Cumpleaños de ${p.name}`,
        area: p.group === 'familia' ? 'familia' : 'amigos',
        color: '#E11D48',
        emoji: '🎂',
        source: 'birthday',
        refId: p.id,
      });
    }
  });

  // Tareas que vencen ese día
  Object.values(store.tasks).forEach((t) => {
    if (t.dueDate !== dateStr) return;
    const area = getArea(t.area);
    items.push({
      key: `task-${t.id}`,
      date: dateStr,
      allDay: true,
      title: t.title,
      subtitle: 'Tarea',
      area: t.area,
      color: area.color,
      emoji: '☑️',
      source: 'task',
      refId: t.id,
      done: t.done,
    });
  });

  // Sistema: revisión mensual (último domingo) y aguinaldo
  if (lastSundayOfMonth(monthKey(dateStr)) === dateStr) {
    items.push({
      key: `sys-review-${dateStr}`,
      date: dateStr,
      allDay: true,
      title: '🧭 Revisión mensual del plan',
      subtitle: '8 preguntas en Brújula',
      area: 'personal',
      color: '#64748B',
      emoji: '🧭',
      source: 'system',
    });
  }
  const md = dateStr.slice(5);
  if (md === '06-30' || md === '12-18') {
    items.push({
      key: `sys-aguinaldo-${dateStr}`,
      date: dateStr,
      allDay: true,
      title: '💰 Aguinaldo → 100% al ahorro',
      area: 'finanzas',
      color: '#16A34A',
      emoji: '💰',
      source: 'system',
    });
  }

  return items.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });
}

export function getAgendaForRange(store: LifeStore, fromStr: string, days: number): Record<string, AgendaItem[]> {
  const out: Record<string, AgendaItem[]> = {};
  for (let i = 0; i < days; i++) {
    const d = addDays(fromStr, i);
    out[d] = getAgendaForDate(store, d);
  }
  return out;
}

/** Próximas evaluaciones pendientes */
export function getUpcomingEvaluations(store: LifeStore, fromStr: string, limit = 5) {
  return Object.values(store.evaluations)
    .filter((e) => e.status === 'pendiente' && e.date >= fromStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}
