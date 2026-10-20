// Calculadora de cotizaciones. Cotiza en dos modos:
//  - "send": el usuario indica cuántos euros envía.
//  - "receive": el usuario indica cuánto debe recibir el destinatario.
import { config } from '../config.js';
import { convertMinor } from '../lib/money.js';
import { badRequest } from '../lib/errors.js';
import { getCorridor } from './corridors.js';
import { newId } from '../lib/ids.js';

export function buildQuote({ corridorId, mode = 'send', amountMinor, midRate, now = Date.now() }) {
  const corridor = getCorridor(corridorId);
  if (!corridor) throw badRequest('INVALID_CORRIDOR', `Corredor no soportado: ${corridorId}`);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw badRequest('INVALID_AMOUNT', 'El importe debe ser un número positivo');
  }
  if (!(midRate > 0)) throw badRequest('RATE_UNAVAILABLE', 'Tipo de cambio no disponible');

  const { fixedCents, fxSpreadBps } = config.fees;
  const customerRate = round6(midRate * (1 - fxSpreadBps / 10_000));

  let sendMinor;
  let receiveMinor;
  if (mode === 'send') {
    sendMinor = amountMinor;
    const convertible = sendMinor - fixedCents;
    receiveMinor = convertible > 0 ? convertMinor(convertible, customerRate) : 0;
  } else if (mode === 'receive') {
    receiveMinor = amountMinor;
    sendMinor = Math.ceil(receiveMinor / customerRate) + fixedCents;
  } else {
    throw badRequest('INVALID_MODE', 'mode debe ser "send" o "receive"');
  }

  const convertedMinor = sendMinor - fixedCents;
  // Coste total frente al tipo medio de mercado (comisión fija + margen FX)
  const spreadCostMinor = Math.max(0, convertedMinor - Math.ceil(receiveMinor / midRate));
  const totalCostMinor = fixedCents + spreadCostMinor;

  const { minPerTransferCents, maxPerTransferCents } = config.limits;
  const warnings = [];
  if (sendMinor < minPerTransferCents) warnings.push('BELOW_MIN_AMOUNT');
  if (sendMinor > maxPerTransferCents) warnings.push('ABOVE_MAX_AMOUNT');

  return {
    id: newId('quo'),
    corridorId,
    sourceCurrency: corridor.sourceCurrency,
    destinationCurrency: corridor.destinationCurrency,
    settlementToken: corridor.settlementToken,
    mode,
    sendAmountMinor: sendMinor,
    receiveAmountMinor: receiveMinor,
    convertedAmountMinor: convertedMinor,
    fixedFeeMinor: fixedCents,
    fxSpreadBps,
    midMarketRate: midRate,
    customerRate,
    totalCostMinor,
    totalCostPct: sendMinor > 0 ? round2((totalCostMinor / sendMinor) * 100) : 0,
    paymentOptions: paymentOptions(sendMinor, totalCostMinor),
    estimatedDelivery: 'menos de 1 minuto',
    warnings,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.quoteTtlSeconds * 1000).toISOString(),
  };
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;
const round2 = (n) => Math.round(n * 100) / 100;

/** Coste repercutido por medio de pago (céntimos). */
export function paymentFeeMinor(method, sendMinor) {
  const m = config.fees.paymentMethods[method];
  if (!m) return null;
  return Math.round(sendMinor * m.pct) + m.fixedCents;
}

/** Total a pagar y coste total para el cliente con cada medio de pago. */
function paymentOptions(sendMinor, serviceCostMinor) {
  return Object.keys(config.fees.paymentMethods).map((method) => {
    const feeMinor = paymentFeeMinor(method, sendMinor);
    const totalChargeMinor = sendMinor + feeMinor;
    return {
      method,
      feeMinor,
      totalChargeMinor,
      totalCostPct: totalChargeMinor > 0 ? round2(((serviceCostMinor + feeMinor) / totalChargeMinor) * 100) : 0,
    };
  });
}
