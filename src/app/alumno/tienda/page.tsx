'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StudentBottomNav } from '@/components/layout/StudentBottomNav';
import { ArrowLeft, Inbox } from 'lucide-react';
import { Product } from '@/types/database';

export default function StudentStorePage() {
  const [products, setProducts] = useState<Product[]>([]);

  return (
    <div className="min-h-screen bg-[var(--gym-bg)] pb-28 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0B0B0E]/90 px-4 py-3 backdrop-blur-md">
        <Link href="/alumno/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181C] text-zinc-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)]">
          Tienda del Gimnasio
        </span>
        <div className="w-9" />
      </header>

      <main className="mx-auto max-w-md px-4 space-y-6 pt-2">
        {products.length === 0 ? (
          <div className="rounded-3xl bg-[#141418] p-8 border border-white/5 shadow-card text-center space-y-3">
            <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-extrabold text-white">Tienda Sin Productos</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              El gimnasio no ha publicado productos ni suplementos a la venta por el momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((prod) => (
              <div key={prod.id} className="rounded-3xl bg-[#141418] p-3 border border-white/5">
                <span className="text-xs font-extrabold text-white">{prod.name}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <StudentBottomNav />
    </div>
  );
}
