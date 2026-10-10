import React, { useState, useMemo, useEffect } from 'react';
import {
  JournalEntry,
  JournalBlock,
  JournalBlockVoice,
  JournalBlockText,
  JournalBlockPhoto,
  normalizeJournalEntry,
  getCombinedEntryText,
  hasActualJournalContent,
} from '../types/journal';
import { Habit, HabitLog } from '../types/habit';
import { UserSettings } from '../types/settings';
import { TextJournalBlockEditor } from '../components/journal/TextJournalBlockEditor';
import { PhotoJournalBlockEditor } from '../components/journal/PhotoJournalBlockEditor';
import { VoiceJournalBlockEditor } from '../components/journal/VoiceJournalBlockEditor';
import { JournalTimeline } from '../components/journal/JournalTimeline';
import { JournalCalendar } from '../components/journal/JournalCalendar';
import { PinModal } from '../components/common/PinModal';
import { summarizeTranscriptApi } from '../services/geminiClient';
import {
  getTodayDateString,
  addDays,
  formatArgentineDate,
} from '../utils/dateUtils';
import {
  Mic,
  FileText,
  Camera,
  Calendar,
  List,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
  Printer,
  Trash2,
  Plus,
  Loader2,
  Smile,
  Star,
  CheckCircle2,
} from 'lucide-react';

interface JournalViewProps {
  entries: Record<string, JournalEntry>;
  habits: Habit[];
  logs: Record<string, HabitLog>;
  settings: UserSettings;
  onSaveEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (dateStr: string) => void;
  userId: string;
  initialDateStr?: string;
}

