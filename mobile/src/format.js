// Formato de importes sin depender de Intl (comportamiento idéntico en
// iOS, Android y web).
export const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Separa un importe en partes para mostrar la parte decimal más pequeña. */
export function amountParts(minor, currency) {
  const sign = minor < 0 ? '−' : '';
  const abs = Math.abs(minor);
  const int = group(Math.floor(abs / 100));
  const dec = ',' + String(abs % 100).padStart(2, '0');
  return currency === 'EUR'
    ? { prefix: sign, int, dec, suffix: ' €' }
    : { prefix: `${sign}${currency} `, int, dec, suffix: '' };
}

export function money(minor, currency) {
  const p = amountParts(minor, currency);
  return `${p.prefix}${p.int}${p.dec}${p.suffix}`;
}

/** Importe sin decimales, para listas ("COP 1.152.107"). */
export function moneyShort(minor, currency) {
  const p = amountParts(minor, currency);
  return currency === 'EUR' ? money(minor, currency) : `${p.prefix}${p.int}`;
}

export function rate(value, currency) {
  if (currency === 'USD') return value.toFixed(4).replace('.', ',');
  const [i, d] = value.toFixed(2).split('.');
  return `${group(i)},${d}`;
}

export const time = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function date(iso) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86_400_000).toDateString() === d.toDateString();
  if (sameDay) return `hoy, ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  if (yesterday) return 'ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export const firstName = (name = '') => name.trim().split(/\s+/)[0] ?? '';

export const isFinal = (s) => ['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(s);

export const METHOD_LABEL = { NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', BANK_CO: 'Banco', BANK_SV: 'Banco', WALLET_SV: 'Billetera' };
export const PAYMENT_LABEL = { BIZUM: 'Bizum', CARD: 'Tarjeta', SEPA: 'Transferencia' };
