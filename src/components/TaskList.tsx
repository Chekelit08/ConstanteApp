import React, { useMemo, useState } from 'react';
import { Check, Plus, Trash2, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { LifeArea, LIFE_AREAS, Task, TaskPriority } from '../types/life';
import { LifeApi } from '../hooks/useLifeData';
import { getTodayDateString } from '../utils/dateUtils';
import { newId, nowIso, relativeDayLabel } from '../utils/lifeUtils';
import { AreaBadge, btnDanger, btnGhost, btnPrimary, btnSecondary, EmptyState, Field, inputCls, Modal, textareaCls } from './ui';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  alta: 'text-[var(--danger)]',
  media: 'text-amber-500',
  baja: 'text-dim',
};

export const TaskModal: React.FC<{
  open: boolean;
  initial?: Partial<Task>;
  onClose: () => void;
  life: LifeApi;
}> = ({ open, initial, onClose, life }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [area, setArea] = useState<LifeArea>((initial?.area as LifeArea) || 'personal');
  const [dueDate, setDueDate] = useState(initial?.dueDate || '');
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority || 'media');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [subtasks, setSubtasks] = useState(initial?.subtasks || []);
  const [newSub, setNewSub] = useState('');
  const isEdit = Boolean(initial?.id);

  const save = () => {
    if (!title.trim()) return;
    const now = nowIso();
    const t: Task = {
      id: initial?.id || newId('task'),
      title: title.trim(),
      area,
      dueDate: dueDate || undefined,
      priority,
      done: initial?.done || false,
      doneAt: initial?.doneAt,
      notes: notes.trim() || undefined,
      subtasks: subtasks.length ? subtasks : undefined,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    };
    life.upsert('tasks', t);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      kicker={isEdit ? 'Editar tarea' : 'Nueva tarea'}
      title={title || 'Tarea'}
      footer={
        <>
          {isEdit && (
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                life.remove('tasks', initial!.id!);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={btnPrimary} onClick={save} disabled={!title.trim()}>
            Guardar
          </button>
        </>
      }
    >
      <Field label="¿Qué hay que hacer?">
        <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ej: Entregar TP de Algoritmos" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Área">
          <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value as LifeArea)}>
            {LIFE_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vence">
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Prioridad" group>
        <div className="flex gap-2">
          {(['alta', 'media', 'baja'] as TaskPriority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`flex-1 px-3 py-2 rounded-xl border text-xs font-semibold min-h-[40px] cursor-pointer ${
                priority === p ? 'bg-accent text-accent-contrast border-accent' : 'bg-surface-elevated border-app text-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Subtareas" group>
        <div className="space-y-1.5">
          {subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => setSubtasks(subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              <span className={`flex-1 ${s.done ? 'line-through text-dim' : 'text-main'}`}>{s.title}</span>
              <button type="button" className="text-dim hover:text-[var(--danger)] p-1" onClick={() => setSubtasks(subtasks.filter((x) => x.id !== s.id))} aria-label="Quitar subtarea">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Agregar paso…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSub.trim()) {
                  e.preventDefault();
                  setSubtasks([...subtasks, { id: newId('sub'), title: newSub.trim(), done: false }]);
                  setNewSub('');
                }
              }}
            />
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                if (!newSub.trim()) return;
                setSubtasks([...subtasks, { id: newId('sub'), title: newSub.trim(), done: false }]);
                setNewSub('');
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Field>
      <Field label="Notas">
        <textarea rows={3} className={textareaCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
};

export const TaskRow: React.FC<{ task: Task; life: LifeApi; onEdit: () => void; showArea?: boolean }> = ({
  task,
  life,
  onEdit,
  showArea = true,
}) => {
  const today = getTodayDateString();
  const overdue = !task.done && task.dueDate && task.dueDate < today;
  const subDone = task.subtasks?.filter((s) => s.done).length || 0;
  const toggle = () => {
    const now = nowIso();
    life.upsert('tasks', { ...task, done: !task.done, doneAt: !task.done ? now : undefined, updatedAt: now });
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-2xl border transition ${task.done ? 'bg-surface-elevated/50 border-app opacity-70' : 'bg-surface border-app hover:border-accent'}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={task.done ? 'Marcar como pendiente' : 'Completar tarea'}
        className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 cursor-pointer transition ${
          task.done ? 'bg-accent border-accent text-accent-contrast' : 'border-app hover:border-accent'
        }`}
      >
        {task.done && <Check className="w-4 h-4" />}
      </button>
      <button type="button" onClick={onEdit} className="flex-1 min-w-0 text-left cursor-pointer">
        <div className={`text-sm font-medium ${task.done ? 'line-through text-dim' : 'text-main'}`}>{task.title}</div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {showArea && <AreaBadge area={task.area} />}
          {task.dueDate && (
            <span className={`text-[11px] font-mono ${overdue ? 'text-[var(--danger)] font-bold' : 'text-muted'}`}>
              {overdue ? '⚠ ' : ''}
              {relativeDayLabel(task.dueDate, today)}
            </span>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="text-[11px] font-mono text-muted">
              {subDone}/{task.subtasks.length} pasos
            </span>
          )}
          <Flag className={`w-3 h-3 ${PRIORITY_COLOR[task.priority]}`} />
        </div>
      </button>
    </div>
  );
};

export const TaskList: React.FC<{
  life: LifeApi;
  area?: LifeArea;
  limit?: number;
  compact?: boolean;
  emptyText?: string;
}> = ({ life, area, limit, compact, emptyText }) => {
  const [modal, setModal] = useState<{ open: boolean; task?: Partial<Task> }>({ open: false });
  const [showDone, setShowDone] = useState(false);
  const [quick, setQuick] = useState('');

  const { pending, done } = useMemo(() => {
    const all = Object.values(life.store.tasks).filter((t) => !area || t.area === area);
    const prio = { alta: 0, media: 1, baja: 2 };
    const pending = all
      .filter((t) => !t.done)
      .sort((a, b) => {
        const da = a.dueDate || '9999';
        const db = b.dueDate || '9999';
        if (da !== db) return da.localeCompare(db);
        return prio[a.priority] - prio[b.priority];
      });
    const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    return { pending, done };
  }, [life.store.tasks, area]);

  const quickAdd = () => {
    if (!quick.trim()) return;
    const now = nowIso();
    life.upsert('tasks', {
      id: newId('task'),
      title: quick.trim(),
      area: area || 'personal',
      priority: 'media',
      done: false,
      createdAt: now,
      updatedAt: now,
    });
    setQuick('');
  };

  const shown = limit ? pending.slice(0, limit) : pending;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
          placeholder="Agregar tarea rápida y Enter…"
        />
        <button type="button" className={btnPrimary} onClick={() => setModal({ open: true, task: { area: area || 'personal' } })} aria-label="Nueva tarea con detalles">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {pending.length === 0 ? (
        compact ? (
          <p className="text-xs text-muted italic px-1">{emptyText || 'Sin tareas pendientes. 🙌'}</p>
        ) : (
          <EmptyState title="Todo al día" text={emptyText || 'No tenés tareas pendientes en esta área.'} />
        )
      ) : (
        <div className="space-y-2">
          {shown.map((t) => (
            <TaskRow key={t.id} task={t} life={life} showArea={!area} onEdit={() => setModal({ open: true, task: t })} />
          ))}
          {limit && pending.length > limit && (
            <p className="text-[11px] text-muted font-mono px-1">+{pending.length - limit} tareas más en Agenda</p>
          )}
        </div>
      )}

      {!compact && done.length > 0 && (
        <div>
          <button type="button" className={btnGhost} onClick={() => setShowDone(!showDone)}>
            {showDone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Completadas ({done.length})
          </button>
          {showDone && (
            <div className="space-y-2 mt-2">
              {done.slice(0, 30).map((t) => (
                <TaskRow key={t.id} task={t} life={life} showArea={!area} onEdit={() => setModal({ open: true, task: t })} />
              ))}
            </div>
          )}
        </div>
      )}

      {modal.open && <TaskModal open life={life} initial={modal.task} onClose={() => setModal({ open: false })} />}
    </div>
  );
};
