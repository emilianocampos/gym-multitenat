'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Dumbbell, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2, Lock, Mail, Building, AlertCircle } from 'lucide-react';

export default function GymRegistrationPage() {
  const router = useRouter();
  const [gymName, setGymName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymName || !email || !password) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const slug = gymName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // 1. Crear Usuario Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: 'Dueño',
            last_name: gymName,
            role: 'GYM_OWNER',
          },
        },
      });

      if (authError) {
        setIsLoading(false);
        setErrorMsg(authError.message || 'Error al crear la cuenta de usuario.');
        return;
      }

      const userId = authData.user?.id;
      if (userId) {
        // 2. Crear Gimnasio (Tenant con Trial 7 días)
        const { data: gym, error: gymError } = await supabase
          .from('gyms')
          .insert({
            name: gymName,
            slug,
            email,
            status: 'TRIAL',
            trial_started_at: new Date().toISOString(),
            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (gym) {
          // 3. Crear o actualizar Profile vinculado al Gym con Rol GYM_OWNER
          await supabase.from('profiles').upsert({
            id: userId,
            gym_id: gym.id,
            first_name: 'Dueño',
            last_name: gymName,
            email,
            role: 'GYM_OWNER',
          });

          // 4. Crear Configuración Inicial del Gimnasio
          await supabase.from('gym_settings').insert({
            gym_id: gym.id,
            primary_color: '#CCFF00',
            secondary_color: '#141418',
            background_color: '#0B0B0E',
            surface_color: '#18181C',
            theme: 'DARK',
          });
        }
      }

      setIsLoading(false);

      // 5. Redirigir al Login para iniciar sesión en el Panel Admin
      router.push('/login?registered=true');
    } catch (err: any) {
      setIsLoading(false);
      // Direct access fallback to login
      router.push('/login?registered=true');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gym-primary)] text-black font-black text-xl shadow-neon">
              G
            </div>
            <span className="text-2xl font-extrabold tracking-wider text-white">GYM SAAS</span>
          </Link>
          <h1 className="text-2xl font-black text-white">Registrá tu Gimnasio</h1>
          <p className="text-xs text-zinc-400">Comenzá con 7 días de prueba gratuita. Ingreso automático al Panel Admin.</p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl bg-[#141418] p-6 sm:p-8 border border-white/5 shadow-2xl space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300">Nombre del Gimnasio *</label>
              <div className="mt-1 flex items-center rounded-xl bg-[#18181C] px-3 py-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                <Building className="h-4 w-4 text-zinc-400 mr-2" />
                <input
                  type="text"
                  placeholder="Ej. Iron Gym Center"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300">Email Administrativo *</label>
              <div className="mt-1 flex items-center rounded-xl bg-[#18181C] px-3 py-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                <Mail className="h-4 w-4 text-zinc-400 mr-2" />
                <input
                  type="email"
                  placeholder="admin@irongym.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300">Contraseña *</label>
              <div className="mt-1 flex items-center rounded-xl bg-[#18181C] px-3 py-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                <Lock className="h-4 w-4 text-zinc-400 mr-2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300">Confirmar Contraseña *</label>
              <div className="mt-1 flex items-center rounded-xl bg-[#18181C] px-3 py-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                <Lock className="h-4 w-4 text-zinc-400 mr-2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none"
                  required
                />
              </div>
            </div>

            {/* Trial badge info */}
            <div className="flex items-center space-x-2 rounded-xl bg-[#18181C] p-3 text-[11px] text-zinc-300 border border-white/5">
              <CheckCircle2 className="h-4 w-4 text-[var(--gym-primary)] flex-shrink-0" />
              <span>Crea tu gym, usuario GYM_OWNER y configuración con 7 días de Trial.</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-[var(--gym-primary)] py-4 text-sm font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] active:scale-98 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Creando Gimnasio...</span>
                </>
              ) : (
                <>
                  <span>Crear Gimnasio e Ingresar</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-zinc-400">
            ¿Ya tenés un gimnasio registrado?{' '}
            <Link href="/admin/login" className="font-extrabold text-[var(--gym-primary)] hover:underline">
              Iniciar Sesión en Panel Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
