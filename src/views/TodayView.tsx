import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Habit, HabitLog, HabitValue } from '../types/habit';
import { JournalEntry, normalizeJournalEntry } from '../types/journal';
import {
  getTodayDateString,
  addDays,
  parseDateString,
  formatArgentineDate,
} from '../utils/dateUtils';
import { isHabitScheduledOnDate, isHabitCompleted } from '../services/dataStorage';
import { HabitCard } from '../components/habits/HabitCard';
import { calculateHabitStreak, calculateBadges } from '../utils/statsCalculator';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Plus,
  Award,
  Moon,
  Timer,
  Play,
  ArrowRight,
  Check,
  Star,
  Smile,
  X,
  Mic,
  Square,
} from 'lucide-react';

interface TodayViewProps {
  habits: Habit[];
  logs: Record<string, HabitLog>;
  entries?: Record<string, JournalEntry>;
  initialDateStr?: string;
  onToggleHabit: (habitId: string, dateStr: string) => void;
  onUpdateHabitValue: (habitId: string, dateStr: string, val: HabitValue) => void;
  onOpenVoiceJournal: (dateStr: string) => void;
  onNewHabit: () => void;
  onNavigateToBalance?: () => void;
  onNavigateToFocus?: () => void;
  todayFocusMinutes?: number;
  onSaveDayClosure?: (data: {
    date: string;
    completedHabitIds: string[];
    score?: number;
    mood?: number;
    journalText?: string;
  }) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  habits,
  logs,
  entries = {},
  initialDateStr,
  onToggleHabit,
  onUpdateHabitValue,
  onOpenVoiceJournal,
  onNewHabit,
  onNavigateToBalance,
  onNavigateToFocus,
  todayFocusMinutes = 0,
  onSaveDayClosure,
}) => {
  const actualTodayStr = getTodayDateString();
  const [selectedDateStr, setSelectedDateStr] = useState<string>(initialDateStr || actualTodayStr);
  const [isClosingDayModalOpen, setIsClosingDayModalOpen] = useState(false);
  const [closeStep, setCloseStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Sync date when parent navigates
  useEffect(() => {
    if (initialDateStr && initialDateStr !== selectedDateStr) {
      setSelectedDateStr(initialDateStr);
    }
  }, [initialDateStr]);

  // Close the day form states - start WITHOUT invented values
  const [closureScore, setClosureScore] = useState<number | null>(null);
  const [closureMood, setClosureMood] = useState<number | null>(null);
  const [closureNotes, setClosureNotes] = useState<string>('');
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // When opening day closure modal, populate existing state if already saved
  const handleOpenCloseDayModal = () => {
    const raw = entries[selectedDateStr];
    if (raw) {
      const norm = normalizeJournalEntry(raw);
      setClosureScore(typeof norm?.score === 'number' ? norm.score : null);
      setClosureMood(typeof norm?.mood === 'number' ? norm.mood : null);

      // Check if closure note exists
      const closureBlock = norm?.blocks?.find(
        (b) => b.type === 'text' && b.id.startsWith('closure-note-')
      );
      if (closureBlock && closureBlock.type === 'text') {
        setClosureNotes(closureBlock.text);
      } else if (norm?.additionalNote) {
        setClosureNotes(norm.additionalNote);
      } else {
        setClosureNotes('');
      }
    } else {
      setClosureScore(null);
      setClosureMood(null);
      setClosureNotes('');
    }
    setCloseStep(1);
    setIsClosingDayModalOpen(true);
  };

  const isSelectedDateToday = selectedDateStr === actualTodayStr;

  // Filter habits scheduled for this date
  const scheduledHabits = useMemo(() => {
    return habits
      .filter((h) => h.status === 'active' && isHabitScheduledOnDate(h, selectedDateStr))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [habits, selectedDateStr]);

  // Group by category
  const habitsByCategory = useMemo(() => {
    const map: Record<string, Habit[]> = {};
    scheduledHabits.forEach((h) => {
      const cat = h.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(h);
    });
    return map;
  }, [scheduledHabits]);

  // Calculate day progress
  const currentLog = logs[selectedDateStr];
  const completedHabits = useMemo(() => {
    return scheduledHabits.filter((h) => isHabitCompleted(h, currentLog?.values?.[h.id]));
  }, [scheduledHabits, currentLog]);

  const completedCount = completedHabits.length;
  const totalScheduled = scheduledHabits.length;
  const percentage = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0;

  // Streaks for all habits
  const habitStreaks = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateHabitStreak>> = {};
    habits.forEach((h) => {
      map[h.id] = calculateHabitStreak(h, logs, actualTodayStr);
    });
    return map;
  }, [habits, logs, actualTodayStr]);

  // Next badge progress calculation
  const nextBadgeInfo = useMemo(() => {
    const badges = calculateBadges(habits, habitStreaks, logs);
    const locked = badges.find((b) => !b.isUnlocked && b.daysRemaining && b.daysRemaining > 0);
    return locked || null;
  }, [habits, habitStreaks, logs]);

  // Dynamic motivational message
  const motivationalMessage = useMemo(() => {
    if (totalScheduled === 0) return 'Agregá hábitos para empezar tu camino de constancia.';
    if (percentage === 0) return 'El primer hábito del día es el que enciende la inercia. ¡Vos podés!';
    if (percentage < 40) return '¡Buen arranque! Cada tilde en la planilla consolida tu disciplina.';
    if (percentage < 75) return '¡Más de la mitad cumplida! Mantené el ritmo y la concentración.';
    if (percentage < 100) return '¡Falta muy poco! Estás a un paso de cerrar un día impecable.';
    return '¡Día 100% perfecto! Cumpliste todos tus objetivos previstos para hoy.';
  }, [percentage, totalScheduled]);

  // Finish "Cerrar el Día"
  const handleCompleteCloseDay = () => {
    if (onSaveDayClosure) {
      onSaveDayClosure({
        date: selectedDateStr,
        completedHabitIds: completedHabits.map((h) => h.id),
        score: closureScore !== null ? closureScore : undefined,
        mood: closureMood !== null ? closureMood : undefined,
        journalText: closureNotes,
      });
    }
    setCloseStep(5); // Show final summary
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          DATE HEADER WITH PROMINENT NAVIGATION & BUTTONS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
              {isSelectedDateToday ? 'REGISTRO DE HOY' : 'REGISTRO RETROACTIVO'}
            </span>
            {isSelectedDateToday && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
          </div>
          <h2 className="font-['Oswald'] text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wider text-main mt-0.5 clamp-title truncate">
            {formatArgentineDate(selectedDateStr, { includeDayName: true })}
          </h2>
        </div>

        {/* Clear Date Navigation: "Anterior", "Hoy", "Siguiente" */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-surface-elevated rounded-xl p-1 border border-app">
            <button
              type="button"
              onClick={() => setSelectedDateStr(addDays(selectedDateStr, -1))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-main hover:bg-surface transition cursor-pointer min-h-[44px]"
              aria-label="Ir al día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDateStr(actualTodayStr)}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition min-h-[44px] cursor-pointer ${
                isSelectedDateToday
                  ? 'bg-accent text-accent-contrast shadow-2xs'
                  : 'text-accent hover:bg-surface'
              }`}
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() => setSelectedDateStr(addDays(selectedDateStr, 1))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-main hover:bg-surface transition cursor-pointer min-h-[44px]"
              aria-label="Ir al día siguiente"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botón Cerrar el Día (Nocturno) */}
          <button
            type="button"
            onClick={handleOpenCloseDayModal}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface border border-app text-xs font-bold uppercase tracking-wider text-main hover:border-accent transition min-h-[44px] cursor-pointer shadow-2xs"
            title="Flujo nocturno guiado para reflexionar y cerrar la jornada"
          >
            <Moon className="w-4 h-4 text-accent" />
            <span>Cerrar el día</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PROGRESS CARD & QUICK FOCUS ACCESS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Progress & Motivation (Spans 2 cols) */}
        <div className="md:col-span-2 p-5 sm:p-6 rounded-3xl bg-surface border border-app shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted">
                Progreso Diario
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-['Bebas_Neue'] font-bold text-accent">
                {percentage}%
              </span>
              <span className="text-xs font-mono text-muted">
                ({completedCount}/{totalScheduled})
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-elevated rounded-full h-3 overflow-hidden border border-app p-0.5">
            <div
              className="bg-accent h-full rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-xs sm:text-sm text-muted italic">
            "{motivationalMessage}"
          </p>
        </div>

        {/* Quick Focus Access */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-app shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted">
                Enfoque
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-main">
              {todayFocusMinutes} min hoy
            </span>
          </div>

          <div>
            <p className="text-xs text-muted leading-relaxed">
              {todayFocusMinutes > 0
                ? `Llevás acumulados ${todayFocusMinutes} minutos de estudio o trabajo profundo.`
                : '¿Listo para tu primer bloque de concentración?'}
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateToFocus}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition min-h-[44px] cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar enfoque</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LIST OF HABITS BY CATEGORY
      ───────────────────────────────────────────────────────────── */}
      {scheduledHabits.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-app rounded-3xl bg-surface-elevated/40 space-y-4">
          <Calendar className="w-12 h-12 mx-auto text-dim opacity-60" />
          <div className="space-y-1">
            <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
              No hay hábitos programados para este día
            </h3>
            <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
              Podés crear un nuevo hábito diario o ajustar las frecuencias de tus hábitos activos.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewHabit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear primer hábito</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(habitsByCategory).map(([category, catHabits]) => {
            const catCompleted = catHabits.filter((h) =>
              isHabitCompleted(h, currentLog?.values?.[h.id])
            ).length;

            return (
              <section key={category} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-app">
                  <div className="flex items-center gap-2">
                    <h3 className="font-['Oswald'] text-base sm:text-lg font-bold uppercase tracking-wider text-main">
                      {category}
                    </h3>
                    <span className="text-[11px] font-mono text-muted">
                      ({catCompleted}/{catHabits.length})
                    </span>
                  </div>
                  {catCompleted === catHabits.length && catHabits.length > 0 && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      ✓ Completada
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catHabits.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      value={currentLog?.values?.[habit.id]}
                      dateStr={selectedDateStr}
                      streak={habitStreaks[habit.id] || { currentStreak: 0, bestStreak: 0, totalCompletions: 0 }}
                      onToggle={() => onToggleHabit(habit.id, selectedDateStr)}
                      onUpdateValue={(val) => onUpdateHabitValue(habit.id, selectedDateStr, val)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Quick Action */}
      <div className="pt-4 flex justify-between items-center text-xs text-muted">
        <span>Atajos: H (Hoy), M (Mes), T (Enfoque), D (Diario)</span>
        <button
          type="button"
          onClick={() => onOpenVoiceJournal(selectedDateStr)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-accent hover:bg-accent-subtle transition font-semibold min-h-[44px] cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>Escribir o grabar diario</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL "CERRAR EL DÍA" (Flujo Nocturno Guiado)
      ───────────────────────────────────────────────────────────── */}
      {isClosingDayModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cerrar-dia-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-surface border border-app rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-main">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                    Paso {closeStep} de 5 · Cierre de Jornada
                  </span>
                  <h3 id="cerrar-dia-titulo" className="text-xl font-['Oswald'] font-bold uppercase tracking-wider text-main">
                    {closeStep === 1 && '1. Hábitos pendientes'}
                    {closeStep === 2 && '2. Calificá tu día (1 a 10)'}
                    {closeStep === 3 && '3. Tu estado de ánimo'}
                    {closeStep === 4 && '4. Reflexión o Diario'}
                    {closeStep === 5 && '¡Día cerrado con éxito!'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClosingDayModalOpen(false)}
                aria-label="Cerrar ventana"
                className="p-2 text-muted hover:text-main rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Hábitos pendientes */}
            {closeStep === 1 && (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  Revisá tus hábitos de hoy y tildá los que hayas cumplido antes de irte a descansar:
                </p>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {scheduledHabits.map((h) => {
                    const isDone = isHabitCompleted(h, currentLog?.values?.[h.id]);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => onToggleHabit(h.id, selectedDateStr)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition min-h-[44px] cursor-pointer ${
                          isDone
                            ? 'bg-accent-subtle border-accent/40 text-main font-semibold'
                            : 'bg-surface-elevated border-app text-muted hover:border-accent'
                        }`}
                      >
                        <span className="text-xs sm:text-sm truncate">
                          {h.emoji} {h.name}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isDone ? 'bg-accent text-accent-contrast border-accent' : 'border-app'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setCloseStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 min-h-[44px] cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Calificar el día (1 a 10, opcional) */}
            {closeStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  En una escala del 1 al 10, ¿cómo sentís que fue este día en general? (Opcional)
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setClosureScore(closureScore === score ? null : score)}
                      className={`py-3 rounded-2xl border text-sm sm:text-base font-bold font-mono transition min-h-[44px] cursor-pointer ${
                        closureScore === score
                          ? 'bg-accent text-accent-contrast border-accent scale-105 shadow-sm'
                          : 'bg-surface-elevated border-app text-main hover:border-accent'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                {closureScore !== null && (
                  <button
                    type="button"
                    onClick={() => setClosureScore(null)}
                    className="text-[11px] text-muted hover:text-accent underline cursor-pointer"
                  >
                    Borrar calificación
                  </button>
                )}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCloseStep(1)}
                    className="text-xs text-muted hover:text-main cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloseStep(3)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 min-h-[44px] cursor-pointer"
                  >
                    <span>{closureScore !== null ? 'Siguiente' : 'Omitir / Siguiente'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Estado de ánimo (opcional) */}
            {closeStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Elegí el estado de ánimo predominante en tu jornada (Opcional):
                </p>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { val: 1, label: 'Muy mal', emoji: '😞' },
                    { val: 2, label: 'Bajo', emoji: '😕' },
                    { val: 3, label: 'Neutro', emoji: '😐' },
                    { val: 4, label: 'Bien', emoji: '🙂' },
                    { val: 5, label: 'Excelente', emoji: '🔥' },
                  ].map((m) => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setClosureMood(closureMood === m.val ? null : m.val)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition min-h-[64px] cursor-pointer ${
                        closureMood === m.val
                          ? 'bg-accent-subtle border-accent text-main scale-105'
                          : 'bg-surface-elevated border-app text-muted hover:border-accent'
                      }`}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-[10px] font-semibold uppercase">{m.label}</span>
                    </button>
                  ))}
                </div>
                {closureMood !== null && (
                  <button
                    type="button"
                    onClick={() => setClosureMood(null)}
                    className="text-[11px] text-muted hover:text-accent underline cursor-pointer"
                  >
                    Borrar estado de ánimo
                  </button>
                )}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCloseStep(2)}
                    className="text-xs text-muted hover:text-main cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloseStep(4)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 min-h-[44px] cursor-pointer"
                  >
                    <span>{closureMood !== null ? 'Siguiente' : 'Omitir / Siguiente'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Reflexión o Diario */}
            {closeStep === 4 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">
                    Escribí o grabá una breve reflexión de tu día:
                  </p>
                </div>
                <textarea
                  rows={4}
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="Hoy logré mantener el foco en... Agradezco haber podido..."
                  className="w-full p-3.5 rounded-2xl border border-app bg-surface-elevated text-sm text-main focus:outline-hidden focus:border-accent"
                />
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCloseStep(3)}
                    className="text-xs text-muted hover:text-main cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteCloseDay}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 min-h-[44px] cursor-pointer"
                  >
                    <span>Finalizar cierre</span>
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Resumen final fiel */}
            {closeStep === 5 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-accent-subtle text-accent flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-widest text-muted">
                    Balance del Día Guardado
                  </span>
                  <h4 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wider text-main">
                    {percentage}% de hábitos cumplidos
                  </h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    {closureScore !== null ? `Calificación: ${closureScore}/10` : 'Sin calificación'}
                    {closureMood !== null
                      ? ` · Ánimo: ${
                          [
                            { val: 1, label: 'Muy mal 😞' },
                            { val: 2, label: 'Bajo 😕' },
                            { val: 3, label: 'Neutro 😐' },
                            { val: 4, label: 'Bien 🙂' },
                            { val: 5, label: 'Excelente 🔥' },
                          ].find((m) => m.val === closureMood)?.label
                        }`
                      : ''}
                    {' · Día cerrado y guardado correctamente.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClosingDayModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 min-h-[44px] cursor-pointer"
                >
                  Listo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
