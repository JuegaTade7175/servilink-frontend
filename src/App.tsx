import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Role = "CLIENT" | "PROFESSIONAL";
type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type View = "auth" | "map" | "bookings" | "chat" | "profile" | "professionals";

interface AuthResponse { token: string; userId: number; name: string; email: string; role: Role; }
interface User { id: number; name: string; email: string; phone: string; profilePictureUrl?: string; role: Role; createdAt: string; }
interface Professional { id: number; userName: string; userEmail: string; userPhone: string; profilePictureUrl?: string; specialty: string; description?: string; latitude?: number; longitude?: number; address?: string; coverageRadiusKm?: number; baseRate: number; isVerified: boolean; averageRating: number; totalReviews: number; services: { id: number; name: string; referencePrice?: number }[]; distanceKm?: number; }
interface Booking { id: number; clientId: number; clientName: string; professionalId: number; professionalName: string; serviceId: number; serviceName: string; scheduledAt: string; address: string; description?: string; status: BookingStatus; createdAt: string; }
interface Message { id: number; bookingId: number; senderId: number; senderName: string; receiverId: number; receiverName: string; content: string; isRead: boolean; createdAt: string; }
interface Notif { id: number; title: string; body: string; type: string; isRead: boolean; createdAt: string; }

// ─── API ──────────────────────────────────────────────────────────────────────
const BASE = "http://localhost:8081";
function getToken() { return localStorage.getItem("sl_token"); }

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error del servidor" }));
    throw new Error(err.message ?? "Error desconocido");
  }
  if (res.status === 204) return null as T;
  return res.json();
}

