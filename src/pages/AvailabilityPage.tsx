import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { availabilityApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Availability, DayOfWeek } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────
function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'MONDAY',    label: 'Lunes',     short: 'Lun' },
  { value: 'TUESDAY',   label: 'Martes',    short: 'Mar' },
  { value: 'WEDNESDAY', label: 'Miércoles', short: 'Mié' },
  { value: 'THURSDAY',  label: 'Jueves',    short: 'Jue' },
  { value: 'FRIDAY',    label: 'Viernes',   short: 'Vie' },
  { value: 'SATURDAY',  label: 'Sábado',    short: 'Sáb' },
  { value: 'SUNDAY',    label: 'Domingo',   short: 'Dom' },
];

function fmt12(t: string) {
  // "08:00:00" → "8:00 AM"
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── micro UI ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin" />
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return (
    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
      {msg}
    </div>
  );
}

function ToastMsg({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const cfg = type === 'success'
    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
    : 'bg-red-500/20 border-red-500/40 text-red-300';
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-[3000] flex items-center gap-3 px-4 py-3',
      'rounded-xl border text-sm font-semibold shadow-2xl', cfg
    )}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

// ─── Modal crear/editar horario ───────────────────────────────────────────────
function SlotModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (a: Availability) => void;
  editing: Availability | null;
}) {
  const [day, setDay]       = useState<DayOfWeek>('MONDAY');
  const [start, setStart]   = useState('08:00');
  const [end, setEnd]       = useState('18:00');
  const [avail, setAvail]   = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDay(editing.dayOfWeek);
      setStart(editing.startTime.slice(0, 5));
      setEnd(editing.endTime.slice(0, 5));
      setAvail(editing.isAvailable);
    } else {
      setDay('MONDAY'); setStart('08:00'); setEnd('18:00'); setAvail(true);
    }
    setErr('');
  }, [open, editing]);

  const submit = async () => {
    if (start >= end) { setErr('La hora de inicio debe ser antes que la de fin'); return; }
    setLoading(true); setErr('');
    try {
      let result: Availability;
      if (editing) {
        result = await availabilityApi.update(editing.id, {
          startTime: start, endTime: end, isAvailable: avail,
        });
      } else {
        result = await availabilityApi.create({ dayOfWeek: day, startTime: start, endTime: end });
      }
      onSaved(result);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md bg-[#1a1b2e] border border-[#252640] rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252640]">
          <h2 className="font-bold text-sm text-[#e8e9f3]">
            {editing ? 'Editar horario' : 'Nuevo horario'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6b6d8a] hover:text-white transition-colors text-xs"
          >✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Día — solo al crear */}
          {!editing && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Día de la semana</label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDay(d.value)}
                    className={cn(
                      'py-2 rounded-lg text-[11px] font-bold transition-all border',
                      day === d.value
                        ? 'bg-[#6c63ff] text-white border-[#6c63ff]'
                        : 'bg-[#13141f] text-[#6b6d8a] border-[#252640] hover:border-[#6c63ff]/40'
                    )}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {editing && (
            <div className="bg-[#6c63ff]/10 border border-[#6c63ff]/20 rounded-xl px-4 py-3">
              <p className="text-xs text-[#a09bff] font-semibold">
                📅 {DAYS.find(d => d.value === editing.dayOfWeek)?.label}
              </p>
            </div>
          )}

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Hora inicio</label>
              <input
                type="time"
                value={start}
                onChange={e => setStart(e.target.value)}
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Hora fin</label>
              <input
                type="time"
                value={end}
                onChange={e => setEnd(e.target.value)}
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Disponible toggle — solo al editar */}
          {editing && (
            <div className="flex items-center justify-between p-3 bg-[#13141f] rounded-xl border border-[#252640]">
              <span className="text-sm text-[#e8e9f3]">Disponible</span>
              <button
                onClick={() => setAvail(v => !v)}
                className={cn(
                  'w-11 h-6 rounded-full relative transition-all duration-200',
                  avail ? 'bg-[#6c63ff]' : 'bg-[#252640]'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
                  avail ? 'left-5.5' : 'left-0.5'
                )} style={{ left: avail ? '22px' : '2px' }} />
              </button>
            </div>
          )}

          {err && <ErrMsg msg={err} />}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#252640] text-[#e8e9f3] hover:bg-[#2e2f52] transition-colors border border-[#252640]"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#6c63ff] text-white hover:bg-[#5b54e8] disabled:opacity-40 transition-colors border border-transparent flex items-center justify-center gap-2"
            >
              {loading ? <Spinner /> : (editing ? 'Guardar cambios' : 'Crear horario')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Vista pública: horarios de un profesional ────────────────────────────────
function PublicAvailabilityView({ professionalId, professionalName }: {
  professionalId: number;
  professionalName: string;
}) {
  const [slots, setSlots] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    availabilityApi.getByProfessional(professionalId)
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [professionalId]);

  const byDay = DAYS.map(d => ({
    ...d,
    slots: slots.filter(s => s.dayOfWeek === d.value && s.isAvailable),
  }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-2xl">📅</div>
        <div>
          <h3 className="font-bold text-[#e8e9f3]">Horarios de {professionalName}</h3>
          <p className="text-xs text-[#6b6d8a]">{slots.filter(s => s.isAvailable).length} franjas disponibles</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : slots.length === 0 ? (
        <div className="text-center py-12 text-[#6b6d8a]">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold">Sin horarios registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {byDay.filter(d => d.slots.length > 0).map(d => (
            <div key={d.value} className="bg-[#13141f] rounded-xl border border-[#252640] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="w-16 text-xs font-bold text-[#6c63ff]">{d.label}</span>
                <div className="flex flex-wrap gap-2 flex-1">
                  {d.slots.map(s => (
                    <span
                      key={s.id}
                      className="text-xs bg-[#6c63ff]/15 text-[#a09bff] border border-[#6c63ff]/25 rounded-full px-3 py-1"
                    >
                      {fmt12(s.startTime)} – {fmt12(s.endTime)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vista profesional: gestión de SUS horarios ───────────────────────────────
function MyAvailabilityView({ professionalId }: { professionalId: number }) {
  const [slots, setSlots]     = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Availability | null>(null);
  const [toast, setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const showT = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    availabilityApi.getByProfessional(professionalId)
      .then(setSlots)
      .catch(() => showT('Error al cargar horarios', 'error'))
      .finally(() => setLoading(false));
  }, [professionalId]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (saved: Availability) => {
    setSlots(prev => {
      const idx = prev.findIndex(s => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    showT(editing ? 'Horario actualizado' : 'Horario creado');
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await availabilityApi.delete(id);
      setSlots(prev => prev.filter(s => s.id !== id));
      showT('Horario eliminado');
    } catch {
      showT('Error al eliminar', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit   = (s: Availability) => { setEditing(s); setShowModal(true); };

  // Agrupar por día para la vista de calendario semanal
  const byDay = DAYS.map(d => ({
    ...d,
    slots: slots.filter(s => s.dayOfWeek === d.value),
  }));

  return (
    <>
      {toast && <ToastMsg msg={toast.msg} type={toast.type} />}

      <div className="p-6 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="font-black text-2xl text-[#e8e9f3]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Mis Horarios
            </h2>
            <p className="text-sm text-[#6b6d8a] mt-1">
              {slots.length} franja{slots.length !== 1 ? 's' : ''} configurada{slots.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#6c63ff] text-white hover:bg-[#5b54e8] transition-colors border border-transparent"
          >
            ＋ Agregar horario
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-6xl">📅</div>
            <p className="font-semibold text-[#e8e9f3]">Sin horarios configurados</p>
            <p className="text-sm text-[#6b6d8a] max-w-xs">
              Agrega tus franjas de disponibilidad para que los clientes puedan reservarte.
            </p>
            <button
              onClick={openCreate}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6c63ff] text-white hover:bg-[#5b54e8] transition-colors"
            >
              ＋ Crear primer horario
            </button>
          </div>
        ) : (
          /* Calendario semanal */
          <div className="space-y-2">
            {byDay.map(d => (
              <motion.div
                key={d.value}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#13141f] rounded-xl border border-[#252640] overflow-hidden"
              >
                {/* Cabecera del día */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#252640]/60">
                  <span className="w-24 text-sm font-bold text-[#e8e9f3]">{d.label}</span>
                  <span className="text-xs text-[#6b6d8a]">
                    {d.slots.length > 0
                      ? `${d.slots.length} franja${d.slots.length > 1 ? 's' : ''}`
                      : 'Sin horarios'}
                  </span>
                </div>

                {/* Slots del día */}
                {d.slots.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-[#6b6d8a] italic">No disponible</div>
                ) : (
                  <div className="divide-y divide-[#252640]/40">
                    {d.slots.map(s => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        {/* Estado */}
                        <div className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          s.isAvailable ? 'bg-emerald-400' : 'bg-[#6b6d8a]'
                        )} />

                        {/* Horario */}
                        <span className="text-sm font-mono text-[#e8e9f3] flex-1">
                          {fmt12(s.startTime)}
                          <span className="text-[#6b6d8a] mx-1">–</span>
                          {fmt12(s.endTime)}
                        </span>

                        {/* Badge disponible/no disponible */}
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full border font-semibold',
                          s.isAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : 'bg-[#252640] text-[#6b6d8a] border-[#252640]'
                        )}>
                          {s.isAvailable ? 'Disponible' : 'No disponible'}
                        </span>

                        {/* Acciones */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(s)}
                            className="w-7 h-7 rounded-lg bg-[#252640] hover:bg-[#6c63ff]/20 hover:text-[#6c63ff] text-[#6b6d8a] flex items-center justify-center text-xs transition-colors"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deleting === s.id}
                            className="w-7 h-7 rounded-lg bg-[#252640] hover:bg-red-500/15 hover:text-red-400 text-[#6b6d8a] flex items-center justify-center text-xs transition-colors disabled:opacity-40"
                            title="Eliminar"
                          >
                            {deleting === s.id ? '…' : '🗑️'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <SlotModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onSaved={handleSaved}
            editing={editing}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Export principal: detecta rol y muestra la vista correspondiente ─────────
export default function AvailabilityPage({
  publicProfessionalId,
  publicProfessionalName,
}: {
  publicProfessionalId?: number;
  publicProfessionalName?: string;
}) {
  const { role, userId } = useAuth();
  const [myProfessionalId, setMyProfessionalId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState(false);

  // Si es profesional y no hay ID público pasado, cargar su propio ID
  useEffect(() => {
    if (role !== 'PROFESSIONAL' || publicProfessionalId) return;
    if (!userId) return;
    setLoadingId(true);
    import('../api').then(({ professionalsApi }) =>
      professionalsApi.me()
        .then(p => setMyProfessionalId(p.id))
        .catch(() => {})
        .finally(() => setLoadingId(false))
    );
  }, [role, userId, publicProfessionalId]);

  // Vista pública (pasada desde fuera)
  if (publicProfessionalId && publicProfessionalName) {
    return (
      <PublicAvailabilityView
        professionalId={publicProfessionalId}
        professionalName={publicProfessionalName}
      />
    );
  }

  // Vista del profesional logueado
  if (role === 'PROFESSIONAL') {
    if (loadingId) {
      return (
        <div className="flex items-center justify-center h-full text-[#6b6d8a]">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin mr-3" />
          Cargando...
        </div>
      );
    }
    if (!myProfessionalId) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
          <div className="text-5xl">⚠️</div>
          <p className="font-semibold text-[#e8e9f3]">Perfil profesional no encontrado</p>
          <p className="text-sm text-[#6b6d8a] max-w-xs">
            Debes crear tu perfil profesional antes de gestionar horarios.
          </p>
        </div>
      );
    }
    return <MyAvailabilityView professionalId={myProfessionalId} />;
  }

  // Cliente sin ID público → pantalla vacía informativa
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8 text-[#6b6d8a]">
      <div className="text-5xl">📅</div>
      <p className="font-semibold text-[#e8e9f3]">Disponibilidad</p>
      <p className="text-sm max-w-xs">
        Selecciona un profesional en el Mapa o en Profesionales para ver sus horarios disponibles.
      </p>
    </div>
  );
}
