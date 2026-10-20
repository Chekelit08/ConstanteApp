import React, { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, ListTodo, Plus, Repeat, Sparkles, Trash2 } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { Course, CourseStatus, LifeArea, LIFE_AREAS } from '../types/life';
import { getTodayDateString } from '../utils/dateUtils';
import { newId, nowIso } from '../utils/lifeUtils';
import { btnDanger, btnPrimary, btnSecondary, Card, Chip, EmptyState, Field, inputCls, Modal, PageHeader, Stat, textareaCls } from '../components/ui';
import { useToast } from '../components/Toast';

const STATUS: { id: CourseStatus; label: string; color: string }[] = [
  { id: 'por_ver', label: 'Por ver', color: 'var(--text-muted)' },
  { id: 'viendo', label: 'Viendo', color: 'var(--sky)' },
  { id: 'visto', label: 'Visto', color: 'var(--gold)' },
  { id: 'aplicado', label: 'Aplicado', color: 'var(--mint)' },
];

/** Los 12 videos de la página "Cursos" de Notion */
const NOTION_COURSES: { title: string; author: string; area: LifeArea }[] = [
  { title: 'Cómo gestionar tu dinero: guía de finanzas personales', author: 'Adrià Solà Pastor', area: 'finanzas' },
  { title: 'Cuando ganes dinero, comprá estas 8 cosas cuanto antes', author: 'Adrià Solà Pastor', area: 'finanzas' },
  { title: '16 microhábitos que te cambiarán la vida según la neurociencia', author: 'Adrià Solà Pastor', area: 'personal' },
  { title: 'Cómo hacer preguntas que hacen que las personas te adoren', author: 'Adrià Solà Pastor', area: 'amigos' },
  { title: 'Dame 16 minutos y te haré peligrosamente constante', author: 'Adrià Solà Pastor', area: 'personal' },
  { title: 'Dame 22 minutos y hablarás mejor que el 99% de las personas', author: 'Adrià Solà Pastor', area: 'personal' },
  { title: 'Si tuviera que hacerme rico desde cero, esto es lo que haría', author: 'Luis Monge Malo', area: 'trabajo' },
  { title: 'Los 6 pasos para dominar el arte de contar historias', author: 'Adrià Solà Pastor', area: 'trabajo' },
  { title: 'Cuando comprendí cómo funciona la manifestación mi vida cambió', author: 'Adrià Solà Pastor', area: 'personal' },
  { title: 'Cómo cambiar tu vida en 6 meses: desaparecé y conseguí tu vida ideal', author: 'Adrià Solà Pastor', area: 'personal' },
  { title: 'Millonario te explica en 10 minutos cómo organizar tu día', author: 'Darío Carrasco', area: 'personal' },
  { title: 'Cómo arruinar tu juventud en 10 pasos', author: '', area: 'personal' },
];

