'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { ClipboardList, PlusCircle, Sparkles, Inbox } from 'lucide-react';
import { Routine } from '@/types/database';

export default function AdminRoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-6 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">Entrenamiento</span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Gestión de Rutinas
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Creá y asigná planes de entrenamiento manualmente o importá desde Excel mediante IA.</p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/rutinas/importar-excel"
              className="flex items-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-5 py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Importar Excel IA</span>
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 shadow-card">
          {routines.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-extrabold text-white">Sin rutinas creadas</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Utilizá la función de Importar Excel IA para transformar tus planillas en rutinas interactivas.
              </p>
            </div>
          ) : (
            <div className="p-4">Lista de rutinas</div>
          )}
        </div>
      </main>
    </div>
  );
}
