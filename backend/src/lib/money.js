// Utilidades monetarias. Todo importe interno se maneja en unidades menores
// enteras (céntimos) para evitar errores de coma flotante.

export const CURRENCIES = {
  EUR: { decimals: 2, symbol: '€' },
  USD: { decimals: 2, symbol: '$' },
  COP: { decimals: 2, symbol: '$' },
  MXN: { decimals: 2, symbol: '$' },
};

/** Convierte "12,50" | "12.50" | 12.5 a céntimos (1250). */
export function toMinor(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return NaN;
    return Math.round(value * 100);
  }
  if (typeof value !== 'string') return NaN;
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  const [int, dec = ''] = normalized.split('.');
  return Number(int) * 100 + Number(dec.padEnd(2, '0'));
}

export const fromMinor = (minor) => minor / 100;

export function format(minor, currency) {
  const value = fromMinor(minor);
  const locale = currency === 'COP' ? 'es-CO' : currency === 'USD' ? 'en-US' : 'es-ES';
  // EUR con símbolo; COP/USD con código ISO para no confundir ambos "$".
  const currencyDisplay = currency === 'EUR' ? 'symbol' : 'code';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay }).format(value);
}

/** Multiplica un importe menor por un tipo de cambio y redondea hacia abajo. */
export const convertMinor = (minor, rate) => Math.floor(minor * rate);
