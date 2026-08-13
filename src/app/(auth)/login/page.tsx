'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, ArrowRight, RefreshCw, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '';
  const isRegistered = searchParams.get('registered') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Ingresá tu email y contraseña.');
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
        setErrorMsg('Credenciales inválidas. Por favor verificá tu email y contraseña.');
        return;
      }

      setIsLoading(false);
      router.push(redirectPath || '/admin/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Error al conectar con el servidor de autenticación.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col justify-center px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Logo Branding Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gym-primary)] text-black font-black text-2xl shadow-neon">
              G
            </div>
            <span className="text-2xl font-black tracking-wider text-white">GYM SAAS</span>
          </Link>
          <h1 className="text-xl font-black text-white">Acceso a la Plataforma</h1>
          <p className="text-xs text-zinc-400">Ingresá tus credenciales para acceder a tu panel de administración.</p>
        </div>

        {/* Success Alert if coming from Registration */}
        {isRegistered && (
          <div className="rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/20 text-xs font-bold text-emerald-400 flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>¡Gimnasio registrado con éxito! Inicia sesión para ingresar al Panel Admin.</span>
          </div>
        )}

        {/* Login Form Card */}
        <div className="rounded-3xl bg-[#141418] p-6 sm:p-8 border border-white/5 shadow-2xl space-y-5">
          <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800">
            <ShieldCheck className="h-4 w-4 text-[var(--gym-primary)]" />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Panel Admin Gym</span>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300">Email Administrativo</label>
              <div className="mt-1 flex items-center rounded-xl bg-[#18181C] px-3 py-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                <Mail className="h-4 w-4 text-zinc-400 mr-2" />
                <input
                  type="email"
                  placeholder="ejemplo@gimnasio.com"
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
              className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-[var(--gym-primary)] py-4 text-sm font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] active:scale-98 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Panel Admin</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="text-center pt-2 text-xs text-zinc-400">
            <p>
              ¿Querés registrar un nuevo gimnasio?{' '}
              <Link href="/registro" className="font-extrabold text-[var(--gym-primary)] hover:underline">
                Probar 7 Días Gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

