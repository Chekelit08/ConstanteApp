import React, { useMemo, useState } from 'react';
import { Bell, BookOpen, CalendarPlus, Check, ChevronLeft, ChevronRight, Heart, HandHeart, Share2, Sparkles, Trash2 } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { BibleReading, PrayerRequest } from '../types/life';
import { buildVerseCalendar, getVerseForDate, THEME_INFO, Verse, VERSE_COPYRIGHT, VerseTheme, VERSES, versesByTheme } from '../services/verses';
import { addDays, formatArgentineDate, getTodayDateString } from '../utils/dateUtils';
import { downloadTextFile, newId, nowIso, relativeDayLabel } from '../utils/lifeUtils';
import { btnGhost, btnPrimary, btnSecondary, Card, Chip, EmptyState, Field, inputCls, PageHeader, Stat, Tabs, textareaCls } from '../components/ui';
import { useToast } from '../components/Toast';
import { showVerseNotification } from '../services/verseNotifier';

type FaithTab = 'verse' | 'reading' | 'prayer' | 'notify';

export const VerseCard: React.FC<{
  verse: Verse;
  dateLabel?: string;
  isFav?: boolean;
  onToggleFav?: () => void;
  compact?: boolean;
}> = ({ verse, dateLabel, isFav, onToggleFav, compact }) => {
  const theme = THEME_INFO[verse.theme];
  const { showToast } = useToast();
  const share = async () => {
    const text = `"${verse.text}" — ${verse.ref} (RVR1960)`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        showToast('Versículo copiado', { type: 'success' });
      }
    } catch {
      /* cancelado */
    }
  };
  return (
    <div className={`relative overflow-hidden rounded-[26px] border border-app bg-surface ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
      <div className="absolute -right-6 -top-10 text-[140px] opacity-[0.06] select-none pointer-events-none font-display">✝</div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-accent">
          {theme.emoji} Versículo del día · {theme.label}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </span>
        <div className="flex items-center gap-1">
          {onToggleFav && (
            <button type="button" onClick={onToggleFav} className="p-2 rounded-lg hover:bg-surface-elevated cursor-pointer" aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}>
              <Heart className={`w-4 h-4 ${isFav ? 'fill-accent text-accent' : 'text-muted'}`} />
            </button>
          )}
          <button type="button" onClick={share} className="p-2 rounded-lg hover:bg-surface-elevated cursor-pointer" aria-label="Compartir">
            <Share2 className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>
      <blockquote className={`font-serif text-main leading-relaxed ${compact ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'}`}>“{verse.text}”</blockquote>
      <p className="mt-3 font-display font-bold text-sm text-main">— {verse.ref}</p>
      {!compact && (
        <div className="mt-5 p-3 rounded-2xl bg-accent-subtle text-sm text-main">
          <b>Para hoy:</b> {theme.prompt}
        </div>
      )}
    </div>
  );
};

export const FaithView: React.FC<{ life: LifeApi; onCompleteBibleHabit?: () => void }> = ({ life, onCompleteBibleHabit }) => {
  const [tab, setTab] = useState<FaithTab>('verse');
  const today = getTodayDateString();
  const readings = useMemo(() => Object.values(life.store.readings).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [life.store.readings]);
  const readingDays = new Set(readings.map((r) => r.date));
  let streak = 0;
  for (let d = readingDays.has(today) ? today : addDays(today, -1); readingDays.has(d); d = addDays(d, -1)) streak++;
  const activePrayers = Object.values(life.store.prayers).filter((p) => p.status === 'activa').length;
  const answered = Object.values(life.store.prayers).filter((p) => p.status === 'respondida').length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Rol E · Hijo que busca, escucha y obedece"
        title="Fe"
        subtitle="Busco a Dios porque lo amo, no porque “tengo que hacerlo”. Una fe real, constante y profunda."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Racha de lectura" value={`${streak} d`} tone={streak >= 3 ? 'good' : 'accent'} />
        <Stat label="Lecturas registradas" value={readings.length} />
        <Stat label="Oraciones activas" value={activePrayers} />
        <Stat label="Respondidas" value={answered} tone="good" sub="¡Dios es fiel!" />
      </div>
      <Tabs
        value={tab}
        onChange={(v) => setTab(v as FaithTab)}
        tabs={[
          { id: 'verse', label: 'Versículo', icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: 'reading', label: 'Lectura & devocional', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: 'prayer', label: 'Oración', icon: <HandHeart className="w-3.5 h-3.5" /> },
          { id: 'notify', label: 'Recibirlo cada día', icon: <Bell className="w-3.5 h-3.5" /> },
        ]}
      />
      {tab === 'verse' && <VerseTab life={life} />}
      {tab === 'reading' && <ReadingTab life={life} readings={readings} onCompleteBibleHabit={onCompleteBibleHabit} />}
      {tab === 'prayer' && <PrayerTab life={life} />}
      {tab === 'notify' && <NotifyTab life={life} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
const VerseTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const today = getTodayDateString();
  const [date, setDate] = useState(today);
  const [theme, setTheme] = useState<VerseTheme | 'favs' | null>(null);
  const verse = getVerseForDate(date);
  const favs = life.store.verseFavs;
  const toggleFav = (v: Verse) => {
    const id = v.ref.replace(/[^a-zA-Z0-9]/g, '_');
    if (favs[id]) life.remove('verseFavs', id);
    else life.upsert('verseFavs', { id, ref: v.ref, savedAt: nowIso() });
  };
  const isFav = (v: Verse) => Boolean(favs[v.ref.replace(/[^a-zA-Z0-9]/g, '_')]);
  const list = theme === 'favs' ? VERSES.filter(isFav) : theme ? versesByTheme(theme) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, -1))}>
          <ChevronLeft className="w-4 h-4" /> Ayer
        </button>
        <span className="text-xs font-mono uppercase tracking-[0.1em] text-muted">{date === today ? 'Hoy' : formatArgentineDate(date, { includeDayName: true })}</span>
        <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, 1))} disabled={date >= today}>
          Siguiente <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <VerseCard verse={verse} isFav={isFav(verse)} onToggleFav={() => toggleFav(verse)} />

      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold text-main">Explorar por tema</h3>
        <div className="flex gap-1.5 flex-wrap">
          <Chip active={theme === 'favs'} onClick={() => setTheme(theme === 'favs' ? null : 'favs')}>
            ❤️ Favoritos ({Object.keys(favs).length})
          </Chip>
          {(Object.keys(THEME_INFO) as VerseTheme[]).map((t) => (
            <Chip key={t} active={theme === t} onClick={() => setTheme(theme === t ? null : t)}>
              {THEME_INFO[t].emoji} {THEME_INFO[t].label}
            </Chip>
          ))}
        </div>
        {theme && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.length === 0 && <p className="text-xs text-muted italic">Todavía no guardaste favoritos. Tocá el ❤️ en un versículo.</p>}
            {list.map((v) => (
              <div key={v.ref} className="p-4 rounded-2xl bg-surface border border-subtle">
                <p className="font-serif text-sm text-main leading-relaxed">“{v.text}”</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-main">{v.ref}</span>
                  <button type="button" onClick={() => toggleFav(v)} className="p-1.5 cursor-pointer" aria-label="Favorito">
                    <Heart className={`w-4 h-4 ${isFav(v) ? 'fill-accent text-accent' : 'text-dim'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-dim">{VERSE_COPYRIGHT}</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
const ReadingTab: React.FC<{ life: LifeApi; readings: BibleReading[]; onCompleteBibleHabit?: () => void }> = ({ life, readings, onCompleteBibleHabit }) => {
  const today = getTodayDateString();
  const [passage, setPassage] = useState('');
  const [insight, setInsight] = useState('');
  const [application, setApplication] = useState('');
  const { showToast } = useToast();
  const verse = getVerseForDate(today);

  const save = () => {
    if (!passage.trim()) return;
    life.upsert('readings', { id: newId('read'), date: today, passage: passage.trim(), insight: insight.trim() || undefined, application: application.trim() || undefined, createdAt: nowIso() });
    onCompleteBibleHabit?.();
    setPassage('');
    setInsight('');
    setApplication('');
    showToast('Lectura registrada. "Lámpara es a mis pies tu palabra" 🙏', { type: 'success' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Devocional de hoy" icon={<BookOpen className="w-4 h-4" />}>
        <div className="space-y-3">
          <Field label="¿Qué leíste?" group>
            <div className="flex gap-2">
              <input className={inputCls} value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="Ej: Juan 15" />
              <button type="button" className={btnSecondary} onClick={() => setPassage(verse.ref)} title="Usar el versículo del día">
                Del día
              </button>
            </div>
          </Field>
          <Field label="¿Qué me habló Dios?">
            <textarea rows={3} className={textareaCls} value={insight} onChange={(e) => setInsight(e.target.value)} />
          </Field>
          <Field label="¿Cómo lo aplico hoy? (obediencia simple)">
            <textarea rows={2} className={textareaCls} value={application} onChange={(e) => setApplication(e.target.value)} />
          </Field>
          <button type="button" className={`${btnPrimary} w-full`} onClick={save} disabled={!passage.trim()}>
            <Check className="w-4 h-4" /> Registrar lectura {onCompleteBibleHabit ? '(marca el hábito)' : ''}
          </button>
        </div>
      </Card>
      <Card title="Mi diario espiritual" icon={<Sparkles className="w-4 h-4" />}>
        {readings.length === 0 ? (
          <EmptyState title="Empezá hoy" text="Rutina corta y diaria: un capítulo, una idea, una aplicación." />
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {readings.map((r) => (
              <div key={r.id} className="p-3 rounded-2xl bg-surface-elevated">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-main">📖 {r.passage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted">{relativeDayLabel(r.date)}</span>
                    <button type="button" className="text-dim hover:text-[var(--danger)]" onClick={() => life.remove('readings', r.id)} aria-label="Borrar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {r.insight && <p className="text-xs text-main mt-1.5 whitespace-pre-line">{r.insight}</p>}
                {r.application && <p className="text-xs text-accent mt-1.5">→ {r.application}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
const PrayerTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const [text, setText] = useState('');
  const [personId, setPersonId] = useState('');
  const people = Object.values(life.store.people);
  const prayers = Object.values(life.store.prayers).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = prayers.filter((p) => p.status === 'activa');
  const answered = prayers.filter((p) => p.status === 'respondida');
  const prayFor = people.filter((p) => p.prayFor || p.group === 'elegidos' || p.group === 'familia');
  const today = getTodayDateString();

  const add = () => {
    if (!text.trim()) return;
    const now = nowIso();
    life.upsert('prayers', { id: newId('pray'), text: text.trim(), personId: personId || undefined, status: 'activa', createdAt: now, updatedAt: now });
    setText('');
    setPersonId('');
  };
  const answer = (p: PrayerRequest) => {
    const note = window.prompt('¿Cómo respondió Dios? (opcional)') || undefined;
    life.upsert('prayers', { ...p, status: 'respondida', answeredAt: today, answerNote: note, updatedAt: nowIso() });
  };
  const prayedToday = (personId: string) => Object.values(life.store.interactions).some((i) => i.personId === personId && i.kind === 'oracion' && i.date === today);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Pedidos de oración" icon={<HandHeart className="w-4 h-4" />}>
        <div className="space-y-3">
          <textarea rows={2} className={textareaCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej: Dirección para la visión 2027" />
          <div className="flex gap-2">
            <select className={inputCls} value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">Por mí / general</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>Por {p.name}</option>
              ))}
            </select>
            <button type="button" className={btnPrimary} onClick={add}>Agregar</button>
          </div>
          <div className="space-y-2 pt-1">
            {active.length === 0 && <p className="text-xs text-muted italic">“Clama a mí, y yo te responderé” — Jeremías 33:3</p>}
            {active.map((p) => (
              <div key={p.id} className="flex items-start gap-2 p-3 rounded-xl bg-surface-elevated">
                <span className="flex-1 text-sm text-main">
                  {p.personId && <b>{life.store.people[p.personId]?.name}: </b>}
                  {p.text}
                  <span className="block text-[10px] font-mono text-muted mt-0.5">desde {relativeDayLabel(p.createdAt.slice(0, 10))}</span>
                </span>
                <button type="button" className={btnGhost} onClick={() => answer(p)}>✓ Respondida</button>
                <button type="button" className="p-2 text-dim hover:text-[var(--danger)]" onClick={() => life.remove('prayers', p.id)} aria-label="Borrar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <div className="space-y-4">
        <Card title="Orar hoy por…" icon={<Heart className="w-4 h-4" />}>
          {prayFor.length === 0 ? (
            <p className="text-xs text-muted">Agregá personas en la sección Personas.</p>
          ) : (
            <div className="space-y-1.5">
              {prayFor.map((p) => {
                const done = prayedToday(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => !done && life.upsert('interactions', { id: newId('int'), personId: p.id, date: today, kind: 'oracion', createdAt: nowIso() })}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left cursor-pointer ${done ? 'bg-accent-subtle border-transparent' : 'bg-surface-elevated border-app hover:border-accent'}`}
                  >
                    <span className="text-lg">{p.emoji || '🙂'}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-main">{p.name}</span>
                      {p.prayFor && <span className="block text-[11px] text-muted truncate">{p.prayFor}</span>}
                    </span>
                    <span className="text-xs">{done ? '🙏 Oré' : 'Marcar'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
        {answered.length > 0 && (
          <Card title="Oraciones respondidas" icon={<Sparkles className="w-4 h-4" />}>
            <div className="space-y-2">
              {answered.map((p) => (
                <div key={p.id} className="text-sm">
                  <span className="text-main line-through decoration-emerald-500">{p.text}</span>
                  {p.answerNote && <span className="block text-xs text-[var(--mint)]">→ {p.answerNote}</span>}
                  <span className="block text-[10px] font-mono text-muted">{p.answeredAt ? relativeDayLabel(p.answeredAt) : ''}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
const NotifyTab: React.FC<{ life: LifeApi }> = ({ life }) => {
  const prefs = life.store.prefs;
  const [time, setTime] = useState(prefs.verseTime);
  const { showToast } = useToast();
  const supported = typeof window !== 'undefined' && 'Notification' in window;

  const enable = async () => {
    if (!supported) {
      showToast('Este navegador no soporta notificaciones. Usá el calendario.', { type: 'warning' });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      showToast('Permiso denegado. Podés usar el calendario de versículos.', { type: 'warning' });
      return;
    }
    life.patchSingleton('prefs', { verseNotify: true, verseTime: time });
    await showVerseNotification(getVerseForDate(getTodayDateString()));
    showToast('¡Listo! Te mandé el de hoy como prueba.', { type: 'success' });
  };

  const downloadCalendar = () => {
    downloadTextFile('versiculo-diario-constante.ics', buildVerseCalendar(getTodayDateString(), 365, time), 'text/calendar');
    life.patchSingleton('prefs', { verseTime: time });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Opción 1 (recomendada): Calendario" icon={<CalendarPlus className="w-4 h-4" />}>
        <div className="space-y-3 text-sm text-main">
          <p className="text-xs text-muted">
            Descargá un calendario con <b>365 versículos</b> (uno por día, con la pregunta “Para hoy”). Importalo en el Calendario del iPhone o en Google Calendar y te llega como notificación todos los días a la hora que elijas,{' '}
            <b>aunque no abras la app</b>.
          </p>
          <Field label="Hora del versículo">
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <button type="button" className={`${btnPrimary} w-full`} onClick={downloadCalendar}>
            <CalendarPlus className="w-4 h-4" /> Descargar calendario de versículos (.ics)
          </button>
          <ol className="list-decimal pl-5 text-xs text-muted space-y-1">
            <li>iPhone: abrí el archivo descargado → “Agregar todo” → elegí un calendario nuevo “Versículos”.</li>
            <li>Google Calendar (compu): Configuración → Importar y exportar → Importar.</li>
            <li>Cada evento tiene una alarma a la hora elegida.</li>
          </ol>
        </div>
      </Card>
      <Card title="Opción 2: Notificación de la app" icon={<Bell className="w-4 h-4" />}>
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Con la app instalada en la pantalla de inicio (iPhone: Compartir → “Agregar a inicio”), CONSTANTE te avisa el versículo del día la primera vez que la abrís después de la hora elegida, y a esa hora si está abierta.
          </p>
          <Field label="Hora">
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={enable}>
              <Bell className="w-4 h-4" /> {prefs.verseNotify ? 'Actualizar y probar' : 'Activar notificaciones'}
            </button>
            {prefs.verseNotify && (
              <button type="button" className={btnSecondary} onClick={() => life.patchSingleton('prefs', { verseNotify: false })}>
                Desactivar
              </button>
            )}
          </div>
          <p className="text-[11px] text-dim">Estado: {prefs.verseNotify ? `activado a las ${prefs.verseTime}` : 'desactivado'}.</p>
        </div>
      </Card>
    </div>
  );
};
