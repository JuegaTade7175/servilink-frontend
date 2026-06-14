import api from './axiosInstance';
import type { Availability, CreateAvailabilityDto, UpdateAvailabilityDto } from '../types';

export const availabilityApi = {
  /** Horarios de un profesional (vista pública y propia) */
  getByProfessional: (professionalId: number): Promise<Availability[]> =>
    api.get(`/availability/professional/${professionalId}`).then(r => r.data),

  /** Mis horarios (profesional autenticado) */
  getMine: (): Promise<Availability[]> =>
    api.get('/availability/my').then(r => r.data),

  /** Crear franja */
  create: (dto: CreateAvailabilityDto): Promise<Availability> =>
    api.post('/availability', dto).then(r => r.data),

  /** Actualizar franja */
  update: (id: number, dto: UpdateAvailabilityDto): Promise<Availability> =>
    api.put(`/availability/${id}`, dto).then(r => r.data),

  /** Eliminar franja */
  delete: (id: number): Promise<void> =>
    api.delete(`/availability/${id}`).then(() => undefined),
};
