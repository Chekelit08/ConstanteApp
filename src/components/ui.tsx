import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getArea } from '../types/life';

// ─────────────────────────────────────────────────────────────
// Clases base de NORTE
// ─────────────────────────────────────────────────────────────
export const inputCls =
  'w-full px-3.5 py-2.5 rounded-2xl border border-app bg-surface-elevated text-[15px] text-main placeholder:text-dim focus:outline-hidden focus:border-accent focus:ring-4 focus:ring-[var(--accent-subtle)] transition min-h-[46px]';
export const textareaCls =
  'w-full px-3.5 py-3 rounded-2xl border border-app bg-surface-elevated text-[15px] text-main placeholder:text-dim focus:outline-hidden focus:border-accent focus:ring-4 focus:ring-[var(--accent-subtle)] transition leading-relaxed';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-accent text-accent-contrast text-sm font-semibold hover:brightness-110 active:scale-[0.97] transition min-h-[44px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_-12px_var(--accent)]';
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-surface-elevated border border-app text-sm font-semibold text-main hover:border-[var(--text-dim)] active:scale-[0.97] transition min-h-[44px] cursor-pointer disabled:opacity-40';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-muted hover:text-main hover:bg-surface-elevated transition min-h-[40px] cursor-pointer disabled:opacity-40';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[color-mix(in_srgb,var(--danger)_45%,transparent)] text-[var(--danger)] text-sm font-semibold hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] transition min-h-[44px] cursor-pointer';
export const labelCls = 'block text-xs font-medium text-muted mb-1.5';
export const kickerCls = 'text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-dim';

// ─────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────
export const PageHeader: React.FC<{
  kicker: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ kicker, title, subtitle, actions }) => (
  <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2 animate-rise">
    <div className="min-w-0">
      <span className={kickerCls}>{kicker}</span>
      <h1 className="font-display text-[34px] sm:text-5xl font-bold text-main mt-1 leading-[1.02]">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </header>
);

export const Card: React.FC<{
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
}> = ({ title, icon, action, className = '', children, padded = true }) => (
  <section className={`rounded-[26px] bg-surface border border-subtle shadow-card ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>
    {(title || action) && (
      <div className={`flex items-center justify-between gap-3 ${padded ? 'mb-4' : 'p-5 sm:p-6 pb-0 mb-4'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="text-accent shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px]">{icon}</span>}
          {title && <h3 className="font-display text-[17px] font-semibold text-main truncate">{title}</h3>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-center justify-between pb-1">
    <h3 className="font-display text-xl font-semibold text-main">{children}</h3>
    {right}
  </div>
);

export const Tabs: React.FC<{
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (id: string) => void;
}> = ({ tabs, value, onChange }) => (
  <div role="tablist" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
    {tabs.map((t) => {
      const active = value === t.id;
      return (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition min-h-[38px] cursor-pointer border ${
            active ? 'bg-[var(--text-main)] text-[var(--bg-app)] border-transparent' : 'border-app text-muted hover:text-main'
          }`}
        >
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Modal (hoja inferior en celular)
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  // portal al body: si no, un contenedor con transform/animación lo encierra y la barra de abajo lo tapa
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-[rgba(6,7,16,0.62)] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} bg-surface border border-app rounded-t-[30px] sm:rounded-[30px] shadow-2xl text-main max-h-[92vh] max-h-[92dvh] flex flex-col safe-bottom animate-rise`}
      >
        <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-surface-muted" />
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-4 sm:pt-6 pb-3">
          <div className="min-w-0">
            {kicker && <span className={kickerCls}>{kicker}</span>}
            <h3 className="font-display text-2xl font-bold text-main truncate">{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full text-muted hover:text-main hover:bg-surface-elevated cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 pb-5 overflow-y-auto overscroll-contain space-y-4">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-subtle flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string; group?: boolean }> = ({
  label,
  hint,
  children,
  className = '',
  group,
}) => {
  const Tag = (group ? 'div' : 'label') as 'div';
  return (
    <Tag className={`block ${className}`} {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="block text-xs text-dim mt-1.5">{hint}</span>}
    </Tag>
  );
};

// ─────────────────────────────────────────────────────────────
// Datos
// ─────────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{ value: number; color?: string; height?: string; danger?: boolean }> = ({
  value,
  color,
  height = 'h-2',
  danger,
}) => {
  const v = Math.max(0, Math.min(100, value));
  const bg = color || (danger ? 'var(--danger)' : 'var(--accent)');
  return (
    <div className={`w-full bg-surface-muted rounded-full ${height} overflow-hidden`}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: bg }} />
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
  const color =
    tone === 'good' ? 'var(--mint)' : tone === 'bad' ? 'var(--danger)' : tone === 'accent' ? 'var(--accent)' : 'var(--text-main)';
  return (
    <div className="p-4 rounded-[22px] bg-surface border border-subtle shadow-card min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="font-num text-[28px] font-bold mt-1 leading-none truncate" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-xs text-dim mt-1.5 truncate">{sub}</div>}
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}> = ({ icon, title, text, action }) => (
  <div className="text-center py-10 px-4 rounded-[26px] border border-dashed border-app space-y-3">
    {icon && <div className="mx-auto w-fit text-dim">{icon}</div>}
    <h4 className="font-display text-xl font-semibold text-main">{title}</h4>
    {text && <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">{text}</p>}
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
    aria-pressed={active}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer whitespace-nowrap ${
      active ? 'text-[var(--bg-app)] border-transparent' : 'bg-transparent border-app text-muted hover:text-main'
    }`}
    style={active ? { backgroundColor: color || 'var(--text-main)' } : undefined}
  >
    {children}
  </button>
);

export const AreaBadge: React.FC<{ area: string; compact?: boolean }> = ({ area, compact }) => {
  const a = getArea(area);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: `color-mix(in srgb, ${a.color} 16%, transparent)`, color: `color-mix(in srgb, ${a.color} 75%, var(--text-main))` }}
    >
      <span>{a.emoji}</span>
      {!compact && <span>{a.label}</span>}
    </span>
  );
};

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
          <div className="absolute left-0 right-0 border-t border-dashed pointer-events-none" style={{ bottom: `${(limit / top) * 100}%`, borderColor: 'var(--danger)' }}>
            <span className="absolute -top-4 right-0 text-[10px] font-mono" style={{ color: 'var(--danger)' }}>
              meta
            </span>
          </div>
        )}
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0 group" title={d.hint || `${d.label}: ${format(d.value)}`}>
            <span className="text-[10px] font-mono text-muted mb-0.5 opacity-0 group-hover:opacity-100 transition">{format(d.value)}</span>
            <div
              className="w-full rounded-full transition-all duration-700"
              style={{ height: `${Math.max(d.value > 0 ? 4 : 0, (d.value / top) * 100)}%`, background: d.color || 'var(--accent)' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] font-mono text-dim truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color || 'var(--accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

export const StackBar: React.FC<{ parts: { value: number; color: string; label: string }[] }> = ({ parts }) => {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-muted gap-0.5">
      {parts.map((p, i) => (
        <div key={i} title={`${p.label}: ${Math.round((p.value / total) * 100)}%`} style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }} />
      ))}
    </div>
  );
};
