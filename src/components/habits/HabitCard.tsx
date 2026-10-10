import React, { useState, useEffect } from 'react';
import { Habit, HabitValue } from '../../types/habit';
import { isHabitCompleted, getHabitProgress } from '../../services/dataStorage';
import { HabitStreak } from '../../types/stats';
import {
  Check,
  Plus,
  Minus,
  Play,
  Pause,
  Flame,
} from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  value: HabitValue | undefined;
  dateStr?: string;
  streak?: HabitStreak;
  onToggle: () => void;
  onUpdateValue: (val: HabitValue) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  value,
  streak,
  onToggle,
  onUpdateValue,
}) => {
  const isCompleted = isHabitCompleted(habit, value);
  const progress = getHabitProgress(habit, value);

  // For duration habit timer
  const [timerRunning, setTimerRunning] = useState(false);
  const currentMinutes = typeof value === 'number' ? value : 0;

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        onUpdateValue(Math.min((habit.targetValue || 60) * 2, currentMinutes + 1));
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, currentMinutes, habit.targetValue, onUpdateValue]);

  const handleCounterChange = (delta: number) => {
    const current = typeof value === 'number' ? value : 0;
    const nextVal = Math.max(0, current + delta);
    onUpdateValue(nextVal);
  };

  return (
    <div
      className={`group relative rounded-2xl p-4 transition-all duration-200 border ${
        isCompleted
          ? 'bg-surface border-app shadow-2xs'
          : 'bg-surface border-app hover:border-accent'
      }`}
    >
      {/* Habit-specific left color strip (kept separate from global accent as requested) */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r"
        style={{
          backgroundColor: habit.color || 'var(--color-accent)',
        }}
      />

      <div className="flex items-start justify-between gap-3 pl-2.5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl select-none shrink-0 mt-0.5" role="img" aria-label={habit.name}>
            {habit.emoji || '📌'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`text-base font-bold tracking-tight text-main ${
                  isCompleted ? 'line-through opacity-60' : ''
                }`}
              >
                {habit.name}
              </h3>
              {habit.isNegative && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle text-accent">
                  Dejar de hacer
                </span>
              )}
            </div>

            {habit.description && (
              <p className="text-xs text-muted mt-0.5 line-clamp-1">
                {habit.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted flex-wrap">
              <span className="px-2 py-0.5 rounded bg-surface-elevated font-medium text-[11px] text-main">
                {habit.category}
              </span>

              {streak && streak.currentStreak > 0 && (
                <span className="flex items-center gap-1 font-semibold text-accent">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  {streak.currentStreak} {streak.currentStreak === 1 ? 'día' : 'días'} de racha
                </span>
              )}
            </div>
          </div>
        </div>

        {/* INTERACTION AREA BASED ON TYPE (MIN 44px TOUCH AREA) */}
        <div className="shrink-0 flex items-center gap-2">
          {/* TYPE: BOOLEAN */}
          {habit.type === 'boolean' && (
            <button
              type="button"
              onClick={onToggle}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ${
                isCompleted
                  ? 'bg-accent text-accent-contrast shadow-xs'
                  : 'bg-surface-elevated text-muted hover:text-main border border-app'
              }`}
              aria-label={isCompleted ? 'Marcar incompleto' : 'Completar hábito'}
            >
              <Check className={`w-6 h-6 stroke-[3] ${isCompleted ? 'scale-110' : 'opacity-30'}`} />
            </button>
          )}

          {/* TYPE: COUNTER */}
          {habit.type === 'counter' && (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1 bg-surface-elevated rounded-xl p-1 border border-app">
                <button
                  type="button"
                  onClick={() => handleCounterChange(-1)}
                  disabled={currentMinutes <= 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-main hover:bg-surface disabled:opacity-30 transition cursor-pointer"
                  aria-label="Restar 1"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onToggle}
                  className="px-2.5 py-1 text-sm font-mono font-bold text-main min-w-[50px] text-center hover:opacity-80 transition cursor-pointer"
                  title="Tocar para tildar meta completa"
                >
                  {currentMinutes} / {habit.targetValue || 1}
                </button>

                <button
                  type="button"
                  onClick={() => handleCounterChange(1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-main hover:bg-surface transition cursor-pointer"
                  aria-label="Sumar 1"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider pr-1">
                {habit.targetUnit || 'veces'}
              </span>
            </div>
          )}

          {/* TYPE: DURATION */}
          {habit.type === 'duration' && (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1 bg-surface-elevated rounded-xl p-1 border border-app">
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    timerRunning
                      ? 'bg-accent text-accent-contrast animate-pulse'
                      : 'text-muted hover:text-main hover:bg-surface'
                  }`}
                  title={timerRunning ? 'Pausar cronómetro' : 'Iniciar cronómetro'}
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const step = 5;
                    onUpdateValue(currentMinutes + step);
                  }}
                  className="px-2 py-1 text-xs font-mono font-bold text-main min-w-[64px] text-center hover:bg-surface rounded-lg transition cursor-pointer"
                  title="Tocá para sumar 5 min"
                >
                  {currentMinutes} / {habit.targetValue || 30}m
                </button>

                <button
                  type="button"
                  onClick={onToggle}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    isCompleted
                      ? 'bg-accent text-accent-contrast'
                      : 'text-muted hover:text-main hover:bg-surface'
                  }`}
                  title={isCompleted ? 'Reiniciar' : 'Marcar meta completa'}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider pr-1">
                minutos
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar for Counters & Durations */}
      {habit.type !== 'boolean' && (
        <div className="mt-3 w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: isCompleted ? 'var(--color-accent)' : habit.color || 'var(--text-main)',
            }}
          />
        </div>
      )}
    </div>
  );
};
