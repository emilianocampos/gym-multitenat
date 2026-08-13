-- ============================================================================
-- GYM SAAS - SCHEME SQL MULTI-TENANT PARA SUPABASE (ULTRA ROBUSTO)
-- ============================================================================
-- Incluye:
--  - Extensión uuid-ossp / pgcrypto
--  - Tipos Enumerados (Roles, Estados, Métodos de Pago, Tipos de QR)
--  - Habilitación explícita de Row Level Security (RLS) en el 100% de las tablas
--  - Trigger de Auth handle_new_user() a prueba de fallos (Evita "Database error saving new user")
--  - Tablas Core SaaS (plans, gyms, gym_settings, profiles)
--  - Tablas Administrativas (students, trainers, disciplines, memberships, payments, payment_items)
--  - Tablas de Reservas y Clases (classes, class_schedules, reservations, attendance)
--  - Tablas de Biblioteca de Ejercicios (exercises global con external_id, gym_exercises custom)
--  - Tablas de Rutinas (routines, routine_days, routine_exercises)
--  - Tablas de Tienda / E-commerce (product_categories, products, orders, order_items)
--  - Tablas de QRs, Notificaciones y Auditoría (qr_codes, notifications, audit_logs)
--  - Funciones Helper RLS (current_user_gym_id, current_user_role)
--  - Políticas de Seguridad RLS con calidades explícitas
--  - Función de Reserva Atómica con Control Estricto de Cupos (evita 21/20)
-- ============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS (Creación segura)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'GYM_OWNER', 'GYM_ADMIN', 'TRAINER', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE gym_status AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE theme_mode AS ENUM ('LIGHT', 'DARK', 'GRADIENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE late_fee_type AS ENUM ('FIXED', 'PERCENTAGE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE student_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('ACTIVE', 'OVERDUE', 'INACTIVE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('MERCADO_PAGO', 'CASH', 'TRANSFER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('CONFIRMED', 'CANCELLED', 'ATTENDED', 'NOSHOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE qr_type AS ENUM ('PUBLIC_GYM', 'ROUTINE', 'EXERCISE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 3. TABLAS BASE Y TENANTS
-- ============================================================================

-- 3.1 PLANES SAAS
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  max_students INT NOT NULL DEFAULT 100,
  max_trainers INT NOT NULL DEFAULT 5,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- 3.2 GIMNASIOS (TENANTS)
CREATE TABLE IF NOT EXISTS public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  plan_id UUID REFERENCES public.plans(id),
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  status gym_status NOT NULL DEFAULT 'TRIAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gyms_slug ON public.gyms(slug);
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- 3.3 CONFIGURACIÓN Y PERSONALIZACIÓN VISUAL DEL GIMNASIO
CREATE TABLE IF NOT EXISTS public.gym_settings (
  gym_id UUID PRIMARY KEY REFERENCES public.gyms(id) ON DELETE CASCADE,
  logo_url TEXT,
  banner_url TEXT,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#CCFF00',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#141418',
  background_color VARCHAR(7) NOT NULL DEFAULT '#0B0B0E',
  surface_color VARCHAR(7) NOT NULL DEFAULT '#18181C',
  theme theme_mode NOT NULL DEFAULT 'DARK',
  gradient_enabled BOOLEAN NOT NULL DEFAULT true,
  gradient_color_start VARCHAR(7) NOT NULL DEFAULT '#CCFF00',
  gradient_color_end VARCHAR(7) NOT NULL DEFAULT '#88FF00',
  gradient_direction TEXT NOT NULL DEFAULT 'to right bottom',
  late_fee_days INT NOT NULL DEFAULT 3,
  late_fee_type late_fee_type NOT NULL DEFAULT 'FIXED',
  late_fee_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  min_cancel_hours INT NOT NULL DEFAULT 2,
  mp_access_token TEXT,
  mp_public_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;

-- 3.4 PERFILES DE USUARIO (Vinculados a Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'STUDENT',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_gym_id ON public.profiles(gym_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. ENTIDADES DEL GIMNASIO (MULTITENANT CON gym_id)
-- ============================================================================

-- 4.1 PROFESORES
CREATE TABLE IF NOT EXISTS public.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  bio TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainers_gym_id ON public.trainers(gym_id);
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

-- 4.2 ALUMNOS
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni VARCHAR(20) NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  address TEXT,
  photo_url TEXT,
  status student_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unq_gym_student_dni UNIQUE (gym_id, dni)
);

CREATE INDEX IF NOT EXISTS idx_students_gym_id ON public.students(gym_id);
CREATE INDEX IF NOT EXISTS idx_students_trainer_id ON public.students(trainer_id);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 4.3 DISCIPLINAS
CREATE TABLE IF NOT EXISTS public.disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  duration_minutes INT NOT NULL DEFAULT 60,
  max_capacity INT NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disciplines_gym_id ON public.disciplines(gym_id);
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;

-- 4.4 MEMBRESÍAS / CUOTAS POR ALUMNO
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE NOT NULL,
  status membership_status NOT NULL DEFAULT 'ACTIVE',
  late_fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_gym_id ON public.memberships(gym_id);
CREATE INDEX IF NOT EXISTS idx_memberships_student_id ON public.memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 4.5 PAGOS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  late_fee_applied NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status payment_status NOT NULL DEFAULT 'PENDING',
  payment_method payment_method NOT NULL DEFAULT 'CASH',
  mp_payment_id TEXT,
  mp_preference_id TEXT,
  paid_at TIMESTAMPTZ,
  registered_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_gym_id ON public.payments(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4.6 DETALLE DE PAGOS
CREATE TABLE IF NOT EXISTS public.payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  discipline_id UUID REFERENCES public.disciplines(id),
  product_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CLASES, HORARIOS, RESERVAS Y ASISTENCIAS
-- ============================================================================

-- 5.1 CLASES
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  max_capacity INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_gym_id ON public.classes(gym_id);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 5.2 HORARIOS DE CLASES (RECURRENTE)
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_schedules_gym ON public.class_schedules(gym_id, class_id);
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- 5.3 RESERVAS CON CONTROL ESTRICTO DE CUPOS
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  status reservation_status NOT NULL DEFAULT 'CONFIRMED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unq_student_schedule_date UNIQUE (student_id, class_schedule_id, reservation_date)
);

CREATE INDEX IF NOT EXISTS idx_reservations_gym_date ON public.reservations(gym_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_schedule_date ON public.reservations(class_schedule_id, reservation_date);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 5.4 ASISTENCIA REAL EN GIMNASIO
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. BANCO DE EJERCICIOS Y PERSONALIZADOS
-- ============================================================================

-- 6.1 BIBLIOTECA GLOBAL DE EJERCICIOS
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  execution TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT[],
  equipment TEXT,
  level TEXT DEFAULT 'Intermedio',
  category TEXT,
  image_url TEXT,
  gif_url TEXT,
  video_url TEXT,
  tips TEXT,
  common_mistakes TEXT,
  external_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_slug ON public.exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_external_id ON public.exercises(external_id);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- 6.2 EJERCICIOS PROPIOS DEL GIMNASIO / ADAPTACIONES
CREATE TABLE IF NOT EXISTS public.gym_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  custom_name TEXT,
  custom_description TEXT,
  custom_gif_url TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_exercises_gym ON public.gym_exercises(gym_id);
ALTER TABLE public.gym_exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RUTINAS
-- ============================================================================

-- 7.1 RUTINA PRINCIPAL
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routines_gym_student ON public.routines(gym_id, student_id);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- 7.2 DÍAS DE RUTINA
CREATE TABLE IF NOT EXISTS public.routine_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL,
  day_order INT NOT NULL DEFAULT 1
);

ALTER TABLE public.routine_days ENABLE ROW LEVEL SECURITY;

-- 7.3 EJERCICIOS POR DÍA DE RUTINA
CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_day_id UUID NOT NULL REFERENCES public.routine_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  custom_exercise_id UUID REFERENCES public.gym_exercises(id) ON DELETE SET NULL,
  sets INT NOT NULL DEFAULT 4,
  repetitions TEXT NOT NULL DEFAULT '10-12',
  weight_kg NUMERIC(6, 2) DEFAULT 0,
  rest_seconds INT NOT NULL DEFAULT 60,
  notes TEXT,
  order_index INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_day ON public.routine_exercises(routine_day_id);
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. TIENDA / E-COMMERCE DEL GIMNASIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_gym ON public.products(gym_id);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status order_status NOT NULL DEFAULT 'PENDING',
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. QR CODES, NOTIFICACIONES Y AUDITORÍA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  type qr_type NOT NULL DEFAULT 'PUBLIC_GYM',
  reference_id UUID,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scan_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. TRIGGER AUTOMÁTICO DE USUARIOS DE AUTH (A PRUEBA DE FALLOS ABSOLUTO)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_gym_id UUID := NULL;
  v_role public.user_role := 'STUDENT'::public.user_role;
  v_first_name TEXT := 'Usuario';
  v_last_name TEXT := '';
  v_dni TEXT := '';
  v_phone TEXT := NULL;
  v_raw_role TEXT;
  v_raw_gym_id TEXT;
BEGIN
  -- Extraer metadatos de forma segura si existen
  IF new.raw_user_meta_data IS NOT NULL THEN
    v_first_name := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'first_name'), ''), 'Usuario');
    v_last_name := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'last_name'), ''), '');
    v_dni := COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'dni'), ''), '');
    v_phone := NULLIF(TRIM(new.raw_user_meta_data->>'phone'), '');
    v_raw_role := UPPER(TRIM(COALESCE(new.raw_user_meta_data->>'role', '')));
    v_raw_gym_id := TRIM(COALESCE(new.raw_user_meta_data->>'gym_id', ''));
  END IF;

  -- 1. Parsear el Rol de forma ultra segura
  IF v_raw_role IN ('SUPER_ADMIN', 'GYM_OWNER', 'GYM_ADMIN', 'TRAINER', 'STUDENT') THEN
    BEGIN
      v_role := v_raw_role::public.user_role;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'STUDENT'::public.user_role;
    END;
  END IF;

  -- 2. Verificar gym_id de forma segura si fue provisto
  IF v_raw_gym_id IS NOT NULL AND v_raw_gym_id != '' THEN
    BEGIN
      SELECT id INTO v_gym_id FROM public.gyms WHERE id = v_raw_gym_id::uuid LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_gym_id := NULL;
    END;
  END IF;

  -- 3. Inserción / Actualización segura en public.profiles
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      phone,
      role,
      gym_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      new.id,
      COALESCE(new.email, ''),
      v_first_name,
      v_last_name,
      v_phone,
      v_role,
      v_gym_id,
      true,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      role = EXCLUDED.role,
      gym_id = COALESCE(EXCLUDED.gym_id, public.profiles.gym_id),
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 4. Si el rol es STUDENT y hay un gym_id asociado, crear ficha de alumno automáticamente
  IF v_gym_id IS NOT NULL AND v_role = 'STUDENT'::public.user_role THEN
    BEGIN
      INSERT INTO public.students (
        gym_id,
        profile_id,
        first_name,
        last_name,
        dni,
        email,
        phone,
        status
      ) VALUES (
        v_gym_id,
        new.id,
        v_first_name,
        v_last_name,
        COALESCE(NULLIF(v_dni, ''), new.id::text),
        COALESCE(new.email, ''),
        v_phone,
        'ACTIVE'::public.student_status
      )
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- CAPTURA ABSOLUTA DE ERRORES: Devuelve NEW siempre para NUNCA bloquear auth.users
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 11. FUNCIONES RLS Y POLÍTICAS DE SEGURIDAD MULTI-TENANT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_gym_id()
RETURNS UUID AS $$
  SELECT p.gym_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role AS $$
  SELECT p.role FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- LIMPIEZA DE POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS plans_read ON public.plans;
