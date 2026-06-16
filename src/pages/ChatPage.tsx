import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { bookingsApi, messagesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Booking, Message } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────
function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Agrupa mensajes por día */
function groupByDay(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  let currentDay = '';
  for (const msg of messages) {
    const day = fmtDay(msg.createdAt);
    if (day !== currentDay) {
      currentDay = day;
      groups.push({ label: day, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'text-amber-400',
  CONFIRMED:   'text-sky-400',
  IN_PROGRESS: 'text-violet-400',
  COMPLETED:   'text-emerald-400',
  CANCELLED:   'text-red-400',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En progreso', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const safeName = name || 'Usuario';
  const COLORS = ['bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-amber-500', 'bg-violet-500', 'bg-emerald-500'];
  const color = COLORS[safeName.charCodeAt(0) % COLORS.length];
  const initials = safeName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const sz = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' }[size];
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-bold flex-shrink-0', sz, color)}>
      {initials}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return <div className={cn(sz, 'rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin')} />;
}

// ─── Booking List Item ────────────────────────────────────────────────────────
function BookingItem({
  booking,
  selected,
  lastMessage,
  unread,
  onClick,
  currentUserId,
}: {
  booking: Booking;
  selected: boolean;
  lastMessage?: Message;
  unread: number;
  onClick: () => void;
  currentUserId: number;
}) {
  const isClient = currentUserId === booking.clientId;
  const otherName = isClient ? booking.professionalName : booking.clientName;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-b border-[#252640]/60',
        selected
          ? 'bg-[#6c63ff]/12 border-l-2 border-l-[#6c63ff]'
          : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar name={otherName} size="md" />
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0e0f1a]',
          booking.status === 'CANCELLED' ? 'bg-red-500' :
          booking.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-[#6c63ff]'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-sm text-[#e8e9f3] truncate pr-2">{otherName || 'Cargando...'}</span>
          {lastMessage && (
            <span className="text-[10px] text-[#6b6d8a] flex-shrink-0">{fmtTime(lastMessage.createdAt)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#6b6d8a] truncate">
            {lastMessage ? lastMessage.content : `🔧 ${booking.serviceName}`}
          </p>
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-[#6c63ff] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <p className={cn('text-[10px] font-semibold mt-0.5', STATUS_COLORS[booking.status] ?? 'text-[#6b6d8a]')}>
          {STATUS_LABELS[booking.status] ?? booking.status}
        </p>
      </div>
    </button>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  isMine,
  showAvatar,
}: {
  msg: Message;
  isMine: boolean;
  showAvatar: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn('flex items-end gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar placeholder para alinear */}
      <div className="w-7 flex-shrink-0">
        {!isMine && showAvatar && <Avatar name={msg.senderName} size="sm" />}
      </div>

      <div className={cn('max-w-[72%] flex flex-col gap-0.5', isMine ? 'items-end' : 'items-start')}>
        {!isMine && showAvatar && (
          <span className="text-[10px] font-semibold text-[#6b6d8a] px-1">{msg.senderName}</span>
        )}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
            isMine
              ? 'bg-[#6c63ff] text-white rounded-br-sm'
              : 'bg-[#1e1f38] text-[#e8e9f3] border border-[#252640] rounded-bl-sm'
          )}
        >
          {msg.content}
        </div>
        <div className={cn('flex items-center gap-1.5 px-1', isMine ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-[#6b6d8a]">{fmtTime(msg.createdAt)}</span>
          {isMine && (
            <span className={cn('text-[10px]', msg.isRead ? 'text-[#6c63ff]' : 'text-[#6b6d8a]')}>
              {msg.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 flex-shrink-0" />
      <div className="bg-[#1e1f38] border border-[#252640] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#6b6d8a]"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
        <span className="text-[10px] text-[#6b6d8a] ml-1">{name} escribe...</span>
      </div>
    </div>
  );
}

// ─── Chat Window ──────────────────────────────────────────────────────────────
function ChatWindow({ booking, currentUserId }: { booking: Booking; currentUserId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCountRef = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const data = await messagesApi.getByBooking(booking.id);
      setMessages(data);
      if (!silent) setLoading(false);
      // Si llegaron nuevos mensajes, scroll
      if (data.length > lastCountRef.current) {
        lastCountRef.current = data.length;
        setTimeout(() => scrollToBottom('smooth'), 60);
      }
    } catch {
      if (!silent) setLoading(false);
    }
  }, [booking.id, scrollToBottom]);

  // Carga inicial + marcar leídos
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastCountRef.current = 0;
    fetchMessages(false).then(() => {
      messagesApi.markAsRead(booking.id).catch(() => {});
    });
    inputRef.current?.focus();
  }, [booking.id, fetchMessages]);

  // Scroll al cargar
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('instant');
    }
  }, [loading, scrollToBottom]);

  // Polling cada 3 segundos
  useEffect(() => {
    pollingRef.current = setInterval(() => fetchMessages(true), 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;

    // Optimistic update
    const optimistic: Message = {
      id: Date.now(),
      bookingId: booking.id,
      senderId: currentUserId,
      senderName: 'Tú',
      receiverId: 0,
      receiverName: '',
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    lastCountRef.current += 1;
    setTimeout(() => scrollToBottom('smooth'), 60);

    setSending(true);
    setError('');
    try {
      const saved = await messagesApi.send(booking.id, content);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } catch (e: unknown) {
      // Revert optimistic
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      lastCountRef.current -= 1;
      setError(e instanceof Error ? e.message : 'Error al enviar');
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const groups = groupByDay(messages);
  const otherName = currentUserId === booking.clientId
    ? booking.professionalName
    : booking.clientName;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b border-[#252640] bg-[#0e0f1a]">
        <Avatar name={otherName} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#e8e9f3] text-sm truncate">{otherName}</h3>
          <p className="text-xs text-[#6b6d8a] truncate">
            🔧 {booking.serviceName}
            <span className={cn('ml-2 font-semibold', STATUS_COLORS[booking.status])}>
              · {STATUS_LABELS[booking.status]}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-[#6b6d8a] uppercase tracking-wider">Reserva</p>
            <p className="text-xs font-bold text-[#6c63ff]">#{booking.id}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Actualización automática activa" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#6c63ff]/10 border border-[#6c63ff]/20 flex items-center justify-center text-3xl">
              💬
            </div>
            <div>
              <p className="font-semibold text-[#e8e9f3] text-sm">Sin mensajes aún</p>
              <p className="text-xs text-[#6b6d8a] mt-1">
                Envía el primer mensaje a {otherName}
              </p>
            </div>
          </div>
        ) : (
          <>
            {groups.map((group, gi) => (
              <div key={gi}>
                {/* Day separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#252640]" />
                  <span className="text-[10px] font-semibold text-[#6b6d8a] bg-[#0c0d14] px-2 py-0.5 rounded-full border border-[#252640]">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-[#252640]" />
                </div>

                <div className="space-y-1">
                  {group.messages.map((msg, i) => {
                    const isMine = msg.senderId === currentUserId;
                    const prev = group.messages[i - 1];
                    const showAvatar = !prev || prev.senderId !== msg.senderId;
                    // Add gap when sender changes
                    const addGap = prev && prev.senderId !== msg.senderId;
                    return (
                      <div key={msg.id} className={addGap ? 'mt-3' : ''}>
                        <MessageBubble msg={msg} isMine={isMine} showAvatar={showAvatar} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {showTyping && <TypingIndicator name={otherName} />}
          </>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-5 mb-2 px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center justify-between gap-3"
          >
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 flex-shrink-0">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      {booking.status !== 'CANCELLED' ? (
        <div className="flex-shrink-0 px-4 py-3 border-t border-[#252640] bg-[#0e0f1a]">
          <div className="flex items-end gap-2.5">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={handleKey}
                placeholder={`Mensaje a ${otherName}...`}
                rows={1}
                className="w-full bg-[#1a1b2e] border border-[#252640] focus:border-[#6c63ff]/60 rounded-2xl px-4 py-3 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors resize-none leading-relaxed"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>

            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className={cn(
                'flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all',
                input.trim() && !sending
                  ? 'bg-[#6c63ff] hover:bg-[#5b54e8] text-white shadow-lg shadow-[#6c63ff]/20'
                  : 'bg-[#252640] text-[#6b6d8a] cursor-not-allowed'
              )}
            >
              {sending
                ? <Spinner size="sm" />
                : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )
              }
            </button>
          </div>
          <p className="text-[10px] text-[#6b6d8a] mt-1.5 px-1">
            Enter para enviar · Shift+Enter para nueva línea · Se actualiza cada 3s
          </p>
        </div>
      ) : (
        <div className="flex-shrink-0 px-4 py-4 border-t border-[#252640] bg-[#0e0f1a]">
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <span className="text-red-400 text-xs font-semibold">❌ Esta reserva fue cancelada — el chat está cerrado</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state (no booking selected) ───────────────────────────────────────
function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 160 }}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6c63ff]/20 to-[#ff6584]/10 border border-[#6c63ff]/20 flex items-center justify-center text-4xl"
      >
        💬
      </motion.div>
      <div>
        <p className="font-bold text-[#e8e9f3] text-lg" style={{ fontFamily: 'var(--font-display)' }}>
          Mensajes
        </p>
        <p className="text-sm text-[#6b6d8a] mt-1 max-w-xs leading-relaxed">
          Selecciona una conversación para chatear con el cliente o profesional de esa reserva.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {[
          { icon: '🔧', text: 'Coordiná detalles del servicio' },
          { icon: '📍', text: 'Confirmá la dirección y horario' },
          { icon: '⭐', text: 'Mantené comunicación directa' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 px-4 py-2.5 bg-[#1a1b2e] border border-[#252640] rounded-xl">
            <span className="text-lg">{icon}</span>
            <span className="text-xs text-[#6b6d8a]">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { userId } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<number, Message>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(true); // para mobile

  // Cargar reservas activas (con mensajes)
  useEffect(() => {
    bookingsApi.myBookings()
      .then(data => {
        if (!Array.isArray(data)) {
          setBookings([]);
          setLoading(false);
          return;
        }
        // Solo reservas no canceladas primero, luego canceladas
        const sorted = [...data].sort((a, b) => {
          if (a.status === 'CANCELLED' && b.status !== 'CANCELLED') return 1;
          if (b.status === 'CANCELLED' && a.status !== 'CANCELLED') return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setBookings(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Cargar preview del último mensaje de cada reserva
  useEffect(() => {
    if (!Array.isArray(bookings) || bookings.length === 0) return;
    const activeBookings = bookings.filter(b => b.status !== 'CANCELLED').slice(0, 10);
    Promise.all(
      activeBookings.map(b =>
        messagesApi.getByBooking(b.id)
          .then(msgs => ({ id: b.id, msgs }))
          .catch(() => ({ id: b.id, msgs: [] }))
      )
    ).then(results => {
      const lm: Record<number, Message> = {};
      const uc: Record<number, number> = {};
      for (const { id, msgs } of results) {
        if (Array.isArray(msgs) && msgs.length > 0) lm[id] = msgs[msgs.length - 1];
        if (Array.isArray(msgs)) {
          uc[id] = msgs.filter(m => !m.isRead && m.receiverId === userId).length;
        }
      }
      setLastMessages(lm);
      setUnreadCounts(uc);
    });
  }, [bookings, userId]);

  const handleSelect = (b: Booking) => {
    setSelected(b);
    setShowList(false);
    // Limpiar contador de no leídos al abrir
    setUnreadCounts(prev => ({ ...prev, [b.id]: 0 }));
  };

  const filtered = (Array.isArray(bookings) ? bookings : []).filter(b => {
    const q = search.toLowerCase();
    const pName = b.professionalName?.toLowerCase() || '';
    const cName = b.clientName?.toLowerCase() || '';
    const sName = b.serviceName?.toLowerCase() || '';
    return pName.includes(q) || cName.includes(q) || sName.includes(q);
  });

  const activeCount = (Array.isArray(bookings) ? bookings : []).filter(b => b.status !== 'CANCELLED').length;
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-full bg-[#0c0d14] overflow-hidden">

      {/* ─── Sidebar de conversaciones ─────────────────────────────────── */}
      <div className={cn(
        'flex flex-col border-r border-[#252640] bg-[#0e0f1a] transition-all duration-200',
        // En mobile se oculta cuando hay chat abierto
        'w-full sm:w-[300px] md:w-[320px] flex-shrink-0',
        !showList && 'hidden sm:flex sm:flex-col'
      )}>
        {/* Header sidebar */}
        <div className="flex-shrink-0 px-4 pt-5 pb-3 border-b border-[#252640]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-black text-base text-[#e8e9f3]" style={{ fontFamily: 'var(--font-display)' }}>
                Chats
              </h2>
              <p className="text-xs text-[#6b6d8a]">
                {activeCount} activas
                {totalUnread > 0 && (
                  <span className="ml-1.5 bg-[#6c63ff] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                    {totalUnread} nuevo{totalUnread > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Polling activo" />
          </div>

          {/* Buscador */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6d8a]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/50 rounded-xl pl-8 pr-3 py-2 text-xs text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-5">
              <div className="text-4xl">{search ? '🔍' : '📭'}</div>
              <p className="text-xs text-[#6b6d8a]">
                {search ? 'Sin resultados para esa búsqueda' : 'No tienes reservas activas aún'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                >
                  <BookingItem
                    booking={b}
                    selected={selected?.id === b.id}
                    lastMessage={lastMessages[b.id]}
                    unread={unreadCounts[b.id] ?? 0}
                    onClick={() => handleSelect(b)}
                    currentUserId={userId ?? 0}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer info */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-[#252640]">
          <p className="text-[10px] text-[#6b6d8a] text-center leading-relaxed">
            💬 Chat REST · actualización cada 3s
          </p>
        </div>
      </div>

      {/* ─── Panel de chat ─────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 overflow-hidden',
        showList && 'hidden sm:block'
      )}>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col"
            >
              {/* Back button mobile */}
              <div className="sm:hidden flex-shrink-0 px-3 py-2 border-b border-[#252640] bg-[#0e0f1a]">
                <button
                  onClick={() => setShowList(true)}
                  className="flex items-center gap-1.5 text-[#6c63ff] text-xs font-semibold"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Volver
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  booking={selected}
                  currentUserId={userId ?? 0}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full"
            >
              <EmptyChat />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyframes para typing dots */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
