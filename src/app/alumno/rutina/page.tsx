'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StudentBottomNav } from '@/components/layout/StudentBottomNav';
import { ArrowLeft, Dumbbell, Inbox } from 'lucide-react';
import { RoutineExercise } from '@/types/database';

export default function StudentRoutinePlayerPage() {
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);

  return (
    <div className="min-h-screen bg-[var(--gym-bg)] pb-28 text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0B0B0E]/90 px-4 py-3 backdrop-blur-md">
        <Link href="/alumno/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181C] text-zinc-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rutina del Día</span>
          <h1 className="text-sm font-extrabold text-white">Mi Rutina</h1>
        </div>
        <div className="w-9" />
      </header>

      <main className="mx-auto max-w-md px-4 space-y-6 pt-2">
        {exercises.length === 0 ? (
          <div className="rounded-3xl bg-[#141418] p-8 border border-white/5 shadow-card text-center space-y-3">
            <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-extrabold text-white">No tenés ejercicios cargados para hoy</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Cuando tu profesor te asigne o importe una rutina, los ejercicios y series aparecerán listados aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exercises.map((item) => (
              <div key={item.id} className="rounded-3xl bg-[#141418] p-5 border border-white/5">
                <span className="text-sm font-extrabold text-white">Ejercicio</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <StudentBottomNav />
    </div>
  );
}
