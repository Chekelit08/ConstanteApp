import React, { useMemo, useState } from 'react';
import { Pause, Play, Square, Timer } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { formatClock, useFocus } from '../components/FocusContext';
import { getArea, LifeArea, LIFE_AREAS } from '../types/life';
import { addDays, getTodayDateString } from '../utils/dateUtils';
import { formatDuration, isoToLocalTime } from '../utils/lifeUtils';
import { btnGhost, btnPrimary, btnSecondary, Card, Chip, Field, inputCls, MiniBars, PageHeader, Stat } from '../components/ui';

const PRESETS = [25, 50, 90];

export const FocusView: React.FC<{ life: LifeApi }> = ({ life }) => {
  const focus = useFocus();
  const { store } = life;
  const today = getTodayDateString();
  const [area, setArea] = useState<LifeArea>('universidad');
  const [minutes, setMinutes] = useState(store.prefs.focusMinutes || 50);
  const [subjectId, setSubjectId] = useState('');
  const [label, setLabel] = useState('');
  const subjects = Object.values(store.subjects).filter((s) => s.status === 'cursando');

  const sessions = useMemo(() => Object.values(store.focusSessions).sort((a, b) => b.start.localeCompare(a.start)), [store.focusSessions]);
  const todayMin = sessions.filter((s) => s.date === today).reduce((s, x) => s + x.minutes, 0);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekMin = sessions.filter((s) => last7.includes(s.date)).reduce((s, x) => s + x.minutes, 0);
  const goal = store.prefs.dailyStudyGoalMinutes || 180;

  const r = focus.running;
  const total = r ? r.plannedMinutes * 60000 : minutes * 60000;
  const remaining = r ? focus.remainingMs : total;
  const progress = 1 - remaining / total;
  const size = 280;
  const stroke = 10;
  const rad = (size - stroke) / 2;
  const circ = 2 * Math.PI * rad;
  const runArea = r ? getArea(r.area) : getArea(area);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Cuando estudio, estoy en flow" title="Enfoque" subtitle="Un bloque, una cosa. El celular en otra habitación. Lo que estudies acá se suma solo a tu hábito y a Facultad." />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <div className="flex flex-col items-center py-4">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke="var(--bg-muted)" strokeWidth={stroke} />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={rad}
                  fill="none"
                  stroke={r?.phase === 'break' ? 'var(--mint)' : runArea.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ - progress * circ}
                  style={{ transition: 'stroke-dashoffset 500ms linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                  {r ? (r.phase === 'focus' ? `${runArea.emoji} ${runArea.label}` : '☕ Descanso') : 'Listo'}
                </span>
                <span className="font-num text-[64px] font-bold text-main leading-none mt-1">{formatClock(remaining)}</span>
                {r?.label && <span className="text-sm text-muted mt-2 max-w-[200px] truncate">{r.label}</span>}
                {r?.pausedAt && <span className="text-xs text-accent mt-1">En pausa</span>}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {!r && (
                <button type="button" className={`${btnPrimary} px-8 min-h-[52px] text-base`} onClick={() => focus.start({ area, minutes, subjectId: subjectId || undefined, label: label.trim() || undefined })}>
                  <Play className="w-5 h-5 fill-current" /> Empezar
                </button>
              )}
              {r && !r.pausedAt && (
                <button type="button" className={btnSecondary} onClick={focus.pause}>
                  <Pause className="w-4 h-4" /> Pausar
                </button>
              )}
              {r?.pausedAt && (
                <button type="button" className={btnPrimary} onClick={focus.resume}>
                  <Play className="w-4 h-4 fill-current" /> Seguir
                </button>
              )}
              {r && (
                <button type="button" className={btnGhost} onClick={() => focus.stop(r.phase === 'focus')}>
                  <Square className="w-4 h-4" /> {r.phase === 'focus' ? 'Terminar y guardar' : 'Saltar descanso'}
                </button>
              )}
            </div>
          </div>

          {!r && (
            <div className="space-y-4 border-t border-subtle pt-5 mt-2">
              <Field label="Duración" group>
                <div className="flex gap-2 flex-wrap">
                  {PRESETS.map((p) => (
                    <Chip key={p} active={minutes === p} onClick={() => setMinutes(p)}>
                      {p} min
                    </Chip>
                  ))}
                  <input className={`${inputCls} w-24 min-h-[34px] py-1`} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 1)} aria-label="Minutos personalizados" />
                </div>
              </Field>
              <Field label="¿En qué?" group>
                <div className="flex gap-1.5 flex-wrap">
                  {LIFE_AREAS.filter((a) => ['universidad', 'trabajo', 'fe', 'personal'].includes(a.id)).map((a) => (
                    <Chip key={a.id} active={area === a.id} color={a.color} onClick={() => setArea(a.id)}>
                      {a.emoji} {a.label}
                    </Chip>
                  ))}
                </div>
              </Field>
              {area === 'universidad' && subjects.length > 0 && (
                <Field label="Materia">
                  <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    <option value="">General</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Una sola cosa para este bloque">
                <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: ejercicios 1 a 10 de recursividad" />
              </Field>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="Hoy" value={formatDuration(todayMin)} sub={`meta estudio ${formatDuration(goal)}`} tone="accent" />
            <Stat label="7 días" value={formatDuration(weekMin)} sub={`${sessions.filter((s) => last7.includes(s.date)).length} bloques`} />
          </div>
          <Card title="Última semana" icon={<Timer />}>
            <MiniBars
              data={last7.map((d) => ({
                label: d.slice(8),
                value: sessions.filter((s) => s.date === d).reduce((s, x) => s + x.minutes, 0),
                color: d === today ? 'var(--accent)' : 'var(--sky)',
              }))}
              format={(v) => `${Math.round(v)}m`}
              limit={goal}
              height={120}
            />
          </Card>
          <Card title="Bloques recientes">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted">Tu primer bloque aparece acá.</p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 8).map((s) => {
                  const a = getArea(s.area);
                  return (
                    <div key={s.id} className="flex items-center gap-3 text-sm">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="flex-1 min-w-0 truncate text-main">
                        {s.label || (s.subjectId ? store.subjects[s.subjectId]?.name : a.label)}
                      </span>
                      <span className="font-mono text-xs text-dim">{s.date === today ? isoToLocalTime(s.start) : s.date.slice(5)}</span>
                      <span className="font-mono text-xs text-main w-14 text-right">{s.minutes} min</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
