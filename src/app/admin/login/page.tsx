'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Mail, Lock, ArrowRight, RefreshCw, AlertCircle, Building } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Ingresá tu email y contraseña de administrador.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        setErrorMsg('Credenciales administrativas inválidas.');
        return;
      }

      // Validar rol de usuario (GYM_OWNER, GYM_ADMIN, SUPER_ADMIN)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, gym_id')
        .eq('id', data.user.id)
        .single();

      setIsLoading(false);

      if (profile && ['GYM_OWNER', 'GYM_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
        router.push(redirectPath);
      } else {
        setErrorMsg('Tu cuenta no posee permisos de administración para este gimnasio.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Error al conectar con el servidor.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gym-primary)] text-black font-black text-2xl shadow-neon">
              G
            </div>
            <span className="text-2xl font-black tracking-wider text-white">GYM SAAS</span>
          </Link>
          <div className="flex items-center justify-center space-x-1.5 text-[var(--gym-primary)] pt-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-black uppercase tracking-widest">Acceso Administrativo</span>
          </div>
          <p className="text-xs text-zinc-400">Ingresá con la cuenta del dueño o administrador del gimnasio.</p>
        </div>

        {/* Card Form */}
        <div className="rounded-3xl bg-[#141418] p-6 sm:p-8 border border-white/5 shadow-2xl space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300">Email Administrativo</label>
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
              <label className="text-xs font-bold text-zinc-300">Contraseña</label>
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-[var(--gym-primary)] py-4 text-sm font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Panel Admin</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-zinc-400">
            ¿Querés registrar un nuevo gimnasio con 7 días gratis?{' '}
            <Link href="/registro" className="font-extrabold text-[var(--gym-primary)] hover:underline">
              Registrar Gimnasio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
