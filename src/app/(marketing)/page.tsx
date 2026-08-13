'use client';

import React from 'react';
import Link from 'next/link';
import { Dumbbell, ShieldCheck, Sparkles, Smartphone, CreditCard, QrCode, Palette, Zap, ArrowRight } from 'lucide-react';

export default function SaaSMarketingLandingPage() {
  const features = [
    {
      title: 'Portal Alumno Mobile-First',
      desc: 'Diseño fitness ultra moderno accesible mediante inicio de sesión o registro de alumno.',
      icon: Smartphone,
    },
    {
      title: 'Importación de Rutinas con IA',
      desc: 'Subí tus planillas de Excel (.xlsx). La IA estructurará los ejercicios y asignará series/reps al instante.',
      icon: Sparkles,
    },
    {
      title: 'Cobros Mercado Pago & Mora',
      desc: 'Cobrá cuotas e inscripciones automáticamente con webhook idempotente y cálculo de recargos por días de tolerancia.',
      icon: CreditCard,
    },
    {
      title: 'Personalización Visual 100%',
      desc: 'Personalizá el fondo, colores neón, tarjetas, logo y tema (Claro/Oscuro/Degradado) desde tu panel admin.',
      icon: Palette,
    },
    {
      title: 'Reservas con Control de Cupos',
      desc: 'Evitá sobrecupos con transacciones atómicas a nivel base de datos. Si la clase es 20/20 se bloquea automáticamente.',
      icon: Zap,
    },
    {
      title: 'Códigos QR para Pizarrón y Rutinas',
      desc: 'Reemplazá el pizarrón físico. El alumno escanea el QR en el gym y abre su rutina del día en su celular.',
      icon: QrCode,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white selection:bg-[var(--gym-primary)] selection:text-black">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0B0B0E]/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gym-primary)] text-black font-black text-xl shadow-[0_0_15px_rgba(204,255,0,0.3)]">
            G
          </div>
          <span className="text-xl font-extrabold tracking-wider text-white">GYM SAAS</span>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
            Iniciar Sesión
          </Link>
          <Link
            href="/registro"
            className="flex items-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-5 py-2.5 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
          >
            <span>Crear mi Gimnasio</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center space-x-2 rounded-full bg-[#18181C] px-4 py-1.5 border border-white/10 shadow-neon-subtle">
            <Sparkles className="h-4 w-4 text-[var(--gym-primary)]" />
            <span className="text-xs font-bold text-zinc-300">
              Plataforma SaaS Multi-Tenant para Gimnasios
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-none">
            Digitalizá tu gimnasio <br />
            <span className="text-[var(--gym-primary)] drop-shadow-[0_0_30px_rgba(204,255,0,0.4)]">
              sin depender del papel
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-400 font-medium">
            Administrá alumnos, rutinas con IA, cupos de clases, cobros por Mercado Pago y personalizá el portal mobile con los colores de tu marca.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/registro"
              className="w-full sm:w-auto flex items-center justify-center space-x-3 rounded-2xl bg-[var(--gym-primary)] px-8 py-4 text-sm font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
            >
              <span>Probar gratis 7 Días</span>
              <ArrowRight className="h-5 w-5" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-[#141418] border border-white/10 px-8 py-4 text-sm font-bold text-white hover:border-[var(--gym-primary)] transition-all"
            >
              <span>Ingresar a la Plataforma</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-[#141418] py-20 px-6 border-t border-white/5">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">Funcionalidades SaaS</span>
            <h2 className="text-3xl lg:text-4xl font-black text-white">Todo lo que tu gimnasio necesita para crecer</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="rounded-3xl bg-[#18181C] p-6 border border-white/5 space-y-4 hover:border-[var(--gym-primary)]/40 transition-all">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gym-primary)]/10 text-[var(--gym-primary)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-[#0B0B0E] py-8 text-center text-xs text-zinc-500">
        <p>© 2026 GYM SaaS. Plataforma Multi-Tenant para la Administración Integral de Gimnasios.</p>
      </footer>
    </div>
  );
}
