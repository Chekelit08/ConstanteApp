import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { getArea } from '../../types/life';

// ─────────────────────────────────────────────────────────────
// Clases base (mismo lenguaje visual que el resto de CONSTANTE)
// ─────────────────────────────────────────────────────────────
export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-app bg-surface-elevated text-sm text-main placeholder:text-dim focus:outline-hidden focus:border-accent min-h-[44px]';
export const textareaCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-app bg-surface-elevated text-sm text-main placeholder:text-dim focus:outline-hidden focus:border-accent leading-relaxed';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition min-h-[44px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated border border-app text-xs font-bold uppercase tracking-wider text-main hover:border-accent transition min-h-[44px] cursor-pointer disabled:opacity-40';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted hover:text-main hover:bg-surface-elevated transition min-h-[40px] cursor-pointer';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 transition min-h-[44px] cursor-pointer';
export const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1';
export const kickerCls = 'text-[11px] font-mono font-bold uppercase tracking-widest text-muted';

// ─────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────
export const PageHeader: React.FC<{
  kicker: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ kicker, title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-app">
    <div className="min-w-0">
      <span className={kickerCls}>{kicker}</span>
      <h2 className="font-['Oswald'] text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wider text-main mt-0.5">
        {title}
      </h2>
      {subtitle && <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Card: React.FC<{
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
}> = ({ title, icon, action, className = '', children, padded = true }) => (
  <section className={`rounded-3xl bg-surface border border-app shadow-xs ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>
    {(title || action) && (
      <div className={`flex items-center justify-between gap-3 ${padded ? 'mb-4' : 'p-5 sm:p-6 pb-0 mb-4'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          {title && (
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-muted truncate">{title}</h3>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-center justify-between pb-2 border-b border-app">
    <h3 className="font-['Oswald'] text-base sm:text-lg font-bold uppercase tracking-wider text-main">{children}</h3>
    {right}
  </div>
);

export const Tabs: React.FC<{
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (id: string) => void;
}> = ({ tabs, value, onChange }) => (
  <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-2xl border border-app overflow-x-auto no-scrollbar">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onChange(t.id)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition min-h-[38px] cursor-pointer ${
          value === t.id ? 'bg-accent text-accent-contrast shadow-2xs' : 'text-muted hover:text-main'
        }`}
      >
        {t.icon}
        <span>{t.label}</span>
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────
export const Modal: React.FC<{
  open: boolean;
  title: string;
  kicker?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ open, title, kicker, onClose, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} bg-surface border border-app rounded-t-3xl sm:rounded-3xl shadow-2xl text-main max-h-[92vh] flex flex-col safe-bottom`}
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-3 border-b border-app">
          <div className="min-w-0">
            {kicker && <span className={kickerCls}>{kicker}</span>}
            <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main truncate">{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface-elevated cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="p-4 sm:p-5 border-t border-app flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string; group?: boolean }> = ({
  label,
  hint,
  children,
  className = '',
  group,
}) => {
  // Con grupos de botones se usa <div role="group"> para no anidar controles dentro de un <label>
  const Tag = (group ? 'div' : 'label') as 'div';
  return (
    <Tag className={`block ${className}`} {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-dim mt-1">{hint}</span>}
    </Tag>
  );
};

// ─────────────────────────────────────────────────────────────
// Datos
// ─────────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{ value: number; color?: string; height?: string; danger?: boolean }> = ({
  value,
  color,
  height = 'h-2.5',
  danger,
}) => {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full bg-surface-elevated rounded-full ${height} overflow-hidden border border-app`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color ? '' : danger ? 'bg-red-500' : 'bg-accent'}`}
        style={{ width: `${v}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
};

export const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'good' | 'bad' | 'accent';
  icon?: React.ReactNode;
}> = ({ label, value, sub, tone = 'default', icon }) => {
  const toneCls =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'bad'
        ? 'text-red-600 dark:text-red-400'
        : tone === 'accent'
          ? 'text-accent'
          : 'text-main';
  return (
    <div className="p-4 rounded-2xl bg-surface border border-app min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`font-['Bebas_Neue'] text-3xl tracking-wide mt-1 leading-none truncate ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1 truncate">{sub}</div>}
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}> = ({ icon, title, text, action }) => (
  <div className="text-center py-10 px-4 border border-dashed border-app rounded-3xl bg-surface-elevated/40 space-y-3">
    {icon && <div className="mx-auto w-fit text-dim opacity-70">{icon}</div>}
    <h4 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main">{title}</h4>
    {text && <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">{text}</p>}
    {action && <div className="pt-1">{action}</div>}
  </div>
);

export const Chip: React.FC<{
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  color?: string;
}> = ({ active, onClick, children, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition cursor-pointer whitespace-nowrap ${
      active ? 'bg-accent text-accent-contrast border-accent' : 'bg-surface-elevated border-app text-muted hover:text-main'
    }`}
    style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
  >
    {children}
  </button>
);

export const AreaBadge: React.FC<{ area: string; compact?: boolean }> = ({ area, compact }) => {
  const a = getArea(area);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ backgroundColor: `${a.color}1F`, color: a.color }}
    >
      <span>{a.emoji}</span>
      {!compact && <span>{a.label}</span>}
    </span>
  );
};

/** Gráfico de barras simple y accesible (sin dependencias) */
export const MiniBars: React.FC<{
  data: { label: string; value: number; color?: string; hint?: string }[];
  max?: number;
  limit?: number;
  height?: number;
  format?: (v: number) => string;
}> = ({ data, max, limit, height = 120, format = (v) => String(Math.round(v)) }) => {
  const top = Math.max(max ?? 0, limit ?? 0, ...data.map((d) => d.value), 1);
  return (
    <div className="w-full">
      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {typeof limit === 'number' && limit > 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-red-500/60 pointer-events-none"
            style={{ bottom: `${(limit / top) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[9px] font-mono text-red-500">límite</span>
          </div>
        )}
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0 group" title={d.hint || `${d.label}: ${format(d.value)}`}>
            <span className="text-[9px] font-mono text-muted mb-0.5 opacity-0 group-hover:opacity-100 transition">{format(d.value)}</span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${Math.max(d.value > 0 ? 3 : 0, (d.value / top) * 100)}%`,
                backgroundColor: d.color || 'var(--color-accent)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] font-mono text-muted truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Anillo de progreso */
export const Ring: React.FC<{ value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }> = ({
  value,
  size = 88,
  stroke = 9,
  color,
  children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-surface-elevated)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color || 'var(--color-accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

/** Barra apilada horizontal (distribución) */
export const StackBar: React.FC<{ parts: { value: number; color: string; label: string }[] }> = ({ parts }) => {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-elevated border border-app">
      {parts.map((p, i) => (
        <div key={i} title={`${p.label}: ${Math.round((p.value / total) * 100)}%`} style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }} />
      ))}
    </div>
  );
};
