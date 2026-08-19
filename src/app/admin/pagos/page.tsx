'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { CreditCard, PlusCircle, Inbox } from 'lucide-react';
import { Payment } from '@/types/database';

export default function AdminPaymentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [payments, setPayments] = useState<Payment[]>([]);

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 md:ml-64 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">Finanzas</span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Gestión de Pagos & Cuotas
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Registrá pagos manuales en efectivo o revisá las transacciones automáticas de Mercado Pago.</p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-4 sm:px-6 py-2.5 sm:py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Registrar Pago Manual</span>
          </button>
        </div>

        {/* Payments Table or Empty State */}
        <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 shadow-card">
          {payments.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-extrabold text-white">Sin transacciones registradas</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No se registraron pagos de cuotas todavía. Los pagos procesados por Mercado Pago o ingresados manualmente aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-[#18181C] text-zinc-400 font-extrabold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-4">ID Transacción</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4">Método</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300 font-semibold">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-4">{p.id}</td>
                      <td className="p-4">${p.amount}</td>
                      <td className="p-4">{p.payment_method}</td>
                      <td className="p-4">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MANUAL PAYMENT MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-[#141418] p-4 sm:p-6 border border-white/10 shadow-2xl space-y-4 my-auto">
              <h3 className="text-lg font-black text-white">Registrar Pago en Efectivo</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300">Nombre del Alumno</label>
                  <input
                    type="text"
                    placeholder="Buscar alumno..."
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300">Monto ($ ARS)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300">Método de Pago</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="TRANSFER">Transferencia Bancaria</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-zinc-300 border border-white/10 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl bg-[var(--gym-primary)] py-3 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)]"
                >
                  Confirmar Pago
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
