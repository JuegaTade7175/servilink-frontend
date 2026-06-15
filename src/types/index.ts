// ─── Enums ────────────────────────────────────────────────────────────────────
export type Role = 'CLIENT' | 'PROFESSIONAL' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
export type PaymentMethod = 'CARD' | 'YAPE' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type NotificationType =
  | 'BOOKING_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED' | 'PAYMENT_RECEIVED' | 'NEW_MESSAGE' | 'NEW_REVIEW';
export type DayOfWeek =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
  | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
  type: string;
  userId: number;
  name: string;
  email: string;
  role: Role;
}
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  name: string; email: string; password: string; phone: string; role: Role;
}

// ─── User — espejo de UserResponse del backend ────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  profilePictureUrl?: string;
  role: Role;
  createdAt: string;
}

// ─── ServiceItem — espejo de ServiceResponse del backend ──────────────────────
export interface ServiceItem {
  id: number;
  name: string;
  description?: string;
  referencePrice?: number;
  estimatedDurationHours?: number;
  categoryId?: number;
  categoryName?: string;
}

// ─── Professional — espejo EXACTO de ProfessionalResponse del backend ─────────
// El backend devuelve: id, userId, userName, userEmail, userPhone,
// profilePictureUrl, specialty, description, latitude, longitude, address,
// coverageRadiusKm, baseRate, isVerified, averageRating, totalReviews,
// certifications, distanceKm, services (ServiceResponse[])
export interface Professional {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  profilePictureUrl?: string;
  specialty: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  coverageRadiusKm?: number;
  baseRate: number;
  isVerified: boolean;
  averageRating: number;
  totalReviews: number;
  certifications?: string;
  distanceKm?: number;
  services: ServiceItem[];
}

// ─── GeoPoint — espejo de GeoPointResponse del backend ───────────────────────
export interface GeoPoint {
  professionalId: number;
  name: string;
  specialty: string;
  latitude: number;
  longitude: number;
  averageRating: number;
  baseRate: number;
  distanceKm?: number;
  isVerified: boolean;
}

// ─── Category ─────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
}

// ─── Booking — espejo de BookingResponse del backend ─────────────────────────
// El backend devuelve: id, clientId, clientName, professionalId,
// professionalName, serviceId, serviceName, scheduledAt, address,
// description, status, createdAt
// NOTA: el backend NO devuelve "notes" ni "totalPrice" — esos campos no existen
export interface Booking {
  id: number;
  clientId: number;
  clientName: string;
  professionalId: number;
  professionalName: string;
  serviceId: number;
  serviceName: string;
  scheduledAt: string;
  address: string;
  description?: string;
  status: BookingStatus;
  createdAt: string;
}

export interface CreateBookingRequest {
  professionalId: number;
  serviceId: number;
  scheduledAt: string;
  address: string;
  clientLatitude?: number;
  clientLongitude?: number;
  description?: string;
}

// ─── BookingConfirmation ──────────────────────────────────────────────────────
export interface BookingConfirmation {
  id: number;
  bookingId: number;
  clientName: string;
  professionalName: string;
  serviceName: string;
  scheduledAt: string;
  confirmationCode: string;
  status: ConfirmationStatus;
  confirmedAt?: string;
  expiresAt: string;
  createdAt: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string;
  paidAt: string;
  createdAt: string;
}

// ─── Message ──────────────────────────────────────────────────────────────────
export interface Message {
  id: number;
  bookingId: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  id: number;
  title: string;
  body: string;
  type: NotificationType;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}

// ─── Review ───────────────────────────────────────────────────────────────────
export interface Review {
  id: number;
  bookingId: number;
  professionalId: number;
  professionalName: string;
  clientId: number;
  clientName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// ─── Availability — espejo de AvailabilityResponse del backend ────────────────
export interface Availability {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;   // "HH:mm:ss" — así lo devuelve el backend
  endTime: string;
  isAvailable: boolean;
}

// ─── DTOs para crear/actualizar en el backend ─────────────────────────────────
// Crear perfil profesional — espejo de CreateProfessionalRequest del backend
export interface CreateProfessionalRequest {
  specialty: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  coverageRadiusKm?: number;
  baseRate: number;
  certifications?: string;
}

// Actualizar perfil profesional — espejo de UpdateProfessionalRequest del backend
export interface UpdateProfessionalRequest {
  specialty?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  coverageRadiusKm?: number;
  baseRate?: number;
  certifications?: string;
}
