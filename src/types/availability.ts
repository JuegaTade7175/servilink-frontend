export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface Availability {
  id: number;
  professionalId: number;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm:ss"
  endTime: string;
  isAvailable: boolean;
}

export interface CreateAvailabilityDto {
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;
}

export interface UpdateAvailabilityDto {
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
}
