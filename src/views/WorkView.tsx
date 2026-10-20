import React, { useMemo, useState } from 'react';
import { Lightbulb, ListTodo, MessageSquareQuote, Plus, Timer, Trash2, TrendingUp } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { IDEA_STATUS_LABEL, IdeaStatus, WorkIdea, WorkWin } from '../types/life';
import { getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { formatCompactArs, formatDuration, isoToLocalDate, newId, nowIso, pct, relativeDayLabel, txArs } from '../utils/lifeUtils';
import { btnDanger, btnPrimary, btnSecondary, Card, Field, inputCls, Modal, PageHeader, ProgressBar, Stat, textareaCls } from '../components/ui';
import { TaskList } from '../components/TaskList';
import { ScaleCard } from '../components/ScaleCard';

const KIND_LABEL: Record<WorkIdea['kind'], string> = {
  proceso: '🔄 Proceso',
  automatizacion: '🤖 Automatización',
  comunicacion: '🗣 Comunicación',
  otro: '✨ Otro',
};

const WIN_LABEL: Record<WorkWin['kind'], string> = {
  logro: '⭐ Logro',
  feedback: '💬 Feedback',
  aprendizaje: '🧠 Aprendizaje',
  error: '🩹 Error / lección',
};

const STATUS_ORDER: IdeaStatus[] = ['idea', 'propuesta', 'en_curso', 'implementada', 'descartada'];

export const WorkView: React.FC<{ life: LifeApi; onStartFocus: () => void }> = ({ life, onStartFocus }) => {
  const { store } = life;
  const cfg = store.financeConfig;
  const [ideaModal, setIdeaModal] = useState<{ open: boolean; idea?: Partial<WorkIdea> }>({ open: false });
  const [winText, setWinText] = useState('');
  const [winKind, setWinKind] = useState<WorkWin['kind']>('logro');
  const today = getTodayDateString();

  const ideas = useMemo(() => Object.values(store.ideas).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [store.ideas]);
  const wins = useMemo(() => Object.values(store.wins).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [store.wins]);
  const implemented = ideas.filter((i) => i.status === 'implementada').length;

  const lastSalary = useMemo(() => {
    const salaries = Object.values(store.transactions)
      .filter((t) => t.type === 'income' && t.category === 'Sueldo SMV')
      .sort((a, b) => b.date.localeCompare(a.date));
    return salaries[0] ? txArs(salaries[0], cfg.usdRate) : 0;
  }, [store.transactions, cfg.usdRate]);
  const salaryPct = pct(Math.max(0, lastSalary - cfg.salaryGoalStart), cfg.salaryGoalEnd - cfg.salaryGoalStart);

  const weekWorkMin = useMemo(() => {
    const days = new Set(getWeekDays(today));
    const fromFocus = Object.values(store.focusSessions)
      .filter((s) => days.has(s.date) && s.area === 'trabajo')
      .reduce((sum, s) => sum + s.minutes, 0);
    const fromTracker = Object.values(store.timeEntries)
      .filter((e) => e.categoryId === 'tc-trabajo' && e.end && days.has(isoToLocalDate(e.start)))
      .reduce((sum, e) => sum + (new Date(e.end!).getTime() - new Date(e.start).getTime()) / 60000, 0);
    return fromFocus + fromTracker;
  }, [store.timeEntries, store.focusSessions, today]);

  const addWin = () => {
    if (!winText.trim()) return;
    life.upsert('wins', { id: newId('win'), date: today, kind: winKind, text: winText.trim(), createdAt: nowIso() });
    setWinText('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Rol B · Pibe confiable, ejecutivo y en crecimiento"
        title="Trabajo · SMV"
        subtitle="Trabajo con excelencia por amor a las personas que confían en mí. No hago lo mínimo. No busco aplausos. Busco servir bien."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={onStartFocus}>
              <Timer className="w-4 h-4" /> Bloque de foco
            </button>
            <button type="button" className={btnPrimary} onClick={() => setIdeaModal({ open: true, idea: { status: 'idea', kind: 'automatizacion', impact: 'medio' } })}>
              <Lightbulb className="w-4 h-4" /> Idea de mejora
            </button>
          </>
        }
      />

      <ScaleCard life={life} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Último sueldo" value={lastSalary ? formatCompactArs(lastSalary) : '—'} sub={`meta ${formatCompactArs(cfg.salaryGoalEnd)}`} tone={lastSalary >= cfg.salaryGoalEnd ? 'good' : 'default'} />
        <Stat label="Mejoras implementadas" value={implemented} sub="meta 2026: al menos 1" tone={implemented >= 1 ? 'good' : 'accent'} />
        <Stat label="Foco en trabajo" value={formatDuration(weekWorkMin)} sub="esta semana" />
        <Stat label="Logros registrados" value={wins.filter((w) => w.kind === 'logro' || w.kind === 'feedback').length} sub="para tu resumen anual" />
      </div>

      <Card title={`Camino del sueldo: ${formatCompactArs(cfg.salaryGoalStart)} → ${formatCompactArs(cfg.salaryGoalEnd)}`} icon={<TrendingUp className="w-4 h-4" />}>
        <ProgressBar value={salaryPct} color="#D97706" />
        <p className="text-[11px] text-muted mt-2">Se actualiza solo cuando cargás tu ingreso "Sueldo SMV" en Finanzas.</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Tareas de SMV" icon={<ListTodo className="w-4 h-4" />}>
          <TaskList life={life} area="trabajo" compact emptyText="Nada pendiente en SMV." />
        </Card>

        <Card title="Bitácora: logros, feedback y aprendizajes" icon={<MessageSquareQuote className="w-4 h-4" />}>
          <div className="space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(WIN_LABEL) as WorkWin['kind'][]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setWinKind(k)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border cursor-pointer ${winKind === k ? 'bg-accent text-accent-contrast border-accent' : 'bg-surface-elevated border-app text-muted'}`}
                >
                  {WIN_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputCls} value={winText} onChange={(e) => setWinText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addWin()} placeholder='Ej: Me dijeron "esto quedó impecable"' />
              <button type="button" className={btnPrimary} onClick={addWin} aria-label="Agregar a la bitácora">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pt-1">
              {wins.length === 0 && <p className="text-xs text-muted italic">Anotá cada logro o feedback: en diciembre vas a tener tu resumen del año listo.</p>}
              {wins.map((w) => (
                <div key={w.id} className="flex items-start gap-2 p-2 rounded-xl bg-surface-elevated text-sm">
                  <span className="shrink-0">{WIN_LABEL[w.kind].split(' ')[0]}</span>
                  <span className="flex-1 text-main">{w.text}</span>
                  <span className="text-[10px] font-mono text-muted shrink-0">{relativeDayLabel(w.date)}</span>
                  <button type="button" className="text-dim hover:text-[var(--danger)]" onClick={() => life.remove('wins', w.id)} aria-label="Borrar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Mejoras de procesos y automatizaciones" icon={<Lightbulb className="w-4 h-4" />}>
        {ideas.length === 0 ? (
          <p className="text-xs text-muted italic">
            Plan 2026: detectar un proceso mejorable, proponer una mejora simple e implementar al menos una automatización. Anotá acá cada idea (Google Ads, reportes, comunicación con clientes…).
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
                  {IDEA_STATUS_LABEL[status]} ({ideas.filter((i) => i.status === status).length})
                </div>
                {ideas
                  .filter((i) => i.status === status)
                  .map((i) => (
                    <button key={i.id} type="button" onClick={() => setIdeaModal({ open: true, idea: i })} className="w-full text-left p-3 rounded-xl bg-surface-elevated border border-app hover:border-accent cursor-pointer">
                      <div className="text-sm font-semibold text-main">{i.title}</div>
                      <div className="text-[10px] text-muted mt-1">
                        {KIND_LABEL[i.kind]} · impacto {i.impact}
                      </div>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      {ideaModal.open && <IdeaModal life={life} initial={ideaModal.idea} onClose={() => setIdeaModal({ open: false })} />}
    </div>
  );
};

const IdeaModal: React.FC<{ life: LifeApi; initial?: Partial<WorkIdea>; onClose: () => void }> = ({ life, initial, onClose }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [kind, setKind] = useState<WorkIdea['kind']>(initial?.kind || 'proceso');
  const [status, setStatus] = useState<IdeaStatus>(initial?.status || 'idea');
  const [impact, setImpact] = useState<WorkIdea['impact']>(initial?.impact || 'medio');
  const isEdit = Boolean(initial?.id);

  const save = () => {
    if (!title.trim()) return;
    const now = nowIso();
    life.upsert('ideas', {
      id: initial?.id || newId('idea'),
      title: title.trim(),
      description: description.trim() || undefined,
      kind,
      status,
      impact,
      implementedAt: status === 'implementada' ? initial?.implementedAt || now : undefined,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker={isEdit ? 'Editar mejora' : 'Nueva idea de mejora'}
      title={title || 'Mejora'}
      footer={
        <>
          {isEdit && (
            <button type="button" className={btnDanger} onClick={() => { life.remove('ideas', initial!.id!); onClose(); }}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={!title.trim()}>Guardar</button>
        </>
      }
    >
      <Field label="Idea">
        <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Automatizar el reporte semanal de Google Ads" />
      </Field>
      <Field label="Descripción / cómo lo haría">
        <textarea rows={3} className={textareaCls} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Tipo">
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as WorkIdea['kind'])}>
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as IdeaStatus)}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{IDEA_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Impacto">
          <select className={inputCls} value={impact} onChange={(e) => setImpact(e.target.value as WorkIdea['impact'])}>
            <option value="alto">Alto</option>
            <option value="medio">Medio</option>
            <option value="bajo">Bajo</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
};

