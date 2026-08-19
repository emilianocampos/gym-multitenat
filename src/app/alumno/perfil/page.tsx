'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { StudentBottomNav } from '@/components/layout/StudentBottomNav';
import { User, CreditCard, ShieldCheck, Dumbbell, ArrowLeft, LogOut, Award, Loader2 } from 'lucide-react';

export default function StudentProfilePage() {
  const [profile, setProfile] = useState({
    name: 'Alumno',
    dni: '-',
    email: '-',
    phone: '-',
    membershipStatus: 'ACTIVE',
    trainer: 'Profesor de Sala',
  });
  const [assignedDisciplines, setAssignedDisciplines] = useState<
    Array<{ id: string; name: string; price: number; expiration: string; status: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let studentRecord: any = null;

        if (user?.email) {
          const { data: std } = await supabase
            .from('students')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();
          if (std) studentRecord = std;
        }

        if (!studentRecord) {
          const { data: latest } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
          if (latest && latest.length > 0) studentRecord = latest[0];
        }

        if (studentRecord) {
          const { data: mems } = await supabase
            .from('memberships')
            .select('*, discipline:disciplines(id, name, price)')
            .eq('student_id', studentRecord.id)
            .order('created_at', { ascending: false });

          const mappedDisciplines = (mems || []).map((mem: any) => {
            const rawDisc = Array.isArray(mem.discipline) ? mem.discipline[0] : mem.discipline;
            return {
              id: mem.id,
              name: rawDisc?.name || 'Disciplina',
              price: Number(mem.price) || 0,
              expiration: mem.expiration_date || 'Al día',
              status: mem.status || 'ACTIVE',
            };
          });

          setAssignedDisciplines(mappedDisciplines);

          setProfile({
            name: `${studentRecord.first_name} ${studentRecord.last_name}`,
            dni: studentRecord.dni || '-',
            email: studentRecord.email || '-',
            phone: studentRecord.phone || '-',
            membershipStatus: studentRecord.status || 'ACTIVE',
            trainer: 'Coach Oficial',
          });
        }
      } catch (e) {
        console.error('Error loading student profile:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

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
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--gym-primary)] bg-zinc-800 text-2xl font-black text-[var(--gym-primary)] shadow-neon">
            {profile.name.charAt(0)}
          </div>

          <div>
            <h2 className="text-xl font-black text-white">{profile.name}</h2>
            <p className="text-xs text-zinc-400">DNI: {profile.dni} | {profile.email}</p>
          </div>

          <div
            className={`inline-flex items-center space-x-1.5 rounded-full px-4 py-1 text-xs font-extrabold border ${
              profile.membershipStatus === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : profile.membershipStatus === 'SUSPENDED'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>
              Membresía{' '}
              {profile.membershipStatus === 'ACTIVE'
                ? 'Al Día (Activo)'
                : profile.membershipStatus === 'SUSPENDED'
                ? 'Suspendida'
                : 'Inactiva / Pendiente'}
            </span>
          </div>
        </div>

        {/* Disciplinas Asignadas Details */}
        <div className="rounded-3xl bg-[#141418] p-5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)] flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4" />
              <span>Disciplinas Asignadas ({assignedDisciplines.length})</span>
            </h3>
            {assignedDisciplines.length > 0 && (
              <span className="text-[10px] font-bold text-zinc-400">
                Total: ${assignedDisciplines.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()}
              </span>
            )}
          </div>

          {assignedDisciplines.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {assignedDisciplines.map((disc) => (
                <div
                  key={disc.id}
                  className="rounded-2xl bg-[#18181C] p-3.5 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-black text-white block uppercase">{disc.name}</span>
                    <span className="text-[11px] text-zinc-400 block">
                      Vence: <strong className="text-[var(--gym-primary)] font-mono">{disc.expiration}</strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-white text-xs block">
                      ${disc.price.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 inline-block mt-0.5">
                      {disc.status === 'ACTIVE' ? 'Activa' : disc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-2">Sin disciplinas asignadas activas.</p>
          )}

          <div className="pt-2 border-t border-white/5 flex justify-between text-xs">
            <span className="text-zinc-400 font-bold">Profesor de Sala</span>
            <span className="font-extrabold text-white">{profile.trainer}</span>
          </div>
        </div>
      </main>

      <StudentBottomNav />
    </div>
  );
}
