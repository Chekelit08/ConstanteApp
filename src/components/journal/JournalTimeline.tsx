import React, { useState, useMemo } from 'react';
import {
  JournalEntry,
  getEntryBlockTypes,
  getCombinedEntryText,
  normalizeJournalEntry,
} from '../../types/journal';
import { formatArgentineDate, parseDateString } from '../../utils/dateUtils';
import {
  Search,
  Mic,
  FileText,
  Camera,
  Copy,
  Printer,
  ChevronRight,
  Check,
  Calendar,
  Filter,
  X,
} from 'lucide-react';

interface JournalTimelineProps {
  entries: Record<string, JournalEntry>;
  onSelectDate: (dateStr: string) => void;
  journalStreak: number;
}

const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '🔥',
};

export const JournalTimeline: React.FC<JournalTimelineProps> = ({
  entries,
  onSelectDate,
  journalStreak,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedBlockType, setSelectedBlockType] = useState<'all' | 'voice' | 'text' | 'photo'>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    Object.values(entries).forEach((e) => {
      e.tags?.forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [entries]);

  // Sort entries descending by date
  const sortedEntries = useMemo(() => {
    return Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((rawEntry) => {
      const entry = normalizeJournalEntry(rawEntry)!;
      const { hasVoice, hasText, hasPhoto } = getEntryBlockTypes(entry);

      // Block type filter
      if (selectedBlockType === 'voice' && !hasVoice) return false;
      if (selectedBlockType === 'text' && !hasText) return false;
      if (selectedBlockType === 'photo' && !hasPhoto) return false;

      // Date range filter
      if (startDateFilter && entry.date < startDateFilter) return false;
      if (endDateFilter && entry.date > endDateFilter) return false;

      // Mood filter
      if (selectedMood !== null && entry.mood !== selectedMood) return false;

      // Tag filter
      if (selectedTag !== null && !entry.tags?.includes(selectedTag)) return false;

      // Text search in all blocks (voice, text, photo transcripts, summary, notes)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const combined = getCombinedEntryText(entry).toLowerCase();
        const tagsCombined = (entry.tags || []).join(' ').toLowerCase();
        const summaryText = (entry.summary || '').toLowerCase();

        if (
          !combined.includes(query) &&
          !tagsCombined.includes(query) &&
          !summaryText.includes(query) &&
          !entry.date.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [sortedEntries, searchTerm, selectedMood, selectedTag, selectedBlockType, startDateFilter, endDateFilter]);

  // Group by month and year
  const groupedEntries = useMemo(() => {
    const groups: { monthLabel: string; items: JournalEntry[] }[] = [];
    filteredEntries.forEach((raw) => {
      const entry = normalizeJournalEntry(raw)!;
      const date = parseDateString(entry.date);
      const label = `${formatArgentineDate(date, { shortMonth: false }).split(' de ')[1] || ''} ${date.getFullYear()}`.toUpperCase();

      let group = groups.find((g) => g.monthLabel === label);
      if (!group) {
        group = { monthLabel: label, items: [] };
        groups.push(group);
      }
      group.items.push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render text with search term highlight
  const renderHighlightedText = (text: string, maxLen = 220) => {
    if (!text) return null;
    const truncated = text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
    if (!searchTerm.trim()) return truncated;

    const parts = truncated.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-accent/25 text-main font-semibold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-app space-y-3.5 shadow-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en todo el diario (voz, texto escrito y fotos transcriptas)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-app bg-surface-elevated text-xs sm:text-sm text-main focus:outline-hidden focus:border-accent"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-app/60 text-xs">
          {/* Block Type Filter */}
          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-app">
            <button
              type="button"
              onClick={() => setSelectedBlockType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedBlockType === 'all' ? 'bg-accent text-accent-contrast' : 'text-muted'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setSelectedBlockType('voice')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedBlockType === 'voice' ? 'bg-accent text-accent-contrast' : 'text-muted'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voz</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedBlockType('text')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedBlockType === 'text' ? 'bg-accent text-accent-contrast' : 'text-muted'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Texto</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedBlockType('photo')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedBlockType === 'photo' ? 'bg-accent text-accent-contrast' : 'text-muted'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto</span>
            </button>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-xl border border-app text-xs font-mono">
            <span className="text-muted">Desde:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="bg-transparent text-main text-xs focus:outline-hidden"
            />
            <span className="text-muted">Hasta:</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="bg-transparent text-main text-xs focus:outline-hidden"
            />
          </div>

          {/* Mood filter */}
          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-app">
            {[1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMood(selectedMood === m ? null : m)}
                className={`p-1 rounded-lg text-sm transition ${
                  selectedMood === m ? 'bg-accent-subtle ring-1 ring-accent' : 'opacity-70 hover:opacity-100'
                }`}
                title={`Filtrar por ánimo ${MOOD_EMOJIS[m]}`}
              >
                {MOOD_EMOJIS[m]}
              </button>
            ))}
          </div>

          {/* Reset filters */}
          {(searchTerm || selectedMood !== null || selectedTag !== null || selectedBlockType !== 'all' || startDateFilter || endDateFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedMood(null);
                setSelectedTag(null);
                setSelectedBlockType('all');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="text-accent hover:underline text-xs font-semibold ml-auto"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Timeline Entries List */}
      <div className="space-y-6">
        {groupedEntries.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-app bg-surface-elevated/40 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-dim opacity-50" />
            <h4 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main">
              No se encontraron entradas en el diario
            </h4>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Probá ajustando los términos de búsqueda o los filtros seleccionados.
            </p>
          </div>
        ) : (
          groupedEntries.map((group) => (
            <div key={group.monthLabel} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-app">
                <h3 className="font-['Oswald'] text-base sm:text-lg font-bold uppercase tracking-wider text-muted">
                  {group.monthLabel}
                </h3>
                <span className="text-[11px] font-mono text-muted">
                  {group.items.length} {group.items.length === 1 ? 'entrada' : 'entradas'}
                </span>
              </div>

              <div className="space-y-3">
                {group.items.map((raw) => {
                  const entry = normalizeJournalEntry(raw)!;
                  const { hasVoice, hasText, hasPhoto } = getEntryBlockTypes(entry);
                  const combinedText = getCombinedEntryText(entry);
                  const blocksCount = entry.blocks?.length || 0;

                  return (
                    <article
                      key={entry.id}
                      onClick={() => onSelectDate(entry.date)}
                      className="p-5 rounded-3xl bg-surface border border-app hover:border-accent shadow-2xs transition cursor-pointer space-y-3 group"
                    >
                      {/* Entry Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main group-hover:text-accent transition">
                            {formatArgentineDate(entry.date, { includeDayName: true })}
                          </span>

                          {/* Block Type Indicators */}
                          <div className="flex items-center gap-1.5 ml-1">
                            {hasVoice && (
                              <span
                                className="w-6 h-6 rounded-lg bg-accent-subtle text-accent flex items-center justify-center"
                                title="Contiene grabación de voz"
                              >
                                <Mic className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {hasText && (
                              <span
                                className="w-6 h-6 rounded-lg bg-surface-elevated text-main flex items-center justify-center border border-app"
                                title="Contiene texto escrito"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {hasPhoto && (
                              <span
                                className="w-6 h-6 rounded-lg bg-surface-elevated text-main flex items-center justify-center border border-app"
                                title="Contiene fotos de escritura a mano"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {entry.mood && (
                            <span className="text-xl" title={`Ánimo: ${entry.mood}/5`}>
                              {MOOD_EMOJIS[entry.mood]}
                            </span>
                          )}
                          {entry.score && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-surface-elevated border border-app text-main">
                              {entry.score}/10
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted group-hover:text-main group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>

                      {/* Summary or Snippet */}
                      {entry.summary && (
                        <p className="text-xs sm:text-sm font-semibold text-main italic bg-surface-elevated/60 p-2.5 rounded-xl border border-app/60">
                          "{entry.summary}"
                        </p>
                      )}

                      {/* Text Snippet with search match highlight */}
                      {combinedText && (
                        <p className="text-xs text-muted leading-relaxed line-clamp-3">
                          {renderHighlightedText(combinedText)}
                        </p>
                      )}

                      {/* Footer tags */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-app/60 text-[11px] font-mono text-muted">
                        <div className="flex flex-wrap gap-1.5">
                          {(entry.tags || ['Diario']).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md bg-surface-elevated border border-app text-main"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3">
                          <span>{blocksCount} {blocksCount === 1 ? 'bloque' : 'bloques'}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyText(combinedText, entry.id);
                            }}
                            className="p-1 text-muted hover:text-main transition"
                            title="Copiar texto completo"
                          >
                            {copiedId === entry.id ? (
                              <Check className="w-3.5 h-3.5 text-accent" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