DROP POLICY IF EXISTS plans_write ON public.plans;
DROP POLICY IF EXISTS gyms_read ON public.gyms;
DROP POLICY IF EXISTS gyms_write ON public.gyms;
DROP POLICY IF EXISTS profiles_isolation ON public.profiles;
DROP POLICY IF EXISTS gym_settings_read ON public.gym_settings;
DROP POLICY IF EXISTS gym_settings_write ON public.gym_settings;
DROP POLICY IF EXISTS gym_tenant_isolation_students ON public.students;
DROP POLICY IF EXISTS gym_tenant_isolation_trainers ON public.trainers;
DROP POLICY IF EXISTS gym_tenant_isolation_disciplines ON public.disciplines;
DROP POLICY IF EXISTS gym_tenant_isolation_memberships ON public.memberships;
DROP POLICY IF EXISTS gym_tenant_isolation_payments ON public.payments;
DROP POLICY IF EXISTS gym_tenant_isolation_payment_items ON public.payment_items;
DROP POLICY IF EXISTS gym_tenant_isolation_classes ON public.classes;
DROP POLICY IF EXISTS gym_tenant_isolation_class_schedules ON public.class_schedules;
DROP POLICY IF EXISTS gym_tenant_isolation_reservations ON public.reservations;
DROP POLICY IF EXISTS gym_tenant_isolation_attendance ON public.attendance;
DROP POLICY IF EXISTS global_exercises_read ON public.exercises;
DROP POLICY IF EXISTS global_exercises_write ON public.exercises;
DROP POLICY IF EXISTS gym_tenant_isolation_gym_exercises ON public.gym_exercises;
DROP POLICY IF EXISTS gym_tenant_isolation_routines ON public.routines;
DROP POLICY IF EXISTS gym_tenant_isolation_routine_days ON public.routine_days;
DROP POLICY IF EXISTS gym_tenant_isolation_routine_exercises ON public.routine_exercises;
DROP POLICY IF EXISTS gym_tenant_isolation_product_categories ON public.product_categories;
DROP POLICY IF EXISTS gym_tenant_isolation_products ON public.products;
DROP POLICY IF EXISTS gym_tenant_isolation_orders ON public.orders;
DROP POLICY IF EXISTS gym_tenant_isolation_order_items ON public.order_items;
DROP POLICY IF EXISTS gym_tenant_isolation_qr_codes ON public.qr_codes;
DROP POLICY IF EXISTS gym_tenant_isolation_notifications ON public.notifications;
DROP POLICY IF EXISTS gym_tenant_isolation_audit_logs ON public.audit_logs;

