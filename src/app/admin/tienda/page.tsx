'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { ShoppingBag, PlusCircle, Inbox } from 'lucide-react';
import { Product } from '@/types/database';

export default function AdminStorePage() {
  const [products, setProducts] = useState<Product[]>([]);

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-6 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">E-Commerce</span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Tienda & Productos
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Administrá el inventario de suplementos, ropa y accesorios del gimnasio.</p>
          </div>

          <button className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-6 py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all">
            <PlusCircle className="h-4 w-4" />
            <span>Agregar Producto</span>
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 shadow-card">
          {products.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-extrabold text-white">Inventario Vacío</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Cargá suplementos o ropa del gimnasio para venderlos a tus alumnos directamente desde el portal.
              </p>
            </div>
          ) : (
            <div className="p-4">Lista de productos</div>
          )}
        </div>
      </main>
    </div>
  );
}
