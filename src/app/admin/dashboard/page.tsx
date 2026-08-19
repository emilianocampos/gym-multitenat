'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import {
  Users,
  DollarSign,
  AlertCircle,
  Calendar,
  Sparkles,
  UserPlus,
  ArrowUpRight,
  Palette,
  QrCode,
  Inbox,
  RefreshCw,
  Loader2,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Clock,
  ArrowRight,
  ShieldCheck,
  Activity,
  Dumbbell,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Student } from '@/types/database';
import { parseDisciplineMeta } from '@/lib/utils/discipline-meta';

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overdueStudentsList, setOverdueStudentsList] = useState<any[]>([]);

  // Statistics State
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalStudents: 0,
    inactiveStudents: 0,
    suspendedStudents: 0,
    monthlyIncome: 0,
    overdueCount: 0,
    todayReservations: 0,
  });

  const [recentActiveStudents, setRecentActiveStudents] = useState<any[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);

  // Fetch all dashboard data from Supabase
  const loadDashboardData = useCallback(async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // 1. Fetch Students
      const { data: dbStudents, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
      }

      // Fetch active disciplines for mapping
      const { data: dbDisciplines } = await supabase
        .from('disciplines')
        .select('*')
        .order('name');

      // Fetch all memberships with discipline info
      const { data: dbMemberships } = await supabase
        .from('memberships')
        .select('*, discipline:disciplines(id, name, price, description)')
        .order('created_at', { ascending: false });

      const allStudents: Student[] = dbStudents || [];
      const activeList = allStudents.filter((s) => s.status === 'ACTIVE');
      const inactiveList = allStudents.filter((s) => s.status === 'INACTIVE');
      const suspendedList = allStudents.filter((s) => s.status === 'SUSPENDED');

      const activeWithMemberships = activeList.map((std: any) => {
        const rawMems = dbMemberships?.filter((m: any) => m.student_id === std.id) || [];

        // Deduplicate memberships by discipline_id
        const uniqueMemsMap = new Map<string, any>();
        rawMems.forEach((m: any) => {
          if (!uniqueMemsMap.has(m.discipline_id)) {
            uniqueMemsMap.set(m.discipline_id, m);
          }
        });
        const deduplicatedRawMems = Array.from(uniqueMemsMap.values());

        const mappedMems = deduplicatedRawMems.map((mem: any) => {
          const rawDisc =
            dbDisciplines?.find((d: any) => d.id === mem.discipline_id) ||
            (Array.isArray(mem.discipline) ? mem.discipline[0] : mem.discipline);

          const meta = rawDisc ? parseDisciplineMeta(rawDisc) : null;
          const dName = rawDisc?.name || 'Disciplina';

          let planFreq: '2X' | '3X' | '6X' = '3X';
          if (meta) {
            const p = Number(mem.price);
            if (p === meta.price_2x) planFreq = '2X';
            else if (p === meta.price_6x || p === Number(rawDisc.price)) planFreq = '6X';
            else if (p === meta.price_3x) planFreq = '3X';
            else {
              const d2 = Math.abs(p - meta.price_2x);
              const d3 = Math.abs(p - meta.price_3x);
              const d6 = Math.abs(p - (meta.price_6x || Number(rawDisc.price)));
              if (d2 <= d3 && d2 <= d6) planFreq = '2X';
              else if (d6 <= d3 && d6 <= d2) planFreq = '6X';
              else planFreq = '3X';
            }
          }

          return {
            id: mem.id,
            discipline_id: mem.discipline_id,
            discipline_name: dName,
            price: Number(mem.price),
            expiration_date: mem.expiration_date,
            plan_frequency: planFreq,
            status: mem.status,
          };
        });

        return {
          ...std,
          memberships: mappedMems,
          membership: mappedMems[0] || null,
        };
      });

      setRecentActiveStudents(activeWithMemberships.slice(0, 6));

      // 2. Fetch Payments (for monthly income)
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      const { data: dbPayments } = await supabase
        .from('payments')
        .select('amount, status, paid_at, created_at');

      let monthlyTotal = 0;
      if (dbPayments && Array.isArray(dbPayments)) {
        monthlyTotal = dbPayments
          .filter((p) => {
            const date = new Date(p.paid_at || p.created_at);
            return p.status === 'PAID' && date >= currentMonthStart;
          })
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      }

      // 3. Calculate Overdue Students by expiration date & status
      const todayStr = new Date().toISOString().slice(0, 10);
      const overdueStudents: any[] = [];

      allStudents.forEach((std: any) => {
        const stdMems = dbMemberships?.filter((m: any) => m.student_id === std.id) || [];
        const expiredMem = stdMems.find(
          (m: any) => (m.expiration_date && m.expiration_date < todayStr) || m.status === 'OVERDUE'
        );
        if (expiredMem || std.status === 'SUSPENDED') {
          const disc = dbDisciplines?.find((d: any) => d.id === expiredMem?.discipline_id);
          overdueStudents.push({
            id: std.id,
            first_name: std.first_name,
            last_name: std.last_name,
            dni: std.dni,
            email: std.email,
            phone: std.phone,
            expiredDiscipline: disc?.name || 'Membresía',
            expiration_date: expiredMem?.expiration_date || 'Vencida',
          });
        }
      });

      setOverdueStudentsList(overdueStudents);

      // 4. Fetch Today Reservations
      const { data: dbReservations } = await supabase
        .from('reservations')
        .select('id, reservation_date, status')
        .eq('reservation_date', todayStr);

      const activeReservationsCount = dbReservations
        ? dbReservations.filter((r) => r.status === 'CONFIRMED' || r.status === 'ATTENDED').length
        : 0;

      // 5. Fetch Today's Classes & Schedules
      const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const { data: dbClasses } = await supabase
        .from('classes')
        .select(`
          id, name, max_capacity,
          discipline:disciplines(name),
          schedules:class_schedules(id, day_of_week, start_time, end_time)
        `);

      const classesToday: any[] = [];
      if (dbClasses && Array.isArray(dbClasses)) {
        dbClasses.forEach((cls) => {
          if (cls.schedules && Array.isArray(cls.schedules)) {
            const todayScheds = cls.schedules.filter((s: any) => s.day_of_week === currentDayOfWeek);
            const disciplineName = Array.isArray(cls.discipline)
              ? cls.discipline[0]?.name
              : (cls.discipline as any)?.name || 'Gimnasio';
            todayScheds.forEach((s: any) => {
              classesToday.push({
                id: cls.id,
                name: cls.name,
                discipline: disciplineName,
                startTime: s.start_time,
                endTime: s.end_time,
                maxCapacity: cls.max_capacity || 20,
              });
            });
          }
        });
      }
      setTodayClasses(classesToday);

      // Update State
      setStats({
        activeStudents: activeList.length,
        totalStudents: allStudents.length,
        inactiveStudents: inactiveList.length,
        suspendedStudents: suspendedList.length,
        monthlyIncome: monthlyTotal,
        overdueCount: overdueStudents.length,
        todayReservations: activeReservationsCount,
      });
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setErrorMessage('No se pudieron sincronizar todos los datos en tiempo real.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Calculate percentage of active students
  const activePercentage =
    stats.totalStudents > 0
      ? Math.round((stats.activeStudents / stats.totalStudents) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 md:ml-64 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">
                SaaS Management & Control
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En Vivo
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Panel Control del Gimnasio
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Resumen en tiempo real de alumnos activos, finanzas, cupos y reservas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={isRefreshing || isLoading}
              className="p-2.5 sm:p-3 rounded-xl bg-[#141418] text-zinc-400 hover:text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all disabled:opacity-50"
              title="Actualizar datos en tiempo real"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[var(--gym-primary)]' : ''}`} />
            </button>

            <Link
              href="/admin/rutinas/importar-excel"
              className="flex items-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-3.5 sm:px-4 py-2.5 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Importar Excel IA</span>
            </Link>

            <Link
              href="/admin/personalizacion"
              className="flex items-center space-x-2 rounded-xl bg-[#141418] border border-white/10 px-3.5 sm:px-4 py-2.5 text-xs font-bold text-white hover:border-[var(--gym-primary)] transition-all"
            >
              <Palette className="h-4 w-4 text-[var(--gym-primary)]" />
              <span>Personalizar UI</span>
            </Link>
          </div>
        </div>

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 text-xs font-bold text-amber-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => loadDashboardData(true)}
              className="text-amber-400 hover:underline font-extrabold"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* NOTIFICACIÓN DEL SISTEMA: ALUMNOS CON CUOTA VENCIDA */}
        {overdueStudentsList.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-950/70 via-[#18181C] to-amber-950/40 p-5 border-2 border-rose-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start space-x-3.5">
              <div className="h-11 w-11 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40 shadow-md">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">
                    Alerta del Sistema
                  </span>
                  <span className="text-xs font-extrabold text-rose-300">
                    {overdueStudentsList.length} {overdueStudentsList.length === 1 ? 'cuota vencida' : 'cuotas vencidas'}
                  </span>
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Alumnos con Cuotas Vencidas en el Gimnasio
                </h3>
                <p className="text-xs text-zinc-300">
                  {overdueStudentsList.slice(0, 4).map((s) => `${s.first_name} ${s.last_name} (${s.expiredDiscipline})`).join(', ')}
                  {overdueStudentsList.length > 4 ? ` y ${overdueStudentsList.length - 4} más` : ''} tienen el arancel mensual vencido.
                </p>
              </div>
            </div>

            <Link
              href="/admin/alumnos"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
            >
              <span>Gestionar Alumnos & Vencimientos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* STATS CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. ALUMNOS ACTIVOS (HIGHLIGHT PRINCIPAL) */}
          <div className="rounded-2xl bg-gradient-to-b from-[#18181C] to-[#141418] p-5 border-2 border-[var(--gym-primary)]/40 shadow-[0_0_20px_rgba(204,255,0,0.12)] space-y-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-16 w-16 bg-[var(--gym-primary)]/10 rounded-full blur-2xl group-hover:bg-[var(--gym-primary)]/20 transition-all" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)]">
                Alumnos Activos
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gym-primary)]/20 border border-[var(--gym-primary)]/30 text-[var(--gym-primary)]">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="h-9 w-20 bg-zinc-800 animate-pulse rounded-lg" />
              ) : (
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                    {stats.activeStudents}
                  </p>
                  <span className="text-xs font-extrabold text-zinc-400">
                    / {stats.totalStudents} total
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {stats.totalStudents > 0
                  ? `${activePercentage}% con membresía activa`
                  : 'Sin alumnos registrados'}
              </span>
              <Link
                href="/admin/alumnos"
                className="font-bold text-[var(--gym-primary)] hover:underline flex items-center gap-0.5"
              >
                Ver lista <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* 2. INGRESOS DEL MES */}
          <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Ingresos del Mes
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181C] border border-white/5 text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="h-9 w-28 bg-zinc-800 animate-pulse rounded-lg" />
              ) : (
                <p className="text-2xl lg:text-3xl font-black text-white">
                  ${stats.monthlyIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-zinc-500">
              <span>Pagos cobrados en el mes</span>
              <Link href="/admin/pagos" className="font-bold text-zinc-400 hover:text-white">
                Finanzas
              </Link>
            </div>
          </div>

          {/* 3. CUOTAS VENCIDAS */}
          <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Cuotas Vencidas
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181C] border border-white/5 text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="h-9 w-16 bg-zinc-800 animate-pulse rounded-lg" />
              ) : (
                <p className="text-2xl lg:text-3xl font-black text-white">
                  {stats.overdueCount}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-zinc-500">
              <span>{stats.overdueCount === 0 ? 'Sin cuotas adeudadas' : 'Requieren regularización'}</span>
              <Link href="/admin/alumnos" className="font-bold text-zinc-400 hover:text-white">
                Revisar
              </Link>
            </div>
          </div>

          {/* 4. RESERVAS HOY */}
          <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Reservas Hoy
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181C] border border-white/5 text-sky-400">
                <Calendar className="h-5 w-5" />
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="h-9 w-16 bg-zinc-800 animate-pulse rounded-lg" />
              ) : (
                <p className="text-2xl lg:text-3xl font-black text-white">
                  {stats.todayReservations}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-zinc-500">
              <span>Cupos ocupados hoy</span>
              <Link href="/admin/reservas" className="font-bold text-zinc-400 hover:text-white">
                Ver turnos
              </Link>
            </div>
          </div>
        </div>

        {/* MAIN DASHBOARD CONTENT (2 COLUMNS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: ACTIVE STUDENTS SUMMARY & TODAY CLASSES */}
          <div className="lg:col-span-8 space-y-6">
            {/* ALUMNOS ACTIVOS EN TIEMPO REAL CARD */}
            <div className="rounded-2xl bg-[#141418] p-6 border border-white/5 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-[var(--gym-primary)]" />
                    <h3 className="text-base font-black text-white">
                      Alumnos Activos del Gimnasio ({stats.activeStudents})
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Listado de socios con pase vigente y habilitados para entrenar y reservar clases.
                  </p>
                </div>

                <Link
                  href="/admin/alumnos"
                  className="text-xs font-extrabold text-[var(--gym-primary)] hover:underline flex items-center gap-1"
                >
                  <span>Ver todos ({stats.totalStudents})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {isLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-[var(--gym-primary)] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-zinc-400">Consultando alumnos activos...</p>
                </div>
              ) : recentActiveStudents.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Inbox className="h-10 w-10 text-zinc-600 mx-auto" />
                  <p className="text-sm font-extrabold text-white">No hay alumnos activos registrados</p>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Hacé clic en "Registrar Nuevo Alumno" para crear la primera ficha y habilitar su portal.
                  </p>
                  <Link
                    href="/admin/alumnos"
                    className="inline-flex items-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-4 py-2 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Crear Primer Alumno</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#18181C] text-zinc-400 font-extrabold uppercase tracking-wider rounded-xl">
                        <tr>
                          <th className="p-3 rounded-l-xl">Alumno</th>
                          <th className="p-3">DNI / Contacto</th>
                          <th className="p-3">Disciplinas Asignadas</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3 text-right rounded-r-xl">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 text-zinc-300 font-semibold">
                        {recentActiveStudents.map((std: any) => (
                          <tr key={std.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-[var(--gym-primary)] flex items-center justify-center font-black text-xs text-[var(--gym-primary)]">
                                  {std.first_name?.[0] || 'A'}
                                  {std.last_name?.[0] || ''}
                                </div>
                                <div>
                                  <p className="font-extrabold text-white">
                                    {std.first_name} {std.last_name}
                                  </p>
                                  <p className="text-[10px] text-zinc-400">{std.phone || 'Sin teléfono'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 space-y-0.5">
                              <p className="font-bold text-white">DNI: {std.dni}</p>
                              <p className="text-[11px] font-mono text-zinc-400">{std.email}</p>
                            </td>

                            {/* Disciplinas Asignadas */}
                            <td className="p-3">
                              {std.memberships && std.memberships.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1.5">
                                    {std.memberships.map((m: any, idx: number) => (
                                      <span
                                        key={m.id || idx}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--gym-primary)]/10 text-[var(--gym-primary)] border border-[var(--gym-primary)]/20 text-[11px] font-extrabold"
                                      >
                                        <Dumbbell className="h-3 w-3" />
                                        {m.discipline_name}
                                        <span className="text-[9px] text-zinc-300 font-bold bg-black/40 px-1 py-0.5 rounded ml-0.5">
                                          {m.plan_frequency || '3X'} (${(m.price || 0).toLocaleString('es-AR')})
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                  {std.memberships.length > 1 && (
                                    <span className="text-[10px] text-zinc-400 font-bold block">
                                      Total: ${std.memberships.reduce((acc: number, curr: any) => acc + (curr.price || 0), 0).toLocaleString('es-AR')} / mes
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500 font-semibold italic">Sin asignar</span>
                              )}
                            </td>

                            <td className="p-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Activo
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <Link
                                href="/admin/alumnos"
                                className="text-xs font-bold text-[var(--gym-primary)] hover:underline"
                              >
                                Ver Ficha
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {stats.totalStudents > recentActiveStudents.length && (
                    <div className="pt-2 text-center">
                      <Link
                        href="/admin/alumnos"
                        className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                      >
                        Mostrando {recentActiveStudents.length} de {stats.activeStudents} alumnos activos. Ver todos →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CLASSES & CUPOS TODAY SECTION */}
            <div className="rounded-2xl bg-[#141418] p-6 border border-white/5 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-white">Clases y Cupos de Hoy</h3>
                  <p className="text-xs text-zinc-400">Control automático de capacidad para evitar sobre-reserva.</p>
                </div>
                <Link href="/admin/reservas" className="text-xs font-bold text-[var(--gym-primary)] hover:underline">
                  Ver agenda completa
                </Link>
              </div>

              {todayClasses.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Inbox className="h-8 w-8 text-zinc-600 mx-auto" />
                  <p className="text-xs font-bold text-zinc-400">No hay clases programadas para el día de hoy.</p>
                  <Link
                    href="/admin/reservas"
                    className="inline-block text-xs font-extrabold text-[var(--gym-primary)] hover:underline mt-1"
                  >
                    Configurar grilla horaria →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayClasses.map((cls, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-[#18181C] p-4 border border-white/5 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="text-sm font-extrabold text-white">{cls.name}</span>
                        <p className="text-xs text-zinc-400">
                          {cls.discipline} • {cls.startTime} - {cls.endTime}
                        </p>
                      </div>
                      <span className="text-xs font-black text-[var(--gym-primary)] bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                        Cupo: {cls.maxCapacity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: DISTRIBUTION & QUICK ACCESS */}
          <div className="lg:col-span-4 space-y-6">
            {/* DISTRIBUTION STATS CARD */}
            <div className="rounded-2xl bg-[#141418] p-6 border border-white/5 space-y-4">
              <h3 className="text-base font-black text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--gym-primary)]" />
                <span>Estado del Padrón</span>
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Activos
                  </span>
                  <span className="font-black text-white">
                    {stats.activeStudents} ({stats.totalStudents > 0 ? activePercentage : 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
                    Inactivos
                  </span>
                  <span className="font-black text-white">{stats.inactiveStudents}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    Suspendidos / Vencidos
                  </span>
                  <span className="font-black text-white">{stats.suspendedStudents}</span>
                </div>

                {/* Progress bar visual */}
                <div className="h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                  <div
                    style={{ width: `${activePercentage}%` }}
                    className="h-full bg-[var(--gym-primary)] transition-all duration-500"
                    title={`Activos: ${stats.activeStudents}`}
                  />
                  <div
                    style={{
                      width: `${stats.totalStudents > 0 ? (stats.suspendedStudents / stats.totalStudents) * 100 : 0}%`,
                    }}
                    className="h-full bg-rose-500 transition-all duration-500"
                    title={`Suspendidos: ${stats.suspendedStudents}`}
                  />
                </div>
              </div>
            </div>

            {/* DEDICATED GYM STUDENT PORTAL CARD */}
            <div className="rounded-2xl bg-[#141418] p-6 border border-white/5 space-y-4">
              <h3 className="text-base font-black text-white border-b border-zinc-800 pb-3">
                Accesos Rápidos
              </h3>

              <div className="rounded-xl bg-gradient-to-b from-[#18181C] to-[#141418] p-4 border border-[var(--gym-primary)]/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--gym-primary)]">
                    Portal de Alumnos de tu Gym
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[var(--gym-primary)] animate-pulse" />
                </div>
                <p className="text-xs text-zinc-300 font-semibold">
                  Tus alumnos ingresan a ver su rutina y reservar clases desde su propio portal:
                </p>
                <div className="rounded-lg bg-[#0B0B0E] p-2.5 text-[11px] font-mono text-zinc-400 truncate border border-white/5">
                  .../irongym/portal-alumno
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/irongym/portal-alumno`;
                      navigator.clipboard.writeText(url);
                      alert('¡URL del Portal de Alumnos copiada al portapapeles!');
                    }}
                    className="flex-1 rounded-lg bg-[#18181C] py-2 text-[11px] font-extrabold text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
                  >
                    Copiar URL
                  </button>
                  <Link
                    href="/irongym/portal-alumno"
                    target="_blank"
                    className="flex-1 rounded-lg bg-[var(--gym-primary)] py-2 text-[11px] font-black uppercase text-black text-center shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
                  >
                    Abrir Portal
                  </Link>
                </div>
              </div>

              <Link
                href="/admin/alumnos"
                className="flex items-center justify-between rounded-xl bg-[#18181C] p-3 text-xs font-bold text-white hover:bg-[var(--gym-primary)] hover:text-black transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <UserPlus className="h-4 w-4" />
                  <span>Registrar Nuevo Alumno</span>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              <Link
                href="/admin/qr"
                className="flex items-center justify-between rounded-xl bg-[#18181C] p-3 text-xs font-bold text-white hover:bg-[var(--gym-primary)] hover:text-black transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <QrCode className="h-4 w-4" />
                  <span>Generar QR de Rutinas</span>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              <Link
                href="/admin/rutinas/importar-excel"
                className="flex items-center justify-between rounded-xl bg-[#18181C] p-3 text-xs font-bold text-white hover:bg-[var(--gym-primary)] hover:text-black transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="h-4 w-4 text-[var(--gym-primary)] group-hover:text-black" />
                  <span>Importar Rutina Excel IA</span>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
