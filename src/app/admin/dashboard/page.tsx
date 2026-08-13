'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Users, DollarSign, AlertCircle, Calendar, Sparkles, UserPlus, ArrowUpRight, Palette, QrCode, Inbox } from 'lucide-react';

export default function AdminDashboardPage() {
  const [todayClasses, setTodayClasses] = useState<any[]>([]);

  const stats = [
    { label: 'Ingresos del Mes', value: '$0.00', change: 'Sin ingresos registrados', icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Alumnos Activos', value: '0', change: '0 activos', icon: Users, color: 'text-[var(--gym-primary)]' },
    { label: 'Cuotas Vencidas', value: '0', change: 'Sin vencimientos', icon: AlertCircle, color: 'text-rose-400' },
    { label: 'Reservas Hoy', value: '0', change: '0% ocupación', icon: Calendar, color: 'text-sky-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-6 lg:p-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">SaaS Management</span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Panel Control del Gimnasio
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Resumen financiero, cupos de clases y control de alumnos en tiempo real.</p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/rutinas/importar-excel"
              className="flex items-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-4 py-2.5 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Importar Excel IA</span>
            </Link>

            <Link
              href="/admin/personalizacion"
              className="flex items-center space-x-2 rounded-xl bg-[#141418] border border-white/10 px-4 py-2.5 text-xs font-bold text-white hover:border-[var(--gym-primary)] transition-all"
            >
              <Palette className="h-4 w-4 text-[var(--gym-primary)]" />
              <span>Personalizar UI</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="rounded-2xl bg-[#141418] p-5 border border-white/5 shadow-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{item.label}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181C] border border-white/5">
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-black text-white">{item.value}</p>
                <span className="text-[11px] font-semibold text-zinc-500">
                  {item.change}
                </span>
              </div>
            );
          })}
        </div>

        {/* Classes & Cupos Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 rounded-2xl bg-[#141418] p-6 border border-white/5 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white">Clases y Cupos de Hoy</h3>
                <p className="text-xs text-zinc-400">Control automático de capacidad para evitar sobre-reserva.</p>
              </div>
              <span className="text-xs font-bold text-[var(--gym-primary)]">Ver agenda completa</span>
            </div>

            {todayClasses.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Inbox className="h-10 w-10 text-zinc-600 mx-auto" />
                <p className="text-xs font-bold text-zinc-400">No hay clases programadas para el día de hoy.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayClasses.map((cls, idx) => (
                  <div key={idx} className="rounded-xl bg-[#18181C] p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-white">{cls.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Access & Student Portal Card */}
          <div className="lg:col-span-4 rounded-2xl bg-[#141418] p-6 border border-white/5 space-y-4">
            <h3 className="text-base font-black text-white border-b border-zinc-800 pb-3">Accesos Rápidos</h3>

            {/* Dedicated Gym Student Portal Card */}
            <div className="rounded-xl bg-gradient-to-b from-[#18181C] to-[#141418] p-4 border border-[var(--gym-primary)]/30 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--gym-primary)]">
                  Portal de Alumnos de tu Gym
                </span>
                <span className="h-2 w-2 rounded-full bg-[var(--gym-primary)] animate-pulse" />
              </div>
              <p className="text-xs text-zinc-300 font-semibold">
                Tus alumnos ingresan a ver su rutina y reservar clases desde su propio portal:
              </p>
              <div className="rounded-lg bg-[#0B0B0E] p-2.5 text-[11px] font-mono text-zinc-400 truncate border border-white/5">
                .../irongym/portal-alumno
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/irongym/portal-alumno`;
                    navigator.clipboard.writeText(url);
                    alert('¡URL del Portal de Alumnos copiada al portapapeles!');
                  }}
                  className="flex-1 rounded-lg bg-[#18181C] py-2 text-[11px] font-extrabold text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
                >
                  Copiar URL
                </button>
                <Link
                  href="/irongym/portal-alumno"
                  target="_blank"
                  className="flex-1 rounded-lg bg-[var(--gym-primary)] py-2 text-[11px] font-black uppercase text-black text-center shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
                >
                  Abrir Portal
                </Link>
              </div>
            </div>

            <Link
              href="/admin/alumnos"
              className="flex items-center justify-between rounded-xl bg-[#18181C] p-3 text-xs font-bold text-white hover:bg-[var(--gym-primary)] hover:text-black transition-all group"
            >
              <div className="flex items-center space-x-3">
                <UserPlus className="h-4 w-4" />
                <span>Registrar Nuevo Alumno</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <Link
              href="/admin/qr"
              className="flex items-center justify-between rounded-xl bg-[#18181C] p-3 text-xs font-bold text-white hover:bg-[var(--gym-primary)] hover:text-black transition-all group"
            >
              <div className="flex items-center space-x-3">
                <QrCode className="h-4 w-4" />
                <span>Generar QR de Rutinas</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <Link
              href="/admin/rutinas/importar-excel"
              className="flex items-center justify-between rounded-xl bg-[#18181C] p-3 text-xs font-bold text-white hover:bg-[var(--gym-primary)] hover:text-black transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="h-4 w-4 text-[var(--gym-primary)] group-hover:text-black" />
                <span>Importar Rutina Excel IA</span>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
