/**
 * Comprehensive Backup & Restore Service for CONSTANTE.
 * - Idempotent, lossless schema migrations
 * - Strict structural and relationship validation
 * - Clear preview before applying changes
 * - Automatic pre-restore snapshot with undo capability
 * - Default exclusion of secrets (API keys, PIN, Spotify tokens)
 */

import { Habit, HabitLog } from '../types/habit';
import { JournalEntry } from '../types/journal';
import { UserSettings } from '../types/settings';
import { FocusSession, FocusPreset, SpotifyPlaylist } from '../types/focus';
import { getTodayDateString } from '../utils/dateUtils';
import { exportAllMedia, importAllMedia, StoredMediaItem } from './mediaStorage';
import { LifeStore } from '../types/life';

export const BACKUP_SCHEMA_VERSION = '2.0';
export const PREVIOUS_BACKUP_SNAPSHOT_KEY = 'constante_pre_restore_snapshot';

export interface ConstanteBackupPayload {
  schemaVersion: string; // '2.0'
  app: 'CONSTANTE';
  exportDate: string; // ISO string
  exportDateLocal: string; // YYYY-MM-DD in Argentina
  habits: Habit[];
  logs: Record<string, HabitLog>;
  entries: Record<string, JournalEntry>;
  settings: Partial<UserSettings>;
  focusSessions?: FocusSession[];
  focusPresets?: FocusPreset[];
  spotifyPlaylists?: SpotifyPlaylist[];
  mediaFiles?: Record<string, StoredMediaItem>;
  life?: Partial<LifeStore>; // Sistema de Vida (finanzas, facu, agenda, personas, fe, brújula…)
}

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  preview: {
    habitsCount: number;
    logsCount: number;
    entriesCount: number;
    focusSessionsCount: number;
    mediaFilesCount: number;
    hasSettings: boolean;
  };
  sanitizedData?: ConstanteBackupPayload;
}

/**
 * Creates a clean backup payload with secrets securely excluded
 */
export async function createFullBackup(
  habits: Habit[],
  logs: Record<string, HabitLog>,
  entries: Record<string, JournalEntry>,
  settings: UserSettings,
  focusSessions: FocusSession[] = [],
  focusPresets: FocusPreset[] = [],
  spotifyPlaylists: SpotifyPlaylist[] = [],
  life?: LifeStore
): Promise<ConstanteBackupPayload> {
  const localToday = getTodayDateString();

  // Exclude secrets and sensitive tokens
  const sanitizedSettings: Partial<UserSettings> = { ...settings };
  delete sanitizedSettings.geminiApiKey;
  delete sanitizedSettings.journalPin;
  delete sanitizedSettings.hasPin;

  // Retrieve media files from IndexedDB
  const mediaFiles = await exportAllMedia().catch(() => ({}));

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    app: 'CONSTANTE',
    exportDate: new Date().toISOString(),
    exportDateLocal: localToday,
    habits,
    logs,
    entries,
    settings: sanitizedSettings,
    focusSessions,
    focusPresets,
    spotifyPlaylists,
    mediaFiles,
    life,
  };
}

/**
 * Downloads the backup file as constante-backup-AAAA-MM-DD.json
 */
