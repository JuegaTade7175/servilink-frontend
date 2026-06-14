import api from './axiosInstance';
import type { Professional, ProfessionalUpdateDto } from '../types';

export const professionalsApi = {
  /** Todos los profesionales (con filtros opcionales) */
  getAll: (params?: {
    categoryId?: number;
    lat?: number;
    lng?: number;
    radius?: number;
  }): Promise<Professional[]> =>
    api.get('/professionals', { params }).then(r => r.data),

  /** Un profesional por ID */
  getById: (id: number): Promise<Professional> =>
    api.get(`/professionals/${id}`).then(r => r.data),

  /** Mi perfil profesional (requiere token con rol PROFESSIONAL) */
  me: (): Promise<Professional> =>
    api.get('/professionals/me').then(r => r.data),

  /** Actualizar perfil profesional */
  update: (id: number, dto: ProfessionalUpdateDto): Promise<Professional> =>
    api.put(`/professionals/${id}`, dto).then(r => r.data),
};
