import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  TableProperties,
  Timer,
  BookOpen,
  TrendingUp,
  Settings,
  MoreHorizontal,
  X,
  LogIn,
  LogOut,
  RotateCw,
  Compass,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Sliders,
  CheckCircle2,
  CalendarClock,
  Wallet,
  GraduationCap,
  Briefcase,
  Hourglass,
  Library,
  Users,
  Cross,
  Compass as CompassIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

export type MainSection =
  | 'today'
  | 'agenda'
  | 'habits'
  | 'focus'
  | 'journal'
  | 'university'
  | 'work'
  | 'finance'
  | 'people'
  | 'faith'
  | 'books'
  | 'purpose'
  | 'time'
  | 'progress'
  | 'settings';

export type NavSection = MainSection;

export type HabitsSubTab = 'month' | 'week' | 'year' | 'manage';
export type ProgressSubTab = 'stats' | 'balance';

interface NavbarProps {
  currentSection: MainSection;
  onSelectSection: (section: MainSection) => void;
  habitsSubTab: HabitsSubTab;
  onSelectHabitsSubTab: (subTab: HabitsSubTab) => void;
  progressSubTab: ProgressSubTab;
  onSelectProgressSubTab: (subTab: ProgressSubTab) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  lastSyncTime?: Date | null;
  onRetrySync?: () => void;
  todayCompletionRate: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onSelectSection,
  habitsSubTab,
  onSelectHabitsSubTab,
  progressSubTab,
  onSelectProgressSubTab,
  user,
  onSignIn,
  onSignOut,
  syncStatus,
  lastSyncTime,
  onRetrySync,
  todayCompletionRate,
}) => {
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [minutesAgo, setMinutesAgo] = useState(0);

  // Update minutes ago periodically
  useEffect(() => {
    if (!lastSyncTime) return;
    const calc = () => {
      const diffMs = Date.now() - lastSyncTime.getTime();
      setMinutesAgo(Math.floor(diffMs / 60000));
    };
    calc();
    const interval = setInterval(calc, 30000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const navItems: {
    id: MainSection;
    label: string;
    icon: React.ReactNode;
    shortcut: string;
    group: string;
  }[] = [
    { id: 'today', label: 'Hoy', icon: <CalendarCheck className="w-[18px] h-[18px]" />, shortcut: 'H', group: 'Día a día' },
    { id: 'agenda', label: 'Agenda', icon: <CalendarClock className="w-[18px] h-[18px]" />, shortcut: 'C', group: 'Día a día' },
    { id: 'habits', label: 'Hábitos', icon: <TableProperties className="w-[18px] h-[18px]" />, shortcut: 'M', group: 'Día a día' },
    { id: 'focus', label: 'Enfoque', icon: <Timer className="w-[18px] h-[18px]" />, shortcut: 'T', group: 'Día a día' },
    { id: 'journal', label: 'Diario', icon: <BookOpen className="w-[18px] h-[18px]" />, shortcut: 'D', group: 'Día a día' },
    { id: 'university', label: 'Universidad', icon: <GraduationCap className="w-[18px] h-[18px]" />, shortcut: 'U', group: 'Áreas' },
    { id: 'work', label: 'Trabajo SMV', icon: <Briefcase className="w-[18px] h-[18px]" />, shortcut: 'W', group: 'Áreas' },
    { id: 'finance', label: 'Finanzas', icon: <Wallet className="w-[18px] h-[18px]" />, shortcut: 'F', group: 'Áreas' },
    { id: 'people', label: 'Personas', icon: <Users className="w-[18px] h-[18px]" />, shortcut: 'R', group: 'Áreas' },
    { id: 'faith', label: 'Fe', icon: <Cross className="w-[18px] h-[18px]" />, shortcut: 'V', group: 'Áreas' },
    { id: 'books', label: 'Libros', icon: <Library className="w-[18px] h-[18px]" />, shortcut: 'L', group: 'Áreas' },
    { id: 'purpose', label: 'Brújula', icon: <CompassIcon className="w-[18px] h-[18px]" />, shortcut: 'O', group: 'Rumbo' },
    { id: 'time', label: 'Tiempo & Pantalla', icon: <Hourglass className="w-[18px] h-[18px]" />, shortcut: 'P', group: 'Rumbo' },
    { id: 'progress', label: 'Progreso', icon: <TrendingUp className="w-[18px] h-[18px]" />, shortcut: 'E', group: 'Rumbo' },
    { id: 'settings', label: 'Ajustes', icon: <Settings className="w-[18px] h-[18px]" />, shortcut: 'A', group: 'Rumbo' },
  ];

  const drawerSections = navItems.filter(
    (i) => !['today', 'agenda', 'finance', 'habits', 'settings', 'progress'].includes(i.id)
  );

  const renderSyncStatus = () => {
    if (!user || syncStatus === 'local') {
      return (
        <div className="flex items-center gap-2 text-muted">
          <span className="w-2 h-2 rounded-full bg-surface-muted shrink-0" />
          <span className="text-[11px] truncate">Modo local · sin cuenta</span>
        </div>
      );
    }

    if (syncStatus === 'syncing') {
      return (
        <div className="flex items-center gap-2 text-accent">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
          <span className="text-[11px] font-medium">Sincronizando…</span>
        </div>
      );
    }

    if (syncStatus === 'error') {
      return (
        <button
          type="button"
          onClick={onRetrySync}
          className="flex items-center gap-2 text-red-500 hover:text-red-600 transition cursor-pointer text-left"
          title="Tocar para reintentar sincronización"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="text-[11px] font-semibold flex items-center gap-1 underline">
            Error de sincronización · reintentar
            <RotateCw className="w-3 h-3" />
          </span>
        </button>
      );
    }

    const emailPrefix = user.email || 'cuenta';
    const timeText = minutesAgo === 0 ? 'hace instantes' : `hace ${minutesAgo} min`;

    return (
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-[11px] font-medium truncate" title={user.email || ''}>
          Sincronizado con {emailPrefix} · {timeText}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          DESKTOP SIDEBAR
      ───────────────────────────────────────────────────────────── */}
      <aside
        aria-label="Navegación principal"
        className="hidden md:flex flex-col w-64 lg:w-72 bg-surface border-r border-app p-5 justify-between shrink-0 select-none print:hidden h-screen sticky top-0"
      >
        <div className="space-y-4 min-h-0 flex flex-col">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-app pb-5">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-muted uppercase">
                Edición Diaria
              </span>
              <h1 className="text-2xl font-['Oswald'] font-bold tracking-wider text-main uppercase">
                CONSTANTE
              </h1>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase text-muted tracking-widest">
                Hoy
              </span>
              <span className="text-sm font-['Bebas_Neue'] tracking-wider text-accent">
                {todayCompletionRate}%
              </span>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="space-y-0.5 overflow-y-auto no-scrollbar -mx-1 px-1 min-h-0" aria-label="Secciones de la aplicación">
            {navItems.map((item, idx) => {
              const isActive = currentSection === item.id;
              const showGroup = idx === 0 || navItems[idx - 1].group !== item.group;
              return (
                <div key={item.id} className="space-y-0.5">
                  {showGroup && (
                    <div className={`px-3.5 pb-1 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-dim ${idx === 0 ? '' : 'pt-3'}`}>
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition min-h-[38px] cursor-pointer ${
                      isActive
                        ? 'bg-accent text-accent-contrast shadow-xs'
                        : 'text-muted hover:text-main hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-black/20 text-accent-contrast'
                        : 'bg-surface-elevated border border-app text-dim'
                    }`}>
                      {item.shortcut}
                    </kbd>
                  </button>

                  {/* Sub-tabs for Hábitos */}
                  {item.id === 'habits' && isActive && (
                    <div className="pl-6 pt-1 pb-1 space-y-0.5 border-l-2 border-app ml-5">
                      {[
                        { id: 'month', label: 'Mes', icon: <TableProperties className="w-3.5 h-3.5" /> },
                        { id: 'week', label: 'Semana', icon: <CalendarDays className="w-3.5 h-3.5" /> },
                        { id: 'year', label: 'Año', icon: <CalendarRange className="w-3.5 h-3.5" /> },
                        { id: 'manage', label: 'Gestionar', icon: <Sliders className="w-3.5 h-3.5" /> },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onSelectHabitsSubTab(sub.id as HabitsSubTab)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            habitsSubTab === sub.id
                              ? 'text-accent font-bold bg-accent-subtle'
                              : 'text-muted hover:text-main'
                          }`}
                        >
                          {sub.icon}
                          <span>{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sub-tabs for Progreso */}
                  {item.id === 'progress' && isActive && (
                    <div className="pl-6 pt-1 pb-1 space-y-0.5 border-l-2 border-app ml-5">
                      {[
                        { id: 'stats', label: 'Estadísticas', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                        { id: 'balance', label: 'Balance', icon: <Compass className="w-3.5 h-3.5" /> },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onSelectProgressSubTab(sub.id as ProgressSubTab)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            progressSubTab === sub.id
                              ? 'text-accent font-bold bg-accent-subtle'
                              : 'text-muted hover:text-main'
                          }`}
                        >
                          {sub.icon}
                          <span>{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: PWA + Sync & User */}
        <div className="pt-3 border-t border-app space-y-2 shrink-0">
          <PWAInstallButton />

          <div className="p-3 rounded-xl bg-surface-elevated border border-app space-y-2">
            {renderSyncStatus()}

            {user ? (
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-main hover:bg-surface transition cursor-pointer"
              >
                <span className="truncate">{user.displayName || user.email}</span>
                <LogOut className="w-3.5 h-3.5 shrink-0 ml-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface border border-app text-xs font-semibold text-main hover:bg-surface-elevated transition cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-accent" />
                <span>Iniciar con Google</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE TOP APP BAR (Compact)
      ───────────────────────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-app sticky top-0 z-30 select-none print:hidden safe-top">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-['Oswald'] font-bold tracking-wider text-main uppercase">
            CONSTANTE
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-bold">
            {todayCompletionRate}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab quick toggles if in Habits or Progress */}
          {currentSection === 'habits' && (
            <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-app text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => onSelectHabitsSubTab('week')}
                className={`px-2 py-1 rounded-lg transition min-h-[36px] ${
                  habitsSubTab === 'week' ? 'bg-accent text-accent-contrast' : 'text-muted'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => onSelectHabitsSubTab('month')}
                className={`px-2 py-1 rounded-lg transition min-h-[36px] ${
                  habitsSubTab === 'month' ? 'bg-accent text-accent-contrast' : 'text-muted'
                }`}
              >
                Mes
              </button>
            </div>
          )}

          {currentSection === 'progress' && (
            <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-app text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => onSelectProgressSubTab('stats')}
                className={`px-2 py-1 rounded-lg transition min-h-[36px] ${
                  progressSubTab === 'stats' ? 'bg-accent text-accent-contrast' : 'text-muted'
                }`}
              >
                Stats
              </button>
              <button
                type="button"
                onClick={() => onSelectProgressSubTab('balance')}
                className={`px-2 py-1 rounded-lg transition min-h-[36px] ${
                  progressSubTab === 'balance' ? 'bg-accent text-accent-contrast' : 'text-muted'
                }`}
              >
                Balance
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE BOTTOM BAR: EXACTLY 5 BUTTONS
          Hoy · Agenda · Plata · Hábitos · Más
      ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-app px-2 py-1.5 flex items-center justify-around select-none print:hidden safe-bottom"
      >
        {([
          { id: 'today', label: 'Hoy', icon: <CalendarCheck className="w-5 h-5" /> },
          { id: 'agenda', label: 'Agenda', icon: <CalendarClock className="w-5 h-5" /> },
          { id: 'finance', label: 'Plata', icon: <Wallet className="w-5 h-5" /> },
          { id: 'habits', label: 'Hábitos', icon: <TableProperties className="w-5 h-5" /> },
        ] as { id: MainSection; label: string; icon: React.ReactNode }[]).map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              onSelectSection(b.id);
              setMoreDrawerOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition min-h-[44px] cursor-pointer ${
              currentSection === b.id && !moreDrawerOpen ? 'text-accent font-bold' : 'text-muted hover:text-main'
            }`}
          >
            {b.icon}
            <span className="text-[10px] uppercase font-semibold mt-0.5 tracking-wider">{b.label}</span>
          </button>
        ))}

        {/* Más */}
        <button
          type="button"
          onClick={() => setMoreDrawerOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition min-h-[44px] cursor-pointer ${
            moreDrawerOpen || !['today', 'agenda', 'finance', 'habits'].includes(currentSection)
              ? 'text-accent font-bold'
              : 'text-muted hover:text-main'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] uppercase font-semibold mt-0.5 tracking-wider">Más</span>
        </button>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE "MÁS" BOTTOM DRAWER
      ───────────────────────────────────────────────────────────── */}
      {moreDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Opciones adicionales"
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-t-3xl border-t border-app p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl safe-bottom"
          >
            <div className="flex items-center justify-between pb-3 border-b border-app">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-muted uppercase">
                  Navegación & Ajustes
                </span>
                <h3 className="text-lg font-['Oswald'] font-bold text-main uppercase">
                  Más Secciones
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMoreDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface-elevated cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Todas las áreas de la vida */}
            <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold uppercase tracking-wider">
              {drawerSections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSection(item.id);
                    setMoreDrawerOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 min-h-[72px] cursor-pointer transition ${
                    currentSection === item.id
                      ? 'bg-accent text-accent-contrast border-accent'
                      : 'bg-surface-elevated border-app text-main hover:border-accent'
                  }`}
                >
                  {item.icon}
                  <span className="leading-tight">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-sections */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-wider">
              {/* Progreso: Estadísticas */}
              <button
                type="button"
                onClick={() => {
                  onSelectSection('progress');
                  onSelectProgressSubTab('stats');
                  setMoreDrawerOpen(false);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[72px] cursor-pointer transition ${
                  currentSection === 'progress' && progressSubTab === 'stats'
                    ? 'bg-accent text-accent-contrast border-accent'
                    : 'bg-surface-elevated border-app text-main hover:border-accent'
                }`}
              >
                <BarChart3 className="w-5 h-5 mb-1" />
                <span>Estadísticas</span>
              </button>

              {/* Progreso: Balance */}
              <button
                type="button"
                onClick={() => {
                  onSelectSection('progress');
                  onSelectProgressSubTab('balance');
                  setMoreDrawerOpen(false);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[72px] cursor-pointer transition ${
                  currentSection === 'progress' && progressSubTab === 'balance'
                    ? 'bg-accent text-accent-contrast border-accent'
                    : 'bg-surface-elevated border-app text-main hover:border-accent'
                }`}
              >
                <Compass className="w-5 h-5 mb-1" />
                <span>Balance Mensual</span>
              </button>

              {/* Hábitos: Año */}
              <button
                type="button"
                onClick={() => {
                  onSelectSection('habits');
                  onSelectHabitsSubTab('year');
                  setMoreDrawerOpen(false);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[72px] cursor-pointer transition ${
                  currentSection === 'habits' && habitsSubTab === 'year'
                    ? 'bg-accent text-accent-contrast border-accent'
                    : 'bg-surface-elevated border-app text-main hover:border-accent'
                }`}
              >
                <CalendarRange className="w-5 h-5 mb-1" />
                <span>Mapa Anual</span>
              </button>

              {/* Hábitos: Gestionar */}
              <button
                type="button"
                onClick={() => {
                  onSelectSection('habits');
                  onSelectHabitsSubTab('manage');
                  setMoreDrawerOpen(false);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[72px] cursor-pointer transition ${
                  currentSection === 'habits' && habitsSubTab === 'manage'
                    ? 'bg-accent text-accent-contrast border-accent'
                    : 'bg-surface-elevated border-app text-main hover:border-accent'
                }`}
              >
                <Sliders className="w-5 h-5 mb-1" />
                <span>Gestionar Hábitos</span>
              </button>
            </div>

            {/* Ajustes button */}
            <button
              type="button"
              onClick={() => {
                onSelectSection('settings');
                setMoreDrawerOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold uppercase tracking-wider transition min-h-[48px] cursor-pointer ${
                currentSection === 'settings'
                  ? 'bg-accent text-accent-contrast border-accent'
                  : 'bg-surface-elevated border-app text-main hover:border-accent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span>Ajustes & Personalización</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">Config</span>
            </button>

            {/* Sync & Account in Drawer */}
            <div className="pt-2 border-t border-app space-y-2">
              <PWAInstallButton />

              <div className="p-3 rounded-2xl bg-surface-elevated border border-app space-y-2">
                {renderSyncStatus()}
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut();
                      setMoreDrawerOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted hover:text-main bg-surface transition cursor-pointer"
                  >
                    <span className="truncate">{user.displayName || user.email}</span>
                    <LogOut className="w-3.5 h-3.5 shrink-0 ml-1" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onSignIn();
                      setMoreDrawerOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface border border-app text-xs font-semibold text-main hover:bg-surface-elevated transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-accent" />
                    <span>Iniciar sesión con Google</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
