// Validación de documentos de identidad del remitente en España.
const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function isValidDni(value) {
  const v = String(value ?? '').toUpperCase().replace(/[\s-]/g, '');
  const m = /^(\d{8})([A-Z])$/.exec(v);
  return !!m && LETTERS[Number(m[1]) % 23] === m[2];
}

export function isValidNie(value) {
  const v = String(value ?? '').toUpperCase().replace(/[\s-]/g, '');
  const m = /^([XYZ])(\d{7})([A-Z])$/.exec(v);
  if (!m) return false;
  const n = Number(`${'XYZ'.indexOf(m[1])}${m[2]}`);
  return LETTERS[n % 23] === m[3];
}

export const isValidPassport = (value) => /^[A-Z0-9]{6,9}$/.test(String(value ?? '').toUpperCase().replace(/\s/g, ''));

export function validateIdentityDocument(type, number) {
  switch (type) {
    case 'DNI':
      return isValidDni(number);
    case 'NIE':
      return isValidNie(number);
    case 'PASAPORTE':
      return isValidPassport(number);
    default:
      return false;
  }
}
