/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useHabitData } from './hooks/useHabitData';
import { ThemeProvider, useThemeContext } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import {
  Navbar,
  MainSection,
  HabitsSubTab,
  ProgressSubTab,
} from './components/common/Navbar';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { TodayView } from './views/TodayView';
import { MonthSheet } from './components/habits/MonthSheet';
import { WeekView } from './views/WeekView';
import { YearHeatmap } from './components/stats/YearHeatmap';
import { StatsCharts } from './components/stats/StatsCharts';
import { BalanceView } from './views/BalanceView';
import { JournalView } from './views/JournalView';
import { FocusView } from './views/FocusView';
import { ManageHabitsView } from './views/ManageHabitsView';
import { SettingsView } from './views/SettingsView';
import { HabitFormModal } from './components/habits/HabitFormModal';
import { AiTransparencyModal } from './components/common/AiTransparencyModal';
import { FocusProvider } from './context/FocusContext';
import { normalizeJournalEntry } from './types/journal';
import { handleSpotifyCallback } from './services/spotifyService';
import { getTodayDateString } from './utils/dateUtils';
import { isHabitScheduledOnDate, isHabitCompleted } from './services/dataStorage';
import { Habit } from './types/habit';
import { useLifeData } from './hooks/useLifeData';
import { useVerseNotifier } from './services/verseNotifier';
import { PLAN_2026_HABITS } from './services/lifeSeed';
import { ConstanteBackupPayload } from './services/backupService';
import { DailyDashboard } from './components/life/DailyDashboard';
import { MindfulPause } from './components/life/MindfulPause';
import { AgendaView } from './views/AgendaView';
import { FinanceView } from './views/FinanceView';
import { UniversityView } from './views/UniversityView';
import { WorkView } from './views/WorkView';
import { TimeView } from './views/TimeView';
import { BooksView } from './views/BooksView';
import { PeopleView } from './views/PeopleView';
import { FaithView } from './views/FaithView';
import { PurposeView } from './views/PurposeView';
import {
  TableProperties,
  CalendarDays,
  CalendarRange,
  Sliders,
  BarChart3,
  Compass,
} from 'lucide-react';