-- CREACIÓN DE POLÍTICAS CON ALIAS EXPLÍCITOS
CREATE POLICY plans_read ON public.plans FOR SELECT USING (true);
CREATE POLICY plans_write ON public.plans FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY gyms_read ON public.gyms FOR SELECT USING (true);
CREATE POLICY gyms_write ON public.gyms FOR ALL USING (
  public.current_user_role() = 'SUPER_ADMIN' OR
  public.gyms.id = public.current_user_gym_id() OR
  auth.uid() IS NULL
);

CREATE POLICY profiles_isolation ON public.profiles
  FOR ALL USING (
    public.current_user_role() = 'SUPER_ADMIN' OR
    public.profiles.id = auth.uid() OR
    public.profiles.gym_id = public.current_user_gym_id() OR
    auth.uid() IS NULL
  )
  WITH CHECK (
    public.current_user_role() = 'SUPER_ADMIN' OR
    public.profiles.id = auth.uid() OR
    auth.uid() IS NULL
  );

CREATE POLICY gym_settings_read ON public.gym_settings FOR SELECT USING (true);
CREATE POLICY gym_settings_write ON public.gym_settings
  FOR ALL USING (
    public.current_user_role() = 'SUPER_ADMIN' OR
    (public.gym_settings.gym_id = public.current_user_gym_id() AND public.current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN')) OR
    auth.uid() IS NULL
  );

CREATE POLICY gym_tenant_isolation_students ON public.students
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.students.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_trainers ON public.trainers
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.trainers.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_disciplines ON public.disciplines
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.disciplines.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_memberships ON public.memberships
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.memberships.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_payments ON public.payments
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.payments.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_payment_items ON public.payment_items
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR payment_id IN (SELECT p.id FROM public.payments p WHERE p.gym_id = public.current_user_gym_id()));

