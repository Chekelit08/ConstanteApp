import React, { useState, useEffect, useRef } from 'react';
import { JournalBlockText } from '../../types/journal';
import { Clock, Trash2, Check, FileText } from 'lucide-react';

interface TextJournalBlockEditorProps {
  block: JournalBlockText;
  onUpdate: (updatedBlock: JournalBlockText) => void;
  onDelete: (blockId: string) => void;
}

export const TextJournalBlockEditor: React.FC<TextJournalBlockEditorProps> = ({
  block,
  onUpdate,
  onDelete,
}) => {
  const [text, setText] = useState<string>(block.text || '');
  const [time, setTime] = useState<string>(block.time || '12:00');
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const textRef = useRef(text);
  const timeRef = useRef(time);
  const isSavedRef = useRef(true);
  const blockRef = useRef(block);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    textRef.current = text;
    timeRef.current = time;
  }, [text, time]);

  useEffect(() => {
    blockRef.current = block;
    onUpdateRef.current = onUpdate;
  }, [block, onUpdate]);

  // Auto-save debounced and flush on unmount
  useEffect(() => {
    if (text !== block.text || time !== block.time) {
      setIsSaved(false);
      isSavedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onUpdateRef.current({
          ...blockRef.current,
          text: textRef.current,
          time: timeRef.current,
        });
        setIsSaved(true);
        isSavedRef.current = true;
      }, 700);
    }
  }, [text, time, block.text, block.time]);

  // Flush on unmount so navigation or tab close never loses what was written in the last 700 ms
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (!isSavedRef.current) {
        onUpdateRef.current({
          ...blockRef.current,
          text: textRef.current,
          time: timeRef.current,
        });
      }
    };
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-app shadow-2xs space-y-3 transition hover:border-accent/40">
      {/* Block Header */}
      <div className="flex items-center justify-between gap-2 border-b border-app/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-main">
            Bloque de Texto
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted bg-surface-elevated px-2 py-0.5 rounded-md border border-app">
            <Clock className="w-3 h-3" />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent text-[11px] font-mono text-main focus:outline-hidden"
              aria-label="Hora del bloque"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted">
            {isSaved ? '✓ Guardado' : 'Guardando…'}
          </span>
          <button
            type="button"
            onClick={() => onDelete(block.id)}
            className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
            title="Borrar este bloque de texto"
            aria-label="Borrar bloque de texto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Text Area */}
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribí lo que estás pensando, sintiendo o experimentando en este momento..."
        className="w-full p-3 rounded-xl border border-app bg-surface-elevated text-xs sm:text-sm text-main leading-relaxed focus:outline-hidden focus:border-accent resize-y min-h-[90px]"
      />

      {/* Counters Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-1">
        <span>
          {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'} · {charCount} caracteres
        </span>
        <button
          type="button"
          onClick={() => {
            onUpdate({ ...block, text, time });
            setIsSaved(true);
          }}
          className="text-accent hover:underline font-semibold"
        >
          Guardar ahora
        </button>
      </div>
    </div>
  );
};