const MOODS = [
  { val: 1, label: 'Muy mal', emoji: '😞' },
  { val: 2, label: 'Bajo', emoji: '😕' },
  { val: 3, label: 'Neutro', emoji: '😐' },
  { val: 4, label: 'Bien', emoji: '🙂' },
  { val: 5, label: 'Excelente', emoji: '🔥' },
];

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  habits,
  logs,
  settings,
  onSaveEntry,
  onDeleteEntry,
  userId,
  initialDateStr,
}) => {
  const actualTodayStr = getTodayDateString();
  const [activeDateStr, setActiveDateStr] = useState<string>(initialDateStr || actualTodayStr);
  const [viewMode, setViewMode] = useState<'day' | 'timeline' | 'calendar'>('day');

  // Keep active date in sync if parent changes initialDateStr
  useEffect(() => {
    if (initialDateStr && initialDateStr !== activeDateStr) {
      setActiveDateStr(initialDateStr);
    }
  }, [initialDateStr]);

  // PIN Protection State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!settings.hasPin);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  // Normalize current day entry
  const currentEntry = useMemo(() => {
    const raw = entries[activeDateStr];
    return raw ? normalizeJournalEntry(raw)! : null;
  }, [entries, activeDateStr]);

  const isSelectedDateToday = activeDateStr === actualTodayStr;

  // Streak count across days with non-empty journal entries
  // If only today has an entry, streak is 1. If today has none, checks unbroken run ending yesterday.
  const journalStreak = useMemo(() => {
    let streak = 0;
    const todayHas = hasActualJournalContent(entries[actualTodayStr]);
    let checkDate = todayHas ? actualTodayStr : addDays(actualTodayStr, -1);

    while (streak < 365) {
      if (hasActualJournalContent(entries[checkDate])) {
        streak++;
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }
    return streak;
  }, [entries, actualTodayStr]);

  // Current blocks ordered by time
  const blocks: JournalBlock[] = useMemo(() => {
    if (!currentEntry || !Array.isArray(currentEntry.blocks)) return [];
    return [...currentEntry.blocks].sort((a, b) => a.time.localeCompare(b.time));
  }, [currentEntry]);

  const getCurrentTimeString = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Helper to ensure an entry exists before adding blocks without inventing mood or score
  const getOrCreateEntry = (): JournalEntry => {
    if (currentEntry) return currentEntry;
    return {
      id: activeDateStr,
      userId,
      date: activeDateStr,
      blocks: [],
      mood: undefined,
      score: undefined,
      tags: ['Diario'],
      updatedAt: new Date().toISOString(),
    };
  };

  // Add a Voice Block
  const handleAddVoiceBlock = () => {
    const base = getOrCreateEntry();
    const newBlock: JournalBlockVoice = {
      id: `voice-${Date.now()}`,
      type: 'voice',
      time: getCurrentTimeString(),
      durationSeconds: 0,
      status: 'idle',
    };
    onSaveEntry({
      ...base,
      blocks: [...(base.blocks || []), newBlock],
      updatedAt: new Date().toISOString(),
    });
  };

  // Add a Text Block
  const handleAddTextBlock = () => {
    const base = getOrCreateEntry();
    const newBlock: JournalBlockText = {
      id: `text-${Date.now()}`,
      type: 'text',
      time: getCurrentTimeString(),
      text: '',
    };
    onSaveEntry({
      ...base,
      blocks: [...(base.blocks || []), newBlock],
      updatedAt: new Date().toISOString(),
    });
  };

  // Add a Photo Block
  const handleAddPhotoBlock = () => {
    const base = getOrCreateEntry();
    const newBlock: JournalBlockPhoto = {
      id: `photo-${Date.now()}`,
      type: 'photo',
      time: getCurrentTimeString(),
      photos: [],
      status: 'idle',
    };
    onSaveEntry({
      ...base,
      blocks: [...(base.blocks || []), newBlock],
      updatedAt: new Date().toISOString(),
    });
  };

  // Update a single block
  const handleUpdateBlock = (updatedBlock: JournalBlock) => {
    const base = getOrCreateEntry();
    const currentList = base.blocks || [];
    const updatedBlocks = currentList.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));
    onSaveEntry({
      ...base,
      blocks: updatedBlocks,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete a single block
  const handleDeleteBlock = (blockId: string) => {
    if (!currentEntry) return;
    const currentList = currentEntry.blocks || [];
    const remaining = currentList.filter((b) => b.id !== blockId);
    if (remaining.length === 0 && !currentEntry.summary) {
      onDeleteEntry(activeDateStr);
    } else {
      onSaveEntry({
        ...currentEntry,
        blocks: remaining,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Generate combined AI summary & tags
  const handleGenerateSummary = async () => {
    if (!currentEntry) return;
    const combinedText = getCombinedEntryText(currentEntry);
    if (!combinedText.trim()) return;

    setIsSummarizing(true);
    try {
      const res = await summarizeTranscriptApi(combinedText, settings.geminiApiKey);
      onSaveEntry({
        ...currentEntry,
        summary: res.summary,
        tags: res.tags,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Error generating summary:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Print day or month in PDF
  const handlePrintPdf = () => {
    window.print();
  };

  // Locked by PIN check
  if (!isUnlocked && settings.hasPin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 max-w-md mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-accent-subtle text-accent flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wider text-main">
            Diario Protegido con PIN
          </h3>
          <p className="text-xs sm:text-sm text-muted">
            Tus grabaciones de voz, notas escritas y fotos manuscritas están cifradas en tu dispositivo.
          </p>
        </div>
        <PinModal
          isOpen={true}
          correctPin={settings.journalPin || ''}
          onSuccess={() => setIsUnlocked(true)}
          onClose={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          HEADER BAR: Title, Navigation Tabs & Print
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
              BITÁCORA PERSONAL & REFLEXIÓN
            </span>
            {journalStreak > 0 && (
              <span className="text-[10px] font-mono font-bold text-accent bg-accent-subtle px-2 py-0.5 rounded-full">
                🔥 {journalStreak} {journalStreak === 1 ? 'día' : 'días'}
              </span>
            )}
          </div>
          <h2 className="font-['Oswald'] text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wider text-main mt-0.5 clamp-title">
            Diario
          </h2>
        </div>

        {/* View mode toggle: Día · Línea de tiempo · Calendario */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-elevated rounded-xl p-1 border border-app text-xs font-semibold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition min-h-[38px] cursor-pointer ${
                viewMode === 'day' ? 'bg-accent text-accent-contrast shadow-2xs font-bold' : 'text-muted hover:text-main'
              }`}
            >
              Día actual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition min-h-[38px] cursor-pointer ${
                viewMode === 'timeline' ? 'bg-accent text-accent-contrast shadow-2xs font-bold' : 'text-muted hover:text-main'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Línea</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition min-h-[38px] cursor-pointer ${
                viewMode === 'calendar' ? 'bg-accent text-accent-contrast shadow-2xs font-bold' : 'text-muted hover:text-main'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="p-2 rounded-xl bg-surface-elevated hover:bg-surface border border-app text-muted hover:text-main transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Imprimir o exportar en PDF"
            aria-label="Exportar en PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 1: DAY VIEW ("Grabar / Ver Día")
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'day' && (
        <div className="space-y-6">
          {/* Date Selector Navigation ("← Anterior", "Hoy", "Siguiente →") */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-surface border border-app shadow-2xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                {isSelectedDateToday ? 'HOY' : 'REGISTRO RETROACTIVO'}
              </span>
              <h3 className="font-['Oswald'] text-xl sm:text-2xl font-bold uppercase tracking-wider text-main">
                {formatArgentineDate(activeDateStr, { includeDayName: true })}
              </h3>
            </div>

            <div className="flex items-center bg-surface-elevated rounded-xl p-1 border border-app">
              <button
                type="button"
                onClick={() => setActiveDateStr(addDays(activeDateStr, -1))}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-main hover:bg-surface transition cursor-pointer min-h-[44px]"
                aria-label="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDateStr(actualTodayStr)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition min-h-[44px] cursor-pointer ${
                  isSelectedDateToday ? 'bg-accent text-accent-contrast shadow-2xs' : 'text-accent hover:bg-surface'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setActiveDateStr(addDays(activeDateStr, 1))}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-main hover:bg-surface transition cursor-pointer min-h-[44px]"
                aria-label="Día siguiente"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3 LARGE ACTION BUTTONS: 🎙 Voz · ⌨ Escribir · 📷 Foto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            {/* 1. Voz */}
            <button
              type="button"
              onClick={handleAddVoiceBlock}
              className="p-4 sm:p-5 rounded-3xl bg-surface border border-app hover:border-accent hover:shadow-xs transition text-left flex items-center gap-3.5 group cursor-pointer min-h-[64px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <span className="font-['Oswald'] text-base font-bold uppercase tracking-wider text-main group-hover:text-accent transition block">
                  🎙 Voz
                </span>
                <span className="text-[11px] text-muted">
                  Grabar audio y transcribir
                </span>
              </div>
            </button>

            {/* 2. Escribir */}
            <button
              type="button"
              onClick={handleAddTextBlock}
              className="p-4 sm:p-5 rounded-3xl bg-surface border border-app hover:border-accent hover:shadow-xs transition text-left flex items-center gap-3.5 group cursor-pointer min-h-[64px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-elevated text-main flex items-center justify-center shrink-0 border border-app group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <div>
                <span className="font-['Oswald'] text-base font-bold uppercase tracking-wider text-main group-hover:text-accent transition block">
                  ⌨ Escribir
                </span>
                <span className="text-[11px] text-muted">
                  Editor de texto rápido
                </span>
              </div>
            </button>

            {/* 3. Foto */}
            <button
              type="button"
              onClick={handleAddPhotoBlock}
              className="p-4 sm:p-5 rounded-3xl bg-surface border border-app hover:border-accent hover:shadow-xs transition text-left flex items-center gap-3.5 group cursor-pointer min-h-[64px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-elevated text-main flex items-center justify-center shrink-0 border border-app group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6 text-accent" />
              </div>
              <div>
                <span className="font-['Oswald'] text-base font-bold uppercase tracking-wider text-main group-hover:text-accent transition block">
                  📷 Foto
                </span>
                <span className="text-[11px] text-muted">
                  Manuscrito a texto (OCR)
                </span>
              </div>
            </button>
          </div>

          {/* DAY METRICS: Ánimo & Calificación (1 a 10) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-app shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {/* Mood selector */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted uppercase font-mono tracking-wider">
                  Ánimo:
                </span>
                <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-app">
                  {MOODS.map((m) => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => {
                        const base = getOrCreateEntry();
                        onSaveEntry({ ...base, mood: m.val as any, updatedAt: new Date().toISOString() });
                      }}
                      className={`p-1.5 rounded-lg text-lg transition min-h-[36px] cursor-pointer ${
                        currentEntry?.mood === m.val
                          ? 'bg-accent-subtle ring-1 ring-accent scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Score selector (1 to 10) */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted uppercase font-mono tracking-wider">
                  Calificación:
                </span>
                <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-app overflow-x-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const base = getOrCreateEntry();
                        onSaveEntry({ ...base, score: s, updatedAt: new Date().toISOString() });
                      }}
                      className={`w-6 h-6 rounded-md font-mono text-[11px] font-bold transition cursor-pointer ${
                        currentEntry?.score === s
                          ? 'bg-accent text-accent-contrast'
                          : 'text-muted hover:text-main'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Summary Banner if generated */}
            {currentEntry?.summary && (
              <div className="p-3.5 rounded-2xl bg-surface-elevated border border-app/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-accent">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Resumen Inteligente del Día</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={isSummarizing}
                    className="text-[11px] text-muted hover:text-main hover:underline cursor-pointer"
                  >
                    Regenerar
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-main italic leading-relaxed">
                  "{currentEntry.summary}"
                </p>
                {currentEntry.tags && currentEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {currentEntry.tags.map((t) => (
                      <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-app text-muted">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LIST OF BLOCKS FOR TODAY */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-app">
              <span className="font-['Oswald'] text-base font-bold uppercase tracking-wider text-main">
                Bloques del Día ({blocks.length})
              </span>
              {blocks.length > 0 && !currentEntry?.summary && (
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
                >
                  {isSummarizing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Generar resumen del día</span>
                </button>
              )}
            </div>

            {blocks.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-app bg-surface-elevated/40 space-y-3">
                <FileText className="w-12 h-12 mx-auto text-dim opacity-50" />
                <h4 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main">
                  Sin bloques registrados para esta fecha
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Usá los botones de arriba para grabar tu voz, escribir reflexiones o fotografiar páginas escritas a mano.
                </p>
              </div>
            ) : (
              blocks.map((block) => {
                if (block.type === 'voice') {
                  return (
                    <VoiceJournalBlockEditor
                      key={block.id}
                      block={block}
                      geminiApiKey={settings.geminiApiKey}
                      onUpdate={handleUpdateBlock}
                      onDelete={handleDeleteBlock}
                    />
                  );
                }
                if (block.type === 'text') {
                  return (
                    <TextJournalBlockEditor
                      key={block.id}
                      block={block}
                      onUpdate={handleUpdateBlock}
                      onDelete={handleDeleteBlock}
                    />
                  );
                }
                if (block.type === 'photo') {
                  return (
                    <PhotoJournalBlockEditor
                      key={block.id}
                      block={block}
                      geminiApiKey={settings.geminiApiKey}
                      onUpdate={handleUpdateBlock}
                      onDelete={handleDeleteBlock}
                    />
                  );
                }
                return null;
              })
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 2: TIMELINE VIEW
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'timeline' && (
        <JournalTimeline
          entries={entries}
          onSelectDate={(d) => {
            setActiveDateStr(d);
            setViewMode('day');
          }}
          journalStreak={journalStreak}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 3: CALENDAR VIEW
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <JournalCalendar
          entries={entries}
          onSelectDate={(d) => {
            setActiveDateStr(d);
            setViewMode('day');
          }}
        />
      )}
    </div>
  );
};
