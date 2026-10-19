import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CalendarPlus, ChevronDown, RefreshCw, Send, Share, SquarePlus, Trash2 } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { DEFAULT_REMINDERS, ReminderPrefs } from '../types/life';
import { useCalendarFeeds } from '../services/calendarFeeds';
import { disablePush, enablePush, getPushState, isIos, PushState, sendTestPush, syncPushReminders } from '../services/push';
import { buildReminders } from '../services/reminders';
import { btnGhost, btnPrimary, btnSecondary, Card, Field, inputCls } from './ui';
import { useToast } from './Toast';

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative w-11 h-6 rounded-full shrink-0 transition cursor-pointer ${on ? 'bg-accent' : 'bg-surface-elevated border border-app'}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

const Row: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-subtle last:border-0">
    <div className="min-w-0">
      <div className="text-sm font-semibold text-main">{title}</div>
      {hint && <div className="text-xs text-dim">{hint}</div>}
    </div>
    <div className="flex items-center gap-2 shrink-0">{children}</div>
  </div>
);

const timeCls = 'bg-surface-elevated border border-app rounded-full px-2.5 py-1 text-xs font-mono text-main';
const LEADS = [0, 5, 10, 15, 30, 60, 120];

const LeadSelect: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({ value, onChange, label }) => (
  <select aria-label={label} className={timeCls} value={value} onChange={(e) => onChange(Number(e.target.value))}>
    {LEADS.map((m) => (
      <option key={m} value={m}>
        {m === 0 ? 'Apagado' : m >= 60 ? `${m / 60} h antes` : `${m} min antes`}
      </option>
    ))}
  </select>
);

