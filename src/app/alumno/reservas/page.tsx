'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { parseDisciplineMeta } from '@/lib/utils/discipline-meta';
import { StudentBottomNav } from '@/components/layout/StudentBottomNav';
import {
  ArrowLeft,
  Inbox,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  X,
  User,
  Filter,
} from 'lucide-react';

interface ClassItem {
  id: string;
  discipline: string;
  coach: string;
  startTime: string;
  endTime: string;
  occupied: number;
  maxCapacity: number;
  duration: string;
}

// Helpers for real-time dates
const getRealTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StudentReservationsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getRealTodayISO);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING'>('ALL');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [reservedIds, setReservedIds] = useState<string[]>([]);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRealDisciplinesAndClasses = async (targetDate: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let studentRec: any = null;
      if (user?.email) {
        const { data: std } = await supabase
          .from('students')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        if (std) studentRec = std;
      }

      if (!studentRec) {
        const { data: latest } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        if (latest && latest.length > 0) studentRec = latest[0];
      }

      if (studentRec) setCurrentStudent(studentRec);

      const { data: dbDisciplines } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      const { data: dbReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('reservation_date', targetDate)
        .eq('status', 'CONFIRMED');

      if (dbDisciplines && dbDisciplines.length > 0) {
        setDisciplinesList(dbDisciplines);

        const generated: ClassItem[] = [];
        dbDisciplines.forEach((d: any) => {
          const meta = parseDisciplineMeta(d);
          const times = meta.selectedSchedules;

          times.forEach((tStr: string) => {
            const hh = Number(tStr.split(':')[0] || '8');
            const mm = Number(tStr.split(':')[1] || '0');
            const dur = d.duration_minutes || 60;
            const endH = String(hh + Math.floor(dur / 60)).padStart(2, '0');
            const endM = String((mm + (dur % 60)) % 60).padStart(2, '0');

            const matching = (dbReservations || []).filter(
              (r: any) =>
                (r.discipline_id === d.id || r.class_schedule_id === d.id) &&
                (r.class_time === tStr || r.class_time?.startsWith(tStr))
            );

            generated.push({
              id: `${d.id}-${tStr}`,
              discipline: d.name,
              coach: meta.coach_name || 'Profesor Asignado',
              startTime: tStr,
              endTime: `${endH}:${endM}`,
              duration: `${dur} min`,
              occupied: matching.length,
              maxCapacity: d.max_capacity || 24,
            });
          });
        });

        setClassesList(generated);

        if (studentRec) {
          const userMems = (dbReservations || [])
            .filter((r: any) => r.student_id === studentRec.id)
            .map((r: any) => `${r.discipline_id}-${r.class_time}`);
          setReservedIds(userMems);
        }
      } else {
        setDisciplinesList([]);
        setClassesList([]);
      }
    } catch (err) {
      console.error('Error fetching disciplines in alumno reservas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRealDisciplinesAndClasses(selectedDate);
  }, [selectedDate]);

  // Distinct schedule times
  const availableTimes = Array.from(new Set(classesList.map((c) => c.startTime))).sort();

  // Filtered classes
  const filteredClasses = classesList.filter((c) => {
    const matchesTime = selectedTimeSlot === 'ALL' || c.startTime === selectedTimeSlot;
    const matchesDiscipline = selectedDiscipline === 'ALL' || c.discipline === selectedDiscipline;

    const hour = parseInt((c.startTime || '00:00').split(':')[0] || '0', 10);
    const matchesShift =
      selectedShift === 'ALL' ||
      (selectedShift === 'MORNING' && hour < 12) ||
      (selectedShift === 'AFTERNOON' && hour >= 12 && hour < 18) ||
      (selectedShift === 'EVENING' && hour >= 18);

    return matchesTime && matchesDiscipline && matchesShift;
  });

  const handleToggleReservation = async (cls: ClassItem) => {
    if (!currentStudent?.id) {
      alert('Debes iniciar sesión con tu cuenta de alumno para reservar.');
      return;
    }

    const isReserved = reservedIds.includes(cls.id);
    const discId = cls.id.split('-')[0];
    const supabase = createClient();

    try {
      if (isReserved) {
        await supabase
          .from('reservations')
          .delete()
          .eq('student_id', currentStudent.id)
          .eq('discipline_id', discId)
          .eq('class_time', cls.startTime)
          .eq('reservation_date', selectedDate);

        setSuccessToast(`Reserva cancelada para ${cls.discipline} (${cls.startTime} hs).`);
      } else {
        if (cls.occupied >= cls.maxCapacity) {
          alert('Este turno ya se encuentra completo.');
          return;
        }

        const selectedDisc = disciplinesList.find((d: any) => d.id === discId);
        let gymId = currentStudent.gym_id || selectedDisc?.gym_id;
        if (!gymId) {
          const { data: gym } = await supabase.from('gyms').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
          gymId = gym?.id;
        }

        await supabase.from('reservations').insert([
          {
            gym_id: gymId,
            student_id: currentStudent.id,
            discipline_id: discId,
            class_time: cls.startTime,
            reservation_date: selectedDate,
            status: 'CONFIRMED',
          },
        ]);

        setSuccessToast(`¡Lugar reservado con éxito para ${cls.discipline} (${cls.startTime} hs)!`);
      }

      await loadRealDisciplinesAndClasses(selectedDate);
    } catch (e: any) {
      console.error('Error toggling reservation:', e);
    }

    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--gym-bg)] pb-28 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0B0B0E]/90 px-4 py-3 backdrop-blur-md border-b border-white/5">
        <Link
          href="/alumno/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181C] text-zinc-300 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <span className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)]">
            Agenda & Cupos
          </span>
          <h1 className="text-sm font-extrabold text-white">Horarios de Clases</h1>
        </div>
        <div className="w-9" />
      </header>

      {/* Toast */}
      {successToast && (
        <div className="fixed top-14 left-4 right-4 z-50 rounded-2xl bg-emerald-500 text-black px-4 py-3 font-black text-xs shadow-2xl flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      <main className="mx-auto max-w-md px-4 space-y-5 pt-4">
        {/* SELECTOR DE HORARIOS CARD */}
        <div className="rounded-3xl bg-[#141418] p-4 border border-white/5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--gym-primary)]" />
              <span>Selector de Horarios</span>
            </span>

            {selectedTimeSlot !== 'ALL' && (
              <button
                onClick={() => setSelectedTimeSlot('ALL')}
                className="text-[10px] font-bold text-[var(--gym-primary)] hover:underline"
              >
                Ver todos ({classesList.length})
              </button>
            )}
          </div>

          {/* Time Slot Horizontal Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedTimeSlot('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                selectedTimeSlot === 'ALL'
                  ? 'bg-[var(--gym-primary)] text-black shadow-neon'
                  : 'bg-[#18181C] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              Todos ({classesList.length})
            </button>

            {availableTimes.map((time) => {
              const isSelected = selectedTimeSlot === time;
              const count = classesList.filter((c) => c.startTime === time).length;
              return (
                <button
                  key={time}
                  onClick={() => setSelectedTimeSlot(time)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Filters: Turno & Disciplina */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as any)}
              className="w-full rounded-xl bg-[#18181C] px-3 py-2 text-xs font-bold text-white border border-white/10 outline-none"
            >
              <option value="ALL">Todos los turnos</option>
              <option value="MORNING">Mañana (&lt; 12:00)</option>
              <option value="AFTERNOON">Tarde (12:00 - 18:00)</option>
              <option value="EVENING">Noche (&gt; 18:00)</option>
            </select>

            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="w-full rounded-xl bg-[#18181C] px-3 py-2 text-xs font-bold text-white border border-white/10 outline-none"
            >
              <option value="ALL">Todas disciplinas ({disciplinesList.length})</option>
              {disciplinesList.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Classes List */}
        {filteredClasses.length === 0 ? (
          <div className="rounded-3xl bg-[#141418] p-8 border border-white/5 shadow-card text-center space-y-3">
            <Inbox className="h-10 w-10 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-extrabold text-white">No hay clases en este horario</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Probá seleccionando "Todos los horarios" en el selector superior.
            </p>
            <button
              onClick={() => {
                setSelectedTimeSlot('ALL');
                setSelectedShift('ALL');
                setSelectedDiscipline('ALL');
              }}
              className="text-xs font-extrabold text-[var(--gym-primary)] hover:underline"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClasses.map((cls) => {
              const isReserved = reservedIds.includes(cls.id);
              const freeSpots = cls.maxCapacity - cls.occupied;

              return (
                <div
                  key={cls.id}
                  className="rounded-3xl bg-[#141418] p-5 border border-white/5 hover:border-[var(--gym-primary)]/30 transition-all space-y-4 shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-[var(--gym-primary)] font-black text-xs border border-[var(--gym-primary)]/40">
                        <Clock className="h-4 w-4" />
                      </span>
                      <span className="text-base font-black text-white">{cls.startTime} hs</span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        freeSpots > 5
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : freeSpots > 0
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {freeSpots > 0 ? `${freeSpots} plazas libres` : 'Completo'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white">{cls.discipline}</h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 font-semibold mt-0.5">
                      <User className="h-3.5 w-3.5 text-zinc-500" /> {cls.coach} • {cls.duration}
                    </p>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                      <span>Cupo: {cls.occupied} / {cls.maxCapacity}</span>
                      <span>{Math.round((cls.occupied / cls.maxCapacity) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-[var(--gym-primary)] transition-all duration-300"
                        style={{ width: `${(cls.occupied / cls.maxCapacity) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Reservation Action Button */}
                  <button
                    onClick={() => handleToggleReservation(cls)}
                    disabled={!isReserved && freeSpots <= 0}
                    className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                      isReserved
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white'
                        : freeSpots <= 0
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-[var(--gym-primary)] text-black shadow-neon hover:bg-[var(--gym-primary-hover)] active:scale-98'
                    }`}
                  >
                    {isReserved ? (
                      <>
                        <X className="h-4 w-4" />
                        <span>Cancelar Mi Reserva</span>
                      </>
                    ) : freeSpots <= 0 ? (
                      <span>Clase Completa</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Reservar Mi Lugar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <StudentBottomNav />
    </div>
  );
}
