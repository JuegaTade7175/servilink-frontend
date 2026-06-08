import { useState, useEffect, useCallback } from 'react';
import { bookingsApi, messagesApi, notificationsApi, professionalsApi } from '../api';
import type { Booking, Message, Notification, Professional } from '../types';

// ─── useBookings ──────────────────────────────────────────────────────────────
export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingsApi.myBookings();
      setBookings(data);
      setError(null);
    } catch {
      setError('Error al cargar reservas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { bookings, loading, error, refetch: fetch };
}

// ─── useMessages ──────────────────────────────────────────────────────────────
export function useMessages(bookingId: number | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const data = await messagesApi.getByBooking(bookingId);
      setMessages(data);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  return { messages, loading, refetch: fetch, addMessage };
}

// ─── useNotifications ─────────────────────────────────────────────────────────
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { unreadCount } = await notificationsApi.unreadCount();
      setUnreadCount(unreadCount);
    } catch { /* silent */ }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch { /* silent */ }
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return { notifications, unreadCount, fetchAll, markAllRead };
}

// ─── useProfessionals ─────────────────────────────────────────────────────────
export function useProfessionals(lat: number, lon: number, radius = 10) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lon) return;
    let cancelled = false;
    setLoading(true);
    professionalsApi.nearby(lat, lon, radius)
      .then(data => { if (!cancelled) setProfessionals(data); })
      .catch(() => { if (!cancelled) setError('Error al buscar profesionales'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lon, radius]);

  return { professionals, loading, error };
}
