export function money(minor, currency) {
  const locale = currency === 'COP' ? 'es-CO' : currency === 'USD' ? 'en-US' : 'es-ES';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: currency === 'EUR' ? 'symbol' : 'code' }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export const date = (iso) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

export const FINAL_OK = 'COMPLETED';
export const isFinal = (s) => ['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(s);
