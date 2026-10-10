import React, { useState, useMemo } from 'react';
import { Habit, HabitStatus } from '../types/habit';
import { HabitFormModal } from '../components/habits/HabitFormModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Copy,
  Pause,
  Play,
  Archive,
  ArchiveRestore,
  GripVertical,
} from 'lucide-react';

interface ManageHabitsViewProps {
  habits: Habit[];
  categories: string[];
  userId: string;
  onSaveHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onReorderHabits: (habits: Habit[]) => void;
  onAddCategory?: (cat: string) => void;
}

export const ManageHabitsView: React.FC<ManageHabitsViewProps> = ({
  habits,
  categories,
  userId,
  onSaveHabit,
  onDeleteHabit,
  onReorderHabits,
  onAddCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HabitStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Filtered habits
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      if (statusFilter !== 'all' && h.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          h.name.toLowerCase().includes(q) ||
          (h.description && h.description.toLowerCase().includes(q)) ||
          h.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [habits, statusFilter, categoryFilter, searchTerm]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= habits.length) return;

    const copy = [...habits];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    onReorderHabits(copy);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const copy = [...habits];
    const [movedItem] = copy.splice(draggedIndex, 1);
    copy.splice(dropIndex, 0, movedItem);

    onReorderHabits(copy);
    setDraggedIndex(null);
  };

  const handleDuplicate = (habit: Habit) => {
    const duplicated: Habit = {
      ...habit,
      id: `habit-${Date.now()}`,
      name: `${habit.name} (Copia)`,
      sortOrder: (habit.sortOrder || 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveHabit(duplicated);
  };

  const handleTogglePause = (habit: Habit) => {
    const nextStatus: HabitStatus = habit.status === 'paused' ? 'active' : 'paused';
    onSaveHabit({
      ...habit,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleArchive = (habit: Habit) => {
    const nextStatus: HabitStatus = habit.status === 'archived' ? 'active' : 'archived';
    onSaveHabit({
      ...habit,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  const habitToDelete = habits.find((h) => h.id === deletingHabitId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-app">
        <div className="min-w-0">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
            CATÁLOGO & CONFIGURACIÓN
          </span>
          <h2 className="font-['Oswald'] text-3xl sm:text-4xl font-bold uppercase tracking-wider text-main mt-0.5 truncate">
            Gestión de Hábitos
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingHabit(null);
            setHabitModalOpen(true);
          }}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Hábito</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-surface border border-app space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar hábito por nombre o categoría..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-elevated text-xs text-main border border-app focus:outline-hidden focus:border-accent"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="flex-shrink-0 min-w-[130px] px-3 py-2 rounded-xl bg-surface-elevated border border-app text-xs font-semibold text-main focus:outline-hidden cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="paused">Pausados</option>
            <option value="archived">Archivados</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-shrink-0 min-w-[140px] px-3 py-2 rounded-xl bg-surface-elevated border border-app text-xs font-semibold text-main focus:outline-hidden cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Habits List with Drag & Drop */}
      <div className="space-y-2.5">
        {filteredHabits.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-surface border border-app p-8">
            <p className="text-sm font-semibold text-muted">
              No se encontraron hábitos con los filtros seleccionados.
            </p>
          </div>
        ) : (
          filteredHabits.map((habit) => {
            const originalIndex = habits.findIndex((h) => h.id === habit.id);

            return (
              <div
                key={habit.id}
                draggable
                onDragStart={() => handleDragStart(originalIndex)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(originalIndex)}
                className={`group p-4 rounded-2xl bg-surface border border-app hover:border-accent transition flex items-center justify-between gap-4 shadow-2xs cursor-grab active:cursor-grabbing ${
                  draggedIndex === originalIndex ? 'opacity-40 border-dashed border-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Drag Handle & Up/Down Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <GripVertical className="w-4 h-4 text-dim group-hover:text-muted" />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(originalIndex, 'up');
                        }}
                        disabled={originalIndex === 0}
                        className="p-0.5 rounded text-dim hover:text-main disabled:opacity-20 transition cursor-pointer"
                        title="Subir orden"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(originalIndex, 'down');
                        }}
                        disabled={originalIndex === habits.length - 1}
                        className="p-0.5 rounded text-dim hover:text-main disabled:opacity-20 transition cursor-pointer"
                        title="Bajar orden"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Habit Custom Color Pip & Emoji */}
                  <span
                    className="w-1.5 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: habit.color || 'var(--color-accent)' }}
                  />
                  <span className="text-2xl select-none shrink-0">{habit.emoji}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-main truncate">
                        {habit.name}
                      </h3>

                      {habit.status === 'paused' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle text-accent">
                          Pausado
                        </span>
                      )}

                      {habit.status === 'archived' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-muted text-muted">
                          Archivado
                        </span>
                      )}

                      {habit.isNegative && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle text-accent">
                          Eliminación
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted mt-1 flex-wrap">
                      <span className="font-semibold text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-main">
                        {habit.category}
                      </span>
                      <span>
                        {habit.type === 'boolean'
                          ? 'Sí / No'
                          : habit.type === 'counter'
                          ? `Meta: ${habit.targetValue} ${habit.targetUnit || 'veces'}`
                          : `Meta: ${habit.targetValue} min`}
                      </span>
                      <span>
                        {habit.frequencyType === 'daily'
                          ? 'Diario'
                          : habit.frequencyType === 'specific_days'
                          ? `${habit.specificDays?.length || 0} días/sem`
                          : `${habit.timesPerWeek} veces/sem`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePause(habit)}
                    className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface-elevated transition cursor-pointer"
                    title={habit.status === 'paused' ? 'Reanudar hábito' : 'Pausar hábito'}
                  >
                    {habit.status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArchive(habit)}
                    className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface-elevated transition cursor-pointer"
                    title={habit.status === 'archived' ? 'Desarchivar' : 'Archivar'}
                  >
                    {habit.status === 'archived' ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(habit)}
                    className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface-elevated transition cursor-pointer"
                    title="Duplicar hábito"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingHabit(habit);
                      setHabitModalOpen(true);
                    }}
                    className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface-elevated transition cursor-pointer"
                    title="Editar hábito"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingHabitId(habit.id)}
                    className="p-2 rounded-xl text-muted hover:text-accent transition cursor-pointer"
                    title="Eliminar hábito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Habit Create / Edit Modal */}
      {habitModalOpen && (
        <HabitFormModal
          habitToEdit={editingHabit}
          categories={categories}
          userId={userId}
          onSave={onSaveHabit}
          onClose={() => setHabitModalOpen(false)}
          onAddCategory={onAddCategory}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingHabitId)}
        title="Eliminar Hábito"
        message={`¿Estás seguro de que deseás eliminar "${habitToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar definitivamente"
        isDestructive={true}
        onConfirm={() => {
          if (deletingHabitId) {
            onDeleteHabit(deletingHabitId);
            setDeletingHabitId(null);
          }
        }}
        onCancel={() => setDeletingHabitId(null)}
      />
    </div>
  );
};
