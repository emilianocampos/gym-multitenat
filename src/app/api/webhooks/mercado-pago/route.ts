import { NextResponse } from 'next/server';
import { MercadoPagoService } from '@/services/mercado-pago';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json({ message: 'Sin ID de pago en notificación' }, { status: 400 });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ message: 'Falta token de Mercado Pago' }, { status: 500 });
    }

    // Process payment from Mercado Pago server
    const result = await MercadoPagoService.processWebhookNotification(paymentId, accessToken);

    if (result.status === 'PAID') {
      const supabase = await createClient();

      // Actualizar Payment
      await supabase
        .from('payments')
        .update({
          status: 'PAID',
          paid_at: result.paidAt,
          mp_payment_id: result.mpPaymentId,
        })
        .eq('student_id', result.studentId)
        .eq('gym_id', result.gymId);

      // Actualizar Membresía a ACTIVE
      if (result.membershipId) {
        await supabase
          .from('memberships')
          .update({
            status: 'ACTIVE',
          })
          .eq('id', result.membershipId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Mercado Pago Error:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
