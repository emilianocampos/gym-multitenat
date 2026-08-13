'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Dumbbell,
  ClipboardList,
  Calendar,
  CreditCard,
  ShoppingBag,
  QrCode,
  Palette,
  Settings,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  highlight?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();

  const menuGroups: MenuGroup[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Alumnos', href: '/admin/alumnos', icon: Users },
        { label: 'Profesores', href: '/admin/profesores', icon: UserCheck },
        { label: 'Disciplinas', href: '/admin/disciplinas', icon: Dumbbell },
      ],
    },
    {
      title: 'Rutinas & Clases',
      items: [
        { label: 'Rutinas', href: '/admin/rutinas', icon: ClipboardList },
        { label: 'Importar Excel (IA)', href: '/admin/rutinas/importar-excel', icon: Sparkles, badge: 'IA' },
        { label: 'Banco Ejercicios', href: '/admin/ejercicios', icon: Dumbbell },
        { label: 'Reservas & Clases', href: '/admin/reservas', icon: Calendar },
      ],
    },
    {
      title: 'Finanzas & Comercio',
      items: [
        { label: 'Pagos & Cuotas', href: '/admin/pagos', icon: CreditCard },
        { label: 'Tienda / Productos', href: '/admin/tienda', icon: ShoppingBag },
      ],
    },
    {
      title: 'Configuración & Branding',
      items: [
        { label: 'Portal de Alumnos', href: '/irongym/portal-alumno', icon: Users, badge: 'Gym' },
        { label: 'Generador de QR', href: '/admin/qr', icon: QrCode },
        { label: 'Personalización UI', href: '/admin/personalizacion', icon: Palette, highlight: true },
        { label: 'Configuración Gym', href: '/admin/configuracion', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-64 flex-col bg-[#0B0B0E] border-r border-[#27272F] p-4 md:flex">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-2 py-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gym-primary)] text-black font-black text-xl shadow-[0_0_15px_rgba(204,255,0,0.3)]">
          G
        </div>
        <div>
          <h2 className="font-extrabold text-lg text-white tracking-wider">GYM SAAS</h2>
          <span className="text-[10px] uppercase tracking-widest text-[var(--gym-primary)] font-semibold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Panel Admin
          </span>
        </div>
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {group.title}
            </h3>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--gym-primary)] text-black font-bold shadow-[0_0_15px_rgba(204,255,0,0.25)]'
                      : 'text-zinc-400 hover:bg-[#141418] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-black' : 'text-zinc-400 group-hover:text-[var(--gym-primary)]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 px-2 py-0.5 text-[9px] font-black text-black">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Profile Mini Card */}
      <div className="mt-auto border-t border-[#27272F] pt-4">
        <div className="flex items-center space-x-3 rounded-2xl bg-[#141418] p-3 border border-white/5">
          <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white border border-[var(--gym-primary)] text-xs">
            GA
          </div>
          <div className="flex-1 truncate">
            <p className="text-xs font-bold text-white truncate">Gym Owner</p>
            <p className="text-[10px] text-zinc-400 truncate">7 días de Trial restantes</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
