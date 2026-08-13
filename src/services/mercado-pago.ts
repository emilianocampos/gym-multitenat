import { PaymentMethod, PaymentStatus } from '@/types/database';

export interface PreferencePayload {
  gymId: string;
  studentId: string;
  membershipId?: string;
  title: string;
  unitPrice: number;
  quantity: number;
  payerEmail: string;
}

export class MercadoPagoService {
  /**
   * Crea una preferencia de pago en Mercado Pago desde el servidor.
   * NUNCA activar al alumno sólo por lo que diga el cliente.
   */
  static async createPreference(payload: PreferencePayload, accessToken: string) {
    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              title: payload.title,
              unit_price: payload.unitPrice,
              quantity: payload.quantity,
              currency_id: 'ARS',
            },
          ],
          payer: {
            email: payload.payerEmail,
          },
          external_reference: JSON.stringify({
            gymId: payload.gymId,
            studentId: payload.studentId,
            membershipId: payload.membershipId,
          }),
          back_urls: {
            success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/alumno/pagos?status=success`,
            failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/alumno/pagos?status=failure`,
            pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/alumno/pagos?status=pending`,
          },
          auto_return: 'approved',
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear preferencia en Mercado Pago');
      }

      const data = await response.json();
      return {
        preferenceId: data.id,
        initPoint: data.init_point,
      };
    } catch (error) {
      console.error('MercadoPago Preference Error:', error);
      throw error;
    }
  }

  /**
   * Valida la notificación recibida del Webhook de Mercado Pago con Idempotencia.
   */
  static async processWebhookNotification(paymentId: string, accessToken: string) {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('No se pudo verificar el pago en Mercado Pago');
    }

    const data = await response.json();

    const isApproved = data.status === 'approved';
    const metadata = JSON.parse(data.external_reference || '{}');

    return {
      mpPaymentId: String(data.id),
      status: isApproved ? ('PAID' as PaymentStatus) : ('FAILED' as PaymentStatus),
      amount: data.transaction_amount,
      gymId: metadata.gymId,
      studentId: metadata.studentId,
      membershipId: metadata.membershipId,
      paidAt: isApproved ? new Date().toISOString() : null,
    };
  }
}