// ─────────────────────────────────────────────────────────────
// RECORDATORIOS
// ─────────────────────────────────────────────────────────────
export const RemindersCard: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { showToast } = useToast();
  const { events } = useCalendarFeeds();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const prefs = life.store.prefs;
  const r = { ...DEFAULT_REMINDERS, ...(prefs.reminders || {}) };
  const setR = (patch: Partial<ReminderPrefs>) => life.patchSingleton('prefs', { reminders: { ...r, ...patch } });
  const scheduled = state === 'on' ? buildReminders(life.store, events) : [];

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      showToast(ok, { type: 'success' });
    } catch (e) {
      showToast((e as Error).message || 'Algo falló', { type: 'error' });
    } finally {
      setBusy(false);
      setState(await getPushState());
      window.dispatchEvent(new Event('norte-push-changed'));
    }
  };

  const activate = () =>
    run(async () => {
      await enablePush();
      await syncPushReminders(buildReminders(life.store, events), true);
    }, '¡Recordatorios activados!');

  return (
    <Card title="Recordatorios" icon={<Bell />}>
      {state === null && <p className="text-sm text-muted">Revisando…</p>}

      {state === 'needs-install' && (
        <div className="space-y-3">
          <p className="text-sm text-main leading-relaxed">
            En el iPhone los avisos llegan solo con NORTE <b>instalada en la pantalla de inicio</b> (iOS 16.4 o más nuevo):
          </p>
          <ol className="text-sm text-muted space-y-2">
            <li className="flex gap-2"><Share className="w-4 h-4 shrink-0 mt-0.5 text-[var(--sky)]" /> 1. En Safari tocá el botón <b className="text-main">Compartir</b>.</li>
            <li className="flex gap-2"><SquarePlus className="w-4 h-4 shrink-0 mt-0.5 text-[var(--sky)]" /> 2. Elegí <b className="text-main">Agregar a pantalla de inicio</b>.</li>
            <li className="flex gap-2"><Bell className="w-4 h-4 shrink-0 mt-0.5 text-[var(--sky)]" /> 3. Abrí NORTE desde el ícono nuevo y volvé acá a activar.</li>
          </ol>
          <p className="text-xs text-dim">Abrila con la misma clave; tus datos de este navegador no pasan solos al ícono (usá la copia de seguridad si cargaste cosas acá).</p>
        </div>
      )}

      {state === 'unsupported' && <p className="text-sm text-muted">Este navegador no admite notificaciones. Probá con Safari (iPhone) o Chrome.</p>}

      {state === 'denied' && (
        <p className="text-sm text-muted leading-relaxed">
          Las notificaciones están bloqueadas. {isIos() ? 'Andá a Ajustes del iPhone → Notificaciones → NORTE y activalas.' : 'Habilitalas desde la configuración del sitio en el navegador.'}
        </p>
      )}

      {state === 'off' && (
        <div className="space-y-3">
          <p className="text-sm text-muted leading-relaxed">Te aviso aunque tengas NORTE cerrada: clases, parciales, eventos de Google, tareas, cumpleaños, el versículo y el cierre del día.</p>
          <button type="button" className={btnPrimary} disabled={busy} onClick={activate}>
            <Bell className="w-4 h-4" /> Activar recordatorios
          </button>
        </div>
      )}

      {state === 'on' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-main">✅ Activos en este dispositivo · <b>{scheduled.length}</b> avisos en los próximos días</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => run(sendTestPush, 'Mandé una prueba')}>
              <Send className="w-4 h-4" /> Probar
            </button>
            <button type="button" className={btnGhost} disabled={busy} onClick={() => run(disablePush, 'Recordatorios desactivados')}>
              <BellOff className="w-4 h-4" /> Desactivar
            </button>
          </div>

          <div>
            <Row title="📖 Versículo del día">
              {prefs.verseNotify && <input type="time" aria-label="Hora del versículo" className={timeCls} value={prefs.verseTime} onChange={(e) => life.patchSingleton('prefs', { verseTime: e.target.value })} />}
              <Switch label="Versículo del día" on={prefs.verseNotify} onChange={(v) => life.patchSingleton('prefs', { verseNotify: v })} />
            </Row>
            <Row title="🎓 Clases" hint="Antes de cada clase de la facu">
              <LeadSelect label="Aviso de clases" value={r.classesLead} onChange={(v) => setR({ classesLead: v })} />
            </Row>
            <Row title="📅 Mis eventos">
              <LeadSelect label="Aviso de eventos" value={r.eventsLead} onChange={(v) => setR({ eventsLead: v })} />
            </Row>
            <Row title="🗓️ Google Calendar" hint="Eventos de tus calendarios conectados">
              <LeadSelect label="Aviso de Google Calendar" value={r.externalLead} onChange={(v) => setR({ externalLead: v })} />
            </Row>
            <Row title="📝 Parciales y finales" hint="La noche anterior y 2 h antes">
              <Switch label="Parciales" on={r.evaluations} onChange={(v) => setR({ evaluations: v })} />
            </Row>
            <Row title="☑️ Tareas que vencen" hint="A la mañana">
              <Switch label="Tareas" on={r.tasks} onChange={(v) => setR({ tasks: v })} />
            </Row>
            <Row title="🎂 Cumpleaños" hint="A la mañana">
              <Switch label="Cumpleaños" on={r.birthdays} onChange={(v) => setR({ birthdays: v })} />
            </Row>
            <Row title="☀️ Hora de los avisos de la mañana">
              <input type="time" aria-label="Hora de la mañana" className={timeCls} value={r.morningTime} onChange={(e) => setR({ morningTime: e.target.value })} />
            </Row>
            <Row title="🔥 Hábitos pendientes" hint="Si no completaste todo">
              {r.habits && <input type="time" aria-label="Hora de hábitos" className={timeCls} value={r.habitsTime} onChange={(e) => setR({ habitsTime: e.target.value })} />}
              <Switch label="Hábitos" on={r.habits} onChange={(v) => setR({ habits: v })} />
            </Row>
            <Row title="🌙 Cerrar el día">
              {r.closeDay && <input type="time" aria-label="Hora de cerrar el día" className={timeCls} value={r.closeDayTime} onChange={(e) => setR({ closeDayTime: e.target.value })} />}
              <Switch label="Cerrar el día" on={r.closeDay} onChange={(v) => setR({ closeDay: v })} />
            </Row>
          </div>
          {scheduled.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer select-none">Ver los próximos avisos</summary>
              <ul className="mt-2 space-y-1 max-h-56 overflow-y-auto">
                {scheduled.slice(0, 40).map((x) => (
                  <li key={x.tag} className="flex gap-2">
                    <span className="font-mono text-dim shrink-0">{x.fireAt.slice(5, 10).split('-').reverse().join('/')} {x.fireAt.slice(11, 16)}</span>
                    <span className="text-main truncate">{x.title}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────
// GOOGLE CALENDAR
// ─────────────────────────────────────────────────────────────
function ago(iso?: string): string {
  if (!iso) return 'sin sincronizar';
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.round(min / 60)} h`;
}

export const CalendarsCard: React.FC = () => {
  const feeds = useCalendarFeeds();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  const add = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      await feeds.addFeed(name || 'Google Calendar', url);
      setName('');
      setUrl('');
      showToast('Calendario conectado', { type: 'success' });
    } catch (e) {
      showToast((e as Error).message || 'No se pudo conectar', { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Google Calendar"
      icon={<CalendarPlus />}
      action={
        <button type="button" className={btnGhost} onClick={() => feeds.refresh()} disabled={feeds.syncing} aria-label="Actualizar calendarios">
          <RefreshCw className={`w-4 h-4 ${feeds.syncing ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted leading-relaxed">Tus eventos de Google aparecen solos en Hoy y en Agenda, y te aviso antes de cada uno. Se actualiza cada 30 min.</p>

        <ul className="space-y-1">
          {feeds.feeds.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2 border-b border-subtle last:border-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-main truncate">{f.name}</div>
                <div className={`text-xs ${f.error ? 'text-[var(--danger)]' : 'text-dim'}`}>{f.error ? `⚠️ ${f.error}` : f.enabled ? `Actualizado ${ago(f.lastSync)}` : 'Oculto'}</div>
              </div>
              <Switch label={`Mostrar ${f.name}`} on={f.enabled} onChange={(v) => feeds.updateFeed(f.id, { enabled: v })} />
              {f.id !== 'feriados' && (
                <button
                  type="button"
                  className={btnGhost}
                  aria-label={`Quitar ${f.name}`}
                  onClick={() => window.confirm(`¿Desconectar "${f.name}"?`) && feeds.removeFeed(f.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="space-y-3 pt-1">
          <Field label="Nombre">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Personal, Facu, SMV" />
          </Field>
          <Field label="Dirección secreta en formato iCal">
            <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" inputMode="url" autoCapitalize="off" autoCorrect="off" />
          </Field>
          <button type="button" className={btnPrimary} onClick={add} disabled={busy || !url.trim()}>
            {busy ? 'Conectando…' : 'Conectar calendario'}
          </button>
        </div>

        <button type="button" className="flex items-center gap-1.5 text-sm font-semibold text-accent cursor-pointer" onClick={() => setHelp(!help)}>
          <ChevronDown className={`w-4 h-4 transition ${help ? 'rotate-180' : ''}`} /> ¿Dónde consigo el link?
        </button>
        {help && (
          <ol className="text-sm text-muted space-y-1.5 list-decimal pl-5 leading-relaxed">
            <li>
              Desde la <b className="text-main">compu</b> (en el celu no aparece), entrá a <span className="font-mono text-xs">calendar.google.com</span>.
            </li>
            <li>Arriba a la derecha: ⚙️ → <b className="text-main">Configuración</b>.</li>
            <li>A la izquierda, en "Configuración de mis calendarios", tocá tu calendario.</li>
            <li>
              Bajá hasta <b className="text-main">Integrar el calendario</b> y copiá la <b className="text-main">Dirección secreta en formato iCal</b>.
            </li>
            <li>Pegala acá. Si tenés varios calendarios (facu, trabajo), repetí con cada uno.</li>
          </ol>
        )}
        <p className="text-xs text-dim leading-relaxed">
          🔒 El link es como una contraseña de solo lectura: queda guardado únicamente en este dispositivo. Para llevar lo de NORTE a Google, usá <b>Agenda → Exportar .ics</b>.
        </p>
      </div>
    </Card>
  );
};
