'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Search, Home, ShoppingBag, User } from 'lucide-react';

export function StudentBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Estadísticas', href: '/alumno/estadisticas', icon: BarChart3 },
    { label: 'Buscar', href: '/alumno/ejercicios', icon: Search },
    { label: 'Inicio', href: '/alumno/dashboard', icon: Home, isCenter: true },
    { label: 'Tienda', href: '/alumno/tienda', icon: ShoppingBag },
    { label: 'Perfil', href: '/alumno/perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-3xl bg-[#141418]/90 p-2 backdrop-blur-xl border border-white/10 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative -top-3 flex flex-col items-center justify-center"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-[var(--gym-primary)] text-black shadow-[0_0_20px_rgba(204,255,0,0.4)] scale-110'
                      : 'bg-[#1F1F24] text-white hover:bg-[var(--gym-primary)] hover:text-black'
                  }`}
                >
                  <Icon className="h-6 w-6 stroke-[2.5]" />
                </div>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gym-primary)]">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-all duration-200 ${
                isActive ? 'text-[var(--gym-primary)] scale-105' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-1 text-[10px] font-medium tracking-tight">{item.label}</span>
              {isActive && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--gym-primary)] shadow-[0_0_8px_rgba(204,255,0,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
