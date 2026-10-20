import React, { useEffect, useMemo, useState } from 'react';
import { formatArgentineDate } from '../utils/dateUtils';
import { nowTimeAR, timeToMinutes } from '../utils/lifeUtils';

/**
 * El cielo de tu día: el fondo cambia con la hora real y el sol (o la luna)
 * recorre un arco desde que te levantás hasta que te acostás.
 */

export type Phase = 'night' | 'dawn' | 'morning' | 'day' | 'dusk' | 'evening';

const SKIES: Record<Phase, { bg: string; horizon: string; label: string }> = {
  night: { bg: 'linear-gradient(180deg,#070a1c 0%,#11163a 60%,#1c2050 100%)', horizon: '#2a2f6a', label: 'Noche' },
  dawn: { bg: 'linear-gradient(180deg,#1d1f4f 0%,#6a3f7a 45%,#e2718a 75%,#ffb37c 100%)', horizon: '#ffc28f', label: 'Amanecer' },
  morning: { bg: 'linear-gradient(180deg,#3159c9 0%,#6f95ec 55%,#ffd3a5 100%)', horizon: '#ffe2c0', label: 'Mañana' },
  day: { bg: 'linear-gradient(180deg,#2f5fd0 0%,#5d8ff0 55%,#a9c6ff 100%)', horizon: '#d6e4ff', label: 'Día' },
  dusk: { bg: 'linear-gradient(180deg,#2c2463 0%,#7b3f86 40%,#e0647b 72%,#ffad6b 100%)', horizon: '#ffb780', label: 'Atardecer' },
  evening: { bg: 'linear-gradient(180deg,#0e1130 0%,#271f58 60%,#4a2f72 100%)', horizon: '#5b3f86', label: 'Anochecer' },
};

export function phaseFor(min: number): Phase {
  const h = min / 60;
  if (h < 5) return 'night';
  if (h < 7.5) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 17.5) return 'day';
  if (h < 20) return 'dusk';
  if (h < 22) return 'evening';
  return 'night';
}

function greeting(min: number): string {
  const h = min / 60;
  if (h >= 5 && h < 12.5) return 'Buen día';
  if (h >= 12.5 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// estrellas fijas (posiciones pseudoaleatorias estables)
const STARS = Array.from({ length: 34 }, (_, i) => ({
  x: (i * 37.7) % 100,
  y: (i * 23.3) % 62,
  r: i % 5 === 0 ? 1.6 : 1,
  d: (i % 7) * 0.6,
}));

interface Props {
  name: string;
  date: string;
  wakeTime: string;
  sleepTime: string;
  word: string;
  habitsDone: number;
  habitsTotal: number;
  children?: React.ReactNode;
}

export const SkyHero: React.FC<Props> = ({ name, date, wakeTime, sleepTime, word, habitsDone, habitsTotal, children }) => {
  const [nowMin, setNowMin] = useState(() => timeToMinutes(nowTimeAR()));
  useEffect(() => {
    const id = setInterval(() => setNowMin(timeToMinutes(nowTimeAR())), 30000);
    return () => clearInterval(id);
  }, []);

  const phase = phaseFor(nowMin);
  const sky = SKIES[phase];
  const wake = timeToMinutes(wakeTime);
  let sleep = timeToMinutes(sleepTime);
  if (sleep <= wake) sleep += 24 * 60;
  const nowAdj = nowMin < wake && sleep > 24 * 60 && nowMin + 24 * 60 <= sleep ? nowMin + 24 * 60 : nowMin;
  const awake = nowAdj >= wake && nowAdj <= sleep;
  const t = Math.min(1, Math.max(0, (nowAdj - wake) / (sleep - wake)));
  const leftMin = Math.max(0, sleep - nowAdj);
  const showStars = phase === 'night' || phase === 'evening' || phase === 'dawn';

  // Arco: semielipse de (8,92) a (92,92) con cima en y=18 (coordenadas %)
  const sun = useMemo(() => {
    const a = Math.PI * (1 - t);
    return { x: 50 + 42 * Math.cos(a), y: 92 - 74 * Math.sin(a) };
  }, [t]);

  const pct = habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : 0;

  return (
    <section
      className="relative overflow-hidden rounded-[32px] text-white min-h-[300px] sm:min-h-[320px] shadow-[0_30px_60px_-30px_rgba(10,12,40,0.9)] animate-rise"
      style={{ background: sky.bg, transition: 'background 2s ease' }}
      aria-label={`Cielo del día: ${sky.label}`}
    >
      {showStars &&
        STARS.map((s, i) => (
          <span
            key={i}
            className="star absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2, animationDelay: `${s.d}s` }}
          />
        ))}

      {/* Arco del día */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-[78%] pointer-events-none" aria-hidden>
        <path d="M 8 92 A 42 74 0 0 1 92 92" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.35" strokeDasharray="1 1.4" vectorEffect="non-scaling-stroke" />
        {awake && (
          <path
            d={`M 8 92 A 42 74 0 0 1 ${sun.x.toFixed(2)} ${sun.y.toFixed(2)}`}
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="1.4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Sol o luna (fuera del SVG para que no se deforme) */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `${awake ? sun.x : 84}%`, top: `${22 + (awake ? sun.y : 30) * 0.78}%`, transition: 'left 1.5s ease, top 1.5s ease' }}
        aria-hidden
      >
        {awake && phase !== 'night' && phase !== 'evening' ? (
          <div className="w-9 h-9 rounded-full bg-[#fff3d6] shadow-[0_0_30px_10px_rgba(255,214,150,0.65),0_0_80px_30px_rgba(255,170,110,0.35)]" />
        ) : (
          <div className="relative w-8 h-8 rounded-full bg-[#eef0ff] shadow-[0_0_24px_6px_rgba(200,210,255,0.45)]">
            <div className="absolute -right-1 -top-1 w-7 h-7 rounded-full" style={{ background: 'rgba(17,22,58,0.92)' }} />
          </div>
        )}
      </div>

      {/* Horizonte */}
      <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{ background: `linear-gradient(180deg, transparent, ${sky.horizon}33)` }} />
      <div className="absolute inset-x-0 bottom-[14px] h-px bg-white/25 pointer-events-none" />

      {/* Contenido */}
      <div className="relative p-6 sm:p-8 flex flex-col h-full min-h-[300px] sm:min-h-[320px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">{formatArgentineDate(date, { includeDayName: true })}</p>
            <h2 className="font-display text-[38px] sm:text-[52px] font-bold leading-[0.98] mt-1 drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
              {greeting(nowMin)}
              {name ? `, ${name}` : ''}.
            </h2>
          </div>
          {word && (
            <span className="shrink-0 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 font-display text-sm font-bold tracking-[0.12em]">
              {word}
            </span>
          )}
        </div>

        <div className="mt-auto pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 pl-4 rounded-[22px] bg-white/[0.12] backdrop-blur-xl border border-white/20">
          <div className="flex gap-6">
            <div>
              <div className="font-num text-3xl font-bold leading-none">{pct}%</div>
              <div className="text-xs text-white/75 mt-1">
                hábitos · {habitsDone}/{habitsTotal}
              </div>
            </div>
            <div>
              <div className="font-num text-3xl font-bold leading-none">
                {awake ? `${Math.floor(leftMin / 60)}h ${String(Math.round(leftMin % 60)).padStart(2, '0')}` : '—'}
              </div>
              <div className="text-xs text-white/75 mt-1">{awake ? 'quedan despierto' : 'hora de descansar'}</div>
            </div>
          </div>
          {children}
          </div>
        </div>
      </div>
    </section>
  );
};
