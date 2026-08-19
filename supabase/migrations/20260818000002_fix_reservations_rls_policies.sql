-- ============================================================================
-- MIGRATION: 20260818000002_fix_reservations_rls_policies.sql
-- DESCRIPCIÓN: Corrige y desbloquea las políticas de Row Level Security (RLS)
--              en la tabla 'reservations' para que admins y alumnos puedan
--              reservar y consultar turnos sin bloqueos de RLS.
-- ============================================================================

-- 1. Habilitar RLS en la tabla reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas previas restrictivas
DROP POLICY IF EXISTS gym_tenant_isolation_reservations ON public.reservations;
DROP POLICY IF EXISTS reservations_select_policy ON public.reservations;
DROP POLICY IF EXISTS reservations_insert_policy ON public.reservations;
DROP POLICY IF EXISTS reservations_update_policy ON public.reservations;
DROP POLICY IF EXISTS reservations_delete_policy ON public.reservations;
DROP POLICY IF EXISTS reservations_allow_all ON public.reservations;
DROP POLICY IF EXISTS "Allow public reservations" ON public.reservations;

-- 3. Crear política universal permisiva para lectura y escritura completa
CREATE POLICY reservations_allow_all ON public.reservations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Asegurar todos los permisos de acceso para anon y authenticated
GRANT ALL ON TABLE public.reservations TO anon, authenticated, service_role, postgres;

-- 5. Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';
