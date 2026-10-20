import React, { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  CalendarDays,
  Compass,
  Cross,
  GraduationCap,
  Grid2x2,
  Hourglass,
  Library,
  Lightbulb,
  NotebookPen,
  Plus,
  Settings,
  Sparkles,
  Timer,
  Users,
  Wallet,
  Repeat,
} from 'lucide-react';
import { useLifeData } from './hooks/useLifeData';
import { useAuth } from './hooks/useAuth';
import { useHabitActions } from './hooks/useHabitActions';
import { useVerseNotifier } from './services/verseNotifier';
import { CalendarFeedsProvider } from './services/calendarFeeds';
import { useReminderSync } from './hooks/useReminderSync';
import { Section, SECTIONS } from './sections';
import { ToastProvider } from './components/Toast';
import { FocusProvider, formatClock, useFocus } from './components/FocusContext';
import { QuickAdd } from './components/QuickAdd';
import { MindfulPause } from './components/MindfulPause';
import { UnlockScreen } from './components/UnlockScreen';
import { markVaultDone, vaultPending } from './services/vault';
import { Modal } from './components/ui';
import { TodayView } from './views/TodayView';
import { AgendaView } from './views/AgendaView';
import { HabitsView } from './views/HabitsView';
import { FocusView } from './views/FocusView';
import { JournalView } from './views/JournalView';
import { UniversityView } from './views/UniversityView';
import { WorkView } from './views/WorkView';
import { FinanceView } from './views/FinanceView';
import { PeopleView } from './views/PeopleView';
import { FaithView } from './views/FaithView';
import { BooksView } from './views/BooksView';
import { CoursesView } from './views/CoursesView';
import { TimeView } from './views/TimeView';
import { PurposeView } from './views/PurposeView';
import { SettingsView } from './views/SettingsView';
import { getTodayDateString } from './utils/dateUtils';

const ICONS: Record<Section, React.ReactNode> = {
  today: <Sparkles />,
  agenda: <CalendarDays />,
  habits: <Repeat />,
  focus: <Timer />,
  journal: <NotebookPen />,
  university: <GraduationCap />,
  work: <Briefcase />,
  finance: <Wallet />,
  people: <Users />,
  faith: <Cross />,
  books: <Library />,
  courses: <Lightbulb />,
  time: <Hourglass />,
  purpose: <Compass />,
  settings: <Settings />,
};

