import React, { useState } from 'react';
import { Habit, HabitType, HabitFrequency, HabitStatus } from '../../types/habit';
import { X, Check } from 'lucide-react';
import { DAY_NAMES_SHORT } from '../../utils/dateUtils';

interface HabitFormModalProps {
  habitToEdit?: Habit | null;
  initialData?: Partial<Habit>;
  categories: string[];
  userId: string;
  onSave: (habit: Habit) => void;
  onClose: () => void;
  onAddCategory?: (cat: string) => void;
}

const COMMON_EMOJIS = ['💧', '📖', '🏃', '🧘', '✍️', '🍎', '💤', '💪', '🚭', '🎯', '🎸', '🌱', '☕', '🧠', '🚲', '🧹'];
const PALETTE = ['#E11D48', '#D97706', '#059669', '#0284C7', '#7C3AED', '#DB2777', '#4B5563', '#18181B'];

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
  habitToEdit,
  initialData,
  categories,
  userId,
  onSave,
  onClose,
  onAddCategory,
}) => {
  const isEditing = Boolean(habitToEdit);

  const [name, setName] = useState(habitToEdit?.name || initialData?.name || '');
  const [description, setDescription] = useState(habitToEdit?.description || initialData?.description || '');
  const [emoji, setEmoji] = useState(habitToEdit?.emoji || initialData?.emoji || '💧');
  const [color, setColor] = useState(habitToEdit?.color || initialData?.color || '#E11D48');
  const [category, setCategory] = useState(habitToEdit?.category || initialData?.category || categories[0] || 'Salud & Bienestar');
  const [newCatInput, setNewCatInput] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const [type, setType] = useState<HabitType>(habitToEdit?.type || 'boolean');
  const [targetValue, setTargetValue] = useState<number>(habitToEdit?.targetValue || (type === 'counter' ? 8 : 30));
  const [targetUnit, setTargetUnit] = useState<string>(habitToEdit?.targetUnit || (type === 'counter' ? 'vasos' : 'minutos'));

  const [frequencyType, setFrequencyType] = useState<HabitFrequency>(habitToEdit?.frequencyType || 'daily');
  const [specificDays, setSpecificDays] = useState<number[]>(habitToEdit?.specificDays || [0, 1, 2, 3, 4, 5, 6]);
  const [timesPerWeek, setTimesPerWeek] = useState<number>(habitToEdit?.timesPerWeek || 3);

  const [isNegative, setIsNegative] = useState<boolean>(habitToEdit?.isNegative || false);
  const [startDate, setStartDate] = useState<string>(habitToEdit?.startDate || '');
  const [endDate, setEndDate] = useState<string>(habitToEdit?.endDate || '');
  const [reminderTime, setReminderTime] = useState<string>(habitToEdit?.reminderTime || '');
  const [status, setStatus] = useState<HabitStatus>(habitToEdit?.status || 'active');

  const toggleDay = (dayIndex: number) => {
    if (specificDays.includes(dayIndex)) {
      if (specificDays.length > 1) {
        setSpecificDays(specificDays.filter((d) => d !== dayIndex));
      }
    } else {
      setSpecificDays([...specificDays, dayIndex].sort());
    }
  };

  const handleCreateCategory = () => {
    if (newCatInput.trim()) {
      if (onAddCategory) onAddCategory(newCatInput.trim());
      setCategory(newCatInput.trim());
      setNewCatInput('');
      setShowNewCat(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const habit: Habit = {
      id: habitToEdit?.id || `habit-${Date.now()}`,
      userId,
      name: name.trim(),
      description: description.trim() || undefined,
      emoji: emoji || '📌',
      color: color || '#E11D48',
      category: category || 'General',
      type,
      targetValue: type !== 'boolean' ? Number(targetValue) : undefined,
      targetUnit: type !== 'boolean' ? targetUnit.trim() : undefined,
      frequencyType,
      specificDays: frequencyType === 'specific_days' ? specificDays : undefined,
      timesPerWeek: frequencyType === 'times_per_week' ? Number(timesPerWeek) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      isNegative,
      reminderTime: reminderTime || undefined,
      status,
      sortOrder: habitToEdit?.sortOrder || 99,
      createdAt: habitToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(habit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl border border-app my-8 animate-in zoom-in-95 text-main">
        <div className="flex items-center justify-between pb-4 border-b border-app">
          <div>
            <h3 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wider text-main">
              {isEditing ? 'Editar Hábito' : 'Nuevo Hábito'}
            </h3>
            <p className="text-xs text-muted">
              Personalizá los parámetros de tu planilla de seguimiento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface-elevated transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-5">
          {/* Nombre y Emoji */}
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <label className="block text-xs font-semibold text-muted mb-1">
                Ícono
              </label>
              <div className="w-12 h-12 rounded-2xl bg-surface-elevated flex items-center justify-center text-2xl border border-app">
                {emoji}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted mb-1">
                Nombre del Hábito *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Tomar 2L de agua, Leer 30 min..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-app bg-surface-elevated text-sm text-main focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
          </div>

          {/* Quick emoji selection */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Elegir emoji sugerido
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition cursor-pointer ${
                    emoji === em
                      ? 'bg-accent text-accent-contrast scale-110 shadow-xs'
                      : 'hover:bg-surface-elevated'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              Descripción corta (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Motivo o aclaración del hábito..."
              className="w-full px-3.5 py-2 rounded-xl border border-app bg-surface-elevated text-xs text-main focus:outline-hidden focus:border-accent"
            />
          </div>

          {/* Categoría y Color propio del hábito */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted">
                  Categoría
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCat(!showNewCat)}
                  className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                >
                  {showNewCat ? 'Elegir existente' : '+ Nueva'}
                </button>
              </div>

              {showNewCat ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    placeholder="Nueva categoría..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-app bg-surface-elevated text-xs text-main"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold cursor-pointer"
                  >
                    Crear
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app bg-surface-elevated text-xs text-main cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Color de barra de tarjeta
              </label>
              <div className="flex items-center gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      color === c ? 'scale-125 ring-2 ring-offset-2 ring-accent' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Tipo de Registro */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Tipo de Registro
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'boolean', label: 'Sí / No', sub: 'Casilla simple' },
                { id: 'counter', label: 'Contador', sub: 'Meta numérica' },
                { id: 'duration', label: 'Minutos', sub: 'Con cronómetro' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setType(t.id as HabitType);
                    if (t.id === 'counter' && targetValue === 30) setTargetValue(8);
                    if (t.id === 'duration' && targetValue === 8) setTargetValue(30);
                  }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    type === t.id
                      ? 'border-app bg-accent text-accent-contrast shadow-xs'
                      : 'border-app bg-surface-elevated text-muted hover:text-main'
                  }`}
                >
                  <p className="text-xs font-bold leading-tight">{t.label}</p>
                  <p className="text-[10px] opacity-75 mt-0.5">{t.sub}</p>
                </button>
              ))}
            </div>

            {/* Target Value & Unit Inputs for Counter / Duration */}
            {type !== 'boolean' && (
              <div className="grid grid-cols-2 gap-3 mt-3 p-3 rounded-2xl bg-surface-elevated border border-app">
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Meta Diaria
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetValue}
                    onChange={(e) => setTargetValue(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 rounded-lg border border-app bg-surface text-sm font-mono font-bold text-main"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Unidad
                  </label>
                  <input
                    type="text"
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value)}
                    placeholder={type === 'counter' ? 'vasos, páginas...' : 'minutos'}
                    className="w-full px-3 py-1.5 rounded-lg border border-app bg-surface text-sm text-main"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Frecuencia */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Frecuencia
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { id: 'daily', label: 'Todos los días' },
                { id: 'specific_days', label: 'Días específicos' },
                { id: 'times_per_week', label: 'Veces por semana' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrequencyType(f.id as HabitFrequency)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition text-center cursor-pointer ${
                    frequencyType === f.id
                      ? 'border-app bg-accent text-accent-contrast shadow-xs'
                      : 'border-app bg-surface-elevated text-muted hover:text-main'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {frequencyType === 'specific_days' && (
              <div className="flex items-center justify-between gap-1 p-2 rounded-2xl bg-surface-elevated border border-app">
                {DAY_NAMES_SHORT.map((dayName, idx) => {
                  const isSelected = specificDays.includes(idx);
                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-accent text-accent-contrast shadow-xs'
                          : 'bg-surface text-muted hover:text-main'
                      }`}
                    >
                      {dayName}
                    </button>
                  );
                })}
              </div>
            )}

            {frequencyType === 'times_per_week' && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-elevated border border-app">
                <span className="text-xs text-muted">Objetivo semanal:</span>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={timesPerWeek}
                  onChange={(e) => setTimesPerWeek(Math.min(7, Math.max(1, Number(e.target.value))))}
                  className="w-16 px-2 py-1 rounded-lg border border-app bg-surface text-center font-bold text-sm text-main"
                />
                <span className="text-xs font-medium text-muted">veces por semana</span>
              </div>
            )}
          </div>

          {/* Hábito Negativo */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-elevated border border-app">
            <div>
              <p className="text-xs font-bold text-main">
                Hábito de eliminación (negativo)
              </p>
              <p className="text-[11px] text-muted">
                Se tilda cuando lograste NO realizar la conducta (ej: cero tabaco o no posponer).
              </p>
            </div>
            <input
              type="checkbox"
              checked={isNegative}
              onChange={(e) => setIsNegative(e.target.checked)}
              className="w-5 h-5 accent-[var(--color-accent)] rounded cursor-pointer"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-app">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-main transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-md transition cursor-pointer"
            >
              {isEditing ? 'Guardar Cambios' : 'Crear Hábito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
