'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useTheme } from '@/components/customization/DynamicThemeProvider';
import { ThemeMode } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import {
  Palette,
  Check,
  RefreshCw,
  Smartphone,
  Sparkles,
  Image as ImageIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  CreditCard,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sliders,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';

export default function AdminPersonalizationPage() {
  const { theme, setTheme, applySettings } = useTheme();

  // Gym General Info State
  const [gymId, setGymId] = useState<string>('');
  const [gymName, setGymName] = useState('Iron Gym Center');
  const [gymSlug, setGymSlug] = useState('irongym');
  const [gymPhone, setGymPhone] = useState('+54 11 4567-8900');
  const [gymEmail, setGymEmail] = useState('contacto@irongym.com');
  const [gymAddress, setGymAddress] = useState('Av. Corrientes 1234, CABA');

  // Visual Theme State
  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor || '#CCFF00');
  const [backgroundColor, setBackgroundColor] = useState(theme.backgroundColor || '#0B0B0E');
  const [surfaceColor, setSurfaceColor] = useState(theme.surfaceColor || '#141418');
  const [themeMode, setThemeMode] = useState<ThemeMode>(theme.themeMode || 'DARK');
  const [gradientEnabled, setGradientEnabled] = useState(theme.gradientEnabled ?? true);
  const [gradientStart, setGradientStart] = useState(theme.gradientStart || '#CCFF00');
  const [gradientEnd, setGradientEnd] = useState(theme.gradientEnd || '#88FF00');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState(
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200'
  );

  // Financial & Mercado Pago State
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [lateFeeDays, setLateFeeDays] = useState(3);
  const [lateFeeValue, setLateFeeValue] = useState(1500);

  // Status & Navigation
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'THEME' | 'MERCADOPAGO'>('GENERAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Preset Palettes
  const presets = [
    { name: 'Neón Fitness', primary: '#CCFF00', bg: '#0B0B0E', surface: '#141418' },
    { name: 'Cyber Red', primary: '#FF0055', bg: '#0D0A0B', surface: '#181214' },
    { name: 'Electric Cyan', primary: '#00E5FF', bg: '#080C10', surface: '#101720' },
    { name: 'Pure Gold', primary: '#FFD700', bg: '#0F0E0A', surface: '#1A1812' },
    { name: 'Emerald Pro', primary: '#10B981', bg: '#061A14', surface: '#0D2820' },
  ];

  // Preset Banner Images
  const presetBanners = [
    {
      label: 'Mancuernas & Pesas Dark',
      url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200',
    },
    {
      label: 'Crossfit & Halterofilia',
      url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200',
    },
    {
      label: 'Gimnasio Moderno Iluminado',
      url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1200',
    },
    {
      label: 'Máquinas & Sala de Entrenamiento',
      url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200',
    },
  ];

  // 1. Fetch current gym & settings from Supabase
  const loadGymData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();

      // Check current user profile or get first gym
      let resolvedGymId: string | null = null;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.gym_id) resolvedGymId = profile.gym_id;
      }

      let gymQuery = supabase.from('gyms').select(`
        id, name, slug, email, phone, logo_url,
        gym_settings (
          logo_url, banner_url, primary_color, secondary_color,
          background_color, surface_color, theme, gradient_enabled,
          gradient_color_start, gradient_color_end,
          late_fee_days, late_fee_value, mp_access_token, mp_public_key
        )
      `);

      if (resolvedGymId) {
        gymQuery = gymQuery.eq('id', resolvedGymId);
      } else {
        gymQuery = gymQuery.order('created_at', { ascending: true }).limit(1);
      }

      const { data: gymData, error } = await gymQuery.maybeSingle();

      if (error) {
        console.error('Error loading gym info:', error);
      }

      if (gymData) {
        setGymId(gymData.id);
        setGymName(gymData.name || 'Iron Gym Center');
        setGymSlug(gymData.slug || 'irongym');
        setGymPhone(gymData.phone || '+54 11 4567-8900');
        setGymEmail(gymData.email || 'contacto@irongym.com');
        if (gymData.logo_url) setLogoUrl(gymData.logo_url);

        const settings = Array.isArray(gymData.gym_settings)
          ? gymData.gym_settings[0]
          : gymData.gym_settings;

        if (settings) {
          if (settings.banner_url) setBannerUrl(settings.banner_url);
          if (settings.primary_color) setPrimaryColor(settings.primary_color);
          if (settings.background_color) setBackgroundColor(settings.background_color);
          if (settings.surface_color) setSurfaceColor(settings.surface_color);
          if (settings.theme) setThemeMode(settings.theme);
          if (settings.gradient_enabled !== undefined) setGradientEnabled(settings.gradient_enabled);
          if (settings.gradient_color_start) setGradientStart(settings.gradient_color_start);
          if (settings.gradient_color_end) setGradientEnd(settings.gradient_color_end);
          if (settings.mp_access_token) setMpAccessToken(settings.mp_access_token);
          if (settings.mp_public_key) setMpPublicKey(settings.mp_public_key);
          if (settings.late_fee_days) setLateFeeDays(settings.late_fee_days);
          if (settings.late_fee_value) setLateFeeValue(Number(settings.late_fee_value));

          // Sync Global Theme Provider
          applySettings(settings);
        }
      }
    } catch (e: any) {
      console.error('Failed to load gym data:', e);
      setErrorMessage('No se pudieron cargar todos los datos de configuración.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGymData();
  }, []);

  // Preset Palette Apply
  const applyPreset = (preset: (typeof presets)[0]) => {
    setPrimaryColor(preset.primary);
    setBackgroundColor(preset.bg);
    setSurfaceColor(preset.surface);
    setThemeMode('DARK');

    setTheme((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      backgroundColor: preset.bg,
      surfaceColor: preset.surface,
      themeMode: 'DARK',
    }));
  };

  // 2. Save all settings to Supabase
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    try {
      const supabase = createClient();
      let currentId = gymId;

      // If no gymId resolved yet, fetch first gym
      if (!currentId) {
        const { data: firstGym } = await supabase.from('gyms').select('id').limit(1).maybeSingle();
        if (firstGym) currentId = firstGym.id;
      }

      if (!currentId) {
        throw new Error('No se encontró el ID del gimnasio en la base de datos.');
      }

      const formattedSlug = gymSlug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');

      // 1. Update public.gyms table
      const { error: gymUpdateError } = await supabase
        .from('gyms')
        .update({
          name: gymName.trim(),
          slug: formattedSlug,
          phone: gymPhone.trim(),
          email: gymEmail.trim(),
          logo_url: logoUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentId);

      if (gymUpdateError) {
        console.error('Error updating gym:', gymUpdateError);
        throw new Error(`Error al actualizar datos generales: ${gymUpdateError.message}`);
      }

      // 2. Upsert public.gym_settings table
      const settingsPayload = {
        gym_id: currentId,
        logo_url: logoUrl.trim() || null,
        banner_url: bannerUrl.trim() || null,
        primary_color: primaryColor,
        secondary_color: '#141418',
        background_color: backgroundColor,
        surface_color: surfaceColor,
        theme: themeMode,
        gradient_enabled: gradientEnabled,
        gradient_color_start: gradientStart,
        gradient_color_end: gradientEnd,
        late_fee_days: lateFeeDays,
        late_fee_value: lateFeeValue,
        mp_access_token: mpAccessToken.trim() || null,
        mp_public_key: mpPublicKey.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: settingsError } = await supabase
        .from('gym_settings')
        .upsert(settingsPayload, { onConflict: 'gym_id' });

      if (settingsError) {
        console.error('Error updating gym settings:', settingsError);
        throw new Error(`Error al guardar diseño y ajustes: ${settingsError.message}`);
      }

      // 3. Update global Theme Context
      setTheme({
        primaryColor,
        backgroundColor,
        surfaceColor,
        themeMode,
        gradientEnabled,
        gradientStart,
        gradientEnd,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMessage(err.message || 'Error inesperado al guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPortalUrl = () => {
    const fullUrl = `${window.location.origin}/${gymSlug}/portal-alumno`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 md:ml-64 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-[var(--gym-primary)]">
              <Building2 className="h-5 w-5" />
              <span className="text-xs font-extrabold uppercase tracking-widest">
                Identidad & Portal de Alumnos
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Configuración & Branding del Gimnasio
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Personalizá el nombre, teléfono, logo, portada y colores visibles en el portal de tus alumnos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-black" />
                  <span>Guardando...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>¡Cambios Guardados!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {savedSuccess && (
          <div className="rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/30 text-xs font-bold text-emerald-400 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>
                ¡La información y el diseño del gimnasio se han actualizado con éxito en la base de datos!
              </span>
            </div>
            <Link
              href={`/${gymSlug}/portal-alumno`}
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-extrabold text-xs uppercase flex items-center gap-1 hover:bg-emerald-400"
            >
              <span>Ver Portal</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl bg-rose-500/10 p-4 border border-rose-500/20 text-xs font-bold text-rose-400 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2 overflow-x-auto">
          {[
            { id: 'GENERAL', label: '1. Datos del Gimnasio & Contacto', icon: Building2 },
            { id: 'THEME', label: '2. Identidad Visual & Portada', icon: Palette },
            { id: 'MERCADOPAGO', label: '3. Mercado Pago & Finanzas', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[var(--gym-primary)] text-black shadow-neon'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Layout: Form Left + Real Live Simulator Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: FORM CONTROLS */}
          <div className="lg:col-span-7 space-y-6">
            {/* TAB 1: DATOS GENERALES DEL GIMNASIO */}
            {activeTab === 'GENERAL' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[var(--gym-primary)]" />
                      Información Principal del Gimnasio
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Estos datos se muestran en la cabecera y accesos del portal del alumno.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Gym Name */}
                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-300 block">
                        Nombre Comercial del Gimnasio *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Iron Gym Center"
                        value={gymName}
                        onChange={(e) => setGymName(e.target.value)}
                        className="mt-1.5 w-full rounded-xl bg-[#18181C] p-3 text-sm font-bold text-white border border-white/10 focus:border-[var(--gym-primary)] outline-none transition-all"
                      />
                    </div>

                    {/* Slug & Portal URL */}
                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-300 block">
                        Subdominio / Slug de Acceso al Portal *
                      </label>
                      <div className="mt-1.5 flex items-center rounded-xl bg-[#18181C] border border-white/10 focus-within:border-[var(--gym-primary)] overflow-hidden">
                        <span className="bg-black/40 px-3 py-3 text-xs font-mono text-zinc-400 border-r border-white/5 select-none">
                          gym.app/
                        </span>
                        <input
                          type="text"
                          placeholder="irongym"
                          value={gymSlug}
                          onChange={(e) =>
                            setGymSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                          }
                          className="flex-1 bg-transparent px-3 py-3 text-sm font-mono font-bold text-white outline-none"
                        />
                        <span className="bg-black/40 px-3 py-3 text-xs font-mono text-zinc-500 border-l border-white/5 select-none">
                          /portal-alumno
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>URL de acceso para tus alumnos</span>
                        <button
                          type="button"
                          onClick={handleCopyPortalUrl}
                          className="text-[var(--gym-primary)] font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedLink ? '¡Enlace Copiado!' : 'Copiar URL completa'}
                        </button>
                      </div>
                    </div>

                    {/* Phone / WhatsApp */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase text-zinc-300 block">
                          Teléfono / WhatsApp de Atención *
                        </label>
                        <div className="mt-1.5 flex items-center space-x-2 rounded-xl bg-[#18181C] p-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                          <Phone className="h-4 w-4 text-[var(--gym-primary)] shrink-0" />
                          <input
                            type="text"
                            placeholder="+54 11 4567-8900"
                            value={gymPhone}
                            onChange={(e) => setGymPhone(e.target.value)}
                            className="w-full bg-transparent text-xs font-semibold text-white outline-none"
                          />
                        </div>
                      </div>

                      {/* Official Email */}
                      <div>
                        <label className="text-xs font-bold uppercase text-zinc-300 block">
                          Email Oficial del Gimnasio *
                        </label>
                        <div className="mt-1.5 flex items-center space-x-2 rounded-xl bg-[#18181C] p-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                          <Mail className="h-4 w-4 text-[var(--gym-primary)] shrink-0" />
                          <input
                            type="email"
                            placeholder="contacto@irongym.com"
                            value={gymEmail}
                            onChange={(e) => setGymEmail(e.target.value)}
                            className="w-full bg-transparent text-xs font-semibold text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sede / Address */}
                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-300 block">
                        Dirección de la Sede Principal
                      </label>
                      <div className="mt-1.5 flex items-center space-x-2 rounded-xl bg-[#18181C] p-3 border border-white/10 focus-within:border-[var(--gym-primary)]">
                        <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Av. Corrientes 1234, CABA"
                          value={gymAddress}
                          onChange={(e) => setGymAddress(e.target.value)}
                          className="w-full bg-transparent text-xs font-semibold text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: IDENTIDAD VISUAL, FONDOS Y COLORES */}
            {activeTab === 'THEME' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Banner / Portada */}
                <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-4">
                  <div className="border-b border-zinc-800 pb-3">
                    <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-[var(--gym-primary)]" />
                      Portada & Banner de Cabecera
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Imagen de fondo de alta calidad que se visualiza detrás del título del portal.
                    </p>
                  </div>

                  {/* Preset Banners */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase text-zinc-400 block">
                      Seleccionar de la Galería de Portadas:
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {presetBanners.map((pb, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBannerUrl(pb.url)}
                          className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all text-left p-2 group ${
                            bannerUrl === pb.url
                              ? 'border-[var(--gym-primary)] shadow-neon'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <Image src={pb.url} alt={pb.label} fill className="object-cover opacity-60 group-hover:opacity-80" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 flex items-end">
                            <span className="text-[10px] font-bold text-white leading-tight">
                              {pb.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Banner URL */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block">
                      O pegar URL de Imagen Personalizada:
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="mt-1.5 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 focus:border-[var(--gym-primary)] outline-none"
                    />
                  </div>
                </div>

                {/* Preset Palettes */}
                <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-4">
                  <div className="border-b border-zinc-800 pb-3">
                    <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[var(--gym-primary)]" />
                      Paletas de Colores de Marca
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Elegí un estilo visual prediseñado o ajustá los colores a tu gusto.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {presets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`flex items-center space-x-2.5 rounded-2xl bg-[#18181C] p-3 border transition-all text-left group ${
                          primaryColor === preset.primary
                            ? 'border-[var(--gym-primary)] shadow-neon'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <span
                          className="h-6 w-6 rounded-full border border-white/20 shadow-md shrink-0"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span className="text-xs font-black text-white truncate">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
                    Ajuste Fino de Colores
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary Color Picker */}
                    <div className="space-y-1.5">
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

                    {/* Background Color Picker */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">Fondo Base</label>
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
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MERCADO PAGO & FINANZAS */}
            {activeTab === 'MERCADOPAGO' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-5">
                  <div className="border-b border-zinc-800 pb-3">
                    <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-[var(--gym-primary)]" />
                      Pasarela de Pagos Mercado Pago
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Conectá tus credenciales para que las cuotas pagadas por los alumnos se acrediten directamente en tu cuenta de Mercado Pago.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-300 block">
                        Mercado Pago Access Token (Producción o Prueba)
                      </label>
                      <input
                        type="password"
                        placeholder="APP_USR-xxxxxxxxx..."
                        value={mpAccessToken}
                        onChange={(e) => setMpAccessToken(e.target.value)}
                        className="mt-1.5 w-full rounded-xl bg-[#18181C] p-3 text-xs font-mono text-white border border-white/10 focus:border-[var(--gym-primary)] outline-none"
                      />
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        Obtené tus credenciales en{' '}
                        <a
                          href="https://www.mercadopago.com.ar/developers"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--gym-primary)] underline"
                        >
                          Mercado Pago Developers
                        </a>
                        . Si está vacío, se utilizará el entorno sandbox de demostración.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-300 block">
                        Mercado Pago Public Key
                      </label>
                      <input
                        type="text"
                        placeholder="APP_USR-xxxxxxxxx..."
                        value={mpPublicKey}
                        onChange={(e) => setMpPublicKey(e.target.value)}
                        className="mt-1.5 w-full rounded-xl bg-[#18181C] p-3 text-xs font-mono text-white border border-white/10 focus:border-[var(--gym-primary)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Late fee settings */}
                <div className="rounded-3xl bg-[#141418] p-6 border border-white/5 space-y-4">
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-400" />
                    Políticas de Recargo por Mora
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-300 block">
                        Días de Tolerancia de Gracia
                      </label>
                      <input
                        type="number"
                        value={lateFeeDays}
                        onChange={(e) => setLateFeeDays(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-300 block">
                        Recargo Fijo por Mora ($ ARS)
                      </label>
                      <input
                        type="number"
                        value={lateFeeValue}
                        onChange={(e) => setLateFeeValue(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: LIVE REALISTIC PORTAL SIMULATOR */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="sticky top-10 space-y-4 w-full">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[var(--gym-primary)]" /> Vista Previa en Vivo
                </span>
                <Link
                  href={`/${gymSlug}/portal-alumno`}
                  target="_blank"
                  className="text-[10px] font-bold uppercase text-[var(--gym-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Abrir Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Exact Portal Hero Mockup (Matching User Screenshot) */}
              <div
                className="relative overflow-hidden rounded-3xl border border-white/15 shadow-2xl transition-all duration-300"
                style={{ backgroundColor: backgroundColor }}
              >
                {/* Header Banner Image */}
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={bannerUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200'}
                    alt={gymName}
                    fill
                    className="object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/60 to-transparent" />

                  {/* Top Bar Capsule (Logo + Gym Name) */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 shadow-lg">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg font-black text-black text-xs shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {gymName.slice(0, 2).toUpperCase() || 'GY'}
                      </div>
                      <div>
                        <span className="text-xs font-extrabold uppercase text-white block leading-tight">
                          {gymName || 'GYM'}
                        </span>
                        <span className="text-[9px] text-zinc-400 block leading-tight">
                          Portal del Alumno
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hero Content Box (Exact match with user's screenshot) */}
                <div className="px-5 pb-6 -mt-10 relative z-10 space-y-3">
                  <div
                    className="rounded-2xl p-5 border border-white/10 shadow-xl space-y-2"
                    style={{ backgroundColor: surfaceColor }}
                  >
                    {/* Official Portal Pill */}
                    <div className="flex items-center space-x-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full animate-pulse"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <span
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: primaryColor }}
                      >
                        PORTAL DE ALUMNOS OFICIAL
                      </span>
                    </div>

                    {/* Gym Title */}
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                      {gymName || 'Nombre del Gimnasio'}
                    </h2>

                    {/* Location & Phone Info */}
                    <p className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-zinc-500" />
                        {gymAddress || 'Sede Principal'}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-zinc-500" />
                        {gymPhone || '+54 11 4567-8900'}
                      </span>
                    </p>
                  </div>

                  {/* Sample Portal Tabs Preview */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {['CLASES', 'RUTINAS', 'CUOTAS'].map((tab, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl py-2 text-center text-[10px] font-extrabold uppercase border ${
                          idx === 0
                            ? 'text-black border-transparent shadow-sm'
                            : 'bg-[#18181C] text-zinc-400 border-white/5'
                        }`}
                        style={idx === 0 ? { backgroundColor: primaryColor } : {}}
                      >
                        {tab}
                      </div>
                    ))}
                  </div>

                  {/* Direct Link button */}
                  <Link
                    href={`/${gymSlug}/portal-alumno`}
                    target="_blank"
                    className="w-full flex items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-bold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                  >
                    <span>Probar Portal del Alumno</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
