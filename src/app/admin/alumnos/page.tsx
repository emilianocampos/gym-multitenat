'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  Inbox,
  Edit,
  Trash2,
  Key,
  Copy,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  ShieldCheck,
  Eye,
  Send,
  Calendar,
  MapPin,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Student, StudentStatus } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export default function AdminStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentStatus>('ALL');

  const [students, setStudents] = useState<(Student & { password?: string })[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedStudent, setSelectedStudent] = useState<(Student & { password?: string }) | null>(null);

  // Credentials Modal State
  const [credentialsModal, setCredentialsModal] = useState<{
    isOpen: boolean;
    student: (Student & { password?: string }) | null;
  }>({ isOpen: false, student: null });

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    student: Student | null;
  }>({ isOpen: false, student: null });

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    email: '',
    phone: '',
    birth_date: '',
    address: '',
    status: 'ACTIVE' as StudentStatus,
    password: '',
  });

  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to resolve active valid UUID for gym_id
  const getActiveGymId = async (supabase: any): Promise<string> => {
    try {
      // 1. Check authenticated user's profile gym_id
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.gym_id) return profile.gym_id;
      }

      // 2. Fetch first available gym in database
      const { data: gym } = await supabase.from('gyms').select('id').limit(1).maybeSingle();
      if (gym?.id) return gym.id;

      // 3. Fallback: Create gym if database is empty
      const { data: newGym } = await supabase
        .from('gyms')
        .insert([{ name: 'Iron Gym Center', slug: 'irongym', email: 'admin@irongym.com' }])
        .select('id')
        .single();
      if (newGym?.id) return newGym.id;
    } catch (e) {
      console.error('Error resolving active gym ID:', e);
    }
    return 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Valid UUID fallback
  };

  // Load Students directly from Database (Supabase SELECT)
  const fetchStudents = async () => {
    setIsLoadingList(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data: dbStudents, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students from DB:', error);
        setErrorMessage(`Error al cargar lista de alumnos: ${error.message}`);
        setStudents([]);
      } else {
        setStudents(dbStudents || []);
      }
    } catch (err: any) {
      console.error('Database connection error:', err);
      setStudents([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter students based on search and status
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.dni.includes(searchTerm) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      first_name: '',
      last_name: '',
      dni: '',
      email: '',
      phone: '',
      birth_date: '',
      address: '',
      status: 'ACTIVE',
      password: `gym${Math.floor(100000 + Math.random() * 900000)}`,
    });
    setModalMode('CREATE');
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (student: Student & { password?: string }) => {
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      dni: student.dni,
      email: student.email,
      phone: student.phone || '',
      birth_date: student.birth_date || '',
      address: student.address || '',
      status: student.status,
      password: student.password || '••••••••',
    });
    setModalMode('EDIT');
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  // Save Student directly to Supabase DB (INSERT / UPDATE)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.dni || !formData.email) {
      alert('Por favor completá todos los campos obligatorios (*)');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const gymId = await getActiveGymId(supabase);

      if (modalMode === 'CREATE') {
        const payload = {
          gym_id: gymId,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          dni: formData.dni.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone?.trim() || null,
          birth_date: formData.birth_date || null,
          join_date: new Date().toISOString().slice(0, 10),
          address: formData.address?.trim() || null,
          status: formData.status,
        };

        // 1. Direct INSERT into public.students in Supabase
        const { data: insertedData, error: insertError } = await supabase
          .from('students')
          .insert([payload])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting student into DB:', insertError);
          setErrorMessage(`Error al crear en la Base de Datos: ${insertError.message}`);
          setIsSaving(false);
          return;
        }

        // 2. Register user account for Student Portal
        try {
          await supabase.auth.signUp({
            email: formData.email.trim(),
            password: formData.password,
            options: {
              data: {
                first_name: formData.first_name,
                last_name: formData.last_name,
                dni: formData.dni,
                gym_id: gymId,
                role: 'STUDENT',
              },
            },
          });
        } catch (authErr) {
          console.warn('Auth user registration note:', authErr);
        }

        const createdStudent = {
          ...(insertedData || payload),
          id: insertedData?.id || `std-${Date.now()}`,
          password: formData.password || `gym${Math.floor(100000 + Math.random() * 900000)}`,
        };

        setStudents((prev) => [createdStudent, ...prev]);
        setIsModalOpen(false);
        setIsSaving(false);

        // Open Credentials Modal
        setCredentialsModal({
          isOpen: true,
          student: createdStudent,
        });
      } else if (modalMode === 'EDIT' && selectedStudent) {
        // Direct UPDATE in public.students in Supabase
        const { data: updatedData, error: updateError } = await supabase
          .from('students')
          .update({
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            dni: formData.dni.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone?.trim() || null,
            birth_date: formData.birth_date || null,
            address: formData.address?.trim() || null,
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedStudent.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating student in DB:', updateError);
          setErrorMessage(`Error al actualizar en la Base de Datos: ${updateError.message}`);
          setIsSaving(false);
          return;
        }

        const updatedStudent = {
          ...selectedStudent,
          ...(updatedData || {
            first_name: formData.first_name,
            last_name: formData.last_name,
            dni: formData.dni,
            email: formData.email,
            phone: formData.phone,
            birth_date: formData.birth_date,
            address: formData.address,
            status: formData.status,
          }),
        };

        setStudents((prev) =>
          prev.map((std) => (std.id === selectedStudent.id ? updatedStudent : std))
        );
        setIsModalOpen(false);
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error('Error in handleSaveStudent:', err);
      setErrorMessage(`Error: ${err.message || 'No se pudo guardar la información'}`);
      setIsSaving(false);
    }
  };

  // Delete Student directly from Database (Supabase DELETE)
  const handleConfirmDelete = async () => {
    if (!deleteModal.student) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteModal.student.id);

      if (deleteError) {
        console.error('Error deleting student from DB:', deleteError);
        alert(`Error al eliminar de la Base de Datos: ${deleteError.message}`);
        setIsDeleting(false);
        return;
      }

      setStudents((prev) => prev.filter((std) => std.id !== deleteModal.student?.id));
      setDeleteModal({ isOpen: false, student: null });
    } catch (e: any) {
      console.error('Error deleting student:', e);
      alert(`Error al eliminar: ${e.message}`);
      setDeleteModal({ isOpen: false, student: null });
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy WhatsApp Access Message
  const handleCopyWhatsAppMessage = (student: Student & { password?: string }) => {
    const portalUrl = `${window.location.origin}/irongym/portal-alumno`;
    const message = `¡Hola ${student.first_name}! 👋 Te damos la bienvenida a nuestro gimnasio.
    
Ya podés ingresar a tu Portal del Alumno para ver tu rutina, horarios y cuotas:
🌐 Link: ${portalUrl}
👤 Usuario / Email: ${student.email}
🔑 Contraseña: ${student.password || 'Tu DNI o Contraseña asignada'}

¡Te esperamos en el gym! 🏋️‍♂️💪`;

    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-6 lg:p-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--gym-primary)]">
              Gestión de Alumnos & Cuentas de Portal
            </span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
              Directorio de Alumnos
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Alta de fichas, generación de accesos al portal del alumno y control de membresías.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchStudents}
              className="p-3 rounded-xl bg-[#141418] text-zinc-400 hover:text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
              title="Actualizar directorio de alumnos"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-6 py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] active:scale-98 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Crear Nuevo Alumno</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="rounded-2xl bg-rose-500/10 p-4 border border-rose-500/20 text-xs font-bold text-rose-400 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl bg-[#141418] p-4 border border-white/5">
          <div className="flex items-center space-x-3 rounded-xl bg-[#18181C] px-3 py-2.5 w-full md:w-96 border border-white/10 focus-within:border-[var(--gym-primary)]">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por Nombre, DNI o Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-white outline-none"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1.5 rounded-xl bg-[#18181C] p-1 border border-white/5 w-full md:w-auto overflow-x-auto">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'ACTIVE', label: 'Activos' },
              { id: 'INACTIVE', label: 'Inactivos' },
              { id: 'SUSPENDED', label: 'Suspendidos' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === f.id
                    ? 'bg-[var(--gym-primary)] text-black shadow-neon'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 shadow-card">
          {isLoadingList ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-10 w-10 text-[var(--gym-primary)] animate-spin mx-auto" />
              <p className="text-xs font-bold text-zinc-400">Cargando directorio de alumnos...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Inbox className="h-12 w-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-extrabold text-white">No se encontraron alumnos</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'No hay resultados que coincidan con la búsqueda o filtro seleccionado.'
                  : 'Todavía no has registrado alumnos en tu gimnasio. Hacé clic en "Crear Nuevo Alumno" para agregar el primero.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181C] text-zinc-400 font-extrabold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-4">Alumno</th>
                    <th className="p-4">DNI / Contacto</th>
                    <th className="p-4">Cuenta Portal</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300 font-semibold">
                  {filteredStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-9 w-9 rounded-full bg-zinc-800 border border-[var(--gym-primary)] flex items-center justify-center font-black text-xs text-[var(--gym-primary)]">
                            {std.first_name[0]}
                            {std.last_name[0]}
                          </div>
                          <div>
                            <p className="font-extrabold text-white text-sm">
                              {std.first_name} {std.last_name}
                            </p>
                            <span className="text-[10px] text-zinc-500">Alta: {std.join_date}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 space-y-0.5">
                        <p className="font-bold text-white">DNI: {std.dni}</p>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-zinc-500" /> {std.phone || 'Sin teléfono'}
                        </p>
                      </td>

                      <td className="p-4 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <Mail className="h-3.5 w-3.5 text-[var(--gym-primary)]" />
                          <span className="text-xs font-mono text-zinc-300">{std.email}</span>
                        </div>
                        <button
                          onClick={() => setCredentialsModal({ isOpen: true, student: std })}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--gym-primary)] hover:underline"
                        >
                          <Key className="h-3 w-3" /> Ver Credenciales Portal
                        </button>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                            std.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : std.status === 'SUSPENDED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              std.status === 'ACTIVE'
                                ? 'bg-emerald-400'
                                : std.status === 'SUSPENDED'
                                ? 'bg-rose-400'
                                : 'bg-zinc-400'
                            }`}
                          />
                          {std.status === 'ACTIVE'
                            ? 'Activo'
                            : std.status === 'SUSPENDED'
                            ? 'Suspendido'
                            : 'Inactivo'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(std)}
                            className="p-2 rounded-xl bg-[#18181C] text-zinc-300 hover:text-[var(--gym-primary)] hover:bg-white/5 border border-white/5 transition-all"
                            title="Editar Ficha de Alumno"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, student: std })}
                            className="p-2 rounded-xl bg-[#18181C] text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition-all"
                            title="Eliminar Alumno"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CREATE / EDIT STUDENT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-xl rounded-3xl bg-[#141418] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl my-8">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gym-primary)] text-black font-black">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {modalMode === 'CREATE' ? 'Crear Nuevo Alumno' : 'Editar Ficha de Alumno'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {modalMode === 'CREATE'
                        ? 'Se creará su ficha y la cuenta de acceso para el portal del alumno.'
                        : 'Modificá los datos personales o el estado de membresía del alumno.'}
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

              <form onSubmit={handleSaveStudent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300">Nombre *</label>
                    <input
                      type="text"
                      placeholder="Ej: Lucas"
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
                      placeholder="Ej: González"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300">DNI / Identificación *</label>
                    <input
                      type="text"
                      placeholder="Ej: 40123456"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300">Email (Usuario Portal) *</label>
                    <input
                      type="email"
                      placeholder="lucas@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+54 11 4567-8901"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300">Estado de Membresía</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="mt-1 w-full rounded-xl bg-[#18181C] p-3 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                      <option value="SUSPENDED">Suspendido</option>
                    </select>
                  </div>
                </div>

                {/* Password field for Student Portal access */}
                {modalMode === 'CREATE' && (
                  <div className="rounded-2xl bg-[#18181C] p-4 border border-[var(--gym-primary)]/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[var(--gym-primary)] flex items-center gap-1.5">
                        <Key className="h-4 w-4" /> Contraseña para el Portal del Alumno *
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            password: `gym${Math.floor(100000 + Math.random() * 900000)}`,
                          })
                        }
                        className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Generar otra
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl bg-[#0B0B0E] p-3 text-xs font-mono text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                      required
                    />
                  </div>
                )}

                <div className="pt-4 flex items-center space-x-3">
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
                      <span>{modalMode === 'CREATE' ? 'Crear Alumno' : 'Guardar Cambios'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREDENTIALS SUCCESS MODAL */}
        {credentialsModal.isOpen && credentialsModal.student && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#141418] border border-[var(--gym-primary)]/30 p-6 sm:p-8 space-y-6 shadow-2xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">¡Alumno Creado Exitosamente!</h3>
                <p className="text-xs text-zinc-400">
                  Se ha generado la ficha de <strong className="text-white">{credentialsModal.student.first_name} {credentialsModal.student.last_name}</strong> y sus accesos de ingreso.
                </p>
              </div>

              <div className="rounded-2xl bg-[#18181C] p-4 border border-white/10 text-left space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-zinc-500">URL Portal Alumnos</span>
                  <p className="text-xs font-mono text-[var(--gym-primary)] truncate">
                    {window.location.origin}/irongym/portal-alumno
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Usuario / Email</span>
                    <p className="text-xs font-bold text-white truncate">{credentialsModal.student.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Contraseña</span>
                    <p className="text-xs font-mono font-black text-emerald-400">
                      {credentialsModal.student.password || 'DNI o asignada'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleCopyWhatsAppMessage(credentialsModal.student!)}
                  className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-emerald-500 py-3 text-xs font-black uppercase text-black shadow-lg hover:bg-emerald-400 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>¡Mensaje Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Copiar Accesos para WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setCredentialsModal({ isOpen: false, student: null })}
                  className="w-full rounded-2xl bg-[#18181C] py-3 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModal.isOpen && deleteModal.student && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#141418] border border-rose-500/20 p-6 space-y-4 shadow-2xl text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">¿Estás seguro de eliminar este alumno?</h3>
                <p className="text-xs text-zinc-400">
                  Estás a punto de borrar la ficha de <strong className="text-white">{deleteModal.student.first_name} {deleteModal.student.last_name}</strong>. Se eliminará su acceso al portal y no se podrá deshacer.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, student: null })}
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
