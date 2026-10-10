import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sliders,
  Music,
  Plus,
  Flame,
  Award,
  Link as LinkIcon,
  Coffee,
  X,
  ExternalLink,
  Tag,
  Radio,
} from 'lucide-react';
import { Habit, HabitLog } from '../types/habit';
import {
  FocusModeType,
  FocusPreset,
  FocusSession,
  DEFAULT_FOCUS_PRESETS,
  INITIAL_SPOTIFY_PLAYLISTS,
  SpotifyPlaylist,
} from '../types/focus';
import { ambientSoundEngine } from '../utils/ambientSounds';
import { getTodayDateString } from '../utils/dateUtils';
import { getLocalData, setLocalData } from '../services/dataStorage';
import { fireSubtleConfetti } from '../utils/confetti';

interface FocusViewProps {
  habits: Habit[];
  logs?: Record<string, HabitLog>;
  onToggleHabit?: (habitId: string, dateStr: string) => void;
  onUpdateHabitValue?: (habitId: string, dateStr: string, val: number | boolean) => void;
  onAddFocusMinutesToHabit?: (habitId: string, minutes: number) => void;
  dailyGoalMinutes?: number;
}

export const FocusView: React.FC<FocusViewProps> = ({
  habits,
  logs = {},
  onToggleHabit,
  onUpdateHabitValue,
  onAddFocusMinutesToHabit,
  dailyGoalMinutes = 120,
}) => {
  const todayStr = getTodayDateString();

  // Mode and Timer Config
  const [mode, setMode] = useState<FocusModeType>('pomodoro');
  const [currentPhase, setCurrentPhase] = useState<'focus' | 'break' | 'long_break'>('focus');
  const [currentCycle, setCurrentCycle] = useState<number>(1);

  // Focus presets
  const [presets, setPresets] = useState<FocusPreset[]>(() => {
    return getLocalData<FocusPreset[]>('constante_focus_presets', DEFAULT_FOCUS_PRESETS);
  });
  const [activePreset, setActivePreset] = useState<FocusPreset>(presets[0]);

  // Timer states (in seconds)
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number>(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Session details
  const [taskName, setTaskName] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Estudio');
  const [linkedHabitId, setLinkedHabitId] = useState<string>('');

  // Distraction tracking
  const [exitCount, setExitCount] = useState<number>(0);
  const [timeOutsideSeconds, setTimeOutsideSeconds] = useState<number>(0);
  const blurTimestampRef = useRef<number | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);
  const stopwatchStartTimestampRef = useRef<number | null>(null);

  // Zen Mode (Full screen)
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Completed sessions list
  const [sessions, setSessions] = useState<FocusSession[]>(() => {
    return getLocalData<FocusSession[]>('constante_focus_sessions', []);
  });

  // Spotify integration
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>(() => {
    return getLocalData<SpotifyPlaylist[]>('constante_spotify_playlists', INITIAL_SPOTIFY_PLAYLISTS);
  });
  const [activeSpotifyUrl, setActiveSpotifyUrl] = useState<string>(
    'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator&theme=0'
  );
  const [customSpotifyInput, setCustomSpotifyInput] = useState<string>('');
  const [isSpotifyPanelOpen, setIsSpotifyPanelOpen] = useState<boolean>(false);
  const [autoPauseOnBreak, setAutoPauseOnBreak] = useState<boolean>(true);

  // Ambient sound sliders
  const [ambientMuted, setAmbientMuted] = useState<boolean>(false);
  const [ambientVolumes, setAmbientVolumes] = useState<Record<string, number>>({
    white: 0,
    brown: 0,
    rain: 0,
    fire: 0,
    cafe: 0,
    forest: 0,
  });
  const [isAmbientPanelOpen, setIsAmbientPanelOpen] = useState<boolean>(false);

  // Custom Preset Modal
  const [isCustomPresetModalOpen, setIsCustomPresetModalOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('Bloque Personalizado');
  const [newPresetFocusMin, setNewPresetFocusMin] = useState<number>(45);
  const [newPresetBreakMin, setNewPresetBreakMin] = useState<number>(10);
  const [newPresetLongBreakMin, setNewPresetLongBreakMin] = useState<number>(20);
  const [newPresetCycles, setNewPresetCycles] = useState<number>(3);

  // Session finished toast
  const [sessionFinishedSummary, setSessionFinishedSummary] = useState<{
    durationMinutes: number;
    exitCount: number;
    timeOutsideSeconds: number;
    taskName?: string;
  } | null>(null);

  // Save sessions to local storage
  useEffect(() => {
    setLocalData('constante_focus_sessions', sessions);
  }, [sessions]);

  // Save presets to local storage
  useEffect(() => {
    setLocalData('constante_focus_presets', presets);
  }, [presets]);

  // Save playlists
  useEffect(() => {
    setLocalData('constante_spotify_playlists', spotifyPlaylists);
  }, [spotifyPlaylists]);

  // Reset or initialize timer according to selected mode / preset
  const configureTimer = (newMode: FocusModeType, preset: FocusPreset) => {
    setIsRunning(false);
    setMode(newMode);
    setCurrentPhase('focus');
    setCurrentCycle(1);

    if (newMode === 'pomodoro' || newMode === 'study' || newMode === 'deepwork' || newMode === 'custom') {
      const sec = preset.focusMinutes * 60;
      setTargetDurationSeconds(sec);
      setRemainingSeconds(sec);
    } else if (newMode === 'countdown') {
      const sec = 30 * 60;
      setTargetDurationSeconds(sec);
      setRemainingSeconds(sec);
    } else if (newMode === 'stopwatch') {
      setStopwatchSeconds(0);
    }
  };

  // Change preset
  const handleSelectPreset = (preset: FocusPreset) => {
    setActivePreset(preset);
    let m: FocusModeType = 'custom';
    if (preset.id === 'pomodoro-classic') m = 'pomodoro';
    else if (preset.id === 'study-set') m = 'study';
    else if (preset.id === 'deep-work') m = 'deepwork';
    configureTimer(m, preset);
  };

  // Handle visibility change (distraction detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isRunning) return;
      if (document.hidden) {
        blurTimestampRef.current = Date.now();
        setExitCount((prev) => prev + 1);
      } else {
        if (blurTimestampRef.current) {
          const diffSec = Math.round((Date.now() - blurTimestampRef.current) / 1000);
          setTimeOutsideSeconds((prev) => prev + diffSec);
          blurTimestampRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning]);

  // Master Timer Tick using Date.now() to prevent drift and background tab throttling
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      if (mode === 'stopwatch') {
        stopwatchStartTimestampRef.current = Date.now() - stopwatchSeconds * 1000;
      } else {
        targetEndTimeRef.current = Date.now() + remainingSeconds * 1000;
      }

      interval = setInterval(() => {
        if (mode === 'stopwatch') {
          if (stopwatchStartTimestampRef.current) {
            const elapsed = Math.max(0, Math.round((Date.now() - stopwatchStartTimestampRef.current) / 1000));
            setStopwatchSeconds(elapsed);
          }
        } else {
          if (targetEndTimeRef.current) {
            const rem = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
            setRemainingSeconds(rem);
            if (rem <= 0) {
              handleTimerCycleComplete();
            }
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, currentPhase, currentCycle, activePreset]);

  // Finish a cycle (focus -> break -> next focus)
  const handleTimerCycleComplete = () => {
    setIsRunning(false);
    fireSubtleConfetti();

    // Play pleasant chime
    playEndChime();

    if (currentPhase === 'focus') {
      // Record completed focus session
      const completedMins = Math.round(targetDurationSeconds / 60);
      recordCompletedSession(completedMins, true);

      // Link to habit if selected
      applySessionToHabit(completedMins);

      // Check if long break or short break
      if (currentCycle % activePreset.cyclesBeforeLongBreak === 0) {
        setCurrentPhase('long_break');
        const longSec = activePreset.longBreakMinutes * 60;
        setTargetDurationSeconds(longSec);
        setRemainingSeconds(longSec);
      } else {
        setCurrentPhase('break');
        const breakSec = activePreset.breakMinutes * 60;
        setTargetDurationSeconds(breakSec);
        setRemainingSeconds(breakSec);
      }

      if (autoPauseOnBreak) {
        // Mute ambient sound on break
        ambientSoundEngine.setMasterMute(true);
        setAmbientMuted(true);
      }
    } else {
      // Break is done, return to focus
      setCurrentPhase('focus');
      setCurrentCycle((prev) => prev + 1);
      const focusSec = activePreset.focusMinutes * 60;
      setTargetDurationSeconds(focusSec);
      setRemainingSeconds(focusSec);

      if (autoPauseOnBreak) {
        ambientSoundEngine.setMasterMute(false);
        setAmbientMuted(false);
      }
    }
  };

  const playEndChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      }
    } catch {}
  };

  // Record session
  const recordCompletedSession = (durationMins: number, completed: boolean) => {
    const newSession: FocusSession = {
      id: `session-${Date.now()}`,
      date: todayStr,
      startTime: new Date().toISOString(),
      durationMinutes: durationMins,
      mode,
      taskName: taskName.trim() || undefined,
      tag: selectedTag,
      habitId: linkedHabitId || undefined,
      completed,
      interrupted: !completed,
      exitCount,
      timeOutsideSeconds,
    };

    setSessions((prev) => [newSession, ...prev]);

    setSessionFinishedSummary({
      durationMinutes: durationMins,
      exitCount,
      timeOutsideSeconds,
      taskName: taskName.trim() || undefined,
    });

    // Reset distraction counters for next session
    setExitCount(0);
    setTimeOutsideSeconds(0);
  };

  // Apply to habit - sums duration without duplicating or toggling boolean back to false
  const applySessionToHabit = (durationMinutes: number) => {
    if (!linkedHabitId) return;
    const targetHabit = habits.find((h) => h.id === linkedHabitId);
    if (!targetHabit) return;

    if (onAddFocusMinutesToHabit) {
      onAddFocusMinutesToHabit(linkedHabitId, durationMinutes);
    } else if (targetHabit.type === 'duration' && onUpdateHabitValue) {
      const current = Number(logs[todayStr]?.values?.[linkedHabitId]) || 0;
      onUpdateHabitValue(linkedHabitId, todayStr, current + durationMinutes);
    } else if (targetHabit.type === 'boolean' && onUpdateHabitValue) {
      onUpdateHabitValue(linkedHabitId, todayStr, true);
    } else if (onToggleHabit) {
      const isAlreadyDone = Boolean(logs[todayStr]?.values?.[linkedHabitId]);
      if (!isAlreadyDone) {
        onToggleHabit(linkedHabitId, todayStr);
      }
    }
  };

  // Manual session finish (only records actual minutes >= 1, breaks never sum focus)
  const handleManualFinish = () => {
    setIsRunning(false);
    let spentMinutes = 0;
    if (mode === 'stopwatch') {
      spentMinutes = Math.floor(stopwatchSeconds / 60);
    } else {
      const elapsedSec = targetDurationSeconds - remainingSeconds;
      spentMinutes = Math.floor(elapsedSec / 60);
    }

    if (spentMinutes > 0 && currentPhase === 'focus') {
      recordCompletedSession(spentMinutes, false);
      applySessionToHabit(spentMinutes);
    }

    // Reset
    if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    } else {
      setRemainingSeconds(targetDurationSeconds);
    }
  };

  // Reset timer
  const handleResetTimer = () => {
    setIsRunning(false);
    if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    } else {
      setRemainingSeconds(targetDurationSeconds);
    }
    setExitCount(0);
    setTimeOutsideSeconds(0);
  };

  // Calculate day stats
  const todaySessions = useMemo(() => {
    return sessions.filter((s) => s.date === todayStr);
  }, [sessions, todayStr]);

  const todayMinutes = useMemo(() => {
    return todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [todaySessions]);

  const streakDays = useMemo(() => {
    const dateSet = new Set(sessions.map((s) => s.date));
    let count = 0;
    let d = new Date();
    while (true) {
      const str = d.toISOString().split('T')[0];
      if (dateSet.has(str)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [sessions]);

  // Ambient sound handler
  const handleAmbientVolumeChange = (soundId: string, val: number) => {
    setAmbientVolumes((prev) => ({ ...prev, [soundId]: val }));
    ambientSoundEngine.setVolume(soundId, val);
  };

  const handleToggleMasterMute = () => {
    const next = !ambientMuted;
    setAmbientMuted(next);
    ambientSoundEngine.setMasterMute(next);
  };

  // Parse spotify URL or URI to Embed URL
  const convertToSpotifyEmbed = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.includes('open.spotify.com/embed/')) {
      return trimmed;
    }

    // Matches: https://open.spotify.com/(playlist|album|track|show)/ID?...
    const match = trimmed.match(/open\.spotify\.com\/(playlist|album|track|show)\/([a-zA-Z0-9]+)/);
    if (match) {
      const type = match[1];
      const id = match[2];
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }

    // Matches uri spotify:playlist:ID
    const uriMatch = trimmed.match(/spotify:(playlist|album|track|show):([a-zA-Z0-9]+)/);
    if (uriMatch) {
      const type = uriMatch[1];
      const id = uriMatch[2];
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }

    return null;
  };

  const handleApplyCustomSpotify = () => {
    const embedUrl = convertToSpotifyEmbed(customSpotifyInput);
    if (embedUrl) {
      setActiveSpotifyUrl(embedUrl);
      const newPl: SpotifyPlaylist = {
        id: `custom-${Date.now()}`,
        name: 'Playlist Personalizada',
        emoji: '🎵',
        url: customSpotifyInput,
        spotifyUri: customSpotifyInput,
        type: 'playlist',
      };
      setSpotifyPlaylists((prev) => [newPl, ...prev]);
      setCustomSpotifyInput('');
    }
  };

  // Save new custom preset
  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const newPr: FocusPreset = {
      id: `custom-preset-${Date.now()}`,
      name: newPresetName.trim(),
      focusMinutes: Number(newPresetFocusMin) || 25,
      breakMinutes: Number(newPresetBreakMin) || 5,
      longBreakMinutes: Number(newPresetLongBreakMin) || 15,
      cyclesBeforeLongBreak: Number(newPresetCycles) || 4,
    };
    setPresets((prev) => [...prev, newPr]);
    setActivePreset(newPr);
    configureTimer('custom', newPr);
    setIsCustomPresetModalOpen(false);
  };

  // Progress percentage
  const progressPercent = useMemo(() => {
    if (mode === 'stopwatch') return 100;
    if (targetDurationSeconds === 0) return 0;
    const elapsed = targetDurationSeconds - remainingSeconds;
    return Math.min(100, Math.max(0, Math.round((elapsed / targetDurationSeconds) * 100)));
  }, [mode, targetDurationSeconds, remainingSeconds]);

  // Time format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Display timer string
  const timerDisplay = mode === 'stopwatch' ? formatTime(stopwatchSeconds) : formatTime(remainingSeconds);

  return (
    <div className={`space-y-6 max-w-4xl mx-auto ${isZenMode ? 'fixed inset-0 z-50 bg-app p-6 overflow-y-auto' : ''}`}>
      {/* ─────────────────────────────────────────────────────────────
          ZEN MODE TOP BAR
      ───────────────────────────────────────────────────────────── */}
      {isZenMode && (
        <div className="flex items-center justify-between pb-4 border-b border-app">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-muted">
              Modo Zen Activado
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-elevated border border-app text-xs font-semibold text-main hover:bg-surface transition cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Salir de Pantalla Completa</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          HEADER & GOALS (HIDDEN IN ZEN MODE)
      ───────────────────────────────────────────────────────────── */}
      {!isZenMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
                TEMPORIZADOR & PRODUCTIVIDAD
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-bold">
                Atajo T
              </span>
            </div>
            <h2 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-wider text-main mt-0.5">
              Sesión de Enfoque
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsZenMode(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface border border-app text-xs font-bold uppercase tracking-wider text-main transition min-h-[44px] cursor-pointer shadow-2xs"
              title="Ocultar distracciones y maximizar concentración"
            >
              <Maximize2 className="w-4 h-4 text-accent" />
              <span>Modo Zen</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DAILY METRICS BAR (Minutos hoy vs meta diaria)
      ───────────────────────────────────────────────────────────── */}
      {!isZenMode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 rounded-3xl bg-surface border border-app shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-muted tracking-wider block">
                Meta Diaria ({dailyGoalMinutes} min)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-['Bebas_Neue'] font-bold text-accent">
                  {todayMinutes} min
                </span>
                <span className="text-[11px] font-mono text-muted">
                  ({Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:border-l border-app sm:pl-4">
            <div className="w-10 h-10 rounded-2xl bg-surface-elevated text-main flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-muted tracking-wider block">
                Sesiones Hoy
              </span>
              <span className="text-xl font-['Bebas_Neue'] font-bold text-main">
                {todaySessions.length} completadas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:border-l border-app sm:pl-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-muted tracking-wider block">
                Racha de Días con Enfoque
              </span>
              <span className="text-xl font-['Bebas_Neue'] font-bold text-main">
                {streakDays} {streakDays === 1 ? 'día' : 'días'} seguidos
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PRESET SELECTOR TABS
      ───────────────────────────────────────────────────────────── */}
      {!isZenMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
              Elegir Modo de Temporizador:
            </span>
            <button
              type="button"
              onClick={() => setIsCustomPresetModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Preset</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((pr) => {
              const isSelected = activePreset.id === pr.id && mode !== 'stopwatch' && mode !== 'countdown';
              return (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => handleSelectPreset(pr)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[40px] ${
                    isSelected
                      ? 'bg-accent text-accent-contrast shadow-2xs font-bold'
                      : 'bg-surface border border-app text-muted hover:text-main'
                  }`}
                >
                  {pr.name}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => configureTimer('stopwatch', activePreset)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[40px] ${
                mode === 'stopwatch'
                  ? 'bg-accent text-accent-contrast shadow-2xs font-bold'
                  : 'bg-surface border border-app text-muted hover:text-main'
              }`}
            >
              ⏱ Cronómetro Libre
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CENTRAL TIMER CARD
      ───────────────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-10 rounded-3xl bg-surface border border-app shadow-sm text-center relative overflow-hidden space-y-6">
        {/* Phase Indicator */}
        <div className="flex items-center justify-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest ${
              currentPhase === 'focus'
                ? 'bg-accent-subtle text-accent'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {mode === 'stopwatch'
              ? 'Cronómetro libre'
              : currentPhase === 'focus'
              ? `Bloque de Enfoque · Ciclo ${currentCycle}`
              : currentPhase === 'long_break'
              ? 'Descanso Largo'
              : 'Descanso Breve'}
          </span>
        </div>

        {/* Task Title Input & Linked Habit */}
        <div className="max-w-md mx-auto space-y-2.5">
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="¿En qué tarea específica te estás enfocando? (opcional)"
            className="w-full text-center text-sm sm:text-base font-medium px-4 py-2.5 rounded-2xl bg-surface-elevated border border-app text-main placeholder:text-muted/60 focus:outline-hidden focus:border-accent"
          />

          {!isZenMode && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              {/* Habit Picker */}
              <div className="flex items-center gap-1.5 bg-surface-elevated px-3 py-1.5 rounded-xl border border-app text-muted">
                <LinkIcon className="w-3.5 h-3.5 text-accent" />
                <select
                  value={linkedHabitId}
                  onChange={(e) => setLinkedHabitId(e.target.value)}
                  className="bg-transparent text-main font-medium focus:outline-hidden cursor-pointer"
                >
                  <option value="">Vincular a hábito...</option>
                  {habits
                    .filter((h) => h.status === 'active')
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.emoji} {h.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Tag Picker */}
              <div className="flex items-center gap-1.5 bg-surface-elevated px-3 py-1.5 rounded-xl border border-app text-muted">
                <Tag className="w-3.5 h-3.5 text-accent" />
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="bg-transparent text-main font-medium focus:outline-hidden cursor-pointer"
                >
                  <option value="Estudio">Estudio</option>
                  <option value="Trabajo">Trabajo</option>
                  <option value="Lectura">Lectura</option>
                  <option value="Programación">Programación</option>
                  <option value="Escritura">Escritura</option>
                  <option value="Proyecto">Proyecto</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Large Readable Clock */}
        <div className="py-4">
          <div className="font-['Bebas_Neue'] text-7xl sm:text-8xl md:text-9xl tracking-widest text-main select-none">
            {timerDisplay}
          </div>

          {/* Progress bar */}
          {mode !== 'stopwatch' && (
            <div className="max-w-md mx-auto bg-surface-elevated rounded-full h-3 overflow-hidden border border-app p-0.5 mt-2">
              <div
                className="bg-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider transition min-h-[50px] shadow-sm cursor-pointer ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-accent hover:opacity-95 text-accent-contrast'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Comenzar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleManualFinish}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-surface-elevated hover:bg-surface border border-app text-main text-xs font-bold uppercase tracking-wider transition min-h-[50px] cursor-pointer"
            title="Registrar los minutos acumulados y finalizar"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Terminar Sesión</span>
          </button>

          <button
            type="button"
            onClick={handleResetTimer}
            className="p-3.5 rounded-2xl bg-surface-elevated hover:bg-surface border border-app text-muted hover:text-main transition min-h-[50px] min-w-[50px] flex items-center justify-center cursor-pointer"
            title="Reiniciar reloj"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Distraction warning banner if user switched apps */}
        {exitCount > 0 && isRunning && (
          <div className="p-2.5 rounded-xl bg-surface-elevated/70 border border-app text-[11px] text-muted max-w-sm mx-auto">
            Te fuiste de la app {exitCount} {exitCount === 1 ? 'vez' : 'veces'} ({timeOutsideSeconds}s fuera). ¡Mantené el foco!
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AUDIO & MUSIC COMPANION (AMBIENT SOUNDS + SPOTIFY)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Offline Synthesized Ambient Sounds */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-accent" />
              <h3 className="font-['Oswald'] text-base font-bold uppercase tracking-wider text-main">
                Sonidos de Fondo
              </h3>
            </div>
            <button
              type="button"
              onClick={handleToggleMasterMute}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                ambientMuted
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-surface-elevated border-app text-muted hover:text-main'
              }`}
              title={ambientMuted ? 'Activar sonido' : 'Silenciar todo'}
            >
              {ambientMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            Generador acústico offline (Web Audio API). Mezclá los volúmenes a tu gusto:
          </p>

          <div className="space-y-3">
            {[
              { id: 'white', label: 'Ruido blanco puro', emoji: '💨' },
              { id: 'brown', label: 'Ruido marrón (cascada profunda)', emoji: '🌊' },
              { id: 'rain', label: 'Lluvia suave', emoji: '🌧' },
              { id: 'fire', label: 'Fuego de chimenea', emoji: '🔥' },
              { id: 'cafe', label: 'Café & Murmullo', emoji: '☕' },
              { id: 'forest', label: 'Bosque nocturno', emoji: '🌲' },
            ].map((snd) => (
              <div key={snd.id} className="flex items-center gap-3">
                <span className="text-sm w-5 text-center">{snd.emoji}</span>
                <span className="text-xs text-main flex-1 truncate">{snd.label}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ambientVolumes[snd.id] || 0}
                  onChange={(e) => handleAmbientVolumeChange(snd.id, Number(e.target.value))}
                  className="w-24 accent-accent cursor-pointer"
                />
                <span className="font-mono text-[10px] text-muted w-7 text-right">
                  {ambientVolumes[snd.id] || 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Spotify Official Embedded Player */}
        <div className="p-5 rounded-3xl bg-surface border border-app shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-500" />
              <h3 className="font-['Oswald'] text-base font-bold uppercase tracking-wider text-main">
                Música en Spotify
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-muted tracking-wider">
              Embed Oficial
            </span>
          </div>

          {/* Quick Playlist Selector */}
          <div className="flex flex-wrap gap-1.5">
            {spotifyPlaylists.slice(0, 4).map((pl) => {
              const embed = convertToSpotifyEmbed(pl.url);
              const isActive = embed === activeSpotifyUrl;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => embed && setActiveSpotifyUrl(embed)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer min-h-[32px] ${
                    isActive
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-surface-elevated text-muted hover:text-main border border-app'
                  }`}
                >
                  {pl.emoji} {pl.name}
                </button>
              );
            })}
          </div>

          {/* Custom Spotify URL Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customSpotifyInput}
              onChange={(e) => setCustomSpotifyInput(e.target.value)}
              placeholder="Pegar link de playlist o álbum..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-surface-elevated border border-app text-main placeholder:text-muted/60 focus:outline-hidden focus:border-accent"
            />
            <button
              type="button"
              onClick={handleApplyCustomSpotify}
              className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface border border-app text-xs font-bold text-main cursor-pointer"
            >
              Cargar
            </button>
          </div>

          {/* Embedded Spotify Iframe */}
          <div className="rounded-2xl overflow-hidden border border-app bg-surface-elevated">
            <iframe
              src={activeSpotifyUrl}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Embed Focus Music"
              className="rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HISTORY OF SESSIONS
      ───────────────────────────────────────────────────────────── */}
      {!isZenMode && (
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-app shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-app">
            <h3 className="font-['Oswald'] text-base sm:text-lg font-bold uppercase tracking-wider text-main">
              Historial de Sesiones Recientes
            </h3>
            <span className="text-xs font-mono text-muted">
              {sessions.length} registradas
            </span>
          </div>

          {sessions.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">
              Aún no completaste ninguna sesión de enfoque hoy. ¡Dale a Comenzar para registrar la primera!
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {sessions.slice(0, 10).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-surface-elevated border border-app text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-accent">
                        {s.durationMinutes} min
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-app text-muted">
                        {s.tag}
                      </span>
                      {s.taskName && (
                        <span className="font-semibold text-main truncate max-w-[200px]">
                          {s.taskName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-2">
                      <span>{s.date}</span>
                      {s.exitCount > 0 && (
                        <span className="text-amber-500">
                          · {s.exitCount} salidas ({s.timeOutsideSeconds}s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Completada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: NUEVO PRESET PERSONALIZADO
      ───────────────────────────────────────────────────────────── */}
      {isCustomPresetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-surface border border-app rounded-3xl p-6 shadow-2xl space-y-4 text-main">
            <div className="flex items-center justify-between pb-2 border-b border-app">
              <h3 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main">
                Nuevo Preset de Enfoque
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomPresetModalOpen(false)}
                className="p-1.5 text-muted hover:text-main rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-muted block mb-1">Nombre del Preset:</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="ej. Sprint de Redacción"
                  className="w-full p-2.5 rounded-xl bg-surface-elevated border border-app text-main"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-muted block mb-1">Enfoque (min):</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={newPresetFocusMin}
                    onChange={(e) => setNewPresetFocusMin(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-surface-elevated border border-app text-main font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted block mb-1">Descanso (min):</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newPresetBreakMin}
                    onChange={(e) => setNewPresetBreakMin(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-surface-elevated border border-app text-main font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-muted block mb-1">Descanso largo (min):</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newPresetLongBreakMin}
                    onChange={(e) => setNewPresetLongBreakMin(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-surface-elevated border border-app text-main font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted block mb-1">Ciclos por descanso:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newPresetCycles}
                    onChange={(e) => setNewPresetCycles(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-surface-elevated border border-app text-main font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCustomPresetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-elevated border border-app text-xs font-semibold text-muted hover:text-main cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomPreset}
                className="flex-1 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TOAST / POPUP: RESUMEN DE SESIÓN COMPLETADA
      ───────────────────────────────────────────────────────────── */}
      {sessionFinishedSummary && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl bg-surface border border-accent shadow-2xl text-main animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent text-accent-contrast flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-accent">
                  ¡Sesión Completada!
                </h4>
                <p className="text-xs text-main font-medium">
                  {sessionFinishedSummary.durationMinutes} minutos registrados con éxito.
                </p>
                {sessionFinishedSummary.exitCount > 0 ? (
                  <p className="text-[11px] text-muted mt-0.5">
                    Te fuiste de la app {sessionFinishedSummary.exitCount} {sessionFinishedSummary.exitCount === 1 ? 'vez' : 'veces'} ({sessionFinishedSummary.timeOutsideSeconds}s).
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">
                    100% de concentración sin salir de la app.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSessionFinishedSummary(null)}
              className="p-1 text-muted hover:text-main rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
