import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CalendarEvent, LifeArea, LIFE_AREAS, Recurrence } from '../../types/life';
import { LifeApi } from '../../hooks/useLifeData';
import { getTodayDateString } from '../../utils/dateUtils';
import { newId, nowIso } from '../../utils/lifeUtils';
import { btnDanger, btnPrimary, btnSecondary, Field, inputCls, Modal, textareaCls } from './ui';

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: 'No se repite',
  daily: 'Todos los días',
  weekly: 'Cada semana',
  monthly: 'Cada mes',
  yearly: 'Cada año',
};

export const EventModal: React.FC<{
  open: boolean;
  initial?: Partial<CalendarEvent>;
  onClose: () => void;
  life: LifeApi;
}> = ({ open, initial, onClose, life }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [date, setDate] = useState(initial?.date || getTodayDateString());
  const [allDay, setAllDay] = useState(initial?.allDay ?? !initial?.start);
  const [start, setStart] = useState(initial?.start || '18:00');
  const [end, setEnd] = useState(initial?.end || '19:00');
  const [area, setArea] = useState<LifeArea>((initial?.area as LifeArea) || 'personal');
  const [recurrence, setRecurrence] = useState<Recurrence>(initial?.recurrence || 'none');
  const [until, setUntil] = useState(initial?.recurrenceUntil || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const isEdit = Boolean(initial?.id);

  const save = () => {
    if (!title.trim()) return;
    const now = nowIso();
    const ev: CalendarEvent = {
      id: initial?.id || newId('event'),
      title: title.trim(),
      date,
      allDay,
      start: allDay ? undefined : start,
      end: allDay ? undefined : end,
      area,
      recurrence,
      recurrenceUntil: recurrence !== 'none' && until ? until : undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    };
    life.upsert('events', ev);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      kicker={isEdit ? 'Editar evento' : 'Nuevo evento'}
      title={title || 'Evento'}
      footer={
        <>
          {isEdit && (
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                life.remove('events', initial!.id!);
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
      <Field label="Título">
        <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Reunión de Elegidos" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Área">
          <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value as LifeArea)}>
            {LIFE_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-main cursor-pointer">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-4 h-4 accent-[var(--color-accent)]" />
        Todo el día
      </label>
      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">
            <input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Repetir">
          <select className={inputCls} value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
            {Object.entries(RECURRENCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {recurrence !== 'none' && (
          <Field label="Hasta (opcional)">
            <input type="date" className={inputCls} value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Lugar">
        <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Opcional" />
      </Field>
      <Field label="Notas">
        <textarea rows={3} className={textareaCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
};
