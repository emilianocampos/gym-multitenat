'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Sparkles, FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Dumbbell, UserCheck } from 'lucide-react';

interface ParsedRoutineItem {
  studentName: string;
  dayName: string;
  exerciseName: string;
  matchedExerciseSlug: string | null;
  matchedExerciseName: string | null;
  sets: number;
  repetitions: string;
  restSeconds: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export default function ImportExcelRoutinePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [parsedData, setParsedData] = useState<ParsedRoutineItem[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processWithAI = () => {
    if (!file) return;
    setIsProcessing(true);

    // Simulate AI parsing + Zod validation + Fuzzy Exercise Matching against Supabase Global Exercise Library
    setTimeout(() => {
      setIsProcessing(false);
      setParsedData([
        {
          studentName: 'Lucas Silva',
          dayName: 'Lunes - Pecho & Tríceps',
          exerciseName: 'Press banca plano',
          matchedExerciseSlug: 'press-banca-barra',
          matchedExerciseName: 'Press de Banca con Barra',
          sets: 4,
          repetitions: '10-12',
          restSeconds: 90,
          confidence: 'HIGH',
        },
        {
          studentName: 'Lucas Silva',
          dayName: 'Lunes - Pecho & Tríceps',
          exerciseName: 'Sentadillas',
          matchedExerciseSlug: 'sentadilla-trasera-barra',
          matchedExerciseName: 'Sentadilla Trasera con Barra',
          sets: 4,
          repetitions: '8-10',
          restSeconds: 120,
          confidence: 'HIGH',
        },
        {
          studentName: 'Lucas Silva',
          dayName: 'Lunes - Pecho & Tríceps',
          exerciseName: 'Aperturas pecho en polea',
          matchedExerciseSlug: null,
          matchedExerciseName: 'Aperturas en Polea (Personalizado)',
          sets: 3,
          repetitions: '12-15',
          restSeconds: 60,
          confidence: 'MEDIUM',
        },
      ]);
      setStep('preview');
    }, 2000);
  };

  const confirmImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('success');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 md:ml-64 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6">
          <div className="flex items-center space-x-2 text-[var(--gym-primary)]">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-extrabold uppercase tracking-widest">Inteligencia Artificial SaaS</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
            Importador de Rutinas desde Excel
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Subí planillas .xlsx o .xls. La IA interpretará la estructura, normalizará los datos y vinculará los ejercicios automáticamente.
          </p>
        </div>

        {/* STEP 1: UPLOAD ZONE */}
        {step === 'upload' && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-3xl bg-[#141418] p-5 sm:p-8 border border-white/5 shadow-2xl text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-[var(--gym-primary)]/10 text-[var(--gym-primary)] border border-[var(--gym-primary)]/20 shadow-neon-subtle">
                <FileSpreadsheet className="h-8 w-8 sm:h-10 sm:w-10 text-[var(--gym-primary)]" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-white">Seleccioná tu archivo de Excel</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  Admite archivos .xlsx y .xls. La IA extraerá los alumnos, días, ejercicios, series, repeticiones y descansos.
                </p>
              </div>

              <div className="relative border-2 border-dashed border-zinc-700 hover:border-[var(--gym-primary)] rounded-2xl p-6 transition-all bg-[#18181C]/50">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-8 w-8 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-300">
                    {file ? file.name : 'Arrastrar archivo aquí o hacer clic para examinar'}
                  </span>
                  <span className="text-[10px] text-zinc-500">Máximo 10 MB</span>
                </div>
              </div>

              <button
                onClick={processWithAI}
                disabled={!file || isProcessing}
                className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-[var(--gym-primary)] py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] disabled:opacity-40 transition-all"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Procesando archivo con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Procesar con IA e Interpretar Rutina</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: HUMAN PREVIEW & EXERCISE MATCHING TABLE */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase text-[var(--gym-primary)]">Paso 2 de 3</span>
                <h3 className="text-xl font-black text-white">Vista Previa de Validación Humana</h3>
              </div>

              <button
                onClick={confirmImport}
                disabled={isProcessing}
                className="flex items-center justify-center space-x-2 rounded-xl bg-[var(--gym-primary)] px-4 sm:px-6 py-2.5 sm:py-3 text-xs font-black uppercase text-black tracking-wider shadow-neon hover:bg-[var(--gym-primary-hover)] transition-all"
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirmar y Guardar en Supabase</span>
                  </>
                )}
              </button>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl bg-[#141418] border border-white/5 shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-[#18181C] text-zinc-400 font-extrabold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-4">Alumno</th>
                    <th className="p-4">Día de Rutina</th>
                    <th className="p-4">Texto en Excel</th>
                    <th className="p-4">Coincidencia Biblioteca IA</th>
                    <th className="p-4">Series x Reps</th>
                    <th className="p-4">Descanso</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300 font-semibold">
                  {parsedData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-extrabold flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-[var(--gym-primary)]" />
                        <span>{item.studentName}</span>
                      </td>
                      <td className="p-4">{item.dayName}</td>
                      <td className="p-4 font-mono text-zinc-400">{item.exerciseName}</td>
                      <td className="p-4 text-white font-bold">
                        {item.matchedExerciseName}
                      </td>
                      <td className="p-4 font-extrabold text-[var(--gym-primary)]">
                        {item.sets} x {item.repetitions}
                      </td>
                      <td className="p-4">{item.restSeconds}s</td>
                      <td className="p-4">
                        {item.confidence === 'HIGH' ? (
                          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Coincidencia Exacta</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Revisión Manual</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS STATE */}
        {step === 'success' && (
          <div className="mx-auto max-w-md rounded-3xl bg-[#141418] p-8 border border-white/5 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gym-primary)] text-black shadow-neon">
              <CheckCircle2 className="h-8 w-8 stroke-[3]" />
            </div>

            <h3 className="text-xl font-extrabold text-white">¡Rutina Importada con Éxito!</h3>
            <p className="text-xs text-zinc-400">
              La rutina ha sido estructurada y asignada al alumno en Supabase. El alumno ya puede verla desde su portal mobile.
            </p>

            <button
              onClick={() => {
                setFile(null);
                setStep('upload');
              }}
              className="w-full rounded-2xl bg-[#1F1F24] py-3 text-xs font-black uppercase text-white hover:bg-[var(--gym-primary)] hover:text-black transition-all"
            >
              Importar otra planilla
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
