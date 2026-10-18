import React, { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Copy, Hourglass, Moon, Pause, Play, Plus, Settings2, Smartphone, Sun, Trash2, Hand } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { Routine, ScreenConfig, ScreenLog, TimeCategory, TimeEntry } from '../types/life';
import { addDays, formatArgentineDate, getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { formatDuration, isoToLocalDate, isoToLocalTime, newId, nowIso, nowTimeAR, pct, timeToMinutes } from '../utils/lifeUtils';
import { btnGhost, btnPrimary, btnSecondary, Card, EmptyState, Field, inputCls, MiniBars, Modal, PageHeader, ProgressBar, Ring, Stat, Tabs, textareaCls } from '../components/ui';
import { useToast } from '../components/Toast';

type TimeTab = 'screen' | 'tracker' | 'routines';

export const TimeView: React.FC<{ life: LifeApi; initialTab?: TimeTab }> = ({ life, initialTab }) => {
  const [tab, setTab] = useState<TimeTab>(initialTab || 'screen');
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Rol G · Hombre enfocado y ordenado"
        title="Tiempo & Pantalla"
        subtitle='"Mirad, pues, con diligencia cómo andéis… aprovechando bien el tiempo" — Efesios 5:15-16. El celular no gobierna mi día.'
      />
      <Tabs
        value={tab}
        onChange={(v) => setTab(v as TimeTab)}
        tabs={[
          { id: 'screen', label: 'Pantalla', icon: <Smartphone className="w-3.5 h-3.5" /> },
          { id: 'tracker', label: 'Registro de tiempo', icon: <Hourglass className="w-3.5 h-3.5" /> },
          { id: 'routines', label: 'Rutinas', icon: <AlarmClock className="w-3.5 h-3.5" /> },
        ]}
      />
      {tab === 'screen' && <ScreenTab life={life} />}
      {tab === 'tracker' && <TrackerTab life={life} />}
      {tab === 'routines' && <RoutinesTab life={life} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PANTALLA
// ─────────────────────────────────────────────────────────────
export function screenStreak(logs: Record<string, ScreenLog>, limit: number, today: string): number {
  let streak = 0;
  let d = logs[today] ? today : addDays(today, -1);
  while (logs[d] && logs[d].totalMinutes <= limit) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

const ScreenTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { store } = life;
  const cfg = store.screenConfig;
  const today = getTodayDateString();
  const [date, setDate] = useState(today);
  const existing = store.screenLogs[date];
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [apps, setApps] = useState<Record<string, string>>({});
  const [pickups, setPickups] = useState('');
  const [firstSocial, setFirstSocial] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const l = store.screenLogs[date];
    setHours(l ? String(Math.floor(l.totalMinutes / 60)) : '');
    setMins(l ? String(l.totalMinutes % 60) : '');
    setApps(l ? Object.fromEntries(Object.entries(l.apps).map(([k, v]) => [k, String(v)])) : {});
    setPickups(l?.pickups ? String(l.pickups) : '');
    setFirstSocial(l?.firstSocialTime || '');
  }, [date, store.screenLogs]);

  const save = () => {
    const total = (Number(hours) || 0) * 60 + (Number(mins) || 0);
    const appNums: Record<string, number> = {};
    Object.entries(apps).forEach(([k, v]) => {
      const n = Number(v);
      if (n > 0) appNums[k] = n;
    });
    life.upsert('screenLogs', {
      id: date,
      date,
      totalMinutes: total,
      apps: appNums,
      pickups: Number(pickups) || undefined,
      firstSocialTime: firstSocial || undefined,
      updatedAt: nowIso(),
    });
    showToast(total <= cfg.dailyLimitMinutes ? '¡Bien! Dentro de tu límite 💪' : 'Registrado. Mañana es otra oportunidad.', { type: total <= cfg.dailyLimitMinutes ? 'success' : 'info' });
  };

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const logged = last14.map((d) => store.screenLogs[d]).filter(Boolean) as ScreenLog[];
  const avg = logged.length ? logged.reduce((s, l) => s + l.totalMinutes, 0) / logged.length : 0;
  const streak = screenStreak(store.screenLogs, cfg.dailyLimitMinutes, today);
  const todayTotal = store.screenLogs[today]?.totalMinutes || 0;
  const pauses = Object.values(store.pauseLogs);
  const pausesBack = pauses.filter((p) => p.decision === 'volvi').length;
  const morningOk = logged.filter((l) => !l.firstSocialTime || l.firstSocialTime >= cfg.noSocialBefore).length;

  const pauseUrl = typeof window !== 'undefined' ? `${window.location.origin}/?pausa=Instagram` : '/?pausa=Instagram';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-subtle flex items-center gap-3">
          <Ring value={pct(todayTotal, cfg.dailyLimitMinutes)} size={64} stroke={7} color={todayTotal > cfg.dailyLimitMinutes ? 'var(--danger)' : undefined}>
            <span className="text-[11px] font-mono font-bold text-main">{pct(todayTotal, cfg.dailyLimitMinutes)}%</span>
          </Ring>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Hoy</div>
            <div className="font-num font-bold text-2xl text-main leading-none">{todayTotal ? formatDuration(todayTotal) : '—'}</div>
            <div className="text-[11px] text-muted">límite {formatDuration(cfg.dailyLimitMinutes)}</div>
          </div>
        </div>
        <Stat label="Racha bajo el límite" value={`${streak} ${streak === 1 ? 'día' : 'días'}`} tone={streak >= 3 ? 'good' : 'default'} />
        <Stat label="Promedio 14 días" value={logged.length ? formatDuration(avg) : '—'} sub={`${logged.length} días registrados`} tone={avg && avg <= cfg.dailyLimitMinutes ? 'good' : 'bad'} />
        <Stat label="Mañanas sin redes" value={logged.length ? `${morningOk}/${logged.length}` : '—'} sub={`antes de las ${cfg.noSocialBefore}`} tone="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Registrar tiempo en pantalla"
          icon={<Smartphone className="w-4 h-4" />}
          action={
            <button type="button" className={btnGhost} onClick={() => setConfigOpen(true)}>
              <Settings2 className="w-4 h-4" /> Límites
            </button>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, -1))}>‹</button>
              <input type="date" className={inputCls} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
              <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, 1))} disabled={date >= today}>›</button>
            </div>
            <p className="text-[11px] text-muted">
              Copiá los datos de <b>Ajustes → Tiempo en pantalla</b> del iPhone. Tarda 30 segundos y te da conciencia real.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Horas totales">
                <input className={inputCls} inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2" />
              </Field>
              <Field label="Minutos">
                <input className={inputCls} inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="15" />
              </Field>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cfg.trackedApps.map((app) => (
                <Field key={app} label={`${app} (min)`}>
                  <input className={inputCls} inputMode="numeric" value={apps[app] || ''} onChange={(e) => setApps({ ...apps, [app]: e.target.value })} placeholder="0" />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Desbloqueos">
                <input className={inputCls} inputMode="numeric" value={pickups} onChange={(e) => setPickups(e.target.value)} placeholder="—" />
              </Field>
              <Field label="1ra vez en redes" hint={`Meta: después de las ${cfg.noSocialBefore}`}>
                <input type="time" className={inputCls} value={firstSocial} onChange={(e) => setFirstSocial(e.target.value)} />
              </Field>
            </div>
            <button type="button" className={`${btnPrimary} w-full`} onClick={save}>
              {existing ? 'Actualizar registro' : 'Guardar registro'}
            </button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Últimos 14 días" icon={<Hourglass className="w-4 h-4" />}>
            <MiniBars
              data={last14.map((d) => {
                const v = store.screenLogs[d]?.totalMinutes || 0;
                return { label: d.slice(8), value: v, color: v > cfg.dailyLimitMinutes ? 'var(--danger)' : 'var(--mint)', hint: `${formatArgentineDate(d)}: ${formatDuration(v)}` };
              })}
              limit={cfg.dailyLimitMinutes}
              format={(v) => `${Math.round((v / 60) * 10) / 10}h`}
              height={140}
            />
          </Card>
          {existing && Object.keys(existing.apps).length > 0 && (
            <Card title={`Apps · ${formatArgentineDate(date)}`}>
              <div className="space-y-2.5">
                {Object.entries(existing.apps)
                  .sort((a, b) => b[1] - a[1])
                  .map(([app, v]) => {
                    const lim = cfg.appLimits[app];
                    return (
                      <div key={app} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-main font-medium">{app}</span>
                          <span className={`font-mono ${lim && v > lim ? 'text-[var(--danger)] font-bold' : 'text-muted'}`}>
                            {formatDuration(v)} {lim ? `/ ${formatDuration(lim)}` : ''}
                          </span>
                        </div>
                        <ProgressBar value={lim ? (v / lim) * 100 : 50} danger={Boolean(lim && v > lim)} />
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}
          <Card title="Mis reglas digitales" icon={<Hand className="w-4 h-4" />}>
            <ul className="space-y-1.5">
              {cfg.rules.map((r) => (
                <li key={r.id} className="text-sm text-main flex gap-2">
                  <span className="text-accent">•</span> {r.text}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card title="Pausa consciente (iPhone)" icon={<Hand className="w-4 h-4" />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2 text-sm text-main">
            <p className="text-muted text-xs">
              Una web no puede bloquear otras apps, pero sí podés poner un <b>freno de 10 segundos</b>: antes de entrar a Instagram/TikTok se abre CONSTANTE con tu versículo, tu tiempo de hoy y la pregunta "¿para qué la abrís?". Si escribís tu intención, te deja abrirla.
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-muted">
              <li>Sacá Instagram de la pantalla de inicio (mantené apretado → <b>Quitar de inicio</b>, queda en la Biblioteca).</li>
              <li>App <b>Atajos</b> → <b>+</b> → acción <b>Abrir URL</b> → pegá el link de abajo (cambiá el nombre de la app al final: Instagram, TikTok, YouTube…).</li>
              <li>Nombralo "Instagram", tocá compartir → <b>Agregar a pantalla de inicio</b>.</li>
              <li>Ahora tu "Instagram" pasa primero por la pausa consciente. Sin bucles y sin bloquear nada.</li>
            </ol>
            <div className="flex gap-2 pt-1">
              <input readOnly className={`${inputCls} font-mono text-xs`} value={pauseUrl} />
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  navigator.clipboard?.writeText(pauseUrl).then(() => showToast('Link copiado', { type: 'success' }));
                }}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Pausas" value={pauses.length} />
              <Stat label="Volví a lo mío" value={pauses.length ? `${pct(pausesBack, pauses.length)}%` : '—'} tone="good" />
            </div>
            <div className="p-3 rounded-xl bg-surface-elevated text-xs text-muted leading-relaxed">
              <b className="text-main">Configurá también Tiempo en Pantalla:</b> Ajustes → Tiempo en pantalla → Límites de apps → Redes sociales →{' '}
              <b>{formatDuration(Object.values(cfg.appLimits).reduce((s, v) => s + v, 0) || 60)}</b> por día. En <b>Tiempo de inactividad</b> poné de 23:30 a {cfg.noSocialBefore}. Pedile a tu mamá o a alguien de confianza que ponga el código.
            </div>
          </div>
        </div>
      </Card>

      {configOpen && <ScreenConfigModal life={life} cfg={cfg} onClose={() => setConfigOpen(false)} />}
    </div>
  );
};

const ScreenConfigModal: React.FC<{ life: LifeApi; cfg: ScreenConfig; onClose: () => void }> = ({ life, cfg, onClose }) => {
  const [limit, setLimit] = useState(String(cfg.dailyLimitMinutes));
  const [noSocial, setNoSocial] = useState(cfg.noSocialBefore);
  const [appsText, setAppsText] = useState(cfg.trackedApps.join(', '));
  const [limits, setLimits] = useState<Record<string, string>>(Object.fromEntries(Object.entries(cfg.appLimits).map(([k, v]) => [k, String(v)])));
  const [rulesText, setRulesText] = useState(cfg.rules.map((r) => r.text).join('\n'));
  const apps = appsText.split(',').map((a) => a.trim()).filter(Boolean);

  const save = () => {
    const appLimits: Record<string, number> = {};
    apps.forEach((a) => {
      const n = Number(limits[a]);
      if (n > 0) appLimits[a] = n;
    });
    life.setSingleton('screenConfig', {
      dailyLimitMinutes: Number(limit) || 120,
      noSocialBefore: noSocial,
      trackedApps: apps,
      appLimits,
      rules: rulesText.split('\n').map((t) => t.trim()).filter(Boolean).map((text, i) => ({ id: `rule-${i}`, text })),
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker="Configuración"
      title="Límites de pantalla"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save}>Guardar</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Límite diario (min)">
          <input className={inputCls} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </Field>
        <Field label="Sin redes antes de">
          <input type="time" className={inputCls} value={noSocial} onChange={(e) => setNoSocial(e.target.value)} />
        </Field>
      </div>
      <Field label="Apps que registrás (separadas por coma)">
        <input className={inputCls} value={appsText} onChange={(e) => setAppsText(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {apps.map((a) => (
          <Field key={a} label={`Tope ${a} (min)`}>
            <input className={inputCls} inputMode="numeric" value={limits[a] || ''} onChange={(e) => setLimits({ ...limits, [a]: e.target.value })} placeholder="—" />
          </Field>
        ))}
      </div>
      <Field label="Reglas (una por línea)">
        <textarea rows={5} className={textareaCls} value={rulesText} onChange={(e) => setRulesText(e.target.value)} />
      </Field>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// REGISTRO DE TIEMPO
// ─────────────────────────────────────────────────────────────
function entryMinutes(e: TimeEntry, nowMs = Date.now()): number {
  const end = e.end ? new Date(e.end).getTime() : nowMs;
  return Math.max(0, (end - new Date(e.start).getTime()) / 60000);
}

const TrackerTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { store } = life;
  const cats = store.timeCategories;
  const today = getTodayDateString();
  const running = Object.values(store.timeEntries).find((e) => !e.end);
  const [, setTick] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [running]);

  const start = (cat: TimeCategory) => {
    const now = nowIso();
    if (running) life.upsert('timeEntries', { ...running, end: now });
    life.upsert('timeEntries', { id: newId('time'), categoryId: cat.id, start: now, note: note.trim() || undefined });
    setNote('');
  };
  const stop = () => running && life.upsert('timeEntries', { ...running, end: nowIso() });

  const entries = Object.values(store.timeEntries);
  const todayEntries = entries.filter((e) => isoToLocalDate(e.start) === today).sort((a, b) => a.start.localeCompare(b.start));
  const weekDays = new Set(getWeekDays(today));
  const weekByCat: Record<string, number> = {};
  entries.forEach((e) => {
    if (weekDays.has(isoToLocalDate(e.start))) weekByCat[e.categoryId] = (weekByCat[e.categoryId] || 0) + entryMinutes(e);
  });
  const cat = (id: string) => cats.find((c) => c.id === id);
  const elapsed = running ? entryMinutes(running) : 0;
  const elapsedStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}:${String(Math.floor((elapsed * 60) % 60)).padStart(2, '0')}`;
  const leisureWeek = cats.filter((c) => c.isLeisure).reduce((s, c) => s + (weekByCat[c.id] || 0), 0);
  const productiveWeek = cats.filter((c) => !c.isLeisure).reduce((s, c) => s + (weekByCat[c.id] || 0), 0);

  return (
    <div className="space-y-5">
      <Card title="¿En qué estás ahora?" icon={<Hourglass className="w-4 h-4" />}>
        {running ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl" style={{ backgroundColor: `${cat(running.categoryId)?.color}1A` }}>
            <div>
              <div className="text-sm font-semibold text-main">
                {cat(running.categoryId)?.emoji} {cat(running.categoryId)?.label} {running.note ? `· ${running.note}` : ''}
              </div>
              <div className="font-num font-bold text-5xl text-main leading-none mt-1">{elapsedStr}</div>
              <div className="text-[11px] text-muted font-mono">desde las {isoToLocalTime(running.start)}</div>
            </div>
            <button type="button" className={btnPrimary} onClick={stop}>
              <Pause className="w-4 h-4" /> Detener
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted mb-3">Tocá un área para empezar a medir. Saber a dónde se va tu tiempo es el primer paso para ordenarlo.</p>
        )}
        <input className={`${inputCls} mt-3`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota opcional (ej: TP de Algoritmos)" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => start(c)}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer min-h-[64px] ${running?.categoryId === c.id ? 'border-transparent text-white' : 'bg-surface-elevated border-app hover:border-accent'}`}
              style={running?.categoryId === c.id ? { backgroundColor: c.color } : undefined}
            >
              <div className="text-lg">{c.emoji}</div>
              <div className={`text-[11px] font-semibold leading-tight ${running?.categoryId === c.id ? '' : 'text-main'}`}>{c.label}</div>
            </button>
          ))}
        </div>
        <button type="button" className={`${btnGhost} mt-3`} onClick={() => setManualOpen(true)}>
          <Plus className="w-4 h-4" /> Cargar un bloque a mano
        </button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Esta semana vs. lo que querés" icon={<Play className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Stat label="Productivo" value={formatDuration(productiveWeek)} tone="good" />
            <Stat label="Ocio & celular" value={formatDuration(leisureWeek)} tone={leisureWeek > productiveWeek ? 'bad' : 'default'} />
          </div>
          <div className="space-y-2.5">
            {cats.map((c) => {
              const v = weekByCat[c.id] || 0;
              const target = (c.weeklyTargetHours || 0) * 60;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-main">
                      {c.emoji} {c.label}
                    </span>
                    <span className="font-mono text-muted">
                      {formatDuration(v)}
                      {target ? ` / ${formatDuration(target)}` : ''}
                    </span>
                  </div>
                  <ProgressBar value={target ? (v / target) * 100 : Math.min(100, v / 6)} color={c.color} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Hoy" icon={<Sun className="w-4 h-4" />}>
          {todayEntries.length === 0 ? (
            <EmptyState title="Sin registros hoy" text="Empezá un cronómetro arriba." />
          ) : (
            <div className="space-y-1.5">
              {todayEntries.map((e) => {
                const c = cat(e.categoryId);
                return (
                  <div key={e.id} className="flex items-center gap-3 p-2 rounded-xl bg-surface-elevated border-l-4" style={{ borderLeftColor: c?.color }}>
                    <span className="text-xs font-mono text-muted w-24 shrink-0">
                      {isoToLocalTime(e.start)}–{e.end ? isoToLocalTime(e.end) : 'ahora'}
                    </span>
                    <span className="flex-1 text-sm text-main truncate">
                      {c?.emoji} {c?.label} {e.note ? `· ${e.note}` : ''}
                    </span>
                    <span className="text-xs font-mono text-main">{formatDuration(entryMinutes(e))}</span>
                    <button type="button" className="text-dim hover:text-[var(--danger)]" onClick={() => life.remove('timeEntries', e.id)} aria-label="Borrar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {manualOpen && <ManualEntryModal life={life} cats={cats} onClose={() => setManualOpen(false)} />}
    </div>
  );
};

const ManualEntryModal: React.FC<{ life: LifeApi; cats: TimeCategory[]; onClose: () => void }> = ({ life, cats, onClose }) => {
  const [catId, setCatId] = useState(cats[0]?.id || '');
  const [date, setDate] = useState(getTodayDateString());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [note, setNote] = useState('');
  const save = () => {
    if (timeToMinutes(end) <= timeToMinutes(start)) return;
    // Hora local de Argentina (GMT-3) → ISO
    const toIso = (t: string) => new Date(`${date}T${t}:00-03:00`).toISOString();
    life.upsert('timeEntries', { id: newId('time'), categoryId: catId, start: toIso(start), end: toIso(end), note: note.trim() || undefined });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      kicker="Registro manual"
      title="Bloque de tiempo"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save}>Guardar</button>
        </>
      }
    >
      <Field label="Área">
        <select className={inputCls} value={catId} onChange={(e) => setCatId(e.target.value)}>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Fecha">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Desde">
          <input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Hasta">
          <input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <Field label="Nota">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// RUTINAS
// ─────────────────────────────────────────────────────────────
export function routineCompletion(routine: Routine, log?: { done: Record<string, boolean> }): number {
  if (!routine.items.length) return 0;
  return pct(routine.items.filter((i) => log?.done?.[i.id]).length, routine.items.length);
}

const RoutinesTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { store } = life;
  const today = getTodayDateString();
  const [date, setDate] = useState(today);
  const [editing, setEditing] = useState<Routine | null>(null);
  const log = store.routineLogs[date];

  const toggle = (itemId: string) => {
    const base = log || { id: date, date, done: {}, updatedAt: nowIso() };
    const done = { ...base.done, [itemId]: !base.done[itemId] };
    const patch: Partial<typeof base> = {};
    if (itemId === 'm-levantarme' && done[itemId] && !base.wakeTime && date === today) patch.wakeTime = nowTimeAR();
    life.upsert('routineLogs', { ...base, ...patch, done, updatedAt: nowIso() });
  };
  const setTimeField = (field: 'wakeTime' | 'sleepTime', value: string) => {
    const base = log || { id: date, date, done: {}, updatedAt: nowIso() };
    life.upsert('routineLogs', { ...base, [field]: value || undefined, updatedAt: nowIso() });
  };

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const morning = store.routines.find((r) => r.id === 'morning');
  const wakeTimes = last14.map((d) => store.routineLogs[d]?.wakeTime).filter(Boolean) as string[];
  const avgWake = wakeTimes.length ? wakeTimes.reduce((s, t) => s + timeToMinutes(t), 0) / wakeTimes.length : 0;
  const onTime = morning?.targetTime ? wakeTimes.filter((t) => timeToMinutes(t) <= timeToMinutes(morning.targetTime!) + 10).length : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, -1))}>‹</button>
        <span className="flex-1 text-center font-display text-lg font-bold text-main">
          {date === today ? 'Hoy' : formatArgentineDate(date, { includeDayName: true })}
        </span>
        <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, 1))} disabled={date >= today}>›</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="Hora promedio de despertar" value={avgWake ? `${String(Math.floor(avgWake / 60)).padStart(2, '0')}:${String(Math.round(avgWake % 60)).padStart(2, '0')}` : '—'} sub={`meta ${morning?.targetTime || '—'}`} />
        <Stat label="Mañanas a tiempo" value={wakeTimes.length ? `${onTime}/${wakeTimes.length}` : '—'} sub="últimos 14 días" tone="accent" />
        <Stat label="Rutina de mañana hoy" value={`${morning ? routineCompletion(morning, store.routineLogs[today]) : 0}%`} tone="good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {store.routines.map((r) => {
          const comp = routineCompletion(r, log);
          return (
            <Card
              key={r.id}
              title={r.name}
              icon={r.id === 'morning' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              action={
                <button type="button" className={btnGhost} onClick={() => setEditing(r)}>
                  <Settings2 className="w-4 h-4" />
                </button>
              }
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted">Objetivo: {r.targetTime || '—'}</span>
                <span className="font-num font-bold text-2xl text-accent">{comp}%</span>
              </div>
              <div className="space-y-1.5">
                {r.items.map((it) => {
                  const done = Boolean(log?.done?.[it.id]);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => toggle(it.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left cursor-pointer transition ${done ? 'bg-accent-subtle border-transparent' : 'bg-surface-elevated border-app hover:border-accent'}`}
                    >
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${done ? 'bg-accent border-accent text-accent-contrast' : 'border-app'}`}>{done ? '✓' : ''}</span>
                      {it.time && <span className="text-[11px] font-mono text-muted w-11 shrink-0">{it.time}</span>}
                      <span className={`text-sm ${done ? 'line-through text-muted' : 'text-main'}`}>{it.text}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <Field label={r.id === 'morning' ? 'Me levanté a las' : 'Me acosté a las'}>
                  <input
                    type="time"
                    className={inputCls}
                    value={(r.id === 'morning' ? log?.wakeTime : log?.sleepTime) || ''}
                    onChange={(e) => setTimeField(r.id === 'morning' ? 'wakeTime' : 'sleepTime', e.target.value)}
                  />
                </Field>
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Constancia de rutinas (14 días)" icon={<AlarmClock className="w-4 h-4" />}>
        <MiniBars
          data={last14.map((d) => {
            const l = store.routineLogs[d];
            const v = store.routines.length ? store.routines.reduce((s, r) => s + routineCompletion(r, l), 0) / store.routines.length : 0;
            return { label: d.slice(8), value: v, color: v >= 80 ? 'var(--mint)' : 'var(--accent)', hint: `${formatArgentineDate(d)}: ${Math.round(v)}%` };
          })}
          max={100}
          format={(v) => `${Math.round(v)}%`}
          height={110}
        />
        <p className="text-[11px] text-dim mt-2">"Me cuesta levantarme temprano" → la respuesta no es fuerza de voluntad, es una rutina repetible. Hábito mínimo viable: aunque sea, levantarte y leer un versículo.</p>
      </Card>

      {editing && <RoutineEditModal life={life} routine={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

const RoutineEditModal: React.FC<{ life: LifeApi; routine: Routine; onClose: () => void }> = ({ life, routine, onClose }) => {
  const [name, setName] = useState(routine.name);
  const [target, setTarget] = useState(routine.targetTime || '');
  const [items, setItems] = useState(routine.items);
  const save = () => {
    life.setSingleton(
      'routines',
      life.store.routines.map((r) => (r.id === routine.id ? { ...r, name, targetTime: target || undefined, items: items.filter((i) => i.text.trim()) } : r))
    );
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      kicker="Editar rutina"
      title={name}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save}>Guardar</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Hora objetivo">
          <input type="time" className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex gap-2">
            <input type="time" className={`${inputCls} w-28`} value={it.time || ''} onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, time: e.target.value || undefined } : x)))} />
            <input className={inputCls} value={it.text} onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))} />
            <button type="button" className="p-2 text-dim hover:text-[var(--danger)]" onClick={() => setItems(items.filter((x) => x.id !== it.id))} aria-label="Quitar paso">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" className={btnGhost} onClick={() => setItems([...items, { id: newId('ri'), text: '' }])}>
          <Plus className="w-4 h-4" /> Agregar paso
        </button>
      </div>
    </Modal>
  );
};
