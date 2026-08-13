'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { StudentBottomNav } from '@/components/layout/StudentBottomNav';
import { Play, Flame, Dumbbell, Clock, QrCode, AlertCircle, LogOut } from 'lucide-react';
import { Routine, Profile, Student } from '@/types/database';

export default function StudentDashboardPage() {
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Fetch student profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserProfile(profile);

            // Fetch active routine for student
            const { data: routine } = await supabase
              .from('routines')
              .select('*, routine_days(*, routine_exercises(*))')
              .eq('student_id', user.id)
              .eq('is_active', true)
              .single();

            if (routine) {
              setActiveRoutine(routine);
            }
          }
        }
      } catch (err) {
        console.log('Cargando portal alumno...');
      } finally {
        setIsLoading(false);
      }
    }

    loadStudentData();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const studentName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Alumno';

  return (
    <div className="min-h-screen bg-[var(--gym-bg)] pb-28 text-white">
      {/* Top Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0B0B0E]/80 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-[var(--gym-primary)] shadow-[0_0_10px_rgba(204,255,0,0.3)] bg-zinc-800 flex items-center justify-center font-black text-xs text-[var(--gym-primary)]">
            {userProfile ? userProfile.first_name.charAt(0) : 'A'}
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400">Portal del Alumno</span>
            <h1 className="text-base font-extrabold tracking-tight text-white">{studentName}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/c/mi-gimnasio"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181C] text-[var(--gym-primary)] border border-white/10 hover:border-[var(--gym-primary)]"
            title="Ver QR del Gimnasio"
          >
            <QrCode className="h-5 w-5" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181C] text-rose-400 border border-white/10 hover:border-rose-500"
            title="Cerrar Sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 space-y-6 pt-2">
        {/* Streak & Status Pill Banner */}
        <div className="flex items-center justify-between rounded-2xl bg-[#141418] p-4 border border-white/5 shadow-card">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gym-primary)]/10 text-[var(--gym-primary)]">
              <Flame className="h-6 w-6 text-[var(--gym-primary)]" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Racha de entrenamiento</p>
              <p className="text-sm font-extrabold text-white">0 días consecutivos</p>
            </div>
          </div>

          <div className="rounded-full bg-[#1F1F24] px-3 py-1 text-[11px] font-black uppercase text-zinc-400 border border-white/10">
            HOY
          </div>
        </div>

        {/* ACTIVE ROUTINE OR EMPTY STATE */}
        {activeRoutine ? (
          <div className="relative overflow-hidden rounded-3xl bg-[#141418] border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[var(--gym-primary)] px-3 py-1 text-[10px] font-black uppercase text-black">
                Rutina Asignada
              </span>
              <span className="text-xs font-bold text-zinc-400">{activeRoutine.goal || 'General'}</span>
            </div>

            <h2 className="text-2xl font-black uppercase text-white tracking-tight">{activeRoutine.name}</h2>
            <p className="text-xs text-zinc-400">{activeRoutine.description || 'Seguí las series e indicaciones de tu profesor.'}</p>

            <Link
              href="/alumno/rutina"
              className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-[var(--gym-primary)] py-3.5 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
            >
              <Play className="h-4 w-4 fill-black" />
              <span>Abrir Mi Rutina</span>
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#141418] p-8 border border-white/5 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#18181C] text-zinc-400 border border-white/10">
              <Dumbbell className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Bienvenido, {userProfile?.first_name || 'Alumno'}</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Aún no tenés una rutina cargada en el sistema. Tu profesor podrá crearla o importarla desde Excel para verla en tu app.
              </p>
            </div>
          </div>
        )}

        {/* PROGRESS RESULT / STATICS WIDGET ZERO STATE */}
        <div className="rounded-3xl bg-[#141418] p-5 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gym-primary)]">
                RESULTADOS DE PROGRESO
              </span>
              <h3 className="text-lg font-black text-white">Estadísticas de la Semana</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-[#18181C] p-4 border border-white/5">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-zinc-800 text-zinc-500">
                <span className="text-xl font-black text-white">0%</span>
              </div>
              <span className="mt-2 text-xs font-bold text-zinc-400">Meta Semanal</span>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-[#18181C] p-4 border border-white/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Calorías Quemadas</span>
                <p className="text-2xl font-black text-white">0 <span className="text-xs font-bold text-zinc-500">Kcal</span></p>
              </div>

              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tiempo Invertido</span>
                <p className="text-base font-extrabold text-white">0h 0m</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Nav */}
      <StudentBottomNav />
    </div>
  );
}