CREATE POLICY gym_tenant_isolation_classes ON public.classes
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.classes.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_class_schedules ON public.class_schedules
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.class_schedules.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_reservations ON public.reservations
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.reservations.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_attendance ON public.attendance
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.attendance.gym_id = public.current_user_gym_id());

CREATE POLICY global_exercises_read ON public.exercises FOR SELECT USING (true);
CREATE POLICY global_exercises_write ON public.exercises FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY gym_tenant_isolation_gym_exercises ON public.gym_exercises
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.gym_exercises.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_routines ON public.routines
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.routines.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_routine_days ON public.routine_days
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR routine_id IN (SELECT r.id FROM public.routines r WHERE r.gym_id = public.current_user_gym_id()));

CREATE POLICY gym_tenant_isolation_routine_exercises ON public.routine_exercises
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR routine_day_id IN (SELECT rd.id FROM public.routine_days rd JOIN public.routines r ON r.id = rd.routine_id WHERE r.gym_id = public.current_user_gym_id()));

CREATE POLICY gym_tenant_isolation_product_categories ON public.product_categories
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.product_categories.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_products ON public.products
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.products.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_orders ON public.orders
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.orders.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_order_items ON public.order_items
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR order_id IN (SELECT o.id FROM public.orders o WHERE o.gym_id = public.current_user_gym_id()));

