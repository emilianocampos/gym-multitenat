import { NextResponse } from 'next/server';
import { ExcelAiParserService } from '@/services/excel-ai-parser';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo de Excel' }, { status: 400 });
    }

    // Mock response simulating AI structured JSON processing of Excel file
    const mockAiStructuredJson = {
      studentName: 'Lucas Silva',
      routineName: 'Rutina Fuerza & Hipertrofia',
      goal: 'Hipertrofia Muscular',
      days: [
        {
          dayName: 'Lunes - Pecho & Tríceps',
          exercises: [
            { exercise: 'Press banca plano', sets: 4, repetitions: '10-12', restSeconds: 90 },
            { exercise: 'Sentadillas', sets: 4, repetitions: '8-10', restSeconds: 120 },
            { exercise: 'Aperturas en polea', sets: 3, repetitions: '12-15', restSeconds: 60 },
          ],
        },
      ],
    };

    const parsedResult = ExcelAiParserService.parseAndValidateAiResponse(mockAiStructuredJson);

    return NextResponse.json({
      success: true,
      data: parsedResult,
    });
  } catch (error) {
    console.error('Excel Import API Error:', error);
    return NextResponse.json({ error: 'Error procesando archivo de Excel con IA' }, { status: 500 });
  }
}
