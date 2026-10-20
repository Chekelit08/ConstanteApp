import React, { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Landmark,
  ListOrdered,
  PiggyBank,
  Plus,
  RefreshCw,
  Settings2,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { BankImportModal } from '../components/BankImport';
import {
  Currency,
  Debt,
  EXPENSE_CATEGORIES,
  FinanceConfig,
  INCOME_CATEGORIES,
  SavingsGoal,
  Transaction,
  TxType,
} from '../types/life';
import { formatArgentineDate, getTodayDateString } from '../utils/dateUtils';
import {
  clamp,
  currentMonthKey,
  daysBetween,
  downloadTextFile,
  formatCompactArs,
  formatMoney,
  monthKey,
  monthLabel,
  newId,
  nowIso,
  parseAmount,
  pct,
  shiftMonth,
  toArs,
  toCsv,
  txArs,
  txUsd,
} from '../utils/lifeUtils';
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  MiniBars,
  Modal,
  PageHeader,
  ProgressBar,
  Ring,
  Stat,
  Tabs,
  textareaCls,
} from '../components/ui';
import { useToast } from '../components/Toast';

type FinTab = 'summary' | 'movements' | 'goals' | 'analysis' | 'plan';

const TYPE_META: Record<TxType, { label: string; color: string; sign: string }> = {
  income: { label: 'Ingreso', color: 'var(--mint)', sign: '+' },
  expense: { label: 'Gasto', color: '#E11D48', sign: '−' },
  saving: { label: 'Ahorro', color: '#2563EB', sign: '→' },
  withdrawal: { label: 'Retiro de ahorro', color: '#D97706', sign: '←' },
};

const FUN_CATEGORIES = ['Salidas', 'Ropa'];

function catEmoji(cat: string): string {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.id === cat)?.emoji || '🧾';
}

// ─────────────────────────────────────────────────────────────
// Cálculos
// ─────────────────────────────────────────────────────────────
export function computeMonth(txs: Transaction[], key: string, rate: number) {
  const list = txs.filter((t) => monthKey(t.date) === key);
  let income = 0;
  let expenses = 0;
  let saved = 0;
  let savedUsd = 0;
  const byCategory: Record<string, number> = {};
  let salary = 0;
  list.forEach((t) => {
    const ars = txArs(t, rate);
    if (t.type === 'income') {
      income += ars;
      if (t.category === 'Sueldo SMV') salary += ars;
    } else if (t.type === 'expense') {
      expenses += ars;
      byCategory[t.category] = (byCategory[t.category] || 0) + ars;
    } else if (t.type === 'saving') {
      saved += ars;
      savedUsd += txUsd(t, rate);
    } else if (t.type === 'withdrawal') {
      saved -= ars;
      savedUsd -= txUsd(t, rate);
    }
  });
  return {
    list,
    income,
    expenses,
    saved,
    savedUsd,
    salary,
    byCategory,
    available: income - expenses - saved,
    savingRate: income > 0 ? (saved / income) * 100 : 0,
    momContribution: byCategory['Aporte a mamá'] || 0,
    fun: FUN_CATEGORIES.reduce((s, c) => s + (byCategory[c] || 0), 0),
  };
}

export function goalProgress(goal: SavingsGoal, txs: Transaction[], goals: SavingsGoal[], rate: number): number {
  const primaryId = goals.find((g) => g.isPrimary && !g.archived)?.id;
  let total = goal.initialAmount || 0;
  txs.forEach((t) => {
    if (t.type !== 'saving' && t.type !== 'withdrawal') return;
    const assigned = t.goalId || primaryId;
    if (assigned !== goal.id) return;
    const v = goal.currency === 'USD' ? txUsd(t, rate) : txArs(t, rate);
    total += t.type === 'saving' ? v : -v;
  });
  return total;
}

export function debtPaid(debt: Debt, txs: Transaction[], rate: number): number {
  let total = debt.paidBefore || 0;
  txs.forEach((t) => {
    if (t.debtId !== debt.id) return;
    total += debt.currency === 'USD' ? txUsd(t, rate) : txArs(t, rate);
  });
  return total;
}

