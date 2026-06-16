import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { bookingsApi, professionalsApi, confirmationsApi, paymentsApi, reviewsApi } from '../api';
import type {
  Booking, BookingStatus, Professional, Payment,
  BookingConfirmation, Review, PaymentMethod, ServiceItem,
} from '../types';

function cn(...c: (string | false | undefined | null)[]) { return c.filter(Boolean).join(' '); }

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { value: 'CARD', label: 'Tarjeta', icon: '💳', desc: 'Visa, Mastercard, Amex' },
  { value: 'YAPE', label: 'Yape', icon: '📱', desc: 'Pago con QR instantáneo' },
  { value: 'BANK_TRANSFER', label: 'Transferencia', icon: '🏦', desc: 'BCP, Interbank, BBVA' },
];

const STATUS_FILTERS: { value: BookingStatus | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL', label: 'Todas', icon: '📋' },
  { value: 'PENDING', label: 'Pendientes', icon: '⏳' },
  { value: 'CONFIRMED', label: 'Confirmadas', icon: '✅' },
  { value: 'IN_PROGRESS', label: 'En progreso', icon: '🔧' },
  { value: 'COMPLETED', label: 'Completadas', icon: '🎉' },
  { value: 'CANCELLED', label: 'Canceladas', icon: '❌' },
];

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  CONFIRMED: { label: 'Confirmado', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  IN_PROGRESS: { label: 'En progreso', cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  COMPLETED: { label: 'Completado', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

function SLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a] mb-2">{children}</p>;
}
function Spinner() {
  return <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin" />;
}
function ErrMsg({ msg }: { msg: string }) {
  return <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{msg}</div>;
}
function Stars({ r }: { r: number }) {
  const rating = Math.max(0, Math.min(5, Math.round(r || 0)));
  return (
    <span className="text-sm">
      <span className="text-amber-400">{'★'.repeat(rating)}</span>
      <span className="text-white/15">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}
function Avatar({ name, url }: { name: string; url?: string }) {
  const colors = ['bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-amber-500', 'bg-violet-500', 'bg-emerald-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white/10" />;
  return <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0', color)}>{initials}</div>;
}
function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' | 'md' }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-white/10 text-white/50 border-white/20' };
  const sz = size === 'xs' ? 'text-[10px] px-2 py-0.5' : size === 'md' ? 'text-xs px-3 py-1' : 'text-[11px] px-2.5 py-0.5';
  return <span className={cn('rounded-full border font-semibold tracking-wide whitespace-nowrap', sz, cfg.cls)}>{cfg.label}</span>;
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#13141f] rounded-xl p-3">
      <div className="text-[10px] text-[#6b6d8a] uppercase tracking-wider mb-1">{label}</div>
      <div className="font-semibold text-sm text-[#e8e9f3] break-words leading-snug">{value}</div>
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-[#1a1b2e] border border-[#252640] rounded-2xl shadow-2xl overflow-hidden flex flex-col', wide ? 'max-w-2xl' : 'max-w-lg')} style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252640] flex-shrink-0">
          <h2 className="font-bold text-sm text-[#e8e9f3]">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6b6d8a] hover:text-white transition-colors text-xs">✕</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Btn({ onClick, disabled, loading, variant = 'primary', size = 'md', icon, children, className }: {
  onClick?: () => void; disabled?: boolean; loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg'; icon?: string;
  children?: React.ReactNode; className?: string;
}) {
  const V = {
    primary: 'bg-[#6c63ff] hover:bg-[#5b54e8] text-white border-transparent',
    secondary: 'bg-[#252640] hover:bg-[#2e2f52] text-[#e8e9f3] border-[#252640]',
    danger: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30',
    ghost: 'bg-transparent hover:bg-white/5 text-[#6b6d8a] hover:text-[#e8e9f3] border-transparent',
    success: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30',
  }[variant];
  const S = { xs: 'text-[11px] px-2.5 py-1 rounded-lg', sm: 'text-xs px-3 py-1.5 rounded-lg', md: 'text-sm px-4 py-2.5 rounded-xl', lg: 'text-sm px-5 py-3 rounded-xl' }[size];
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={cn('inline-flex items-center justify-center gap-2 font-semibold border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed', V, S, className)}>
      {loading ? <Spinner /> : icon && <span className="leading-none">{icon}</span>}
      {children}
    </button>
  );
}

