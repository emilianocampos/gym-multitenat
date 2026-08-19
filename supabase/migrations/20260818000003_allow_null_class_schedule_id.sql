-- ============================================================================
-- MIGRATION: 20260818000003_allow_null_class_schedule_id.sql
-- DESCRIPCIÓN: Permite que 'class_schedule_id' sea NULL en la tabla 'reservations'
--              para soportar reservas basadas en disciplinas y horarios dinámicos.
-- ============================================================================

-- 1. Eliminar la restricción NOT NULL de la columna 'class_schedule_id'
DO $$ 
BEGIN
  ALTER TABLE public.reservations ALTER COLUMN class_schedule_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Asegurar que 'discipline_id' exista y tenga valor por defecto si es necesario
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'reservations' 
      AND column_name = 'discipline_id'
  ) THEN
    ALTER TABLE public.reservations ADD COLUMN discipline_id UUID REFERENCES public.disciplines(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';