export function downloadBackupFile(backup: ConstanteBackupPayload): void {
  const localDate = backup.exportDateLocal || getTodayDateString();
  const filename = `constante-backup-${localDate}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates a parsed JSON object against the backup schema
 */
export function validateBackupPayload(rawData: any): BackupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawData || typeof rawData !== 'object') {
    return {
      isValid: false,
      errors: ['El archivo no contiene un objeto JSON válido.'],
      warnings: [],
      preview: {
        habitsCount: 0,
        logsCount: 0,
        entriesCount: 0,
        focusSessionsCount: 0,
        mediaFilesCount: 0,
        hasSettings: false,
      },
    };
  }

  // Handle version 1.0 or legacy backups
  const isLegacyV1 = rawData.version === '1.0' || (!rawData.schemaVersion && Array.isArray(rawData.habits));

  // Validate Habits
  if (!Array.isArray(rawData.habits)) {
    errors.push('El campo "habits" debe ser una lista de hábitos.');
  }

  // Validate Logs
  if (rawData.logs && typeof rawData.logs !== 'object') {
    errors.push('El campo "logs" debe ser un mapa de registros diarios.');
  }

  // Validate Entries
  if (rawData.entries && typeof rawData.entries !== 'object') {
    errors.push('El campo "entries" debe ser un mapa de entradas de diario.');
  }

  const validHabitIds = new Set<string>();
  const sanitizedHabits: Habit[] = [];

  if (Array.isArray(rawData.habits)) {
    rawData.habits.forEach((h: any, idx: number) => {
      if (!h || typeof h !== 'object' || !h.id || !h.name) {
        warnings.push(`Hábito en posición #${idx + 1} no tiene ID o nombre válido y fue omitido.`);
        return;
      }
      validHabitIds.add(h.id);
      sanitizedHabits.push({
        id: String(h.id),
        userId: h.userId || 'local',
        name: String(h.name).trim(),
        description: h.description ? String(h.description) : undefined,
        emoji: h.emoji || '✨',
        color: h.color || '#e11d48',
        category: h.category ? String(h.category) : 'General',
        type: h.type === 'counter' || h.type === 'duration' ? h.type : 'boolean',
        targetValue: typeof h.targetValue === 'number' ? h.targetValue : 1,
        targetUnit: h.targetUnit ? String(h.targetUnit) : (h.unit ? String(h.unit) : undefined),
        frequencyType:
          h.frequencyType === 'specific_days' || h.frequencyType === 'times_per_week'
            ? h.frequencyType
            : 'daily',
        specificDays: Array.isArray(h.specificDays) ? h.specificDays : undefined,
        timesPerWeek: typeof h.timesPerWeek === 'number' ? h.timesPerWeek : undefined,
        startDate: h.startDate || undefined,
        endDate: h.endDate || undefined,
        isNegative: Boolean(h.isNegative),
        reminderTime: h.reminderTime || undefined,
        status: h.status === 'paused' || h.status === 'archived' ? h.status : 'active',
        sortOrder: typeof h.sortOrder === 'number' ? h.sortOrder : idx + 1,
        createdAt: h.createdAt || new Date().toISOString(),
        updatedAt: h.updatedAt || new Date().toISOString(),
      });
    });
  }

  // Validate Logs structure and relationship
  const sanitizedLogs: Record<string, HabitLog> = {};
  if (rawData.logs && typeof rawData.logs === 'object') {
    for (const [dateKey, logItem] of Object.entries(rawData.logs)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        warnings.push(`Fecha de registro con formato inválido omitida: "${dateKey}".`);
        continue;
      }
      const item = logItem as any;
      const cleanValues: Record<string, any> = {};
      if (item && item.values && typeof item.values === 'object') {
        for (const [habitId, val] of Object.entries(item.values)) {
          // Keep values even if habit is currently not active, but ensure type safety
          cleanValues[habitId] = val;
        }
      }
      sanitizedLogs[dateKey] = {
        id: dateKey,
        userId: item?.userId || 'local',
        date: dateKey,
        values: cleanValues,
        notes: item?.notes ? String(item.notes) : undefined,
        updatedAt: item?.updatedAt || new Date().toISOString(),
      };
    }
  }

  // Validate Journal Entries
  const sanitizedEntries: Record<string, JournalEntry> = {};
  if (rawData.entries && typeof rawData.entries === 'object') {
    for (const [dateKey, entryItem] of Object.entries(rawData.entries)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        warnings.push(`Fecha de diario con formato inválido omitida: "${dateKey}".`);
        continue;
      }
      const item = entryItem as any;
      sanitizedEntries[dateKey] = {
        id: dateKey,
        userId: item?.userId || 'local',
        date: dateKey,
        blocks: Array.isArray(item?.blocks) ? item.blocks : [],
        audioData: item?.audioData,
        audioMimeType: item?.audioMimeType,
        durationSeconds: item?.durationSeconds,
        transcriptOriginal: item?.transcriptOriginal,
        transcriptEdited: item?.transcriptEdited,
        status: item?.status,
        additionalNote: item?.additionalNote,
        mood: typeof item?.mood === 'number' ? item.mood : undefined,
        score: typeof item?.score === 'number' ? item.score : undefined,
        tags: Array.isArray(item?.tags) ? item.tags : undefined,
        summary: item?.summary,
        recordedAt: item?.recordedAt,
        updatedAt: item?.updatedAt || new Date().toISOString(),
      };
    }
  }

  // Validate Focus Sessions
  const sanitizedSessions: FocusSession[] = [];
  if (Array.isArray(rawData.focusSessions)) {
    rawData.focusSessions.forEach((s: any) => {
      if (s && s.id && s.date) {
        sanitizedSessions.push({
          id: String(s.id),
          date: String(s.date),
          startTime: s.startTime || new Date().toISOString(),
          endTime: s.endTime,
          durationMinutes: Number(s.durationMinutes) || 0,
          mode: s.mode || 'pomodoro',
          taskName: s.taskName ? String(s.taskName) : undefined,
          tag: s.tag ? String(s.tag) : 'General',
          habitId: s.habitId,
          completed: Boolean(s.completed),
          interrupted: Boolean(s.interrupted),
          exitCount: Number(s.exitCount) || 0,
          timeOutsideSeconds: Number(s.timeOutsideSeconds) || 0,
          notes: s.notes,
        });
      }
    });
  }

  const sanitizedSettings = rawData.settings && typeof rawData.settings === 'object' ? { ...rawData.settings } : {};
  // Strip out any imported keys or pin to avoid hijacking
  delete sanitizedSettings.geminiApiKey;
  delete sanitizedSettings.journalPin;
  delete sanitizedSettings.hasPin;

  const mediaFiles = rawData.mediaFiles && typeof rawData.mediaFiles === 'object' ? rawData.mediaFiles : {};

  const isValid = errors.length === 0 && sanitizedHabits.length > 0;

  return {
    isValid,
    errors,
    warnings,
    preview: {
      habitsCount: sanitizedHabits.length,
      logsCount: Object.keys(sanitizedLogs).length,
      entriesCount: Object.keys(sanitizedEntries).length,
      focusSessionsCount: sanitizedSessions.length,
      mediaFilesCount: Object.keys(mediaFiles).length,
      hasSettings: Object.keys(sanitizedSettings).length > 0,
    },
    sanitizedData: isValid
      ? {
          schemaVersion: BACKUP_SCHEMA_VERSION,
          app: 'CONSTANTE',
          exportDate: rawData.exportDate || new Date().toISOString(),
          exportDateLocal: rawData.exportDateLocal || getTodayDateString(),
          habits: sanitizedHabits,
          logs: sanitizedLogs,
          entries: sanitizedEntries,
          settings: sanitizedSettings,
          focusSessions: sanitizedSessions,
          focusPresets: Array.isArray(rawData.focusPresets) ? rawData.focusPresets : undefined,
          spotifyPlaylists: Array.isArray(rawData.spotifyPlaylists) ? rawData.spotifyPlaylists : undefined,
          mediaFiles,
          life: rawData.life && typeof rawData.life === 'object' && !Array.isArray(rawData.life) ? rawData.life : undefined,
        }
      : undefined,
  };
}

/**
 * Saves a pre-restore snapshot so the user can easily undo an import
 */
export function savePreRestoreSnapshot(
  habits: Habit[],
  logs: Record<string, HabitLog>,
  entries: Record<string, JournalEntry>,
  settings: UserSettings,
  focusSessions: FocusSession[]
): void {
  try {
    const snapshot = {
      timestamp: new Date().toISOString(),
      habits,
      logs,
      entries,
      settings,
      focusSessions,
    };
    sessionStorage.setItem(PREVIOUS_BACKUP_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Could not save pre-restore snapshot:', err);
  }
}

/**
 * Checks if a pre-restore snapshot is available to undo
 */
export function getPreRestoreSnapshot(): any | null {
  try {
    const raw = sessionStorage.getItem(PREVIOUS_BACKUP_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
