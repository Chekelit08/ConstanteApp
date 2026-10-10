import React, { useState } from 'react';
import { JournalEntry, MoodScore } from '../../types/journal';
import { Habit, HabitLog } from '../../types/habit';
import { isHabitCompleted, isHabitScheduledOnDate } from '../../services/dataStorage';
import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  CalendarCheck,
} from 'lucide-react';

interface TranscriptEditorProps {
  entry: JournalEntry;
  habits: Habit[];
  dayLog?: HabitLog;
  onUpdateEntry: (updated: JournalEntry) => void;
  onRetryTranscription?: () => void;
  onRequestAiSummary?: () => void;
  isSummarizing?: boolean;
}

const MOODS: { score: MoodScore; emoji: string; label: string }[] = [
  { score: 1, emoji: '😭', label: 'Muy mal' },
  { score: 2, emoji: '🙁', label: 'Bajo' },
  { score: 3, emoji: '😐', label: 'Neutro' },
  { score: 4, emoji: '🙂', label: 'Bien' },
  { score: 5, emoji: '🤩', label: 'Excelente' },
];

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  entry,
  habits,
  dayLog,
  onUpdateEntry,
  onRetryTranscription,
  onRequestAiSummary,
  isSummarizing = false,
}) => {
  const [editedText, setEditedText] = useState(entry.transcriptEdited || entry.transcriptOriginal || '');
  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Habits completed on this date
  const completedHabitsOnDate = habits.filter(
    (h) => isHabitScheduledOnDate(h, entry.date) && isHabitCompleted(h, dayLog?.values?.[h.id])
  );
  const scheduledHabitsOnDate = habits.filter((h) => isHabitScheduledOnDate(h, entry.date));

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditedText(val);
    onUpdateEntry({
      ...entry,
      transcriptEdited: val,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMoodSelect = (mood: MoodScore) => {
    onUpdateEntry({
      ...entry,
      mood,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleScoreChange = (score: number) => {
    onUpdateEntry({
      ...entry,
      score,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const currentTags = entry.tags || [];
      if (!currentTags.includes(newTagInput.trim())) {
        onUpdateEntry({
          ...entry,
          tags: [...currentTags, newTagInput.trim()],
          updatedAt: new Date().toISOString(),
        });
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = entry.tags || [];
    onUpdateEntry({
      ...entry,
      tags: currentTags.filter((t) => t !== tagToRemove),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="rounded-3xl bg-surface border border-app p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Top Status & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-app">
        <div className="flex items-center gap-2.5">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5 ${
              entry.status === 'transcribing'
                ? 'bg-accent-subtle text-accent animate-pulse'
                : entry.status === 'completed'
                ? 'bg-surface-elevated text-main border border-app'
                : entry.status === 'error'
                ? 'bg-accent-subtle text-accent'
                : 'bg-surface-elevated text-muted'
            }`}
          >
            {entry.status === 'transcribing' && <Sparkles className="w-3.5 h-3.5 animate-spin" />}
            {entry.status === 'transcribing'
              ? 'Transcribiendo con Gemini...'
              : entry.status === 'completed'
              ? 'Transcripción Lista'
              : entry.status === 'error'
              ? 'Error en transcripción'
              : 'Sin transcripción'}
          </span>

          {/* Button "Transcribir de nuevo" */}
          {onRetryTranscription && entry.audioData && (
            <button
              type="button"
              onClick={onRetryTranscription}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Transcribir de nuevo</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {entry.transcriptOriginal && (
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs font-medium text-muted hover:text-main px-2 py-1 rounded cursor-pointer"
            >
              {showOriginal ? 'Ver versión editada' : 'Ver original de Gemini'}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app text-xs font-medium text-main hover:bg-surface-elevated transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Habits on that day summary badge */}
      {scheduledHabitsOnDate.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-surface-elevated border border-app flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-main">
            <CalendarCheck className="w-4 h-4 text-accent shrink-0" />
            <span>
              Ese día cumpliste <strong>{completedHabitsOnDate.length}</strong> de{' '}
              <strong>{scheduledHabitsOnDate.length}</strong> hábitos programados
            </span>
          </div>
          <span className="font-mono font-bold text-accent">
            {Math.round((completedHabitsOnDate.length / scheduledHabitsOnDate.length) * 100)}%
          </span>
        </div>
      )}

      {/* AI Summary Card (if generated) */}
      {entry.summary && (
        <div className="p-4 rounded-2xl bg-surface-elevated border border-app space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Resumen Editorial Gemini</span>
          </div>
          <p className="text-sm text-main leading-relaxed font-serif italic">
            "{entry.summary}"
          </p>
        </div>
      )}

      {/* Transcribed Text Area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            {showOriginal ? 'Texto Original Transcrito' : 'Texto de la Bitácora (Editable)'}
          </label>

          {!entry.summary && onRequestAiSummary && entry.transcriptEdited && (
            <button
              type="button"
              onClick={onRequestAiSummary}
              disabled={isSummarizing}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSummarizing ? 'Resumiendo...' : 'Generar resumen & tags con IA'}
            </button>
          )}
        </div>

        {showOriginal ? (
          <div className="w-full p-4 rounded-2xl bg-surface-elevated border border-app text-sm text-main whitespace-pre-wrap leading-relaxed font-sans">
            {entry.transcriptOriginal || 'Sin contenido original disponible.'}
          </div>
        ) : (
          <textarea
            value={editedText}
            onChange={handleTextChange}
            rows={6}
            placeholder="La transcripción de tu voz aparecerá acá automáticamente..."
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-app text-sm text-main leading-relaxed focus:outline-hidden focus:border-accent resize-y"
          />
        )}
      </div>

      {/* Metadata Section: Mood, Day Score, Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-app">
        {/* Mood Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
            Estado de Ánimo
          </label>
          <div className="flex items-center gap-2">
            {MOODS.map((m) => (
              <button
                key={m.score}
                type="button"
                onClick={() => handleMoodSelect(m.score)}
                className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
                  entry.mood === m.score
                    ? 'bg-accent text-accent-contrast scale-105 shadow-xs font-bold'
                    : 'bg-surface-elevated hover:bg-surface-muted text-main'
                }`}
                title={m.label}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[10px] leading-none">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Day Score Slider (1 to 10) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Calificación del Día
            </label>
            <span className="font-mono text-base font-bold text-accent">
              {entry.score || 7} / 10
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={entry.score || 7}
            onChange={(e) => handleScoreChange(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)] cursor-pointer"
          />
        </div>
      </div>

      {/* Tags Section */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
          Etiquetas
        </label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {entry.tags?.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-elevated text-main border border-app"
            >
              #{t}
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                className="hover:text-accent ml-0.5 text-muted cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="+ Agregar etiqueta (Enter)..."
            className="px-3 py-1 text-xs rounded-full border border-dashed border-app bg-transparent text-main focus:outline-hidden focus:border-accent"
          />
        </div>
      </div>

      {/* Additional note */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
          Nota de texto adicional (opcional)
        </label>
        <input
          type="text"
          value={entry.additionalNote || ''}
          onChange={(e) =>
            onUpdateEntry({
              ...entry,
              additionalNote: e.target.value,
              updatedAt: new Date().toISOString(),
            })
          }
          placeholder="Algún pensamiento extra o recordatorio..."
          className="w-full px-4 py-2 rounded-xl bg-surface-elevated border border-app text-xs text-main focus:outline-hidden focus:border-accent"
        />
      </div>
    </div>
  );
};
