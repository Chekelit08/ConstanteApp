import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  FocusModeType,
  FocusPreset,
  FocusSession,
  DEFAULT_FOCUS_PRESETS,
} from '../types/focus';
import { getTodayDateString } from '../utils/dateUtils';
import { getLocalData, setLocalData } from '../services/dataStorage';
import { fireSubtleConfetti } from '../utils/confetti';
import { pauseSpotify } from '../services/spotifyService';

const FOCUS_STATE_STORAGE_KEY = 'constante_active_focus_state';

interface FocusContextType {
  mode: FocusModeType;
  currentPhase: 'focus' | 'break' | 'long_break';
  currentCycle: number;
  isRunning: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  targetDurationSeconds: number;
  stopwatchSeconds: number;
  activePreset: FocusPreset;
  presets: FocusPreset[];
  taskName: string;
  selectedTag: string;
  linkedHabitId: string;
  exitCount: number;
  timeOutsideSeconds: number;
  strictMode: boolean;
  wakeLockActive: boolean;
  sessions: FocusSession[];
  
  // Actions
  setMode: (m: FocusModeType) => void;
  setActivePreset: (p: FocusPreset) => void;
  setPresets: (presets: FocusPreset[]) => void;
  setTaskName: (t: string) => void;
  setSelectedTag: (tag: string) => void;
  setLinkedHabitId: (hId: string) => void;
  setStrictMode: (s: boolean) => void;
  setCountdownDuration: (minutes: number) => void;
  
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  stopSessionEarly: (saveActualTime: boolean) => FocusSession | null;
  skipBreak: () => void;
  
  addSession: (s: FocusSession) => void;
  updateSession: (s: FocusSession) => void;
  deleteSession: (id: string) => void;
  
  todayFocusMinutes: number;
}

const FocusContext = createContext<FocusContextType | null>(null);

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return ctx;
}

interface FocusProviderProps {
  children: React.ReactNode;
  userId: string;
  onSessionComplete?: (session: FocusSession) => void;
  spotifyClientId?: string;
}

