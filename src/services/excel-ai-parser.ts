import { ExcelRoutineStructuredSchema } from '@/validators';

export interface ExerciseMatchResult {
  rawExerciseName: string;
  matchedSlug: string | null;
  matchedName: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class ExcelAiParserService {
  /**
   * Fuzzy matcher de ejercicios: Vincula nombres coloquiales ingresados en Excel
   * con los slugs de la biblioteca global de Supabase.
   */
  static matchExerciseWithLibrary(rawName: string): ExerciseMatchResult {
    const normalized = rawName.toLowerCase().trim();

    if (normalized.includes('press') && (normalized.includes('banca') || normalized.includes('plano'))) {
      return {
        rawExerciseName: rawName,
        matchedSlug: 'press-banca-barra',
        matchedName: 'Press de Banca con Barra',
        confidence: 'HIGH',
      };
    }

    if (normalized.includes('sentadilla') || normalized.includes('squat')) {
      return {
        rawExerciseName: rawName,
        matchedSlug: 'sentadilla-trasera-barra',
        matchedName: 'Sentadilla Trasera con Barra',
        confidence: 'HIGH',
      };
    }

    if (normalized.includes('peso muerto') || normalized.includes('deadlift')) {
      return {
        rawExerciseName: rawName,
        matchedSlug: 'peso-muerto-convencional',
        matchedName: 'Peso Muerto Convencional',
        confidence: 'HIGH',
      };
    }

    if (normalized.includes('dominada') || normalized.includes('pull up')) {
      return {
        rawExerciseName: rawName,
        matchedSlug: 'dominadas-pronas',
        matchedName: 'Dominadas Pronas',
        confidence: 'HIGH',
      };
    }

    return {
      rawExerciseName: rawName,
      matchedSlug: null,
      matchedName: `${rawName} (Ejercicio Personalizado)`,
      confidence: 'MEDIUM',
    };
  }

  /**
   * Convierte la respuesta estructurada de la IA y valida contra Zod.
   */
  static parseAndValidateAiResponse(jsonContent: unknown) {
    const validated = ExcelRoutineStructuredSchema.safeParse(jsonContent);

    if (!validated.success) {
      throw new Error(`Error de validación de estructura de IA: ${validated.error.message}`);
    }

    const data = validated.data;

    // Mapear coincidencia de ejercicios para cada día
    const mappedDays = data.days.map((day) => ({
      dayName: day.dayName,
      exercises: day.exercises.map((ex) => {
        const match = this.matchExerciseWithLibrary(ex.exercise);
        return {
          ...ex,
          matchInfo: match,
        };
      }),
    }));

    return {
      studentName: data.studentName,
      routineName: data.routineName,
      goal: data.goal,
      days: mappedDays,
    };
  }
}