// ─────────────────────────────────────────────────────────────
// Vista
// ─────────────────────────────────────────────────────────────
export const FinanceView: React.FC<{ life: LifeApi }> = ({ life }) => {
  const { store } = life;
  const cfg = store.financeConfig;
  const rate = cfg.usdRate || 0;
  const [tab, setTab] = useState<FinTab>('summary');
  const [month, setMonth] = useState(currentMonthKey());
  const [txModal, setTxModal] = useState<{ open: boolean; tx?: Partial<Transaction> }>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const { showToast } = useToast();
  const [loadingRate, setLoadingRate] = useState(false);

  const txs = useMemo(() => Object.values(store.transactions).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [store.transactions]);
  const goals = useMemo(() => Object.values(store.goals).filter((g) => !g.archived), [store.goals]);
  const debts = useMemo(() => Object.values(store.debts).filter((d) => !d.archived), [store.debts]);
  const m = useMemo(() => computeMonth(txs, month, rate), [txs, month, rate]);

  const refreshRate = async (casa: 'blue' | 'bolsa' | 'oficial' = 'blue') => {
    setLoadingRate(true);
    try {
      const res = await fetch(`https://dolarapi.com/v1/dolares/${casa}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const value = Number(data.venta);
      if (!value) throw new Error('Respuesta inválida');
      life.patchSingleton('financeConfig', {
        usdRate: value,
        usdRateSource: `Dólar ${data.nombre || casa} (venta) · dolarapi.com`,
        usdRateUpdatedAt: nowIso(),
      });
      showToast(`Cotización actualizada: ${formatMoney(value)} por USD`, { type: 'success' });
    } catch (e: any) {
      showToast('No se pudo traer la cotización. Podés cargarla a mano en Plan.', { type: 'error' });
    } finally {
      setLoadingRate(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Mayordomía · Plan financiero 2026"
        title="Finanzas"
        subtitle={'"¿Quién de vosotros, queriendo edificar una torre, no se sienta primero y calcula los gastos?" — Lucas 14:28'}
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => setImportOpen(true)} title="Importar movimientos de Mercado Pago">
              <span className="w-4 h-4 rounded-full bg-[#00b1ea] text-white text-[9px] font-black flex items-center justify-center">MP</span> Importar
            </button>
            <button type="button" className={btnSecondary} onClick={() => setTxModal({ open: true, tx: { type: 'expense' } })}>
              <ArrowDownCircle className="w-4 h-4" /> Gasto
            </button>
            <button type="button" className={btnSecondary} onClick={() => setTxModal({ open: true, tx: { type: 'income', category: 'Sueldo SMV' } })}>
              <ArrowUpCircle className="w-4 h-4" /> Ingreso
            </button>
            <button type="button" className={btnPrimary} onClick={() => setTxModal({ open: true, tx: { type: 'saving', currency: 'USD' } })}>
              <PiggyBank className="w-4 h-4" /> Ahorrar
            </button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as FinTab)}
        tabs={[
          { id: 'summary', label: 'Mes', icon: <Wallet className="w-3.5 h-3.5" /> },
          { id: 'movements', label: 'Movimientos', icon: <ListOrdered className="w-3.5 h-3.5" /> },
          { id: 'goals', label: 'Metas & deudas', icon: <Target className="w-3.5 h-3.5" /> },
          { id: 'analysis', label: 'Análisis', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'plan', label: 'Plan', icon: <Settings2 className="w-3.5 h-3.5" /> },
        ]}
      />

      {(tab === 'summary' || tab === 'movements') && (
        <div className="flex items-center justify-between">
          <button type="button" className={btnGhost} onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="font-display text-lg font-bold text-main">{monthLabel(month)}</span>
          <button type="button" className={btnGhost} onClick={() => setMonth(shiftMonth(month, 1))}>
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {tab === 'summary' && (
        <SummaryTab life={life} m={m} month={month} rate={rate} goals={goals} debts={debts} txs={txs} refreshRate={refreshRate} loadingRate={loadingRate} onAdd={(tx) => setTxModal({ open: true, tx })} />
      )}
      {tab === 'movements' && <MovementsTab list={m.list} rate={rate} onEdit={(tx) => setTxModal({ open: true, tx })} allTxs={txs} />}
      {tab === 'goals' && <GoalsTab life={life} goals={goals} debts={debts} txs={txs} rate={rate} onAdd={(tx) => setTxModal({ open: true, tx })} />}
      {tab === 'analysis' && <AnalysisTab txs={txs} cfg={cfg} rate={rate} />}
      {tab === 'plan' && <PlanTab life={life} cfg={cfg} refreshRate={refreshRate} loadingRate={loadingRate} />}

      {importOpen && <BankImportModal life={life} onClose={() => setImportOpen(false)} />}
      {txModal.open && <TxModal life={life} initial={txModal.tx} goals={goals} debts={debts} onClose={() => setTxModal({ open: false })} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// RESUMEN DEL MES
// ─────────────────────────────────────────────────────────────
const SummaryTab: React.FC<{
  life: LifeApi;
  m: ReturnType<typeof computeMonth>;
  month: string;
  rate: number;
  goals: SavingsGoal[];
  debts: Debt[];
  txs: Transaction[];
  refreshRate: (c?: 'blue' | 'bolsa' | 'oficial') => void;
  loadingRate: boolean;
  onAdd: (tx: Partial<Transaction>) => void;
}> = ({ life, m, month, rate, goals, debts, txs, refreshRate, loadingRate, onAdd }) => {
  const cfg = life.store.financeConfig;
  const primary = goals.find((g) => g.isPrimary) || goals[0];
  const primaryValue = primary ? goalProgress(primary, txs, goals, rate) : 0;
  const primaryPct = primary ? pct(primaryValue, primary.targetAmount) : 0;
  const today = getTodayDateString();
  const monthsLeft = primary?.deadline ? Math.max(1, Math.ceil(daysBetween(today, primary.deadline) / 30.4)) : 0;
  const neededPerMonth = primary && monthsLeft ? Math.max(0, (primary.targetAmount - primaryValue) / monthsLeft) : 0;

  const planSaving = (m.income * cfg.savingsPercent) / 100;
  const planFun = (m.income * cfg.funPercent) / 100;
  const mac = debts.find((d) => d.id === 'debt-macbook') || debts[0];
  const macPaid = mac ? debtPaid(mac, txs, rate) : 0;
  const macPaidThisMonth = mac
    ? m.list.filter((t) => t.debtId === mac.id).reduce((s, t) => s + txArs(t, rate), 0)
    : 0;

  const plan = [
    { label: `Ahorro (${cfg.savingsPercent}%)`, plan: planSaving, actual: m.saved, emoji: '🐷', goodWhenAbove: true },
    { label: 'Aporte a mamá', plan: cfg.momContributionMin, planMax: cfg.momContributionMax, actual: m.momContribution, emoji: '💛', goodWhenAbove: true },
    { label: `Gustos (${cfg.funPercent}%) · salidas + ropa`, plan: planFun, actual: m.fun, emoji: '🎉', goodWhenAbove: false },
    ...(mac && macPaid < mac.totalAmount ? [{ label: `Cuota ${mac.name}`, plan: 0, actual: macPaidThisMonth, emoji: '💻', goodWhenAbove: true }] : []),
  ];

  const isAguinaldoMonth = month.endsWith('-06') || month.endsWith('-12');
  const aguinaldo = m.list.filter((t) => t.type === 'income' && t.category === 'Aguinaldo').reduce((s, t) => s + txArs(t, rate), 0);

  const catEntries = Object.entries(m.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catEntries.map((c) => c[1]));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Ingresos" value={formatCompactArs(m.income)} sub={formatMoney(m.income)} tone="good" />
        <Stat label="Gastos" value={formatCompactArs(m.expenses)} sub={`${pct(m.expenses, m.income)}% del ingreso`} tone="bad" />
        <Stat label="Ahorrado" value={formatMoney(m.savedUsd, 'USD')} sub={`${Math.round(m.savingRate)}% · meta ${cfg.savingsPercent}%`} tone={m.savingRate >= cfg.savingsPercent ? 'good' : 'accent'} />
        <Stat label="Disponible" value={formatCompactArs(m.available)} sub="ingresos − gastos − ahorro" tone={m.available < 0 ? 'bad' : 'default'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Meta principal */}
        <Card title={primary ? `${primary.emoji} ${primary.name}` : 'Meta de ahorro'} icon={<Target className="w-4 h-4" />} className="lg:col-span-1">
          {primary ? (
            <div className="flex items-center gap-4">
              <Ring value={primaryPct} size={104}>
                <span className="font-num font-bold text-2xl text-main leading-none">{primaryPct}%</span>
                <span className="text-[9px] font-mono text-muted uppercase">logrado</span>
              </Ring>
              <div className="space-y-1 text-xs min-w-0">
                <div className="font-num font-bold text-2xl text-main">
                  {formatMoney(primaryValue, primary.currency)} <span className="text-muted text-base">/ {formatMoney(primary.targetAmount, primary.currency)}</span>
                </div>
                {primary.deadline && (
                  <p className="text-muted">
                    Faltan <b className="text-main">{formatMoney(Math.max(0, primary.targetAmount - primaryValue), primary.currency)}</b> en {monthsLeft} {monthsLeft === 1 ? 'mes' : 'meses'}.
                  </p>
                )}
                {neededPerMonth > 0 && (
                  <p className="text-muted">
                    Necesitás ~<b className="text-accent">{formatMoney(neededPerMonth, primary.currency)}</b>/mes
                    {primary.currency === 'USD' && rate ? ` (${formatCompactArs(neededPerMonth * rate)})` : ''}.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="Sin metas" text="Creá tu meta en la pestaña Metas." />
          )}
        </Card>

        {/* Plan de distribución */}
        <Card title="Plan vs. real del mes" icon={<Landmark className="w-4 h-4" />} className="lg:col-span-2">
          {m.income === 0 ? (
            <EmptyState
              title="Cargá tu sueldo del mes"
              text="Con tu ingreso calculo cuánto va al ahorro (15%), a gustos (5%) y te recuerdo el aporte a mamá."
              action={
                <button type="button" className={btnPrimary} onClick={() => onAdd({ type: 'income', category: 'Sueldo SMV' })}>
                  <Plus className="w-4 h-4" /> Cargar sueldo
                </button>
              }
            />
          ) : (
            <div className="space-y-3.5">
              {plan.map((p) => {
                const target = p.plan || 0;
                const ratio = target > 0 ? (p.actual / target) * 100 : p.actual > 0 ? 100 : 0;
                const ok = p.goodWhenAbove ? p.actual >= target && (target > 0 || p.actual > 0) : p.actual <= target;
                return (
                  <div key={p.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold text-main truncate">
                        {p.emoji} {p.label}
                      </span>
                      <span className={`font-mono shrink-0 ${ok ? 'text-[var(--mint)]' : p.goodWhenAbove ? 'text-muted' : 'text-[var(--danger)]'}`}>
                        {formatCompactArs(p.actual)}
                        {target > 0 && ` / ${formatCompactArs(target)}${'planMax' in p && p.planMax ? `–${formatCompactArs(p.planMax as number)}` : ''}`}
                        {ok ? ' ✓' : ''}
                      </span>
                    </div>
                    <ProgressBar value={clamp(ratio, 0, 100)} danger={!p.goodWhenAbove && p.actual > target} color={ok && p.goodWhenAbove ? 'var(--mint)' : undefined} />
                  </div>
                );
              })}
              <p className="text-[11px] text-dim pt-1">
                Necesidades disponibles según plan: <b className="text-main">{formatCompactArs(m.income - planSaving - planFun - cfg.momContributionMin)}</b>
              </p>
            </div>
          )}
        </Card>
      </div>

      {isAguinaldoMonth && (
        <div className="p-4 rounded-2xl border border-[color-mix(in_srgb,var(--mint)_35%,transparent)] bg-[color-mix(in_srgb,var(--mint)_12%,transparent)] text-sm text-main flex flex-wrap items-center justify-between gap-3">
          <span>
            🎄 <b>Mes de aguinaldo.</b> Tu regla: <b>100% al ahorro</b>.{' '}
            {aguinaldo > 0 ? `Cobraste ${formatMoney(aguinaldo)}.` : 'Cuando lo cobres, cargalo como ingreso "Aguinaldo".'}
          </span>
          {aguinaldo > 0 && (
            <button type="button" className={btnPrimary} onClick={() => onAdd({ type: 'saving', currency: 'ARS', amount: aguinaldo, note: 'Aguinaldo → ahorro' })}>
              Pasarlo al ahorro
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Gastos por categoría" icon={<ArrowDownCircle className="w-4 h-4" />}>
          {catEntries.length === 0 ? (
            <p className="text-xs text-muted italic">Todavía no cargaste gastos este mes.</p>
          ) : (
            <div className="space-y-2.5">
              {catEntries.map(([cat, val]) => {
                const budget = cfg.categoryBudgets[cat];
                const over = budget && val > budget;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-main font-medium">
                        {catEmoji(cat)} {cat}
                      </span>
                      <span className={`font-mono ${over ? 'text-[var(--danger)] font-bold' : 'text-muted'}`}>
                        {formatMoney(val)}
                        {budget ? ` / ${formatCompactArs(budget)}` : ''}
                      </span>
                    </div>
                    <ProgressBar value={budget ? (val / budget) * 100 : (val / maxCat) * 100} danger={Boolean(over)} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Cotización del dólar"
          icon={<RefreshCw className="w-4 h-4" />}
          action={
            <button type="button" className={btnGhost} onClick={() => refreshRate('blue')} disabled={loadingRate}>
              <RefreshCw className={`w-4 h-4 ${loadingRate ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          }
        >
          <div className="font-num font-bold text-4xl text-main">{formatMoney(rate)}</div>
          <p className="text-[11px] text-muted">
            {cfg.usdRateSource}
            {cfg.usdRateUpdatedAt ? ` · ${new Date(cfg.usdRateUpdatedAt).toLocaleString('es-AR')}` : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" className={btnSecondary} onClick={() => refreshRate('blue')}>Blue</button>
            <button type="button" className={btnSecondary} onClick={() => refreshRate('bolsa')}>MEP</button>
            <button type="button" className={btnSecondary} onClick={() => refreshRate('oficial')}>Oficial</button>
          </div>
          <div className="mt-4 pt-3 border-t border-app space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Últimos movimientos</span>
            {m.list.slice(0, 5).map((t) => (
              <TxLine key={t.id} t={t} rate={rate} />
            ))}
            {m.list.length === 0 && <p className="text-xs text-muted italic">Sin movimientos este mes.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};

const TxLine: React.FC<{ t: Transaction; rate: number; onClick?: () => void }> = ({ t, rate, onClick }) => {
  const meta = TYPE_META[t.type];
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-3 py-1.5 text-left ${onClick ? 'cursor-pointer hover:bg-surface-elevated rounded-lg px-2 -mx-2' : 'cursor-default'}`}>
      <span className="text-lg w-7 text-center shrink-0">{t.type === 'saving' ? '🐷' : t.type === 'withdrawal' ? '↩️' : catEmoji(t.category)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-main font-medium truncate">{t.note || t.category}</div>
        <div className="text-[11px] text-muted font-mono truncate">
          {t.category} · {formatArgentineDate(t.date).replace(/ de \d{4}$/, '')}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-mono font-bold" style={{ color: meta.color }}>
          {meta.sign} {formatMoney(t.amount, t.currency)}
        </div>
        {t.currency === 'USD' && <div className="text-[10px] text-muted font-mono">≈ {formatCompactArs(txArs(t, rate))}</div>}
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// MOVIMIENTOS
// ─────────────────────────────────────────────────────────────
const MovementsTab: React.FC<{ list: Transaction[]; rate: number; onEdit: (t: Transaction) => void; allTxs: Transaction[] }> = ({ list, rate, onEdit, allTxs }) => {
  const [filter, setFilter] = useState<TxType | 'all'>('all');
  const [q, setQ] = useState('');
  const shown = list.filter((t) => (filter === 'all' || t.type === filter) && (!q || `${t.note} ${t.category}`.toLowerCase().includes(q.toLowerCase())));
  const byDate: Record<string, Transaction[]> = {};
  shown.forEach((t) => {
    (byDate[t.date] = byDate[t.date] || []).push(t);
  });

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Fecha', 'Tipo', 'Categoría', 'Monto', 'Moneda', 'Cotización', 'Monto ARS', 'Nota']];
    allTxs
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((t) => rows.push([t.date, TYPE_META[t.type].label, t.category, t.amount, t.currency, t.usdRate || '', Math.round(txArs(t, rate)), t.note || '']));
    downloadTextFile(`constante-finanzas-${getTodayDateString()}.csv`, toCsv(rows), 'text/csv');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input className={inputCls} placeholder="Buscar por nota o categoría…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} sm:w-48`} value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">Todos</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <button type="button" className={btnSecondary} onClick={exportCsv}>
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>
      {shown.length === 0 ? (
        <EmptyState title="Sin movimientos" text="Usá los botones de arriba para cargar gastos, ingresos o ahorros." />
      ) : (
        Object.entries(byDate).map(([date, items]) => (
          <Card key={date} title={formatArgentineDate(date, { includeDayName: true })}>
            <div className="divide-y divide-[var(--border-subtle)]">
              {items.map((t) => (
                <TxLine key={t.id} t={t} rate={rate} onClick={() => onEdit(t)} />
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// METAS & DEUDAS
// ─────────────────────────────────────────────────────────────
const GoalsTab: React.FC<{
  life: LifeApi;
  goals: SavingsGoal[];
  debts: Debt[];
  txs: Transaction[];
  rate: number;
  onAdd: (tx: Partial<Transaction>) => void;
}> = ({ life, goals, debts, txs, rate, onAdd }) => {
  const [goalModal, setGoalModal] = useState<{ open: boolean; goal?: Partial<SavingsGoal> }>({ open: false });
  const [debtModal, setDebtModal] = useState<{ open: boolean; debt?: Partial<Debt> }>({ open: false });
  const totalUsd = goals.filter((g) => g.currency === 'USD').reduce((s, g) => s + goalProgress(g, txs, goals, rate), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="Patrimonio en USD" value={formatMoney(totalUsd, 'USD')} sub={`≈ ${formatCompactArs(totalUsd * rate)}`} tone="accent" />
        <Stat label="Deuda pendiente" value={formatMoney(debts.reduce((s, d) => s + Math.max(0, d.totalAmount - debtPaid(d, txs, rate)), 0), 'USD')} sub="en USD" tone="bad" />
        <Stat label="Metas activas" value={goals.length} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-main">Metas de ahorro</h3>
          <button type="button" className={btnSecondary} onClick={() => setGoalModal({ open: true, goal: { currency: 'USD', emoji: '🎯' } })}>
            <Plus className="w-4 h-4" /> Meta
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goals.map((g) => {
            const v = goalProgress(g, txs, goals, rate);
            const p = pct(v, g.targetAmount);
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="text-left min-w-0 cursor-pointer" onClick={() => setGoalModal({ open: true, goal: g })}>
                    <div className="text-sm font-bold text-main">
                      {g.emoji} {g.name} {g.isPrimary && <span className="ml-1 text-[10px] font-mono text-accent uppercase">principal</span>}
                    </div>
                    {g.deadline && <div className="text-[11px] text-muted font-mono">Para el {formatArgentineDate(g.deadline)}</div>}
                  </button>
                  <span className="font-num font-bold text-2xl text-accent">{p}%</span>
                </div>
                <div className="my-3">
                  <ProgressBar value={p} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-main">
                    {formatMoney(v, g.currency)} / {formatMoney(g.targetAmount, g.currency)}
                  </span>
                  <button type="button" className={btnGhost} onClick={() => onAdd({ type: 'saving', currency: g.currency, goalId: g.id })}>
                    <Plus className="w-3.5 h-3.5" /> Aportar
                  </button>
                </div>
                {g.notes && <p className="text-[11px] text-muted mt-2">{g.notes}</p>}
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-main">Deudas & cuotas</h3>
          <button type="button" className={btnSecondary} onClick={() => setDebtModal({ open: true, debt: { currency: 'USD' } })}>
            <Plus className="w-4 h-4" /> Deuda
          </button>
        </div>
        {debts.length === 0 && <p className="text-xs text-muted italic">"No debáis a nadie nada, sino el amaros unos a otros" — Romanos 13:8. ¡Sin deudas!</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {debts.map((d) => {
            const paid = debtPaid(d, txs, rate);
            const p = pct(paid, d.totalAmount);
            return (
              <Card key={d.id}>
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="text-left cursor-pointer" onClick={() => setDebtModal({ open: true, debt: d })}>
                    <div className="text-sm font-bold text-main">💻 {d.name}</div>
                    <div className="text-[11px] text-muted">Se le debe a: {d.creditor}</div>
                  </button>
                  <span className="font-num font-bold text-2xl text-main">{p}%</span>
                </div>
                <div className="my-3">
                  <ProgressBar value={p} color="#16A34A" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-main">
                    Falta {formatMoney(Math.max(0, d.totalAmount - paid), d.currency)}
                  </span>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => onAdd({ type: 'expense', category: d.id === 'debt-macbook' ? 'Cuota MacBook' : 'Otros', debtId: d.id, currency: d.currency })}
                  >
                    <Plus className="w-3.5 h-3.5" /> Pagar cuota
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {goalModal.open && <GoalModal life={life} initial={goalModal.goal} onClose={() => setGoalModal({ open: false })} />}
      {debtModal.open && <DebtModal life={life} initial={debtModal.debt} onClose={() => setDebtModal({ open: false })} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ANÁLISIS
// ─────────────────────────────────────────────────────────────
const AnalysisTab: React.FC<{ txs: Transaction[]; cfg: FinanceConfig; rate: number }> = ({ txs, cfg, rate }) => {
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonthKey(), i - 11));
  const data = months.map((k) => ({ k, ...computeMonth(txs, k, rate) }));
  const withIncome = data.filter((d) => d.income > 0);
  const avgSavingRate = withIncome.length ? withIncome.reduce((s, d) => s + d.savingRate, 0) / withIncome.length : 0;
  const momMonths = withIncome.filter((d) => d.momContribution >= cfg.momContributionMin).length;
  const lastSalary = [...data].reverse().find((d) => d.salary > 0)?.salary || 0;
  const salaryPct = pct(lastSalary - cfg.salaryGoalStart, cfg.salaryGoalEnd - cfg.salaryGoalStart);
  const short = (k: string) => ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][Number(k.slice(5)) - 1];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Tasa de ahorro prom." value={`${Math.round(avgSavingRate)}%`} sub={`meta ${cfg.savingsPercent}%`} tone={avgSavingRate >= cfg.savingsPercent ? 'good' : 'accent'} />
        <Stat label="Aporte a mamá" value={`${momMonths}/${withIncome.length || 0}`} sub="meses cumplidos" tone={momMonths === withIncome.length && momMonths > 0 ? 'good' : 'default'} />
        <Stat label="Último sueldo" value={formatCompactArs(lastSalary)} sub={`meta ${formatCompactArs(cfg.salaryGoalStart)} → ${formatCompactArs(cfg.salaryGoalEnd)}`} />
        <Stat label="Ahorro 12 meses" value={formatMoney(data.reduce((s, d) => s + d.savedUsd, 0), 'USD')} tone="accent" />
      </div>

      <Card title={`Sueldo: camino a ${formatCompactArs(cfg.salaryGoalEnd)}`} icon={<Landmark className="w-4 h-4" />}>
        <ProgressBar value={clamp(salaryPct, 0, 100)} color="#D97706" />
        <div className="flex justify-between text-[11px] font-mono text-muted mt-1.5">
          <span>{formatCompactArs(cfg.salaryGoalStart)}</span>
          <span className="text-main font-bold">{formatCompactArs(lastSalary)}</span>
          <span>{formatCompactArs(cfg.salaryGoalEnd)}</span>
        </div>
        <div className="mt-4">
          <MiniBars data={data.map((d) => ({ label: short(d.k), value: d.salary, color: '#D97706', hint: `${monthLabel(d.k)}: ${formatMoney(d.salary)}` }))} format={formatCompactArs} limit={cfg.salaryGoalEnd} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Ingresos vs gastos" icon={<BarChart3 className="w-4 h-4" />}>
          <MiniBars data={data.map((d) => ({ label: short(d.k), value: d.income, color: 'var(--mint)', hint: `${monthLabel(d.k)} ingresos: ${formatMoney(d.income)}` }))} format={formatCompactArs} height={90} />
          <div className="mt-3">
            <MiniBars data={data.map((d) => ({ label: short(d.k), value: d.expenses, color: '#E11D48', hint: `${monthLabel(d.k)} gastos: ${formatMoney(d.expenses)}` }))} format={formatCompactArs} height={90} />
          </div>
          <div className="flex gap-4 text-[11px] text-muted mt-2">
            <span>🟩 Ingresos</span>
            <span>🟥 Gastos</span>
          </div>
        </Card>
        <Card title="Ahorro mensual (USD)" icon={<PiggyBank className="w-4 h-4" />}>
          <MiniBars data={data.map((d) => ({ label: short(d.k), value: Math.max(0, d.savedUsd), color: '#2563EB', hint: `${monthLabel(d.k)}: ${formatMoney(d.savedUsd, 'USD')}` }))} format={(v) => `${Math.round(v)}`} height={190} />
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PLAN (configuración)
// ─────────────────────────────────────────────────────────────
const PlanTab: React.FC<{ life: LifeApi; cfg: FinanceConfig; refreshRate: (c?: 'blue' | 'bolsa' | 'oficial') => void; loadingRate: boolean }> = ({ life, cfg, refreshRate, loadingRate }) => {
  const [draft, setDraft] = useState<FinanceConfig>(cfg);
  const { showToast } = useToast();
  const num = (k: keyof FinanceConfig) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: parseAmount(e.target.value) });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Mis reglas (Plan financiero 2026)" icon={<Settings2 className="w-4 h-4" />}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="% de ahorro fijo" hint="Plan: 15% (10–20%)">
              <input className={inputCls} inputMode="decimal" value={draft.savingsPercent} onChange={num('savingsPercent')} />
            </Field>
            <Field label="% fondo de gustos" hint="Ropa, salidas: 5%">
              <input className={inputCls} inputMode="decimal" value={draft.funPercent} onChange={num('funPercent')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aporte a mamá mín.">
              <input className={inputCls} inputMode="numeric" value={draft.momContributionMin} onChange={num('momContributionMin')} />
            </Field>
            <Field label="Aporte a mamá máx.">
              <input className={inputCls} inputMode="numeric" value={draft.momContributionMax} onChange={num('momContributionMax')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sueldo inicio de año">
              <input className={inputCls} inputMode="numeric" value={draft.salaryGoalStart} onChange={num('salaryGoalStart')} />
            </Field>
            <Field label="Sueldo objetivo">
              <input className={inputCls} inputMode="numeric" value={draft.salaryGoalEnd} onChange={num('salaryGoalEnd')} />
            </Field>
          </div>
          <Field label="Cotización USD (manual)" group>
            <div className="flex gap-2">
              <input className={inputCls} inputMode="decimal" value={draft.usdRate} onChange={num('usdRate')} />
              <button type="button" className={btnSecondary} onClick={() => refreshRate('blue')} disabled={loadingRate}>
                <RefreshCw className={`w-4 h-4 ${loadingRate ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm text-main cursor-pointer">
            <input type="checkbox" checked={draft.aguinaldoToSavings} onChange={(e) => setDraft({ ...draft, aguinaldoToSavings: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
            Aguinaldo 100% al ahorro (recordatorio en junio y diciembre)
          </label>
          <div className="p-3 rounded-xl bg-surface-elevated text-xs text-muted leading-relaxed">
            <b className="text-main">Regla de compras grandes:</b> solo si cumplís el ahorro mensual y te sobra después del aguinaldo.
          </div>
        </div>
      </Card>

      <Card title="Topes mensuales por categoría" icon={<Wallet className="w-4 h-4" />}>
        <p className="text-xs text-muted mb-3">Dejá vacío para no poner tope. Se marcan en rojo cuando te pasás.</p>
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {EXPENSE_CATEGORIES.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="text-sm flex-1 text-main">
                {c.emoji} {c.id}
              </span>
              <input
                className={`${inputCls} w-32`}
                inputMode="numeric"
                placeholder="Sin tope"
                value={draft.categoryBudgets[c.id] || ''}
                onChange={(e) => {
                  const v = parseAmount(e.target.value);
                  const next = { ...draft.categoryBudgets };
                  if (v > 0) next[c.id] = v;
                  else delete next[c.id];
                  setDraft({ ...draft, categoryBudgets: next });
                }}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            life.setSingleton('financeConfig', { ...draft, usdRateSource: draft.usdRate !== cfg.usdRate ? 'Manual' : cfg.usdRateSource });
            showToast('Plan financiero guardado.', { type: 'success' });
          }}
        >
          Guardar plan
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MODALES
// ─────────────────────────────────────────────────────────────
export const TxModal: React.FC<{
  life: LifeApi;
  initial?: Partial<Transaction>;
  goals: SavingsGoal[];
  debts: Debt[];
  onClose: () => void;
}> = ({ life, initial, goals, debts, onClose }) => {
  const cfg = life.store.financeConfig;
  const [type, setType] = useState<TxType>(initial?.type || 'expense');
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency || (initial?.type === 'saving' ? 'USD' : 'ARS'));
  const defaultCat = (t: TxType) => (t === 'income' ? 'Sueldo SMV' : t === 'expense' ? 'Comida' : t === 'saving' ? 'Ahorro' : 'Retiro');
  const [category, setCategory] = useState(initial?.category || defaultCat(initial?.type || 'expense'));
  const [date, setDate] = useState(initial?.date || getTodayDateString());
  const [note, setNote] = useState(initial?.note || '');
  const [usdRate, setUsdRate] = useState(String(initial?.usdRate || cfg.usdRate || ''));
  const [goalId, setGoalId] = useState(initial?.goalId || '');
  const [debtId, setDebtId] = useState(initial?.debtId || '');
  const isEdit = Boolean(initial?.id);
  const value = parseAmount(amount);
  const rate = parseAmount(usdRate);

  const changeType = (t: TxType) => {
    setType(t);
    setCategory(defaultCat(t));
    if (t === 'saving' || t === 'withdrawal') setCurrency('USD');
  };

  const save = () => {
    if (value <= 0) return;
    const now = nowIso();
    const tx: Transaction = {
      id: initial?.id || newId('tx'),
      date,
      type,
      amount: value,
      currency,
      category,
      note: note.trim() || undefined,
      usdRate: rate > 0 ? rate : undefined,
      goalId: (type === 'saving' || type === 'withdrawal') && goalId ? goalId : undefined,
      debtId: type === 'expense' && debtId ? debtId : undefined,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    };
    life.upsert('transactions', tx);
    onClose();
  };

  const cats = type === 'income' ? INCOME_CATEGORIES : type === 'expense' ? EXPENSE_CATEGORIES : [{ id: type === 'saving' ? 'Ahorro' : 'Retiro', emoji: '🐷' }];

  return (
    <Modal
      open
      onClose={onClose}
      kicker={isEdit ? 'Editar movimiento' : 'Nuevo movimiento'}
      title={TYPE_META[type].label}
      footer={
        <>
          {isEdit && (
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                life.remove('transactions', initial!.id!);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={btnPrimary} onClick={save} disabled={value <= 0}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(TYPE_META) as TxType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changeType(t)}
            className={`px-2 py-2 rounded-xl text-[11px] font-semibold border min-h-[44px] cursor-pointer ${type === t ? 'text-white border-transparent' : 'bg-surface-elevated border-app text-muted'}`}
            style={type === t ? { backgroundColor: TYPE_META[t].color } : undefined}
          >
            {TYPE_META[t].label.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label="Monto">
          <input autoFocus className={`${inputCls} text-lg font-mono`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
        <Field label="Moneda">
          <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </Field>
      </div>
      {(currency === 'USD' || type === 'saving') && (
        <Field label="Cotización usada (ARS por USD)" hint={currency === 'USD' && value > 0 && rate > 0 ? `≈ ${formatMoney(toArs(value, 'USD', rate))}` : undefined}>
          <input className={inputCls} inputMode="decimal" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} />
        </Field>
      )}
      {(type === 'income' || type === 'expense') && (
        <Field label="Categoría" group>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs border cursor-pointer ${category === c.id ? 'bg-accent text-accent-contrast border-accent' : 'bg-surface-elevated border-app text-main'}`}
              >
                {c.emoji} {c.id}
              </button>
            ))}
          </div>
        </Field>
      )}
      {(type === 'saving' || type === 'withdrawal') && goals.length > 0 && (
        <Field label="Meta" hint="Si no elegís, va a tu meta principal.">
          <select className={inputCls} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">Meta principal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {type === 'expense' && debts.length > 0 && (
        <Field label="¿Es pago de una deuda?">
          <select className={inputCls} value={debtId} onChange={(e) => setDebtId(e.target.value)}>
            <option value="">No</option>
            {debts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.creditor})
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Nota">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </Field>
      </div>
    </Modal>
  );
};

const GoalModal: React.FC<{ life: LifeApi; initial?: Partial<SavingsGoal>; onClose: () => void }> = ({ life, initial, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '🎯');
  const [target, setTarget] = useState(String(initial?.targetAmount || ''));
  const [currency, setCurrency] = useState<Currency>(initial?.currency || 'USD');
  const [deadline, setDeadline] = useState(initial?.deadline || '');
  const [initialAmount, setInitialAmount] = useState(String(initial?.initialAmount || ''));
  const [notes, setNotes] = useState(initial?.notes || '');
  const [isPrimary, setIsPrimary] = useState(Boolean(initial?.isPrimary));
  const isEdit = Boolean(initial?.id);

  const save = () => {
    if (!name.trim() || parseAmount(target) <= 0) return;
    const now = nowIso();
    const id = initial?.id || newId('goal');
    if (isPrimary) {
      Object.values(life.store.goals).forEach((g) => {
        if (g.isPrimary && g.id !== id) life.upsert('goals', { ...g, isPrimary: false, updatedAt: now });
      });
    }
    life.upsert('goals', {
      id,
      name: name.trim(),
      emoji,
      targetAmount: parseAmount(target),
      currency,
      deadline: deadline || undefined,
      initialAmount: parseAmount(initialAmount) || 0,
      notes: notes.trim() || undefined,
      isPrimary,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker={isEdit ? 'Editar meta' : 'Nueva meta'}
      title={name || 'Meta de ahorro'}
      footer={
        <>
          {isEdit && (
            <button type="button" className={btnDanger} onClick={() => { life.remove('goals', initial!.id!); onClose(); }}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save}>Guardar</button>
        </>
      }
    >
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <Field label="Emoji">
          <input className={`${inputCls} text-center`} value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
        </Field>
        <Field label="Nombre">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Terreno" />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label="Objetivo">
          <input className={inputCls} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Moneda">
          <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha límite">
          <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <Field label="Ya tenía ahorrado">
          <input className={inputCls} inputMode="decimal" value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-main cursor-pointer">
        <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
        Meta principal (recibe los ahorros sin meta asignada)
      </label>
      <Field label="Notas">
        <textarea rows={2} className={textareaCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
};

const DebtModal: React.FC<{ life: LifeApi; initial?: Partial<Debt>; onClose: () => void }> = ({ life, initial, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [creditor, setCreditor] = useState(initial?.creditor || '');
  const [total, setTotal] = useState(String(initial?.totalAmount || ''));
  const [currency, setCurrency] = useState<Currency>(initial?.currency || 'USD');
  const [paidBefore, setPaidBefore] = useState(String(initial?.paidBefore || ''));
  const [notes, setNotes] = useState(initial?.notes || '');
  const isEdit = Boolean(initial?.id);

  const save = () => {
    if (!name.trim() || parseAmount(total) <= 0) return;
    const now = nowIso();
    life.upsert('debts', {
      id: initial?.id || newId('debt'),
      name: name.trim(),
      creditor: creditor.trim() || '—',
      totalAmount: parseAmount(total),
      currency,
      paidBefore: parseAmount(paidBefore) || 0,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker={isEdit ? 'Editar deuda' : 'Nueva deuda'}
      title={name || 'Deuda'}
      footer={
        <>
          {isEdit && (
            <button type="button" className={btnDanger} onClick={() => { life.remove('debts', initial!.id!); onClose(); }}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save}>Guardar</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Qué es">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="A quién">
          <input className={inputCls} value={creditor} onChange={(e) => setCreditor(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label="Total">
          <input className={inputCls} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
        <Field label="Moneda">
          <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
          </select>
        </Field>
      </div>
      <Field label="Ya pagado antes de usar la app">
        <input className={inputCls} inputMode="decimal" value={paidBefore} onChange={(e) => setPaidBefore(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Notas">
        <textarea rows={2} className={textareaCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
};