function ToastMsg({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) {
  const cfg = {
    success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    info: 'bg-[#6c63ff]/20 border-[#6c63ff]/40 text-[#a09bff]',
  }[type];
  return <div className={cn('fixed bottom-6 right-6 z-[3000] flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-2xl', cfg)}>{msg}</div>;
}

function CreateModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (b: Booking) => void;
}) {
  const [step, setStep] = useState<'pro' | 'service' | 'details'>('pro');
  const [pros, setPros] = useState<Professional[]>([]);
  const [pro, setPro] = useState<Professional | null>(null);
  const [svc, setSvc] = useState<ServiceItem | null>(null);
  const [loadingPros, setLoadingPros] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ scheduledAt: '', address: '', description: '' });

  useEffect(() => {
    if (!open) return;
    setStep('pro'); setPro(null); setSvc(null); setErr(''); setSearch('');
    setForm({ scheduledAt: '', address: '', description: '' });
    setLoadingPros(true);
    professionalsApi.nearby(-12.0464, -77.0428, 30)
      .then(setPros).catch(() => { }).finally(() => setLoadingPros(false));
  }, [open]);

  const filtered = pros.filter(p =>
    p.userName.toLowerCase().includes(search.toLowerCase()) ||
    p.specialty.toLowerCase().includes(search.toLowerCase())
  );

  const submit = async () => {
    if (!pro || !svc) return;
    if (!form.scheduledAt || !form.address.trim()) { setErr('Completa fecha y dirección'); return; }
    setSubmitting(true); setErr('');
    try {
      const b = await bookingsApi.create({
        professionalId: pro.id, serviceId: svc.id,
        scheduledAt: form.scheduledAt, address: form.address, description: form.description,
      });
      onCreated(b); onClose();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Error al crear'); }
    finally { setSubmitting(false); }
  };

  const stepLabels = ['Profesional', 'Servicio', 'Detalles'];
  const stepKeys = ['pro', 'service', 'details'];

  return (
    <Modal open={open} onClose={onClose} title="Nueva reserva" wide>
      { }
      <div className="flex items-center gap-0 mb-6">
        {stepLabels.map((label, i) => {
          const key = stepKeys[i];
          const currentIdx = stepKeys.indexOf(step);
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  done ? 'bg-[#6c63ff] border-[#6c63ff] text-white' :
                    active ? 'border-[#6c63ff] text-[#6c63ff]' : 'border-[#252640] text-[#6b6d8a]')}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={cn('text-[10px] font-semibold',
                  active ? 'text-[#6c63ff]' : done ? 'text-[#e8e9f3]' : 'text-[#6b6d8a]')}>{label}</span>
              </div>
              {i < 2 && <div className={cn('h-px flex-1 mb-4', done ? 'bg-[#6c63ff]' : 'bg-[#252640]')} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 'pro' && (
          <motion.div key="pro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .18 }} className="space-y-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar profesional..."
              className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors" />
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {loadingPros ? <div className="flex justify-center py-8"><Spinner /></div>
                : filtered.length === 0 ? <p className="text-center text-[#6b6d8a] text-sm py-8">Sin resultados</p>
                  : filtered.map(p => (
                    <div key={p.id} onClick={() => { setPro(p); setStep('service'); }}
                      className="flex items-start gap-3 p-3 bg-[#13141f] border border-[#252640] rounded-xl cursor-pointer hover:border-[#6c63ff]/40 hover:bg-[#1a1b2e] transition-all">
                      <Avatar name={p.userName} url={p.profilePictureUrl} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{p.userName}</span>
                          {p.isVerified && <span className="text-emerald-400 text-xs">✓</span>}
                        </div>
                        <div className="text-xs text-[#6c63ff] font-medium">{p.specialty}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <Stars r={p.averageRating} />
                          <span className="text-[10px] text-[#6b6d8a]">{(p.averageRating ?? 0).toFixed(1)} ({p.totalReviews})</span>
                          <span className="text-xs font-bold text-emerald-400">S/. {p.baseRate}/hr</span>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </motion.div>
        )}

        {step === 'service' && pro && (
          <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .18 }} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-[#6c63ff]/10 rounded-xl border border-[#6c63ff]/20">
              <Avatar name={pro.userName} url={pro.profilePictureUrl} />
              <div className="flex-1"><div className="font-semibold text-sm">{pro.userName}</div><div className="text-xs text-[#6c63ff]">{pro.specialty}</div></div>
              <Btn variant="ghost" size="xs" onClick={() => { setStep('pro'); setPro(null); }}>Cambiar</Btn>
            </div>
            <SLabel>Elige el servicio</SLabel>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {pro.services.length === 0
                ? <p className="text-center text-[#6b6d8a] text-sm py-6">Sin servicios registrados</p>
                : pro.services.map(s => (
                  <div key={s.id} onClick={() => { setSvc(s); setStep('details'); }}
                    className="flex items-center justify-between p-3 bg-[#13141f] border border-[#252640] rounded-xl cursor-pointer hover:border-[#6c63ff]/40 hover:bg-[#1a1b2e] transition-all">
                    <div>
                      <div className="font-semibold text-sm">{s.name}</div>
                      {s.description && <div className="text-xs text-[#6b6d8a] mt-0.5">{s.description}</div>}
                      {s.estimatedDurationHours && <div className="text-xs text-[#6b6d8a] mt-0.5">⏱ ~{s.estimatedDurationHours}h estimado</div>}
                    </div>
                    {s.referencePrice && (
                      <div className="text-right">
                        <div className="font-bold text-emerald-400 text-sm">S/. {s.referencePrice}</div>
                        <div className="text-[10px] text-[#6b6d8a]">precio ref.</div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {step === 'details' && pro && svc && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .18 }} className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-1">
              <span className="text-xs bg-[#6c63ff]/15 text-[#a09bff] border border-[#6c63ff]/25 rounded-full px-3 py-1">👤 {pro.userName}</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1">🔧 {svc.name}</span>
              {svc.referencePrice && <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">💰 S/. {svc.referencePrice}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Fecha y hora *</label>
              <input type="datetime-local" value={form.scheduledAt}
                onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Dirección *</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Av. Larco 345, Miraflores"
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Descripción (opcional)</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe qué necesitas..."
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors resize-none" />
            </div>
            {err && <ErrMsg msg={err} />}
            <div className="flex gap-2">
              <Btn variant="secondary" size="md" className="flex-1" onClick={() => setStep('service')}>← Atrás</Btn>
              <Btn variant="primary" size="md" className="flex-1" loading={submitting} onClick={submit}>Confirmar reserva</Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function PaymentModal({ open, onClose, booking, onPaid }: {
  open: boolean; onClose: () => void; booking: Booking | null; onPaid: (p: Payment) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setErr(''); setAmount(''); setMethod('CARD'); } }, [open]);

  const submit = async () => {
    if (!booking) return;
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) { setErr('Ingresa un monto válido'); return; }
    setLoading(true); setErr('');
    try { const p = await paymentsApi.process(booking.id, a, method); onPaid(p); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Error al procesar'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Procesar pago">
      {booking && (
        <div className="space-y-5">
          <div className="bg-[#13141f] rounded-xl p-4 border border-[#252640]">
            <SLabel>Reserva</SLabel>
            <p className="font-semibold text-sm">{booking.serviceName}</p>
            <p className="text-xs text-[#6b6d8a]">con {booking.professionalName} · {fmtDate(booking.scheduledAt)}</p>
          </div>
          <div>
            <SLabel>Método de pago</SLabel>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m.value} onClick={() => setMethod(m.value)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    method === m.value ? 'border-[#6c63ff]/60 bg-[#6c63ff]/10' : 'border-[#252640] bg-[#13141f] hover:border-[#6c63ff]/30')}>
                  <span className="text-2xl">{m.icon}</span>
                  <div className="flex-1"><div className="font-semibold text-sm">{m.label}</div><div className="text-xs text-[#6b6d8a]">{m.desc}</div></div>
                  <div className={cn('w-4 h-4 rounded-full border-2 transition-all flex-shrink-0', method === m.value ? 'border-[#6c63ff] bg-[#6c63ff]' : 'border-[#252640]')} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Monto (S/.)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01"
              className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors" />
          </div>
          {err && <ErrMsg msg={err} />}
          <Btn variant="primary" size="lg" className="w-full" loading={loading} onClick={submit} icon="💳">Pagar ahora</Btn>
        </div>
      )}
    </Modal>
  );
}

function ConfirmationModal({ open, onClose, booking, confirmation, onRefresh }: {
  open: boolean; onClose: () => void; booking: Booking | null;
  confirmation: BookingConfirmation | null; onRefresh: () => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setCode(''); setErr(''); } }, [open]);

  const generate = async () => {
    if (!booking) return;
    setGenerating(true);
    try { await confirmationsApi.generate(booking.id); onRefresh(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Error generando código'); }
    finally { setGenerating(false); }
  };

  const confirm = async () => {
    if (code.length !== 6) { setErr('El código debe tener 6 dígitos'); return; }
    setLoading(true); setErr('');
    try { await confirmationsApi.confirm(code); onRefresh(); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Código inválido o expirado'); }
    finally { setLoading(false); }
  };

  const noConf = !confirmation || confirmation.status === 'EXPIRED' || confirmation.status === 'CANCELLED';

  return (
    <Modal open={open} onClose={onClose} title="Confirmación de cita">
      <div className="space-y-5">
        {noConf ? (
          <>
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🔐</div>
              <p className="text-sm text-[#6b6d8a]">Genera un código de 6 dígitos para que el profesional confirme la cita.</p>
            </div>
            <Btn variant="primary" size="lg" className="w-full" loading={generating} onClick={generate}>Generar código</Btn>
          </>
        ) : confirmation.status === 'CONFIRMED' ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-emerald-400 text-lg">¡Cita confirmada!</p>
            {confirmation.confirmedAt && <p className="text-xs text-[#6b6d8a] mt-1">Confirmada el {fmtDateTime(confirmation.confirmedAt)}</p>}
          </div>
        ) : (
          <>
            <div className="bg-[#13141f] rounded-xl p-5 border border-[#252640] text-center">
              <SLabel>Código de confirmación</SLabel>
              <div className="text-4xl font-black tracking-[0.35em] text-[#6c63ff] my-3 font-mono">{confirmation.confirmationCode}</div>
              <p className="text-xs text-[#6b6d8a]">Válido hasta: {fmtDateTime(confirmation.expiresAt)}</p>
            </div>
            <div className="border-t border-[#252640] pt-4">
              <SLabel>¿Eres el profesional? Ingresa el código</SLabel>
              <div className="flex gap-2">
                <input type="text" maxLength={6} placeholder="000000" value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-center text-xl font-mono font-black tracking-[0.4em] text-[#e8e9f3] outline-none" />
                <Btn variant="success" size="md" loading={loading} onClick={confirm}>Confirmar</Btn>
              </div>
            </div>
          </>
        )}
        {err && <ErrMsg msg={err} />}
      </div>
    </Modal>
  );
}

function ReviewModal({ open, onClose, booking, onReviewed }: {
  open: boolean; onClose: () => void; booking: Booking | null; onReviewed: (r: Review) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setRating(5); setComment(''); setErr(''); } }, [open]);

  const submit = async () => {
    if (!booking) return;
    setLoading(true); setErr('');
    try { const r = await reviewsApi.create(booking.id, rating, comment); onReviewed(r); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Error al enviar la reseña'); }
    finally { setLoading(false); }
  };

  const LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

  return (
    <Modal open={open} onClose={onClose} title="Dejar reseña">
      {booking && (
        <div className="space-y-5">
          <p className="text-sm text-[#6b6d8a] text-center">
            ¿Cómo calificarías a <span className="font-semibold text-[#e8e9f3]">{booking.professionalName}</span>?
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)}
                className={cn('text-4xl transition-all hover:scale-110', s <= rating ? 'text-amber-400' : 'text-white/15')}>★</button>
            ))}
          </div>
          <p className="text-center text-sm font-semibold text-[#6b6d8a]">{LABELS[rating]}</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Comentario (opcional)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="Cuéntanos tu experiencia..."
              className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors resize-none" />
          </div>
          {err && <ErrMsg msg={err} />}
          <Btn variant="primary" size="lg" className="w-full" loading={loading} onClick={submit} icon="⭐">Enviar reseña</Btn>
        </div>
      )}
    </Modal>
  );
}

function DetailPanel({ booking, onUpdated }: { booking: Booking; onUpdated: (b: Booking) => void }) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showT = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const loadExtra = useCallback(async () => {
    setLoadingExtra(true);
    const [pay, conf, revs] = await Promise.allSettled([
      paymentsApi.getByBooking(booking.id),
      confirmationsApi.getStatus(booking.id),
      reviewsApi.byProfessional(booking.professionalId),
    ]);
    setPayment(pay.status === 'fulfilled' ? pay.value : null);
    setConfirmation(conf.status === 'fulfilled' ? conf.value : null);
    setReviews(revs.status === 'fulfilled' ? revs.value : []);
    setLoadingExtra(false);
  }, [booking.id, booking.professionalId]);

  useEffect(() => { loadExtra(); }, [loadExtra]);

  const changeStatus = async (status: string) => {
    setUpdating(status);
    try {
      const u = await bookingsApi.updateStatus(booking.id, status);
      onUpdated(u);
      showT(`Estado actualizado: ${STATUS_CFG[status]?.label ?? status}`);
    } catch { showT('Error al cambiar estado', 'error'); }
    finally { setUpdating(null); }
  };

  type ActionDef = { label: string; icon: string; status: string; variant: 'primary' | 'success' | 'danger' };
  const actions: ActionDef[] = ({
    PENDING: [{ label: 'Confirmar', icon: '✅', status: 'CONFIRMED', variant: 'success' },
    { label: 'Cancelar', icon: '❌', status: 'CANCELLED', variant: 'danger' }],
    CONFIRMED: [{ label: 'Iniciar', icon: '🔧', status: 'IN_PROGRESS', variant: 'primary' },
    { label: 'Cancelar', icon: '❌', status: 'CANCELLED', variant: 'danger' }],
    IN_PROGRESS: [{ label: 'Completar', icon: '🎉', status: 'COMPLETED', variant: 'success' }],
  } as Record<string, ActionDef[]>)[booking.status] ?? [];

  const canPay = booking.status !== 'CANCELLED' && !payment;
  const canConf = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const existingReview = reviews.find(r => r.bookingId === booking.id);
  const canReview = booking.status === 'COMPLETED' && !existingReview;

  return (
    <div className="h-full overflow-y-auto">
      {toast && <ToastMsg msg={toast.msg} type={toast.type} />}
      <div className="p-6 space-y-5 max-w-2xl mx-auto">

        { }
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black text-xl text-[#e8e9f3]">{booking.serviceName}</h2>
            <p className="text-xs text-[#6b6d8a] mt-0.5">Reserva #{booking.id}</p>
          </div>
          <StatusBadge status={booking.status} size="md" />
        </div>

        { }
        <div className="grid grid-cols-2 gap-2">
          <Field label="👤 Profesional" value={booking.professionalName} />
          <Field label="👥 Cliente" value={booking.clientName} />
          <Field label="📅 Fecha" value={fmtDateTime(booking.scheduledAt)} />
          <Field label="🕐 Creado" value={fmtDate(booking.createdAt)} />
          <div className="col-span-2"><Field label="📍 Dirección" value={booking.address} /></div>
        </div>

        {booking.description && (
          <div>
            <SLabel>Descripción</SLabel>
            <p className="text-sm text-[#6b6d8a] leading-relaxed bg-[#13141f] rounded-xl p-3 border border-[#252640]">{booking.description}</p>
          </div>
        )}

        { }
        {actions.length > 0 && (
          <div>
            <SLabel>Cambiar estado</SLabel>
            <div className="flex flex-wrap gap-2">
              {actions.map(a => (
                <Btn key={a.status} variant={a.variant} size="sm" icon={a.icon}
                  loading={updating === a.status} onClick={() => changeStatus(a.status)}>{a.label}</Btn>
              ))}
            </div>
          </div>
        )}

        { }
        <div>
          <SLabel>Pago</SLabel>
          {loadingExtra ? <div className="flex justify-center py-4"><Spinner /></div>
            : payment ? (
              <div className="flex items-center justify-between p-4 bg-[#13141f] rounded-xl border border-[#252640]">
                <div>
                  <div className="font-bold text-emerald-400 text-lg">S/. {Number(payment.amount).toFixed(2)}</div>
                  <div className="text-xs text-[#6b6d8a]">{PAYMENT_METHODS.find(m => m.value === payment.method)?.label ?? payment.method} · {payment.transactionId}</div>
                  <div className="text-xs text-[#6b6d8a]">{payment.paidAt ? fmtDateTime(payment.paidAt) : '—'}</div>
                </div>
                <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 font-semibold">{payment.status}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-[#13141f] rounded-xl border border-[#252640]">
                <p className="text-sm text-[#6b6d8a]">Sin pago registrado</p>
                {canPay && <Btn variant="primary" size="sm" icon="💳" onClick={() => setShowPay(true)}>Pagar</Btn>}
              </div>
            )}
        </div>

        { }
        <div>
          <SLabel>Confirmación de cita</SLabel>
          {loadingExtra ? <div className="flex justify-center py-4"><Spinner /></div>
            : (
              <div className="flex items-center justify-between p-3 bg-[#13141f] rounded-xl border border-[#252640]">
                <div>
                  {confirmation ? (
                    <>
                      <span className={cn('text-xs font-bold',
                        confirmation.status === 'CONFIRMED' ? 'text-emerald-400' :
                          confirmation.status === 'PENDING' ? 'text-amber-400' : 'text-[#6b6d8a]')}>
                        {confirmation.status === 'CONFIRMED' ? '✅ Confirmada' :
                          confirmation.status === 'PENDING' ? '⏳ Pendiente' : `⚠️ ${confirmation.status}`}
                      </span>
                      {confirmation.status === 'PENDING' && (
                        <p className="text-[10px] text-[#6b6d8a] mt-0.5 font-mono font-black tracking-widest">{confirmation.confirmationCode}</p>
                      )}
                    </>
                  ) : <p className="text-sm text-[#6b6d8a]">Sin código generado</p>}
                </div>
                {canConf && <Btn variant="secondary" size="sm" icon="🔐" onClick={() => setShowConf(true)}>Gestionar</Btn>}
              </div>
            )}
        </div>

        { }
        {booking.status === 'COMPLETED' && (
          <div>
            <SLabel>Reseña</SLabel>
            {existingReview ? (
              <div className="p-4 bg-[#13141f] rounded-xl border border-[#252640]">
                <div className="flex justify-between mb-2"><Stars r={existingReview.rating} /><span className="text-[10px] text-[#6b6d8a]">{fmtDate(existingReview.createdAt)}</span></div>
                {existingReview.comment && <p className="text-xs text-[#6b6d8a] leading-relaxed">"{existingReview.comment}"</p>}
              </div>
            ) : canReview ? (
              <div className="flex items-center justify-between p-3 bg-[#13141f] rounded-xl border border-[#252640]">
                <p className="text-sm text-[#6b6d8a]">¿Cómo fue el servicio?</p>
                <Btn variant="primary" size="sm" icon="⭐" onClick={() => setShowReview(true)}>Reseñar</Btn>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <PaymentModal open={showPay} onClose={() => setShowPay(false)} booking={booking} onPaid={p => { setPayment(p); showT('Pago procesado exitosamente'); }} />
      <ConfirmationModal open={showConf} onClose={() => setShowConf(false)} booking={booking} confirmation={confirmation} onRefresh={() => { loadExtra(); showT('Actualizado'); }} />
      <ReviewModal open={showReview} onClose={() => setShowReview(false)} booking={booking} onReviewed={r => { setReviews(p => [...p, r]); showT('¡Reseña enviada!'); }} />
    </div>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showT = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setBookings(await bookingsApi.myBookings()); }
    catch { showT('Error cargando reservas', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter);
  const counts = bookings.reduce<Record<string, number>>((a, b) => {
    a[b.status] = (a[b.status] ?? 0) + 1;
    a['ALL'] = (a['ALL'] ?? 0) + 1;
    return a;
  }, {});

  const handleUpdated = (u: Booking) => { setBookings(p => p.map(b => b.id === u.id ? u : b)); setSelected(u); };
  const handleCreated = (b: Booking) => { setBookings(p => [b, ...p]); setSelected(b); showT('¡Reserva creada!'); };

  return (
    <div className="flex h-full bg-[#0c0d14]">
      {toast && <ToastMsg msg={toast.msg} type={toast.type} />}

      { }
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-[#252640] bg-[#0e0f1a] overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-[#252640] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-black text-lg text-[#e8e9f3]" style={{ fontFamily: 'var(--font-display)' }}>Mis Reservas</h1>
              <p className="text-xs text-[#6b6d8a] mt-0.5">{bookings.length} en total</p>
            </div>
            <Btn variant="primary" size="sm" icon="+" onClick={() => setShowCreate(true)}>Nueva</Btn>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {STATUS_FILTERS.map(({ value, label, icon }) => {
              const count = counts[value] ?? 0;
              const active = filter === value;
              return (
                <button key={value} onClick={() => setFilter(value)}
                  className={cn('flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold rounded-full px-3 py-1 border transition-all',
                    active ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-transparent text-[#6b6d8a] border-[#252640] hover:border-[#6c63ff]/40 hover:text-[#e8e9f3]')}>
                  {icon} {label}
                  {count > 0 && (
                    <span className={cn('text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold', active ? 'bg-white/20' : 'bg-[#252640] text-[#6b6d8a]')}>
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="text-5xl">📋</div>
              <p className="font-semibold text-sm text-[#e8e9f3]">{filter === 'ALL' ? 'Sin reservas' : 'Sin resultados'}</p>
              <p className="text-xs text-[#6b6d8a]">{filter === 'ALL' ? 'Crea tu primera reserva' : 'Prueba otro filtro'}</p>
              {filter === 'ALL' && <Btn variant="primary" size="sm" icon="+" onClick={() => setShowCreate(true)}>Crear reserva</Btn>}
            </div>
          ) : filtered.map(b => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
              <div onClick={() => setSelected(b)}
                className={cn('p-4 rounded-xl border cursor-pointer transition-all hover:border-[#6c63ff]/40',
                  selected?.id === b.id ? 'bg-[#1e1f38] border-[#6c63ff]/50' : 'bg-[#1a1b2e] border-[#252640] hover:bg-[#1e1f38]')}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#e8e9f3] truncate">{b.serviceName}</p>
                    <p className="text-xs text-[#6b6d8a] truncate">con {b.professionalName}</p>
                  </div>
                  <StatusBadge status={b.status} size="xs" />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#6b6d8a]">
                  <span>📅 {fmtDate(b.scheduledAt)}</span>
                  <span className="truncate">📍 {b.address.slice(0, 22)}{b.address.length > 22 ? '…' : ''}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      { }
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }} className="h-full">
              <DetailPanel booking={selected} onUpdated={handleUpdated} />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="text-6xl">📋</div>
              <p className="font-semibold text-[#e8e9f3]">Selecciona una reserva</p>
              <p className="text-sm text-[#6b6d8a] max-w-sm">Elige una reserva del panel izquierdo para ver detalles, gestionar pagos, confirmar y dejar reseñas.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
    </div>
  );
}
