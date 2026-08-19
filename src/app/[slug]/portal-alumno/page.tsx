'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { parseDisciplineMeta } from '@/lib/utils/discipline-meta';
import {
  Dumbbell,
  Calendar as CalendarIcon,
  CreditCard,
  ShoppingBag,
  User,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Lock,
  Mail,
  Search,
  Check,
  X,
  Users,
  Info,
  CalendarDays,
  ListFilter,
  CheckSquare,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  Zap,
  Loader2,
} from 'lucide-react';

interface GymPortalProps {
  params: {
    slug: string;
  };
}

interface ClassItem {
  id: string;
  disciplineId: string;
  disciplineName: string;
  startTime: string;
  endTime: string;
  duration: string;
  coachName: string;
  coachInitials: string;
  occupied: number;
  maxCapacity: number;
  dateStr: string;
  fullDateLabel: string;
  program: string;
  reservedStudents: { name: string; initials: string; studentId?: string }[];
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
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${dayNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
};

const getTodayShortLabel = (dateStr?: string) => {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  return `${dayNames[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function StudentGymPortalPage({ params }: GymPortalProps) {
  const { slug } = params;
  const [gym, setGym] = useState<any>({
    name: slug ? slug.replace(/-/g, ' ').toUpperCase() : 'IRON GYM CENTER',
    slug: slug || 'irongym',
    address: 'Av. Corrientes 1234, Buenos Aires',
    phone: '+54 11 4567-8900',
    primaryColor: '#CCFF00',
    logoUrl: null,
    bannerUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200',
  });

  const [activeTab, setActiveTab] = useState<'RUTINA' | 'CLASES' | 'CUOTAS' | 'TIENDA'>('CLASES');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Class Schedules & Reservations State with REAL CURRENT DATE
  const [selectedDate, setSelectedDate] = useState<string>(getRealTodayISO);
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK'>('DAY');
  const [selectedProgram, setSelectedProgram] = useState('ALL');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('ALL');
  const [selectedShift, setSelectedShift] = useState<'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING'>('ALL');

  // Interactive Class Data (Loaded dynamically from DB with real occupied counts and student list)
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<any[]>([]);

  // User Reservation State (Track reserved class IDs by student)
  const [userReservedClassIds, setUserReservedClassIds] = useState<string[]>([]);

  // Modals / Views State
  const [quickViewClass, setQuickViewClass] = useState<ClassItem | null>(null);
  const [detailedViewClass, setDetailedViewClass] = useState<ClassItem | null>(null);
  const [reserveModalClass, setReserveModalClass] = useState<ClassItem | null>(null);

  // Mercado Pago Payment Modal State
  const [payModalData, setPayModalData] = useState<{
    isOpen: boolean;
    membershipId?: string;
    disciplineName: string;
    amount: number;
    title?: string;
    isTotal?: boolean;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);

  // Load classes & live reservations for a specific date from Supabase DB
  const loadClassesAndReservations = async (targetDate: string) => {
    try {
      const supabase = createClient();

      // 1. Fetch disciplines
      const { data: dbDisciplines } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // 2. Fetch live confirmed reservations from database for this exact date
      const { data: dbReservations } = await supabase
        .from('reservations')
        .select('*, student:students(id, first_name, last_name, email, dni)')
        .eq('reservation_date', targetDate)
        .eq('status', 'CONFIRMED');

      if (dbDisciplines && dbDisciplines.length > 0) {
        setDisciplinesList(dbDisciplines);

        const dateLabel = getTodayFormatted(targetDate);
        const generatedClasses: ClassItem[] = [];

        dbDisciplines.forEach((d: any) => {
          const meta = parseDisciplineMeta(d);
          const times = meta.selectedSchedules;

          times.forEach((tStr: string) => {
            const hh = Number(tStr.split(':')[0] || '8');
            const mm = Number(tStr.split(':')[1] || '0');
            const durationMin = d.duration_minutes || 60;
            const endH = String(hh + Math.floor(durationMin / 60)).padStart(2, '0');
            const endM = String((mm + (durationMin % 60)) % 60).padStart(2, '0');

            const coach = meta.coach_name || 'Profesor de Sala';
            const initials = coach
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'PF';

            // Filter real matching reservations for this discipline & time
            const matchingReservations = (dbReservations || []).filter(
              (r: any) =>
                (r.discipline_id === d.id || r.class_schedule_id === d.id) &&
                (r.class_time === tStr || r.class_time?.startsWith(tStr))
            );

            const reservedList = matchingReservations.map((r: any) => {
              const stdName = r.student
                ? `${r.student.first_name} ${r.student.last_name}`
                : 'Alumno Registrado';
              const stdInitials = r.student
                ? `${r.student.first_name?.[0] || 'A'}${r.student.last_name?.[0] || 'L'}`
                : 'AL';
              return {
                studentId: r.student_id,
                name: stdName,
                initials: stdInitials,
              };
            });

            generatedClasses.push({
              id: `${d.id}-${tStr}`,
              disciplineId: d.id,
              disciplineName: d.name.toUpperCase(),
              program: d.name,
              startTime: tStr,
              endTime: `${endH}:${endM}`,
              duration: `${durationMin} min`,
              coachName: coach,
              coachInitials: initials,
              occupied: matchingReservations.length,
              maxCapacity: d.max_capacity || 24,
              dateStr: targetDate,
              fullDateLabel: dateLabel,
              reservedStudents: reservedList,
            });
          });
        });

        setClassesList(generatedClasses);

        // Track logged-in student's reservations
        if (studentData?.id) {
          const userReserved = (dbReservations || [])
            .filter((r: any) => r.student_id === studentData.id)
            .map((r: any) => `${r.discipline_id}-${r.class_time}`);
          setUserReservedClassIds(userReserved);
        }
      } else {
        setDisciplinesList([]);
        setClassesList([]);
      }
    } catch (e) {
      console.error('Error loading real classes & reservations:', e);
    }
  };

  // Fetch Gym Info & ONLY Real Disciplines by Slug
  useEffect(() => {
    async function loadGymInfo() {
      try {
        const supabase = createClient();
        let { data: gymData } = await supabase
          .from('gyms')
          .select(`
            id, name, slug, email, phone, logo_url,
            gym_settings ( primary_color, banner_url, theme )
          `)
          .eq('slug', slug)
          .maybeSingle();

        if (!gymData) {
          const { data: fallbackGym } = await supabase
            .from('gyms')
            .select(`
              id, name, slug, email, phone, logo_url,
              gym_settings ( primary_color, banner_url, theme )
            `)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (fallbackGym) {
            gymData = fallbackGym;
          }
        }

        if (gymData) {
          const settings = Array.isArray(gymData.gym_settings) ? gymData.gym_settings[0] : gymData.gym_settings;
          setGym({
            id: gymData.id,
            name: gymData.name,
            slug: gymData.slug,
            address: 'Sede Principal',
            phone: gymData.phone || '+54 11 4567-8900',
            primaryColor: settings?.primary_color || '#CCFF00',
            logoUrl: gymData.logo_url,
            bannerUrl: settings?.banner_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200',
          });
        }

        await loadClassesAndReservations(selectedDate);
      } catch (e) {
        console.error('Error fetching gym portal info:', e);
      }
    }
    loadGymInfo();
  }, [slug, selectedDate]);

  // Helper to fetch and populate full student data from Supabase
  const fetchAndSetStudentData = async (supabase: any, student: any) => {
    try {
      // 1. Fetch student memberships from Database
      const { data: memberData } = await supabase
        .from('memberships')
        .select('*, discipline:disciplines(id, name, price, description)')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      // 2. Fetch student active routines
      const { data: routineData } = await supabase
        .from('routines')
        .select(`
          id, name, goal, description, is_active,
          routine_days (
            id, day_name, day_order,
            routine_exercises (
              id, sets, repetitions, weight_kg, rest_seconds, notes,
              exercise:exercises(name, muscle_group)
            )
          )
        `)
        .eq('student_id', student.id)
        .eq('is_active', true)
        .maybeSingle();

      const nowTime = new Date().getTime();
      const rawMapped = (memberData || []).map((m: any) => {
        const rawDisc = Array.isArray(m.discipline) ? m.discipline[0] : m.discipline;
        const expDateStr = m.expiration_date || '';
        let isExpired = false;
        let daysOverdue = 0;
        let isExpiringSoon = false;
        let daysRemaining = 0;

        if (expDateStr) {
          const expTime = new Date(`${expDateStr}T23:59:59`).getTime();
          if (expTime < nowTime) {
            isExpired = true;
            daysOverdue = Math.max(1, Math.floor((nowTime - expTime) / (1000 * 60 * 60 * 24)));
          } else {
            daysRemaining = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24));
            if (daysRemaining <= 5) {
              isExpiringSoon = true;
            }
          }
        }

        if (m.status === 'OVERDUE' || m.status === 'EXPIRED') {
          isExpired = true;
        }

        return {
          id: m.id,
          discipline_id: m.discipline_id,
          discipline_name: rawDisc?.name || 'Disciplina',
          price: Number(m.price) || 0,
          start_date: m.start_date,
          expiration_date: m.expiration_date,
          status: isExpired ? 'OVERDUE' : (m.status || student.status || 'ACTIVE'),
          isExpired,
          daysOverdue,
          daysRemaining,
          isExpiringSoon,
        };
      });

      const uniqueMemberMap = new Map<string, any>();
      rawMapped.forEach((m: any) => {
        if (!uniqueMemberMap.has(m.discipline_id)) {
          uniqueMemberMap.set(m.discipline_id, m);
        }
      });
      const mappedMemberships = Array.from(uniqueMemberMap.values());

      const expiredMemberships = mappedMemberships.filter((m: any) => m.isExpired);
      const hasExpiredCuota = expiredMemberships.length > 0 || student.status === 'OVERDUE' || student.status === 'SUSPENDED';
      const totalOverdueAmount = expiredMemberships.length > 0
        ? expiredMemberships.reduce((acc: number, m: any) => acc + (m.price || 0), 0)
        : mappedMemberships.reduce((acc: number, m: any) => acc + (m.price || 0), 0);

      const primaryMember = mappedMemberships[0];

      // Format routine
      let formattedRoutine: any[] = [];
      if (routineData?.routine_days && routineData.routine_days.length > 0) {
        formattedRoutine = routineData.routine_days.map((day: any) => ({
          day: day.day_name || 'Día de Entrenamiento',
          exercises: day.routine_exercises?.map((ex: any) => {
            const exName = Array.isArray(ex.exercise)
              ? ex.exercise[0]?.name
              : ex.exercise?.name || 'Ejercicio';
            return {
              name: exName,
              sets: ex.sets || 4,
              reps: String(ex.repetitions || '10-12'),
              weight: ex.weight_kg ? `${ex.weight_kg} kg` : 'Corporal',
            };
          }) || [],
        }));
      } else {
        formattedRoutine = [
          {
            day: 'Día 1 - Tren Superior',
            exercises: [
              { name: 'Press de Banca Plano', sets: 4, reps: '10-12', weight: '60 kg' },
              { name: 'Press Inclinado con Mancuernas', sets: 4, reps: '12', weight: '22 kg' },
              { name: 'Cruces en Polea', sets: 3, reps: '15', weight: '15 kg' },
            ],
          },
          {
            day: 'Día 2 - Tren Inferior',
            exercises: [
              { name: 'Sentadilla Libre con Barra', sets: 4, reps: '8-10', weight: '80 kg' },
              { name: 'Prensa de Piernas 45°', sets: 4, reps: '12', weight: '140 kg' },
              { name: 'Sillón de Cuádriceps', sets: 3, reps: '15', weight: '45 kg' },
            ],
          },
        ];
      }

      setStudentData({
        id: student.id,
        gym_id: student.gym_id,
        first_name: student.first_name,
        last_name: student.last_name,
        dni: student.dni || '',
        email: student.email || '',
        phone: student.phone || '',
        status: hasExpiredCuota ? 'OVERDUE' : (student.status || 'ACTIVE'),
        hasExpiredCuota,
        expiredMemberships,
        totalOverdueAmount,
        memberships: mappedMemberships,
        membership: {
          discipline: mappedMemberships.length > 0
            ? mappedMemberships.map((m: any) => m.discipline_name).join(', ')
            : 'Sin disciplina asignada',
          status: hasExpiredCuota ? 'OVERDUE' : (student.status || primaryMember?.status || 'ACTIVE'),
          price: mappedMemberships.reduce((acc: number, m: any) => acc + (m.price || 0), 0),
          expiration: primaryMember?.expiration_date
            ? new Date(primaryMember.expiration_date + 'T12:00:00').toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
            : 'Sin fecha de vencimiento',
          isExpired: primaryMember?.isExpired || false,
        },
        routine: formattedRoutine,
      });

      if (student.gym_id && !gym?.id) {
        setGym((prev: any) => ({ ...prev, id: student.gym_id }));
      }

      setIsLoggedIn(true);
    } catch (e) {
      console.error('Error fetching student data:', e);
    }
  };

  // Open Mercado Pago Payment Modal
  const handleOpenMercadoPagoModal = (data: {
    membershipId?: string;
    disciplineName: string;
    amount: number;
    title?: string;
    isTotal?: boolean;
  }) => {
    setPayModalData({
      isOpen: true,
      membershipId: data.membershipId,
      disciplineName: data.disciplineName,
      amount: data.amount,
      title: data.title,
      isTotal: data.isTotal,
    });
  };

  // Perform Mercado Pago Payment / Checkout / Simulation
  const handleProceedMercadoPagoCheckout = async () => {
    if (!payModalData || !studentData) return;
    setIsProcessingPayment(true);

    try {
      // 1. Create Preference in Mercado Pago API
      const res = await fetch('/api/payments/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: gym?.id || studentData.gym_id,
          studentId: studentData.id,
          membershipId: payModalData.membershipId,
          title: `Cuota ${payModalData.disciplineName} - ${gym.name}`,
          unitPrice: payModalData.amount,
          payerEmail: studentData.email || 'alumno@gym.com',
          slug: gym.slug,
        }),
      });

      const prefData = await res.json();

      if (prefData.isLive && prefData.initPoint) {
        // Open live Mercado Pago checkout window
        window.open(prefData.initPoint, '_blank');
      }

      // 2. Confirm and extend membership by 30 days in DB
      const confirmRes = await fetch('/api/payments/mercadopago/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: gym?.id || studentData.gym_id,
          studentId: studentData.id,
          membershipId: payModalData.membershipId,
          amount: payModalData.amount,
          mpPaymentId: prefData.preferenceId || `MP-${Date.now()}`,
        }),
      });

      const confirmData = await confirmRes.json();

      if (confirmData.success) {
        setPaymentSuccessToast(`¡Pago de $${payModalData.amount.toLocaleString()} procesado con éxito en Mercado Pago! Tu cuota ha sido renovada hasta el ${confirmData.newExpirationDate}.`);
        setPayModalData(null);

        // Reload live student and cuota data from DB
        const supabase = createClient();
        const { data: refreshedStudent } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentData.id)
          .single();
        if (refreshedStudent) {
          await fetchAndSetStudentData(supabase, refreshedStudent);
        }
      } else {
        alert(confirmData.error || 'Error al registrar el pago en el sistema.');
      }
    } catch (e: any) {
      console.error('Error during Mercado Pago checkout:', e);
      alert('Hubo un inconveniente al conectar con Mercado Pago.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Student Login Handler (Direct DB query by Email or DNI)
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = studentIdentifier.trim();
    if (!cleanInput) {
      setErrorMsg('Ingresá tu Email o DNI registrado.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    try {
      const supabase = createClient();
      const isEmail = cleanInput.includes('@');

      let query = supabase.from('students').select('*');
      if (isEmail) {
        query = query.ilike('email', cleanInput);
      } else {
        query = query.eq('dni', cleanInput);
      }

      const { data: dbStudents, error: searchError } = await query;

      if (dbStudents && dbStudents.length > 0) {
        const student = dbStudents[0];
        await fetchAndSetStudentData(supabase, student);
        setIsLoading(false);
        return;
      }

      // Also attempt auth sign in if password was provided and it's email
      if (studentPassword.trim() && isEmail) {
        const { data: authResult } = await supabase.auth.signInWithPassword({
          email: cleanInput,
          password: studentPassword.trim(),
        });
        if (authResult?.user) {
          const { data: authStudent } = await supabase
            .from('students')
            .select('*')
            .eq('email', authResult.user.email)
            .maybeSingle();

          if (authStudent) {
            await fetchAndSetStudentData(supabase, authStudent);
            setIsLoading(false);
            return;
          }
        }
      }

      setErrorMsg('No encontramos un alumno registrado con ese Email o DNI en el gimnasio. Verificá que haya sido dado de alta en el panel admin.');
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error in student login:', err);
      setErrorMsg('Error al conectar con la base de datos. Por favor intentá nuevamente.');
      setIsLoading(false);
    }
  };

  // Perform Real Class Reservation in Supabase DB
  const handleConfirmReservation = async (clsItem: ClassItem) => {
    if (!studentData?.id) {
      alert('Por favor iniciá sesión con tu Email o DNI para poder reservar tu clase.');
      return;
    }

    try {
      const supabase = createClient();
      const discId = clsItem.disciplineId || clsItem.id.split('-')[0];
      let gymId = gym?.id || studentData?.gym_id;

      if (!gymId) {
        const selectedDisc = disciplinesList.find((d: any) => d.id === discId);
        if (selectedDisc?.gym_id) {
          gymId = selectedDisc.gym_id;
        }
      }

      if (!gymId) {
        const { data: fallbackGym } = await supabase
          .from('gyms')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        gymId = fallbackGym?.id;
      }

      if (!gymId) {
        alert('No se pudo identificar el gimnasio para registrar la reserva.');
        return;
      }

      // 1. Direct INSERT into public.reservations
      const { error: insertErr } = await supabase.from('reservations').insert([
        {
          gym_id: gymId,
          student_id: studentData.id,
          discipline_id: discId,
          class_time: clsItem.startTime,
          reservation_date: selectedDate,
          status: 'CONFIRMED',
        },
      ]);

      if (insertErr) {
        if (insertErr.code === '23505') {
          alert('¡Ya estás anotado en este turno!');
        } else {
          console.error('Error in DB reservation:', insertErr);
          alert(`Error al reservar en la base de datos: ${insertErr.message}`);
          return;
        }
      }

      // 2. Reload live reservations from DB
      await loadClassesAndReservations(selectedDate);
      setReserveModalClass(null);
      setDetailedViewClass(null);
    } catch (e: any) {
      console.error('Error reserving class:', e);
      alert('Hubo un error de conexión al procesar la reserva.');
    }
  };

  // Cancel Real Reservation in Supabase DB
  const handleCancelReservation = async (clsItem: ClassItem) => {
    if (!studentData?.id) return;
    try {
      const supabase = createClient();
      const discId = clsItem.disciplineId || clsItem.id.split('-')[0];

      // Delete from public.reservations
      await supabase
        .from('reservations')
        .delete()
        .eq('student_id', studentData.id)
        .eq('discipline_id', discId)
        .eq('class_time', clsItem.startTime)
        .eq('reservation_date', selectedDate);

      // Reload live reservations from DB
      await loadClassesAndReservations(selectedDate);
      setReserveModalClass(null);
      setDetailedViewClass(null);
    } catch (e) {
      console.error('Error canceling reservation:', e);
    }
  };

  // Distinct schedule times available
  const availableTimes = Array.from(new Set(classesList.map((c) => c.startTime))).sort();

  const filteredClasses = classesList.filter((c) => {
    const matchesProgram =
      selectedProgram === 'ALL' ||
      c.program.toLowerCase() === selectedProgram.toLowerCase() ||
      c.disciplineName.toLowerCase().includes(selectedProgram.toLowerCase());

    const matchesTime =
      selectedTimeSlot === 'ALL' || c.startTime === selectedTimeSlot;

    const hour = parseInt((c.startTime || '00:00').split(':')[0] || '0', 10);
    const matchesShift =
      selectedShift === 'ALL' ||
      (selectedShift === 'MORNING' && hour < 12) ||
      (selectedShift === 'AFTERNOON' && hour >= 12 && hour < 18) ||
      (selectedShift === 'EVENING' && hour >= 18);

    return matchesProgram && matchesTime && matchesShift;
  });

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white selection:bg-[var(--gym-primary)] selection:text-black font-sans">
      {/* Header Banner */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden">
        <Image src={gym.bannerUrl} alt={gym.name} fill className="object-cover opacity-50" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/60 to-transparent" />

        {/* Top Navbar */}
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
            {gym.logoUrl ? (
              <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-white/10 shadow-sm">
                <Image src={gym.logoUrl} alt={gym.name} fill className="object-cover" />
              </div>
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl font-black text-black text-sm shadow-neon"
                style={{ backgroundColor: gym.primaryColor }}
              >
                {(gym.name || 'GY').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white">{gym.name || 'Gimnasio'}</span>
              <p className="text-[10px] text-zinc-400">Portal del Alumno</p>
            </div>
          </div>

          <Link
            href="/login"
            className="text-xs font-extrabold text-zinc-400 hover:text-white bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10"
          >
            Acceso Staff / Admin
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 -mt-20 relative z-10 space-y-6 pb-16">
        {/* Gym Badge Header */}
        <div className="rounded-3xl bg-[#141418] p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className="inline-block h-3 w-3 rounded-full animate-pulse"
                  style={{ backgroundColor: gym.primaryColor }}
                />
                <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">
                  Portal de Alumnos Oficial
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{gym.name}</h1>
              <p className="text-xs text-zinc-400 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-zinc-500" /> {gym.address}
                <span className="text-zinc-600">•</span>
                <Phone className="h-3.5 w-3.5 text-zinc-500" /> {gym.phone}
              </p>
            </div>

            {isLoggedIn && (
              <button
                onClick={() => setIsLoggedIn(false)}
                className="flex items-center space-x-2 rounded-xl bg-[#18181C] px-4 py-2.5 text-xs font-bold text-zinc-400 border border-white/10 hover:text-rose-400 transition-all self-start sm:self-auto"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>
        </div>

        {/* Student Auth Step OR Student Dashboard */}
        {!isLoggedIn ? (
          <div className="rounded-3xl bg-[#141418] p-6 sm:p-8 border border-white/5 shadow-2xl space-y-6 max-w-md mx-auto">
            <div className="text-center space-y-2">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-black font-black text-xl shadow-neon"
                style={{ backgroundColor: gym.primaryColor }}
              >
                <User className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-black text-white">Ingresá a tu Cuenta de Alumno</h2>
              <p className="text-xs text-zinc-400">Consultá tu rutina, horarios, cuotas y reservas en {gym.name}.</p>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 border border-rose-500/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300">Email o DNI</label>
                <div className="mt-1 flex items-center rounded-xl bg-[#18181C] px-3 py-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                  <User className="h-4 w-4 text-zinc-400 mr-2" />
                  <input
                    type="text"
                    placeholder="ejemplo@email.com o 40123456"
                    value={studentIdentifier}
                    onChange={(e) => setStudentIdentifier(e.target.value)}
                    className="w-full bg-transparent text-xs text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">Contraseña</label>
                  <span className="text-[10px] text-zinc-500">(Opcional con DNI)</span>
                </div>
                <div className="mt-1 flex items-center rounded-xl bg-[#18181C] px-3 py-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                  <Lock className="h-4 w-4 text-zinc-400 mr-2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 rounded-2xl font-black uppercase text-black py-4 text-sm tracking-wider shadow-neon transition-all hover:opacity-90"
                style={{ backgroundColor: gym.primaryColor }}
              >
                {isLoading ? (
                  <span>Verificando alumno...</span>
                ) : (
                  <>
                    <span>Ingresar al Portal</span>
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-xs text-zinc-400 border-t border-zinc-800 pt-4">
              ¿No tenés contraseña aún?{' '}
              <span className="font-extrabold text-[var(--gym-primary)] cursor-pointer hover:underline">
                Pedila en la recepción de tu Gimnasio
              </span>
            </div>
          </div>
        ) : (
          /* LOGGED IN STUDENT DASHBOARD */
          <div className="space-y-6">
            {/* Student Welcome Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-[#18181C] to-[#141418] p-5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl font-black text-black text-lg shadow-neon"
                  style={{ backgroundColor: gym.primaryColor }}
                >
                  {studentData.first_name[0]}{studentData.last_name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">¡Hola, {studentData.first_name}!</h3>
                  <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                    <span>DNI: {studentData.dni}</span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase border ${studentData.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : studentData.status === 'SUSPENDED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                    >
                      {studentData.status === 'ACTIVE' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Membresía Activa (Al Día)
                        </>
                      ) : studentData.status === 'SUSPENDED' ? (
                        <>
                          <AlertCircle className="h-3 w-3" /> Membresía Suspendida
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" /> Membresía Inactiva / Pendiente
                        </>
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-[#0B0B0E] px-4 py-2.5 rounded-xl border border-white/5 text-right w-full sm:w-auto">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Disciplinas Asignadas</span>
                <p className="text-xs font-black text-white">{studentData.membership.discipline}</p>
                <span className="text-[10px] font-semibold text-[var(--gym-primary)]">
                  Vencimiento: {studentData.membership.expiration}
                </span>
              </div>
            </div>

            {/* CARTEL DE AVISO: CUOTA VENCIDA / REGULARIZACIÓN PENDIENTE */}
            {studentData.hasExpiredCuota && (
              <div className="rounded-3xl bg-gradient-to-r from-rose-950/60 via-[#18181C] to-amber-950/40 p-5 border-2 border-rose-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40 shadow-lg">
                    <AlertTriangle className="h-6 w-6 animate-pulse text-rose-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">
                        Cuota Vencida
                      </span>
                      <span className="text-xs text-rose-300 font-extrabold">
                        {studentData.expiredMemberships?.length > 1
                          ? `${studentData.expiredMemberships.length} cuotas pendientes`
                          : `Venció el ${studentData.expiredMemberships?.[0]?.expiration_date || 'recientemente'}`}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white uppercase tracking-tight">
                      Tu cuota de gimnasio se encuentra vencida
                    </h4>
                    <p className="text-xs text-zinc-300">
                      Regularizá tu cuota mensual para no perder tus turnos de clases, reservas y acceso al gimnasio.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setActiveTab('CUOTAS')}
                    className="px-4 py-3 rounded-xl bg-[#18181C] hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-white/10 text-center"
                  >
                    Ver detalle
                  </button>
                  <button
                    onClick={() =>
                      handleOpenMercadoPagoModal({
                        title:
                          studentData.expiredMemberships?.length === 1
                            ? `Cuota Mensual - ${studentData.expiredMemberships[0].discipline_name}`
                            : 'Cuota Mensual Gimnasio',
                        amount: studentData.totalOverdueAmount || studentData.membership.price,
                        membershipId:
                          studentData.expiredMemberships?.length === 1
                            ? studentData.expiredMemberships[0].id
                            : undefined,
                        isTotal: studentData.expiredMemberships?.length > 1,
                        disciplineName:
                          studentData.expiredMemberships?.length === 1
                            ? studentData.expiredMemberships[0].discipline_name
                            : 'Membresía Completa',
                      })
                    }
                    className="flex items-center justify-center space-x-2.5 px-5 py-3 rounded-xl bg-[#009EE3] hover:bg-[#0081BC] text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,158,227,0.4)] active:scale-95"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Pagar con Mercado Pago (${(studentData.totalOverdueAmount || studentData.membership.price).toLocaleString()})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl bg-[#141418] p-1.5 border border-white/5">
              {[
                { id: 'CLASES', label: 'Reservas & Clases', icon: CalendarIcon },
                { id: 'RUTINA', label: 'Mi Rutina', icon: Dumbbell },
                { id: 'CUOTAS', label: 'Estado de Cuota', icon: CreditCard },
                { id: 'TIENDA', label: 'Tienda Gym', icon: ShoppingBag },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center justify-center space-x-2 rounded-xl py-3 text-xs font-black uppercase transition-all ${active ? 'bg-[var(--gym-primary)] text-black shadow-neon' : 'text-zinc-400 hover:text-white'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB: CLASES & RESERVAS (MATCHING SCREENSHOTS 1, 2, 3, 4) */}
            {activeTab === 'CLASES' && (
              <div className="space-y-6">
                {/* IF DETAILED VIEW ("VER CLASE") IS OPEN (SCREENSHOTS 2 & 3) */}
                {detailedViewClass ? (
                  <div className="rounded-3xl bg-[#141418] p-6 border border-white/10 shadow-2xl space-y-6 animate-fadeIn">
                    <button
                      onClick={() => setDetailedViewClass(null)}
                      className="flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white bg-[#18181C] px-3.5 py-2 rounded-xl border border-white/10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Volver al calendario de clases</span>
                    </button>

                    {/* Screenshot 2 Header: Dynamic Date - RESERVAR CLASE */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--gym-primary)]">
                          {getTodayShortLabel(selectedDate)} • {getTodayFormatted(selectedDate)}
                        </span>
                        <span className="text-xs font-bold uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          {detailedViewClass.maxCapacity - detailedViewClass.occupied} Plazas Libres
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                        RESERVAR CLASE: {detailedViewClass.disciplineName}
                      </h2>
                    </div>

                    {/* Coach Badge Box */}
                    <div className="flex items-center space-x-3 rounded-2xl bg-[#18181C] p-4 border border-white/5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 font-black text-white text-base border border-[var(--gym-primary)]">
                        {detailedViewClass.coachInitials}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">
                          COACH • {detailedViewClass.startTime} - {detailedViewClass.endTime}
                        </span>
                        <p className="text-base font-black text-white">{detailedViewClass.coachName}</p>
                      </div>
                    </div>

                    {/* Occupation Progress Bar (Screenshot 2: Real ocupation / cupos) */}
                    <div className="space-y-2 rounded-2xl bg-[#18181C] p-4 border border-white/5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white font-black text-sm">
                          {detailedViewClass.occupied} / {detailedViewClass.maxCapacity}
                        </span>
                        <span className="text-zinc-400">
                          Plazas ocupadas • {Math.max(0, detailedViewClass.maxCapacity - detailedViewClass.occupied)} Libres
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-[var(--gym-primary)] transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (detailedViewClass.occupied / detailedViewClass.maxCapacity) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Notice Box */}
                    <div className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                      <p className="font-extrabold text-sm text-amber-200">¡Información de Reserva!</p>
                      <p>
                        Las reservas para esta clase impactan en vivo en el sistema del gimnasio.
                      </p>
                    </div>

                    {/* Reservation Action Button */}
                    <div>
                      {userReservedClassIds.includes(detailedViewClass.id) ? (
                        <button
                          onClick={() => handleCancelReservation(detailedViewClass)}
                          className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-rose-500 py-4 text-xs font-black uppercase text-white shadow-lg hover:bg-rose-600 transition-all"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancelar Mi Reserva</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConfirmReservation(detailedViewClass)}
                          disabled={detailedViewClass.occupied >= detailedViewClass.maxCapacity}
                          className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-[var(--gym-primary)] py-4 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {detailedViewClass.occupied >= detailedViewClass.maxCapacity
                              ? 'CLASE COMPLETA (0 CUPOS LIBRES)'
                              : 'Reservar Lugar en esta Clase'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Screenshot 3: REAL RESERVED STUDENTS LIST (RESERVAS DIRECTAS DESDE LA BD) */}
                    <div className="rounded-3xl bg-[#18181C] p-6 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div className="flex items-center space-x-2 text-rose-400">
                          <Users className="h-5 w-5" />
                          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                            RESERVAS EN VIVO • {detailedViewClass.occupied} / {detailedViewClass.maxCapacity}
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500">Alumnos Anotados (BD)</span>
                      </div>

                      {detailedViewClass.reservedStudents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {detailedViewClass.reservedStudents.map((std, idx) => (
                            <div
                              key={idx}
                              className="flex items-center space-x-3 rounded-xl bg-[#141418] p-3 border border-white/5 hover:border-white/10 transition-all"
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 font-bold text-xs text-[var(--gym-primary)] border border-[var(--gym-primary)]">
                                {std.initials}
                              </div>
                              <div>
                                <span className="text-xs font-extrabold text-white block">{std.name}</span>
                                <span className="text-[10px] text-emerald-400">✓ Confirmado</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 italic text-center py-4">
                          Aún no hay alumnos anotados en este turno. ¡Sé el primero en reservar!
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* NORMAL CLASS CALENDAR & CARDS LIST */
                  <div className="space-y-5">
                    {/* Header Controls: Real Date, Day/Week Switch, Filter Dropdown */}
                    <div className="rounded-3xl bg-[#141418] p-5 border border-white/5 shadow-card space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              const curr = new Date(`${selectedDate}T12:00:00`);
                              curr.setDate(curr.getDate() - 1);
                              const prevISO = curr.toISOString().slice(0, 10);
                              setSelectedDate(prevISO);
                            }}
                            className="p-2 rounded-xl bg-[#18181C] text-zinc-400 hover:text-white border border-white/5"
                            title="Día anterior"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-black text-white px-2 uppercase tracking-wide">
                            {getTodayFormatted(selectedDate)}
                          </span>
                          <button
                            onClick={() => {
                              const curr = new Date(`${selectedDate}T12:00:00`);
                              curr.setDate(curr.getDate() + 1);
                              const nextISO = curr.toISOString().slice(0, 10);
                              setSelectedDate(nextISO);
                            }}
                            className="p-2 rounded-xl bg-[#18181C] text-zinc-400 hover:text-white border border-white/5"
                            title="Día siguiente"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        {/* View Switch Buttons & Hoy Button */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedDate(getRealTodayISO())}
                            className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all ${selectedDate === getRealTodayISO()
                                ? 'bg-[var(--gym-primary)] text-black shadow-neon'
                                : 'bg-[#18181C] text-zinc-300 border border-white/5 hover:text-white'
                              }`}
                          >
                            Hoy Real
                          </button>
                        </div>
                      </div>

