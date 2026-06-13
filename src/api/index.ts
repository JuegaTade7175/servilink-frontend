import axios from 'axios';
import type {
  AuthResponse, LoginRequest, RegisterRequest,
  User, Professional, GeoPoint, Category, ServiceItem,
  Booking, CreateBookingRequest, BookingConfirmation,
  Message, Notification, Payment, PaymentMethod, Review,
  Availability, DayOfWeek,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8081',
});

// Inyectar JWT en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el backend devuelve 401, limpiar sesión
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      ['sl_token', 'sl_userId', 'sl_name', 'sl_email', 'sl_role'].forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
    const msg = err.response?.data?.message ?? err.message ?? 'Error del servidor';
    return Promise.reject(new Error(msg));
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/api/auth/login', data).then(r => r.data),
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/api/auth/register', data).then(r => r.data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () =>
    api.get<User>('/api/users/me').then(r => r.data),
  updatePhoto: (url: string) =>
    api.patch<User>('/api/users/profile-picture', { profilePictureUrl: url }).then(r => r.data),
  removePhoto: () =>
    api.delete<User>('/api/users/profile-picture').then(r => r.data),
};

// ─── Professionals ────────────────────────────────────────────────────────────
export const professionalsApi = {
  nearby: (lat: number, lon: number, radius = 10, categoryId?: number) =>
    api.get<Professional[]>('/api/professionals/nearby', {
      params: { lat, lon, radius, ...(categoryId ? { categoryId } : {}) },
    }).then(r => r.data),
  getById: (id: number) =>
    api.get<Professional>(`/api/professionals/${id}`).then(r => r.data),
  me: () =>
    api.get<Professional>('/api/professionals/me').then(r => r.data),
  createProfile: (data: Record<string, unknown>) =>
    api.post<Professional>('/api/professionals/profile', data).then(r => r.data),
  updateProfile: (data: Record<string, unknown>) =>
    api.put<Professional>('/api/professionals/profile', data).then(r => r.data),
};

// ─── Map ──────────────────────────────────────────────────────────────────────
export const mapApi = {
  geoPoints: (lat: number, lon: number, radius = 10, categoryId?: number) =>
    api.get<GeoPoint[]>('/api/map/professionals', {
      params: { lat, lon, radius, ...(categoryId ? { categoryId } : {}) },
    }).then(r => r.data),
  geocode: (address: string) =>
    api.get('/api/map/geocode', { params: { address } }).then(r => r.data),
  distance: (lat1: number, lon1: number, lat2: number, lon2: number) =>
    api.get('/api/map/distance', { params: { lat1, lon1, lat2, lon2 } }).then(r => r.data),
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  getAll: () => api.get<Category[]>('/api/categories').then(r => r.data),
  getById: (id: number) => api.get<Category>(`/api/categories/${id}`).then(r => r.data),
  getServices: (id: number) =>
    api.get<ServiceItem[]>(`/api/categories/${id}/services`).then(r => r.data),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsApi = {
  create: (data: CreateBookingRequest) =>
    api.post<Booking>('/api/bookings', data).then(r => r.data),
  myBookings: () =>
    api.get<Booking[]>('/api/bookings/my').then(r => r.data),
  getById: (id: number) =>
    api.get<Booking>(`/api/bookings/${id}`).then(r => r.data),
  updateStatus: (id: number, status: string) =>
    api.patch<Booking>(`/api/bookings/${id}/status`, { status }).then(r => r.data),
  byProfessional: (professionalId: number) =>
    api.get<Booking[]>('/api/bookings/professional', { params: { professionalId } }).then(r => r.data),
};

// ─── Confirmations ────────────────────────────────────────────────────────────
export const confirmationsApi = {
  generate: (bookingId: number) =>
    api.post<BookingConfirmation>(`/api/confirmations/booking/${bookingId}/generate`).then(r => r.data),
  confirm: (code: string) =>
    api.post<BookingConfirmation>('/api/confirmations/confirm', { code }).then(r => r.data),
  getStatus: (bookingId: number) =>
    api.get<BookingConfirmation>(`/api/confirmations/booking/${bookingId}`).then(r => r.data),
  cancel: (bookingId: number) =>
    api.delete(`/api/confirmations/booking/${bookingId}`).then(r => r.data),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messagesApi = {
  send: (bookingId: number, content: string) =>
    api.post<Message>(`/api/messages/booking/${bookingId}`, { content }).then(r => r.data),
  getByBooking: (bookingId: number) =>
    api.get<Message[]>(`/api/messages/booking/${bookingId}`).then(r => r.data),
  markAsRead: (bookingId: number) =>
    api.patch(`/api/messages/booking/${bookingId}/read`).then(r => r.data),
  unreadCount: () =>
    api.get<{ unreadCount: number }>('/api/messages/unread/count').then(r => r.data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll: () =>
    api.get<Notification[]>('/api/notifications').then(r => r.data),
  getUnread: () =>
    api.get<Notification[]>('/api/notifications/unread').then(r => r.data),
  unreadCount: () =>
    api.get<{ unreadCount: number }>('/api/notifications/unread/count').then(r => r.data),
  markAllRead: () =>
    api.patch('/api/notifications/read-all').then(r => r.data),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  process: (bookingId: number, amount: number, method: PaymentMethod) =>
    api.post<Payment>('/api/payments', { bookingId, amount, method }).then(r => r.data),
  getByBooking: (bookingId: number) =>
    api.get<Payment>(`/api/payments/booking/${bookingId}`).then(r => r.data),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviewsApi = {
  create: (bookingId: number, rating: number, comment: string) =>
    api.post<Review>('/api/reviews', { bookingId, rating, comment }).then(r => r.data),
  byProfessional: (professionalId: number) =>
    api.get<Review[]>(`/api/reviews/professional/${professionalId}`).then(r => r.data),
};

// ─── Availability ─────────────────────────────────────────────────────────────
export const availabilityApi = {
  getByProfessional: (id: number) =>
    api.get<Availability[]>(`/api/availability/professional/${id}`).then(r => r.data),
  getByDay: (id: number, day: DayOfWeek) =>
    api.get<Availability[]>(`/api/availability/professional/${id}/day`, { params: { day } }).then(r => r.data),
  create: (data: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }) =>
    api.post<Availability>('/api/availability', data).then(r => r.data),
  update: (id: number, data: Partial<Availability>) =>
    api.put<Availability>(`/api/availability/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/api/availability/${id}`).then(r => r.data),
};

export default api;
