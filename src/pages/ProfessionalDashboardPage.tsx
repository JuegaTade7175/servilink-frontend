import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { professionalsApi, bookingsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Professional, Booking } from '../types';

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

function Spinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin" />
  );
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-[3000] flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-2xl',
        type === 'success'
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          : 'bg-red-500/20 border-red-500/40 text-red-300'
      )}
    >
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pendiente', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  CONFIRMED: { label: 'Confirmada', cls: 'bg-[#6c63ff]/15 text-[#a09bff] border-[#6c63ff]/30' },
  IN_PROGRESS: { label: 'En progreso', cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  COMPLETED: { label: 'Completada', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Sección: Perfil profesional ──────────────────────────────────────────────
// Corregido para usar los campos reales de ProfessionalResponse del backend:
// specialty, description, baseRate, coverageRadiusKm, certifications, latitude, longitude
function ProfileSection({ onUpdated }: { onUpdated: (p: Professional) => void }) {
  const [profile, setProfile] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [editing, setEditing] = useState(false);

  // Campos del formulario — alineados con UpdateProfessionalRequest del backend
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [coverageRadiusKm, setCoverageRadiusKm] = useState('');
  const [certifications, setCertifications] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const showT = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    professionalsApi
      .me()
      .then((p) => {
        setProfile(p);
        setSpecialty(p.specialty ?? '');
        setDescription(p.description ?? '');
        setBaseRate(String(p.baseRate ?? ''));
        setCoverageRadiusKm(String(p.coverageRadiusKm ?? ''));
        setCertifications(p.certifications ?? '');
        setLat(String(p.latitude ?? ''));
        setLng(String(p.longitude ?? ''));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await professionalsApi.updateProfile({
        specialty: specialty || undefined,
        description: description || undefined,
        baseRate: baseRate ? Number(baseRate) : undefined,
        coverageRadiusKm: coverageRadiusKm ? Number(coverageRadiusKm) : undefined,
        certifications: certifications || undefined,
        latitude: lat ? Number(lat) : undefined,
        longitude: lng ? Number(lng) : undefined,
      });
      setProfile(updated);
      onUpdated(updated);
      setEditing(false);
      showT('Perfil actualizado');
    } catch (e: unknown) {
      showT(e instanceof Error ? e.message : 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(String(pos.coords.latitude));
      setLng(String(pos.coords.longitude));
    });
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#e8e9f3]">Perfil Profesional</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#252640] hover:bg-[#6c63ff]/20 text-[#a09bff] border border-[#252640] hover:border-[#6c63ff]/40 transition-colors"
            >
              ✏️ Editar
            </button>
          )}
        </div>

        {!editing ? (
          // Vista de lectura — todos los campos de ProfessionalResponse
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Especialidad', value: profile?.specialty || '—' },
              { label: 'Tarifa base/hr', value: profile?.baseRate != null ? `S/ ${profile.baseRate}` : '—' },
              { label: 'Descripción', value: profile?.description || '—' },
              { label: 'Radio de cobertura', value: profile?.coverageRadiusKm != null ? `${profile.coverageRadiusKm} km` : '—' },
              { label: 'Certificaciones', value: profile?.certifications || '—' },
              { label: 'Verificado', value: profile?.isVerified ? 'Sí ✓' : 'No' },
              { label: 'Latitud', value: profile?.latitude != null ? String(profile.latitude) : '—' },
              { label: 'Longitud', value: profile?.longitude != null ? String(profile.longitude) : '—' },
              { label: 'Rating promedio', value: profile?.averageRating != null ? `★ ${profile.averageRating.toFixed(1)} (${profile.totalReviews} reseñas)` : '—' },
            ].map((f) => (
              <div key={f.label} className="bg-[#13141f] rounded-xl border border-[#252640] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a] mb-1">{f.label}</p>
                <p className="text-sm text-[#e8e9f3] break-words">{f.value}</p>
              </div>
            ))}
          </div>
        ) : (
          // Formulario de edición — campos de UpdateProfessionalRequest
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Especialidad</label>
              <input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ej: Electricista Certificado"
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Cuéntale a los clientes sobre ti..."
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Tarifa base/hr (S/)</label>
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Radio de cobertura (km)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={coverageRadiusKm}
                  onChange={(e) => setCoverageRadiusKm(e.target.value)}
                  className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Certificaciones</label>
              <input
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="Ej: Certificado SENATI 2022"
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Ubicación</label>
                <button
                  onClick={useMyLocation}
                  className="text-[10px] font-semibold text-[#6c63ff] hover:text-[#a09bff] transition-colors"
                >
                  📍 Usar mi ubicación
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Latitud"
                  className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
                />
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Longitud"
                  className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#252640] text-[#e8e9f3] hover:bg-[#2e2f52] transition-colors border border-[#252640]"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#6c63ff] text-white hover:bg-[#5b54e8] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Spinner /> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Sección: Reservas recibidas ──────────────────────────────────────────────
function ReceivedBookingsSection({ professionalId }: { professionalId: number }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const showT = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    bookingsApi
      .byProfessional(professionalId)
      .then(setBookings)
      .catch(() => showT('Error al cargar reservas', 'error'))
      .finally(() => setLoading(false));
  }, [professionalId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      const updated = await bookingsApi.updateStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      showT(`Reserva ${STATUS_CFG[status]?.label ?? status}`);
    } catch {
      showT('Error al actualizar', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const filters = ['ALL', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const visible = filter === 'ALL' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#e8e9f3]">Reservas recibidas</h3>
          <span className="text-xs text-[#6b6d8a]">{bookings.length} total</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border',
                filter === f
                  ? 'bg-[#6c63ff] text-white border-[#6c63ff]'
                  : 'bg-[#13141f] text-[#6b6d8a] border-[#252640] hover:border-[#6c63ff]/40'
              )}
            >
              {f === 'ALL' ? 'Todas' : (STATUS_CFG[f]?.label ?? f)}
              {` (${f === 'ALL' ? bookings.length : bookings.filter((b) => b.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-[#6b6d8a]">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold">
              Sin reservas{filter !== 'ALL' ? ` ${STATUS_CFG[filter]?.label?.toLowerCase()}` : ''}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {visible.map((b) => {
                const cfg = STATUS_CFG[b.status] ?? {
                  label: b.status,
                  cls: 'bg-[#252640] text-[#6b6d8a] border-[#252640]',
                };
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#13141f] rounded-xl border border-[#252640] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#e8e9f3]">
                            #{b.id} — {b.clientName}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full border font-semibold',
                              cfg.cls
                            )}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#a09bff] mt-0.5 font-medium">
                          {b.serviceName}
                        </p>
                        <p className="text-xs text-[#6b6d8a] mt-1">
                          {fmtDate(b.scheduledAt)} · {b.address}
                        </p>
                        {b.description && (
                          <p className="text-xs text-[#a09bff] mt-1.5 bg-[#6c63ff]/10 rounded-lg px-3 py-2 border border-[#6c63ff]/15">
                            "{b.description}"
                          </p>
                        )}
                      </div>

                      {/* Acciones según estado */}
                      {b.status === 'PENDING' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => updateStatus(b.id, 'CONFIRMED')}
                            disabled={updating === b.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#6c63ff]/20 text-[#a09bff] border border-[#6c63ff]/30 hover:bg-[#6c63ff]/30 transition-colors disabled:opacity-40"
                          >
                            {updating === b.id ? '…' : '✓ Confirmar'}
                          </button>
                          <button
                            onClick={() => updateStatus(b.id, 'CANCELLED')}
                            disabled={updating === b.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                          >
                            {updating === b.id ? '…' : '✕ Rechazar'}
                          </button>
                        </div>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => updateStatus(b.id, 'IN_PROGRESS')}
                          disabled={updating === b.id}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 transition-colors disabled:opacity-40"
                        >
                          {updating === b.id ? '…' : '🔧 Iniciar'}
                        </button>
                      )}
                      {b.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => updateStatus(b.id, 'COMPLETED')}
                          disabled={updating === b.id}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
                        >
                          {updating === b.id ? '…' : '🏁 Completar'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </>
  );
}

// ─── Sub-componente inline de horarios ────────────────────────────────────────
import { availabilityApi } from '../api';
import type { Availability, DayOfWeek } from '../types';

const DAYS_MAP: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'MONDAY', label: 'Lunes', short: 'Lun' },
  { value: 'TUESDAY', label: 'Martes', short: 'Mar' },
  { value: 'WEDNESDAY', label: 'Miércoles', short: 'Mié' },
  { value: 'THURSDAY', label: 'Jueves', short: 'Jue' },
  { value: 'FRIDAY', label: 'Viernes', short: 'Vie' },
  { value: 'SATURDAY', label: 'Sábado', short: 'Sáb' },
  { value: 'SUNDAY', label: 'Domingo', short: 'Dom' },
];

// El backend devuelve "HH:mm:ss" — convertir a "8:00 AM"
function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function AvailabilityInline({ professionalId }: { professionalId: number }) {
  const [slots, setSlots] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Availability | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // form
  const [day, setDay] = useState<DayOfWeek>('MONDAY');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('18:00');
  const [avail, setAvail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const showT = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    availabilityApi
      .getByProfessional(professionalId)
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [professionalId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDay('MONDAY');
    setStart('08:00');
    setEnd('18:00');
    setAvail(true);
    setFormErr('');
    setShowModal(true);
  };

  const openEdit = (s: Availability) => {
    setEditing(s);
    setDay(s.dayOfWeek);
    // El backend devuelve "HH:mm:ss", necesitamos "HH:mm" para el input time
    setStart(s.startTime.slice(0, 5));
    setEnd(s.endTime.slice(0, 5));
    setAvail(s.isAvailable);
    setFormErr('');
    setShowModal(true);
  };

  const submit = async () => {
    if (start >= end) { setFormErr('Hora inicio debe ser antes que fin'); return; }
    setSaving(true);
    setFormErr('');
    try {
      let result: Availability;
      if (editing) {
        result = await availabilityApi.update(editing.id, {
          startTime: start,
          endTime: end,
          isAvailable: avail,
        });
        setSlots((prev) => prev.map((s) => (s.id === result.id ? result : s)));
        showT('Horario actualizado');
      } else {
        result = await availabilityApi.create({ dayOfWeek: day, startTime: start, endTime: end });
        setSlots((prev) => [...prev, result]);
        showT('Horario creado');
      }
      setShowModal(false);
    } catch {
      showT('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    setDeleting(id);
    try {
      await availabilityApi.delete(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      showT('Horario eliminado');
    } catch {
      showT('Error al eliminar', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const byDay = DAYS_MAP.map((d) => ({
    ...d,
    slots: slots.filter((s) => s.dayOfWeek === d.value),
  }));

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#e8e9f3]">Mis Horarios</h3>
            <p className="text-xs text-[#6b6d8a]">
              {slots.length} franja{slots.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#6c63ff] text-white hover:bg-[#5b54e8] transition-colors"
          >
            ＋ Agregar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12 text-[#6b6d8a]">
            <div className="text-4xl mb-3">📅</div>
            <p className="font-semibold">Sin horarios configurados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {byDay
              .filter((d) => d.slots.length > 0)
              .map((d) => (
                <div
                  key={d.value}
                  className="bg-[#13141f] rounded-xl border border-[#252640] overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-[#252640]/60 text-sm font-bold text-[#e8e9f3]">
                    {d.label}
                  </div>
                  <div className="divide-y divide-[#252640]/40">
                    {d.slots.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full flex-shrink-0',
                            s.isAvailable ? 'bg-emerald-400' : 'bg-[#6b6d8a]'
                          )}
                        />
                        <span className="text-sm font-mono text-[#e8e9f3] flex-1">
                          {fmt12(s.startTime)} – {fmt12(s.endTime)}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full border font-semibold',
                            s.isAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : 'bg-[#252640] text-[#6b6d8a] border-[#252640]'
                          )}
                        >
                          {s.isAvailable ? 'Disponible' : 'No disponible'}
                        </span>
                        <button
                          onClick={() => openEdit(s)}
                          className="w-7 h-7 rounded-lg bg-[#252640] hover:bg-[#6c63ff]/20 text-[#6b6d8a] hover:text-[#6c63ff] flex items-center justify-center text-xs transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => del(s.id)}
                          disabled={deleting === s.id}
                          className="w-7 h-7 rounded-lg bg-[#252640] hover:bg-red-500/15 text-[#6b6d8a] hover:text-red-400 flex items-center justify-center text-xs transition-colors disabled:opacity-40"
                        >
                          {deleting === s.id ? '…' : '🗑️'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md bg-[#1a1b2e] border border-[#252640] rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#252640]">
                <h2 className="font-bold text-sm text-[#e8e9f3]">
                  {editing ? 'Editar horario' : 'Nuevo horario'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6b6d8a] hover:text-white transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4">
                {!editing && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Día</label>
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS_MAP.map((d) => (
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
                      📅 {DAYS_MAP.find((d) => d.value === editing.dayOfWeek)?.label}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Inicio</label>
                    <input
                      type="time"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">Fin</label>
                    <input
                      type="time"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
                    />
                  </div>
                </div>
                {editing && (
                  <div className="flex items-center justify-between p-3 bg-[#13141f] rounded-xl border border-[#252640]">
                    <span className="text-sm text-[#e8e9f3]">Disponible</span>
                    <button
                      onClick={() => setAvail((v) => !v)}
                      className={cn(
                        'w-11 h-6 rounded-full relative transition-all duration-200',
                        avail ? 'bg-[#6c63ff]' : 'bg-[#252640]'
                      )}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                        style={{ left: avail ? '22px' : '2px' }}
                      />
                    </button>
                  </div>
                )}
                {formErr && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {formErr}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#252640] text-[#e8e9f3] hover:bg-[#2e2f52] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submit}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#6c63ff] text-white hover:bg-[#5b54e8] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? <Spinner /> : editing ? 'Guardar' : 'Crear'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────
type Tab = 'profile' | 'bookings' | 'availability';

export default function ProfessionalDashboardPage() {
  const { role, userName } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loadingProf, setLoadingProf] = useState(true);

  useEffect(() => {
    professionalsApi
      .me()
      .then(setProfessional)
      .catch(() => {})
      .finally(() => setLoadingProf(false));
  }, []);

  if (role !== 'PROFESSIONAL') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="text-5xl">🔒</div>
        <p className="font-semibold text-[#e8e9f3]">
          Acceso exclusivo para profesionales
        </p>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile', label: 'Mi Perfil', icon: '👤' },
    { id: 'bookings', label: 'Reservas', icon: '📋' },
    { id: 'availability', label: 'Horarios', icon: '📅' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[#252640]">
        <h2
          className="font-black text-2xl text-[#e8e9f3]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Dashboard Profesional
        </h2>
        <p className="text-sm text-[#6b6d8a] mt-0.5">
          {loadingProf ? '…' : professional?.userName ?? userName ?? 'Profesional'}
        </p>

        <div className="flex gap-1 mt-4 bg-[#13141f] rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
                tab === t.id
                  ? 'bg-[#6c63ff] text-white shadow'
                  : 'text-[#6b6d8a] hover:text-[#e8e9f3]'
              )}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'profile' && <ProfileSection onUpdated={setProfessional} />}
            {tab === 'bookings' && professional && (
              <ReceivedBookingsSection professionalId={professional.id} />
            )}
            {tab === 'availability' && professional && (
              <div className="-m-6">
                <AvailabilityInline professionalId={professional.id} />
              </div>
            )}
            {tab === 'bookings' && !professional && !loadingProf && (
              <div className="text-center py-12 text-[#6b6d8a]">
                <p>Crea tu perfil profesional primero para ver las reservas.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