                      {/* Selector de Días Próximos (Semana actual en tiempo real) */}
                      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                        {Array.from({ length: 7 }).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() + i);
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          const iso = `${year}-${month}-${day}`;
                          const isSelected = selectedDate === iso;
                          const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

                          return (
                            <button
                              key={iso}
                              onClick={() => setSelectedDate(iso)}
                              className={`px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex flex-col items-center min-w-[70px] ${isSelected
                                  ? 'bg-rose-600 text-white shadow-lg border-rose-500'
                                  : 'bg-[#18181C] text-zinc-400 hover:text-white border border-white/5'
                                }`}
                            >
                              <span className="text-[10px] uppercase font-bold opacity-80">
                                {i === 0 ? 'HOY' : dayNames[d.getDay()]}
                              </span>
                              <span className="text-sm font-black">{day}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Program Filter Dropdown (Todos programas) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
                        <span className="text-xs font-black text-[var(--gym-primary)] uppercase tracking-wider">
                          📅 {getTodayFormatted(selectedDate)}
                        </span>

                        <div className="flex items-center space-x-2">
                          <select
                            value={selectedShift}
                            onChange={(e) => setSelectedShift(e.target.value as any)}
                            className="rounded-xl bg-[#18181C] px-3 py-2 text-xs font-bold text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                          >
                            <option value="ALL">Todos los turnos</option>
                            <option value="MORNING">Turno Mañana (08:00 - 12:00)</option>
                            <option value="AFTERNOON">Turno Tarde (12:00 - 18:00)</option>
                            <option value="EVENING">Turno Noche (18:00 - 22:00)</option>
                          </select>

                          <select
                            value={selectedProgram}
                            onChange={(e) => setSelectedProgram(e.target.value)}
                            className="rounded-xl bg-[#18181C] px-3 py-2 text-xs font-bold text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                          >
                            <option value="ALL">Todos los programas ({disciplinesList.length})</option>
                            {disciplinesList.map((d) => (
                              <option key={d.id} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* SELECTOR DE HORARIOS (SELECTOR INTERACTIVO DE TURNOS/HORARIOS) */}
                      <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[var(--gym-primary)]" />
                            <span>Selector de Horarios</span>
                          </span>

                          {selectedTimeSlot !== 'ALL' && (
                            <button
                              onClick={() => setSelectedTimeSlot('ALL')}
                              className="text-[10px] font-bold text-[var(--gym-primary)] hover:underline"
                            >
                              Ver todos los horarios
                            </button>
                          )}
                        </div>

                        {/* Botones / Chips de Horarios */}
                        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                          <button
                            onClick={() => setSelectedTimeSlot('ALL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${selectedTimeSlot === 'ALL'
                                ? 'bg-[var(--gym-primary)] text-black shadow-neon'
                                : 'bg-[#18181C] text-zinc-400 hover:text-white border border-white/5'
                              }`}
                          >
                            Todos ({classesList.length})
                          </button>

                          {availableTimes.map((time) => {
                            const count = classesList.filter((c) => c.startTime === time).length;
                            const isSelected = selectedTimeSlot === time;
                            return (
                              <button
                                key={time}
                                onClick={() => setSelectedTimeSlot(time)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${isSelected
                                    ? 'bg-[var(--gym-primary)] text-black shadow-neon font-black'
                                    : 'bg-[#18181C] text-zinc-300 hover:text-white border border-white/5'
                                  }`}
                              >
                                <Clock className={`h-3 w-3 ${isSelected ? 'text-black' : 'text-[var(--gym-primary)]'}`} />
                                <span>{time} hs</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${isSelected ? 'bg-black/20 text-black' : 'bg-white/5 text-zinc-400'
                                    }`}
                                >
                                  {count} {count === 1 ? 'clase' : 'clases'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Screenshot 1 Cards List */}
                    {filteredClasses.length === 0 ? (
                      <div className="rounded-3xl bg-[#141418] p-12 border border-white/5 text-center space-y-3 shadow-card">
                        <Clock className="h-10 w-10 text-zinc-600 mx-auto" />
                        <h4 className="text-sm font-extrabold text-white">No hay clases disponibles</h4>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                          {disciplinesList.length === 0
                            ? 'No hay disciplinas cargadas en el sistema del gimnasio aún.'
                            : 'No hay turnos disponibles para los filtros seleccionados.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredClasses.map((cls) => {
                          const isReserved = userReservedClassIds.includes(cls.id);
                          return (
                            <div
                              key={cls.id}
                              className="rounded-3xl bg-[#141418] p-5 sm:p-6 border border-white/5 hover:border-[var(--gym-primary)]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card"
                            >
                              <div className="flex items-start space-x-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                                  <Clock className="h-6 w-6" />
                                </div>

                                <div className="space-y-1">
                                  <span className="text-base sm:text-lg font-black text-white tracking-wide">
                                    {cls.startTime} • {cls.disciplineName}
                                  </span>
                                  <div className="flex items-center space-x-3 text-xs text-zinc-400">
                                    <span>{cls.duration}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 font-extrabold text-zinc-300">
                                      <Users className="h-3.5 w-3.5 text-zinc-500" /> {cls.occupied} de {cls.maxCapacity}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-400 flex items-center gap-1 font-semibold pt-0.5">
                                    <User className="h-3.5 w-3.5 text-zinc-500" /> {cls.coachName}
                                  </p>
                                </div>
                              </div>

                              {/* Screenshot 1 Buttons: Reservar & Ver clase */}
                              <div className="flex sm:flex-col items-center gap-2 self-end sm:self-auto w-full sm:w-36">
                                {isReserved ? (
                                  <button
                                    onClick={() => handleCancelReservation(cls)}
                                    className="w-full rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 py-2.5 text-xs font-black uppercase hover:bg-rose-600 hover:text-white transition-all"
                                  >
                                    Cancelar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setReserveModalClass(cls)}
                                    disabled={cls.occupied >= cls.maxCapacity}
                                    className="w-full rounded-xl bg-rose-600 text-white hover:bg-rose-700 py-2.5 text-xs font-black uppercase shadow-lg active:scale-98 transition-all disabled:opacity-50"
                                  >
                                    {cls.occupied >= cls.maxCapacity ? 'Completo' : 'Reservar'}
                                  </button>
                                )}

                                <button
                                  onClick={() => setDetailedViewClass(cls)}
                                  className="w-full rounded-xl bg-[#18181C] text-rose-400 hover:text-white border border-rose-500/30 py-2.5 text-xs font-bold transition-all"
                                >
                                  Ver clase
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MI RUTINA */}
            {activeTab === 'RUTINA' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">Mi Plan de Entrenamiento</h3>
                  <span className="text-xs font-bold text-[var(--gym-primary)]">Personalizado</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studentData.routine.map((dayPlan: any, idx: number) => (
                    <div key={idx} className="rounded-2xl bg-[#141418] p-5 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <h4 className="font-black text-sm text-white">{dayPlan.day}</h4>
                        <span className="text-[10px] font-bold uppercase text-[var(--gym-primary)] bg-[var(--gym-primary)]/10 px-2.5 py-1 rounded-full border border-[var(--gym-primary)]/20">
                          {dayPlan.exercises.length} Ejercicios
                        </span>
                      </div>

                      <div className="space-y-3">
                        {dayPlan.exercises.map((ex: any, exIdx: number) => (
                          <div key={exIdx} className="rounded-xl bg-[#18181C] p-3 border border-white/5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-extrabold text-white">{ex.name}</p>
                              <p className="text-[10px] text-zinc-400">{ex.sets} series x {ex.reps} reps</p>
                            </div>
                            <span className="text-xs font-black text-[var(--gym-primary)] bg-black px-2.5 py-1 rounded-lg border border-white/5">
                              {ex.weight}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CUOTAS & MEMBRESÍAS CON MERCADO PAGO */}
            {activeTab === 'CUOTAS' && (
              <div className="rounded-3xl bg-[#141418] p-6 border border-white/10 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">Estado de Cuotas y Membresías</h3>
                    <p className="text-xs text-zinc-400">
                      Consultá el estado de tu arancel mensual y aboná online con Mercado Pago.
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border self-start sm:self-auto ${
                      studentData.hasExpiredCuota || studentData.status === 'OVERDUE' || studentData.status === 'SUSPENDED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        studentData.hasExpiredCuota || studentData.status === 'OVERDUE' || studentData.status === 'SUSPENDED'
                          ? 'bg-rose-400 animate-ping'
                          : 'bg-emerald-400'
                      }`}
                    />
                    {studentData.hasExpiredCuota || studentData.status === 'OVERDUE' || studentData.status === 'SUSPENDED'
                      ? 'Cuota Vencida'
                      : 'Membresía Al Día'}
                  </span>
                </div>

                {/* CARTEL INFORMATIVO DE ESTADO DE CUOTAS */}
                {studentData.hasExpiredCuota ? (
                  <div className="rounded-2xl bg-gradient-to-r from-rose-950/70 via-[#1c1215] to-[#18181C] p-5 border-2 border-rose-500/50 shadow-xl space-y-4">
                    <div className="flex items-start gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                        <AlertTriangle className="h-5 w-5 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-rose-400 uppercase tracking-tight flex items-center gap-2">
                          <span>Estado de Cuenta: Cuota Vencida</span>
                        </h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          Tu cuota del gimnasio ha vencido. Para mantener la validez de tus reservas y continuar entrenando con normalidad, aboná tu mensualidad con Mercado Pago.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-rose-500/20">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Vencido a Regularizar</span>
                        <span className="text-xl font-black text-white">
                          ${(studentData.totalOverdueAmount || studentData.membership.price).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleOpenMercadoPagoModal({
                            title:
                              studentData.expiredMemberships?.length === 1
                                ? `Cuota Mensual - ${studentData.expiredMemberships[0].discipline_name}`
                                : 'Cuota Mensual Gimnasio',
                            amount: studentData.totalOverdueAmount || studentData.membership.price,
                            membershipId:
                              studentData.expiredMemberships?.length === 1
                                ? studentData.expiredMemberships[0].id
                                : undefined,
                            isTotal: studentData.expiredMemberships?.length > 1,
                            disciplineName:
                              studentData.expiredMemberships?.length === 1
                                ? studentData.expiredMemberships[0].discipline_name
                                : 'Membresía Completa',
                          })
                        }
                        className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#009EE3] hover:bg-[#0081BC] text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,158,227,0.4)] active:scale-95"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Pagar con Mercado Pago</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-950/20 p-4 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-400 uppercase">Estás al día</h4>
                        <p className="text-[11px] text-zinc-400">
                          Tu membresía se encuentra activa y vigente. Podés reservar todas tus clases con normalidad.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* List of active student memberships from DB */}
                {studentData.memberships && studentData.memberships.length > 0 ? (
                  <div className="space-y-4">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                      Detalle de Disciplinas y Aranceles:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {studentData.memberships.map((mem: any, idx: number) => (
                        <div
                          key={mem.id || idx}
                          className={`rounded-2xl p-5 border space-y-4 transition-all ${
                            mem.isExpired
                              ? 'bg-[#1a1215] border-rose-500/40 shadow-lg shadow-rose-950/20'
                              : 'bg-[#18181C] border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                  mem.isExpired
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-[var(--gym-primary)]/10 text-[var(--gym-primary)]'
                                }`}
                              >
                                <Dumbbell className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-white uppercase">{mem.discipline_name}</h4>
                                <span className="text-[10px] text-zinc-400">Cuota Mensual Recurrente</span>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                mem.isExpired
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                  : mem.isExpiringSoon
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}
                            >
                              {mem.isExpired
                                ? `Vencida (${mem.daysOverdue}d)`
                                : mem.isExpiringSoon
                                ? `Vence en ${mem.daysRemaining}d`
                                : 'Al Día'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                            <div>
                              <span className="text-zinc-400 text-[10px] block font-bold uppercase">Arancel Mensual</span>
                              <span className="font-black text-white text-base">${mem.price.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-zinc-400 text-[10px] block font-bold uppercase">Fecha de Vencimiento</span>
                              <span
                                className={`font-mono font-bold text-xs ${
                                  mem.isExpired
                                    ? 'text-rose-400 font-black'
                                    : 'text-[var(--gym-primary)]'
                                }`}
                              >
                                {mem.expiration_date || 'Al día'}
                              </span>
                            </div>
                          </div>

                          {/* BOTÓN MERCADO PAGO POR DISCIPLINA */}
                          <div className="pt-2">
                            <button
                              onClick={() =>
                                handleOpenMercadoPagoModal({
                                  title: `Cuota ${mem.discipline_name}`,
                                  amount: mem.price,
                                  membershipId: mem.id,
                                  disciplineName: mem.discipline_name,
                                })
                              }
                              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase transition-all shadow-sm ${
                                mem.isExpired
                                  ? 'bg-[#009EE3] hover:bg-[#0081BC] text-white shadow-[0_0_15px_rgba(0,158,227,0.3)]'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/5'
                              }`}
                            >
                              <CreditCard className="h-3.5 w-3.5 text-white" />
                              <span>
                                {mem.isExpired
                                  ? `Pagar con Mercado Pago ($${mem.price.toLocaleString()})`
                                  : `Renovar con Mercado Pago ($${mem.price.toLocaleString()})`}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Resumen Total y Pago General */}
                    <div className="rounded-2xl bg-[#0B0B0E] p-5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-zinc-400 block uppercase">
                          Total General Alumno ({studentData.memberships.length} disciplinas)
                        </span>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Podés abonar la totalidad de tus cuotas de forma unificada con Mercado Pago.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="text-right">
                          <span className="text-xl font-black text-[var(--gym-primary)]">
                            $
                            {studentData.memberships
                              .reduce((acc: number, m: any) => acc + (m.price || 0), 0)
                              .toLocaleString()}
                          </span>
                          <span className="text-[10px] text-zinc-500 block font-bold">/ mes</span>
                        </div>

                        <button
                          onClick={() =>
                            handleOpenMercadoPagoModal({
                              title: 'Total Cuotas del Gimnasio',
                              amount: studentData.memberships.reduce(
                                (acc: number, m: any) => acc + (m.price || 0),
                                0
                              ),
                              isTotal: true,
                              disciplineName: 'Total Membresías',
                            })
                          }
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#009EE3] hover:bg-[#0081BC] text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,158,227,0.35)] active:scale-95"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Pagar Total con Mercado Pago</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center bg-[#18181C] rounded-2xl border border-dashed border-zinc-800">
                    <p className="text-xs text-zinc-400">
                      No hay cuotas o disciplinas registradas aún para este alumno.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: TIENDA */}
            {activeTab === 'TIENDA' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">Tienda del Gimnasio</h3>
                  <span className="text-xs font-bold text-zinc-400">Suplementos & Indumentaria</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { name: 'Whey Protein Isolate 1kg', price: '$35.000', category: 'Suplementos', stock: 'En Stock' },
                    { name: 'Creatina Monohidratada 300g', price: '$28.000', category: 'Suplementos', stock: 'En Stock' },
                    { name: 'Remera Oficial Gym SaaS', price: '$18.000', category: 'Indumentaria', stock: 'Pocas Unidades' },
                  ].map((prod, idx) => (
                    <div key={idx} className="rounded-2xl bg-[#141418] p-4 border border-white/5 space-y-3">
                      <div className="h-28 rounded-xl bg-[#18181C] flex items-center justify-center text-zinc-600 font-extrabold text-xs">
                        {prod.name}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{prod.category}</span>
                        <h4 className="font-black text-sm text-white">{prod.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-black text-[var(--gym-primary)]">{prod.price}</span>
                          <span className="text-[10px] font-semibold text-emerald-400">{prod.stock}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* SCREENSHOT 4: QUICK CLASS POPUP MODAL */}
      {quickViewClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#141418] border border-white/10 p-6 space-y-5 shadow-2xl text-center">
            <div className="flex justify-end">
              <button onClick={() => setQuickViewClass(null)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white uppercase">{quickViewClass.disciplineName}</h3>
              <p className="text-xs font-bold text-zinc-400 uppercase">{quickViewClass.fullDateLabel}</p>
            </div>

            <div className="space-y-2 text-left text-xs bg-[#18181C] p-4 rounded-2xl border border-white/5">
              <p className="flex items-center gap-2 text-zinc-300 font-bold">
                <Clock className="h-4 w-4 text-[var(--gym-primary)]" />
                <span>Horario: {quickViewClass.startTime} - {quickViewClass.endTime}</span>
              </p>
              <p className="flex items-center gap-2 text-zinc-300 font-bold">
                <User className="h-4 w-4 text-[var(--gym-primary)]" />
                <span>Coach: {quickViewClass.coachName}</span>
              </p>
              <p className="flex items-center gap-2 text-zinc-300 font-bold">
                <Users className="h-4 w-4 text-[var(--gym-primary)]" />
                <span>Ocupación: {quickViewClass.occupied} de {quickViewClass.maxCapacity}</span>
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setQuickViewClass(null)}
                className="flex-1 rounded-xl bg-[#18181C] py-2.5 text-xs font-bold text-zinc-400 hover:text-white border border-white/5"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setDetailedViewClass(quickViewClass);
                  setQuickViewClass(null);
                }}
                className="flex-1 rounded-xl bg-[#18181C] text-rose-400 border border-rose-500/30 py-2.5 text-xs font-bold hover:text-white"
              >
                Ver clase
              </button>
              <button
                onClick={() => handleConfirmReservation(quickViewClass)}
                disabled={quickViewClass.occupied >= quickViewClass.maxCapacity}
                className="flex-1 rounded-xl bg-rose-600 text-white py-2.5 text-xs font-black uppercase hover:bg-rose-700 shadow-lg"
              >
                Reservar clase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESERVATION MODAL */}
      {reserveModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#141418] border border-[var(--gym-primary)]/30 p-6 space-y-5 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gym-primary)] text-black font-black">
              <CalendarIcon className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white uppercase">¿Confirmar Reserva?</h3>
              <p className="text-xs text-zinc-400">
                Vas a reservar tu cupo para <strong className="text-white">{reserveModalClass.disciplineName}</strong>.
              </p>
            </div>

            <div className="rounded-2xl bg-[#18181C] p-4 text-left space-y-2 text-xs border border-white/5">
              <p className="font-bold text-white flex items-center justify-between">
                <span>Horario:</span>
                <span className="text-[var(--gym-primary)]">{reserveModalClass.startTime} hs</span>
              </p>
              <p className="font-bold text-white flex items-center justify-between">
                <span>Coach:</span>
                <span>{reserveModalClass.coachName}</span>
              </p>
              <p className="font-bold text-white flex items-center justify-between">
                <span>Cupo Actual:</span>
                <span className="text-emerald-400">{reserveModalClass.occupied} / {reserveModalClass.maxCapacity}</span>
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setReserveModalClass(null)}
                className="flex-1 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-zinc-400 hover:text-white border border-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmReservation(reserveModalClass)}
                className="flex-1 rounded-xl bg-[var(--gym-primary)] py-3 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MERCADO PAGO CHECKOUT MODAL */}
      {payModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-[#141418] border border-[#009EE3]/40 p-6 space-y-6 shadow-[0_0_50px_rgba(0,158,227,0.25)] relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#009EE3]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header with MP branding */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-[#009EE3] text-white flex items-center justify-center font-black shadow-lg">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-[#009EE3] tracking-widest">
                      MERCADO PAGO
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                      CHECKOUT OFICIAL
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Pagar Cuota Online
                  </h3>
                </div>
              </div>
              <button
                onClick={() => !isProcessingPayment && setPayModalData(null)}
                disabled={isProcessingPayment}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Payment Summary */}
            <div className="rounded-2xl bg-[#18181C] p-4 border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/80">
                <span className="text-zinc-400 font-bold">Concepto:</span>
                <span className="text-white font-black uppercase">{payModalData.disciplineName}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/80">
                <span className="text-zinc-400 font-bold">Titular / Alumno:</span>
                <span className="text-white font-bold">{studentData?.first_name} {studentData?.last_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/80">
                <span className="text-zinc-400 font-bold">Gimnasio:</span>
                <span className="text-white font-bold">{gym?.name}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-black text-zinc-200">Total a Abonar:</span>
                <span className="text-2xl font-black text-[#009EE3]">
                  ${payModalData.amount.toLocaleString()} <span className="text-xs font-bold text-zinc-400">ARS</span>
                </span>
              </div>
            </div>

            {/* Supported Payment Methods */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-zinc-400 block tracking-wider">
                Medios de Pago Habilitados por Mercado Pago:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#0B0B0E] p-2.5 border border-white/5 text-[11px] font-bold text-zinc-300 flex flex-col items-center gap-1">
                  <CreditCard className="h-4 w-4 text-[#009EE3]" />
                  <span>Tarjetas Débito / Crédito</span>
                </div>
                <div className="rounded-xl bg-[#0B0B0E] p-2.5 border border-white/5 text-[11px] font-bold text-zinc-300 flex flex-col items-center gap-1">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Dinero en Cuenta MP</span>
                </div>
                <div className="rounded-xl bg-[#0B0B0E] p-2.5 border border-white/5 text-[11px] font-bold text-zinc-300 flex flex-col items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Transferencia / Rapipago</span>
                </div>
              </div>
            </div>

            {/* Security notice */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Tu cuota se renueva de forma automática e inmediata por 30 días al confirmar el pago.</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPayModalData(null)}
                disabled={isProcessingPayment}
                className="flex-1 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-zinc-400 hover:text-white border border-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProceedMercadoPagoCheckout}
                disabled={isProcessingPayment}
                className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-[#009EE3] hover:bg-[#0081BC] py-3.5 text-xs font-black uppercase text-white tracking-wider shadow-[0_0_25px_rgba(0,158,227,0.4)] transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Pagar con Mercado Pago</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT SUCCESS TOAST NOTIFICATION */}
      {paymentSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md rounded-2xl bg-emerald-950 border-2 border-emerald-500/50 p-4 shadow-2xl flex items-start gap-3 animate-fadeIn">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black shrink-0">
            <Check className="h-5 w-5 stroke-[3]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Pago Registrado Exitosamente
            </h4>
            <p className="text-xs text-white leading-relaxed">
              {paymentSuccessToast}
            </p>
          </div>
          <button
            onClick={() => setPaymentSuccessToast(null)}
            className="text-zinc-400 hover:text-white ml-auto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
