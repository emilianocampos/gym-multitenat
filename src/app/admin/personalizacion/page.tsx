'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useTheme } from '@/components/customization/DynamicThemeProvider';
import { ThemeMode } from '@/types/database';
import { Palette, Check, RefreshCw, Smartphone, Eye, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function AdminPersonalizationPage() {
  const { theme, setTheme } = useTheme();

  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor);
  const [backgroundColor, setBackgroundColor] = useState(theme.backgroundColor);
  const [surfaceColor, setSurfaceColor] = useState(theme.surfaceColor);
  const [themeMode, setThemeMode] = useState<ThemeMode>(theme.themeMode);
  const [gradientEnabled, setGradientEnabled] = useState(theme.gradientEnabled);
  const [gradientStart, setGradientStart] = useState(theme.gradientStart);
  const [gradientEnd, setGradientEnd] = useState(theme.gradientEnd);
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick Preset Palettes
  const presets = [
    { name: 'Neón Fitness (Ref)', primary: '#CCFF00', bg: '#0B0B0E', surface: '#141418' },
    { name: 'Cyber Red', primary: '#FF0055', bg: '#0D0A0B', surface: '#181214' },
    { name: 'Electric Cyan', primary: '#00E5FF', bg: '#080C10', surface: '#101720' },
    { name: 'Pure Gold', primary: '#FFD700', bg: '#0F0E0A', surface: '#1A1812' },
    { name: 'Clean Light', primary: '#10B981', bg: '#F8FAFC', surface: '#FFFFFF' },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setPrimaryColor(preset.primary);
    setBackgroundColor(preset.bg);
    setSurfaceColor(preset.surface);
    setThemeMode(preset.bg === '#F8FAFC' ? 'LIGHT' : 'DARK');

    setTheme((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      backgroundColor: preset.bg,
      surfaceColor: preset.surface,
      themeMode: preset.bg === '#F8FAFC' ? 'LIGHT' : 'DARK',
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);

      setTheme({
        primaryColor,
        backgroundColor,
        surfaceColor,
        themeMode,
        gradientEnabled,
        gradientStart,
        gradientEnd,
      });

      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-6 lg:p-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-[var(--gym-primary)]">
              <Palette className="h-5 w-5" />
              <span className="text-xs font-extrabold uppercase tracking-widest">Personalización del Portal</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Personalizador Visual Dinámico
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Configura los colores, tema y branding del portal del alumno. Cambios reflejados en tiempo real.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-6 py-3 text-sm font-black uppercase tracking-wider text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : savedSuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span>Guardado exitoso</span>
              </>
            ) : (
              <span>Guardar Configuración</span>
            )}
          </button>
        </div>

        {/* Content Layout: Form Controls Left + Live Simulator Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Preset Selector */}
            <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--gym-primary)]" /> Paletas de Colores Rápidas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyPreset(preset)}
                    className="flex items-center space-x-2 rounded-xl bg-[#18181C] p-2.5 border border-white/10 hover:border-[var(--gym-primary)] transition-all text-left group"
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 space-y-5">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-zinc-800 pb-3">
                Selectores de Color Personalizados
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Neon Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Color Primario / Neón</label>
                  <div className="flex items-center space-x-3 rounded-xl bg-[#18181C] p-2 border border-white/10">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setTheme((prev) => ({ ...prev, primaryColor: e.target.value }));
                      }}
                      className="h-9 w-9 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setTheme((prev) => ({ ...prev, primaryColor: e.target.value }));
                      }}
                      className="flex-1 bg-transparent text-xs font-mono font-bold text-white uppercase outline-none"
                    />
                  </div>
                </div>

                {/* Base Background Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Fondo Base Principal</label>
                  <div className="flex items-center space-x-3 rounded-xl bg-[#18181C] p-2 border border-white/10">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        setTheme((prev) => ({ ...prev, backgroundColor: e.target.value }));
                      }}
                      className="h-9 w-9 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        setTheme((prev) => ({ ...prev, backgroundColor: e.target.value }));
                      }}
                      className="flex-1 bg-transparent text-xs font-mono font-bold text-white uppercase outline-none"
                    />
                  </div>
                </div>

                {/* Cards / Surface Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Superficie de Tarjetas</label>
                  <div className="flex items-center space-x-3 rounded-xl bg-[#18181C] p-2 border border-white/10">
                    <input
                      type="color"
                      value={surfaceColor}
                      onChange={(e) => {
                        setSurfaceColor(e.target.value);
                        setTheme((prev) => ({ ...prev, surfaceColor: e.target.value }));
                      }}
                      className="h-9 w-9 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={surfaceColor}
                      onChange={(e) => {
                        setSurfaceColor(e.target.value);
                        setTheme((prev) => ({ ...prev, surfaceColor: e.target.value }));
                      }}
                      className="flex-1 bg-transparent text-xs font-mono font-bold text-white uppercase outline-none"
                    />
                  </div>
                </div>

                {/* Theme Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Modo de Tema</label>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#18181C] p-1 border border-white/10">
                    {(['DARK', 'LIGHT', 'GRADIENT'] as ThemeMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setThemeMode(mode);
                          setTheme((prev) => ({ ...prev, themeMode: mode }));
                        }}
                        className={`rounded-lg py-2 text-[11px] font-black uppercase transition-all ${
                          themeMode === mode
                            ? 'bg-[var(--gym-primary)] text-black shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Branding Settings */}
            <div className="rounded-2xl bg-[#141418] p-5 border border-white/5 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[var(--gym-primary)]" /> Logotipo e Imágenes
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300">URL del Logo del Gimnasio</label>
                  <input
                    type="url"
                    placeholder="https://gimnasio.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 focus:border-[var(--gym-primary)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300">URL del Banner / Portada</label>
                  <input
                    type="url"
                    placeholder="https://gimnasio.com/banner.jpg"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 focus:border-[var(--gym-primary)] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: LIVE MOBILE SIMULATOR PREVIEW */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="sticky top-10 space-y-3 w-full max-w-sm">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[var(--gym-primary)]" /> Simulador en Vivo
                </span>
                <span className="text-[10px] font-bold uppercase text-[var(--gym-primary)] bg-[var(--gym-primary)]/10 px-2 py-0.5 rounded-full">
                  Mobile Preview
                </span>
              </div>

              {/* Mobile Phone Mockup Frame */}
              <div
                className="relative overflow-hidden rounded-[2.5rem] p-4 border-[6px] border-zinc-800 shadow-2xl transition-all duration-300"
                style={{ backgroundColor: backgroundColor }}
              >
                {/* Speaker notch */}
                <div className="mx-auto mb-4 h-4 w-28 rounded-full bg-zinc-800" />

                {/* Simulator Content */}
                <div className="space-y-4 text-white">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-black text-xs shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        GYM
                      </div>
                      <span className="text-xs font-extrabold">Portal Alumno</span>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold">
                      {themeMode}
                    </span>
                  </div>

                  {/* Card Preview */}
                  <div
                    className="rounded-2xl p-4 border border-white/10 transition-colors shadow-lg"
                    style={{ backgroundColor: surfaceColor }}
                  >
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase text-black"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Recomendado
                    </span>
                    <h4 className="text-base font-extrabold uppercase mt-2">PECHO & BRAZOS</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Calentamiento Dinámico | 22 Min</p>
                  </div>

                  {/* Exercise Step Mockup */}
                  <div
                    className="rounded-2xl p-3 border border-white/10 flex items-center space-x-3"
                    style={{ backgroundColor: surfaceColor }}
                  >
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center font-black text-black text-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      1
                    </div>
                    <div>
                      <h5 className="text-xs font-bold">Press Banca Plano</h5>
                      <span className="text-[10px] text-zinc-400">4 x 10 repeticiones</span>
                    </div>
                  </div>

                  {/* Button Preview */}
                  <button
                    className="w-full rounded-xl py-3 text-xs font-black uppercase text-black tracking-wider shadow-md transition-all"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Empezar Rutina
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
