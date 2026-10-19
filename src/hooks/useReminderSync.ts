import { useEffect, useState } from 'react';
import { LifeApi } from './useLifeData';
import { useCalendarFeeds } from '../services/calendarFeeds';
import { buildReminders } from '../services/reminders';
import { pushEnabledHere, syncPushReminders } from '../services/push';

/** Mantiene programados los avisos push: se resube cuando cambian tus datos o tus calendarios */
export function useReminderSync(life: LifeApi) {
  const { events } = useCalendarFeeds();
  const [tick, setTick] = useState(0);

  // cada 30 min y al volver a la app, para que la ventana de días avance
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30 * 60_000);
    const onVis = () => document.visibilityState === 'visible' && setTick((t) => t + 1);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('norte-push-changed', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('norte-push-changed', onVis);
    };
  }, []);

  useEffect(() => {
    if (!pushEnabledHere()) return;
    const t = setTimeout(() => {
      syncPushReminders(buildReminders(life.store, events)).catch((e) => console.warn('No se pudieron programar los avisos', e));
    }, 3000);
    return () => clearTimeout(t);
  }, [life.store, events, tick]);
}
