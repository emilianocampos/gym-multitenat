'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseDisciplineMeta } from '@/lib/utils/discipline-meta';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import {
  Calendar,
  PlusCircle,
  Inbox,
  Clock,
  Users,
  UserCheck,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  Filter,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Phone,
  Mail,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface ReservedStudent {
  reservationId: string;
  studentId: string;
  name: string;
  dni: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface ScheduleItem {
  id: string;
  disciplineId: string;
  className: string;
  discipline: string;
  coach: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  occupied: number;
  reservedStudents: ReservedStudent[];
}

// Helpers for real-time dates
const getRealTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayFormatted = (dateStr?: string) => {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${dayNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
};

export default function AdminReservationsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getRealTodayISO);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attendeesModalClass, setAttendeesModalClass] = useState<ScheduleItem | null>(null);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentToEnroll, setStudentToEnroll] = useState<string>('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    className: '',
    discipline: '',
    coach: '',
    dayOfWeek: 'Lunes a Viernes',
    startTime: '08:00',
    endTime: '09:00',
    maxCapacity: 24,
  });

  const loadRealDisciplinesAndReservations = async (targetDate: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch disciplines
      const { data: dbDisciplines } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // 2. Fetch live confirmed reservations from database for targetDate
      const { data: dbReservations } = await supabase
        .from('reservations')
        .select('*, student:students(id, first_name, last_name, dni, email, phone)')
        .eq('reservation_date', targetDate)
        .eq('status', 'CONFIRMED');

      // 3. Fetch active students for manual enrollment
      const { data: dbStudents } = await supabase
        .from('students')
        .select('id, first_name, last_name, dni, email, phone, status')
        .order('first_name');

      if (dbStudents) {
        setStudentsList(dbStudents);
      }

      if (dbDisciplines && dbDisciplines.length > 0 && dbDisciplines[0]) {
        setDisciplinesList(dbDisciplines);
        const firstMeta = parseDisciplineMeta(dbDisciplines[0]);
        setFormData((prev) => ({
          ...prev,
          discipline: dbDisciplines[0]?.name || '',
          coach: firstMeta.coach_name || 'Profesor Asignado',
        }));

        const generated: ScheduleItem[] = [];
        dbDisciplines.forEach((d: any) => {
          const meta = parseDisciplineMeta(d);
          const times = meta.selectedSchedules;

          times.forEach((tStr: string) => {
            const hh = Number(tStr.split(':')[0] || '8');
            const mm = Number(tStr.split(':')[1] || '0');
            const dur = d.duration_minutes || 60;
            const endH = String(hh + Math.floor(dur / 60)).padStart(2, '0');
            const endM = String((mm + (dur % 60)) % 60).padStart(2, '0');

            // Matching reservations in DB
            const matchingReservations = (dbReservations || []).filter(
              (r: any) =>
                (r.discipline_id === d.id || r.class_schedule_id === d.id) &&
                (r.class_time === tStr || r.class_time?.startsWith(tStr))
            );

            const reservedList: ReservedStudent[] = matchingReservations.map((r: any) => ({
              reservationId: r.id,
              studentId: r.student_id,
              name: r.student
                ? `${r.student.first_name} ${r.student.last_name}`
                : 'Alumno Registrado',
              dni: r.student?.dni || '-',
              email: r.student?.email || '-',
              phone: r.student?.phone || '-',
              createdAt: r.created_at,
            }));

            generated.push({
              id: `${d.id}-${tStr}`,
              disciplineId: d.id,
              className: `${d.name} (${tStr} hs)`,
              discipline: d.name,
              coach: meta.coach_name || 'Profesor Asignado',
              dayOfWeek: 'Lunes a Viernes',
              startTime: tStr,
              endTime: `${endH}:${endM}`,
              maxCapacity: d.max_capacity || 24,
              occupied: matchingReservations.length,
              reservedStudents: reservedList,
            });
          });
        });

        setSchedules(generated);
      } else {
        setDisciplinesList([]);
        setSchedules([]);
      }
    } catch (err) {
      console.error('Error fetching disciplines & reservations in admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRealDisciplinesAndReservations(selectedDate);
  }, [selectedDate]);

  // Admin Cancel Student Reservation
  const handleAdminCancelReservation = async (reservationId: string) => {
    if (!confirm('¿Deseas cancelar la reserva de este alumno en la base de datos?')) return;
    try {
      const supabase = createClient();
      await supabase.from('reservations').delete().eq('id', reservationId);
      await loadRealDisciplinesAndReservations(selectedDate);

      if (attendeesModalClass) {
        setAttendeesModalClass((prev) => {
          if (!prev) return null;
          const updatedList = prev.reservedStudents.filter((s) => s.reservationId !== reservationId);
          return {
            ...prev,
            occupied: updatedList.length,
            reservedStudents: updatedList,
          };
        });
      }
    } catch (e) {
      console.error('Error canceling reservation as admin:', e);
    }
  };

  // Helper to get active valid UUID gym_id
  const getActiveGymId = async (supabase: any): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.gym_id) return profile.gym_id;
      }

      // Query real gym from gyms table
      const { data: gym } = await supabase.from('gyms').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (gym?.id) return gym.id;

      // Query gym_id from disciplines
      const { data: anyDisc } = await supabase.from('disciplines').select('gym_id').limit(1).maybeSingle();
      if (anyDisc?.gym_id) return anyDisc.gym_id;

      // Query gym_id from students
      const { data: anyStudent } = await supabase.from('students').select('gym_id').limit(1).maybeSingle();
      if (anyStudent?.gym_id) return anyStudent.gym_id;

      // Create a gym row if none exist
      const { data: newGym } = await supabase
        .from('gyms')
        .insert([{ name: 'Iron Gym Center', slug: 'irongym', email: 'admin@irongym.com' }])
        .select('id')
        .single();
      if (newGym?.id) return newGym.id;
    } catch (e) {
      console.error('Error resolving active gym ID:', e);
    }
    return '';
  };

  // Admin Add Student Reservation Manually
  const handleAdminAddReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeesModalClass || !studentToEnroll) return;
    setIsEnrolling(true);
    setEnrollError(null);

    try {
      const supabase = createClient();
      
      // Resolve real gym_id from the discipline or student
      const matchedDisc = disciplinesList.find((d: any) => d.id === attendeesModalClass.disciplineId);
      const matchedStudent = studentsList.find((s: any) => s.id === studentToEnroll);
      let gymId = matchedDisc?.gym_id || matchedStudent?.gym_id;
      
      if (!gymId) {
        gymId = await getActiveGymId(supabase);
      }

      // Check if already reserved
      const { data: existing } = await supabase
        .from('reservations')
        .select('id')
        .eq('student_id', studentToEnroll)
        .eq('discipline_id', attendeesModalClass.disciplineId)
        .eq('class_time', attendeesModalClass.startTime)
        .eq('reservation_date', selectedDate)
        .eq('status', 'CONFIRMED');

      if (existing && existing.length > 0) {
        setEnrollError('Este alumno ya está anotado en este turno para esta fecha.');
        setIsEnrolling(false);
        return;
      }

      const { data: inserted, error: insertErr } = await supabase.from('reservations').insert([
        {
          gym_id: gymId,
          student_id: studentToEnroll,
          discipline_id: attendeesModalClass.disciplineId,
          class_time: attendeesModalClass.startTime,
          reservation_date: selectedDate,
          status: 'CONFIRMED',
        },
      ]).select('*, student:students(id, first_name, last_name, dni, email, phone)').single();

      if (insertErr) {
        throw insertErr;
      }

      if (inserted) {
        const studentObj = studentsList.find((s) => s.id === studentToEnroll);
        const newAttendee: ReservedStudent = {
          reservationId: inserted.id,
          studentId: studentToEnroll,
          name: studentObj ? `${studentObj.first_name} ${studentObj.last_name}` : 'Alumno Registrado',
          dni: studentObj?.dni || '-',
          email: studentObj?.email || '-',
          phone: studentObj?.phone || '-',
          createdAt: inserted.created_at || new Date().toISOString(),
        };

        setAttendeesModalClass((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            occupied: prev.occupied + 1,
            reservedStudents: [newAttendee, ...prev.reservedStudents],
          };
        });
      }

      await loadRealDisciplinesAndReservations(selectedDate);
      setStudentToEnroll('');
    } catch (err: any) {
      console.error('Error adding reservation as admin:', err);
      setEnrollError(`Error al reservar: ${err.message}`);
    } finally {
      setIsEnrolling(false);
    }
  };

  // Distinct schedule times
  const availableTimes = Array.from(new Set(schedules.map((s) => s.startTime))).sort();

  const filteredSchedules = schedules.filter((s) => {
    const matchesTime = selectedTimeSlot === 'ALL' || s.startTime === selectedTimeSlot;
    const matchesDay = selectedDay === 'ALL' || s.dayOfWeek.includes(selectedDay);
    const matchesSearch =
      s.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.discipline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.coach.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTime && matchesDay && matchesSearch;
  });

  const totalReservationsToday = schedules.reduce((acc, s) => acc + s.occupied, 0);
  const totalCapacityToday = schedules.reduce((acc, s) => acc + s.maxCapacity, 0);

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 md:ml-64 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--gym-primary)] animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">
                Control de Cupos y Reservas en Vivo (BD)
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Reservas y Asistencia de Clases
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Visualizá en tiempo real los alumnos anotados desde el portal para hoy o cualquier fecha.
            </p>
          </div>

          <button
            onClick={() => loadRealDisciplinesAndReservations(selectedDate)}
            className="flex items-center space-x-2 rounded-xl bg-[#18181C] px-4 py-3 text-xs font-bold text-zinc-300 border border-white/10 hover:text-white transition-all self-start sm:self-auto"
            title="Refrescar datos desde la Base de Datos"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Global Live Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 space-y-1 shadow-card">
            <span className="text-xs font-bold text-zinc-400 uppercase">Alumnos Anotados para la Fecha</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-[var(--gym-primary)]">{totalReservationsToday}</span>
              <span className="text-xs text-zinc-500 font-bold">reservas confirmadas en BD</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 space-y-1 shadow-card">
            <span className="text-xs font-bold text-zinc-400 uppercase">Total de Turnos / Clases</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-white">{schedules.length}</span>
              <span className="text-xs text-zinc-500 font-bold">horarios habilitados</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 space-y-1 shadow-card">
            <span className="text-xs font-bold text-zinc-400 uppercase">Ocupación General del Día</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-emerald-400">
                {totalCapacityToday > 0
                  ? `${Math.round((totalReservationsToday / totalCapacityToday) * 100)}%`
                  : '0%'}
              </span>
              <span className="text-xs text-zinc-500 font-bold">({totalReservationsToday}/{totalCapacityToday} plazas)</span>
            </div>
          </div>
        </div>

        {/* DATE SELECTOR & HORARIOS BAR */}
        <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 space-y-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const curr = new Date(`${selectedDate}T12:00:00`);
                  curr.setDate(curr.getDate() - 1);
                  setSelectedDate(curr.toISOString().slice(0, 10));
                }}
                className="p-2 rounded-xl bg-[#18181C] text-zinc-400 hover:text-white border border-white/5"
                title="Día anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-3 py-1.5 rounded-xl bg-[#18181C] border border-white/10 flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-[var(--gym-primary)]" />
                <span className="text-xs font-black uppercase text-white">
                  {getTodayFormatted(selectedDate)}
                </span>
              </div>

              <button
                onClick={() => {
                  const curr = new Date(`${selectedDate}T12:00:00`);
                  curr.setDate(curr.getDate() + 1);
                  setSelectedDate(curr.toISOString().slice(0, 10));
                }}
                className="p-2 rounded-xl bg-[#18181C] text-zinc-400 hover:text-white border border-white/5"
                title="Día siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedDate(getRealTodayISO())}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  selectedDate === getRealTodayISO()
                    ? 'bg-[var(--gym-primary)] text-black shadow-neon'
                    : 'bg-[#18181C] text-zinc-300 border border-white/5 hover:text-white'
                }`}
              >
                Hoy Real ({getRealTodayISO()})
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 rounded-xl bg-[#18181C] px-3 py-2 border border-white/10 w-full sm:w-80">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar clase o profesor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Selector de Horarios Chips */}
          <div className="pt-3 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[var(--gym-primary)]" />
                <span>Selector de Horarios de Clases</span>
              </span>

              {selectedTimeSlot !== 'ALL' && (
                <button
                  onClick={() => setSelectedTimeSlot('ALL')}
                  className="text-[10px] font-bold text-[var(--gym-primary)] hover:underline"
                >
                  Ver todos ({schedules.length})
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedTimeSlot('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                  selectedTimeSlot === 'ALL'
                    ? 'bg-[var(--gym-primary)] text-black shadow-neon'
                    : 'bg-[#18181C] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                Todos ({schedules.length})
              </button>

              {availableTimes.map((time) => {
                const count = schedules.filter((s) => s.startTime === time).length;
                const isSelected = selectedTimeSlot === time;
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTimeSlot(time)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[var(--gym-primary)] text-black shadow-neon font-black'
                        : 'bg-[#18181C] text-zinc-300 hover:text-white border border-white/5'
                    }`}
                  >
                    <Clock className={`h-3 w-3 ${isSelected ? 'text-black' : 'text-[var(--gym-primary)]'}`} />
                    <span>{time} hs</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                        isSelected ? 'bg-black/20 text-black' : 'bg-white/5 text-zinc-400'
                      }`}
                    >
                      {count} {count === 1 ? 'turno' : 'turnos'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Schedules Table */}
        <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 shadow-card">
          {filteredSchedules.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-extrabold text-white">No se encontraron horarios</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No hay turnos configurados que coincidan con el filtro seleccionado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-[#18181C] text-zinc-400 font-extrabold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-4">Horario</th>
                    <th className="p-4">Clase / Disciplina</th>
                    <th className="p-4">Profesor</th>
                    <th className="p-4">Ocupación en Vivo (BD)</th>
                    <th className="p-4">Alumnos Anotados</th>
                    <th className="p-4 text-right">Ver Lista</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300 font-semibold">
                  {filteredSchedules.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-black text-sm text-[var(--gym-primary)]">
                          {s.startTime} - {s.endTime} hs
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-extrabold text-white">{s.className}</p>
                        <span className="text-[11px] text-zinc-400">{s.discipline}</span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-zinc-300">
                          <UserCheck className="h-3.5 w-3.5 text-[var(--gym-primary)]" />
                          {s.coach}
                        </span>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                          <span className="text-white font-extrabold">{s.occupied} / {s.maxCapacity} alumnos</span>
                          <span className="text-[var(--gym-primary)] font-mono">
                            {Math.max(0, s.maxCapacity - s.occupied)} libres
                          </span>
                        </div>
                        <div className="h-2 w-36 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              s.occupied >= s.maxCapacity
                                ? 'bg-rose-500'
                                : s.occupied >= s.maxCapacity * 0.8
                                ? 'bg-amber-500'
                                : 'bg-[var(--gym-primary)]'
                            }`}
                            style={{ width: `${Math.min(100, (s.occupied / s.maxCapacity) * 100)}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-4">
                        {s.reservedStudents && s.reservedStudents.length > 0 ? (
                          <div className="flex items-center -space-x-1.5">
                            {s.reservedStudents.slice(0, 3).map((st, idx) => (
                              <span
                                key={idx}
                                className="h-6 w-6 rounded-full bg-zinc-800 border border-[var(--gym-primary)] text-[10px] font-bold flex items-center justify-center text-[var(--gym-primary)]"
                                title={st.name}
                              >
                                {st.name[0]}
                              </span>
                            ))}
                            {s.reservedStudents.length > 3 && (
                              <span className="text-[10px] text-zinc-400 font-bold">
                                +{s.reservedStudents.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">Sin reservas</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setAttendeesModalClass(s)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#18181C] text-xs font-bold text-zinc-300 hover:text-[var(--gym-primary)] hover:bg-white/5 border border-white/5 transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver ({s.occupied})</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ATTENDEES LIVE LIST MODAL */}
        {attendeesModalClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-[#141418] border border-white/10 p-4 sm:p-6 space-y-5 shadow-2xl my-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--gym-primary)]">
                    {getTodayFormatted(selectedDate)}
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {attendeesModalClass.className}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Profesor: {attendeesModalClass.coach} • {attendeesModalClass.startTime} hs
                  </p>
                </div>
                <button
                  onClick={() => setAttendeesModalClass(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {enrollError && (
                <div className="rounded-2xl bg-rose-500/10 p-3 border border-rose-500/20 text-xs font-semibold text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{enrollError}</span>
                </div>
              )}

              {/* Form to manually enroll student */}
              <form onSubmit={handleAdminAddReservation} className="rounded-2xl bg-[#18181C] p-3.5 border border-white/5 space-y-2.5">
                <label className="text-[11px] font-extrabold uppercase text-[var(--gym-primary)] block">
                  + Anotar Alumno Manualmente a esta Clase
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={studentToEnroll}
                    onChange={(e) => setStudentToEnroll(e.target.value)}
                    className="w-full flex-1 rounded-xl bg-[#141418] p-2.5 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                  >
                    <option value="">Seleccionar alumno...</option>
                    {studentsList.map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.first_name} {std.last_name} (DNI: {std.dni})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!studentToEnroll || isEnrolling}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[var(--gym-primary)] text-xs font-black uppercase text-black hover:bg-[var(--gym-primary-hover)] transition-all disabled:opacity-40 shrink-0"
                  >
                    {isEnrolling ? 'Anotando...' : 'Anotar Alumno'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                    Alumnos Anotados ({attendeesModalClass.reservedStudents.length} / {attendeesModalClass.maxCapacity})
                  </span>
                </div>

                {attendeesModalClass.reservedStudents.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {attendeesModalClass.reservedStudents.map((std, idx) => (
                      <div
                        key={std.reservationId || idx}
                        className="flex items-center justify-between rounded-2xl bg-[#18181C] p-3.5 border border-white/5 text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-[var(--gym-primary)] flex items-center justify-center font-bold text-xs text-[var(--gym-primary)]">
                            {std.name[0]}
                          </div>
                          <div>
                            <p className="font-extrabold text-white text-xs">{std.name}</p>
                            <p className="text-[10px] text-zinc-400">DNI: {std.dni} | {std.phone}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Confirmado
                          </span>
                          <button
                            onClick={() => handleAdminCancelReservation(std.reservationId)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Eliminar reserva"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-[#18181C] rounded-2xl border border-dashed border-zinc-800">
                    <p className="text-xs text-zinc-500 italic">
                      No hay alumnos anotados para este turno en esta fecha.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setAttendeesModalClass(null)}
                  className="rounded-xl bg-[#18181C] px-5 py-2.5 text-xs font-bold text-zinc-300 hover:text-white border border-white/5"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
