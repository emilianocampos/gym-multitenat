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
  Dumbbell,
  Clock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { Student, StudentStatus, Discipline } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { parseDisciplineMeta } from '@/lib/utils/discipline-meta';

export interface StudentMembershipItem {
  id?: string;
  discipline_id: string;
  discipline_name?: string;
  price: number;
  expiration_date: string;
  plan_frequency?: '2X' | '3X' | '6X' | string;
  status: string;
  isExpired?: boolean;
  daysOverdue?: number;
}

export interface StudentWithMembership extends Student {
  password?: string;
  memberships: StudentMembershipItem[];
  membership?: StudentMembershipItem | null;
  hasExpiredCuota?: boolean;
}

export interface DisciplineFormItem {
  discipline_id: string;
  plan_frequency: '2X' | '3X' | '6X';
  membership_price: number;
  expiration_date: string;
}

export default function AdminStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentStatus | 'OVERDUE'>('ALL');

  const [students, setStudents] = useState<StudentWithMembership[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<Discipline[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithMembership | null>(null);

  // Quick Expiration Date Modal State
  const [quickExpModal, setQuickExpModal] = useState<{
    isOpen: boolean;
    student: StudentWithMembership | null;
    membership: StudentMembershipItem | null;
    newDate: string;
  } | null>(null);
  const [isSavingQuickExp, setIsSavingQuickExp] = useState(false);

  // Credentials Modal State
  const [credentialsModal, setCredentialsModal] = useState<{
    isOpen: boolean;
    student: StudentWithMembership | null;
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
    assigned_disciplines: [] as DisciplineFormItem[],
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

  // Load Students and Disciplines directly from Database (Supabase SELECT)
  const fetchStudents = async () => {
    setIsLoadingList(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // Fetch active disciplines for dropdown & mapping
      const { data: dbDisciplines } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (dbDisciplines) {
        setDisciplinesList(dbDisciplines);
      }

      // Fetch all memberships
      const { data: dbMemberships, error: memErr } = await supabase
        .from('memberships')
        .select('*, discipline:disciplines(id, name, price, description)')
        .order('created_at', { ascending: false });

      if (memErr) {
        console.error('Error fetching memberships:', memErr);
      }

      // Fetch students
      const { data: dbStudents, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students from DB:', error);
        setErrorMessage(`Error al cargar lista de alumnos: ${error.message}`);
        setStudents([]);
      } else if (dbStudents) {
        const mapped: StudentWithMembership[] = dbStudents.map((std: any) => {
          const rawMems = dbMemberships?.filter((m: any) => m.student_id === std.id) || [];
          
          // Deduplicate memberships by discipline_id to avoid repeated chips in the table
          const uniqueMemsMap = new Map<string, any>();
          rawMems.forEach((m: any) => {
            if (!uniqueMemsMap.has(m.discipline_id)) {
              uniqueMemsMap.set(m.discipline_id, m);
            }
          });
          const deduplicatedRawMems = Array.from(uniqueMemsMap.values());

          const mappedMems: StudentMembershipItem[] = deduplicatedRawMems.map((mem: any) => {
            const rawDisc =
              dbDisciplines?.find((d: any) => d.id === mem.discipline_id) ||
              (Array.isArray(mem.discipline) ? mem.discipline[0] : mem.discipline);

            const meta = rawDisc ? parseDisciplineMeta(rawDisc) : null;
            const dName = rawDisc?.name || 'Disciplina';

            let planFreq: '2X' | '3X' | '6X' = '3X';
            if (meta) {
              const p = Number(mem.price);
              if (p === meta.price_2x) planFreq = '2X';
              else if (p === meta.price_6x || p === Number(rawDisc.price)) planFreq = '6X';
              else if (p === meta.price_3x) planFreq = '3X';
              else {
                const d2 = Math.abs(p - meta.price_2x);
                const d3 = Math.abs(p - meta.price_3x);
                const d6 = Math.abs(p - (meta.price_6x || Number(rawDisc.price)));
                if (d2 <= d3 && d2 <= d6) planFreq = '2X';
                else if (d6 <= d3 && d6 <= d2) planFreq = '6X';
                else planFreq = '3X';
              }
            }

            const todayStr = new Date().toISOString().slice(0, 10);
            const isExp = mem.expiration_date ? mem.expiration_date < todayStr : false;
            let daysOverdue = 0;
            if (isExp && mem.expiration_date) {
              const expTime = new Date(`${mem.expiration_date}T23:59:59`).getTime();
              const nowTime = new Date().getTime();
              daysOverdue = Math.max(1, Math.floor((nowTime - expTime) / (1000 * 60 * 60 * 24)));
            }

            return {
              id: mem.id,
              discipline_id: mem.discipline_id,
              discipline_name: dName,
              price: Number(mem.price),
              expiration_date: mem.expiration_date,
              plan_frequency: planFreq,
              status: isExp ? 'OVERDUE' : mem.status,
              isExpired: isExp,
              daysOverdue,
            };
          });

          const hasExpiredCuota = mappedMems.some((m) => m.isExpired);

          return {
            ...std,
            hasExpiredCuota,
            memberships: mappedMems,
            membership: mappedMems[0] || null,
          };
        });
        setStudents(mapped);
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
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.memberships?.some((m) =>
        m.discipline_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'OVERDUE'
        ? student.hasExpiredCuota
        : student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Overdue students list for Admin Alert Banner
  const overdueStudents = students.filter((s) => s.hasExpiredCuota);

  // Quick Expiration Date Saver (Direct DB UPDATE)
  const handleSaveQuickExpirationDate = async () => {
    if (!quickExpModal?.student || !quickExpModal.membership || !quickExpModal.newDate) return;
    setIsSavingQuickExp(true);
    try {
      const supabase = createClient();
      const newDate = quickExpModal.newDate;
      const today = new Date().toISOString().slice(0, 10);
      const isPast = newDate < today;
      const newStatus = isPast ? 'OVERDUE' : 'ACTIVE';

      // 1. Update membership in DB
      await supabase
        .from('memberships')
        .update({
          expiration_date: newDate,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quickExpModal.membership.id);

      // 2. Refresh local student list
      setQuickExpModal(null);
      await fetchStudents();
    } catch (e: any) {
      console.error('Error updating expiration date:', e);
      alert('Error al actualizar fecha de vencimiento');
    } finally {
      setIsSavingQuickExp(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const defaultExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const initialAssigned: DisciplineFormItem[] = [];

    if (disciplinesList && disciplinesList.length > 0 && disciplinesList[0]) {
      const firstDisc = disciplinesList[0];
      const meta = parseDisciplineMeta(firstDisc);
      initialAssigned.push({
        discipline_id: firstDisc.id,
        plan_frequency: '3X',
        membership_price: meta ? meta.price_3x : 22000,
        expiration_date: defaultExp,
      });
    }

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
      assigned_disciplines: initialAssigned,
    });
    setModalMode('CREATE');
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (student: StudentWithMembership) => {
    const defaultExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    let initialAssigned: DisciplineFormItem[] = [];
    if (student.memberships && student.memberships.length > 0) {
      const uniqueFormMap = new Map<string, DisciplineFormItem>();
      student.memberships.forEach((m) => {
        if (!uniqueFormMap.has(m.discipline_id)) {
          uniqueFormMap.set(m.discipline_id, {
            discipline_id: m.discipline_id,
            plan_frequency: (m.plan_frequency || '3X') as '2X' | '3X' | '6X',
            membership_price: Number(m.price) || 22000,
            expiration_date: m.expiration_date || defaultExp,
          });
        }
      });
      initialAssigned = Array.from(uniqueFormMap.values());
    } else if (disciplinesList && disciplinesList.length > 0 && disciplinesList[0]) {
      const firstDisc = disciplinesList[0];
      const meta = parseDisciplineMeta(firstDisc);
      initialAssigned.push({
        discipline_id: firstDisc.id,
        plan_frequency: '3X',
        membership_price: meta ? meta.price_3x : 22000,
        expiration_date: defaultExp,
      });
    }

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
      assigned_disciplines: initialAssigned,
    });
    setModalMode('EDIT');
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  // Helpers for multi-discipline in form
  const handleToggleDiscipline = (discId: string) => {
    const defaultExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const exists = formData.assigned_disciplines.some((d) => d.discipline_id === discId);

    if (exists) {
      // Remove all instances of this discipline_id
      const updated = formData.assigned_disciplines.filter((d) => d.discipline_id !== discId);
      setFormData({ ...formData, assigned_disciplines: updated });
    } else {
      // Add discipline uniquely
      const disc = disciplinesList.find((d) => d.id === discId);
      const meta = disc ? parseDisciplineMeta(disc) : null;
      const price = meta ? meta.price_3x : 22000;
      setFormData({
        ...formData,
        assigned_disciplines: [
          ...formData.assigned_disciplines.filter((d) => d.discipline_id !== discId),
          {
            discipline_id: discId,
            plan_frequency: '3X',
            membership_price: price,
            expiration_date: defaultExp,
          },
        ],
      });
    }
  };

  const handleUpdateDisciplinePlan = (
    discId: string,
    freq: '2X' | '3X' | '6X'
  ) => {
    const disc = disciplinesList.find((d) => d.id === discId);
    const meta = disc ? parseDisciplineMeta(disc) : null;
    let newPrice = 22000;
    if (meta) {
      if (freq === '2X') newPrice = meta.price_2x;
      else if (freq === '3X') newPrice = meta.price_3x;
      else newPrice = meta.price_6x;
    }

    setFormData({
      ...formData,
      assigned_disciplines: formData.assigned_disciplines.map((item) =>
        item.discipline_id === discId
          ? { ...item, plan_frequency: freq, membership_price: newPrice }
          : item
      ),
    });
  };

  const handleUpdateDisciplineField = (
    discId: string,
    field: 'membership_price' | 'expiration_date',
    value: any
  ) => {
    setFormData({
      ...formData,
      assigned_disciplines: formData.assigned_disciplines.map((item) =>
        item.discipline_id === discId ? { ...item, [field]: value } : item
      ),
    });
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

        const studentId = insertedData?.id || `std-${Date.now()}`;

        // 2. Direct INSERT into public.memberships for all assigned disciplines (No duplicates allowed)
        const uniqueDisciplinesMap = new Map<string, DisciplineFormItem>();
        formData.assigned_disciplines.forEach((item) => {
          if (!uniqueDisciplinesMap.has(item.discipline_id)) {
            uniqueDisciplinesMap.set(item.discipline_id, item);
          }
        });
        const deduplicatedDisciplines = Array.from(uniqueDisciplinesMap.values());

        const createdMemberships: StudentMembershipItem[] = [];
        if (deduplicatedDisciplines.length > 0) {
          const membershipPayloads = deduplicatedDisciplines.map((discItem) => ({
            gym_id: gymId,
            student_id: studentId,
            discipline_id: discItem.discipline_id,
            price: Number(discItem.membership_price),
            start_date: new Date().toISOString().slice(0, 10),
            expiration_date: discItem.expiration_date,
            status: formData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
          }));

          const { data: memData, error: memErr } = await supabase
            .from('memberships')
            .insert(membershipPayloads)
            .select();

          if (memData) {
            memData.forEach((m: any) => {
              const d = disciplinesList.find((disc) => disc.id === m.discipline_id);
              const discForm = deduplicatedDisciplines.find(
                (df) => df.discipline_id === m.discipline_id
              );
              createdMemberships.push({
                id: m.id,
                discipline_id: m.discipline_id,
                discipline_name: d?.name || 'Disciplina',
                price: Number(m.price),
                expiration_date: m.expiration_date,
                plan_frequency: discForm?.plan_frequency || '3X',
                status: m.status,
              });
            });
          } else if (memErr) {
            console.error('Error inserting memberships:', memErr);
          }
        }

        // 3. Register user account for Student Portal
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

        const createdStudent: StudentWithMembership = {
          ...(insertedData || payload),
          id: studentId,
          password: formData.password || `gym${Math.floor(100000 + Math.random() * 900000)}`,
          memberships: createdMemberships,
          membership: createdMemberships[0] || null,
        };

        setStudents((prev) => [createdStudent, ...prev]);
        setIsModalOpen(false);
        setIsSaving(false);
        fetchStudents();

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
          setErrorMessage(`Error al actualizar en Base de Datos: ${updateError.message}`);
          setIsSaving(false);
          return;
        }

        // Sync memberships for student: delete old ones and insert updated deduplicated ones
        await supabase
          .from('memberships')
          .delete()
          .eq('student_id', selectedStudent.id);

        const uniqueDisciplinesMap = new Map<string, DisciplineFormItem>();
        formData.assigned_disciplines.forEach((item) => {
          if (!uniqueDisciplinesMap.has(item.discipline_id)) {
            uniqueDisciplinesMap.set(item.discipline_id, item);
          }
        });
        const deduplicatedDisciplines = Array.from(uniqueDisciplinesMap.values());

        const updatedMemberships: StudentMembershipItem[] = [];
        if (deduplicatedDisciplines.length > 0) {
          const membershipPayloads = deduplicatedDisciplines.map((discItem) => ({
            gym_id: gymId,
            student_id: selectedStudent.id,
            discipline_id: discItem.discipline_id,
            price: Number(discItem.membership_price),
            start_date: new Date().toISOString().slice(0, 10),
            expiration_date: discItem.expiration_date,
            status: formData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
          }));

          const { data: memData } = await supabase
            .from('memberships')
            .insert(membershipPayloads)
            .select();

          if (memData) {
            memData.forEach((m: any) => {
              const d = disciplinesList.find((disc) => disc.id === m.discipline_id);
              const discForm = deduplicatedDisciplines.find(
                (df) => df.discipline_id === m.discipline_id
              );
              updatedMemberships.push({
                id: m.id,
                discipline_id: m.discipline_id,
                discipline_name: d?.name || 'Disciplina',
                price: Number(m.price),
                expiration_date: m.expiration_date,
                plan_frequency: discForm?.plan_frequency || '3X',
                status: m.status,
              });
            });
          }
        }

        setStudents((prev) =>
          prev.map((s) =>
            s.id === selectedStudent.id
              ? {
                  ...s,
                  ...(updatedData || {}),
                  memberships: updatedMemberships,
                  membership: updatedMemberships[0] || null,
                }
              : s
          )
        );

        setIsModalOpen(false);
        setIsSaving(false);
        fetchStudents();
      }
    } catch (err: any) {
      console.error('Error saving student:', err);
      setErrorMessage(`Error: ${err.message}`);
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
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 md:ml-64 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={fetchStudents}
              className="p-2.5 sm:p-3 rounded-xl bg-[#141418] text-zinc-400 hover:text-white border border-white/10 hover:border-[var(--gym-primary)] transition-all"
              title="Actualizar directorio de alumnos"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-4 sm:px-6 py-2.5 sm:py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] active:scale-98 transition-all"
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

        {/* NOTIFICACIÓN ADMIN: ALUMNOS CON CUOTA VENCIDA */}
        {overdueStudents.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-950/70 via-[#18181C] to-amber-950/40 p-4 sm:p-5 border-2 border-rose-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start space-x-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40 shadow-md">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">
                    Alerta de Vencimiento
                  </span>
                  <span className="text-xs font-extrabold text-rose-300">
                    {overdueStudents.length} {overdueStudents.length === 1 ? 'alumno con cuota vencida' : 'alumnos con cuotas vencidas'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight">
                  Regularización de Cuotas Pendiente
                </h4>
                <p className="text-xs text-zinc-300">
                  {overdueStudents.slice(0, 4).map((s) => `${s.first_name} ${s.last_name}`).join(', ')}
                  {overdueStudents.length > 4 ? ` y ${overdueStudents.length - 4} más` : ''} tienen al menos una disciplina vencida.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => setStatusFilter('OVERDUE')}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Filtrar Vencidos ({overdueStudents.length})
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 rounded-2xl bg-[#141418] p-3 sm:p-4 border border-white/5">
          <div className="flex items-center space-x-3 rounded-xl bg-[#18181C] px-3 py-2.5 w-full md:w-96 border border-white/10 focus-within:border-[var(--gym-primary)]">
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
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
              { id: 'OVERDUE', label: `🚨 Vencidos (${overdueStudents.length})` },
              { id: 'INACTIVE', label: 'Inactivos' },
              { id: 'SUSPENDED', label: 'Suspendidos' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  statusFilter === f.id
                    ? f.id === 'OVERDUE'
                      ? 'bg-rose-500 text-white shadow-lg font-black'
                      : 'bg-[var(--gym-primary)] text-black shadow-neon'
                    : f.id === 'OVERDUE' && overdueStudents.length > 0
                    ? 'text-rose-400 hover:text-rose-300 font-extrabold'
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
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-[#18181C] border-b border-zinc-800 text-zinc-400 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Alumno</th>
                    <th className="p-4">DNI / Contacto</th>
                    <th className="p-4">Disciplinas & Vencimientos</th>
                    <th className="p-4">Acceso Portal</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300 font-semibold">
                  {filteredStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-xs ${
                            std.hasExpiredCuota
                              ? 'bg-rose-500/20 border border-rose-500 text-rose-400'
                              : 'bg-zinc-800 border border-[var(--gym-primary)] text-[var(--gym-primary)]'
                          }`}>
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

                      <td className="p-4 space-y-2">
                        {std.memberships && std.memberships.length > 0 ? (
                          <div className="space-y-1.5">
                            {std.memberships.map((m, idx) => (
                              <div
                                key={m.id || idx}
                                className="flex items-center gap-2 flex-wrap"
                              >
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-extrabold ${
                                    m.isExpired
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : 'bg-[var(--gym-primary)]/10 text-[var(--gym-primary)] border-[var(--gym-primary)]/20'
                                  }`}
                                >
                                  <Dumbbell className="h-3 w-3" />
                                  {m.discipline_name} (${(m.price || 0).toLocaleString()})
                                </span>

                                <button
                                  onClick={() =>
                                    setQuickExpModal({
                                      isOpen: true,
                                      student: std,
                                      membership: m,
                                      newDate: m.expiration_date || new Date().toISOString().slice(0, 10),
                                    })
                                  }
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all hover:scale-105 ${
                                    m.isExpired
                                      ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 hover:bg-rose-600 hover:text-white'
                                      : 'bg-[#18181C] text-zinc-300 border-white/10 hover:border-[var(--gym-primary)] hover:text-white'
                                  }`}
                                  title="Hacé clic para modificar la fecha de vencimiento"
                                >
                                  <Calendar className="h-3 w-3 text-amber-400" />
                                  <span>
                                    {m.isExpired
                                      ? `Venció: ${m.expiration_date}`
                                      : `Vto: ${m.expiration_date || 'Sin fecha'}`}
                                  </span>
                                  <span className="text-[9px] underline text-zinc-400 ml-0.5">Editar</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500 font-semibold italic">Sin disciplinas asignadas</span>
                        )}
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
                            std.hasExpiredCuota
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                              : std.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : std.status === 'SUSPENDED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              std.hasExpiredCuota
                                ? 'bg-rose-400'
                                : std.status === 'ACTIVE'
                                ? 'bg-emerald-400'
                                : std.status === 'SUSPENDED'
                                ? 'bg-amber-400'
                                : 'bg-zinc-400'
                            }`}
                          />
                          {std.hasExpiredCuota
                            ? 'Cuota Vencida'
                            : std.status === 'ACTIVE'
                            ? 'Activo'
                            : std.status === 'SUSPENDED'
                            ? 'Suspendido'
                            : 'Inactivo'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              const firstMem = std.memberships?.[0] || null;
                              setQuickExpModal({
                                isOpen: true,
                                student: std,
                                membership: firstMem,
                                newDate: firstMem?.expiration_date || new Date().toISOString().slice(0, 10),
                              });
                            }}
                            disabled={!std.memberships || std.memberships.length === 0}
                            className="p-2 rounded-xl bg-[#18181C] text-zinc-300 hover:text-amber-400 hover:bg-amber-500/10 border border-white/5 transition-all disabled:opacity-30"
                            title="Modificar Fecha de Vencimiento de Cuota"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(std)}
                            className="p-2 rounded-xl bg-[#18181C] text-zinc-300 hover:text-[var(--gym-primary)] hover:bg-white/5 border border-white/5 transition-all"
                            title="Editar Ficha Completa de Alumno"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-[#141418] border border-white/10 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 shadow-2xl my-auto">
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
                        ? 'Se creará su ficha, sus disciplinas asignadas y la cuenta para el portal.'
                        : 'Modificá datos personales, disciplinas asignadas y cuotas del alumno.'}
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

              <form onSubmit={handleSaveStudent} className="space-y-5">
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
                    <label className="text-xs font-bold text-zinc-300">Estado del Alumno</label>
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

                {/* DISCIPLINAS ASIGNADAS (1 O MÁS DISCIPLINAS POR ALUMNO) */}
                <div className="rounded-2xl bg-[#18181C] p-5 border border-[var(--gym-primary)]/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-[var(--gym-primary)] flex items-center gap-1.5">
                        <Dumbbell className="h-4 w-4" />
                        <span>Disciplinas Asignadas al Alumno (1 o más)</span>
                      </label>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Seleccioná las disciplinas que practica y configurá el plan o arancel para cada una.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 font-bold block uppercase">Total Cuota Mensual</span>
                      <span className="text-sm font-black text-white bg-black/60 px-3 py-1 rounded-lg border border-white/10 inline-block mt-0.5">
                        $
                        {formData.assigned_disciplines
                          .reduce((acc, curr) => acc + (Number(curr.membership_price) || 0), 0)
                          .toLocaleString()}{' '}
                        / mes
                      </span>
                    </div>
                  </div>

                  {/* Selector / Chips de Disciplinas Disponibles */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-zinc-300 block">
                      Hacé clic para agregar o quitar disciplinas:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {disciplinesList.map((disc) => {
                        const isAssigned = formData.assigned_disciplines.some(
                          (d) => d.discipline_id === disc.id
                        );
                        return (
                          <button
                            key={disc.id}
                            type="button"
                            onClick={() => handleToggleDiscipline(disc.id)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                              isAssigned
                                ? 'bg-[var(--gym-primary)] text-black border-[var(--gym-primary)] shadow-neon'
                                : 'bg-[#141418] text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                            }`}
                          >
                            <span
                              className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                                isAssigned ? 'bg-black text-[var(--gym-primary)]' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {isAssigned ? '✓' : '+'}
                            </span>
                            <span>{disc.name}</span>
                          </button>
                        );
                      })}
                      {disciplinesList.length === 0 && (
                        <p className="text-xs text-zinc-500 italic">No hay disciplinas registradas en el gimnasio.</p>
                      )}
                    </div>
                  </div>

                  {/* Configuración Detallada por Disciplina Seleccionada */}
                  {formData.assigned_disciplines.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                        Configuración de Cuotas por Disciplina:
                      </label>

                      <div className="space-y-3">
                        {formData.assigned_disciplines.map((discItem) => {
                          const disc = disciplinesList.find((d) => d.id === discItem.discipline_id);
                          const discName = disc?.name || 'Disciplina';
                          const meta = disc ? parseDisciplineMeta(disc) : null;

                          return (
                            <div
                              key={discItem.discipline_id}
                              className="rounded-2xl bg-[#141418] p-4 border border-white/10 space-y-3 relative"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="h-7 w-7 rounded-lg bg-[var(--gym-primary)]/10 text-[var(--gym-primary)] flex items-center justify-center">
                                    <Dumbbell className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-black text-white uppercase">{discName}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleDiscipline(discItem.discipline_id)}
                                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" /> Quitar
                                </button>
                              </div>

                              {/* Frequency selector */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-zinc-400 block">Frecuencia semanal:</span>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['2X', '3X', '6X'] as const).map((freq) => {
                                    let price = 22000;
                                    if (meta) {
                                      if (freq === '2X') price = meta.price_2x;
                                      else if (freq === '3X') price = meta.price_3x;
                                      else price = meta.price_6x;
                                    }
                                    const isSelected = discItem.plan_frequency === freq;
                                    return (
                                      <button
                                        key={freq}
                                        type="button"
                                        onClick={() =>
                                          handleUpdateDisciplinePlan(discItem.discipline_id, freq)
                                        }
                                        className={`p-2 rounded-xl text-left border transition-all ${
                                          isSelected
                                            ? 'bg-[var(--gym-primary)]/15 border-[var(--gym-primary)] text-white shadow-sm'
                                            : 'bg-[#18181C] border-white/5 text-zinc-400 hover:text-white'
                                        }`}
                                      >
                                        <span className="text-[9px] font-black uppercase block">
                                          {freq === '2X' ? '⚡ 2x / sem' : freq === '3X' ? '🔥 3x / sem' : '👑 Libre'}
                                        </span>
                                        <span className="text-[11px] font-black text-white block">
                                          ${price.toLocaleString()}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Price and Expiration inputs */}
                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400">Arancel ($)</label>
                                  <input
                                    type="number"
                                    value={discItem.membership_price}
                                    onChange={(e) =>
                                      handleUpdateDisciplineField(
                                        discItem.discipline_id,
                                        'membership_price',
                                        Number(e.target.value)
                                      )
                                    }
                                    className="mt-1 w-full rounded-xl bg-[#18181C] p-2.5 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                                    required
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400">Vencimiento</label>
                                  <input
                                    type="date"
                                    value={discItem.expiration_date}
                                    onChange={(e) =>
                                      handleUpdateDisciplineField(
                                        discItem.discipline_id,
                                        'expiration_date',
                                        e.target.value
                                      )
                                    }
                                    className="mt-1 w-full rounded-xl bg-[#18181C] p-2.5 text-xs text-white border border-white/10 outline-none focus:border-[var(--gym-primary)]"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center border border-dashed border-zinc-800 rounded-xl">
                      <p className="text-xs text-zinc-400">
                        Seleccioná al menos una disciplina arriba para asignar al alumno.
                      </p>
                    </div>
                  )}
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
        {/* QUICK EXPIRATION DATE MODAL */}
        {quickExpModal && quickExpModal.isOpen && quickExpModal.student && quickExpModal.membership && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-md rounded-3xl bg-[#141418] border border-[var(--gym-primary)]/40 p-6 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-2xl bg-[var(--gym-primary)]/10 text-[var(--gym-primary)] flex items-center justify-center font-black">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      Modificar Vencimiento
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {quickExpModal.student.first_name} {quickExpModal.student.last_name} (DNI: {quickExpModal.student.dni})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !isSavingQuickExp && setQuickExpModal(null)}
                  disabled={isSavingQuickExp}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Membership info */}
              <div className="rounded-2xl bg-[#18181C] p-4 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-bold uppercase text-[10px]">Disciplina:</span>
                  <span className="text-white font-black">{quickExpModal.membership.discipline_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-bold uppercase text-[10px]">Arancel Mensual:</span>
                  <span className="text-white font-bold">${(quickExpModal.membership.price || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-bold uppercase text-[10px]">Vencimiento Actual:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {quickExpModal.membership.expiration_date || 'Sin fecha asignada'}
                  </span>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-zinc-300 block">
                  Nueva Fecha de Vencimiento:
                </label>
                <input
                  type="date"
                  value={quickExpModal.newDate}
                  onChange={(e) =>
                    setQuickExpModal((prev) => (prev ? { ...prev, newDate: e.target.value } : null))
                  }
                  className="w-full rounded-xl bg-[#18181C] p-3 text-sm text-white border border-white/10 outline-none focus:border-[var(--gym-primary)] font-mono"
                />
              </div>

              {/* Quick Presets for Testing */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-zinc-400 block tracking-wider">
                  Accesos Rápidos (Ideal para Pruebas):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                      setQuickExpModal((prev) => (prev ? { ...prev, newDate: yesterday } : null));
                    }}
                    className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all text-left flex items-center justify-between"
                  >
                    <span>🔴 Vencida Ayer</span>
                    <span className="text-[9px] opacity-70">-1d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const minus5 = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
                      setQuickExpModal((prev) => (prev ? { ...prev, newDate: minus5 } : null));
                    }}
                    className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all text-left flex items-center justify-between"
                  >
                    <span>🔴 Vencida (-5 días)</span>
                    <span className="text-[9px] opacity-70">-5d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      setQuickExpModal((prev) => (prev ? { ...prev, newDate: today } : null));
                    }}
                    className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all text-left flex items-center justify-between"
                  >
                    <span>🟡 Vence Hoy</span>
                    <span className="text-[9px] opacity-70">Hoy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                      setQuickExpModal((prev) => (prev ? { ...prev, newDate: plus30 } : null));
                    }}
                    className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all text-left flex items-center justify-between"
                  >
                    <span>🟢 En 30 Días</span>
                    <span className="text-[9px] opacity-70">+30d</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickExpModal(null)}
                  disabled={isSavingQuickExp}
                  className="flex-1 rounded-xl bg-[#18181C] py-3 text-xs font-bold text-zinc-400 hover:text-white border border-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickExpirationDate}
                  disabled={isSavingQuickExp}
                  className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] py-3 text-xs font-black uppercase text-black shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all disabled:opacity-50"
                >
                  {isSavingQuickExp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Vencimiento</span>
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