function useTheme(theme: 'dark' | 'light' | 'system') {
  useEffect(() => {
    const apply = () => {
      const t = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#F4F2FA' : '#0D0F1E');
    };
    apply();
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

const Logo: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFC861" />
        <stop offset="1" stopColor="#FF7A59" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border-app)" strokeWidth="4" />
    <path d="M32 7 L40 32 L32 29 L24 32 Z" fill="url(#lg)" />
    <path d="M32 57 L24 32 L32 35 L40 32 Z" fill="var(--sky)" opacity=".55" />
  </svg>
);

function sectionFromUrl(search: string): Section | null {
  const s = new URLSearchParams(search).get('s');
  return SECTIONS.some((x) => x.id === s) ? (s as Section) : null;
}

function Shell() {
  const auth = useAuth();
  const life = useLifeData(auth.user);
  useVerseNotifier(life);
  useTheme(life.store.prefs.theme);
  return (
    <CalendarFeedsProvider>
      <FocusProvider life={life}>
        <Main life={life} auth={auth} />
      </FocusProvider>
    </CalendarFeedsProvider>
  );
}

function Main({ life, auth }: { life: ReturnType<typeof useLifeData>; auth: ReturnType<typeof useAuth> }) {
  const [section, setSection] = useState<Section>(() => sectionFromUrl(window.location.search) || 'today');
  const [quickOpen, setQuickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pauseApp, setPauseApp] = useState<string | null>(() => new URLSearchParams(window.location.search).get('pausa'));
  const focus = useFocus();
  useReminderSync(life);

  // tocar una notificación con la app abierta → ir a esa sección
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== 'norte-open') return;
      const s = sectionFromUrl(new URL(e.data.url, window.location.origin).search);
      if (s) setSection(s);
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, []);
  const habitActions = useHabitActions(life);
  const [locked, setLocked] = useState(() => {
    if (!vaultPending()) return false;
    if (life.store.prefs.name) {
      markVaultDone(); // este dispositivo ya tiene tus datos
      return false;
    }
    return true;
  });

  const go = useCallback((s: Section) => {
    setSection(s);
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  // Atajos de teclado (escritorio)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable || document.querySelector('[role="dialog"]')) return;
      if (e.key === 'n' || e.key === 'N' || e.key === '+') {
        setQuickOpen(true);
        return;
      }
      const s = SECTIONS.find((x) => x.key === e.key.toUpperCase());
      if (s) setSection(s.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closePause = () => {
    setPauseApp(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const groups: SectionMeta['group'][] = ['Día', 'Áreas', 'Rumbo'];

  return (
    <div className="min-h-screen lg:flex">
      {/* ── Rail lateral (escritorio) ─────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 px-4 py-6 border-r border-subtle" aria-label="Navegación">
        <div className="flex items-center gap-2.5 px-2">
          <Logo />
          <span className="font-display text-2xl font-extrabold tracking-[0.06em] text-main">NORTE</span>
        </div>
        <nav className="mt-7 flex-1 overflow-y-auto no-scrollbar space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">{g}</div>
              {SECTIONS.filter((s) => s.group === g).map((s) => {
                const active = section === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => go(s.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-[14px] font-semibold transition cursor-pointer [&>svg]:w-[18px] [&>svg]:h-[18px] ${
                      active ? 'bg-surface-elevated text-main' : 'text-muted hover:text-main'
                    }`}
                  >
                    <span className={active ? 'text-accent' : ''}>{ICONS[s.id]}</span>
                    <span className="flex-1 text-left">{s.label}</span>
                    {s.id === 'focus' && focus.running && <span className="font-mono text-[11px] text-accent">{formatClock(focus.remainingMs)}</span>}
                    {!(s.id === 'focus' && focus.running) && <kbd className="font-mono text-[10px] text-dim">{s.key}</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <button type="button" onClick={() => setQuickOpen(true)} className="mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-accent text-accent-contrast font-semibold cursor-pointer hover:brightness-110 shadow-[0_10px_30px_-12px_var(--accent)]">
          <Plus className="w-5 h-5" /> Anotar algo <kbd className="font-mono text-[10px] opacity-70">N</kbd>
        </button>
      </aside>

      {/* ── Contenido ──────────────────────────────────────── */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-dock lg:pb-14 safe-top">
        <div className="max-w-[1080px] mx-auto">
          {/* Barra superior móvil (no en Hoy: ahí manda el cielo) */}
          {section !== 'today' && (
            <div className="lg:hidden flex items-center justify-between mb-4">
              <button type="button" onClick={() => go('today')} className="flex items-center gap-2 cursor-pointer" aria-label="Ir a Hoy">
                <Logo size={26} />
                <span className="font-display text-lg font-extrabold tracking-[0.06em] text-main">NORTE</span>
              </button>
              {focus.running && (
                <button type="button" onClick={() => go('focus')} className="px-3 py-1.5 rounded-full bg-accent-subtle text-accent font-mono text-xs cursor-pointer">
                  ⏱ {formatClock(focus.remainingMs)}
                </button>
              )}
            </div>
          )}

          <div key={section} className="animate-rise">
            {section === 'today' && <TodayView life={life} onNavigate={go} onOpenJournal={() => go('journal')} />}
            {section === 'agenda' && <AgendaView life={life} onOpenUniversity={() => go('university')} />}
            {section === 'habits' && <HabitsView life={life} />}
            {section === 'focus' && <FocusView life={life} />}
            {section === 'journal' && <JournalView life={life} initialDate={getTodayDateString()} />}
            {section === 'university' && <UniversityView life={life} onStartFocus={() => go('focus')} />}
            {section === 'work' && <WorkView life={life} onStartFocus={() => go('focus')} />}
            {section === 'finance' && <FinanceView life={life} />}
            {section === 'people' && <PeopleView life={life} />}
            {section === 'faith' && <FaithView life={life} onCompleteBibleHabit={() => habitActions.completeFirstCheckOfArea('fe', getTodayDateString())} />}
            {section === 'books' && <BooksView life={life} />}
            {section === 'courses' && <CoursesView life={life} />}
            {section === 'time' && <TimeView life={life} />}
            {section === 'purpose' && <PurposeView life={life} />}
            {section === 'settings' && <SettingsView life={life} auth={auth} />}
          </div>
        </div>
      </main>

      {/* ── Dock móvil ─────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 safe-bottom pointer-events-none" aria-label="Navegación principal">
        <div className="pointer-events-auto mx-auto max-w-md mb-2 flex items-center justify-between gap-1 px-2 py-2 rounded-full bg-[color-mix(in_srgb,var(--bg-elevated)_88%,transparent)] backdrop-blur-xl border border-app shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)]">
          {([
            ['today', 'Hoy'],
            ['agenda', 'Agenda'],
          ] as [Section, string][]).map(([id, label]) => (
            <DockButton key={id} active={section === id} label={label} icon={ICONS[id]} onClick={() => go(id)} />
          ))}
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            aria-label="Anotar algo"
            className="w-14 h-14 -my-3 rounded-full bg-accent text-accent-contrast flex items-center justify-center cursor-pointer shadow-[0_10px_26px_-8px_var(--accent)] active:scale-95 transition"
          >
            <Plus className="w-7 h-7" strokeWidth={2.4} />
          </button>
          <DockButton active={section === 'finance'} label="Plata" icon={ICONS.finance} onClick={() => go('finance')} />
          <DockButton
            active={menuOpen || !['today', 'agenda', 'finance'].includes(section)}
            label="Más"
            icon={<Grid2x2 />}
            onClick={() => setMenuOpen(true)}
          />
        </div>
      </nav>

      {/* ── Menú "Más" ─────────────────────────────────────── */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} kicker="Tu vida" title="Todas las áreas">
        {groups.map((g) => (
          <div key={g} className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">{g}</div>
            <div className="grid grid-cols-3 gap-2">
              {SECTIONS.filter((s) => s.group === g).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(s.id)}
                  className={`flex flex-col items-start gap-3 p-3.5 rounded-[20px] border min-h-[84px] cursor-pointer transition [&>span>svg]:w-5 [&>span>svg]:h-5 ${
                    section === s.id ? 'bg-accent-subtle border-accent' : 'bg-surface-elevated border-subtle'
                  }`}
                >
                  <span className="text-accent">{ICONS[s.id]}</span>
                  <span className="text-[13px] font-semibold text-main text-left leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Modal>

      <QuickAdd life={life} open={quickOpen} onClose={() => setQuickOpen(false)} onNavigate={go} />

      {locked && <UnlockScreen life={life} onDone={() => setLocked(false)} />}

      {pauseApp && (
        <MindfulPause
          app={pauseApp}
          life={life}
          onClose={closePause}
          onGoFocus={() => {
            closePause();
            go('focus');
          }}
        />
      )}
    </div>
  );
}

type SectionMeta = (typeof SECTIONS)[number];

const DockButton: React.FC<{ active: boolean; label: string; icon: React.ReactNode; onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-full cursor-pointer transition min-h-[46px] [&>span>svg]:w-[21px] [&>span>svg]:h-[21px] ${active ? 'text-main' : 'text-dim'}`}
  >
    <span className={active ? 'text-accent' : ''}>{icon}</span>
    <span className="text-[10px] font-semibold">{label}</span>
  </button>
);

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
