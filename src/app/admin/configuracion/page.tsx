'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Settings, Save, Check } from 'lucide-react';

export default function AdminSettingsPage() {
  const [lateFeeDays, setLateFeeDays] = useState(3);
  const [lateFeeValue, setLateFeeValue] = useState(1500);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-6 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">Ajustes</span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Configuración General del Gimnasio
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Configurá políticas de mora, días de gracia y credenciales de pago.</p>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-6 py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span>{saved ? 'Guardado' : 'Guardar Ajustes'}</span>
          </button>
        </div>

        <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-4 max-w-xl">
          <h3 className="text-sm font-black uppercase text-white">Política de Recargos por Mora</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-zinc-300">Días de Tolerancia de Gracia</label>
              <input
                type="number"
                value={lateFeeDays}
                onChange={(e) => setLateFeeDays(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300">Recargo Fijo por Mora ($ ARS)</label>
              <input
                type="number"
                value={lateFeeValue}
                onChange={(e) => setLateFeeValue(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
