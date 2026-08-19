'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer when pathname changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

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

  // Render Navigation Items
  const renderNavLinks = (onItemClick?: () => void) => (
    <div className="space-y-6">
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
                onClick={onItemClick}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${isActive
                    ? 'bg-[var(--gym-primary)] text-black font-bold shadow-[0_0_15px_rgba(204,255,0,0.25)]'
                    : 'text-zinc-400 hover:bg-[#141418] hover:text-white'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-black' : 'text-zinc-400 group-hover:text-[var(--gym-primary)]'
                      }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black ${isActive
                        ? 'bg-black text-white'
                        : 'bg-gradient-to-r from-lime-400 to-emerald-400 text-black'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* 1. MOBILE TOP NAVIGATION BAR (Visible only on < md) */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#27272F] bg-[#0B0B0E]/95 px-4 backdrop-blur-md md:hidden">
        {/* Brand */}
        <Link href="/admin/dashboard" className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gym-primary)] font-black text-lg text-black shadow-[0_0_12px_rgba(204,255,0,0.25)]">
            G
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-wider">GYM SAAS</span>
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[var(--gym-primary)]">
              <ShieldCheck className="h-2.5 w-2.5" /> Admin
            </span>
          </div>
        </Link>

        {/* Action / Menu Trigger */}
        <div className="flex items-center space-x-2">
          <Link
            href="/irongym/portal-alumno"
            target="_blank"
            className="flex items-center gap-1 rounded-lg bg-[#141418] px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 border border-white/10 hover:border-[var(--gym-primary)] transition-all"
          >
            <span>Ver Portal</span>
            <ExternalLink className="h-3 w-3 text-[var(--gym-primary)]" />
          </Link>

          <button
            onClick={() => setIsMobileOpen(true)}
            aria-label="Abrir menú de navegación"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141418] text-zinc-300 border border-white/10 hover:text-white hover:border-[var(--gym-primary)] active:scale-95 transition-all"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. MOBILE DRAWER SLIDE-OVER (Visible when isMobileOpen is true) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Menu Content */}
          <div className="relative flex w-full max-w-[290px] flex-1 flex-col bg-[#0B0B0E] border-r border-[#27272F] p-4 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gym-primary)] font-black text-lg text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]">
                  G
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-white tracking-wider">GYM SAAS</h2>
                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[var(--gym-primary)]">
                    <ShieldCheck className="h-2.5 w-2.5" /> Panel Admin
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMobileOpen(false)}
                aria-label="Cerrar menú"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav Scroll Area */}
            <div className="flex-1 overflow-y-auto pr-1">
              {renderNavLinks(() => setIsMobileOpen(false))}
            </div>

            {/* Drawer Footer Profile Card */}
            <div className="mt-auto border-t border-[#27272F] pt-3">
              <div className="flex items-center space-x-3 rounded-xl bg-[#141418] p-2.5 border border-white/5">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white border border-[var(--gym-primary)] text-xs">
                  GA
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">Gym Owner</p>
                  <p className="text-[9px] text-zinc-400 truncate">7 días de Trial restantes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DESKTOP SIDEBAR (Visible only on >= md) */}
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
        <div className="flex-1 overflow-y-auto pr-1">
          {renderNavLinks()}
        </div>

        {/* Footer Profile Mini Card */}
        <div className="mt-auto border-t border-[#27272F] pt-4">
          <div className="flex items-center space-x-3 rounded-2xl bg-[#141418] p-3 border border-white/5">
            <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white border border-[var(--gym-primary)] text-xs">
              GA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Gym Owner</p>
              <p className="text-[10px] text-zinc-400 truncate">7 días de Trial restantes</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
