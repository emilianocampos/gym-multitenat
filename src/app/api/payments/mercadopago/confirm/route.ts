import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gymId, studentId, membershipId, amount, mpPaymentId } = body;

    if (!gymId || !studentId) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios (gymId, studentId)' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Calcular nueva fecha de vencimiento (30 días a partir de hoy o de la fecha actual)
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextExpDate = nextMonth.toISOString().split('T')[0];

    // 2. Actualizar la membresía o todas las membresías del alumno si no se especificó una
    if (membershipId) {
      await supabase
        .from('memberships')
        .update({
          status: 'ACTIVE',
          expiration_date: nextExpDate,
          late_fee_amount: 0.00,
          updated_at: new Date().toISOString(),
        })
        .eq('id', membershipId);
    } else {
      await supabase
        .from('memberships')
        .update({
          status: 'ACTIVE',
          expiration_date: nextExpDate,
          late_fee_amount: 0.00,
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', studentId);
    }

    // 3. Actualizar estado del alumno a ACTIVE
    await supabase
      .from('students')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId);

    // 4. Registrar pago completado en la tabla payments
    const finalPaymentId = mpPaymentId || `MP-${Date.now()}`;
    const { data: newPayment, error: payErr } = await supabase
      .from('payments')
      .insert([
        {
          gym_id: gymId,
          student_id: studentId,
          membership_id: membershipId || null,
          amount: Number(amount) || 0,
          status: 'PAID',
          payment_method: 'MERCADO_PAGO',
          mp_payment_id: finalPaymentId,
          paid_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    return NextResponse.json({
      success: true,
      newExpirationDate: nextExpDate,
      payment: newPayment,
      message: '¡Pago procesado con éxito! Tu cuota ha sido renovada por 30 días.',
    });
  } catch (error: any) {
    console.error('Error al confirmar pago de Mercado Pago:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar pago' }, { status: 500 });
  }
}
