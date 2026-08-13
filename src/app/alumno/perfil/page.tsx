'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { StudentBottomNav } from '@/components/layout/StudentBottomNav';
import { User, CreditCard, ShieldCheck, Dumbbell, ArrowLeft, LogOut, Award } from 'lucide-react';

export default function StudentProfilePage() {
  const profile = {
    name: 'Lucas Silva',
    dni: '38.452.190',
    email: 'lucas@gmail.com',
    phone: '+54 11 5432-1098',
    membershipStatus: 'ACTIVE',
    nextExpiration: '01/09/2026',
    discipline: 'CrossFit WOD',
    trainer: 'Carlos Gómez',
  };

  return (
    <div className="min-h-screen bg-[var(--gym-bg)] pb-28 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0B0B0E]/90 px-4 py-3 backdrop-blur-md">
        <Link href="/alumno/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181C] text-zinc-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)]">
          Mi Perfil
        </span>
        <div className="w-9" />
      </header>

      <main className="mx-auto max-w-md px-4 space-y-6 pt-2">
        {/* Profile Card */}
        <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 shadow-2xl text-center space-y-4">
          <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--gym-primary)] shadow-neon">
            <Image
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
              alt="Avatar"
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">{profile.name}</h2>
            <p className="text-xs text-zinc-400">DNI: {profile.dni} | {profile.email}</p>
          </div>

          <div className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/10 px-4 py-1 text-xs font-extrabold text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4" />
            <span>Membresía Al Día</span>
          </div>
        </div>

        {/* Membership Details */}
        <div className="rounded-3xl bg-[#141418] p-5 border border-white/5 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">
            Detalles de Membresía
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-400 font-bold">Disciplina Activa</span>
              <span className="font-extrabold text-white">{profile.discipline}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-400 font-bold">Profesor Asignado</span>
              <span className="font-extrabold text-white">{profile.trainer}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-400 font-bold">Próximo Vencimiento</span>
              <span className="font-mono font-bold text-[var(--gym-primary)]">{profile.nextExpiration}</span>
            </div>
          </div>
        </div>
      </main>

      <StudentBottomNav />
    </div>
  );
}
