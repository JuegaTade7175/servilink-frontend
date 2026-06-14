export interface Professional {
  id: number;
  userId: number;
  fullName?: string;
  bio?: string;
  yearsOfExperience?: number;
  hourlyRate?: number;
  categoryId?: number;
  categoryName?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  profilePhotoUrl?: string;
}

export interface ProfessionalUpdateDto {
  bio?: string;
  yearsOfExperience?: number;
  hourlyRate?: number;
  categoryId?: number;
  latitude?: number;
  longitude?: number;
}