export const FocusProvider: React.FC<FocusProviderProps> = ({
  children,
  userId,
  onSessionComplete,
  spotifyClientId,
}) => {
  const todayStr = getTodayDateString();

  // Presets
  const [presets, setPresets] = useState<FocusPreset[]>(() => {
    return getLocalData<FocusPreset[]>('focus_presets', DEFAULT_FOCUS_PRESETS);
  });
  const [activePreset, setActivePreset] = useState<FocusPreset>(presets[0]);

  // Mode and phase
  const [mode, setMode] = useState<FocusModeType>('pomodoro');
  const [currentPhase, setCurrentPhase] = useState<'focus' | 'break' | 'long_break'>('focus');
  const [currentCycle, setCurrentCycle] = useState<number>(1);

  // Time tracking using absolute timestamps
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number>(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);

  // Metadata
  const [taskName, setTaskName] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Estudio');
  const [linkedHabitId, setLinkedHabitId] = useState<string>('');
  const [strictMode, setStrictMode] = useState<boolean>(false);

  // Distraction tracking
  const [exitCount, setExitCount] = useState<number>(0);
  const [timeOutsideSeconds, setTimeOutsideSeconds] = useState<number>(0);
  const blurTimestampRef = useRef<number | null>(null);

  // Wake Lock
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  // Completed sessions (shared reactive key)
  const [sessions, setSessions] = useState<FocusSession[]>(() => {
    return getLocalData<FocusSession[]>(`focus_sessions_${userId}`, []);
  });

  // Timestamp refs
  const targetEndTimeRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const pauseStartTimeRef = useRef<number | null>(null);
  const pausedTimeAccumulatedRef = useRef<number>(0);
  const stopwatchStartTimeRef = useRef<number | null>(null);

  // Persist sessions
  useEffect(() => {
    setLocalData(`focus_sessions_${userId}`, sessions);
  }, [sessions, userId]);

  // Persist presets
  useEffect(() => {
    setLocalData('focus_presets', presets);
  }, [presets]);

  // Audio chime player using Web Audio API
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.3);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 1500);
    } catch {
      // AudioContext unavailable or blocked
    }
  }, []);

  // Request Wake Lock
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  // Configure timer based on mode and phase
  const getPhaseDurationSeconds = useCallback(
    (targetMode: FocusModeType, phase: 'focus' | 'break' | 'long_break', preset: FocusPreset) => {
      if (targetMode === 'stopwatch') return 0;
      if (targetMode === 'countdown') return targetDurationSeconds;
      if (phase === 'focus') return preset.focusMinutes * 60;
      if (phase === 'long_break') return preset.longBreakMinutes * 60;
      return preset.breakMinutes * 60;
    },
    [targetDurationSeconds]
  );

  // Initialize or reset timer
  const setCountdownDuration = useCallback((minutes: number) => {
    const sec = Math.max(1, minutes) * 60;
    setTargetDurationSeconds(sec);
    setRemainingSeconds(sec);
  }, []);

  // Distraction tracking & 90s Spotify grace period
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isRunning || isPaused) return;

      if (document.hidden) {
        blurTimestampRef.current = Date.now();
        setExitCount((prev) => prev + 1);
      } else {
        if (blurTimestampRef.current) {
          const diffSec = Math.round((Date.now() - blurTimestampRef.current) / 1000);
          // If the user left to Spotify and came back under 90s, do not penalize in strict mode
          if (diffSec <= 90) {
            // Grace period: record seconds outside but don't treat as failure
            setTimeOutsideSeconds((prev) => prev + diffSec);
          } else {
            setTimeOutsideSeconds((prev) => prev + diffSec);
          }
          blurTimestampRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, isPaused]);

  // Handle phase completion idempotently
  const handlePhaseComplete = useCallback(() => {
    playChime();
    fireSubtleConfetti();

    // Auto-pause Spotify on break
    if (spotifyClientId && currentPhase === 'focus') {
      pauseSpotify(spotifyClientId).catch(() => {});
    }

    if (currentPhase === 'focus') {
      // Record completed focus session
      const now = new Date();
      const actualMinutes = Math.max(1, Math.round(targetDurationSeconds / 60));
      const newSession: FocusSession = {
        id: `focus-${Date.now()}`,
        date: getTodayDateString(),
        startTime: sessionStartTimeRef.current
          ? new Date(sessionStartTimeRef.current).toISOString()
          : now.toISOString(),
        endTime: now.toISOString(),
        durationMinutes: actualMinutes,
        mode,
        taskName: taskName.trim() || undefined,
        tag: selectedTag || 'General',
        habitId: linkedHabitId || undefined,
        completed: true,
        interrupted: strictMode && exitCount > 2,
        exitCount,
        timeOutsideSeconds,
      };

      setSessions((prev) => [newSession, ...prev]);
      if (onSessionComplete) {
        onSessionComplete(newSession);
      }

      // Transition to break
      const isLongBreak = currentCycle >= activePreset.cyclesBeforeLongBreak;
      const nextPhase = isLongBreak ? 'long_break' : 'break';
      const breakSec = isLongBreak ? activePreset.longBreakMinutes * 60 : activePreset.breakMinutes * 60;

      setCurrentPhase(nextPhase);
      setTargetDurationSeconds(breakSec);
      setRemainingSeconds(breakSec);
      targetEndTimeRef.current = Date.now() + breakSec * 1000;
      // Continue running break automatically
    } else {
      // Break complete -> next focus cycle
      const nextCycle = currentPhase === 'long_break' ? 1 : currentCycle + 1;
      const focusSec = activePreset.focusMinutes * 60;

      setCurrentCycle(nextCycle);
      setCurrentPhase('focus');
      setTargetDurationSeconds(focusSec);
      setRemainingSeconds(focusSec);
      targetEndTimeRef.current = Date.now() + focusSec * 1000;
      sessionStartTimeRef.current = Date.now();
      setExitCount(0);
      setTimeOutsideSeconds(0);
    }
  }, [
    currentPhase,
    targetDurationSeconds,
    mode,
    taskName,
    selectedTag,
    linkedHabitId,
    strictMode,
    exitCount,
    timeOutsideSeconds,
    currentCycle,
    activePreset,
    onSessionComplete,
    playChime,
    spotifyClientId,
  ]);

  // Main tick loop using Date.now()
  useEffect(() => {
    let animId: number;

    const tick = () => {
      if (isRunning && !isPaused) {
        if (mode === 'stopwatch') {
          if (stopwatchStartTimeRef.current) {
            const elapsed = Math.round(
              (Date.now() - stopwatchStartTimeRef.current - pausedTimeAccumulatedRef.current) / 1000
            );
            setStopwatchSeconds(Math.max(0, elapsed));
          }
        } else {
          if (targetEndTimeRef.current) {
            const diff = targetEndTimeRef.current - Date.now();
            const sec = Math.max(0, Math.round(diff / 1000));
            setRemainingSeconds(sec);

            if (sec <= 0) {
              handlePhaseComplete();
              return;
            }
          }
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, isPaused, mode, handlePhaseComplete]);

  // Actions
  const startTimer = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    sessionStartTimeRef.current = Date.now();
    pausedTimeAccumulatedRef.current = 0;

    if (mode === 'stopwatch') {
      stopwatchStartTimeRef.current = Date.now();
      setStopwatchSeconds(0);
    } else {
      const dur = getPhaseDurationSeconds(mode, currentPhase, activePreset);
      setTargetDurationSeconds(dur);
      setRemainingSeconds(dur);
      targetEndTimeRef.current = Date.now() + dur * 1000;
    }

    requestWakeLock();
  }, [mode, currentPhase, activePreset, getPhaseDurationSeconds, requestWakeLock]);

  const pauseTimer = useCallback(() => {
    if (!isRunning || isPaused) return;
    setIsPaused(true);
    pauseStartTimeRef.current = Date.now();
  }, [isRunning, isPaused]);

  const resumeTimer = useCallback(() => {
    if (!isRunning || !isPaused) return;
    setIsPaused(false);
    if (pauseStartTimeRef.current) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      pausedTimeAccumulatedRef.current += pauseDuration;
      if (targetEndTimeRef.current) {
        targetEndTimeRef.current += pauseDuration;
      }
      pauseStartTimeRef.current = null;
    }
  }, [isRunning, isPaused]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    targetEndTimeRef.current = null;
    sessionStartTimeRef.current = null;
    stopwatchStartTimeRef.current = null;
    setExitCount(0);
    setTimeOutsideSeconds(0);
    releaseWakeLock();

    const sec = getPhaseDurationSeconds(mode, currentPhase, activePreset);
    setRemainingSeconds(sec);
    setStopwatchSeconds(0);
  }, [mode, currentPhase, activePreset, getPhaseDurationSeconds, releaseWakeLock]);

  const stopSessionEarly = useCallback(
    (saveActualTime: boolean): FocusSession | null => {
      if (!isRunning) return null;

      let elapsedSec = 0;
      if (mode === 'stopwatch') {
        elapsedSec = stopwatchSeconds;
      } else {
        elapsedSec = targetDurationSeconds - remainingSeconds;
      }

      setIsRunning(false);
      setIsPaused(false);
      targetEndTimeRef.current = null;
      releaseWakeLock();

      const elapsedMinutes = Math.floor(elapsedSec / 60);

      // Only save if saveActualTime is true, the current phase was focus, and at least 1 min elapsed
      if (saveActualTime && currentPhase === 'focus' && elapsedMinutes >= 1) {
        const now = new Date();
        const saved: FocusSession = {
          id: `focus-${Date.now()}`,
          date: getTodayDateString(),
          startTime: sessionStartTimeRef.current
            ? new Date(sessionStartTimeRef.current).toISOString()
            : now.toISOString(),
          endTime: now.toISOString(),
          durationMinutes: elapsedMinutes,
          mode,
          taskName: taskName.trim() || undefined,
          tag: selectedTag || 'General',
          habitId: linkedHabitId || undefined,
          completed: false,
          interrupted: true,
          exitCount,
          timeOutsideSeconds,
        };

        setSessions((prev) => [saved, ...prev]);
        if (onSessionComplete) {
          onSessionComplete(saved);
        }
        resetTimer();
        return saved;
      }

      resetTimer();
      return null;
    },
    [
      isRunning,
      mode,
      stopwatchSeconds,
      targetDurationSeconds,
      remainingSeconds,
      currentPhase,
      taskName,
      selectedTag,
      linkedHabitId,
      exitCount,
      timeOutsideSeconds,
      onSessionComplete,
      resetTimer,
      releaseWakeLock,
    ]
  );

  const skipBreak = useCallback(() => {
    setCurrentPhase('focus');
    const sec = activePreset.focusMinutes * 60;
    setTargetDurationSeconds(sec);
    setRemainingSeconds(sec);
    targetEndTimeRef.current = Date.now() + sec * 1000;
  }, [activePreset]);

  const addSession = useCallback((s: FocusSession) => {
    setSessions((prev) => [s, ...prev]);
  }, []);

  const updateSession = useCallback((s: FocusSession) => {
    setSessions((prev) => prev.map((item) => (item.id === s.id ? s : item)));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Today focus minutes
  const todayFocusMinutes = sessions
    .filter((s) => s.date === todayStr)
    .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);

  return (
    <FocusContext.Provider
      value={{
        mode,
        currentPhase,
        currentCycle,
        isRunning,
        isPaused,
        remainingSeconds,
        targetDurationSeconds,
        stopwatchSeconds,
        activePreset,
        presets,
        taskName,
        selectedTag,
        linkedHabitId,
        exitCount,
        timeOutsideSeconds,
        strictMode,
        wakeLockActive,
        sessions,
        setMode,
        setActivePreset,
        setPresets,
        setTaskName,
        setSelectedTag,
        setLinkedHabitId,
        setStrictMode,
        setCountdownDuration,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        stopSessionEarly,
        skipBreak,
        addSession,
        updateSession,
        deleteSession,
        todayFocusMinutes,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};
