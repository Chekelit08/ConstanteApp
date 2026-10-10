import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Habit, HabitLog, HabitValue } from '../types/habit';
import { JournalEntry } from '../types/journal';
import { UserSettings } from '../types/settings';
import { FocusSession } from '../types/focus';
import {
  DEFAULT_SETTINGS,
  getLocalData,
  setLocalData,
  isHabitScheduledOnDate,
  isHabitCompleted,
  syncHabitToRemote,
  deleteHabitFromRemote,
  syncLogToRemote,
  syncEntryToRemote,
  deleteEntryFromRemote,
  syncSettingsToRemote,
} from '../services/dataStorage';
import {
  ConstanteBackupPayload,
  savePreRestoreSnapshot,
  getPreRestoreSnapshot,
} from '../services/backupService';
import { importAllMedia } from '../services/mediaStorage';
import { INITIAL_DEFAULT_HABITS, generateThreeMonthsDemoData } from '../services/sampleData';
import { getTodayDateString } from '../utils/dateUtils';
import { fireSubtleConfetti } from '../utils/confetti';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';

export function useHabitData(user: User | null) {
  const userId = user ? user.uid : 'local';
  const prevUserIdRef = useRef(userId);

  // State
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = getLocalData<Habit[]>(`habits_${userId}`, []);
    if (saved.length > 0) return saved;
    // First time setup: 6 starter habits
    return INITIAL_DEFAULT_HABITS.map((h) => ({
      ...h,
      userId,
    }));
  });

  const [logs, setLogs] = useState<Record<string, HabitLog>>(() => {
    return getLocalData<Record<string, HabitLog>>(`logs_${userId}`, {});
  });

  const [entries, setEntries] = useState<Record<string, JournalEntry>>(() => {
    return getLocalData<Record<string, JournalEntry>>(`entries_${userId}`, {});
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    return getLocalData<UserSettings>(`settings_${userId}`, {
      ...DEFAULT_SETTINGS,
      userId,
    });
  });

  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Account switching isolation: load user space before persisting
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      const savedHabits = getLocalData<Habit[]>(`habits_${userId}`, []);
      setHabits(
        savedHabits.length > 0
          ? savedHabits
          : INITIAL_DEFAULT_HABITS.map((h) => ({ ...h, userId }))
      );
      setLogs(getLocalData<Record<string, HabitLog>>(`logs_${userId}`, {}));
      setEntries(getLocalData<Record<string, JournalEntry>>(`entries_${userId}`, {}));
      setSettings(getLocalData<UserSettings>(`settings_${userId}`, { ...DEFAULT_SETTINGS, userId }));
    }
  }, [userId]);

  // Keep local storage updated only for the active user
  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      setLocalData(`habits_${userId}`, habits);
    }
  }, [habits, userId]);

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      setLocalData(`logs_${userId}`, logs);
    }
  }, [logs, userId]);

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      setLocalData(`entries_${userId}`, entries);
    }
  }, [entries, userId]);

  useEffect(() => {
    if (prevUserIdRef.current === userId) {
      setLocalData(`settings_${userId}`, settings);
    }
  }, [settings, userId]);

  // Firestore real-time listeners when user is authenticated
  useEffect(() => {
    if (!user || user.uid === 'local') {
      setSyncStatus('local');
      return;
    }

    setSyncStatus('syncing');

    // Habits listener
    const habitsCol = collection(db, 'users', user.uid, 'habits');
    const unsubHabits = onSnapshot(
      habitsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteHabits: Habit[] = [];
          snapshot.forEach((docSnap) => {
            remoteHabits.push(docSnap.data() as Habit);
          });
          remoteHabits.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setHabits(remoteHabits);
        } else {
          // If remote empty, initialize with current local habits
          habits.forEach((h) => syncHabitToRemote(user.uid, h));
        }
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      },
      (error) => {
        console.warn('Habits firestore snapshot error:', error);
        setSyncStatus('error');
      }
    );

    // Logs listener
    const logsCol = collection(db, 'users', user.uid, 'logs');
    const unsubLogs = onSnapshot(
      logsCol,
      (snapshot) => {
        const remoteLogs: Record<string, HabitLog> = {};
        snapshot.forEach((docSnap) => {
          const l = docSnap.data() as HabitLog;
          remoteLogs[l.date] = l;
        });
        setLogs((prev) => ({ ...prev, ...remoteLogs }));
      },
      (error) => {
        console.warn('Logs firestore snapshot error:', error);
      }
    );

    // Entries listener
    const entriesCol = collection(db, 'users', user.uid, 'entries');
    const unsubEntries = onSnapshot(
      entriesCol,
      (snapshot) => {
        const remoteEntries: Record<string, JournalEntry> = {};
        snapshot.forEach((docSnap) => {
          const e = docSnap.data() as JournalEntry;
          remoteEntries[e.date] = e;
        });
        setEntries((prev) => ({ ...prev, ...remoteEntries }));
      },
      (error) => {
        console.warn('Entries firestore snapshot error:', error);
      }
    );

    // Settings listener
    const settingsDoc = doc(db, 'users', user.uid, 'settings', 'config');
    const unsubSettings = onSnapshot(
      settingsDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as UserSettings);
        }
      },
      (error) => {
        console.warn('Settings firestore snapshot error:', error);
      }
    );

    return () => {
      unsubHabits();
      unsubLogs();
      unsubEntries();
      unsubSettings();
    };
  }, [user]);

  /**
   * Toggle a boolean habit or toggle completed state for counter/duration
   */
  const toggleHabit = useCallback(
    (habitId: string, dateStr: string) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const currentLog = logs[dateStr] || {
        id: dateStr,
        userId,
        date: dateStr,
        values: {},
        updatedAt: new Date().toISOString(),
      };

      const currentValue = currentLog.values[habitId];
      let newValue: HabitValue;

      if (habit.type === 'boolean') {
        newValue = !currentValue;
      } else {
        // For counter or duration: if already completed, reset to 0; if not, set to targetValue
        const target = habit.targetValue || 1;
        const isComp = isHabitCompleted(habit, currentValue);
        newValue = isComp ? 0 : target;
      }

      const updatedValues = {
        ...currentLog.values,
        [habitId]: newValue,
      };

      const updatedLog: HabitLog = {
        ...currentLog,
        values: updatedValues,
        updatedAt: new Date().toISOString(),
      };

      setLogs((prev) => ({
        ...prev,
        [dateStr]: updatedLog,
      }));

      syncLogToRemote(userId, updatedLog);

      // Check if all scheduled habits for this day are now completed!
      const scheduledHabits = habits.filter(
        (h) => h.status === 'active' && isHabitScheduledOnDate(h, dateStr)
      );
      if (scheduledHabits.length > 0) {
        const allCompleted = scheduledHabits.every((h) =>
          isHabitCompleted(h, updatedValues[h.id])
        );
        if (allCompleted) {
          fireSubtleConfetti();
        }
      }
    },
    [habits, logs, userId]
  );

  /**
   * Set specific value for counter or duration
   */
  const setHabitValue = useCallback(
    (habitId: string, dateStr: string, value: HabitValue) => {
      const currentLog = logs[dateStr] || {
        id: dateStr,
        userId,
        date: dateStr,
        values: {},
        updatedAt: new Date().toISOString(),
      };

      const updatedValues = {
        ...currentLog.values,
        [habitId]: value,
      };

      const updatedLog: HabitLog = {
        ...currentLog,
        values: updatedValues,
        updatedAt: new Date().toISOString(),
      };

      setLogs((prev) => ({
        ...prev,
        [dateStr]: updatedLog,
      }));

      syncLogToRemote(userId, updatedLog);

      // Check if all scheduled habits for this day are now completed!
      const scheduledHabits = habits.filter(
        (h) => h.status === 'active' && isHabitScheduledOnDate(h, dateStr)
      );
      if (scheduledHabits.length > 0) {
        const allCompleted = scheduledHabits.every((h) =>
          isHabitCompleted(h, updatedValues[h.id])
        );
        if (allCompleted) {
          fireSubtleConfetti();
        }
      }
    },
    [habits, logs, userId]
  );

  /**
   * Save (create or edit) habit
   */
  const saveHabit = useCallback(
    (habit: Habit) => {
      setHabits((prev) => {
        const exists = prev.some((h) => h.id === habit.id);
        let updated: Habit[];
        if (exists) {
          updated = prev.map((h) => (h.id === habit.id ? habit : h));
        } else {
          updated = [...prev, habit];
        }
        updated.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        return updated;
      });

      syncHabitToRemote(userId, habit);
    },
    [userId]
  );

  /**
   * Delete habit
   */
  const deleteHabit = useCallback(
    (habitId: string) => {
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      deleteHabitFromRemote(userId, habitId);
    },
    [userId]
  );

  /**
   * Reorder habits
   */
  const reorderHabits = useCallback(
    (ordered: Habit[]) => {
      const withNewOrders = ordered.map((h, idx) => ({
        ...h,
        sortOrder: idx + 1,
      }));
      setHabits(withNewOrders);
      withNewOrders.forEach((h) => syncHabitToRemote(userId, h));
    },
    [userId]
  );

  /**
   * Save journal entry
   */
  const saveJournalEntry = useCallback(
    (entry: JournalEntry) => {
      setEntries((prev) => ({
        ...prev,
        [entry.date]: entry,
      }));
      syncEntryToRemote(userId, entry);
    },
    [userId]
  );

  /**
   * Delete journal entry
   */
  const deleteJournalEntry = useCallback(
    (dateStr: string) => {
      setEntries((prev) => {
        const next = { ...prev };
        delete next[dateStr];
        return next;
      });
      deleteEntryFromRemote(userId, dateStr);
    },
    [userId]
  );

  /**
   * Save user settings
   */
  const saveSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setSettings((prev) => {
        const merged: UserSettings = {
          ...prev,
          ...newSettings,
          updatedAt: new Date().toISOString(),
        };
        syncSettingsToRemote(userId, merged);
        return merged;
      });
    },
    [userId]
  );

  /**
   * Load 3 months of rich demo data
   */
  const loadThreeMonthsDemo = useCallback(() => {
    const demo = generateThreeMonthsDemoData(userId);
    setHabits(demo.habits);
    setLogs(demo.logs as Record<string, HabitLog>);
    const entryMap: Record<string, JournalEntry> = {};
    demo.entries.forEach((e) => {
      entryMap[e.date] = e;
    });
    setEntries(entryMap);

    // Sync to remote if logged in
    demo.habits.forEach((h) => syncHabitToRemote(userId, h));
    Object.values(demo.logs).forEach((l) => syncLogToRemote(userId, l as HabitLog));
    demo.entries.forEach((e) => syncEntryToRemote(userId, e));
  }, [userId]);

  /**
   * Restores a validated backup payload (Merge or Replace mode)
   * Idempotent and lossless with pre-restore snapshot
   */
  const restoreBackup = useCallback(
    async (backup: ConstanteBackupPayload, mode: 'merge' | 'replace') => {
      // 1. Save pre-restore snapshot so the user can easily undo
      const existingFocusSessions = getLocalData<FocusSession[]>(`focus_sessions_${userId}`, []);
      savePreRestoreSnapshot(habits, logs, entries, settings, existingFocusSessions);

      // 2. Restore media files into IndexedDB
      if (backup.mediaFiles && Object.keys(backup.mediaFiles).length > 0) {
        await importAllMedia(backup.mediaFiles).catch(() => {});
      }

      // 3. Restore habits
      let nextHabits: Habit[];
      if (mode === 'replace') {
        nextHabits = backup.habits.map((h) => ({ ...h, userId }));
      } else {
        const habitMap = new Map<string, Habit>();
        habits.forEach((h) => habitMap.set(h.id, h));
        backup.habits.forEach((h) => habitMap.set(h.id, { ...h, userId }));
        nextHabits = Array.from(habitMap.values());
      }
      nextHabits.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setHabits(nextHabits);

      // 4. Restore logs
      let nextLogs: Record<string, HabitLog>;
      if (mode === 'replace') {
        nextLogs = backup.logs;
      } else {
        nextLogs = { ...logs };
        Object.entries(backup.logs).forEach(([date, log]) => {
          nextLogs[date] = {
            ...log,
            userId,
            values: { ...(nextLogs[date]?.values || {}), ...log.values },
          };
        });
      }
      setLogs(nextLogs);

      // 5. Restore entries
      let nextEntries: Record<string, JournalEntry>;
      if (mode === 'replace') {
        nextEntries = backup.entries;
      } else {
        nextEntries = { ...entries };
        Object.entries(backup.entries).forEach(([date, entry]) => {
          nextEntries[date] = {
            ...entry,
            userId,
          };
        });
      }
      setEntries(nextEntries);

      // 6. Restore focus sessions
      if (backup.focusSessions) {
        let nextSessions: FocusSession[];
        if (mode === 'replace') {
          nextSessions = backup.focusSessions;
        } else {
          const sMap = new Map<string, FocusSession>();
          existingFocusSessions.forEach((s) => sMap.set(s.id, s));
          backup.focusSessions.forEach((s) => sMap.set(s.id, s));
          nextSessions = Array.from(sMap.values());
        }
        setLocalData(`focus_sessions_${userId}`, nextSessions);
      }

      // 7. Restore settings if present
      if (backup.settings) {
        setSettings((prev) => ({
          ...prev,
          ...backup.settings,
          userId,
          updatedAt: new Date().toISOString(),
        }));
      }

      // 8. Remote sync if authenticated
      if (user && user.uid !== 'local') {
        nextHabits.forEach((h) => syncHabitToRemote(user.uid, h));
        Object.values(nextLogs).forEach((l) => syncLogToRemote(user.uid, l));
        Object.values(nextEntries).forEach((e) => syncEntryToRemote(user.uid, e));
      }
    },
    [habits, logs, entries, settings, userId, user]
  );

  /**
   * Undoes the last import using the saved pre-restore snapshot
   */
  const undoRestore = useCallback(() => {
    const snapshot = getPreRestoreSnapshot();
    if (!snapshot) return false;

    if (snapshot.habits) setHabits(snapshot.habits);
    if (snapshot.logs) setLogs(snapshot.logs);
    if (snapshot.entries) setEntries(snapshot.entries);
    if (snapshot.settings) setSettings(snapshot.settings);
    if (snapshot.focusSessions) setLocalData(`focus_sessions_${userId}`, snapshot.focusSessions);

    if (user && user.uid !== 'local') {
      snapshot.habits?.forEach((h: Habit) => syncHabitToRemote(user.uid, h));
    }
    return true;
  }, [userId, user]);

  /**
   * Reset all account data
   */
  const resetAllData = useCallback(() => {
    const freshHabits = INITIAL_DEFAULT_HABITS.map((h) => ({
      ...h,
      userId,
    }));
    setHabits(freshHabits);
    setLogs({});
    setEntries({});
    setSettings({
      ...DEFAULT_SETTINGS,
      userId,
    });
    setLocalData(`focus_sessions_${userId}`, []);
    localStorage.removeItem(`constante_habito_habits_${userId}`);
    localStorage.removeItem(`constante_habito_logs_${userId}`);
    localStorage.removeItem(`constante_habito_entries_${userId}`);
    localStorage.removeItem(`constante_habito_settings_${userId}`);
  }, [userId]);

  /**
   * Re-synchronizes all collections to remote Firestore
   */
  const retrySync = useCallback(async () => {
    if (!user || user.uid === 'local') return;
    setSyncStatus('syncing');

    try {
      const syncPromises = [
        ...habits.map((h) => syncHabitToRemote(user.uid, h)),
        ...Object.values(logs).map((l) => syncLogToRemote(user.uid, l)),
        ...Object.values(entries).map((e) => syncEntryToRemote(user.uid, e)),
        syncSettingsToRemote(user.uid, settings),
      ];

      await Promise.all(syncPromises);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Retry sync failed:', err);
      setSyncStatus('error');
    }
  }, [user, habits, logs, entries, settings]);

  return {
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
  };
}
