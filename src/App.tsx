import { useState, useEffect, useRef, useCallback } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Role = "CLIENT" | "PROFESSIONAL";
type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type PaymentMethod = "CARD" | "YAPE" | "BANK_TRANSFER";
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
  profById: (id: number) => request<Professional>(`/api/professionals/${id}`),
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
const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "#f59e0b", CONFIRMED: "#3b82f6", IN_PROGRESS: "#8b5cf6",
  COMPLETED: "#10b981", CANCELLED: "#ef4444",
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
    <span style={{ color: "#f59e0b", letterSpacing: 1 }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

function Avatar({ name, url, size = 36 }: { name: string; url?: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  const colors = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0c0d14; --surface: #13141f; --card: #1a1b2e; --border: #252640;
    --accent: #6c63ff; --accent2: #ff6584; --accent3: #43e97b;
    --text: #e8e9f3; --muted: #6b6d8a; --success: #10b981; --danger: #ef4444;
    --warn: #f59e0b;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); }
  input, textarea, select {
    font-family: inherit; background: var(--surface); color: var(--text);
    border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px;
    font-size: 14px; width: 100%; outline: none; transition: border-color .2s;
  }
  input:focus, textarea:focus, select:focus { border-color: var(--accent); }
  button { font-family: inherit; cursor: pointer; border: none; outline: none; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  .sl-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 14px;
    transition: all .2s; white-space: nowrap;
  }
  .sl-btn-primary { background: var(--accent); color: #fff; }
  .sl-btn-primary:hover { background: #5a52e8; transform: translateY(-1px); }
  .sl-btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--border); }
  .sl-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .sl-btn-danger { background: var(--danger); color: #fff; }
  .sl-btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; }
  .sl-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; }
  .sl-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: .5px; }
  .fade-in { animation: fadeIn .3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
`;

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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(ellipse at 30% 20%, #1a1040 0%, var(--bg) 60%)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔗</div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 32, fontWeight: 800, background: "linear-gradient(135deg, #6c63ff, #ff6584)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ServiLink
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>Servicios domésticos · Lima, Perú</p>
        </div>

        <div className="sl-card" style={{ padding: 32 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "var(--surface)", borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className="sl-btn" style={{ flex: 1, background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "#fff" : "var(--muted)", borderRadius: 9, padding: "8px 0", fontSize: 13 }}>
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <>
                <input name="name" placeholder="Nombre completo" value={form.name} onChange={handle} />
                <input name="phone" placeholder="Teléfono" value={form.phone} onChange={handle} />
                <select name="role" value={form.role} onChange={handle}>
                  <option value="CLIENT">Cliente</option>
                  <option value="PROFESSIONAL">Profesional</option>
                </select>
              </>
            )}
            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handle} />
            <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handle} onKeyDown={e => e.key === "Enter" && submit()} />
          </div>

          {error && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</p>}

          <button className="sl-btn sl-btn-primary" style={{ width: "100%", marginTop: 20, padding: "12px 0", fontSize: 15 }} onClick={submit} disabled={loading}>
            {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 20 }}>
            Demo: carlos@servilink.pe / password123
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MAP VIEW (Simulated Leaflet-like) ───────────────────────────────────────
function MapView({ auth }: { auth: AuthResponse }) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selected, setSelected] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<{ id: number; rating: number; comment: string; clientName: string }[]>([]);
  const LAT = -12.0464; const LON = -77.0428;

  useEffect(() => {
    api.professionals(LAT, LON, 20)
      .then(setProfessionals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.reviews(selected.id).then(setReviews).catch(() => setReviews([]));
  }, [selected]);

  // Simulated map with CSS positioning
  const mapPins = professionals.map((p, i) => ({
    ...p,
    x: 20 + ((i * 73) % 75),
    y: 15 + ((i * 47) % 65),
  }));

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* Map area */}
      <div style={{ flex: 1, position: "relative", background: "linear-gradient(135deg, #1a2035 0%, #0f1520 100%)", overflow: "hidden" }}>
        {/* Grid pattern */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .06 }}>
          <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6c63ff" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Simulated roads */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .15 }}>
          <line x1="0" y1="40%" x2="100%" y2="38%" stroke="#fff" strokeWidth="2"/>
          <line x1="0" y1="65%" x2="100%" y2="63%" stroke="#fff" strokeWidth="1.5"/>
          <line x1="30%" y1="0" x2="32%" y2="100%" stroke="#fff" strokeWidth="2"/>
          <line x1="70%" y1="0" x2="68%" y2="100%" stroke="#fff" strokeWidth="1.5"/>
        </svg>

        {/* Location label */}
        <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,.5)", backdropFilter: "blur(8px)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          📍 Lima, Perú — Radio 20km
        </div>

        {/* Pins */}
        {loading ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            <span className="pulse">Cargando profesionales...</span>
          </div>
        ) : mapPins.map(p => (
          <div key={p.id}
            onClick={() => setSelected(p)}
            style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, cursor: "pointer", transform: "translate(-50%, -100%)", transition: "transform .2s", zIndex: selected?.id === p.id ? 10 : 1 }}>
            <div style={{ background: selected?.id === p.id ? "var(--accent)" : "var(--card)", border: `2px solid ${selected?.id === p.id ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "6px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.5)", display: "flex", alignItems: "center", gap: 5 }}>
              {p.isVerified ? "✅" : "👤"} {p.userName.split(" ")[0]}
              <span style={{ color: "#f59e0b" }}>★{p.averageRating.toFixed(1)}</span>
            </div>
            <div style={{ width: 10, height: 10, background: selected?.id === p.id ? "var(--accent)" : "var(--border)", borderRadius: "50%", margin: "2px auto 0" }} />
          </div>
        ))}

        {/* Center dot */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
          <div style={{ width: 16, height: 16, background: "var(--accent2)", borderRadius: "50%", boxShadow: "0 0 0 4px rgba(255,101,132,.3)" }} />
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ width: 340, borderLeft: "1px solid var(--border)", overflow: "auto", background: "var(--surface)" }}>
        {selected ? (
          <div className="fade-in" style={{ padding: 20 }}>
            <button onClick={() => setSelected(null)} style={{ background: "none", color: "var(--muted)", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
              ← Volver
            </button>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
              <Avatar name={selected.userName} url={selected.profilePictureUrl} size={52} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16 }}>{selected.userName}</h3>
                <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>{selected.specialty}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Stars rating={selected.averageRating} />
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{selected.averageRating.toFixed(1)} ({selected.totalReviews})</span>
                  {selected.isVerified && <span className="sl-badge" style={{ background: "#10b98120", color: "#10b981" }}>✓ Verificado</span>}
                </div>
              </div>
            </div>

            {selected.description && <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>{selected.description}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Tarifa base", value: `S/. ${selected.baseRate}/hr` },
                { label: "Radio", value: `${selected.coverageRadiusKm ?? "?"} km` },
                { label: "Distancia", value: selected.distanceKm ? `${selected.distanceKm.toFixed(1)} km` : "—" },
                { label: "Teléfono", value: selected.userPhone ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--card)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>

            {selected.services.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Servicios</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selected.services.map(s => (
                    <div key={s.id} style={{ background: "var(--card)", borderRadius: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13 }}>{s.name}</span>
                      {s.referencePrice && <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>S/. {s.referencePrice}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviews.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Reseñas recientes</p>
                {reviews.slice(0, 3).map(r => (
                  <div key={r.id} style={{ background: "var(--card)", borderRadius: 10, padding: "10px 12px", marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.clientName}</span>
                      <Stars rating={r.rating} />
                    </div>
                    {r.comment && <p style={{ fontSize: 12, color: "var(--muted)" }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            <button className="sl-btn sl-btn-primary" style={{ width: "100%" }}>
              📅 Reservar servicio
            </button>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <h2 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Mapa de profesionales</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {professionals.length} profesionales encontrados cerca de Lima
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {professionals.map(p => (
                <div key={p.id} onClick={() => setSelected(p)} className="sl-card" style={{ padding: "12px 14px", cursor: "pointer", transition: "border-color .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={p.userName} url={p.profilePictureUrl} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.userName}</div>
                      <div style={{ fontSize: 11, color: "var(--accent)" }}>{p.specialty}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>★ {p.averageRating.toFixed(1)}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>S/. {p.baseRate}/hr</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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

  useEffect(() => {
    api.myBookings().then(setBookings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* List */}
      <div style={{ width: 380, borderRight: "1px solid var(--border)", overflow: "auto", background: "var(--surface)" }}>
        <div style={{ padding: "20px 20px 0" }}>
          <h2 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Mis Reservas</h2>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? "var(--accent)" : "var(--card)", color: filter === s ? "#fff" : "var(--muted)", border: "1px solid " + (filter === s ? "transparent" : "var(--border)"), borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {s === "ALL" ? "Todas" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          {loading ? <p className="pulse" style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Cargando...</p>
            : filtered.length === 0 ? <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>No hay reservas</p>
            : filtered.map(b => (
              <div key={b.id} onClick={() => setSelected(b)} className="sl-card" style={{ padding: "14px", marginBottom: 8, cursor: "pointer", borderColor: selected?.id === b.id ? "var(--accent)" : "var(--border)", transition: "border-color .2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{b.serviceName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>con {b.professionalName}</div>
                  </div>
                  <span className="sl-badge" style={{ background: STATUS_COLORS[b.status] + "25", color: STATUS_COLORS[b.status] }}>
                    {STATUS_LABELS[b.status]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 12 }}>
                  <span>📅 {new Date(b.scheduledAt).toLocaleDateString("es-PE")}</span>
                  <span>📍 {b.address.slice(0, 25)}...</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {selected ? (
          <div className="fade-in" style={{ maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 22 }}>Reserva #{selected.id}</h2>
              <span className="sl-badge" style={{ background: STATUS_COLORS[selected.status] + "25", color: STATUS_COLORS[selected.status], fontSize: 13, padding: "6px 14px" }}>
                {STATUS_LABELS[selected.status]}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { icon: "🔧", label: "Servicio", value: selected.serviceName },
                { icon: "👤", label: "Profesional", value: selected.professionalName },
                { icon: "📅", label: "Fecha programada", value: fmt(selected.scheduledAt) },
                { icon: "📍", label: "Dirección", value: selected.address },
                { icon: "👤", label: "Cliente", value: selected.clientName },
                { icon: "🕐", label: "Creado", value: fmt(selected.createdAt) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="sl-card" style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>{icon} {label}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>

            {selected.description && (
              <div className="sl-card" style={{ padding: "14px 16px", marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>📝 Descripción</div>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}>{selected.description}</p>
              </div>
            )}

            {/* Status change buttons */}
            {selected.status === "PENDING" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button className="sl-btn sl-btn-primary" onClick={async () => {
                  const upd = await api.updateBooking(selected.id, "CONFIRMED");
                  setSelected(upd);
                  setBookings(prev => prev.map(b => b.id === upd.id ? upd : b));
                }}>✅ Confirmar</button>
                <button className="sl-btn sl-btn-danger" onClick={async () => {
                  const upd = await api.updateBooking(selected.id, "CANCELLED");
                  setSelected(upd);
                  setBookings(prev => prev.map(b => b.id === upd.id ? upd : b));
                }}>❌ Cancelar</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--muted)" }}>
            <div style={{ fontSize: 48 }}>📋</div>
            <p style={{ fontSize: 16 }}>Selecciona una reserva para ver detalles</p>
          </div>
        )}
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

  useEffect(() => {
    if (!selected) return;
    api.messages(selected.id).then(setMessages).catch(() => {});
  }, [selected]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!selected || !input.trim()) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(selected.id, input.trim());
      setMessages(prev => [...prev, msg]);
      setInput("");
    } catch { /* silent */ } finally { setSending(false); }
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* Conversations list */}
      <div style={{ width: 300, borderRight: "1px solid var(--border)", overflow: "auto", background: "var(--surface)" }}>
        <div style={{ padding: "20px 20px 12px" }}>
          <h2 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18 }}>Chat</h2>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Conversaciones activas</p>
        </div>
        {bookings.filter(b => b.status !== "CANCELLED").map(b => (
          <div key={b.id} onClick={() => setSelected(b)} style={{ padding: "14px 20px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selected?.id === b.id ? "var(--card)" : "transparent", transition: "background .2s", borderLeft: selected?.id === b.id ? "3px solid var(--accent)" : "3px solid transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={b.professionalName} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.professionalName}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.serviceName}</div>
              </div>
              <span className="sl-badge" style={{ background: STATUS_COLORS[b.status] + "20", color: STATUS_COLORS[b.status], fontSize: 9 }}>
                {STATUS_LABELS[b.status]}
              </span>
            </div>
          </div>
        ))}
        {bookings.filter(b => b.status !== "CANCELLED").length === 0 && (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: 40, fontSize: 13 }}>Sin reservas activas</p>
        )}
      </div>

      {/* Chat area */}
      {selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--surface)" }}>
            <Avatar name={selected.professionalName} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.professionalName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{selected.serviceName}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--muted)", marginTop: 60 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                <p style={{ fontSize: 13 }}>Inicia la conversación</p>
              </div>
            )}
            {messages.map(msg => {
              const isMine = msg.senderId === auth.userId;
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                  {!isMine && <Avatar name={msg.senderName} size={28} />}
                  <div style={{ maxWidth: "70%", marginLeft: isMine ? 0 : 8, marginRight: isMine ? 0 : 0 }}>
                    <div style={{ background: isMine ? "var(--accent)" : "var(--card)", color: "#fff", borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5 }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, textAlign: isMine ? "right" : "left" }}>
                      {new Date(msg.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                      {isMine && (msg.isRead ? " ✓✓" : " ✓")}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, background: "var(--surface)" }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe un mensaje..." onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} style={{ flex: 1, borderRadius: 99 }} />
            <button className="sl-btn sl-btn-primary" onClick={send} disabled={sending || !input.trim()} style={{ borderRadius: 99, padding: "10px 18px" }}>
              {sending ? "..." : "➤"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--muted)" }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <p>Selecciona una conversación</p>
        </div>
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

  if (!user) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }} className="pulse">Cargando perfil...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 24, marginBottom: 24 }}>Mi Perfil</h2>

      <div className="sl-card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <Avatar name={user.name} url={user.profilePictureUrl} size={72} />
          <div>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 22 }}>{user.name}</h3>
            <p style={{ color: "var(--accent)", fontWeight: 600 }}>{user.role === "CLIENT" ? "Cliente" : "Profesional"}</p>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Miembro desde {new Date(user.createdAt).toLocaleDateString("es-PE")}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Email", value: user.email, icon: "✉️" },
            { label: "Teléfono", value: user.phone ?? "—", icon: "📱" },
            { label: "Rol", value: user.role === "CLIENT" ? "Cliente" : "Profesional", icon: "🏷️" },
            { label: "ID", value: `#${user.id}`, icon: "🆔" },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ background: "var(--surface)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>{icon} {label}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo URL update */}
      <div className="sl-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 16 }}>📸 Foto de perfil</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          Sube tu foto a Cloudinary, Imgur o ImgBB y pega la URL aquí (debe comenzar con https://)
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." style={{ flex: 1 }} />
          <button className="sl-btn sl-btn-primary" onClick={updatePhoto} disabled={saving || !photoUrl}>
            {saving ? "Guardando..." : "Actualizar"}
          </button>
        </div>
        {photoError && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{photoError}</p>}
      </div>

      <button className="sl-btn sl-btn-danger" onClick={onLogout}>
        🚪 Cerrar sesión
      </button>
    </div>
  );
}

// ─── PROFESSIONALS EXPLORE ────────────────────────────────────────────────────
function ProfessionalsView() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.professionals(-12.0464, -77.0428, 30)
      .then(setProfessionals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = professionals.filter(p =>
    p.userName.toLowerCase().includes(search.toLowerCase()) ||
    p.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 32, overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 24 }}>Profesionales</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{professionals.length} disponibles en Lima</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{ width: 220 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }} className="pulse">Buscando profesionales...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map(p => (
            <div key={p.id} className="sl-card" style={{ padding: 20, transition: "border-color .2s", cursor: "default" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <Avatar name={p.userName} url={p.profilePictureUrl} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.userName}</h3>
                    {p.isVerified && <span style={{ color: "#10b981", fontSize: 12 }}>✓</span>}
                  </div>
                  <p style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>{p.specialty}</p>
                </div>
              </div>

              {p.description && <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Stars rating={p.averageRating} />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{p.averageRating.toFixed(1)} ({p.totalReviews})</span>
                </div>
                <span style={{ fontWeight: 700, color: "var(--accent3)", fontSize: 15 }}>S/. {p.baseRate}/hr</span>
              </div>

              {p.services.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {p.services.slice(0, 3).map(s => (
                    <span key={s.id} className="sl-badge" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>{s.name}</span>
                  ))}
                </div>
              )}

              <button className="sl-btn sl-btn-primary" style={{ width: "100%", fontSize: 13 }}>
                📅 Ver disponibilidad
              </button>
            </div>
          ))}
        </div>
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
    <div style={{ position: "fixed", top: 60, right: 16, width: 340, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.5)", zIndex: 1000, overflow: "hidden" }} className="fade-in">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontFamily: "Syne", fontWeight: 700 }}>Notificaciones</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="sl-btn sl-btn-ghost sl-btn-sm" onClick={() => api.markAllRead().then(() => setNotifs(prev => prev.map(n => ({ ...n, isRead: true }))))}>
            ✓ Marcar leídas
          </button>
          <button onClick={onClose} style={{ background: "none", color: "var(--muted)", fontSize: 16 }}>✕</button>
        </div>
      </div>
      <div style={{ maxHeight: 420, overflow: "auto" }}>
        {notifs.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: 32 }}>Sin notificaciones</p>
        ) : notifs.map(n => (
          <div key={n.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: n.isRead ? "transparent" : "rgba(108,99,255,.08)", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>{TYPE_ICONS[n.type] ?? "🔔"}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{n.body}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{fmt(n.createdAt)}</div>
            </div>
            {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 4 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(() => {
    const token = localStorage.getItem("sl_token");
    if (!token) return null;
    const userId = Number(localStorage.getItem("sl_userId"));
    const name = localStorage.getItem("sl_name") ?? "";
    const email = localStorage.getItem("sl_email") ?? "";
    const role = (localStorage.getItem("sl_role") ?? "CLIENT") as Role;
    return token ? { token, userId, name, email, role } : null;
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

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setAuth(null);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const fetchUnread = () => api.unreadCount().then(d => setUnread(d.unreadCount)).catch(() => {});
    fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [auth]);

  if (!auth) return (
    <>
      <style>{STYLE}</style>
      <AuthPage onLogin={handleLogin} />
    </>
  );

  const NAV_ITEMS = [
    { id: "map", icon: "🗺️", label: "Mapa" },
    { id: "professionals", icon: "👥", label: "Profesionales" },
    { id: "bookings", icon: "📋", label: "Reservas" },
    { id: "chat", icon: "💬", label: "Chat" },
    { id: "profile", icon: "👤", label: "Perfil" },
  ] as const;

  return (
    <>
      <style>{STYLE}</style>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <header style={{ height: 56, background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔗</span>
            <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, background: "linear-gradient(135deg, #6c63ff, #ff6584)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ServiLink</span>
          </div>

          <nav style={{ display: "flex", gap: 4 }}>
            {NAV_ITEMS.map(({ id, icon, label }) => (
              <button key={id} onClick={() => setView(id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, background: view === id ? "rgba(108,99,255,.15)" : "transparent", color: view === id ? "var(--accent)" : "var(--muted)", border: "none", fontWeight: view === id ? 700 : 400, fontSize: 13, cursor: "pointer", transition: "all .2s", position: "relative" }}>
                {icon} {label}
                {id === "chat" && unread > 0 && (
                  <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: "var(--accent2)" }} />
                )}
              </button>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setShowNotifs(p => !p)} style={{ position: "relative", background: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>
              🔔
              {unread > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, background: "var(--accent2)", color: "#fff", borderRadius: 99, minWidth: 16, height: 16, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            <Avatar name={auth.name} size={32} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{auth.name.split(" ")[0]}</span>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: "hidden" }}>
          {view === "map" && <MapView auth={auth} />}
          {view === "professionals" && <ProfessionalsView />}
          {view === "bookings" && <BookingsView auth={auth} />}
          {view === "chat" && <ChatView auth={auth} />}
          {view === "profile" && <ProfileView auth={auth} onLogout={handleLogout} />}
        </main>

        {/* Notifications overlay */}
        {showNotifs && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setShowNotifs(false)} />
            <NotificationsPanel onClose={() => setShowNotifs(false)} />
          </>
        )}
      </div>
    </>
  );
}
