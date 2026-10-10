import React, { useState } from 'react';
import { Habit, HabitValue } from '../../types/habit';
import { X, Check, Plus, Minus } from 'lucide-react';

interface ValuePopoverProps {
  habit: Habit;
  dateStr: string;
  currentValue: HabitValue | undefined;
  onSave: (val: HabitValue) => void;
  onClose: () => void;
}

export const ValuePopover: React.FC<ValuePopoverProps> = ({
  habit,
  dateStr,
  currentValue,
  onSave,
  onClose,
}) => {
  const initialNum = typeof currentValue === 'number' ? currentValue : 0;
  const [val, setVal] = useState<number>(initialNum);

  const target = habit.targetValue || 1;

  const handleQuickComplete = () => {
    onSave(target);
    onClose();
  };

  const handleClear = () => {
    onSave(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xs rounded-2xl bg-surface p-5 shadow-2xl border border-app animate-in zoom-in-95 text-main">
        <div className="flex items-center justify-between pb-3 border-b border-app">
          <div className="flex items-center gap-2 truncate">
            <span className="text-xl">{habit.emoji}</span>
            <h4 className="text-sm font-bold text-main truncate">
              {habit.name}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-main cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted mt-2">
          Fecha: <strong className="font-mono text-main">{dateStr}</strong> — Meta: {target} {habit.targetUnit || 'unidades'}
        </p>

        {/* Value Controls */}
        <div className="flex items-center justify-center gap-4 my-6">
          <button
            type="button"
            onClick={() => setVal((p) => Math.max(0, p - 1))}
            className="w-12 h-12 rounded-xl bg-surface-elevated text-main border border-app flex items-center justify-center hover:bg-surface-muted text-lg font-bold transition cursor-pointer"
          >
            <Minus className="w-5 h-5" />
          </button>

          <input
            type="number"
            value={val}
            onChange={(e) => setVal(Math.max(0, Number(e.target.value)))}
            className="w-20 text-center text-3xl font-mono font-bold text-main bg-transparent border-b-2 border-app focus:outline-hidden focus:border-accent"
          />

          <button
            type="button"
            onClick={() => setVal((p) => p + 1)}
            className="w-12 h-12 rounded-xl bg-surface-elevated text-main border border-app flex items-center justify-center hover:bg-surface-muted text-lg font-bold transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action shortcuts */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={handleQuickComplete}
            className="py-2 px-3 rounded-lg bg-accent-subtle text-accent font-semibold text-xs transition cursor-pointer"
          >
            Meta ({target})
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="py-2 px-3 rounded-lg bg-surface-elevated text-muted hover:text-main text-xs font-semibold transition cursor-pointer"
          >
            Poner en 0
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onSave(val);
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition shadow-xs cursor-pointer"
        >
          Guardar Registro
        </button>
      </div>
    </div>
  );
};
