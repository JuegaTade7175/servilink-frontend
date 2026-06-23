import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';


const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const ProfessionalDashboardPage = lazy(() => import('./pages/ProfessionalDashboardPage'));
const AvailabilityPage = lazy(() => import('./pages/AvailabilityPage'));
const ProfessionalOnboardingPage = lazy(() => import('./pages/ProfessionalOnboardingPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const MapView = lazy(() => import('./pages/MapView'));
import { AuthProvider, useAuth } from './context/AuthContext';
import { authApi, professionalsApi, notificationsApi, usersApi, messagesApi } from './api';
import type { Professional, Notification, User, Role } from './types';



type View = 'map' | 'bookings' | 'professionals' | 'chat' | 'profile' | 'dashboard' | 'availability';

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'CLIENT' as Role,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = mode === 'login'
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form);
      login(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #1a1040 0%, #0c0d14 60%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="text-5xl mb-3"
          >🔗</motion.div>
          <h1
            className="text-4xl font-black"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #6c63ff, #ff6584)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >ServiLink</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Servicios domésticos · Lima, Perú</p>
        </div>

        <div className="card bg-[var(--card)] border border-[var(--border)] shadow-2xl">
          <div className="card-body gap-5">
            <div className="tabs tabs-box bg-[var(--surface)] rounded-xl p-1">
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={cn(
                    'tab flex-1 rounded-lg text-sm font-semibold transition-all',
                    mode === m && 'tab-active bg-[var(--accent)] text-white'
                  )}
                >
                  {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3"
              >
                {mode === 'register' && (
                  <>
                    <input
                      name="name"
                      className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full"
                      placeholder="Nombre completo"
                      value={form.name}
                      onChange={handle}
                    />
                    <input
                      name="phone"
                      className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full"
                      placeholder="Teléfono"
                      value={form.phone}
                      onChange={handle}
                    />
                    <select
                      name="role"
                      value={form.role}
                      onChange={handle}
                      className="select select-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full"
                    >
                      <option value="CLIENT">Cliente</option>
                      <option value="PROFESSIONAL">Profesional</option>
                    </select>
                  </>
                )}
                <input
                  name="email"
                  type="email"
                  className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full"
                  placeholder="Email"
                  value={form.email}
                  onChange={handle}
                />
                <input
                  name="password"
                  type="password"
                  className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] w-full"
                  placeholder="Contraseña"
                  value={form.password}
                  onChange={handle}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                />
              </motion.div>
            </AnimatePresence>

            {error && <p className="text-error text-sm text-center">{error}</p>}

            <button
              className={cn('btn w-full text-white', loading && 'loading')}
              onClick={submit}
              disabled={loading}
              style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              {loading ? '' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>

            <p className="text-center text-xs text-[var(--muted)]">
              Demo: juan.rios@servilink.pe / password123
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Avatar({ name, url, size = 'md' }: { name: string; url?: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = ['bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-amber-500', 'bg-violet-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }[size];
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={name} className={cn('rounded-full object-cover flex-shrink-0', sz)} />;
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-bold flex-shrink-0', sz, color)}>
      {initials}
    </div>
  );
}

function Stars({ r }: { r: number }) {
  const rating = Math.max(0, Math.min(5, Math.round(r || 0)));
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(rating)}
      <span className="text-white/20">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}



function ProfessionalsView({ onViewAvailability }: { onViewAvailability: (p: Professional) => void }) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    professionalsApi.nearby(-12.0464, -77.0428, 30)
      .then(setProfessionals)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const filtered = professionals.filter(p =>
    p.userName.toLowerCase().includes(search.toLowerCase()) ||
    p.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 overflow-auto h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-black text-2xl" style={{ fontFamily: 'var(--font-display)' }}>Profesionales</h2>
          <p className="text-sm text-[var(--muted)] mt-1">{professionals.length} disponibles en Lima</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar..."
          className="input input-bordered bg-[var(--card)] border-[var(--border)] text-[var(--text)] w-56 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--muted)]">Buscando profesionales...</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
          {filtered.map(p => (
            <motion.div
              key={p.id}
              whileHover={{ scale: 1.02 }}
              className="card bg-[var(--card)] border border-[var(--border)] p-5 hover:border-[var(--accent)] transition-colors"
            >
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
              {p.description && <p className="text-xs text-[var(--muted)] mb-3 line-clamp-2">{p.description}</p>}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <Stars r={p.averageRating} />
                  <span className="text-xs text-[var(--muted)]">{(p.averageRating ?? 0).toFixed(1)} ({p.totalReviews})</span>
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
              <button
                onClick={() => onViewAvailability(p)}
                className="btn btn-sm w-full text-white text-xs"
                style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
              >
                📅 Ver disponibilidad
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileView() {
  const { logout, userName, userEmail, role, userId } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoErr, setPhotoErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    setLoadingUser(true);
    usersApi.me()
      .then(setUser)
      .catch(() => {
        if (userName && userEmail && role && userId) {
          setUser({
            id: userId,
            name: userName,
            email: userEmail,
            phone: '',
            role: role,
            createdAt: new Date().toISOString(),
          });
        }
      })
      .finally(() => setLoadingUser(false));
  }, [role, userEmail, userId, userName]);

  const updatePhoto = async () => {
    if (!photoUrl.startsWith('https://')) {
      setPhotoErr('La URL debe comenzar con https://');
      return;
    }
    setSaving(true);
    setPhotoErr('');
    try {
      const updated = await usersApi.updatePhoto(photoUrl);
      setUser(updated);
      setPhotoUrl('');
    } catch (e: unknown) {
      setPhotoErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    try {
      const updated = await usersApi.removePhoto();
      setUser(updated);
    } catch {
      setPhotoErr('No se pudo eliminar la foto');
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted)]">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin mr-3" />
        Cargando perfil...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted)] flex-col gap-3">
        <div className="text-4xl">⚠️</div>
        <p>No se pudo cargar el perfil</p>
        <button onClick={logout} className="btn btn-error btn-sm text-white">Cerrar sesión</button>
      </div>
    );
  }

  const displayName = user.name || userName || 'Usuario';
  const displayEmail = user.email || userEmail || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-2xl mx-auto overflow-auto h-full"
    >
      <h2 className="font-black text-2xl mb-6" style={{ fontFamily: 'var(--font-display)' }}>Mi Perfil</h2>

      <div className="card bg-[var(--card)] border border-[var(--border)] p-7 mb-5">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            {user.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-[var(--accent)]/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-2xl ring-2 ring-[var(--accent)]/30">
                {displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            {user.profilePictureUrl && (
              <button
                onClick={removePhoto}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                title="Eliminar foto"
              >✕</button>
            )}
          </div>
          <div>
            <h3 className="font-black text-xl">{displayName}</h3>
            <p className="text-[var(--accent)] font-semibold">
              {user.role === 'CLIENT' ? 'Cliente' : user.role === 'PROFESSIONAL' ? 'Profesional' : user.role}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Miembro desde {new Date(user.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Email', value: displayEmail, icon: '✉️' },
            { label: 'Teléfono', value: user.phone || '—', icon: '📱' },
            { label: 'Rol', value: user.role === 'CLIENT' ? 'Cliente' : 'Profesional', icon: '🏷️' },
            { label: 'ID', value: `#${user.id}`, icon: '🆔' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-[var(--surface)] rounded-xl px-4 py-3">
              <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{icon} {label}</div>
              <div className="font-semibold text-sm break-all">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-[var(--card)] border border-[var(--border)] p-6 mb-5">
        <h3 className="font-bold mb-1">📸 Foto de perfil</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Sube tu foto a Cloudinary, Imgur o ImgBB y pega la URL (https://…)
        </p>
        <div className="flex gap-2.5">
          <input
            value={photoUrl}
            onChange={e => setPhotoUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
            className="input input-bordered bg-[var(--surface)] border-[var(--border)] text-[var(--text)] flex-1 text-sm"
          />
          <button
            onClick={updatePhoto}
            disabled={saving || !photoUrl}
            className={cn('btn text-white', saving && 'loading')}
            style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
          >
            {saving ? '' : 'Guardar'}
          </button>
        </div>
        {photoErr && <p className="text-error text-xs mt-2">{photoErr}</p>}
      </div>

      <button onClick={logout} className="btn btn-error text-white">
        🚪 Cerrar sesión
      </button>
    </motion.div>
  );
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    notificationsApi.getAll().then(setNotifs).catch(() => { });
  }, []);

  const TYPE_ICONS: Record<string, string> = {
    BOOKING_CREATED: '📅', BOOKING_CONFIRMED: '✅', BOOKING_CANCELLED: '❌',
    BOOKING_COMPLETED: '🎉', PAYMENT_RECEIVED: '💳', NEW_MESSAGE: '💬', NEW_REVIEW: '⭐',
  };

  const fmt = (s: string) => new Date(s).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="fixed top-16 right-4 w-80 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-[1000] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center">
        <h3 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Notificaciones</h3>
        <div className="flex gap-2">
          <button
            onClick={() => notificationsApi.markAllRead().then(() => setNotifs(p => p.map(n => ({ ...n, isRead: true }))))}
            className="btn btn-ghost btn-xs text-[var(--muted)]"
          >✓ Leídas</button>
          <button onClick={onClose} className="btn btn-ghost btn-xs text-[var(--muted)]">✕</button>
        </div>
      </div>
      <div className="max-h-96 overflow-auto">
        {notifs.length === 0 ? (
          <p className="text-center text-[var(--muted)] py-8 text-sm">Sin notificaciones</p>
        ) : notifs.map(n => (
          <div
            key={n.id}
            className={cn(
              'px-5 py-3 border-b border-[var(--border)] flex gap-3 items-start',
              !n.isRead && 'bg-[var(--accent)]/5'
            )}
          >
            <span className="text-xl">{TYPE_ICONS[n.type] ?? '🔔'}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{n.title}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">{n.body}</div>
              <div className="text-[10px] text-[var(--muted)] mt-1">{fmt(n.createdAt)}</div>
            </div>
            {!n.isRead && <div className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AppShell() {
  const { isAuthenticated, userName, role } = useAuth();
  const [view, setView] = useState<View>('map');
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<{ id: number; name: string } | null>(null);

  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setNeedsOnboarding(null); return; }
    if (role !== 'PROFESSIONAL') { setNeedsOnboarding(false); return; }

    professionalsApi.me()
      .then(() => setNeedsOnboarding(false))
      .catch(() => setNeedsOnboarding(true));
  }, [isAuthenticated, role]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = () =>
      notificationsApi.unreadCount().then(d => setUnread(d.unreadCount)).catch(() => { });
    fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    messagesApi.unreadCount().then(d => setUnread(prev => prev + d.unreadCount)).catch(() => { });
  }, [isAuthenticated]);

  if (!isAuthenticated) return <AuthPage />;

  if (role === 'PROFESSIONAL' && needsOnboarding === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0d14]">
        <div className="flex items-center gap-3 text-[#6b6d8a]">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin" />
          Verificando perfil...
        </div>
      </div>
    );
  }

  if (role === 'PROFESSIONAL' && needsOnboarding === true) {
    return (
      <ProfessionalOnboardingPage
        onCompleted={() => setNeedsOnboarding(false)}
      />
    );
  }

  const NAV = [
    ...(role === 'PROFESSIONAL' ? [
      { id: 'dashboard' as View, icon: '📊', label: 'Dashboard' },
      { id: 'availability' as View, icon: '📅', label: 'Horarios' }
    ] : []),
    { id: 'map' as View, icon: '🗺️', label: 'Mapa' },
    { id: 'professionals' as View, icon: '👥', label: 'Profesionales' },
    { id: 'bookings' as View, icon: '📋', label: 'Reservas' },
    { id: 'chat' as View, icon: '💬', label: 'Chat' },
    { id: 'profile' as View, icon: '👤', label: 'Perfil' },
  ];

  return (
    <div data-theme="dark" className="h-screen flex flex-col overflow-hidden bg-[var(--bg)]">
      { }
      <header className="h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-5 shrink-0 z-50">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🔗</span>
          <span
            className="font-black text-lg"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #6c63ff, #ff6584)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >ServiLink</span>
        </div>

        <nav className="flex gap-1">
          {NAV.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                setSelectedProfessional(null);
              }}
              className={cn(
                'btn btn-ghost btn-sm gap-1.5 text-xs font-semibold relative',
                view === id ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--muted)]'
              )}
            >
              {icon} {label}
              {id === 'chat' && unread > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent2)]" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifs(p => !p)}
            className="btn btn-ghost btn-sm btn-circle relative text-[var(--muted)] text-lg"
          >
            🔔
            {unread > 0 && (
              <span className="badge badge-xs badge-error absolute -top-0.5 -right-0.5 text-[9px] font-bold min-w-4">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <span className="text-sm font-semibold text-[var(--text)]">
            {(userName ?? 'Usuario').split(' ')[0]}
          </span>
        </div>
      </header>

      { }
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {view === 'map' && <MapView />}
            {view === 'professionals' && (
              <ProfessionalsView
                onViewAvailability={(p) => {
                  setSelectedProfessional({ id: p.id, name: p.userName });
                  setView('availability');
                }}
              />
            )}
            {view === 'bookings' && <BookingsPage />}
            {view === 'chat' && <ChatPage />}
            {view === 'profile' && <ProfileView />}
            {view === 'dashboard' && <ProfessionalDashboardPage />}
            {view === 'availability' && (
              <AvailabilityPage
                publicProfessionalId={selectedProfessional?.id}
                publicProfessionalName={selectedProfessional?.name}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      { }
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

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0c0d14]">
          <div className="flex items-center gap-3 text-[#6b6d8a]">
            <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin" />
            Cargando...
          </div>
        </div>
      }>
        <AppShell />
      </Suspense>
    </AuthProvider>
  );
}
