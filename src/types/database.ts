export type UserRole = 'SUPER_ADMIN' | 'GYM_OWNER' | 'GYM_ADMIN' | 'TRAINER' | 'STUDENT';
export type GymStatus = 'TRIAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type ThemeMode = 'LIGHT' | 'DARK' | 'GRADIENT';
export type LateFeeType = 'FIXED' | 'PERCENTAGE';
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type MembershipStatus = 'ACTIVE' | 'OVERDUE' | 'INACTIVE' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'MERCADO_PAGO' | 'CASH' | 'TRANSFER';
export type ReservationStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | 'NOSHOW';
export type QrType = 'PUBLIC_GYM' | 'ROUTINE' | 'EXERCISE';
export type OrderStatus = 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELLED';

export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  max_students: number;
  max_trainers: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Gym {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  logo_url?: string | null;
  plan_id?: string | null;
  trial_started_at: string;
  trial_ends_at: string;
  status: GymStatus;
  created_at: string;
  updated_at: string;
}

export interface GymSettings {
  gym_id: string;
  logo_url?: string | null;
  banner_url?: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  surface_color: string;
  theme: ThemeMode;
  gradient_enabled: boolean;
  gradient_color_start: string;
  gradient_color_end: string;
  gradient_direction: string;
  late_fee_days: number;
  late_fee_type: LateFeeType;
  late_fee_value: number;
  min_cancel_hours: number;
  mp_access_token?: string | null;
  mp_public_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  gym_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  gym_id: string;
  profile_id?: string | null;
  trainer_id?: string | null;
  first_name: string;
  last_name: string;
  dni: string;
  email: string;
  phone?: string | null;
  birth_date?: string | null;
  join_date: string;
  address?: string | null;
  photo_url?: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  id: string;
  gym_id: string;
  profile_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Discipline {
  id: string;
  gym_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  duration_minutes: number;
  max_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  gym_id: string;
  student_id: string;
  discipline_id: string;
  price: number;
  start_date: string;
  expiration_date: string;
  status: MembershipStatus;
  late_fee_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  student_id: string;
  membership_id?: string | null;
  amount: number;
  late_fee_applied: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  mp_payment_id?: string | null;
  mp_preference_id?: string | null;
  paid_at?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  execution: string;
  muscle_group: string;
  secondary_muscles?: string[] | null;
  equipment?: string | null;
  level?: string | null;
  image_url?: string | null;
  gif_url?: string | null;
  video_url?: string | null;
  tips?: string | null;
  common_mistakes?: string | null;
  external_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_day_id: string;
  exercise_id?: string | null;
  custom_exercise_id?: string | null;
  exercise?: Exercise | null;
  sets: number;
  repetitions: string;
  weight_kg?: number | null;
  rest_seconds: number;
  notes?: string | null;
  order_index: number;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  day_name: string;
  day_order: number;
  exercises?: RoutineExercise[];
}

export interface Routine {
  id: string;
  gym_id: string;
  student_id: string;
  trainer_id?: string | null;
  name: string;
  description?: string | null;
  goal?: string | null;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  routine_days?: RoutineDay[];
  created_at: string;
  updated_at: string;
}

export interface ClassSchedule {
  id: string;
  gym_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface ClassEntity {
  id: string;
  gym_id: string;
  discipline_id: string;
  trainer_id?: string | null;
  name: string;
  max_capacity: number;
  created_at: string;
  updated_at: string;
  discipline?: Discipline | null;
  trainer?: Trainer | null;
  schedules?: ClassSchedule[];
}

export interface Reservation {
  id: string;
  gym_id: string;
  student_id: string;
  class_schedule_id: string;
  reservation_date: string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
  student?: Student;
  schedule?: ClassSchedule;
}

export interface Product {
  id: string;
  gym_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
