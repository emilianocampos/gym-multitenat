'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { QrCode, Dumbbell, ShieldCheck, Calendar, CreditCard, Sparkles, MapPin, Phone } from 'lucide-react';

export default function GymPublicQRPage({ params }: { params: { slug: string } }) {
  const gymInfo = {
    name: 'Iron Gym Center',
    slug: params.slug,
    address: 'Av. Corrientes 1234, Buenos Aires',
    phone: '+54 11 4567-8900',
    bannerUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    disciplines: [
      { name: 'CrossFit WOD', price: '$25,000 / mes', schedule: 'Lun a Vie 08:00 - 21:00 hs' },
      { name: 'Musculación Libre', price: '$20,000 / mes', schedule: 'Lun a Sáb 07:00 - 23:00 hs' },
      { name: 'Spinning HIIT', price: '$22,000 / mes', schedule: 'Mar y Jue 18:00 hs' },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white selection:bg-[var(--gym-primary)] selection:text-black">
      {/* Banner */}
      <div className="relative h-48 sm:h-64 w-full">
        <Image
          src={gymInfo.bannerUrl}
          alt={gymInfo.name}
          fill
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-transparent to-transparent" />
      </div>

      <main className="mx-auto max-w-md px-5 -mt-16 relative z-10 space-y-6 pb-12">
        {/* Gym Header Badge */}
        <div className="rounded-3xl bg-[#141418] p-5 border border-white/10 shadow-2xl text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gym-primary)] text-black font-black text-2xl shadow-neon">
            IG
          </div>
          <h1 className="text-2xl font-black text-white">{gymInfo.name}</h1>
          <div className="flex flex-col items-center space-y-1 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[var(--gym-primary)]" /> {gymInfo.address}</span>
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-[var(--gym-primary)]" /> {gymInfo.phone}</span>
          </div>

          <div className="pt-2 flex items-center justify-center space-x-2">
            <Link
              href="/alumno/dashboard"
              className="flex-1 rounded-xl bg-[var(--gym-primary)] py-3 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
            >
              Ingresar al Portal
            </Link>
            <Link
              href="/registro"
              className="flex-1 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
            >
              Primera Clase Gratis
            </Link>
          </div>
        </div>

        {/* Disciplines list */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">
            Disciplinas y Precios
          </h3>

          <div className="space-y-3">
            {gymInfo.disciplines.map((d, idx) => (
              <div key={idx} className="rounded-2xl bg-[#141418] p-4 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-white">{d.name}</h4>
                  <span className="text-xs font-black text-[var(--gym-primary)]">{d.price}</span>
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" /> {d.schedule}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
