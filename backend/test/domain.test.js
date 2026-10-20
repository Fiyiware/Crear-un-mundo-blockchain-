import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuote } from '../src/domain/quote.js';
import { validateRecipient, isValidDui } from '../src/domain/recipients.js';
import { isValidDni, isValidNie } from '../src/domain/identity.js';
import { canTransition } from '../src/domain/transferStates.js';
import { toMinor } from '../src/lib/money.js';
import { signToken, verifyToken, hashPassword, verifyPassword } from '../src/lib/auth.js';

test('toMinor acepta coma y punto decimales', () => {
  assert.equal(toMinor('100'), 10000);
  assert.equal(toMinor('12,5'), 1250);
  assert.equal(toMinor('0.99'), 99);
  assert.ok(Number.isNaN(toMinor('12.345')));
  assert.ok(Number.isNaN(toMinor('-5')));
});

test('cotización modo envío: comisión fija + margen FX', () => {
  const q = buildQuote({ corridorId: 'ES-CO', mode: 'send', amountMinor: 20000, midRate: 4650 });
  assert.equal(q.fixedFeeMinor, 99);
  assert.equal(q.convertedAmountMinor, 19901);
  assert.equal(q.customerRate, 4626.75); // 4650 * (1 - 0,005)
  assert.equal(q.receiveAmountMinor, Math.floor(19901 * 4626.75));
  assert.equal(q.destinationCurrency, 'COP');
  assert.ok(q.totalCostPct > 0 && q.totalCostPct < 1.5, `coste total ${q.totalCostPct}%`);
});

test('cotización modo recepción cubre el importe pedido', () => {
  const q = buildQuote({ corridorId: 'ES-SV', mode: 'receive', amountMinor: 10000, midRate: 1.085 });
  assert.equal(q.destinationCurrency, 'USD');
  assert.ok(Math.floor((q.sendAmountMinor - q.fixedFeeMinor) * q.customerRate) >= 10000);
});

test('cotización rechaza corredor desconocido', () => {
  assert.throws(() => buildQuote({ corridorId: 'ES-XX', amountMinor: 100, midRate: 1 }), /Corredor/);
});

test('validación de DNI y NIE españoles', () => {
  assert.ok(isValidDni('12345678Z'));
  assert.ok(!isValidDni('12345678A'));
  assert.ok(isValidNie('X1234567L'));
  assert.ok(!isValidNie('X1234567A'));
});

test('validación de DUI salvadoreño', () => {
  assert.ok(isValidDui('00016297-5'));
  assert.ok(!isValidDui('00016297-4'));
});

test('validación de destinatarios Nequi y banco SV', () => {
  assert.equal(validateRecipient({ fullName: 'Carlos Pérez', payoutMethod: 'NEQUI', documentNumber: '1020304050', phone: '300 123 4567' }).ok, true);
  const bad = validateRecipient({ fullName: 'Carlos', payoutMethod: 'NEQUI', documentNumber: '12', phone: '123' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.phone && bad.errors.documentNumber);
  assert.equal(
    validateRecipient({ fullName: 'Rosa Martínez', payoutMethod: 'BANK_SV', documentNumber: '00016297-5', bankCode: 'AGRICOLA', accountNumber: '0012345678' }).ok,
    true,
  );
});

test('máquina de estados impide saltos', () => {
  assert.ok(canTransition('AWAITING_PAYMENT', 'FUNDS_RECEIVED'));
  assert.ok(!canTransition('AWAITING_PAYMENT', 'COMPLETED'));
  assert.ok(!canTransition('COMPLETED', 'FAILED'));
});

test('tokens y contraseñas', () => {
  const token = signToken({ sub: 'usr_1' }, 's3cret', 60);
  assert.equal(verifyToken(token, 's3cret').sub, 'usr_1');
  assert.equal(verifyToken(token, 'otro'), null);
  assert.equal(verifyToken(signToken({ sub: 'x' }, 's3cret', -1), 's3cret'), null);
  const h = hashPassword('abc12345');
  assert.ok(verifyPassword('abc12345', h));
  assert.ok(!verifyPassword('abc12346', h));
});
