-- ============================================================================
-- MIGRATION: 20260818000001_add_class_time_to_reservations.sql
-- DESCRIPCIÓN: Añade las columnas faltantes (class_time, discipline_id, etc.)
--              a la tabla 'reservations' y recarga la caché de esquema de PostgREST.
-- ============================================================================

DO $$ 
BEGIN
  -- 1. Añadir columna 'class_time' si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'reservations' 
      AND column_name = 'class_time'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN class_time TEXT NOT NULL DEFAULT '08:00';
  END IF;

  -- 2. Añadir columna 'discipline_id' si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'reservations' 
      AND column_name = 'discipline_id'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN discipline_id UUID REFERENCES public.disciplines(id) ON DELETE CASCADE;
  END IF;

  -- 3. Añadir columna 'class_schedule_id' si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'reservations' 
      AND column_name = 'class_schedule_id'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN class_schedule_id UUID REFERENCES public.class_schedules(id) ON DELETE SET NULL;
  END IF;

  -- 4. Añadir columna 'reservation_date' si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'reservations' 
      AND column_name = 'reservation_date'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN reservation_date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  -- 5. Añadir columna 'status' si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'reservations' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN status reservation_status NOT NULL DEFAULT 'CONFIRMED';
  END IF;
END $$;

-- Índices para optimizar las consultas de reservas por disciplina y fecha
CREATE INDEX IF NOT EXISTS idx_reservations_discipline_date 
  ON public.reservations(discipline_id, reservation_date);

CREATE INDEX IF NOT EXISTS idx_reservations_gym_date 
  ON public.reservations(gym_id, reservation_date);

CREATE INDEX IF NOT EXISTS idx_reservations_student_date 
  ON public.reservations(student_id, reservation_date);

-- Restricción única para evitar que un alumno reserve dos veces la misma clase/horario en la misma fecha
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unq_student_discipline_time_date'
  ) THEN
    ALTER TABLE public.reservations 
      ADD CONSTRAINT unq_student_discipline_time_date 
      UNIQUE (student_id, discipline_id, class_time, reservation_date);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Recargar la caché de PostgREST para que Supabase reconozca inmediatamente la columna class_time
NOTIFY pgrst, 'reload schema';