export const CoursesView: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<CourseStatus | 'all'>('all');
  const [edit, setEdit] = useState<Partial<Course> | null>(null);
  const courses = useMemo(() => Object.values(life.store.courses || {}).sort((a, b) => STATUS.findIndex((s) => s.id === a.status) - STATUS.findIndex((s) => s.id === b.status) || b.updatedAt.localeCompare(a.updatedAt)), [life.store.courses]);
  const list = courses.filter((c) => filter === 'all' || c.status === filter);
  const applied = courses.filter((c) => c.status === 'aplicado').length;
  const seen = courses.filter((c) => c.status === 'visto').length;

  const importNotion = () => {
    const existing = new Set(courses.map((c) => c.title.toLowerCase()));
    const now = nowIso();
    let n = 0;
    NOTION_COURSES.forEach((c) => {
      if (existing.has(c.title.toLowerCase())) return;
      life.upsert('courses', { id: newId('course'), title: c.title, author: c.author || undefined, area: c.area, status: 'visto', ideas: '', actions: [], createdAt: now, updatedAt: now });
      n++;
    });
    showToast(n ? `Traje ${n} cursos de Notion` : 'Ya estaban todos', { type: 'success' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Aprender no es memorizar"
        title="Cursos"
        subtitle="Un curso no termina cuando lo ves: termina cuando cambia algo en tu vida. Cada uno se cierra con una acción concreta."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setEdit({ status: 'por_ver', area: 'personal' })}>
            <Plus className="w-4 h-4" /> Curso
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="En total" value={courses.length} />
        <Stat label="Vistos sin aplicar" value={seen} tone={seen ? 'accent' : 'default'} sub={seen ? 'convertí una idea en acción' : undefined} />
        <Stat label="Aplicados" value={applied} tone="good" />
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="Tu videoteca"
          text="Guardá cursos, videos y charlas que te sirven. Si querés, traigo los 12 que tenés en Notion."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className={btnPrimary} onClick={importNotion}>
                Traer mis cursos de Notion
              </button>
              <button type="button" className={btnSecondary} onClick={() => setEdit({ status: 'por_ver', area: 'personal' })}>
                Agregar uno
              </button>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
              Todos
            </Chip>
            {STATUS.map((s) => (
              <Chip key={s.id} active={filter === s.id} color={s.color} onClick={() => setFilter(filter === s.id ? 'all' : s.id)}>
                {s.label} · {courses.filter((c) => c.status === s.id).length}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map((c) => {
              const st = STATUS.find((s) => s.id === c.status)!;
              const area = LIFE_AREAS.find((a) => a.id === c.area);
              return (
                <button key={c.id} type="button" onClick={() => setEdit(c)} className="text-left p-4 rounded-[22px] bg-surface border border-subtle shadow-card hover:border-app cursor-pointer space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: st.color, backgroundColor: `color-mix(in srgb, ${st.color} 14%, transparent)` }}>
                      {st.label}
                    </span>
                    <span className="text-[11px] text-dim">{area?.emoji} {area?.label}</span>
                  </div>
                  <div className="font-display text-[17px] font-semibold text-main leading-snug">{c.title}</div>
                  {c.author && <div className="text-xs text-muted">{c.author}</div>}
                  {c.actions.length > 0 ? (
                    <div className="text-xs text-[var(--mint)]">✓ {c.actions.map((a) => a.text).join(' · ')}</div>
                  ) : c.status === 'visto' ? (
                    <div className="text-xs text-accent">→ Falta convertir una idea en acción</div>
                  ) : null}
                </button>
              );
            })}
          </div>
          <button type="button" className="text-xs text-dim underline cursor-pointer" onClick={importNotion}>
            Traer los cursos que falten de Notion
          </button>
        </>
      )}

      {edit && <CourseModal life={life} initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
};

const CourseModal: React.FC<{ life: LifeApi; initial: Partial<Course>; onClose: () => void }> = ({ life, initial, onClose }) => {
  const { showToast } = useToast();
  const [f, setF] = useState({
    title: initial.title || '',
    author: initial.author || '',
    url: initial.url || '',
    area: (initial.area || 'personal') as LifeArea,
    status: (initial.status || 'por_ver') as CourseStatus,
    ideas: initial.ideas || '',
  });
  const [actions, setActions] = useState(initial.actions || []);
  const [actionText, setActionText] = useState('');
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });
  const id = initial.id || newId('course');

  const persist = (acts = actions, status = f.status) => {
    if (!f.title.trim()) return;
    const now = nowIso();
    life.upsert('courses', {
      id,
      title: f.title.trim(),
      author: f.author.trim() || undefined,
      url: f.url.trim() || undefined,
      area: f.area,
      status,
      ideas: f.ideas,
      actions: acts,
      createdAt: initial.createdAt || now,
      updatedAt: now,
    });
  };

  /** Nota → acción: la idea se convierte en tarea o hábito y el curso queda "aplicado" */
  const toAction = (kind: 'task' | 'habit') => {
    const text = actionText.trim();
    if (!text || !f.title.trim()) return;
    const now = nowIso();
    const refId = newId(kind);
    if (kind === 'task') {
      life.upsert('tasks', { id: refId, title: text, area: f.area, priority: 'media', done: false, dueDate: getTodayDateString(), notes: `De: ${f.title}`, createdAt: now, updatedAt: now });
    } else {
      life.upsert('habits', {
        id: refId,
        name: text,
        emoji: '🌱',
        color: '#5FD4A8',
        area: f.area,
        kind: 'check',
        schedule: 'daily',
        why: `Lo aprendí en: ${f.title}`,
        sortOrder: Object.keys(life.store.habits).length + 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    const acts = [...actions, { id: newId('ca'), kind, refId, text }];
    setActions(acts);
    setActionText('');
    set('status', 'aplicado');
    persist(acts, 'aplicado');
    showToast(kind === 'task' ? 'Tarea creada para hoy ✓' : 'Hábito creado ✓', { type: 'success' });
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      kicker={initial.id ? 'Curso' : 'Nuevo curso'}
      title={f.title || 'Curso'}
      footer={
        <>
          {initial.id && (
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                life.remove('courses', initial.id!);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            className={btnPrimary}
            disabled={!f.title.trim()}
            onClick={() => {
              persist();
              onClose();
            }}
          >
            Guardar
          </button>
        </>
      }
    >
      <Field label="Título">
        <input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Autor / canal">
          <input className={inputCls} value={f.author} onChange={(e) => set('author', e.target.value)} />
        </Field>
        <Field label="Link">
          <div className="flex gap-2">
            <input className={inputCls} value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://youtube.com/…" inputMode="url" />
            {f.url && (
              <a href={f.url} target="_blank" rel="noreferrer" className={`${btnSecondary} shrink-0`} aria-label="Abrir link">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </Field>
      </div>
      <Field label="Estado" group>
        <div className="flex flex-wrap gap-1.5">
          {STATUS.map((s) => (
            <Chip key={s.id} active={f.status === s.id} color={s.color} onClick={() => set('status', s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Área" group>
        <div className="flex flex-wrap gap-1.5">
          {LIFE_AREAS.map((a) => (
            <Chip key={a.id} active={f.area === a.id} color={a.color} onClick={() => set('area', a.id)}>
              {a.emoji} {a.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Las 3 ideas clave">
        <textarea rows={3} className={textareaCls} value={f.ideas} onChange={(e) => set('ideas', e.target.value)} placeholder={'1. …\n2. …\n3. …'} />
      </Field>

      <div className="p-4 rounded-2xl bg-surface-elevated space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-main">
          <Sparkles className="w-4 h-4 text-accent" /> Nota → acción
        </div>
        <p className="text-xs text-muted">¿Qué vas a hacer distinto por lo que aprendiste? Convertilo en una tarea de hoy o en un hábito.</p>
        <input className={inputCls} value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="Ej: armar el presupuesto 60/20/10/10" aria-label="Acción" />
        <div className="flex gap-2">
          <button type="button" className={`${btnSecondary} flex-1`} disabled={!actionText.trim() || !f.title.trim()} onClick={() => toAction('task')}>
            <ListTodo className="w-4 h-4" /> Tarea
          </button>
          <button type="button" className={`${btnSecondary} flex-1`} disabled={!actionText.trim() || !f.title.trim()} onClick={() => toAction('habit')}>
            <Repeat className="w-4 h-4" /> Hábito
          </button>
        </div>
        {actions.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-sm text-main">
            <CheckCircle2 className="w-4 h-4 text-[var(--mint)]" /> {a.kind === 'task' ? 'Tarea' : 'Hábito'}: {a.text}
          </div>
        ))}
      </div>
    </Modal>
  );
};
