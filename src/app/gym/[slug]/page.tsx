'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Calendar, MapPin, Phone, Loader2, Inbox } from 'lucide-react';
import { parseDisciplineMeta } from '@/lib/utils/discipline-meta';
import { Discipline } from '@/types/database';

export default function GymPublicQRPage({ params }: { params: { slug: string } }) {
  const [gymInfo, setGymInfo] = useState({
    name: 'Iron Gym Center',
    slug: params.slug,
    address: 'Av. Corrientes 1234, Buenos Aires',
    phone: '+54 11 4567-8900',
    bannerUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
  });
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: gymData } = await supabase
          .from('gyms')
          .select('id, name, slug, phone, email, gym_settings(banner_url, primary_color)')
          .eq('slug', params.slug)
          .maybeSingle();

        if (gymData) {
          const settings = Array.isArray(gymData.gym_settings) ? gymData.gym_settings[0] : gymData.gym_settings;
          setGymInfo((prev) => ({
            ...prev,
            name: gymData.name,
            phone: gymData.phone || prev.phone,
            bannerUrl: settings?.banner_url || prev.bannerUrl,
          }));
        }

        // Fetch ONLY real disciplines loaded in database
        const { data: dbDisciplines } = await supabase
          .from('disciplines')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (dbDisciplines) {
          const mapped = dbDisciplines.map((d: any) => {
            const meta = parseDisciplineMeta(d);
            return {
              ...d,
              description: meta.cleanDescription,
              coach_name: meta.coach_name,
              schedules_summary: meta.schedules_summary,
              price_2x: meta.price_2x,
              price_3x: meta.price_3x,
              price_6x: meta.price_6x,
              price_single: meta.price_single,
            };
          });
          setDisciplines(mapped);
        } else {
          setDisciplines([]);
        }
      } catch (err) {
        console.error('Error fetching disciplines:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [params.slug]);

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
            {gymInfo.name.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="text-2xl font-black text-white">{gymInfo.name}</h1>
          <div className="flex flex-col items-center space-y-1 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[var(--gym-primary)]" /> {gymInfo.address}</span>
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-[var(--gym-primary)]" /> {gymInfo.phone}</span>
          </div>

          <div className="pt-2 flex items-center justify-center space-x-2">
            <Link
              href={`/${params.slug}/portal-alumno`}
              className="flex-1 rounded-xl bg-[var(--gym-primary)] py-3 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
            >
              Ingresar al Portal
            </Link>
            <Link
              href="/registro"
              className="flex-1 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
            >
              Registrarse
            </Link>
          </div>
        </div>

        {/* Disciplines list */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">
            Disciplinas y Aranceles por Frecuencia
          </h3>

          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 text-[var(--gym-primary)] animate-spin mx-auto" />
            </div>
          ) : disciplines.length === 0 ? (
            <div className="rounded-2xl bg-[#141418] p-8 border border-white/5 text-center space-y-2">
              <Inbox className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-bold text-zinc-400">No hay disciplinas cargadas en este gimnasio aún.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disciplines.map((d) => (
                <div key={d.id} className="rounded-2xl bg-[#141418] p-4 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-white">{d.name}</h4>
                    <span className="text-[11px] font-bold text-zinc-400">{d.duration_minutes} min</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                    <div className="rounded-lg bg-[#18181C] p-1.5 border border-white/5">
                      <span className="text-[9px] text-zinc-400 font-bold block">2x / sem</span>
                      <span className="text-[11px] font-black text-white">
                        ${(d.price_2x || Math.round(d.price * 0.7)).toLocaleString()}
                      </span>
                    </div>
                    <div className="rounded-lg bg-[#18181C] p-1.5 border border-[var(--gym-primary)]/30 bg-[var(--gym-primary)]/5">
                      <span className="text-[9px] text-[var(--gym-primary)] font-black block">3x / sem</span>
                      <span className="text-[11px] font-black text-[var(--gym-primary)]">
                        ${(d.price_3x || Math.round(d.price * 0.85)).toLocaleString()}
                      </span>
                    </div>
                    <div className="rounded-lg bg-[#18181C] p-1.5 border border-white/5">
                      <span className="text-[9px] text-zinc-400 font-bold block">Pase Libre</span>
                      <span className="text-[11px] font-black text-white">
                        ${(d.price_6x || d.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
