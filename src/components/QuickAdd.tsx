import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, CalendarPlus, CheckSquare, HandHeart, Moon, PiggyBank, Smartphone, Timer } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { Section } from '../sections';
import { Modal } from './ui';
import { TaskModal } from './TaskList';
import { EventModal } from './EventModal';
import { TxModal } from '../views/FinanceView';
import { Transaction } from '../types/life';
import { getTodayDateString } from '../utils/dateUtils';

type Open = null | { kind: 'tx'; tx: Partial<Transaction> } | { kind: 'task' } | { kind: 'event' };

/** Hoja de carga rápida: lo más usado a un toque desde cualquier pantalla */
export const QuickAdd: React.FC<{ life: LifeApi; open: boolean; onClose: () => void; onNavigate: (s: Section) => void }> = ({ life, open, onClose, onNavigate }) => {
  const [sub, setSub] = useState<Open>(null);
  const goals = Object.values(life.store.goals).filter((g) => !g.archived);
  const debts = Object.values(life.store.debts).filter((d) => !d.archived);

  const items: { label: string; icon: React.ReactNode; color: string; act: () => void }[] = [
    { label: 'Gasto', icon: <ArrowDownCircle />, color: 'var(--danger)', act: () => setSub({ kind: 'tx', tx: { type: 'expense' } }) },
    { label: 'Ingreso', icon: <ArrowUpCircle />, color: 'var(--mint)', act: () => setSub({ kind: 'tx', tx: { type: 'income', category: 'Sueldo SMV' } }) },
    { label: 'Ahorro', icon: <PiggyBank />, color: 'var(--gold)', act: () => setSub({ kind: 'tx', tx: { type: 'saving', currency: 'USD' } }) },
    { label: 'Tarea', icon: <CheckSquare />, color: 'var(--sky)', act: () => setSub({ kind: 'task' }) },
    { label: 'Evento', icon: <CalendarPlus />, color: 'var(--violet)', act: () => setSub({ kind: 'event' }) },
    { label: 'Enfoque', icon: <Timer />, color: 'var(--accent)', act: () => { onClose(); onNavigate('focus'); } },
    { label: 'Pantalla', icon: <Smartphone />, color: 'var(--text-muted)', act: () => { onClose(); onNavigate('time'); } },
    { label: 'Oración', icon: <HandHeart />, color: 'var(--violet)', act: () => { onClose(); onNavigate('faith'); } },
    { label: 'Cerrar el día', icon: <Moon />, color: 'var(--sky)', act: () => { onClose(); onNavigate('journal'); } },
  ];

  const closeAll = () => {
    setSub(null);
    onClose();
  };

  return (
    <>
      <Modal open={open && !sub} onClose={onClose} kicker="Carga rápida" title="¿Qué querés anotar?">
        <div className="grid grid-cols-3 gap-2.5">
          {items.map((it) => (
            <button key={it.label} type="button" onClick={it.act} className="flex flex-col items-center justify-center gap-2 p-4 rounded-[22px] bg-surface-elevated border border-subtle hover:border-app cursor-pointer min-h-[96px] transition active:scale-95">
              <span className="w-10 h-10 rounded-full flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5" style={{ color: it.color, backgroundColor: `color-mix(in srgb, ${it.color} 16%, transparent)` }}>
                {it.icon}
              </span>
              <span className="text-[13px] font-semibold text-main text-center leading-tight">{it.label}</span>
            </button>
          ))}
        </div>
      </Modal>
      {sub?.kind === 'tx' && <TxModal life={life} initial={sub.tx} goals={goals} debts={debts} onClose={closeAll} />}
      {sub?.kind === 'task' && <TaskModal open life={life} initial={{ dueDate: getTodayDateString() }} onClose={closeAll} />}
      {sub?.kind === 'event' && <EventModal open life={life} initial={{ date: getTodayDateString() }} onClose={closeAll} />}
    </>
  );
};
