import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { LifeApi } from '../hooks/useLifeData';
import { useHabitActions } from '../hooks/useHabitActions';
import { LifeArea } from '../types/life';
import { getLocalData, setLocalData, removeLocalData } from '../utils/storage';
import { isoToLocalDate, newId } from '../utils/lifeUtils';

/** Temporizador de enfoque global: sigue corriendo aunque cambies de sección o recargues */
export interface RunningFocus {
  phase: 'focus' | 'break';
  area: LifeArea;
  subjectId?: string;
  label?: string;
  plannedMinutes: number;
  startedAt: number; // ms
  pausedAt?: number;
  pausedTotal: number; // ms
}

interface FocusCtx {
  running: RunningFocus | null;
  remainingMs: number;
  start: (opts: { area: LifeArea; minutes: number; subjectId?: string; label?: string; phase?: 'focus' | 'break' }) => void;
  pause: () => void;
  resume: () => void;
  stop: (save: boolean) => void;
}

const Ctx = createContext<FocusCtx | null>(null);
const KEY = 'focus_running';

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [660, 880, 990].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.7);
    });
  } catch {
    /* sin audio */
  }
}

export const FocusProvider: React.FC<{ life: LifeApi; children: React.ReactNode }> = ({ life, children }) => {
  const [running, setRunning] = useState<RunningFocus | null>(() => getLocalData<RunningFocus | null>(KEY, null));
  const [now, setNow] = useState(Date.now());
  const habits = useHabitActions(life);
  const finishing = useRef(false);

  useEffect(() => {
    if (running) setLocalData(KEY, running);
    else removeLocalData(KEY);
  }, [running]);

  useEffect(() => {
    if (!running || running.pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  const elapsedMs = running ? (running.pausedAt || now) - running.startedAt - running.pausedTotal : 0;
  const remainingMs = running ? Math.max(0, running.plannedMinutes * 60000 - elapsedMs) : 0;

  const save = useCallback(
    (r: RunningFocus, minutes: number, completed: boolean) => {
      if (r.phase !== 'focus' || minutes < 1) return;
      const date = isoToLocalDate(new Date(r.startedAt).toISOString());
      life.upsert('focusSessions', {
        id: newId('focus'),
        date,
        start: new Date(r.startedAt).toISOString(),
        minutes,
        area: r.area,
        subjectId: r.subjectId,
        label: r.label,
        completed,
      });
      habits.addMinutesForArea(r.area, date, minutes);
    },
    [life, habits]
  );

  const stop = useCallback(
    (doSave: boolean) => {
      if (running && doSave) save(running, Math.floor(elapsedMs / 60000), false);
      setRunning(null);
    },
    [running, elapsedMs, save]
  );

  // Fin natural del bloque
  useEffect(() => {
    if (!running || running.pausedAt || remainingMs > 0 || finishing.current) return;
    finishing.current = true;
    save(running, running.plannedMinutes, true);
    playChime();
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(running.phase === 'focus' ? '¡Bloque terminado! 🎯' : 'Fin del descanso', {
          body: running.phase === 'focus' ? 'Tomate un descanso corto.' : 'A volver al foco.',
          icon: '/pwa-192x192.png',
        });
      }
    } catch {
      /* ignorar */
    }
    if ('vibrate' in navigator) navigator.vibrate?.([120, 60, 120]);
    const prefs = life.store.prefs;
    if (running.phase === 'focus' && prefs.breakMinutes > 0) {
      setRunning({ ...running, phase: 'break', plannedMinutes: prefs.breakMinutes, startedAt: Date.now(), pausedTotal: 0, pausedAt: undefined });
    } else {
      setRunning(null);
    }
    setTimeout(() => (finishing.current = false), 1000);
  }, [remainingMs, running, save, life.store.prefs]);

  const value: FocusCtx = {
    running,
    remainingMs,
    start: ({ area, minutes, subjectId, label, phase = 'focus' }) =>
      setRunning({ phase, area, subjectId, label, plannedMinutes: minutes, startedAt: Date.now(), pausedTotal: 0 }),
    pause: () => running && !running.pausedAt && setRunning({ ...running, pausedAt: Date.now() }),
    resume: () => running?.pausedAt && setRunning({ ...running, pausedTotal: running.pausedTotal + (Date.now() - running.pausedAt), pausedAt: undefined }),
    stop,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useFocus(): FocusCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFocus fuera de FocusProvider');
  return c;
}

export function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
