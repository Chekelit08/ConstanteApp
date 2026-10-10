import { Habit, HabitLog, HabitValue } from '../types/habit';
import { JournalEntry } from '../types/journal';
import { UserSettings, DEFAULT_CATEGORIES } from '../types/settings';
import { INITIAL_DEFAULT_HABITS } from './sampleData';
import { getTodayDateString, parseDateString, getMondayIndexedDay } from '../utils/dateUtils';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

const LOCAL_STORAGE_PREFIX = 'constante_habito_';

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'config',
  userId: 'local',
  theme: 'system',
  accentColor: '#E11D48', // Carmín Editorial
  firstDayOfWeek: 1, // Lunes
  notificationsEnabled: false,
  reminderTime: '21:00',
  hasPin: false,
  autoAiSummary: true,
  customCategories: DEFAULT_CATEGORIES,
  updatedAt: new Date().toISOString(),
};

/**
 * Checks if a habit is scheduled to occur on a given date string (YYYY-MM-DD)
 */
export function isHabitScheduledOnDate(habit: Habit, dateStr: string): boolean {
  if (habit.status === 'archived') return false;
  if (habit.startDate && dateStr < habit.startDate) return false;
  if (habit.endDate && dateStr > habit.endDate) return false;

  if (habit.frequencyType === 'daily') {
    return true;
  }

  if (habit.frequencyType === 'specific_days') {
    const date = parseDateString(dateStr);
    const dayOfWeek = getMondayIndexedDay(date); // 0 = Lun, 6 = Dom
    return habit.specificDays ? habit.specificDays.includes(dayOfWeek) : true;
  }

  // 'times_per_week': available all days as an option towards the weekly quota
  return true;
}

/**
 * Determines if a habit is successfully completed given its logged value
 */
export function isHabitCompleted(habit: Habit, value: HabitValue | undefined): boolean {
  if (value === undefined || value === null) return false;

  if (habit.type === 'boolean') {
    return Boolean(value);
  }

  if (typeof value === 'number') {
    const target = habit.targetValue || 1;
    return value >= target;
  }

  return false;
}

/**
 * Returns completion progress 0.0 to 1.0
 */
export function getHabitProgress(habit: Habit, value: HabitValue | undefined): number {
  if (value === undefined || value === null) return 0;
  if (habit.type === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'number') {
    const target = habit.targetValue || 1;
    return Math.min(1, Math.max(0, value / target));
  }
  return 0;
}

/**
 * Local Storage helpers (Unified reading to bridge prefixed and raw keys without loss)
 */
export function getLocalData<T>(key: string, defaultValue: T): T {
  try {
    // 1. Direct key
    const direct = localStorage.getItem(key);
    if (direct !== null) return JSON.parse(direct);

    // 2. Prefixed key
    const prefixed = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    if (prefixed !== null) return JSON.parse(prefixed);

    // 3. Fallback if key starts with constante_habito_ or constante_
    if (key.startsWith(LOCAL_STORAGE_PREFIX)) {
      const stripped = key.slice(LOCAL_STORAGE_PREFIX.length);
      const strippedItem = localStorage.getItem(stripped);
      if (strippedItem !== null) return JSON.parse(strippedItem);
    }

    return defaultValue;
  } catch (e) {
    console.error('Error reading localStorage', e);
    return defaultValue;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    const storageKey = key.startsWith(LOCAL_STORAGE_PREFIX) ? key : LOCAL_STORAGE_PREFIX + key;
    localStorage.setItem(storageKey, serialized);

    // For unified keys starting with constante_, also keep the plain key updated
    if (key.startsWith('constante_')) {
      localStorage.setItem(key, serialized);
    }
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
}

/**
 * Remote Firestore operations with local fallback
 */
export async function syncHabitToRemote(userId: string, habit: Habit): Promise<void> {
  if (!userId || userId === 'local') return;
  const path = `users/${userId}/habits/${habit.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'habits', habit.id), habit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteHabitFromRemote(userId: string, habitId: string): Promise<void> {
  if (!userId || userId === 'local') return;
  const path = `users/${userId}/habits/${habitId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncLogToRemote(userId: string, log: HabitLog): Promise<void> {
  if (!userId || userId === 'local') return;
  const path = `users/${userId}/logs/${log.date}`;
  try {
    await setDoc(doc(db, 'users', userId, 'logs', log.date), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncEntryToRemote(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId || userId === 'local') return;
  const path = `users/${userId}/entries/${entry.date}`;
  try {
    await setDoc(doc(db, 'users', userId, 'entries', entry.date), entry);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEntryFromRemote(userId: string, date: string): Promise<void> {
  if (!userId || userId === 'local') return;
  const path = `users/${userId}/entries/${date}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'entries', date));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncSettingsToRemote(userId: string, settings: UserSettings): Promise<void> {
  if (!userId || userId === 'local') return;
  const path = `users/${userId}/settings/config`;
  try {
    await setDoc(doc(db, 'users', userId, 'settings', 'config'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
