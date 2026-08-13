import { z } from 'zod';

export const StudentSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  dni: z.string().min(6, 'El DNI o identificación es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  trainerId: z.string().optional(),
});

export const TrainerSchema = z.object({
  firstName: z.string().min(2, 'El nombre es obligatorio'),
  lastName: z.string().min(2, 'El apellido es obligatorio'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
});

export const DisciplineSchema = z.object({
  name: z.string().min(2, 'El nombre de la disciplina es obligatorio'),
  description: z.string().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  durationMinutes: z.number().min(10, 'La duración mínima es de 10 minutos'),
  maxCapacity: z.number().min(1, 'El cupo máximo debe ser al menos 1'),
});

export const ManualPaymentSchema = z.object({
  studentId: z.string().uuid('ID de alumno inválido'),
  membershipId: z.string().uuid().optional(),
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),
  paymentMethod: z.enum(['MERCADO_PAGO', 'CASH', 'TRANSFER']),
});

export const ExcelExerciseRowSchema = z.object({
  exercise: z.string().min(1, 'Nombre de ejercicio requerido'),
  sets: z.number().int().positive().default(4),
  repetitions: z.string().default('10-12'),
  restSeconds: z.number().int().nonnegative().default(60),
});

export const ExcelDaySchema = z.object({
  dayName: z.string().min(1, 'Nombre del día requerido'),
  exercises: z.array(ExcelExerciseRowSchema),
});

export const ExcelRoutineStructuredSchema = z.object({
  studentName: z.string().min(1, 'Nombre del alumno requerido'),
  routineName: z.string().default('Rutina Personalizada'),
  goal: z.string().optional(),
  days: z.array(ExcelDaySchema),
});

export const GymCustomizationSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Color hexadecimal inválido'),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Color hexadecimal inválido'),
  surfaceColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Color hexadecimal inválido'),
  themeMode: z.enum(['LIGHT', 'DARK', 'GRADIENT']),
  gradientEnabled: z.boolean(),
  lateFeeDays: z.number().min(0),
  lateFeeValue: z.number().min(0),
});
