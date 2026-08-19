'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Dumbbell, Search, PlusCircle, Inbox } from 'lucide-react';
import { Exercise } from '@/types/database';

export default function AdminExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 md:ml-64 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">Biblioteca de Ejercicios</span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Banco de Ejercicios del Gimnasio
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Buscá, ocultá o agregá ejercicios personalizados con GIFs y explicaciones.</p>
          </div>

          <button className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-6 py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all">
            <PlusCircle className="h-4 w-4" />
            <span>Crear Ejercicio Custom</span>
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 shadow-card">
          {exercises.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-extrabold text-white">Banco de Ejercicios Vacío</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Los ejercicios que importes desde tu repositorio externo o agregues manualmente se mostrarán aquí.
              </p>
            </div>
          ) : (
            <div className="p-4">Lista de ejercicios</div>
          )}
        </div>
      </main>
    </div>
  );
}
