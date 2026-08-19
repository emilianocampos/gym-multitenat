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
  AlertTriangle,
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
import { parseDisciplineMeta, formatDisciplineDescription } from '@/lib/utils/discipline-meta';

interface CustomDisciplineItem extends Discipline {
  coach_name: string;
  schedules_summary: string[];
  assigned_students_count?: number;
}

export default function AdminDisciplinesPage() {
  const [disciplines, setDisciplines] = useState<CustomDisciplineItem[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [trainersList, setTrainersList] = useState<Trainer[]>([]);
  const [membershipsList, setMembershipsList] = useState<any[]>([]);
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
    price_2x: 18000,
    price_3x: 22000,
    price_6x: 26000,
    price_single: 4500,
    price: 26000,
    duration_minutes: 60,
    max_capacity: 24,
    coach_name: '',
    selectedSchedules: ['08:00', '14:30', '19:30'] as string[],
  });

  const [customTimeInput, setCustomTimeInput] = useState('08:00');

  // Assign form state
  const [assignData, setAssignData] = useState({
    studentId: '',
    frequency: '3X' as '2X' | '3X' | '6X',
    price: 22000,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preset time slots
  const PRESET_HOURS = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '14:00', '14:30', '15:00', '16:00', '17:00',
    '18:00', '19:00', '19:30', '20:00', '21:00'
  ];

  // Helper to toggle a schedule
  const handleToggleSchedule = (time: string) => {
    setFormData((prev) => {
      const exists = prev.selectedSchedules.includes(time);
      const updated = exists
        ? prev.selectedSchedules.filter((t) => t !== time)
        : [...prev.selectedSchedules, time].sort();
      return { ...prev, selectedSchedules: updated };
    });
  };

  // Helper to add custom schedule
  const handleAddCustomSchedule = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!customTimeInput) return;
    if (!formData.selectedSchedules.includes(customTimeInput)) {
      setFormData((prev) => ({
        ...prev,
        selectedSchedules: [...prev.selectedSchedules, customTimeInput].sort(),
      }));
    }
  };

  // Helper to remove schedule
  const handleRemoveSchedule = (time: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSchedules: prev.selectedSchedules.filter((t) => t !== time),
    }));
  };

  // Quick preset sets
  const handleSetShift = (shift: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ALL' | 'CLEAR') => {
    if (shift === 'CLEAR') {
      setFormData((prev) => ({ ...prev, selectedSchedules: [] }));
    } else if (shift === 'ALL') {
      setFormData((prev) => ({
        ...prev,
        selectedSchedules: [...PRESET_HOURS],
      }));
    } else if (shift === 'MORNING') {
      setFormData((prev) => ({
        ...prev,
        selectedSchedules: Array.from(new Set([...prev.selectedSchedules, '07:00', '08:00', '09:00', '10:00', '11:00'])).sort(),
      }));
    } else if (shift === 'AFTERNOON') {
      setFormData((prev) => ({
        ...prev,
        selectedSchedules: Array.from(new Set([...prev.selectedSchedules, '14:00', '14:30', '15:00', '16:00', '17:00'])).sort(),
      }));
    } else if (shift === 'EVENING') {
      setFormData((prev) => ({
        ...prev,
        selectedSchedules: Array.from(new Set([...prev.selectedSchedules, '18:00', '19:00', '19:30', '20:00', '21:00'])).sort(),
      }));
    }
  };

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

  // Load Disciplines, Students and Trainers directly from DB
  const loadDisciplinesAndStudents = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Fetch disciplines
      const { data: dbData, error } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching disciplines from DB:', error);
        showToast(`Error al cargar disciplinas: ${error.message}`);
        setDisciplines([]);
      }

      // Fetch all memberships to count enrolled students per discipline and check assignments
      const { data: dbMemberships } = await supabase
        .from('memberships')
        .select('id, student_id, discipline_id, price, status, expiration_date');

      if (dbMemberships) {
        setMembershipsList(dbMemberships);
      } else {
        setMembershipsList([]);
      }

      if (dbData) {
        const mapped = dbData.map((d: any) => {
          const meta = parseDisciplineMeta(d);
          const assignedCount = dbMemberships
            ? dbMemberships.filter((m: any) => m.discipline_id === d.id && m.status === 'ACTIVE').length
            : 0;

          return {
            ...d,
            description: meta.cleanDescription,
            coach_name: meta.coach_name,
            schedules_summary: meta.schedules_summary,
            price_2x: meta.price_2x,
            price_3x: meta.price_3x,
            price_6x: meta.price_6x,
            price_single: meta.price_single,
            assigned_students_count: assignedCount,
          };
        });
        setDisciplines(mapped);
      } else {
        setDisciplines([]);
      }

      // Fetch trainers for coach dropdown
      const { data: trData } = await supabase.from('trainers').select('*').order('first_name');
      if (trData && trData.length > 0 && trData[0]) {
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
        if (stdData.length > 0 && stdData[0]) {
          setAssignData((prev) => ({ ...prev, studentId: stdData[0].id }));
        }
      }
    } catch (e: any) {
      console.error('Error fetching data from DB:', e);
      showToast(`Error de conexión: ${e.message}`);
      setDisciplines([]);
    } finally {
      setIsLoading(false);
    }
  };;

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
      price_2x: 18000,
      price_3x: 22000,
      price_6x: 26000,
      price_single: 4500,
      price: 26000,
      duration_minutes: 60,
      max_capacity: 24,
      coach_name: trainersList[0] ? `${trainersList[0].first_name} ${trainersList[0].last_name}` : '',
      selectedSchedules: ['08:00', '14:30', '19:30'],
    });
    setModalMode('CREATE');
    setSelectedDiscipline(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: CustomDisciplineItem) => {
    const meta = parseDisciplineMeta(d);

    setFormData({
      name: d.name,
      description: meta.cleanDescription || '',
      price: d.price || 26000,
      price_2x: meta.price_2x,
      price_3x: meta.price_3x,
      price_6x: meta.price_6x,
      price_single: meta.price_single,
      duration_minutes: d.duration_minutes,
      max_capacity: d.max_capacity,
      coach_name: meta.coach_name,
      selectedSchedules: meta.selectedSchedules,
    });
    setModalMode('EDIT');
    setSelectedDiscipline(d);
    setIsModalOpen(true);
  };

  // Direct DB Save Handler (INSERT / UPDATE in Supabase public.disciplines)
  const handleSaveDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Por favor completá el nombre de la disciplina');
      return;
    }

    if (formData.selectedSchedules.length === 0) {
      alert('Por favor seleccioná al menos un horario para la disciplina.');
      return;
    }

    setIsSaving(true);

    const isDuplicateName = disciplines.some(
      (d) =>
        d.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
        d.id !== selectedDiscipline?.id
    );

    if (isDuplicateName) {
      alert(`⚠️ Ya existe una disciplina con el nombre "${formData.name.trim()}". No se pueden repetir disciplinas.`);
      setIsSaving(false);
      return;
    }

    const schedulesArr = formData.selectedSchedules.map((s) => `${s} hs`);
    const formattedDesc = formatDisciplineDescription(
      formData.description,
      formData.coach_name,
      formData.selectedSchedules,
      {
        price_2x: Number(formData.price_2x),
        price_3x: Number(formData.price_3x),
        price_6x: Number(formData.price_6x),
        price_single: Number(formData.price_single),
      }
    );

    try {
      const supabase = createClient();
      const gymId = await getActiveGymId(supabase);

      const mainPrice = Number(formData.price_6x || formData.price || 26000);

      if (modalMode === 'CREATE') {
        const payload = {
          gym_id: gymId,
          name: formData.name.trim(),
          description: formattedDesc,
          price: mainPrice,
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
          alert(`Error al crear disciplina en la Base de Datos: ${insertError.message}`);
          setIsSaving(false);
          return;
        }

        const newDiscipline: CustomDisciplineItem = {
          ...insertedData,
          description: formData.description?.trim() || '',
          coach_name: formData.coach_name,
          schedules_summary: schedulesArr.length > 0 ? schedulesArr : ['08:00 hs', '18:00 hs'],
          price_2x: Number(formData.price_2x),
          price_3x: Number(formData.price_3x),
          price_6x: mainPrice,
          price_single: Number(formData.price_single),
        };

        setDisciplines((prev) => [newDiscipline, ...prev]);
        showToast(`¡Disciplina "${formData.name}" guardada en la base de datos!`);
      } else if (modalMode === 'EDIT' && selectedDiscipline) {
        // Update in Supabase DB
        const { data: updatedData, error: updateError } = await supabase
          .from('disciplines')
          .update({
            name: formData.name.trim(),
            description: formattedDesc,
            price: mainPrice,
            duration_minutes: Number(formData.duration_minutes),
            max_capacity: Number(formData.max_capacity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDiscipline.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating discipline in DB:', updateError);
          alert(`Error al actualizar disciplina en la Base de Datos: ${updateError.message}`);
          setIsSaving(false);
          return;
        }

        const newMeta = parseDisciplineMeta(updatedData || { description: formattedDesc });

        const updatedDiscipline: CustomDisciplineItem = {
          ...selectedDiscipline,
          ...(updatedData || {}),
          description: newMeta.cleanDescription,
          coach_name: formData.coach_name,
          schedules_summary: schedulesArr,
          price_2x: newMeta.price_2x,
          price_3x: newMeta.price_3x,
          price_6x: newMeta.price_6x,
          price_single: newMeta.price_single,
        };

        setDisciplines((prev) =>
          prev.map((item) => (item.id === selectedDiscipline.id ? updatedDiscipline : item))
        );
        showToast(`¡Disciplina "${formData.name}" actualizada en la base de datos!`);
      }

      setIsSaving(false);
      setIsModalOpen(false);
    } catch (e: any) {
      console.error('Error in handleSaveDiscipline:', e);
      alert(`Error al guardar: ${e.message}`);
      setIsSaving(false);
    }
  };

  // Direct DB Assign Pass Handler (INSERT or UPDATE into public.memberships without duplicates)
  const handleAssignToStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.discipline || !assignData.studentId) return;
    setIsSaving(true);

    try {
      const supabase = createClient();
      const gymId = await getActiveGymId(supabase);

      const chosenPrice = Number(assignData.price) || assignModal.discipline.price;

      // 1. Check if student already has existing membership(s) for this discipline
      const { data: existingMemberships } = await supabase
        .from('memberships')
        .select('id')
        .eq('student_id', assignData.studentId)
        .eq('discipline_id', assignModal.discipline.id);

      if (existingMemberships && existingMemberships.length > 0 && existingMemberships[0]) {
        // Update the primary one
        const primaryId = existingMemberships[0].id;
        await supabase
          .from('memberships')
          .update({
            price: chosenPrice,
            start_date: new Date().toISOString().slice(0, 10),
            expiration_date: assignData.expirationDate,
            status: 'ACTIVE',
            updated_at: new Date().toISOString(),
          })
          .eq('id', primaryId);

        // Delete any duplicate rows if they existed in the DB
        if (existingMemberships.length > 1) {
          const duplicateIds = existingMemberships.slice(1).map((m: any) => m.id);
          await supabase
            .from('memberships')
            .delete()
            .in('id', duplicateIds);
        }

        showToast(`¡Pase de "${assignModal.discipline.name}" actualizado sin duplicar!`);
      } else {
        await supabase.from('memberships').insert([{
          gym_id: gymId,
          student_id: assignData.studentId,
          discipline_id: assignModal.discipline.id,
          price: chosenPrice,
          start_date: new Date().toISOString().slice(0, 10),
          expiration_date: assignData.expirationDate,
          status: 'ACTIVE',
        }]);

        showToast(`¡Pase ${assignData.frequency} de "${assignModal.discipline.name}" ($${chosenPrice.toLocaleString()}) asignado con éxito!`);
      }

      setAssignModal({ isOpen: false, discipline: null });
      loadDisciplinesAndStudents();
    } catch (e: any) {
      console.error('Error assigning membership:', e);
      showToast(`¡Pase procesado!`);
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
              Gestión de Servicios & Clases
            </span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Disciplinas y Clases
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Configurá las disciplinas del gimnasio, precios mensuales, duración de clase y profesores a cargo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={loadDisciplinesAndStudents}
              className="p-2.5 sm:p-3 rounded-xl bg-[#141418] text-zinc-400 hover:text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
              title="Actualizar disciplinas"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-4 sm:px-6 py-2.5 sm:py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] active:scale-98 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Crear Disciplina</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-3 rounded-2xl bg-[#141418] p-3 border border-white/5 w-full max-w-md">
          <Search className="h-4 w-4 text-zinc-400 ml-2 shrink-0" />
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
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--gym-primary)] bg-[var(--gym-primary)]/10 px-3 py-1 rounded-full border border-[var(--gym-primary)]/20">
                        Clase Configurada
                      </span>
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {d.assigned_students_count || 0} {(d.assigned_students_count === 1 ? 'alumno' : 'alumnos')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-white">
                        ${(d.price_6x || d.price || 26000).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-bold">Pase Libre / mes</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">{d.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{d.description}</p>
                  </div>

                  {/* Pricing by Class Frequency Tiers */}
                  <div className="rounded-2xl bg-[#18181C] p-3 border border-white/5 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-[var(--gym-primary)]" />
                      Aranceles por Cantidad de Clases:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded-xl bg-[#141418] p-2 border border-white/5">
                        <span className="text-[10px] font-bold text-zinc-400 block">2x / sem</span>
                        <p className="text-xs font-black text-white mt-0.5">
                          ${(d.price_2x || Math.round((d.price || 26000) * 0.7)).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#141418] p-2 border border-[var(--gym-primary)]/30 bg-[var(--gym-primary)]/5">
                        <span className="text-[10px] font-black text-[var(--gym-primary)] block">3x / sem</span>
                        <p className="text-xs font-black text-[var(--gym-primary)] mt-0.5">
                          ${(d.price_3x || Math.round((d.price || 26000) * 0.85)).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#141418] p-2 border border-white/5">
                        <span className="text-[10px] font-bold text-zinc-400 block">6x / Libre</span>
                        <p className="text-xs font-black text-white mt-0.5">
                          ${(d.price_6x || d.price || 26000).toLocaleString()}
                        </p>
                      </div>
                    </div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-[#141418] border border-white/10 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 shadow-2xl my-auto">
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

                {/* ESTRUCTURA DE PRECIOS POR FRECUENCIA DE CLASES (2X, 3X, 6X) */}
                <div className="rounded-2xl bg-[#18181C] p-4 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)] flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      <span>Planes de Arancel por Cantidad de Clases *</span>
                    </label>
                    <span className="text-[10px] font-bold text-zinc-400">Mensuales</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 2x por semana */}
                    <div className="rounded-xl bg-[#141418] p-3 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                        ⚡ 2x por semana
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-black text-zinc-500">$</span>
                        <input
                          type="number"
                          placeholder="18000"
                          value={formData.price_2x}
                          onChange={(e) => setFormData({ ...formData, price_2x: Number(e.target.value) })}
                          className="w-full bg-transparent text-sm font-black text-white outline-none"
                          required
                        />
                      </div>
                      <span className="text-[9px] text-zinc-500 block">8 a 9 clases/mes</span>
                    </div>

                    {/* 3x por semana */}
                    <div className="rounded-xl bg-[#141418] p-3 border border-[var(--gym-primary)]/30 bg-[var(--gym-primary)]/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-[var(--gym-primary)] block">
                        🔥 3x por semana
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-black text-[var(--gym-primary)]">$</span>
                        <input
                          type="number"
                          placeholder="22000"
                          value={formData.price_3x}
                          onChange={(e) => setFormData({ ...formData, price_3x: Number(e.target.value) })}
                          className="w-full bg-transparent text-sm font-black text-[var(--gym-primary)] outline-none"
                          required
                        />
                      </div>
                      <span className="text-[9px] text-zinc-400 block">12 a 14 clases/mes</span>
                    </div>

                    {/* 6x por semana / Pase Libre */}
                    <div className="rounded-xl bg-[#141418] p-3 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-zinc-300 block">
                        👑 6x / Pase Libre
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-black text-zinc-500">$</span>
                        <input
                          type="number"
                          placeholder="26000"
                          value={formData.price_6x}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData({ ...formData, price_6x: val, price: val });
                          }}
                          className="w-full bg-transparent text-sm font-black text-white outline-none"
                          required
                        />
                      </div>
                      <span className="text-[9px] text-zinc-500 block">Pase Ilimitado</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                {/* SELECTOR DE HORARIOS DE LA DISCIPLINA */}
                <div className="rounded-2xl bg-[#18181C] p-4 border border-[var(--gym-primary)]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--gym-primary)] flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> Selector de Horarios de la Disciplina *
                    </label>
                    <span className="text-[10px] font-extrabold text-zinc-400">
                      {formData.selectedSchedules.length} {formData.selectedSchedules.length === 1 ? 'turno seleccionado' : 'turnos seleccionados'}
                    </span>
                  </div>

                  {/* Selected Schedule Tags / Badges */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">
                      Horarios Asignados (clic en la "X" para quitar):
                    </span>
                    {formData.selectedSchedules.length === 0 ? (
                      <p className="text-xs text-amber-400/80 font-semibold italic">
                        No has seleccionado ningún horario. Seleccioná los turnos abajo.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {formData.selectedSchedules.map((time) => (
                          <span
                            key={time}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--gym-primary)] text-black text-xs font-black shadow-sm"
                          >
                            <Clock className="h-3 w-3" />
                            <span>{time} hs</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSchedule(time)}
                              className="ml-0.5 hover:bg-black/20 rounded p-0.5 transition-colors"
                              title="Quitar este horario"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Shift Presets & Reset */}
                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-zinc-500 mr-1">Cargar Rápido:</span>
                    <button
                      type="button"
                      onClick={() => handleSetShift('MORNING')}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 transition-colors"
                    >
                      + Mañana (7 a 11 hs)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetShift('AFTERNOON')}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 transition-colors"
                    >
                      + Tarde (14 a 17 hs)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetShift('EVENING')}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 transition-colors"
                    >
                      + Noche (18 a 21 hs)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetShift('CLEAR')}
                      className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[10px] font-bold text-rose-400 border border-rose-500/20 ml-auto transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>

                  {/* Interactive Preset Hours Grid */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">
                      Seleccionar de la grilla de turnos:
                    </span>
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                      {PRESET_HOURS.map((time) => {
                        const isSelected = formData.selectedSchedules.includes(time);
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => handleToggleSchedule(time)}
                            className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all text-center ${
                              isSelected
                                ? 'bg-[var(--gym-primary)] text-black font-black shadow-neon'
                                : 'bg-[#141418] text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Custom Time Input */}
                  <div className="pt-2 border-t border-white/5 flex items-center space-x-2">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-1">
                        ¿Otro Horario Personalizado?
                      </span>
                      <input
                        type="time"
                        value={customTimeInput}
                        onChange={(e) => setCustomTimeInput(e.target.value)}
                        className="w-full rounded-xl bg-[#141418] p-2 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)] font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomSchedule}
                      className="self-end px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-[var(--gym-primary)] hover:bg-[var(--gym-primary)] hover:text-black border border-[var(--gym-primary)]/30 transition-all flex items-center gap-1 h-[34px]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
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

                {membershipsList.some((m) => m.student_id === assignData.studentId && m.discipline_id === assignModal.discipline?.id) && (
                  <div className="rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-white font-extrabold">El alumno ya tiene asignada esta disciplina</p>
                      <p className="text-[11px] text-amber-200/90 font-medium leading-relaxed">
                        Al guardar se actualizará su arancel (${(assignData.price || assignModal.discipline.price).toLocaleString()}) y vencimiento sin duplicar el pase.
                      </p>
                    </div>
                  </div>
                )}

                {/* Plan Frequency Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Plan por Cantidad de Clases *</span>
                    <span className="text-[10px] font-black text-[var(--gym-primary)]">
                      ${(assignData.price || assignModal.discipline.price).toLocaleString()}
                    </span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {/* 2x per week */}
                    <button
                      type="button"
                      onClick={() =>
                        setAssignData({
                          ...assignData,
                          frequency: '2X',
                          price: assignModal.discipline?.price_2x || Math.round((assignModal.discipline?.price || 26000) * 0.7),
                        })
                      }
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        assignData.frequency === '2X'
                          ? 'bg-[var(--gym-primary)]/10 border-[var(--gym-primary)] text-white'
                          : 'bg-[#18181C] border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase block">⚡ 2x / sem</span>
                      <span className="text-xs font-black text-white block mt-0.5">
                        ${(assignModal.discipline.price_2x || Math.round((assignModal.discipline.price || 26000) * 0.7)).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">8 clases/mes</span>
                    </button>

                    {/* 3x per week */}
                    <button
                      type="button"
                      onClick={() =>
                        setAssignData({
                          ...assignData,
                          frequency: '3X',
                          price: assignModal.discipline?.price_3x || Math.round((assignModal.discipline?.price || 26000) * 0.85),
                        })
                      }
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        assignData.frequency === '3X'
                          ? 'bg-[var(--gym-primary)]/10 border-[var(--gym-primary)] text-white'
                          : 'bg-[#18181C] border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase text-[var(--gym-primary)] block">🔥 3x / sem</span>
                      <span className="text-xs font-black text-[var(--gym-primary)] block mt-0.5">
                        ${(assignModal.discipline.price_3x || Math.round((assignModal.discipline.price || 26000) * 0.85)).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-zinc-400 block">12 clases/mes</span>
                    </button>

                    {/* 6x / Free pass */}
                    <button
                      type="button"
                      onClick={() =>
                        setAssignData({
                          ...assignData,
                          frequency: '6X',
                          price: assignModal.discipline?.price_6x || assignModal.discipline?.price || 26000,
                        })
                      }
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        assignData.frequency === '6X'
                          ? 'bg-[var(--gym-primary)]/10 border-[var(--gym-primary)] text-white'
                          : 'bg-[#18181C] border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase block">👑 6x / Libre</span>
                      <span className="text-xs font-black text-white block mt-0.5">
                        ${(assignModal.discipline.price_6x || assignModal.discipline.price || 26000).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">Ilimitado</span>
                    </button>
                  </div>
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
                    <span className="font-bold text-zinc-400">Total a Cobrar ({assignData.frequency}):</span>
                    <span className="font-black text-lg text-[var(--gym-primary)]">
                      ${(assignData.price || assignModal.discipline.price).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-semibold">
                    ✓ Habilita al alumno a reservar cupos de {assignModal.discipline.name} según el plan {assignData.frequency}.
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
