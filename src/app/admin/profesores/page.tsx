'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import {
  UserCheck,
  UserPlus,
  Inbox,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Award,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Loader2,
  User,
  Dumbbell,
  Check,
} from 'lucide-react';
import { Trainer, Discipline } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export default function AdminTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    trainer: Trainer | null;
  }>({ isOpen: false, trainer: null });

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    selected_disciplines: [] as string[],
    custom_specialty: '',
    bio: '',
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to get active valid UUID gym_id
  const getActiveGymId = async (supabase: any): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.gym_id) return profile.gym_id;
      }

      const { data: gym } = await supabase.from('gyms').select('id').limit(1).maybeSingle();
      if (gym?.id) return gym.id;

      const { data: newGym } = await supabase
        .from('gyms')
        .insert([{ name: 'Iron Gym Center', slug: 'irongym', email: 'admin@irongym.com' }])
        .select('id')
        .single();
      if (newGym?.id) return newGym.id;
    } catch (e) {
      console.error('Error resolving active gym ID:', e);
    }
    return 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  };

  // Load Trainers and Disciplines directly from Supabase DB
  const loadTrainers = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: dbTrainers, error } = await supabase
        .from('trainers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trainers:', error);
        setTrainers([]);
      } else {
        setTrainers(dbTrainers || []);
      }

      // Fetch active disciplines directly from Database
      const { data: dbDisciplines } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (dbDisciplines && dbDisciplines.length > 0) {
        setDisciplinesList(dbDisciplines);
      }
    } catch (e) {
      console.error('Database connection error:', e);
      setTrainers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrainers();
  }, []);

  const filteredTrainers = trainers.filter(
    (t) =>
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.specialty && t.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenCreate = () => {
    // Default select the first discipline if available
    const initialDisc = disciplinesList && disciplinesList.length > 0 && disciplinesList[0] ? [disciplinesList[0].name] : [];

    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      selected_disciplines: initialDisc,
      custom_specialty: '',
      bio: '',
      is_active: true,
    });
    setModalMode('CREATE');
    setSelectedTrainer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trainer: Trainer) => {
    // Parse specialty into selected disciplines
    const rawSpecialties = (trainer.specialty || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Separate into matching disciplines and custom text
    const matchedDisciplines: string[] = [];
    const customItems: string[] = [];

    rawSpecialties.forEach((spec) => {
      const found = disciplinesList.find((d) => d.name.toLowerCase() === spec.toLowerCase());
      if (found) {
        matchedDisciplines.push(found.name);
      } else {
        customItems.push(spec);
      }
    });

    setFormData({
      first_name: trainer.first_name,
      last_name: trainer.last_name,
      email: trainer.email,
      phone: trainer.phone || '',
      selected_disciplines: matchedDisciplines.length > 0 ? matchedDisciplines : (disciplinesList[0] ? [disciplinesList[0].name] : []),
      custom_specialty: customItems.join(', '),
      bio: trainer.bio || '',
      is_active: trainer.is_active,
    });
    setModalMode('EDIT');
    setSelectedTrainer(trainer);
    setIsModalOpen(true);
  };

  const handleToggleDiscipline = (name: string) => {
    setFormData((prev) => {
      const exists = prev.selected_disciplines.includes(name);
      const updated = exists
        ? prev.selected_disciplines.filter((d) => d !== name)
        : [...prev.selected_disciplines, name];
      return { ...prev, selected_disciplines: updated };
    });
  };

  // Save Trainer directly in Supabase DB (INSERT / UPDATE)
  const handleSaveTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Por favor completá los campos obligatorios (*)');
      return;
    }

    if (formData.selected_disciplines.length === 0 && !formData.custom_specialty.trim()) {
      alert('Por favor seleccioná al menos una disciplina de la base de datos para el profesor.');
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const gymId = await getActiveGymId(supabase);

      const allSpecialties = [
        ...formData.selected_disciplines,
        formData.custom_specialty.trim(),
      ].filter(Boolean);

      const uniqueSpecialties = Array.from(new Set(allSpecialties.map((s) => s.trim()))).filter(Boolean);
      const consolidatedSpecialty = uniqueSpecialties.join(', ');

      if (modalMode === 'CREATE') {
        const payload = {
          gym_id: gymId,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone?.trim() || null,
          specialty: consolidatedSpecialty,
          bio: formData.bio?.trim() || null,
          is_active: formData.is_active,
        };

        const { data: newTrainer, error: insertError } = await supabase
          .from('trainers')
          .insert([payload])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating trainer:', insertError);
          alert(`Error al guardar profesor: ${insertError.message}`);
          setIsSaving(false);
          return;
        }

        setTrainers((prev) => [newTrainer, ...prev]);
        showToast(`¡Profesor "${formData.first_name} ${formData.last_name}" registrado!`);
      } else if (modalMode === 'EDIT' && selectedTrainer) {
        const { data: updatedTrainer, error: updateError } = await supabase
          .from('trainers')
          .update({
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone?.trim() || null,
            specialty: consolidatedSpecialty,
            bio: formData.bio?.trim() || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedTrainer.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating trainer:', updateError);
          alert(`Error al actualizar profesor: ${updateError.message}`);
          setIsSaving(false);
          return;
        }

        setTrainers((prev) =>
          prev.map((t) => (t.id === selectedTrainer.id ? updatedTrainer : t))
        );
        showToast(`¡Profesor "${formData.first_name} ${formData.last_name}" actualizado!`);
      }

      setIsSaving(false);
      setIsModalOpen(false);
    } catch (e: any) {
      console.error('Error in handleSaveTrainer:', e);
      alert(`Error al guardar: ${e.message}`);
      setIsSaving(false);
    }
  };

  // Delete Trainer directly from Supabase DB
  const handleConfirmDelete = async () => {
    if (!deleteModal.trainer) return;
    setIsDeleting(true);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('trainers')
        .delete()
        .eq('id', deleteModal.trainer.id);

      if (deleteError) {
        console.error('Error deleting trainer:', deleteError);
        alert(`Error al eliminar profesor: ${deleteError.message}`);
        setIsDeleting(false);
        return;
      }

      setTrainers((prev) => prev.filter((t) => t.id !== deleteModal.trainer?.id));
      showToast(`Profesor eliminado con éxito.`);
      setDeleteModal({ isOpen: false, trainer: null });
    } catch (e: any) {
      console.error('Error in delete trainer:', e);
      alert(`Error: ${e.message}`);
      setDeleteModal({ isOpen: false, trainer: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 md:ml-64 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 rounded-2xl bg-emerald-500 text-black px-5 py-3 font-black text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">
              Staff & Equipo de Entrenadores
            </span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Gestión de Profesores
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Registrá y administrá los profesores del gimnasio para asignarlos a las disciplinas y clases.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={loadTrainers}
              className="p-2.5 sm:p-3 rounded-xl bg-[#141418] text-zinc-400 hover:text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
              title="Actualizar directorio de profesores"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-4 sm:px-6 py-2.5 sm:py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] active:scale-98 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Crear Nuevo Profesor</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-3 rounded-2xl bg-[#141418] p-3 border border-white/5 w-full max-w-md">
          <Search className="h-4 w-4 text-zinc-400 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por Nombre, Email o Especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none"
          />
        </div>

        {/* Trainers Table / Grid */}
        <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 shadow-card">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-10 w-10 text-[var(--gym-primary)] animate-spin mx-auto" />
              <p className="text-xs font-bold text-zinc-400">Cargando equipo de profesores...</p>
            </div>
          ) : filteredTrainers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-extrabold text-white">No se encontraron profesores</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Hacé clic en "Crear Nuevo Profesor" para agregar miembros al equipo del gimnasio.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-[#18181C] text-zinc-400 font-extrabold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-4">Profesor / Coach</th>
                    <th className="p-4">Disciplinas a Cargo (BD)</th>
                    <th className="p-4">Contacto</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300 font-semibold">
                  {filteredTrainers.map((t) => {
                    const specs = (t.specialty || '')
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);

                    return (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-zinc-800 border border-[var(--gym-primary)] flex items-center justify-center font-black text-xs text-[var(--gym-primary)]">
                              {t.first_name[0]}
                              {t.last_name[0]}
                            </div>
                            <div>
                              <p className="font-extrabold text-white text-sm">
                                {t.first_name} {t.last_name}
                              </p>
                              <span className="text-[10px] text-zinc-500">Coach Oficial</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          {specs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {specs.map((sp, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-[#18181C] px-2.5 py-1 rounded-lg border border-[var(--gym-primary)]/20 text-white text-[11px] font-extrabold"
                                >
                                  <Dumbbell className="h-3 w-3 text-[var(--gym-primary)]" />
                                  {sp}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500 italic">Sin disciplinas</span>
                          )}
                        </td>

                        <td className="p-4 space-y-0.5">
                          <p className="text-xs font-mono text-zinc-300 flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-zinc-500" /> {t.email}
                          </p>
                          <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-zinc-500" /> {t.phone || 'Sin teléfono'}
                          </p>
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                              t.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                t.is_active ? 'bg-emerald-400' : 'bg-zinc-400'
                              }`}
                            />
                            {t.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="p-2 rounded-xl bg-[#18181C] text-zinc-300 hover:text-[var(--gym-primary)] hover:bg-white/5 border border-white/5 transition-all"
                              title="Editar Profesor"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, trainer: t })}
                              className="p-2 rounded-xl bg-[#18181C] text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition-all"
                              title="Eliminar Profesor"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CREATE / EDIT TRAINER MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-[#141418] border border-white/10 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 shadow-2xl my-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gym-primary)] text-black font-black">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {modalMode === 'CREATE' ? 'Crear Nuevo Profesor' : 'Editar Profesor'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Asigná las disciplinas reales del gimnasio que dictará este profesor.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTrainer} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300">Nombre *</label>
                    <input
                      type="text"
                      placeholder="Ej: Juana"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300">Apellido *</label>
                    <input
                      type="text"
                      placeholder="Ej: Penchulef"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300">Email *</label>
                    <input
                      type="email"
                      placeholder="juana@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+54 11 4567-8900"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                    />
                  </div>
                </div>

                {/* DISCIPLINAS DESDE LA BASE DE DATOS */}
                <div className="rounded-2xl bg-[#18181C] p-4 border border-[var(--gym-primary)]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)] flex items-center gap-1.5">
                      <Dumbbell className="h-4 w-4" />
                      <span>Disciplinas que dicta el profesor (Desde la BD) *</span>
                    </label>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {formData.selected_disciplines.length} seleccionada(s)
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    Hacé clic para seleccionar una o más disciplinas cargadas en tu gimnasio:
                  </p>

                  {/* Disciplines Chips Selector */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {disciplinesList.map((d) => {
                      const isSelected = formData.selected_disciplines.includes(d.name);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleToggleDiscipline(d.name)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[var(--gym-primary)] text-black border-[var(--gym-primary)] shadow-neon'
                              : 'bg-[#141418] text-zinc-400 hover:text-white border-white/10 hover:border-white/20'
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                              isSelected ? 'bg-black text-[var(--gym-primary)]' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {isSelected ? '✓' : '+'}
                          </span>
                          <span>{d.name}</span>
                        </button>
                      );
                    })}

                    {disciplinesList.length === 0 && (
                      <p className="text-xs text-zinc-500 italic py-1">
                        No hay disciplinas creadas aún en la base de datos. Creá primero las disciplinas en la pestaña "Disciplinas".
                      </p>
                    )}
                  </div>

                  {/* Especialidad adicional opcional */}
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">
                      Especialidad o Título adicional (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Lic. en Alto Rendimiento, Preparador Físico..."
                      value={formData.custom_specialty}
                      onChange={(e) => setFormData({ ...formData, custom_specialty: e.target.value })}
                      className="w-full rounded-xl bg-[#141418] p-2.5 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300">Biografía / Detalles</label>
                  <textarea
                    placeholder="Experiencia, certificaciones o bio del profesor..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)] h-20 resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center space-x-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-zinc-400 hover:text-white border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] py-3 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>{modalMode === 'CREATE' ? 'Crear Profesor' : 'Guardar Cambios'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModal.isOpen && deleteModal.trainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#141418] border border-rose-500/20 p-6 space-y-4 shadow-2xl text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">¿Estás seguro de eliminar este profesor?</h3>
                <p className="text-xs text-zinc-400">
                  Estás a punto de borrar la ficha de <strong className="text-white">{deleteModal.trainer.first_name} {deleteModal.trainer.last_name}</strong>.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, trainer: null })}
                  className="flex-1 rounded-xl bg-[#18181C] py-2.5 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-rose-500 py-2.5 text-xs font-black uppercase text-white hover:bg-rose-600 transition-all shadow-lg disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <span>Sí, Eliminar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