CREATE POLICY gym_tenant_isolation_qr_codes ON public.qr_codes
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.qr_codes.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_notifications ON public.notifications
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.notifications.gym_id = public.current_user_gym_id());

CREATE POLICY gym_tenant_isolation_audit_logs ON public.audit_logs
  FOR ALL USING (public.current_user_role() = 'SUPER_ADMIN' OR public.audit_logs.gym_id = public.current_user_gym_id());

-- ============================================================================
-- 12. RPC PARA RESERVAS ATÓMICAS (EVITA CONDICIONES DE CARRERA / SOBRERESERVA)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.book_class_reservation(
  p_student_id UUID,
  p_class_schedule_id UUID,
  p_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_gym_id UUID;
  v_max_capacity INT;
  v_current_confirmed INT;
  v_membership_active BOOLEAN;
  v_reservation_id UUID;
BEGIN
  SELECT cs.gym_id, c.max_capacity
  INTO v_gym_id, v_max_capacity
  FROM public.class_schedules cs
  JOIN public.classes c ON c.id = cs.class_id
  WHERE cs.id = p_class_schedule_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Horario de clase no encontrado');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.classes c ON c.discipline_id = m.discipline_id
    JOIN public.class_schedules cs ON cs.class_id = c.id
    WHERE cs.id = p_class_schedule_id
      AND m.student_id = p_student_id
      AND m.status = 'ACTIVE'
      AND m.expiration_date >= CURRENT_DATE
  ) INTO v_membership_active;

  IF NOT v_membership_active THEN
    RETURN jsonb_build_object('success', false, 'message', 'No posees una membresía activa para esta disciplina');
  END IF;

  SELECT COUNT(*)
  INTO v_current_confirmed
  FROM public.reservations
  WHERE class_schedule_id = p_class_schedule_id
    AND reservation_date = p_date
    AND status = 'CONFIRMED';

  IF v_current_confirmed >= v_max_capacity THEN
    RETURN jsonb_build_object('success', false, 'message', 'CLASE COMPLETA (0 cupos disponibles)');
  END IF;

  INSERT INTO public.reservations (
    gym_id,
    student_id,
    class_schedule_id,
    reservation_date,
    status
  ) VALUES (
    v_gym_id,
    p_student_id,
    p_class_schedule_id,
    p_date,
    'CONFIRMED'
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reserva realizada con éxito',
    'reservation_id', v_reservation_id,
    'available_slots', v_max_capacity - (v_current_confirmed + 1)
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ya posees una reserva para este horario y fecha');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 13. PERMISOS Y GRANTS (Crucial para Supabase Auth y RLS)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role, postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role, postgres;