const api = {
  login: (email: string, password: string) => request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data: object) => request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => request<User>("/api/users/me"),
  professionals: (lat: number, lon: number, r = 10) => request<Professional[]>(`/api/professionals/nearby?lat=${lat}&lon=${lon}&radius=${r}`),
  categories: () => request<{ id: number; name: string }[]>("/api/categories"),
  myBookings: () => request<Booking[]>("/api/bookings/my"),
  createBooking: (data: object) => request<Booking>("/api/bookings", { method: "POST", body: JSON.stringify(data) }),
  updateBooking: (id: number, status: string) => request<Booking>(`/api/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  messages: (bookingId: number) => request<Message[]>(`/api/messages/booking/${bookingId}`),
  sendMessage: (bookingId: number, content: string) => request<Message>(`/api/messages/booking/${bookingId}`, { method: "POST", body: JSON.stringify({ content }) }),
  notifications: () => request<Notif[]>("/api/notifications"),
  unreadCount: () => request<{ unreadCount: number }>("/api/notifications/unread/count"),
  markAllRead: () => request("/api/notifications/read-all", { method: "PATCH" }),
  reviews: (profId: number) => request<{ id: number; rating: number; comment: string; clientName: string; createdAt: string }[]>(`/api/reviews/professional/${profId}`),
  updatePhoto: (url: string) => request<User>("/api/users/profile-picture", { method: "PATCH", body: JSON.stringify({ profilePictureUrl: url }) }),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<BookingStatus, string> = {
  PENDING:     "badge-warning",
  CONFIRMED:   "badge-info",
  IN_PROGRESS: "badge-secondary",
  COMPLETED:   "badge-success",
  CANCELLED:   "badge-error",
};
const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pendiente", CONFIRMED: "Confirmado", IN_PROGRESS: "En progreso",
  COMPLETED: "Completado", CANCELLED: "Cancelado",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 tracking-wide text-sm">
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClass = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-13 h-13 text-base", xl: "w-18 h-18 text-xl" }[size];
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-indigo-500", "bg-pink-500", "bg-teal-500", "bg-amber-500", "bg-red-500", "bg-violet-500"];
  const color = colors[name.charCodeAt(0) % colors.length];

  if (url) return <img src={url} alt={name} className={cn("rounded-full object-cover flex-shrink-0", sizeClass)} />;
  return (
    <div className={cn("rounded-full flex items-center justify-center text-white font-bold flex-shrink-0", sizeClass, color)}>
      {initials}
    </div>
  );
}

// ─── MOTION VARIANTS ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit:   { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.06 } },
};

const cardHover = {
  rest:  { scale: 1, borderColor: "rgba(37,38,64,1)" },
  hover: { scale: 1.01, borderColor: "rgba(108,99,255,0.6)", transition: { duration: 0.2 } },
};

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }: { onLogin: (d: AuthResponse) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "CLIENT" as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = mode === "login"
        ? await api.login(form.email, form.password)
        : await api.register(form);
      localStorage.setItem("sl_token", res.token);
      onLogin(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "radial-gradient(ellipse at 30% 20%, #1a1040 0%, #0c0d14 60%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="text-5xl mb-3"
          >🔗</motion.div>
          <h1 className="text-4xl font-black" style={{ fontFamily: "var(--font-display)", background: "linear-gradient(135deg, #6c63ff, #ff6584)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ServiLink
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">Servicios domésticos · Lima, Perú</p>
        </div>

        <div className="card bg-[var(--card)] border border-[var(--border)] shadow-2xl">
          <div className="card-body gap-5">
            {/* Tabs */}
            <div className="tabs tabs-box bg-[var(--surface)] rounded-xl p-1">
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn("tab flex-1 rounded-lg text-sm font-semibold transition-all", mode === m && "tab-active bg-[var(--accent)] text-white")}>
                  {m === "login" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={mode} variants={fadeUp} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-3">
                {mode === "register" && (
                  <>
                    <input name="name" className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full" placeholder="Nombre completo" value={form.name} onChange={handle} />
                    <input name="phone" className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full" placeholder="Teléfono" value={form.phone} onChange={handle} />
                    <select name="role" value={form.role} onChange={handle} className="select select-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full">
                      <option value="CLIENT">Cliente</option>
                      <option value="PROFESSIONAL">Profesional</option>
                    </select>
                  </>
                )}
                <input name="email" type="email" className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full" placeholder="Email" value={form.email} onChange={handle} />
                <input name="password" type="password" className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full" placeholder="Contraseña" value={form.password} onChange={handle} onKeyDown={e => e.key === "Enter" && submit()} />
              </motion.div>
            </AnimatePresence>

            {error && <p className="text-error text-sm text-center">{error}</p>}

            <button
              className={cn("btn btn-primary w-full text-white", loading && "loading")}
              onClick={submit} disabled={loading}
              style={{ background: "var(--accent)", borderColor: "var(--accent)" }}
            >
              {loading ? "" : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>

            <p className="text-center text-xs text-[var(--muted)]">
              Demo: carlos@servilink.pe / password123
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── MAP VIEW ─────────────────────────────────────────────────────────────────
function MapView({ auth }: { auth: AuthResponse }) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selected, setSelected] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<{ id: number; rating: number; comment: string; clientName: string }[]>([]);

  useEffect(() => {
    api.professionals(-12.0464, -77.0428, 20).then(setProfessionals).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.reviews(selected.id).then(setReviews).catch(() => setReviews([]));
  }, [selected]);

  const mapPins = professionals.map((p, i) => ({ ...p, x: 20 + ((i * 73) % 75), y: 15 + ((i * 47) % 65) }));

  return (
    <div className="flex h-full">
      {/* Mapa */}
      <div className="flex-1 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a2035, #0f1520)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-5">
          <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6c63ff" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <svg className="absolute inset-0 w-full h-full opacity-15">
          <line x1="0" y1="40%" x2="100%" y2="38%" stroke="#fff" strokeWidth="2"/>
          <line x1="0" y1="65%" x2="100%" y2="63%" stroke="#fff" strokeWidth="1.5"/>
          <line x1="30%" y1="0" x2="32%" y2="100%" stroke="#fff" strokeWidth="2"/>
          <line x1="70%" y1="0" x2="68%" y2="100%" stroke="#fff" strokeWidth="1.5"/>
        </svg>

        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--muted)] flex items-center gap-2">
          📍 Lima, Perú — Radio 20km
        </div>

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)] pulse">
            Cargando profesionales...
          </div>
        ) : mapPins.map(p => (
          <motion.div key={p.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
            onClick={() => setSelected(p)}
            className="absolute cursor-pointer"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -100%)", zIndex: selected?.id === p.id ? 10 : 1 }}
          >
            <div className={cn(
              "rounded-xl px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap shadow-xl flex items-center gap-1.5 border-2 transition-all",
              selected?.id === p.id
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "bg-[var(--card)] border-[var(--border)] text-[var(--text)]"
            )}>
              {p.isVerified ? "✅" : "👤"} {p.userName.split(" ")[0]}
              <span className="text-yellow-400">★{p.averageRating.toFixed(1)}</span>
            </div>
            <div className={cn("w-2.5 h-2.5 rounded-full mx-auto mt-0.5", selected?.id === p.id ? "bg-[var(--accent)]" : "bg-[var(--border)]")} />
          </motion.div>
        ))}

        {/* Centro */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-[var(--accent2)] rounded-full shadow-[0_0_0_6px_rgba(255,101,132,0.25)]" />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-[var(--border)] overflow-auto bg-[var(--surface)]">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key="detail" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="p-5">
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm text-[var(--muted)] mb-4">← Volver</button>
              <div className="flex gap-3 items-start mb-4">
                <Avatar name={selected.userName} url={selected.profilePictureUrl} size="lg" />
                <div className="flex-1">
                  <h3 className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>{selected.userName}</h3>
                  <p className="text-[var(--accent)] text-sm font-semibold">{selected.specialty}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars rating={selected.averageRating} />
                    <span className="text-xs text-[var(--muted)]">{selected.averageRating.toFixed(1)} ({selected.totalReviews})</span>
                    {selected.isVerified && <span className="badge badge-success badge-xs">✓ Verificado</span>}
                  </div>
                </div>
              </div>

              {selected.description && <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">{selected.description}</p>}

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: "Tarifa", value: `S/. ${selected.baseRate}/hr` },
                  { label: "Radio", value: `${selected.coverageRadiusKm ?? "?"} km` },
                  { label: "Distancia", value: selected.distanceKm ? `${selected.distanceKm.toFixed(1)} km` : "—" },
                  { label: "Teléfono", value: selected.userPhone ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[var(--card)] rounded-xl p-3">
                    <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{label}</div>
                    <div className="font-bold text-sm">{value}</div>
                  </div>
                ))}
              </div>

              {selected.services.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-2">Servicios</p>
                  <div className="flex flex-col gap-1.5">
                    {selected.services.map(s => (
                      <div key={s.id} className="bg-[var(--card)] rounded-xl px-3 py-2 flex justify-between items-center">
                        <span className="text-sm">{s.name}</span>
                        {s.referencePrice && <span className="font-bold text-[var(--accent)] text-sm">S/. {s.referencePrice}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="bg-[var(--card)] rounded-xl p-3 mb-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold">{r.clientName}</span>
                    <Stars rating={r.rating} />
                  </div>
                  {r.comment && <p className="text-xs text-[var(--muted)]">{r.comment}</p>}
                </div>
              ))}

              <button className="btn w-full text-white mt-2" style={{ background: "var(--accent)", borderColor: "var(--accent)" }}>
                📅 Reservar servicio
              </button>
            </motion.div>
          ) : (
            <motion.div key="list" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="p-5">
              <h2 className="font-black text-lg mb-1" style={{ fontFamily: "var(--font-display)" }}>Mapa de profesionales</h2>
              <p className="text-sm text-[var(--muted)] mb-4">{professionals.length} encontrados cerca de Lima</p>
              <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-2">
                {professionals.map(p => (
                  <motion.div key={p.id} variants={fadeUp} whileHover="hover" initial="rest" animate="rest">
                    <motion.div variants={cardHover} onClick={() => setSelected(p)}
                      className="card bg-[var(--card)] border border-[var(--border)] cursor-pointer p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.userName} url={p.profilePictureUrl} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{p.userName}</div>
                          <div className="text-xs text-[var(--accent)]">{p.specialty}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-yellow-400">★ {p.averageRating.toFixed(1)}</div>
                          <div className="text-xs text-[var(--muted)]">S/. {p.baseRate}/hr</div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── BOOKINGS VIEW ────────────────────────────────────────────────────────────
function BookingsView({ auth }: { auth: AuthResponse }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");

  useEffect(() => { api.myBookings().then(setBookings).catch(() => {}).finally(() => setLoading(false)); }, []);

  const filtered = filter === "ALL" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="flex h-full">
      <div className="w-96 border-r border-[var(--border)] overflow-auto bg-[var(--surface)]">
        <div className="p-5 pb-0">
          <h2 className="font-black text-xl mb-4" style={{ fontFamily: "var(--font-display)" }}>Mis Reservas</h2>
          <div className="flex gap-1.5 flex-wrap mb-4">
            {(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={cn("btn btn-xs rounded-lg", filter === s ? "btn-primary text-white" : "btn-ghost border border-[var(--border)] text-[var(--muted)]")}
                style={filter === s ? { background: "var(--accent)", borderColor: "var(--accent)" } : {}}>
                {s === "ALL" ? "Todas" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 pt-0">
          {loading ? <p className="text-[var(--muted)] text-center py-10 pulse">Cargando...</p>
            : filtered.length === 0 ? <p className="text-[var(--muted)] text-center py-10">No hay reservas</p>
            : (
              <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-2">
                {filtered.map(b => (
                  <motion.div key={b.id} variants={fadeUp}>
                    <motion.div whileHover={{ borderColor: "rgba(108,99,255,0.6)" }}
                      onClick={() => setSelected(b)}
                      className={cn("card bg-[var(--card)] border cursor-pointer p-3.5 transition-all",
                        selected?.id === b.id ? "border-[var(--accent)]" : "border-[var(--border)]"
                      )}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-sm">{b.serviceName}</div>
                          <div className="text-xs text-[var(--muted)]">con {b.professionalName}</div>
                        </div>
                        <span className={cn("badge badge-sm", STATUS_BADGE[b.status])}>{STATUS_LABELS[b.status]}</span>
                      </div>
                      <div className="text-xs text-[var(--muted)] flex gap-3">
                        <span>📅 {new Date(b.scheduledAt).toLocaleDateString("es-PE")}</span>
                        <span className="truncate">📍 {b.address.slice(0, 20)}…</span>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} variants={fadeUp} initial="hidden" animate="show" exit="exit" className="max-w-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-2xl" style={{ fontFamily: "var(--font-display)" }}>Reserva #{selected.id}</h2>
                <span className={cn("badge badge-lg", STATUS_BADGE[selected.status])}>{STATUS_LABELS[selected.status]}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: "🔧", label: "Servicio", value: selected.serviceName },
                  { icon: "👤", label: "Profesional", value: selected.professionalName },
                  { icon: "📅", label: "Fecha", value: fmt(selected.scheduledAt) },
                  { icon: "📍", label: "Dirección", value: selected.address },
                  { icon: "👤", label: "Cliente", value: selected.clientName },
                  { icon: "🕐", label: "Creado", value: fmt(selected.createdAt) },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="card bg-[var(--card)] border border-[var(--border)] p-3.5">
                    <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{icon} {label}</div>
                    <div className="font-semibold text-sm">{value}</div>
                  </div>
                ))}
              </div>

              {selected.description && (
                <div className="card bg-[var(--card)] border border-[var(--border)] p-4 mb-6">
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-2">📝 Descripción</div>
                  <p className="text-sm leading-relaxed">{selected.description}</p>
                </div>
              )}

              {selected.status === "PENDING" && (
                <div className="flex gap-3">
                  <button className="btn btn-success text-white" onClick={async () => {
                    const upd = await api.updateBooking(selected.id, "CONFIRMED");
                    setSelected(upd); setBookings(prev => prev.map(b => b.id === upd.id ? upd : b));
                  }}>✅ Confirmar</button>
                  <button className="btn btn-error text-white" onClick={async () => {
                    const upd = await api.updateBooking(selected.id, "CANCELLED");
                    setSelected(upd); setBookings(prev => prev.map(b => b.id === upd.id ? upd : b));
                  }}>❌ Cancelar</button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" variants={fadeUp} initial="hidden" animate="show"
              className="h-full flex flex-col items-center justify-center gap-4 text-[var(--muted)]">
              <div className="text-5xl">📋</div>
              <p>Selecciona una reserva para ver detalles</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── CHAT VIEW ────────────────────────────────────────────────────────────────
function ChatView({ auth }: { auth: AuthResponse }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.myBookings().then(setBookings).catch(() => {}); }, []);
  useEffect(() => { if (!selected) return; api.messages(selected.id).then(setMessages).catch(() => {}); }, [selected]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!selected || !input.trim()) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(selected.id, input.trim());
      setMessages(prev => [...prev, msg]); setInput("");
    } catch { /**/ } finally { setSending(false); }
  };

  return (
    <div className="flex h-full">
      {/* Lista conversaciones */}
      <div className="w-72 border-r border-[var(--border)] overflow-auto bg-[var(--surface)]">
        <div className="p-5 pb-3">
          <h2 className="font-black text-lg" style={{ fontFamily: "var(--font-display)" }}>Chat</h2>
          <p className="text-xs text-[var(--muted)] mt-1">Conversaciones activas</p>
        </div>
        {bookings.filter(b => b.status !== "CANCELLED").map(b => (
          <motion.div key={b.id} whileHover={{ backgroundColor: "rgba(26,27,46,0.8)" }}
            onClick={() => setSelected(b)}
            className={cn("px-5 py-3.5 cursor-pointer border-b border-[var(--border)] transition-all",
              "border-l-2",
              selected?.id === b.id ? "bg-[var(--card)] border-l-[var(--accent)]" : "border-l-transparent"
            )}>
            <div className="flex items-center gap-2.5">
              <Avatar name={b.professionalName} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{b.professionalName}</div>
                <div className="text-xs text-[var(--muted)] truncate">{b.serviceName}</div>
              </div>
              <span className={cn("badge badge-xs", STATUS_BADGE[b.status])}></span>
            </div>
          </motion.div>
        ))}
        {bookings.filter(b => b.status !== "CANCELLED").length === 0 && (
          <p className="text-[var(--muted)] text-center py-10 text-sm">Sin reservas activas</p>
        )}
      </div>

      {/* Área de chat */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--surface)]">
            <Avatar name={selected.professionalName} size="md" />
            <div>
              <div className="font-bold text-sm">{selected.professionalName}</div>
              <div className="text-xs text-[var(--muted)]">{selected.serviceName}</div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="text-center text-[var(--muted)] mt-16">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-sm">Inicia la conversación</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map(msg => {
                const isMine = msg.senderId === auth.userId;
                return (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn("flex", isMine ? "justify-end" : "justify-start")}
                  >
                    {!isMine && <Avatar name={msg.senderName} size="sm" />}
                    <div className={cn("max-w-[68%]", isMine ? "ml-0" : "ml-2")}>
                      <div className={cn(
                        "px-3.5 py-2.5 text-sm leading-relaxed text-white",
                        isMine
                          ? "bg-[var(--accent)] rounded-2xl rounded-br-sm"
                          : "bg-[var(--card)] rounded-2xl rounded-bl-sm"
                      )}>
                        {msg.content}
                      </div>
                      <div className={cn("text-[10px] text-[var(--muted)] mt-1", isMine ? "text-right" : "text-left")}>
                        {new Date(msg.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                        {isMine && (msg.isRead ? " ✓✓" : " ✓")}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          <div className="px-5 py-3.5 border-t border-[var(--border)] flex gap-2.5 bg-[var(--surface)]">
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              className="input input-bordered bg-[var(--card)] border-[var(--border)] text-[var(--text)] flex-1 rounded-full text-sm" />
            <button onClick={send} disabled={sending || !input.trim()}
              className="btn btn-circle text-white disabled:opacity-40"
              style={{ background: "var(--accent)", borderColor: "var(--accent)" }}>
              {sending ? <span className="loading loading-spinner loading-xs" /> : "➤"}
            </button>
          </div>
        </div>
      ) : (
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--muted)]">
          <div className="text-5xl">💬</div>
          <p>Selecciona una conversación</p>
        </motion.div>
      )}
    </div>
  );
}

// ─── PROFILE VIEW ─────────────────────────────────────────────────────────────
function ProfileView({ auth, onLogout }: { auth: AuthResponse; onLogout: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.me().then(setUser).catch(() => {}); }, []);

  const updatePhoto = async () => {
    if (!photoUrl.startsWith("https://")) { setPhotoError("La URL debe comenzar con https://"); return; }
    setSaving(true); setPhotoError("");
    try {
      const updated = await api.updatePhoto(photoUrl);
      setUser(updated); setPhotoUrl("");
    } catch (e: unknown) { setPhotoError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  if (!user) return (
    <div className="flex items-center justify-center h-full text-[var(--muted)] pulse">
      Cargando perfil...
    </div>
  );

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show"
      className="p-8 max-w-2xl mx-auto overflow-auto h-full">
      <h2 className="font-black text-2xl mb-6" style={{ fontFamily: "var(--font-display)" }}>Mi Perfil</h2>

      <div className="card bg-[var(--card)] border border-[var(--border)] p-7 mb-5">
        <div className="flex items-center gap-5 mb-6">
          <Avatar name={user.name} url={user.profilePictureUrl} size="xl" />
          <div>
            <h3 className="font-black text-xl" style={{ fontFamily: "var(--font-display)" }}>{user.name}</h3>
            <p className="text-[var(--accent)] font-semibold">{user.role === "CLIENT" ? "Cliente" : "Profesional"}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Miembro desde {new Date(user.createdAt).toLocaleDateString("es-PE")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Email", value: user.email, icon: "✉️" },
            { label: "Teléfono", value: user.phone ?? "—", icon: "📱" },
            { label: "Rol", value: user.role === "CLIENT" ? "Cliente" : "Profesional", icon: "🏷️" },
            { label: "ID", value: `#${user.id}`, icon: "🆔" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-[var(--surface)] rounded-xl px-4 py-3">
              <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{icon} {label}</div>
              <div className="font-semibold text-sm">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-[var(--card)] border border-[var(--border)] p-6 mb-5">
        <h3 className="font-bold mb-3">📸 Foto de perfil</h3>
        <p className="text-sm text-[var(--muted)] mb-4">Pega una URL de Cloudinary, Imgur o ImgBB (https://…)</p>
        <div className="flex gap-2.5">
          <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
            className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] flex-1 text-sm" />
          <button onClick={updatePhoto} disabled={saving || !photoUrl}
            className={cn("btn text-white", saving && "loading")}
            style={{ background: "var(--accent)", borderColor: "var(--accent)" }}>
            {saving ? "" : "Guardar"}
          </button>
        </div>
        {photoError && <p className="text-error text-xs mt-2">{photoError}</p>}
      </div>

      <button onClick={onLogout} className="btn btn-error text-white">
        🚪 Cerrar sesión
      </button>
    </motion.div>
  );
}

