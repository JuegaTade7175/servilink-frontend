import { type ReactNode } from 'react';

// ─── Utility ──────────────────────────────────────────────────────────────────
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
  'bg-amber-500', 'bg-red-500', 'bg-violet-500',
  'bg-emerald-500', 'bg-sky-500',
];

const AVATAR_SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-13 h-13 text-base',
  xl: 'w-18 h-18 text-xl',
};

export function Avatar({
  name,
  url,
  size = 'md',
}: {
  name: string;
  url?: string;
  size?: keyof typeof AVATAR_SIZES;
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const sizeClass = AVATAR_SIZES[size];

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0 ring-2 ring-white/10', sizeClass)}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-white/10',
        sizeClass,
        color
      )}
    >
      {initials}
    </div>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
export function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  const filled = Math.max(0, Math.min(max, Math.round(rating || 0)));
  return (
    <span className="text-amber-400 tracking-wide text-sm leading-none">
      {'★'.repeat(filled)}
      <span className="text-white/20">{'★'.repeat(max - filled)}</span>
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:     { label: 'Pendiente',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  CONFIRMED:   { label: 'Confirmado',   cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  IN_PROGRESS: { label: 'En progreso',  cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  COMPLETED:   { label: 'Completado',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  CANCELLED:   { label: 'Cancelado',    cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' | 'md' }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status,
    cls: 'bg-white/10 text-white/60 border-white/20',
  };
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : size === 'md' ? 'text-xs px-3 py-1' : 'text-[11px] px-2 py-0.5';
  return (
    <span className={cn('rounded-full border font-semibold tracking-wide', sizeClass, cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-[#1a1b2e] border border-[#252640] rounded-2xl shadow-2xl',
          maxWidth
        )}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252640]">
          <h2 className="font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6b6d8a] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div
      className={cn(
        sz,
        'rounded-full border-2 border-white/10 border-t-[var(--accent)] animate-spin'
      )}
    />
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-5xl mb-1">{icon}</div>
      <p className="font-semibold text-[#e8e9f3]">{title}</p>
      {description && <p className="text-sm text-[#6b6d8a] max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className,
  onClick,
  highlighted,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  highlighted?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 transition-all duration-200',
        highlighted
          ? 'bg-[#1e1f38] border-[#6c63ff]/50'
          : 'bg-[#1a1b2e] border-[#252640]',
        onClick && 'cursor-pointer hover:border-[#6c63ff]/40 hover:bg-[#1e1f38]',
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({
  label,
  error,
  className,
  ...props
}: {
  label?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-[#6b6d8a] uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full bg-[#13141f] border rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors',
          error
            ? 'border-red-500/60 focus:border-red-500'
            : 'border-[#252640] focus:border-[#6c63ff]/60',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({
  label,
  error,
  children,
  className,
  ...props
}: {
  label?: string;
  error?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-[#6b6d8a] uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full bg-[#13141f] border rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors appearance-none',
          error
            ? 'border-red-500/60 focus:border-red-500'
            : 'border-[#252640] focus:border-[#6c63ff]/60',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({
  label,
  error,
  className,
  ...props
}: {
  label?: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-[#6b6d8a] uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full bg-[#13141f] border rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors resize-none',
          error
            ? 'border-red-500/60 focus:border-red-500'
            : 'border-[#252640] focus:border-[#6c63ff]/60',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-[#6c63ff] hover:bg-[#5b54e8] text-white border-transparent',
  secondary: 'bg-[#252640] hover:bg-[#2e2f52] text-[#e8e9f3] border-[#252640]',
  danger: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30',
  ghost: 'bg-transparent hover:bg-white/5 text-[#6b6d8a] hover:text-[#e8e9f3] border-transparent',
  success: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'text-[11px] px-2.5 py-1 rounded-lg',
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-6 py-3 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={loading || props.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        icon && <span className="text-base leading-none">{icon}</span>
      )}
      {children}
    </button>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a] mb-2">
      {children}
    </p>
  );
}

// ─── Info Grid ────────────────────────────────────────────────────────────────
export function InfoGrid({ items }: { items: { icon: string; label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ icon, label, value }) => (
        <div key={label} className="bg-[#13141f] rounded-xl p-3">
          <div className="text-[10px] text-[#6b6d8a] uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>{icon}</span> {label}
          </div>
          <div className="font-semibold text-sm text-[#e8e9f3] break-words">{value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({
  message,
  type = 'info',
}: {
  message: string;
  type?: 'success' | 'error' | 'info';
}) {
  const cfg = {
    success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    info: 'bg-[#6c63ff]/20 border-[#6c63ff]/40 text-[#a09bff]',
  }[type];
  const icon = { success: '✓', error: '✕', info: 'ℹ' }[type];
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-[3000] flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-2xl backdrop-blur',
        cfg
      )}
    >
      <span>{icon}</span>
      {message}
    </div>
  );
}

export { cn };
