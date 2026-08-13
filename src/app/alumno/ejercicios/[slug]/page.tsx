'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { StudentBottomNav } from '@/components/layout/StudentBottomNav';
import { ArrowLeft, Play, Info, AlertTriangle, Lightbulb, Dumbbell, ShieldCheck } from 'lucide-react';

export default function StudentExerciseDetailPage({ params }: { params: { slug: string } }) {
  // Exercise detail mockup from Global Library (Press Banca / Sentadillas)
  const exercise = {
    name: 'Press de Banca con Barra',
    muscleGroup: 'Pecho (Pectoral Mayor)',
    secondaryMuscles: ['Tríceps', 'Deltoides Anterior'],
    equipment: 'Barra Olímpica + Banco Plano',
    level: 'Intermedio',
    gifUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
    executionSteps: [
      'Acostarse en el banco plano con los pies apoyados firmemente en el suelo.',
      'Agarrar la barra a un ancho ligeramente mayor al de los hombros.',
      'Desbloquear la barra y bajar suavemente hasta el esternón manteniendo los codos a 45°.',
      'Empujar con fuerza la barra hasta la extensión completa de codos sin hiper-extender.',
    ],
    tips: 'Retraé las escápulas durante todo el movimiento para proteger la articulación del hombro.',
    commonMistakes: 'Rebotar la barra contra el pecho o despegar la cadera del banco durante el empuje.',
  };

  return (
    <div className="min-h-screen bg-[var(--gym-bg)] pb-28 text-white">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0B0B0E]/90 px-4 py-3 backdrop-blur-md">
        <Link href="/alumno/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181C] text-zinc-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)]">
          Detalle del Ejercicio
        </span>
        <div className="w-9" />
      </header>

      <main className="mx-auto max-w-md px-4 space-y-6 pt-2">
        {/* GIF / Video Media Container */}
        <div className="relative overflow-hidden rounded-3xl bg-[#141418] border border-white/10 shadow-2xl">
          <div className="relative h-64 w-full">
            <Image
              src={exercise.gifUrl}
              alt={exercise.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-transparent to-transparent" />
            <div className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase text-[var(--gym-primary)]">
              {exercise.level}
            </div>
          </div>
        </div>

        {/* Title & Muscle Pills */}
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-white">{exercise.name}</h1>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--gym-primary)]/10 px-3 py-1 text-[11px] font-extrabold text-[var(--gym-primary)] border border-[var(--gym-primary)]/20">
              Principal: {exercise.muscleGroup}
            </span>
            {exercise.secondaryMuscles.map((m, idx) => (
              <span key={idx} className="rounded-full bg-[#1F1F24] px-3 py-1 text-[11px] font-bold text-zinc-300">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* How to execute - Step by Step */}
        <div className="rounded-3xl bg-[#141418] p-5 border border-white/5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)] flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-[var(--gym-primary)]" /> Cómo Realizarlo
          </h3>

          <div className="space-y-3">
            {exercise.executionSteps.map((step, idx) => (
              <div key={idx} className="flex items-start space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gym-primary)] text-black font-black text-xs shrink-0">
                  {idx + 1}
                </div>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Professional Tips */}
        <div className="rounded-3xl bg-emerald-500/5 p-5 border border-emerald-500/20 space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-emerald-400" /> Consejo Técnico
          </h3>
          <p className="text-xs text-emerald-200/90 font-medium leading-relaxed">{exercise.tips}</p>
        </div>

        {/* Common Mistakes */}
        <div className="rounded-3xl bg-rose-500/5 p-5 border border-rose-500/20 space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" /> Errores Comunes a Evitar
          </h3>
          <p className="text-xs text-rose-200/90 font-medium leading-relaxed">{exercise.commonMistakes}</p>
        </div>
      </main>

      <StudentBottomNav />
    </div>
  );
}
