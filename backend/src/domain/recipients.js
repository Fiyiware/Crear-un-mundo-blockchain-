// Validación de destinatarios por método de cobro.
import { PAYOUT_METHODS, COLOMBIAN_BANKS, SALVADORAN_BANKS } from './corridors.js';

const digits = (v) => String(v ?? '').replace(/[\s.-]/g, '');

/** Número móvil colombiano: 10 dígitos empezando por 3 (Nequi/Daviplata). */
export const isColombianMobile = (v) => /^3\d{9}$/.test(digits(v));

/** Cédula de ciudadanía colombiana: 6 a 10 dígitos. */
export const isColombianCedula = (v) => /^\d{6,10}$/.test(digits(v));

/**
 * DUI salvadoreño: 8 dígitos + dígito verificador (formato 01234567-8).
 * Verificador: suma ponderada (pesos 9..2) módulo 10.
 */
export function isValidDui(v) {
  const d = digits(v);
  if (!/^\d{9}$/.test(d)) return false;
  const sum = [...d.slice(0, 8)].reduce((acc, ch, i) => acc + Number(ch) * (9 - i), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(d[8]);
}

/** Móvil salvadoreño: 8 dígitos empezando por 6 o 7. */
export const isSalvadoranMobile = (v) => /^[67]\d{7}$/.test(digits(v));

export function validateRecipient(input) {
  const errors = {};
  const r = input ?? {};
  const method = PAYOUT_METHODS[r.payoutMethod];

  if (!r.fullName || String(r.fullName).trim().length < 3) errors.fullName = 'Nombre completo obligatorio';
  if (!method) errors.payoutMethod = `Método de cobro no válido. Opciones: ${Object.keys(PAYOUT_METHODS).join(', ')}`;

  if (method?.country === 'CO') {
    if (!isColombianCedula(r.documentNumber)) errors.documentNumber = 'Cédula colombiana no válida (6-10 dígitos)';
    if (r.payoutMethod === 'NEQUI' || r.payoutMethod === 'DAVIPLATA') {
      if (!isColombianMobile(r.phone)) errors.phone = 'Número móvil colombiano no válido (10 dígitos, empieza por 3)';
    }
    if (r.payoutMethod === 'BANK_CO') {
      if (!COLOMBIAN_BANKS[r.bankCode]) errors.bankCode = 'Banco colombiano no soportado';
      if (!/^\d{6,17}$/.test(digits(r.accountNumber))) errors.accountNumber = 'Número de cuenta no válido';
      if (!['AHORROS', 'CORRIENTE'].includes(r.accountType)) errors.accountType = 'Tipo de cuenta: AHORROS o CORRIENTE';
    }
  }

  if (method?.country === 'SV') {
    if (!isValidDui(r.documentNumber)) errors.documentNumber = 'DUI no válido (formato 01234567-8)';
    if (r.payoutMethod === 'BANK_SV') {
      if (!SALVADORAN_BANKS[r.bankCode]) errors.bankCode = 'Banco salvadoreño no soportado';
      if (!/^\d{8,20}$/.test(digits(r.accountNumber))) errors.accountNumber = 'Número de cuenta no válido';
    }
    if (r.payoutMethod === 'WALLET_SV' && !isSalvadoranMobile(r.phone)) {
      errors.phone = 'Número móvil salvadoreño no válido (8 dígitos)';
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fullName: String(r.fullName).trim(),
      payoutMethod: r.payoutMethod,
      country: method.country,
      documentType: method.country === 'CO' ? 'CC' : 'DUI',
      documentNumber: digits(r.documentNumber),
      phone: r.phone ? digits(r.phone) : undefined,
      bankCode: r.bankCode,
      bankName: COLOMBIAN_BANKS[r.bankCode] ?? SALVADORAN_BANKS[r.bankCode],
      accountNumber: r.accountNumber ? digits(r.accountNumber) : undefined,
      accountType: r.accountType,
      alias: r.alias ? String(r.alias).trim() : undefined,
    },
  };
}

export function maskRecipient(rec) {
  const mask = (s) => (s ? `•••${String(s).slice(-4)}` : undefined);
  return { ...rec, documentNumber: mask(rec.documentNumber), accountNumber: mask(rec.accountNumber) };
}