function MainAppContent() {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const {
    habits,
    logs,
    entries,
    settings,
    syncStatus,
    lastSyncTime,
    retrySync,
    toggleHabit,
    setHabitValue,
    saveHabit,
    deleteHabit,
    reorderHabits,
    saveJournalEntry,
    deleteJournalEntry,
    saveSettings,
    loadThreeMonthsDemo,
    resetAllData,
    restoreBackup,
    undoRestore,
  } = useHabitData(user);

  const life = useLifeData(user);
  useVerseNotifier(life);

  const { themeMode, accentColor, setThemeMode, setAccentColor } = useThemeContext();
  
  // Navigation states
  const [currentSection, setCurrentSection] = useState<MainSection>('today');
  const [selectedJournalDate, setSelectedJournalDate] = useState<string | null>(null);
  const [selectedTodayDate, setSelectedTodayDate] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  // On mobile (< 768px), default view for habits is 'week'
  const [habitsSubTab, setHabitsSubTab] = useState<HabitsSubTab>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'week' : 'month';
  });
  const [progressSubTab, setProgressSubTab] = useState<ProgressSubTab>('stats');

  // "Pausa consciente": se abre con /?pausa=Instagram desde un atajo del iPhone
  const [pauseApp, setPauseApp] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('pausa');
  });

  const closePause = useCallback(() => {
    setPauseApp(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('pausa');
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }, []);

  // Volver arriba al cambiar de sección
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentSection]);

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [initialHabitFormData, setInitialHabitFormData] = useState<Partial<Habit> | null>(null);

  const todayStr = getTodayDateString();

  // Keep ThemeContext and remote settings in two-way sync
  useEffect(() => {
    if (settings.theme && settings.theme !== themeMode) {
      setThemeMode(settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (settings.accentColor && settings.accentColor !== accentColor) {
      setAccentColor(settings.accentColor);
    }
  }, [settings.accentColor]);

  // Today completion rate calculation for header badges
  const todayCompletionRate = useMemo(() => {
    const scheduled = habits.filter(
      (h) => h.status === 'active' && isHabitScheduledOnDate(h, todayStr)
    );
    if (scheduled.length === 0) return 0;
    const completed = scheduled.filter((h) => isHabitCompleted(h, logs[todayStr]?.values?.[h.id]));
    return Math.round((completed.length / scheduled.length) * 100);
  }, [habits, logs, todayStr]);

  // Today focus minutes from local storage sessions
  const todayFocusMinutes = useMemo(() => {
    try {
      const raw = localStorage.getItem('constante_focus_sessions');
      if (!raw) return 0;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return 0;
      return list
        .filter((s: any) => s.date === todayStr)
        .reduce((sum: number, s: any) => sum + (Number(s.durationMinutes) || 0), 0);
    } catch {
      return 0;
    }
  }, [todayStr, currentSection]);

  // Check for Spotify authorization code on callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && settings.spotifyClientId) {
      handleSpotifyCallback(settings.spotifyClientId, code).then((success) => {
        if (success) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }
  }, [settings.spotifyClientId]);

  // Desktop keyboard shortcuts:
  // H: hoy, M: mes, S: semana, Y: año, G: gestionar, T: enfoque, D: diario, E: estadísticas, B: balance, A: ajustes
  // C: agenda, U: universidad, W: trabajo, F: finanzas, R: personas, V: fe, L: libros, O: brújula, P: tiempo & pantalla
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modifier keys are pressed (avoids interfering with Ctrl+S, Cmd+D, etc.)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // Ignore within editable fields or when any modal/dialog is open
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('dialog, [role="dialog"]') ||
        document.querySelector('dialog[open], [role="dialog"]')
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === 'H') {
        setCurrentSection('today');
      } else if (key === 'M') {
        setCurrentSection('habits');
        setHabitsSubTab('month');
      } else if (key === 'S') {
        setCurrentSection('habits');
        setHabitsSubTab('week');
      } else if (key === 'Y') {
        setCurrentSection('habits');
        setHabitsSubTab('year');
      } else if (key === 'G') {
        setCurrentSection('habits');
        setHabitsSubTab('manage');
      } else if (key === 'T') {
        setCurrentSection('focus');
      } else if (key === 'D') {
        setCurrentSection('journal');
      } else if (key === 'E') {
        setCurrentSection('progress');
        setProgressSubTab('stats');
      } else if (key === 'B') {
        setCurrentSection('progress');
        setProgressSubTab('balance');
      } else if (key === 'A') {
        setCurrentSection('settings');
      } else if (key === 'C') {
        setCurrentSection('agenda');
      } else if (key === 'U') {
        setCurrentSection('university');
      } else if (key === 'W') {
        setCurrentSection('work');
      } else if (key === 'F') {
        setCurrentSection('finance');
      } else if (key === 'R') {
        setCurrentSection('people');
      } else if (key === 'V') {
        setCurrentSection('faith');
      } else if (key === 'L') {
        setCurrentSection('books');
      } else if (key === 'O') {
        setCurrentSection('purpose');
      } else if (key === 'P') {
        setCurrentSection('time');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddCategory = (newCat: string) => {
    if (!settings.customCategories.includes(newCat)) {
      saveSettings({
        customCategories: [...settings.customCategories, newCat],
      });
    }
  };

  const handleOpenCreateHabitWithData = (data: Partial<Habit>) => {
    setInitialHabitFormData(data);
    setHabitModalOpen(true);
  };

  // Close the day handler from TodayView - idempotent, lossless, preserving blocks & metadata
  const handleSaveDayClosure = useCallback(
    (data: {
      date: string;
      completedHabitIds: string[];
      score?: number;
      mood?: number;
      journalText?: string;
    }) => {
      // Toggle pending habits marked in closure
      data.completedHabitIds.forEach((hId) => {
        if (!logs[data.date]?.values?.[hId]) {
          toggleHabit(hId, data.date);
        }
      });

      // Normalize current entry and preserve existing blocks, media, tags, summary
      const existingRaw = entries[data.date];
      const normalized = existingRaw ? normalizeJournalEntry(existingRaw) : null;
      const baseBlocks = normalized?.blocks ? [...normalized.blocks] : [];

      if (data.journalText !== undefined) {
        const trimmed = data.journalText.trim();
        const existingClosureIdx = baseBlocks.findIndex(
          (b) => b.type === 'text' && b.id.startsWith('closure-note-')
        );

        if (trimmed) {
          if (existingClosureIdx >= 0) {
            // Update existing closure note in place (prevents duplicates when reopening)
            baseBlocks[existingClosureIdx] = {
              ...baseBlocks[existingClosureIdx],
              type: 'text',
              text: trimmed,
            };
          } else {
            // Append new closure note
            baseBlocks.push({
              id: `closure-note-${Date.now()}`,
              type: 'text',
              time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              text: trimmed,
            });
          }
        } else if (existingClosureIdx >= 0) {
          baseBlocks.splice(existingClosureIdx, 1);
        }
      }

      saveJournalEntry({
        ...(normalized || {}),
        id: data.date,
        userId: user ? user.uid : 'local',
        date: data.date,
        blocks: baseBlocks,
        score: typeof data.score === 'number' ? data.score : normalized?.score,
        mood: typeof data.mood === 'number' ? (data.mood as any) : normalized?.mood,
        tags: normalized?.tags,
        summary: normalized?.summary,
        updatedAt: new Date().toISOString(),
      });
    },
    [logs, entries, toggleHabit, saveJournalEntry, user]
  );

  /** Agrega los hábitos del Plan 2026 que todavía no existen */
  const handleImportPlanHabits = useCallback(() => {
    const userId = user ? user.uid : 'local';
    const existing = new Set(habits.map((h) => h.id));
    const maxOrder = habits.reduce((m, h) => Math.max(m, h.sortOrder || 0), 0);
    const now = new Date().toISOString();
    let added = 0;
    PLAN_2026_HABITS.forEach((h, idx) => {
      if (existing.has(h.id)) return;
      saveHabit({ ...h, userId, sortOrder: maxOrder + idx + 1, createdAt: now, updatedAt: now });
      added++;
    });
    return added;
  }, [habits, saveHabit, user]);

  /** Al registrar una lectura bíblica, marca el hábito "Biblia + oración" de hoy */
  const handleCompleteBibleHabit = useCallback(() => {
    const bible = habits.find((h) => h.id === 'plan-biblia' && h.status === 'active');
    if (bible && !logs[todayStr]?.values?.[bible.id]) toggleHabit(bible.id, todayStr);
  }, [habits, logs, todayStr, toggleHabit]);

  const handleResetAll = useCallback(() => {
    resetAllData();
    life.reset();
  }, [resetAllData, life]);

  const handleRestore = useCallback(
    async (backup: ConstanteBackupPayload, mode: 'merge' | 'replace') => {
      await restoreBackup(backup, mode);
      if (backup.life) life.restore(backup.life, mode);
    },
    [restoreBackup, life]
  );

  const goFocus = () => setCurrentSection('focus');

  return (
    <div className="min-h-screen bg-app text-main flex flex-col md:flex-row antialiased font-sans">
      {/* Navigation (Sidebar on Desktop, 5 tabs on Mobile) */}
      <Navbar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        habitsSubTab={habitsSubTab}
        onSelectHabitsSubTab={setHabitsSubTab}
        progressSubTab={progressSubTab}
        onSelectProgressSubTab={setProgressSubTab}
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={signOutUser}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onRetrySync={retrySync}
        todayCompletionRate={todayCompletionRate}
      />

      {/* Main Content View Container */}
      <main className="flex-1 min-w-0 p-3.5 sm:p-6 md:p-8 pb-24 md:pb-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Subtabs Bar for Habits when in habits view (Desktop header quick bar) */}
          {currentSection === 'habits' && (
            <div className="hidden sm:flex items-center justify-between pb-3 border-b border-app">
              <div className="flex items-center gap-1.5 bg-surface-elevated p-1 rounded-2xl border border-app">
                {[
                  { id: 'month', label: 'Mes', icon: <TableProperties className="w-4 h-4" /> },
                  { id: 'week', label: 'Semana', icon: <CalendarDays className="w-4 h-4" /> },
                  { id: 'year', label: 'Año (Heatmap)', icon: <CalendarRange className="w-4 h-4" /> },
                  { id: 'manage', label: 'Gestionar Hábitos', icon: <Sliders className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHabitsSubTab(tab.id as HabitsSubTab)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition min-h-[36px] cursor-pointer ${
                      habitsSubTab === tab.id
                        ? 'bg-accent text-accent-contrast shadow-2xs'
                        : 'text-muted hover:text-main'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setInitialHabitFormData(null);
                  setHabitModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer shadow-2xs"
              >
                + Nuevo Hábito
              </button>
            </div>
          )}

          {/* Subtabs Bar for Progress when in progress view (Desktop header quick bar) */}
          {currentSection === 'progress' && (
            <div className="hidden sm:flex items-center gap-1.5 bg-surface-elevated p-1 rounded-2xl border border-app w-fit">
              {[
                { id: 'stats', label: 'Estadísticas & Insights', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'balance', label: 'Balance Mensual con IA', icon: <Compass className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProgressSubTab(tab.id as ProgressSubTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition min-h-[36px] cursor-pointer ${
                    progressSubTab === tab.id
                      ? 'bg-accent text-accent-contrast shadow-2xs'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* View Router */}
          {currentSection === 'today' && <DailyDashboard life={life} onNavigate={setCurrentSection} />}
          {currentSection === 'today' && (
            <TodayView
              habits={habits}
              logs={logs}
              entries={entries}
              initialDateStr={selectedTodayDate || undefined}
              onToggleHabit={toggleHabit}
              onUpdateHabitValue={setHabitValue}
              onOpenVoiceJournal={(dateStr) => {
                setSelectedJournalDate(dateStr);
                setCurrentSection('journal');
              }}
              onNewHabit={() => {
                setInitialHabitFormData(null);
                setHabitModalOpen(true);
              }}
              onNavigateToBalance={() => {
                setCurrentSection('progress');
                setProgressSubTab('balance');
              }}
              onNavigateToFocus={() => setCurrentSection('focus')}
              todayFocusMinutes={todayFocusMinutes}
              onSaveDayClosure={handleSaveDayClosure}
            />
          )}

          {/* HÁBITOS VIEW WITH ITS 4 SUB-TABS */}
          {currentSection === 'habits' && habitsSubTab === 'month' && (
            <MonthSheet
              habits={habits}
              logs={logs}
              entries={entries}
              onToggleHabit={toggleHabit}
              onSetHabitValue={setHabitValue}
              onNewHabit={() => {
                setInitialHabitFormData(null);
                setHabitModalOpen(true);
              }}
              onOpenJournalDate={(dateStr) => {
                setSelectedJournalDate(dateStr);
                setCurrentSection('journal');
              }}
            />
          )}

          {currentSection === 'habits' && habitsSubTab === 'week' && (
            <WeekView
              habits={habits}
              logs={logs}
              onToggleHabit={toggleHabit}
              onSetHabitValue={setHabitValue}
              onSwitchToMonth={() => setHabitsSubTab('month')}
            />
          )}

          {currentSection === 'habits' && habitsSubTab === 'year' && (
            <YearHeatmap
              habits={habits}
              logs={logs}
              onSelectDate={(dateStr) => {
                setSelectedTodayDate(dateStr);
                setCurrentSection('today');
              }}
            />
          )}

          {currentSection === 'habits' && habitsSubTab === 'manage' && (
            <ManageHabitsView
              habits={habits}
              categories={settings.customCategories}
              userId={user ? user.uid : 'local'}
              onSaveHabit={saveHabit}
              onDeleteHabit={deleteHabit}
              onReorderHabits={reorderHabits}
              onAddCategory={handleAddCategory}
            />
          )}

          {/* ENFOQUE VIEW */}
          {currentSection === 'focus' && (
            <FocusView
              habits={habits}
              logs={logs}
              onToggleHabit={toggleHabit}
              onUpdateHabitValue={setHabitValue}
              onAddFocusMinutesToHabit={(habitId, minutes) => {
                const cur = Number(logs[todayStr]?.values?.[habitId]) || 0;
                setHabitValue(habitId, todayStr, cur + minutes);
              }}
              dailyGoalMinutes={settings.focusDailyGoalMinutes || 120}
            />
          )}

          {/* DIARIO VIEW */}
          {currentSection === 'journal' && (
            <JournalView
              entries={entries}
              habits={habits}
              logs={logs}
              settings={settings}
              initialDateStr={selectedJournalDate || undefined}
              onSaveEntry={saveJournalEntry}
              onDeleteEntry={deleteJournalEntry}
              userId={user ? user.uid : 'local'}
            />
          )}

          {/* PROGRESO VIEW (Estadísticas & Balance) */}
          {currentSection === 'progress' && progressSubTab === 'stats' && (
            <StatsCharts
              habits={habits}
              logs={logs}
            />
          )}

          {currentSection === 'progress' && progressSubTab === 'balance' && (
            <BalanceView
              habits={habits}
              logs={logs}
              entries={entries}
              settings={{
                ...settings,
                mission: settings.mission || life.store.purpose.mission,
                vision: settings.vision || life.store.purpose.lifeVision,
              }}
              onSaveSettings={saveSettings}
              onOpenCreateHabitWithData={handleOpenCreateHabitWithData}
              userId={user ? user.uid : 'local'}
            />
          )}

          {/* SISTEMA DE VIDA */}
          {currentSection === 'agenda' && <AgendaView life={life} onOpenUniversity={() => setCurrentSection('university')} />}
          {currentSection === 'finance' && <FinanceView life={life} />}
          {currentSection === 'university' && <UniversityView life={life} onStartFocus={goFocus} />}
          {currentSection === 'work' && <WorkView life={life} onStartFocus={goFocus} />}
          {currentSection === 'time' && <TimeView life={life} />}
          {currentSection === 'books' && <BooksView life={life} />}
          {currentSection === 'people' && <PeopleView life={life} />}
          {currentSection === 'faith' && <FaithView life={life} onCompleteBibleHabit={handleCompleteBibleHabit} />}
          {currentSection === 'purpose' && (
            <PurposeView life={life} habits={habits} logs={logs} onImportPlanHabits={handleImportPlanHabits} />
          )}

          {/* AJUSTES VIEW */}
          {currentSection === 'settings' && (
            <SettingsView
              settings={settings}
              habits={habits}
              logs={logs}
              entries={entries}
              onSaveSettings={saveSettings}
              onLoadThreeMonthsDemo={loadThreeMonthsDemo}
              onResetAllData={handleResetAll}
              onRestoreBackup={handleRestore}
              lifeStore={life.store}
              onUndoRestore={undoRestore}
              onOpenAiTransparency={() => setAiModalOpen(true)}
            />
          )}
        </div>
      </main>

      {pauseApp && (
        <MindfulPause
          app={pauseApp}
          life={life}
          onClose={closePause}
          onGoFocus={() => {
            closePause();
            setCurrentSection('focus');
          }}
        />
      )}

      {/* Floating Offline Notification */}
      <OfflineIndicator />

      {/* Quick Habit Creation Modal */}
      {habitModalOpen && (
        <HabitFormModal
          categories={settings.customCategories}
          userId={user ? user.uid : 'local'}
          onSave={saveHabit}
          onClose={() => {
            setHabitModalOpen(false);
            setInitialHabitFormData(null);
          }}
          onAddCategory={handleAddCategory}
          initialData={initialHabitFormData || undefined}
        />
      )}

      {/* AI Transparency & Privacy Modal */}
      <AiTransparencyModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onAccept={(dontShowAgain) => {
          if (dontShowAgain) {
            saveSettings({ aiTransparencyAccepted: true });
          }
          setAiModalOpen(false);
        }}
        onDisableAi={() => {
          saveSettings({ aiEnabled: false });
          setAiModalOpen(false);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
