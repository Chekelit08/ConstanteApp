import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, FileUp, Upload } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ImportRule, TxType } from '../types/life';
import { ImportedRow, readBankFile, ruleKey } from '../services/bankImport';
import { formatMoney, newId, nowIso } from '../utils/lifeUtils';
import { btnPrimary, btnSecondary, Modal } from './ui';
import { useToast } from './Toast';

const selCls = 'bg-surface-elevated border border-app rounded-lg px-1.5 py-1 text-[11px] text-main max-w-[9.5rem]';

/** Importar movimientos de Mercado Pago (CSV, Excel o PDF del resumen) */
export const BankImportModal: React.FC<{ life: LifeApi; onClose: () => void }> = ({ life, onClose }) => {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportedRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [help, setHelp] = useState(true);
  const rules = life.store.financeConfig.importRules || {};

  const existing = useMemo(() => new Set(Object.values(life.store.transactions).map((t) => t.externalId).filter(Boolean)), [life.store.transactions]);

  const onFile = async (file: File) => {
    setLoading(true);
    try {
      const list = await readBankFile(file, rules);
      if (!list.length) {
        showToast('No encontré movimientos en ese archivo. Probá con el CSV o Excel.', { type: 'error' });
        return;
      }
      setRows(list);
      setHelp(false);
    } catch (e) {
      console.error(e);
      showToast('No pude leer el archivo', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fresh = (rows || []).filter((r) => !existing.has(r.key));
  const dupes = (rows?.length || 0) - fresh.length;
  const chosen = fresh.filter((r) => r.include);
  const totals = chosen.reduce(
    (acc, r) => {
      if (r.type === 'income') acc.in += Math.abs(r.amount);
      else acc.out += Math.abs(r.amount);
      return acc;
    },
    { in: 0, out: 0 }
  );

  const patch = (key: string, p: Partial<ImportedRow>) => setRows((rs) => rs!.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const save = () => {
    const now = nowIso();
    const learned: Record<string, ImportRule> = { ...rules };
    fresh.forEach((r) => (learned[ruleKey(r.description)] = { type: r.type, category: r.category, include: r.include }));
    chosen.forEach((r) =>
      life.upsert('transactions', {
        id: newId('tx'),
        date: r.date,
        type: r.type,
        amount: Math.abs(r.amount),
        currency: 'ARS',
        category: r.category,
        note: r.description,
        usdRate: life.store.financeConfig.usdRate,
        externalId: r.key,
        createdAt: now,
        updatedAt: now,
      })
    );
    life.patchSingleton('financeConfig', { importRules: learned });
    showToast(`Importé ${chosen.length} movimientos de Mercado Pago`, { type: 'success' });
    onClose();
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      kicker="Mercado Pago"
      title="Importar movimientos"
      footer={
        rows ? (
          <>
            <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()}>
              Otro archivo
            </button>
            <button type="button" className={btnPrimary} disabled={!chosen.length} onClick={save}>
              Importar {chosen.length}
            </button>
          </>
        ) : undefined
      }
    >
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

      {!rows && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full flex flex-col items-center gap-2 p-8 rounded-[24px] border-2 border-dashed border-app hover:border-accent text-center cursor-pointer transition"
        >
          <FileUp className="w-8 h-8 text-accent" />
          <span className="font-display text-lg font-bold text-main">{loading ? 'Leyendo…' : 'Elegí el archivo de Mercado Pago'}</span>
          <span className="text-xs text-muted">CSV, Excel o el PDF del resumen de cuenta</span>
        </button>
      )}

      <button type="button" className="flex items-center gap-1.5 text-sm font-semibold text-accent cursor-pointer" onClick={() => setHelp(!help)}>
        <ChevronDown className={`w-4 h-4 transition ${help ? 'rotate-180' : ''}`} /> ¿Cómo lo descargo?
      </button>
      {help && (
        <div className="text-sm text-muted space-y-2 leading-relaxed">
          <p>
            <b className="text-main">Desde la app de MP:</b> entrá a tu <b className="text-main">Actividad</b>, tocá el ícono de descarga y pedí el <b className="text-main">resumen de cuenta</b> del mes. Te llega un PDF: guardalo en Archivos y elegilo acá.
          </p>
          <p>
            <b className="text-main">Desde la compu (mejor):</b> en mercadopago.com.ar buscá <b className="text-main">Reportes</b>, generá el de tu dinero o de todas las transacciones del período y bajalo en <b className="text-main">CSV o Excel</b>.
          </p>
          <p className="text-xs text-dim">
            Los nombres de los menús de MP cambian seguido; si no los encontrás, buscá "resumen" o "reporte" en la app. También sirven archivos de otros bancos con columnas de fecha, descripción y monto.
          </p>
        </div>
      )}

      {rows && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-surface-elevated">
              <div className="font-num text-lg font-bold text-[var(--mint)]">{formatMoney(totals.in)}</div>
              <div className="text-[11px] text-dim">entra</div>
            </div>
            <div className="p-3 rounded-2xl bg-surface-elevated">
              <div className="font-num text-lg font-bold text-[var(--danger)]">{formatMoney(totals.out)}</div>
              <div className="text-[11px] text-dim">sale</div>
            </div>
            <div className="p-3 rounded-2xl bg-surface-elevated">
              <div className="font-num text-lg font-bold text-main">{chosen.length}</div>
              <div className="text-[11px] text-dim">a importar</div>
            </div>
          </div>
          <p className="text-xs text-dim">
            Revisá las categorías: lo que corrijas lo recuerdo para la próxima. Las reservas y pagos de tarjeta vienen destildados para no contarlos dos veces.
            {dupes > 0 && ` ${dupes} ya estaban importados y no se repiten.`}
          </p>
          <ul className="divide-y divide-[var(--border-subtle)] -mx-1">
            {fresh.map((r) => {
              const cats = r.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
              return (
                <li key={r.key} className={`flex items-start gap-2.5 py-2.5 px-1 ${r.include ? '' : 'opacity-50'}`}>
                  <input type="checkbox" checked={r.include} onChange={(e) => patch(r.key, { include: e.target.checked })} className="mt-1 w-4 h-4 accent-[var(--accent)]" aria-label={`Importar ${r.description}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-main truncate">{r.description}</span>
                      <span className={`font-num text-sm font-bold shrink-0 ${r.amount < 0 ? 'text-[var(--danger)]' : 'text-[var(--mint)]'}`}>
                        {r.amount < 0 ? '−' : '+'}
                        {formatMoney(Math.abs(r.amount))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] font-mono text-dim">{r.date.slice(8)}/{r.date.slice(5, 7)}</span>
                      <select
                        className={selCls}
                        aria-label="Tipo"
                        value={r.type}
                        onChange={(e) => {
                          const type = e.target.value as TxType;
                          patch(r.key, { type, category: type === 'income' ? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1].id : type === 'expense' ? 'Otros' : type === 'saving' ? 'Ahorro' : 'Retiro' });
                        }}
                      >
                        <option value="expense">Gasto</option>
                        <option value="income">Ingreso</option>
                        <option value="saving">Ahorro</option>
                        <option value="withdrawal">Retiro</option>
                      </select>
                      {(r.type === 'income' || r.type === 'expense') && (
                        <select className={selCls} aria-label="Categoría" value={r.category} onChange={(e) => patch(r.key, { category: e.target.value })}>
                          {cats.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.emoji} {c.id}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {fresh.length === 0 && <p className="text-sm text-muted text-center py-4">Todo lo de este archivo ya estaba en NORTE ✓</p>}
        </>
      )}
      {!rows && (
        <p className="text-xs text-dim flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> El archivo se lee acá en tu dispositivo; no se sube a ningún lado.
        </p>
      )}
    </Modal>
  );
};
