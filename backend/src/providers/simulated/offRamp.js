// Rampa de salida LatAm simulada (modelo Bitso / liquidity provider):
// recibe el token on-chain, lo vende por moneda local y ordena el abono
// en Nequi, Daviplata, SPEI o cuenta bancaria.
import { newId } from '../../lib/ids.js';
import { convertMinor } from '../../lib/money.js';

// Tipos medios de mercado de referencia para el sandbox.
const DEFAULT_RATES = { 'EURe:COP': 3545.0, 'EURe:USD': 1.085, 'EURe:MXN': 21.2, 'EURC:COP': 3545.0, 'EURC:USD': 1.085 };

export function createSimulatedOffRamp({ chain, rates = DEFAULT_RATES, failPayoutFor = [] } = {}) {
  const depositAddresses = new Map();
  const payouts = new Map();
  const processed = new Set();

  return {
    name: 'simulated-bitso',

    async getMidRate(token, currency) {
      const r = rates[`${token}:${currency}`];
      if (!r) throw new Error(`Par no soportado: ${token}/${currency}`);
      return r;
    },

    async getDepositAddress(token) {
      if (!depositAddresses.has(token)) {
        const w = await chain.createWallet(`offramp-${token}`);
        depositAddresses.set(token, w.address);
      }
      return depositAddresses.get(token);
    },

    async convert({ token, amountMinor, currency, reference }) {
      if (processed.has(`convert:${reference}`)) throw new Error('Conversión duplicada');
      const address = await this.getDepositAddress(token);
      const balance = await chain.balanceOf(token, address);
      if (balance < amountMinor) throw new Error('Depósito on-chain no recibido por el partner');
      const rate = await this.getMidRate(token, currency);
      processed.add(`convert:${reference}`);
      return { orderId: newId('ord'), rate, receivedMinor: convertMinor(amountMinor, rate) };
    },

    async payout({ method, recipient, amountMinor, currency, reference }) {
      const payoutId = newId('po');
      const rail = { NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', BANK_CO: 'ACH/Transfiya Colombia', BANK_SV: 'ACH El Salvador', WALLET_SV: 'Billetera SV' }[method];
      const shouldFail = failPayoutFor.includes(recipient.documentNumber);
      payouts.set(payoutId, {
        payoutId,
        method,
        rail,
        amountMinor,
        currency,
        reference,
        status: shouldFail ? 'FAILED' : 'COMPLETED',
        failureReason: shouldFail ? 'Cuenta destino rechazada por el banco receptor' : undefined,
        completedAt: shouldFail ? undefined : new Date().toISOString(),
      });
      return { payoutId, rail, status: 'PROCESSING' };
    },

    async getPayout(payoutId) {
      return payouts.get(payoutId) ?? null;
    },
  };
}
