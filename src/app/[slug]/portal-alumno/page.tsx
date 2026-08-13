'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
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
} from 'lucide-react';

interface GymPortalProps {
  params: {
    slug: string;
  };
}

interface ClassItem {
  id: string;
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
  reservedStudents: { name: string; initials: string; avatarUrl?: string }[];
}

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

  // Class Schedules & Reservations State
  const [selectedDate, setSelectedDate] = useState('2026-08-13');
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK'>('DAY');
  const [selectedProgram, setSelectedProgram] = useState('ALL');

  // Interactive Class Data (matching Screenshots 1, 2, 3, 4)
  const [classesList, setClassesList] = useState<ClassItem[]>([
    {
      id: 'cls-1',
      disciplineName: 'ENTRENAMIENTO FUNCIONAL',
      program: 'Entrenamiento Funcional',
      startTime: '08:00',
      endTime: '09:00',
      duration: '60 min',
      coachName: 'Juana Penchulef',
      coachInitials: 'JP',
      occupied: 4,
      maxCapacity: 24,
      dateStr: '2026-08-13',
      fullDateLabel: 'jueves, 13 de agosto de 2026',
      reservedStudents: [
        { name: 'Araceli Velázquez', initials: 'AV' },
        { name: 'Iris Velazquez', initials: 'IV' },
        { name: 'Patricia Torres', initials: 'PT' },
        { name: 'Melani Peralta', initials: 'MP' },
      ],
    },
    {
      id: 'cls-2',
      disciplineName: 'ENTRENAMIENTO FUNCIONAL',
      program: 'Entrenamiento Funcional',
      startTime: '14:30',
      endTime: '15:30',
      duration: '60 min',
      coachName: 'Juana Penchulef',
      coachInitials: 'JP',
      occupied: 5,
      maxCapacity: 24,
      dateStr: '2026-08-13',
      fullDateLabel: 'jueves, 13 de agosto de 2026',
      reservedStudents: [
        { name: 'Mariana Pérez', initials: 'MP' },
        { name: 'Carlos Rodríguez', initials: 'CR' },
        { name: 'Sofía Martínez', initials: 'SM' },
        { name: 'Diego Torres', initials: 'DT' },
        { name: 'Lucía Fernández', initials: 'LF' },
      ],
    },
    {
      id: 'cls-3',
      disciplineName: 'ENTRENAMIENTO FUNCIONAL',
      program: 'Entrenamiento Funcional',
      startTime: '19:30',
      endTime: '20:30',
      duration: '60 min',
      coachName: 'Juana Penchulef',
      coachInitials: 'JP',
      occupied: 8,
      maxCapacity: 24,
      dateStr: '2026-08-13',
      fullDateLabel: 'jueves, 13 de agosto de 2026',
      reservedStudents: [
        { name: 'Esteban Quito', initials: 'EQ' },
        { name: 'Valeria Blanco', initials: 'VB' },
        { name: 'Gonzalo Silva', initials: 'GS' },
        { name: 'Camila Rossi', initials: 'CR' },
        { name: 'Agustín Medina', initials: 'AM' },
        { name: 'Paula Benítez', initials: 'PB' },
        { name: 'Nicolás Vega', initials: 'NV' },
        { name: 'Florencia Castro', initials: 'FC' },
      ],
    },
    {
      id: 'cls-4',
      disciplineName: 'CROSSFIT WOD',
      program: 'CrossFit WOD',
      startTime: '09:00',
      endTime: '10:00',
      duration: '60 min',
      coachName: 'Franco Gómez',
      coachInitials: 'FG',
      occupied: 12,
      maxCapacity: 20,
      dateStr: '2026-08-13',
      fullDateLabel: 'jueves, 13 de agosto de 2026',
      reservedStudents: [
        { name: 'Lucas González', initials: 'LG' },
        { name: 'Martín Palermo', initials: 'MP' },
        { name: 'Rodrigo De Paul', initials: 'RD' },
      ],
    },
  ]);

  // User Reservation State (Track reserved class IDs by student)
  const [userReservedClassIds, setUserReservedClassIds] = useState<string[]>([]);

  // Modals / Views State
  const [quickViewClass, setQuickViewClass] = useState<ClassItem | null>(null); // Screenshot 4
  const [detailedViewClass, setDetailedViewClass] = useState<ClassItem | null>(null); // Screenshots 2 & 3
  const [reserveModalClass, setReserveModalClass] = useState<ClassItem | null>(null); // Reservation popup

  // Fetch Gym Info by Slug
  useEffect(() => {
    async function loadGymInfo() {
      try {
        const supabase = createClient();
        const { data: gymData } = await supabase
          .from('gyms')
          .select(`
            id, name, slug, email, phone, logo_url,
            gym_settings ( primary_color, banner_url, theme )
          `)
          .eq('slug', slug)
          .maybeSingle();

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
      } catch (e) {
        console.error('Error fetching gym portal info:', e);
      }
    }
    loadGymInfo();
  }, [slug]);

  // Student Login Handler
  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdentifier.trim() || !studentPassword.trim()) {
      setErrorMsg('Ingresá tu Email/DNI y Contraseña asignada.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setStudentData({
        first_name: 'Lucas',
        last_name: 'González',
        dni: studentIdentifier.includes('@') ? '40123456' : studentIdentifier,
        email: studentIdentifier.includes('@') ? studentIdentifier : 'lucas.gonzalez@email.com',
        membership: {
          discipline: 'Entrenamiento Funcional & CrossFit WOD',
          status: 'ACTIVE',
          expiration: '30 de Septiembre, 2026',
        },
        routine: [
          {
            day: 'Día 1 - Pecho & Tríceps',
            exercises: [
              { name: 'Press de Banca Plano', sets: 4, reps: '10-12', weight: '60 kg' },
              { name: 'Press Inclinado con Mancuernas', sets: 4, reps: '12', weight: '22 kg' },
              { name: 'Cruces en Polea', sets: 3, reps: '15', weight: '15 kg' },
            ],
          },
        ],
      });
      setIsLoading(false);
      setIsLoggedIn(true);
    }, 500);
  };

  // Perform Class Reservation
  const handleConfirmReservation = (clsItem: ClassItem) => {
    const studentName = studentData
      ? `${studentData.first_name} ${studentData.last_name}`
      : 'Lucas González';
    const studentInitials = studentData
      ? `${studentData.first_name[0]}${studentData.last_name[0]}`
      : 'LG';

    setClassesList((prev) =>
      prev.map((c) => {
        if (c.id === clsItem.id) {
          const alreadyIn = c.reservedStudents.some((s) => s.name === studentName);
          if (alreadyIn) return c;
          return {
            ...c,
            occupied: c.occupied + 1,
            reservedStudents: [{ name: studentName, initials: studentInitials }, ...c.reservedStudents],
          };
        }
        return c;
      })
    );

    setUserReservedClassIds((prev) => [...prev, clsItem.id]);
    setReserveModalClass(null);
    setQuickViewClass(null);
  };

  // Cancel Reservation
  const handleCancelReservation = (clsItem: ClassItem) => {
    const studentName = studentData
      ? `${studentData.first_name} ${studentData.last_name}`
      : 'Lucas González';

    setClassesList((prev) =>
      prev.map((c) => {
        if (c.id === clsItem.id) {
          return {
            ...c,
            occupied: Math.max(0, c.occupied - 1),
            reservedStudents: c.reservedStudents.filter((s) => s.name !== studentName),
          };
        }
        return c;
      })
    );

    setUserReservedClassIds((prev) => prev.filter((id) => id !== clsItem.id));
    setReserveModalClass(null);
  };

  const filteredClasses = classesList.filter((c) => {
    const matchesProgram =
      selectedProgram === 'ALL' ||
      c.program.toLowerCase() === selectedProgram.toLowerCase() ||
      c.disciplineName.toLowerCase().includes(selectedProgram.toLowerCase());
    return matchesProgram;
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
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl font-black text-black text-sm shadow-neon"
              style={{ backgroundColor: gym.primaryColor }}
            >
              {gym.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white">{gym.name}</span>
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
                <label className="text-xs font-bold text-zinc-300">Contraseña</label>
                <div className="mt-1 flex items-center rounded-xl bg-[#18181C] px-3 py-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                  <Lock className="h-4 w-4 text-zinc-400 mr-2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-white outline-none"
                    required
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
                  <p className="text-xs text-zinc-400 flex items-center gap-2">
                    <span>DNI: {studentData.dni}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="h-3 w-3" /> Membresía Activa
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-[#0B0B0E] px-4 py-2.5 rounded-xl border border-white/5 text-right w-full sm:w-auto">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Pase Asignado</span>
                <p className="text-xs font-black text-white">{studentData.membership.discipline}</p>
                <span className="text-[10px] font-semibold text-emerald-400">
                  Vence: {studentData.membership.expiration}
                </span>
              </div>
            </div>

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
                    className={`flex items-center justify-center space-x-2 rounded-xl py-3 text-xs font-black uppercase transition-all ${
                      active ? 'bg-[var(--gym-primary)] text-black shadow-neon' : 'text-zinc-400 hover:text-white'
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

                    {/* Screenshot 2 Header: JUE 13/08/2026 - RESERVAR CLASE */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--gym-primary)]">
                          JUEVES 13/08/2026
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

                    {/* Occupation Progress Bar (Screenshot 2: 4/24 Plazas ocupadas - 20 Libres) */}
                    <div className="space-y-2 rounded-2xl bg-[#18181C] p-4 border border-white/5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white font-black text-sm">
                          {detailedViewClass.occupied} / {detailedViewClass.maxCapacity}
                        </span>
                        <span className="text-zinc-400">
                          Plazas ocupadas • {detailedViewClass.maxCapacity - detailedViewClass.occupied} Libres
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-[var(--gym-primary)] transition-all duration-500"
                          style={{
                            width: `${(detailedViewClass.occupied / detailedViewClass.maxCapacity) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Notice Box */}
                    <div className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                      <p className="font-extrabold text-sm text-amber-200">¡Información de Reserva!</p>
                      <p>
                        Las reservas para esta clase cierran 2 minutos antes de la hora de inicio ({detailedViewClass.startTime} hs).
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
                          onClick={() => setReserveModalClass(detailedViewClass)}
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

                    {/* Screenshot 3: REAL RESERVED STUDENTS LIST (RESERVAS - 4/24) */}
                    <div className="rounded-3xl bg-[#18181C] p-6 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div className="flex items-center space-x-2 text-rose-400">
                          <Users className="h-5 w-5" />
                          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                            RESERVAS • {detailedViewClass.occupied} / {detailedViewClass.maxCapacity}
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500">Alumnos Anotados</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {detailedViewClass.reservedStudents.map((std, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-3 rounded-xl bg-[#141418] p-3 border border-white/5 hover:border-white/10 transition-all"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 font-bold text-xs text-white border border-[var(--gym-primary)]">
                              {std.initials}
                            </div>
                            <span className="text-xs font-extrabold text-white">{std.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* NORMAL CLASS CALENDAR & CARDS LIST (SCREENSHOT 1) */
                  <div className="space-y-5">
                    {/* Header Controls: Month/Year, Day/Week Switch, Filter Dropdown */}
                    <div className="rounded-3xl bg-[#141418] p-5 border border-white/5 shadow-card space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-2 rounded-xl bg-[#18181C] text-zinc-400 hover:text-white border border-white/5">
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-base font-black text-white px-2">agosto 2026</span>
                          <button className="p-2 rounded-xl bg-[#18181C] text-zinc-400 hover:text-white border border-white/5">
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        {/* View Switch Buttons (Día / Semana) */}
                        <div className="flex items-center space-x-2">
                          <div className="flex rounded-xl bg-[#18181C] p-1 border border-white/5">
                            <button
                              onClick={() => setViewMode('DAY')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                                viewMode === 'DAY' ? 'bg-rose-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              Día
                            </button>
                            <button
                              onClick={() => setViewMode('WEEK')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                                viewMode === 'WEEK' ? 'bg-rose-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              Semana
                            </button>
                          </div>

                          <button className="px-3 py-2 rounded-xl bg-[#18181C] text-xs font-bold text-zinc-300 border border-white/5 hover:text-white">
                            Hoy
                          </button>
                        </div>
                      </div>

                      {/* Program Filter Dropdown (Todos programas) */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">
                          jueves, 13 de agosto de 2026
                        </span>

                        <select
                          value={selectedProgram}
                          onChange={(e) => setSelectedProgram(e.target.value)}
                          className="rounded-xl bg-[#18181C] px-3 py-2 text-xs font-bold text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                        >
                          <option value="ALL">Todos programas</option>
                          <option value="Entrenamiento Funcional">Entrenamiento Funcional</option>
                          <option value="CrossFit WOD">CrossFit WOD</option>
                        </select>
                      </div>
                    </div>

                    {/* Screenshot 1 Cards List */}
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

            {/* TAB: CUOTAS */}
            {activeTab === 'CUOTAS' && (
              <div className="rounded-2xl bg-[#141418] p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-base font-black text-white">Estado de Cuota y Membresía</h3>
                    <p className="text-xs text-zinc-400">Historial de pagos y próximo vencimiento.</p>
                  </div>
                  <span className="text-xs font-black text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    Al Día
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#18181C] p-4 border border-white/5 space-y-2">
                    <span className="text-xs font-bold text-zinc-400">Plan Actual Asignado</span>
                    <p className="text-lg font-black text-white">{studentData.membership.discipline}</p>
                    <p className="text-xs text-zinc-400">Acceso ilimitado a clases y musculación.</p>
                  </div>

                  <div className="rounded-xl bg-[#18181C] p-4 border border-white/5 space-y-2">
                    <span className="text-xs font-bold text-zinc-400">Próximo Vencimiento</span>
                    <p className="text-lg font-black text-[var(--gym-primary)]">{studentData.membership.expiration}</p>
                    <p className="text-xs text-zinc-400">Aboná en recepción o consultá Mercado Pago.</p>
                  </div>
                </div>
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
    </div>
  );
}
