'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StudentBottomNav } from '@/components/layout/StudentBottomNav';
import { ArrowLeft, Inbox } from 'lucide-react';
import { ClassSchedule } from '@/types/database';

export default function StudentReservationsPage() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);

  return (
    <div className="min-h-screen bg-[var(--gym-bg)] pb-28 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0B0B0E]/90 px-4 py-3 backdrop-blur-md">
        <Link href="/alumno/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181C] text-zinc-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)]">
          Reserva de Clases
        </span>
        <div className="w-9" />
      </header>

      <main className="mx-auto max-w-md px-4 space-y-6 pt-2">
        {schedules.length === 0 ? (
          <div className="rounded-3xl bg-[#141418] p-8 border border-white/5 shadow-card text-center space-y-3">
            <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-extrabold text-white">Sin clases programadas</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Actualmente no hay clases ni cupos de disciplinas publicados para reservar el día de hoy.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((s) => (
              <div key={s.id} className="rounded-3xl bg-[#141418] p-5 border border-white/5">
                <span className="text-sm font-extrabold text-white">{s.start_time} - {s.end_time}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <StudentBottomNav />
    </div>
  );
}
