import { DEFAULT_REMINDERS, EVAL_TYPE_LABEL, LifeStore } from '../types/life';
import { addDays, getMondayIndexedDay, getTodayDateString, parseDateString } from '../utils/dateUtils';
import { eventOccursOn, minutesToTime, timeToMinutes } from '../utils/lifeUtils';
import { dayCompletion } from '../utils/habits';
import { getVerseForDate } from './verses';
import type { FeedEvent } from './calendarFeeds';
import type { PushReminder } from './push';

const DAYS_AHEAD = 10;

/** Fecha + hora de Argentina → ISO */
const at = (date: string, time: string) => `${date}T${time}:00-03:00`;

/** Resta minutos a una fecha/hora, pasando al día anterior si hace falta */
function before(date: string, time: string, minutes: number): string {
  let m = timeToMinutes(time) - minutes;
  let d = date;
  while (m < 0) {
    m += 1440;
    d = addDays(d, -1);
  }
  return at(d, minutesToTime(m));
}

const leadLabel = (min: number) => (min >= 60 ? `en ${Math.round(min / 60)} h` : `en ${min} min`);

/** Todos los avisos de los próximos días según tus datos y tus preferencias */
export function buildReminders(store: LifeStore, external: FeedEvent[]): PushReminder[] {
  const prefs = store.prefs;
  const r = { ...DEFAULT_REMINDERS, ...(prefs.reminders || {}) };
  const today = getTodayDateString();
  const now = Date.now();
  const out: PushReminder[] = [];
  const add = (x: PushReminder) => {
    if (Date.parse(x.fireAt) > now) out.push(x);
  };

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    const weekday = getMondayIndexedDay(parseDateString(date));

    if (prefs.verseNotify) {
      const v = getVerseForDate(date);
      add({ fireAt: at(date, prefs.verseTime), title: `📖 ${v.ref}`, body: v.text, url: '/?s=faith', tag: `verse-${date}` });
    }

    if (r.classesLead > 0) {
      Object.values(store.subjects).forEach((s) => {
        if (s.status !== 'cursando' || (s.startDate && date < s.startDate) || (s.endDate && date > s.endDate)) return;
        s.schedule
          .filter((slot) => slot.day === weekday && slot.start)
          .forEach((slot) =>
            add({
              fireAt: before(date, slot.start, r.classesLead),
              title: `🎓 ${s.name} ${leadLabel(r.classesLead)}`,
              body: [slot.start, slot.kind, slot.room].filter(Boolean).join(' · '),
              url: '/?s=agenda',
              tag: `class-${s.id}-${slot.id}-${date}`,
            })
          );
      });
    }

    if (r.eventsLead > 0) {
      Object.values(store.events).forEach((ev) => {
        if (ev.allDay || !ev.start || !eventOccursOn(ev, date)) return;
        add({
          fireAt: before(date, ev.start, r.eventsLead),
          title: `📅 ${ev.title} ${leadLabel(r.eventsLead)}`,
          body: [ev.start + (ev.end ? `–${ev.end}` : ''), ev.location].filter(Boolean).join(' · '),
          url: '/?s=agenda',
          tag: `ev-${ev.id}-${date}`,
        });
      });
    }

    if (r.tasks) {
      const due = Object.values(store.tasks).filter((t) => !t.done && t.dueDate === date);
      if (due.length)
        add({
          fireAt: at(date, r.morningTime),
          title: due.length === 1 ? `☑️ Hoy vence: ${due[0].title}` : `☑️ Hoy vencen ${due.length} tareas`,
          body: due.slice(0, 4).map((t) => `• ${t.title}`).join('\n'),
          url: '/?s=agenda',
          tag: `tasks-${date}`,
        });
    }

    if (r.birthdays) {
      Object.values(store.people)
        .filter((p) => p.birthday === date.slice(5))
        .forEach((p) => add({ fireAt: at(date, r.morningTime), title: `🎂 Hoy cumple ${p.name}`, body: 'Mandale un mensaje 💬', url: '/?s=people', tag: `bday-${p.id}-${date}` }));
    }

    // hábitos: si hoy ya completaste todo, no molesta
    if (r.habits && !(date === today && dayCompletion(store, date).pct >= 100)) {
      add({ fireAt: at(date, r.habitsTime), title: '🔥 ¿Cómo vienen tus hábitos?', body: 'Marcá lo que hiciste hoy antes de dormir.', url: '/?s=habits', tag: `habits-${date}` });
    }

    if (r.closeDay && !store.days?.[date]) {
      add({ fireAt: at(date, r.closeDayTime), title: '🌙 Cerrá el día', body: 'Ánimo, gratitud y lo que aprendiste. 2 minutos.', url: '/?s=journal', tag: `close-${date}` });
    }
  }

  if (r.evaluations) {
    Object.values(store.evaluations)
      .filter((e) => e.status === 'pendiente' && e.date >= today && e.date <= addDays(today, DAYS_AHEAD))
      .forEach((e) => {
        const subj = store.subjects[e.subjectId]?.name || 'Materia';
        const label = `${EVAL_TYPE_LABEL[e.type]}: ${subj}`;
        add({ fireAt: at(addDays(e.date, -1), '20:00'), title: `📝 Mañana: ${label}`, body: e.topics || 'Repasá y dormí bien 💪', url: '/?s=university', tag: `eval-eve-${e.id}` });
        if (e.time) add({ fireAt: before(e.date, e.time, 120), title: `📝 ${label} en 2 h`, body: `${e.time}${e.title ? ` · ${e.title}` : ''}`, url: '/?s=university', tag: `eval-${e.id}` });
      });
  }

  if (r.externalLead > 0) {
    const limit = addDays(today, DAYS_AHEAD);
    external
      .filter((e) => !e.allDay && e.start && e.date >= today && e.date <= limit && e.feedId !== 'feriados')
      .forEach((e) =>
        add({
          fireAt: before(e.date, e.start!, r.externalLead),
          title: `📅 ${e.title} ${leadLabel(r.externalLead)}`,
          body: [`${e.start}${e.end ? `–${e.end}` : ''}`, e.location].filter(Boolean).join(' · '),
          url: '/?s=agenda',
          tag: `ext-${e.uid}`,
        })
      );
  }

  return out.sort((a, b) => a.fireAt.localeCompare(b.fireAt)).slice(0, 400);
}