// ─── PROFESSIONALS VIEW ───────────────────────────────────────────────────────
function ProfessionalsView() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.professionals(-12.0464, -77.0428, 30).then(setProfessionals).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = professionals.filter(p =>
    p.userName.toLowerCase().includes(search.toLowerCase()) ||
    p.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 overflow-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-black text-2xl" style={{ fontFamily: "var(--font-display)" }}>Profesionales</h2>
          <p className="text-sm text-[var(--muted)] mt-1">{professionals.length} disponibles en Lima</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..."
          className="input input-bordered bg-[var(--card)] border-[var(--border)] text-[var(--text)] w-56 text-sm" />
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--muted)] pulse">Buscando profesionales...</div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
          {filtered.map(p => (
            <motion.div key={p.id} variants={fadeUp} whileHover={{ scale: 1.02 }}
              className="card bg-[var(--card)] border border-[var(--border)] p-5 hover:border-[var(--accent)] transition-colors cursor-default">
              <div className="flex items-start gap-3 mb-4">
                <Avatar name={p.userName} url={p.profilePictureUrl} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm truncate">{p.userName}</h3>
                    {p.isVerified && <span className="text-emerald-400 text-xs">✓</span>}
                  </div>
                  <p className="text-xs font-semibold text-[var(--accent)]">{p.specialty}</p>
                </div>
              </div>

              {p.description && (
                <p className="text-xs text-[var(--muted)] leading-relaxed mb-3 line-clamp-2">{p.description}</p>
              )}

              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <Stars rating={p.averageRating} />
                  <span className="text-xs text-[var(--muted)]">{p.averageRating.toFixed(1)} ({p.totalReviews})</span>
                </div>
                <span className="font-bold text-emerald-400 text-sm">S/. {p.baseRate}/hr</span>
              </div>

              {p.services.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {p.services.slice(0, 3).map(s => (
                    <span key={s.id} className="badge badge-sm bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]">{s.name}</span>
                  ))}
                </div>
              )}

              <button className="btn btn-sm w-full text-white text-xs"
                style={{ background: "var(--accent)", borderColor: "var(--accent)" }}>
                📅 Ver disponibilidad
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ─── NOTIFICATIONS PANEL ──────────────────────────────────────────────────────
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  useEffect(() => { api.notifications().then(setNotifs).catch(() => {}); }, []);

  const TYPE_ICONS: Record<string, string> = {
    BOOKING_CREATED: "📅", BOOKING_CONFIRMED: "✅", BOOKING_CANCELLED: "❌",
    BOOKING_COMPLETED: "🎉", PAYMENT_RECEIVED: "💳", NEW_MESSAGE: "💬", NEW_REVIEW: "⭐",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="fixed top-16 right-4 w-80 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-[1000] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center">
        <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>Notificaciones</h3>
        <div className="flex gap-2">
          <button onClick={() => api.markAllRead().then(() => setNotifs(p => p.map(n => ({ ...n, isRead: true }))))}
            className="btn btn-ghost btn-xs text-[var(--muted)]">✓ Leídas</button>
          <button onClick={onClose} className="btn btn-ghost btn-xs text-[var(--muted)]">✕</button>
        </div>
      </div>
      <div className="max-h-96 overflow-auto">
        {notifs.length === 0 ? (
          <p className="text-center text-[var(--muted)] py-8 text-sm">Sin notificaciones</p>
        ) : notifs.map(n => (
          <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={cn("px-5 py-3 border-b border-[var(--border)] flex gap-3 items-start",
              !n.isRead && "bg-[var(--accent)]/5")}>
            <span className="text-xl">{TYPE_ICONS[n.type] ?? "🔔"}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{n.title}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">{n.body}</div>
              <div className="text-[10px] text-[var(--muted)] mt-1">{fmt(n.createdAt)}</div>
            </div>
            {!n.isRead && <div className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0 mt-1.5" />}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(() => {
    const token = localStorage.getItem("sl_token");
    if (!token) return null;
    return {
      token,
      userId: Number(localStorage.getItem("sl_userId")),
      name: localStorage.getItem("sl_name") ?? "",
      email: localStorage.getItem("sl_email") ?? "",
      role: (localStorage.getItem("sl_role") ?? "CLIENT") as Role,
    };
  });
  const [view, setView] = useState<View>("map");
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  const handleLogin = useCallback((data: AuthResponse) => {
    localStorage.setItem("sl_token", data.token);
    localStorage.setItem("sl_userId", String(data.userId));
    localStorage.setItem("sl_name", data.name);
    localStorage.setItem("sl_email", data.email);
    localStorage.setItem("sl_role", data.role);
    setAuth(data);
  }, []);

  const handleLogout = useCallback(() => { localStorage.clear(); setAuth(null); }, []);

  useEffect(() => {
    if (!auth) return;
    const fetch = () => api.unreadCount().then(d => setUnread(d.unreadCount)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [auth]);

  if (!auth) return <AuthPage onLogin={handleLogin} />;

  const NAV = [
    { id: "map",           icon: "🗺️",  label: "Mapa" },
    { id: "professionals", icon: "👥",  label: "Profesionales" },
    { id: "bookings",      icon: "📋",  label: "Reservas" },
    { id: "chat",          icon: "💬",  label: "Chat" },
    { id: "profile",       icon: "👤",  label: "Perfil" },
  ] as const;

  return (
    <div data-theme="dark" className="h-screen flex flex-col overflow-hidden bg-[var(--bg)]">
      {/* Topbar */}
      <header className="h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-5 shrink-0 z-50">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🔗</span>
          <span className="font-black text-lg" style={{ fontFamily: "var(--font-display)", background: "linear-gradient(135deg, #6c63ff, #ff6584)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ServiLink
          </span>
        </div>

        <nav className="flex gap-1">
          {NAV.map(({ id, icon, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={cn(
                "btn btn-ghost btn-sm gap-1.5 text-xs font-semibold relative",
                view === id ? "text-[var(--accent)] bg-[var(--accent)]/10" : "text-[var(--muted)]"
              )}>
              {icon} {label}
              {id === "chat" && unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent2)]" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowNotifs(p => !p)} className="btn btn-ghost btn-sm btn-circle relative text-[var(--muted)] text-lg">
            🔔
            {unread > 0 && (
              <span className="badge badge-xs badge-error absolute -top-0.5 -right-0.5 text-[9px] font-bold min-w-4">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <Avatar name={auth.name} size="sm" />
          <span className="text-sm font-semibold">{auth.name.split(" ")[0]}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={view} className="h-full"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}>
            {view === "map"           && <MapView auth={auth} />}
            {view === "professionals" && <ProfessionalsView />}
            {view === "bookings"      && <BookingsView auth={auth} />}
            {view === "chat"          && <ChatView auth={auth} />}
            {view === "profile"       && <ProfileView auth={auth} onLogout={handleLogout} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Notifications */}
      <AnimatePresence>
        {showNotifs && (
          <>
            <div className="fixed inset-0 z-[999]" onClick={() => setShowNotifs(false)} />
            <NotificationsPanel onClose={() => setShowNotifs(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
