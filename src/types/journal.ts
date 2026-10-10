export type MoodScore = 1 | 2 | 3 | 4 | 5; // 1 = Muy mal, 2 = Mal, 3 = Neutro, 4 = Bien, 5 = Excelente

export type TranscriptionStatus = 'idle' | 'transcribing' | 'completed' | 'error';

export type JournalBlockType = 'voice' | 'text' | 'photo';

export interface JournalBlockVoice {
  id: string;
  type: 'voice';
  time: string; // HH:mm
  audioData?: string; // base64 data URI
  audioMimeType?: string;
  durationSeconds: number;
  transcriptOriginal?: string;
  transcriptEdited?: string;
  status: TranscriptionStatus;
  errorMessage?: string;
}

export interface JournalBlockText {
  id: string;
  type: 'text';
  time: string; // HH:mm
  text: string;
}

export interface JournalPhotoItem {
  id: string;
  dataUrl: string; // JPEG data URI (compressed <= 1600px)
  originalDataUrl?: string; // Pristine unedited original
  rotation?: number; // 0, 90, 180, 270
  contrastEnhanced?: boolean;
}

export interface JournalBlockPhoto {
  id: string;
  type: 'photo';
  time: string; // HH:mm
  photos: JournalPhotoItem[]; // up to 5 photos per block
  transcriptOriginal?: string;
  transcriptEdited?: string;
  status: TranscriptionStatus;
  errorMessage?: string;
}

export type JournalBlock = JournalBlockVoice | JournalBlockText | JournalBlockPhoto;

export interface JournalEntry {
  id: string; // YYYY-MM-DD
  userId: string;
  date: string; // YYYY-MM-DD
  blocks?: JournalBlock[]; // blocks ordered by time
  
  // Legacy backward-compatibility fields:
  audioData?: string;
  audioMimeType?: string;
  durationSeconds?: number;
  transcriptOriginal?: string;
  transcriptEdited?: string;
  status?: TranscriptionStatus;
  additionalNote?: string;

  mood?: MoodScore;
  score?: number; // 1 to 10 rating of the day
  tags?: string[];
  summary?: string;
  recordedAt?: string; // ISO datetime
  updatedAt: string;
}

/**
 * Normalizes a journal entry ensuring `blocks` exists and includes any legacy audio/note data
 * Uses stable IDs and idempotent migration even if blocks already exist.
 */
export function normalizeJournalEntry(entry: JournalEntry | undefined): JournalEntry | undefined {
  if (!entry) return undefined;
  const blocks: JournalBlock[] = Array.isArray(entry.blocks) ? [...entry.blocks] : [];

  // If entry has legacy audio and no voice block yet, migrate it into a voice block
  const hasVoiceBlock = blocks.some((b) => b.type === 'voice');
  if (entry.audioData && !hasVoiceBlock) {
    blocks.unshift({
      id: `legacy-voice-${entry.date}`,
      type: 'voice',
      time: entry.recordedAt
        ? new Date(entry.recordedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        : '20:00',
      audioData: entry.audioData,
      audioMimeType: entry.audioMimeType || 'audio/webm',
      durationSeconds: entry.durationSeconds || 0,
      transcriptOriginal: entry.transcriptOriginal,
      transcriptEdited: entry.transcriptEdited,
      status: entry.status || 'completed',
    });
  }

  // If entry has legacy additionalNote and no text block
  if (
    entry.additionalNote &&
    !blocks.some((b) => b.type === 'text' && (b as JournalBlockText).text === entry.additionalNote)
  ) {
    blocks.push({
      id: `legacy-text-${entry.date}`,
      type: 'text',
      time: '20:05',
      text: entry.additionalNote,
    });
  }

  return {
    ...entry,
    blocks,
  };
}

/**
 * Checks if a journal entry has real non-empty content (audio, non-whitespace text, photos)
 */
export function hasActualJournalContent(entry: JournalEntry | undefined): boolean {
  if (!entry) return false;
  const norm = normalizeJournalEntry(entry);
  if (!norm || !norm.blocks || norm.blocks.length === 0) {
    return Boolean(
      (entry.audioData && entry.audioData.length > 0) ||
      (entry.additionalNote && entry.additionalNote.trim().length > 0) ||
      (entry.transcriptOriginal && entry.transcriptOriginal.trim().length > 0) ||
      (entry.transcriptEdited && entry.transcriptEdited.trim().length > 0)
    );
  }
  return norm.blocks.some((b) => {
    if (b.type === 'voice') {
      return Boolean(b.audioData || (b.transcriptOriginal && b.transcriptOriginal.trim().length > 0) || (b.transcriptEdited && b.transcriptEdited.trim().length > 0));
    }
    if (b.type === 'text') {
      return Boolean(b.text && b.text.trim().length > 0);
    }
    if (b.type === 'photo') {
      return Boolean((b.photos && b.photos.length > 0) || (b.transcriptOriginal && b.transcriptOriginal.trim().length > 0) || (b.transcriptEdited && b.transcriptEdited.trim().length > 0));
    }
    return false;
  });
}

/**
 * Extracts all searchable and combined text from a journal entry
 */
export function getCombinedEntryText(entry: JournalEntry | undefined): string {
  if (!entry) return '';
  const norm = normalizeJournalEntry(entry);
  if (!norm || !norm.blocks) return '';

  const chunks: string[] = [];
  norm.blocks.forEach((b) => {
    if (b.type === 'voice') {
      const t = b.transcriptEdited || b.transcriptOriginal;
      if (t) chunks.push(t);
    } else if (b.type === 'text') {
      if (b.text) chunks.push(b.text);
    } else if (b.type === 'photo') {
      const t = b.transcriptEdited || b.transcriptOriginal;
      if (t) chunks.push(t);
    }
  });

  if (chunks.length === 0) {
    if (entry.transcriptEdited) chunks.push(entry.transcriptEdited);
    else if (entry.transcriptOriginal) chunks.push(entry.transcriptOriginal);
    if (entry.additionalNote) chunks.push(entry.additionalNote);
  }

  return chunks.join('\n\n');
}

/**
 * Checks which block types exist in an entry
 */
export function getEntryBlockTypes(entry: JournalEntry | undefined): { hasVoice: boolean; hasText: boolean; hasPhoto: boolean } {
  if (!entry) return { hasVoice: false, hasText: false, hasPhoto: false };
  const norm = normalizeJournalEntry(entry);
  const blocks = norm?.blocks || [];

  return {
    hasVoice: blocks.some((b) => b.type === 'voice') || Boolean(entry.audioData),
    hasText: blocks.some((b) => b.type === 'text') || Boolean(entry.additionalNote),
    hasPhoto: blocks.some((b) => b.type === 'photo'),
  };
}
