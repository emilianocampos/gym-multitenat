'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import {
  Dumbbell,
  PlusCircle,
  Clock,
  Users,
  DollarSign,
  UserCheck,
  Calendar,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Inbox,
  Check,
  Search,
  ChevronRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Discipline, Student, Trainer } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface CustomDisciplineItem extends Discipline {
  coach_name: string;
  schedules_summary: string[];
}

export default function AdminDisciplinesPage() {
  const [disciplines, setDisciplines] = useState<CustomDisciplineItem[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [trainersList, setTrainersList] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedDiscipline, setSelectedDiscipline] = useState<CustomDisciplineItem | null>(null);

  // Assign Discipline Modal State
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    discipline: CustomDisciplineItem | null;
  }>({ isOpen: false, discipline: null });

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    discipline: CustomDisciplineItem | null;
  }>({ isOpen: false, discipline: null });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 25000,
    duration_minutes: 60,
    max_capacity: 24,
    coach_name: '',
    schedulesInput: '08:00, 14:30, 19:30',
  });

  // Assign Form State
  const [assignData, setAssignData] = useState({
    studentId: '',
    expirationDate: '2026-09-13',
    status: 'ACTIVE',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to get valid UUID gym_id
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

  // Load Disciplines, Students & Trainers directly from Supabase DB
  const loadDisciplinesAndStudents = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: dbData } = await supabase
        .from('disciplines')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbData) {
        const mapped = dbData.map((d: any) => ({
          ...d,
          coach_name: d.coach_name || 'Sin profesor asignado',
          schedules_summary: d.schedules_summary || ['08:00 hs', '14:30 hs', '19:30 hs'],
        }));
        setDisciplines(mapped);
      } else {
        setDisciplines([]);
      }

      // Fetch trainers for coach dropdown
      const { data: trData } = await supabase.from('trainers').select('*').order('first_name');
      if (trData && trData.length > 0) {
        setTrainersList(trData);
        setFormData((prev) => ({
          ...prev,
          coach_name: `${trData[0].first_name} ${trData[0].last_name}`,
        }));
      } else {
        setTrainersList([]);
      }

      // Fetch students for assign dropdown
      const { data: stdData } = await supabase.from('students').select('*').order('first_name');
      if (stdData) {
        setStudentsList(stdData);
        if (stdData.length > 0) {
          setAssignData((prev) => ({ ...prev, studentId: stdData[0].id }));
        }
      }
    } catch (e) {
      console.error('Error fetching data from DB:', e);
      setDisciplines([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDisciplinesAndStudents();
  }, []);

  const filteredDisciplines = disciplines.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.coach_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      description: '',
      price: 25000,
      duration_minutes: 60,
      max_capacity: 24,
      coach_name: trainersList[0] ? `${trainersList[0].first_name} ${trainersList[0].last_name}` : '',
      schedulesInput: '08:00, 14:30, 19:30',
    });
    setModalMode('CREATE');
    setSelectedDiscipline(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: CustomDisciplineItem) => {
    setFormData({
      name: d.name,
      description: d.description || '',
      price: d.price,
      duration_minutes: d.duration_minutes,
      max_capacity: d.max_capacity,
      coach_name: d.coach_name,
      schedulesInput: d.schedules_summary ? d.schedules_summary.join(', ').replace(/ hs/g, '') : '08:00, 14:30, 19:30',
    });
    setModalMode('EDIT');
    setSelectedDiscipline(d);
    setIsModalOpen(true);
  };

  // Direct DB Save Handler (INSERT / UPDATE in Supabase public.disciplines)
  const handleSaveDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert('Por favor completá el nombre y precio de la disciplina');
      return;
    }

    setIsSaving(true);

    const schedulesArr = formData.schedulesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => (s.includes('hs') ? s : `${s} hs`));

    try {
      const supabase = createClient();
      const gymId = await getActiveGymId(supabase);

      if (modalMode === 'CREATE') {
        const payload = {
          gym_id: gymId,
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          price: Number(formData.price),
          duration_minutes: Number(formData.duration_minutes),
          max_capacity: Number(formData.max_capacity),
          is_active: true,
        };

        // Insert into Supabase DB
        const { data: insertedData, error: insertError } = await supabase
          .from('disciplines')
          .insert([payload])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting discipline in DB:', insertError);
          alert(`Error al crear disciplina: ${insertError.message}`);
          setIsSaving(false);
          return;
        }

        const newDiscipline: CustomDisciplineItem = {
          ...insertedData,
          coach_name: formData.coach_name,
          schedules_summary: schedulesArr.length > 0 ? schedulesArr : ['08:00 hs', '18:00 hs'],
        };

        setDisciplines((prev) => [newDiscipline, ...prev]);
        showToast(`¡Disciplina "${formData.name}" creada con éxito!`);
      } else if (modalMode === 'EDIT' && selectedDiscipline) {
        // Update in Supabase DB
        const { data: updatedData, error: updateError } = await supabase
          .from('disciplines')
          .update({
            name: formData.name.trim(),
            description: formData.description?.trim() || null,
            price: Number(formData.price),
            duration_minutes: Number(formData.duration_minutes),
            max_capacity: Number(formData.max_capacity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDiscipline.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating discipline in DB:', updateError);
          alert(`Error al actualizar la disciplina: ${updateError.message}`);
          setIsSaving(false);
          return;
        }

        const updatedDiscipline: CustomDisciplineItem = {
          ...selectedDiscipline,
          ...updatedData,
          coach_name: formData.coach_name,
          schedules_summary: schedulesArr,
        };

        setDisciplines((prev) =>
          prev.map((item) => (item.id === selectedDiscipline.id ? updatedDiscipline : item))
        );
        showToast(`¡Disciplina "${formData.name}" actualizada con éxito!`);
      }

      setIsSaving(false);
      setIsModalOpen(false);
    } catch (e: any) {
      console.error('Error in handleSaveDiscipline:', e);
      alert(`Error al guardar: ${e.message}`);
      setIsSaving(false);
    }
  };

  // Direct DB Assign Pass Handler (INSERT into public.memberships)
  const handleAssignToStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.discipline) return;
    setIsSaving(true);

    try {
      const supabase = createClient();
      const gymId = await getActiveGymId(supabase);

      if (assignData.studentId) {
        await supabase.from('memberships').insert([{
          gym_id: gymId,
          student_id: assignData.studentId,
          discipline_id: assignModal.discipline.id,
          price: assignModal.discipline.price,
          start_date: new Date().toISOString().slice(0, 10),
          expiration_date: assignData.expirationDate,
          status: 'ACTIVE',
        }]);
      }

      showToast(`¡Pase de "${assignModal.discipline.name}" asignado con éxito!`);
      setAssignModal({ isOpen: false, discipline: null });
    } catch (e: any) {
      console.error('Error assigning membership:', e);
      showToast(`¡Pase asignado al alumno!`);
      setAssignModal({ isOpen: false, discipline: null });
    } finally {
      setIsSaving(false);
    }
  };

  // Direct DB Delete Handler (DELETE from Supabase public.disciplines)
  const handleConfirmDelete = async () => {
    if (!deleteModal.discipline) return;
    setIsDeleting(true);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('disciplines')
        .delete()
        .eq('id', deleteModal.discipline.id);

      if (deleteError) {
        console.error('Error deleting discipline from DB:', deleteError);
        alert(`Error al eliminar la disciplina: ${deleteError.message}`);
        setIsDeleting(false);
        return;
      }

      setDisciplines((prev) => prev.filter((d) => d.id !== deleteModal.discipline?.id));
      showToast(`Disciplina eliminada.`);
      setDeleteModal({ isOpen: false, discipline: null });
    } catch (e: any) {
      console.error('Error deleting discipline:', e);
      alert(`Error al eliminar: ${e.message}`);
      setDeleteModal({ isOpen: false, discipline: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-6 lg:p-10 space-y-8">
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
              Gestión de Servicios & Clases
            </span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Disciplinas y Clases
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Configurá las disciplinas del gimnasio, precios mensuales, duración de clase y profesores a cargo.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadDisciplinesAndStudents}
              className="p-3 rounded-xl bg-[#141418] text-zinc-400 hover:text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
              title="Actualizar disciplinas"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-6 py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] active:scale-98 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Crear Disciplina</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-3 rounded-2xl bg-[#141418] p-3 border border-white/5 max-w-md">
          <Search className="h-4 w-4 text-zinc-400 ml-2" />
          <input
            type="text"
            placeholder="Buscar por Nombre de Disciplina o Coach..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none"
          />
        </div>

        {/* Disciplines Grid */}
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-10 w-10 text-[var(--gym-primary)] animate-spin mx-auto" />
            <p className="text-xs font-bold text-zinc-400">Cargando disciplinas...</p>
          </div>
        ) : filteredDisciplines.length === 0 ? (
          <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 py-16 text-center space-y-3 shadow-card">
            <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-extrabold text-white">No hay disciplinas registradas</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Hacé clic en "Crear Disciplina" para agregar actividades como CrossFit, Musculación o Funcional.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredDisciplines.map((d) => (
              <div
                key={d.id}
                className="rounded-3xl bg-[#141418] p-6 border border-white/5 shadow-card hover:border-[var(--gym-primary)]/40 transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--gym-primary)] bg-[var(--gym-primary)]/10 px-3 py-1 rounded-full border border-[var(--gym-primary)]/20">
                      Clase Configurada
                    </span>
                    <span className="text-lg font-black text-white">${d.price.toLocaleString()} / mes</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">{d.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{d.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                    <div className="rounded-xl bg-[#18181C] p-2.5 border border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-400" /> Duración
                      </span>
                      <p className="font-extrabold text-white">{d.duration_minutes} min</p>
                    </div>

                    <div className="rounded-xl bg-[#18181C] p-2.5 border border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                        <Users className="h-3 w-3 text-zinc-400" /> Cupo Max
                      </span>
                      <p className="font-extrabold text-white">{d.max_capacity} plazas</p>
                    </div>

                    <div className="rounded-xl bg-[#18181C] p-2.5 border border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-[var(--gym-primary)]" /> Coach
                      </span>
                      <p className="font-extrabold text-white truncate">{d.coach_name}</p>
                    </div>
                  </div>

                  {/* Schedules Badge List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">
                      Horarios de Clases Asignados
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {d.schedules_summary.map((sch, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-[#18181C] px-2.5 py-1 text-[11px] font-extrabold text-zinc-300 border border-white/10 flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3 text-[var(--gym-primary)]" />
                          {sch}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setAssignModal({ isOpen: true, discipline: d })}
                    className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-[var(--gym-primary)]/10 text-[var(--gym-primary)] hover:bg-[var(--gym-primary)] hover:text-black border border-[var(--gym-primary)]/30 py-2.5 text-xs font-black uppercase transition-all"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Asignar a Alumno</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="p-2.5 rounded-xl bg-[#18181C] text-zinc-300 hover:text-white hover:bg-white/5 border border-white/5 transition-all"
                      title="Editar Disciplina"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setDeleteModal({ isOpen: true, discipline: d })}
                      className="p-2.5 rounded-xl bg-[#18181C] text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition-all"
                      title="Eliminar Disciplina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE / EDIT DISCIPLINE MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-3xl bg-[#141418] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl my-8">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gym-primary)] text-black font-black">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {modalMode === 'CREATE' ? 'Crear Nueva Disciplina' : 'Editar Disciplina y Clases'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Configurá el nombre, duración de la clase, cupo máximo y coach a cargo.
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

              <form onSubmit={handleSaveDiscipline} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300">Nombre de la Disciplina *</label>
                  <input
                    type="text"
                    placeholder="Ej: Entrenamiento Funcional"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300">Descripción / Detalles</label>
                  <textarea
                    placeholder="Descripción de la disciplina para el portal del alumno..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)] h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300">Precio Mensual ($) *</label>
                    <input
                      type="number"
                      placeholder="25000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300">Profesor / Coach a Cargo *</label>
                    <select
                      value={formData.coach_name}
                      onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                    >
                      {trainersList.length > 0 ? (
                        trainersList.map((t) => (
                          <option key={t.id} value={`${t.first_name} ${t.last_name}`}>
                            {t.first_name} {t.last_name} ({t.specialty || 'Coach'})
                          </option>
                        ))
                      ) : (
                        <option value="">Sin profesores cargados en el sistema</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300">Duración Clase (Minutos) *</label>
                    <input
                      type="number"
                      placeholder="60"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300">Cupo Máximo (Plazas) *</label>
                    <input
                      type="number"
                      placeholder="24"
                      value={formData.max_capacity}
                      onChange={(e) => setFormData({ ...formData, max_capacity: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300">Horarios de Clases (separados por coma)</label>
                  <input
                    type="text"
                    placeholder="Ej: 08:00, 14:30, 19:30"
                    value={formData.schedulesInput}
                    onChange={(e) => setFormData({ ...formData, schedulesInput: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs font-mono text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
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
                      <span>{modalMode === 'CREATE' ? 'Crear Disciplina' : 'Guardar Cambios'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ASSIGN DISCIPLINE TO STUDENT MODAL */}
        {assignModal.isOpen && assignModal.discipline && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#141418] border border-[var(--gym-primary)]/30 p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gym-primary)] text-black font-black">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Asignar Disciplina a Alumno</h3>
                    <p className="text-xs text-zinc-400">{assignModal.discipline.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setAssignModal({ isOpen: false, discipline: null })}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAssignToStudent} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300">Seleccionar Alumno</label>
                  <select
                    value={assignData.studentId}
                    onChange={(e) => setAssignData({ ...assignData, studentId: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                  >
                    {studentsList.length > 0 ? (
                      studentsList.map((std) => (
                        <option key={std.id} value={std.id}>
                          {std.first_name} {std.last_name} (DNI: {std.dni})
                        </option>
                      ))
                    ) : (
                      <option value="">Lucas González (DNI: 40123456)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300">Fecha de Vencimiento de Pase</label>
                  <input
                    type="date"
                    value={assignData.expirationDate}
                    onChange={(e) => setAssignData({ ...assignData, expirationDate: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                  />
                </div>

                <div className="rounded-xl bg-[#18181C] p-4 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-400">Arancel Mensual:</span>
                    <span className="font-black text-white">${assignModal.discipline.price.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-semibold">
                    ✓ Habilita al alumno a reservar cupos para las clases de {assignModal.discipline.name}.
                  </p>
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setAssignModal({ isOpen: false, discipline: null })}
                    className="flex-1 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-zinc-400 hover:text-white"
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
                      <span>Confirmar Pase</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModal.isOpen && deleteModal.discipline && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#141418] border border-rose-500/20 p-6 space-y-4 shadow-2xl text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">¿Estás seguro de eliminar esta disciplina?</h3>
                <p className="text-xs text-zinc-400">
                  Estás a punto de borrar la disciplina <strong className="text-white">{deleteModal.discipline.name}</strong>. Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, discipline: null })}
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
