// Rampa de entrada UE simulada (modelo Monerium / EDE partner): recibe euros
// por Bizum, tarjeta o SEPA y emite el token euro regulado (EURe) 1:1.
import { newId } from '../../lib/ids.js';

export function createSimulatedOnRamp({ chain, token = 'EURe' }) {
  const payments = new Map();

  return {
    name: 'simulated-monerium',
    token,

    async createPaymentIntent({ transferId, amountMinor, method, user }) {
      const paymentId = newId('pay');
      const reference = `RMS-${transferId.slice(-8).toUpperCase()}`;
      const instructions = {
        BIZUM: { type: 'BIZUM', phone: '+34 600 000 000', concept: reference, note: 'Pago Bizum simulado (sandbox)' },
        CARD: { type: 'CARD', checkoutUrl: `https://sandbox.partner-ede.example/checkout/${paymentId}`, note: 'Pasarela de tarjeta simulada (3DS)' },
        SEPA: { type: 'SEPA', iban: 'ES00 0000 0000 0000 0000 0000', beneficiary: 'Partner EDE (sandbox)', concept: reference, note: 'Transferencia SEPA Instant simulada' },
      }[method];
      if (!instructions) throw new Error(`Método de pago no soportado: ${method}`);
      payments.set(paymentId, { paymentId, transferId, amountMinor, method, userId: user.id, status: 'PENDING', reference });
      return { paymentId, method, reference, instructions };
    },

    /** En sandbox: simula que el partner confirma la recepción de los euros. */
    async simulateFundsReceived(paymentId) {
      const p = payments.get(paymentId);
      if (!p) throw new Error('Pago desconocido');
      p.status = 'RECEIVED';
      p.receivedAt = Date.now();
      return p;
    },

    getPayment(paymentId) {
      return payments.get(paymentId) ?? null;
    },

    async mintToWallet({ paymentId, amountMinor, toAddress }) {
      const p = payments.get(paymentId);
      if (!p || p.status !== 'RECEIVED') throw new Error('No se puede emitir: pago no recibido');
      if (p.minted) throw new Error('Pago ya tokenizado');
      const tx = await chain.mint({ token, to: toAddress, amountMinor });
      p.minted = true;
      return { mintId: newId('mint'), txHash: tx.txHash, token, amountMinor };
    },
  };
}
