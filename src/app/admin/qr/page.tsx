'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { QRCodeGenerator } from '@/components/ui/QRCodeGenerator';
import { QrCode, Download, Copy, Check, Printer, Sparkles, Smartphone, Building } from 'lucide-react';

export default function AdminQRPage() {
  const [copied, setCopied] = useState(false);
  const [gymSlug, setGymSlug] = useState('iron-gym');
  const [selectedType, setSelectedType] = useState<'PUBLIC_GYM' | 'ROUTINE' | 'EXERCISE'>('PUBLIC_GYM');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const getTargetUrl = () => {
    if (selectedType === 'PUBLIC_GYM') {
      return `${baseUrl}/c/${gymSlug}`;
    }
    if (selectedType === 'ROUTINE') {
      return `${baseUrl}/alumno/rutina`;
    }
    return `${baseUrl}/alumno/ejercicios/press-banca-barra`;
  };

  const targetUrl = getTargetUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const imgEl = document.querySelector('#qr-container img') as HTMLImageElement;
    if (imgEl && imgEl.src) {
      const link = document.createElement('a');
      link.href = imgEl.src;
      link.download = `qr-${gymSlug}-${selectedType.toLowerCase()}.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-6 lg:p-10 space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6">
          <div className="flex items-center space-x-2 text-[var(--gym-primary)]">
            <QrCode className="h-5 w-5" />
            <span className="text-xs font-extrabold uppercase tracking-widest">Digitalización de Accesos</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
            Generador de Códigos QR Reales
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generá e imprimí códigos QR dinámicos y 100% escaneables con la URL corta <code className="text-[var(--gym-primary)] font-mono">/c/slug</code>.
          </p>
        </div>

        {/* QR Selector & Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Options */}
          <div className="lg:col-span-7 space-y-6">
            {/* Gym Slug Input */}
            <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-3">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Building className="h-4 w-4 text-[var(--gym-primary)]" /> Slug Único del Gimnasio
              </label>
              <div className="flex items-center space-x-2 rounded-xl bg-[#18181C] p-3 border border-white/10">
                <span className="text-xs font-mono text-zinc-500">{baseUrl}/c/</span>
                <input
                  type="text"
                  value={gymSlug}
                  onChange={(e) => setGymSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="flex-1 bg-transparent text-xs font-bold font-mono text-[var(--gym-primary)] outline-none"
                  placeholder="iron-gym"
                />
              </div>
            </div>

            {/* QR Type Options */}
            <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-4">
              <h3 className="text-sm font-black uppercase text-white">Tipo de Código QR</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedType('PUBLIC_GYM')}
                  className={`rounded-2xl p-4 border text-left transition-all space-y-2 ${
                    selectedType === 'PUBLIC_GYM'
                      ? 'bg-[var(--gym-primary)]/10 border-[var(--gym-primary)] text-white shadow-neon-subtle'
                      : 'bg-[#18181C] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className="h-6 w-6 text-[var(--gym-primary)]" />
                  <p className="text-xs font-extrabold">Portal /c/{gymSlug}</p>
                  <p className="text-[10px] text-zinc-400">Recepción / Registro</p>
                </button>

                <button
                  onClick={() => setSelectedType('ROUTINE')}
                  className={`rounded-2xl p-4 border text-left transition-all space-y-2 ${
                    selectedType === 'ROUTINE'
                      ? 'bg-[var(--gym-primary)]/10 border-[var(--gym-primary)] text-white shadow-neon-subtle'
                      : 'bg-[#18181C] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-6 w-6 text-[var(--gym-primary)]" />
                  <p className="text-xs font-extrabold">QR Pizarrón Rutinas</p>
                  <p className="text-[10px] text-zinc-400">Escaneo de rutina del día</p>
                </button>

                <button
                  onClick={() => setSelectedType('EXERCISE')}
                  className={`rounded-2xl p-4 border text-left transition-all space-y-2 ${
                    selectedType === 'EXERCISE'
                      ? 'bg-[var(--gym-primary)]/10 border-[var(--gym-primary)] text-white shadow-neon-subtle'
                      : 'bg-[#18181C] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-6 w-6 text-[var(--gym-primary)]" />
                  <p className="text-xs font-extrabold">QR de Máquina</p>
                  <p className="text-[10px] text-zinc-400">Explicación del ejercicio</p>
                </button>
              </div>
            </div>

            {/* URL Input Bar */}
            <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-3">
              <label className="text-xs font-bold text-zinc-300">URL del QR Generado</label>
              <div className="flex items-center space-x-2 rounded-xl bg-[#18181C] p-2 border border-white/10">
                <input
                  type="text"
                  readOnly
                  value={targetUrl}
                  className="flex-1 bg-transparent text-xs font-mono text-white outline-none px-2"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 rounded-lg bg-[var(--gym-primary)] px-3 py-1.5 text-xs font-bold text-black hover:bg-[var(--gym-primary-hover)] transition-all"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copiado' : 'Copiar URL'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* REAL QR DISPLAY CARD */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="rounded-3xl bg-[#141418] p-8 border border-white/5 shadow-2xl text-center space-y-6 w-full max-w-sm">
              <div id="qr-container" className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl bg-white p-3 shadow-neon">
                <QRCodeGenerator value={targetUrl} size={230} />
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white">Código QR Real & Escaneable</h4>
                <p className="text-xs text-zinc-400 mt-1">Escaneá este código con la cámara de tu celular para abrir el portal.</p>
                <p className="text-[11px] font-mono text-[var(--gym-primary)] mt-1 truncate">{targetUrl}</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar PNG</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] py-3 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
