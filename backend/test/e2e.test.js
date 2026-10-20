import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { startServer, verifiedUser, nequiRecipient } from './helpers.js';

let s;
before(async () => {
  s = await startServer({ providers: { failPayoutFor: ['9999999999'] } });
});
after(() => s.close());

async function newTransfer(token, { recipient = nequiRecipient, corridorId = 'ES-CO', amount = '200' } = {}) {
  const r = await s.api('POST', '/v1/recipients', { token, body: recipient });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const q = await s.api('POST', '/v1/quotes', { body: { corridorId, amount } });
  assert.equal(q.status, 201);
  const t = await s.api('POST', '/v1/transfers', { token, body: { quoteId: q.body.id, recipientId: r.body.id, paymentMethod: 'BIZUM' } });
  return { recipient: r.body, quote: q.body, transfer: t };
}

test('flujo completo España ➔ Colombia (Nequi)', async () => {
  const token = await verifiedUser(s.api);
  const { quote, transfer } = await newTransfer(token);
  assert.equal(transfer.status, 201, JSON.stringify(transfer.body));
  assert.equal(transfer.body.status, 'AWAITING_PAYMENT');
  assert.equal(transfer.body.payment.instructions.type, 'BIZUM');
  assert.equal(transfer.body.paymentFeeMinor, 80);
  assert.equal(transfer.body.totalChargeMinor, 20080);

  const pay = await s.api('POST', `/v1/sandbox/transfers/${transfer.body.id}/simulate-payment`, { token });
  assert.equal(pay.status, 202);
  await s.transfers.waitForSettlement(transfer.body.id);

  const final = await s.api('GET', `/v1/transfers/${transfer.body.id}`, { token });
  assert.equal(final.body.status, 'COMPLETED');
  assert.deepEqual(
    final.body.timeline.map((e) => e.status),
    ['AWAITING_PAYMENT', 'FUNDS_RECEIVED', 'TOKEN_MINTED', 'ON_CHAIN_SENT', 'ON_CHAIN_CONFIRMED', 'CONVERTED', 'PAYOUT_PROCESSING', 'COMPLETED'],
  );
  assert.match(final.body.onChain.txHash, /^0x[0-9a-f]{64}$/);
  assert.match(final.body.onChain.explorerUrl, /amoy\.polygonscan\.com/);
  assert.equal(final.body.receiveAmountMinor, quote.receiveAmountMinor);
  assert.equal(final.body.payout.rail, 'Nequi');

  // Tesorería: el margen FX de la conversión es positivo y la comisión se registra.
  const { body } = await s.api('GET', '/v1/sandbox/ledger');
  const entries = body.ledger.filter((e) => e.transferId === transfer.body.id);
  assert.equal(entries.find((e) => e.type === 'fee_revenue').amountMinor, 99);
  assert.ok(entries.find((e) => e.type === 'fx_margin').amountMinor > 0);

  // La wallet de tesorería conserva exactamente la comisión fija en tokens.
  const balance = await s.providers.chain.balanceOf('EURe', final.body.onChain.from);
  assert.equal(balance, 99);
});

test('flujo España ➔ El Salvador en USD', async () => {
  const token = await verifiedUser(s.api);
  const { transfer } = await newTransfer(token, {
    corridorId: 'ES-SV',
    amount: '150,00',
    recipient: { fullName: 'Rosa Martínez', payoutMethod: 'BANK_SV', documentNumber: '00016297-5', bankCode: 'AGRICOLA', accountNumber: '0012345678' },
  });
  assert.equal(transfer.status, 201, JSON.stringify(transfer.body));
  await s.api('POST', `/v1/sandbox/transfers/${transfer.body.id}/simulate-payment`, { token });
  await s.transfers.waitForSettlement(transfer.body.id);
  const final = await s.api('GET', `/v1/transfers/${transfer.body.id}`, { token });
  assert.equal(final.body.status, 'COMPLETED');
  assert.equal(final.body.destinationCurrency, 'USD');
});

test('sin KYC no se puede enviar', async () => {
  const reg = await s.api('POST', '/v1/auth/register', { body: { email: 'nokyc@test.es', password: '12345678', fullName: 'Sin Kyc' } });
  const { transfer } = await newTransfer(reg.body.token);
  assert.equal(transfer.status, 403);
  assert.equal(transfer.body.error.code, 'KYC_REQUIRED');
});

test('destinatario incompatible con el corredor', async () => {
  const token = await verifiedUser(s.api);
  const { transfer } = await newTransfer(token, { corridorId: 'ES-SV' });
  assert.equal(transfer.status, 422);
  assert.equal(transfer.body.error.code, 'CORRIDOR_MISMATCH');
});

test('screening AML bloquea destinatarios sancionados', async () => {
  const token = await verifiedUser(s.api);
  const { transfer } = await newTransfer(token, { recipient: { ...nequiRecipient, fullName: 'Juan Sancionado' } });
  assert.equal(transfer.status, 403);
  assert.equal(transfer.body.error.code, 'COMPLIANCE_REVIEW');
});

test('límites del piloto por envío y diario', async () => {
  const token = await verifiedUser(s.api);
  const tooBig = await newTransfer(token, { amount: '300,01' });
  assert.equal(tooBig.transfer.body.error.code, 'AMOUNT_OUT_OF_RANGE');
  for (let i = 0; i < 2; i++) assert.equal((await newTransfer(token, { amount: '300' })).transfer.status, 201);
  const over = await newTransfer(token, { amount: '10' });
  assert.equal(over.transfer.body.error.code, 'DAILY_LIMIT');
});

test('idempotencia y cotización de un solo uso', async () => {
  const token = await verifiedUser(s.api);
  const r = await s.api('POST', '/v1/recipients', { token, body: nequiRecipient });
  const q = await s.api('POST', '/v1/quotes', { body: { corridorId: 'ES-CO', amount: '100' } });
  const body = { quoteId: q.body.id, recipientId: r.body.id, paymentMethod: 'CARD' };
  const headers = { 'idempotency-key': 'abc-1' };
  const a = await s.api('POST', '/v1/transfers', { token, body, headers });
  const b = await s.api('POST', '/v1/transfers', { token, body, headers });
  assert.equal(a.body.id, b.body.id);
  const c = await s.api('POST', '/v1/transfers', { token, body });
  assert.equal(c.body.error.code, 'QUOTE_USED');
});

test('fallo en el abono provoca reembolso automático', async () => {
  const token = await verifiedUser(s.api);
  const { transfer } = await newTransfer(token, { recipient: { ...nequiRecipient, documentNumber: '9999999999' } });
  await s.api('POST', `/v1/sandbox/transfers/${transfer.body.id}/simulate-payment`, { token });
  await s.transfers.waitForSettlement(transfer.body.id);
  const final = await s.api('GET', `/v1/transfers/${transfer.body.id}`, { token });
  assert.equal(final.body.status, 'REFUNDED');
  assert.equal(final.body.timeline.at(-1).amountMinor, final.body.totalChargeMinor);
  assert.match(final.body.failureReason, /rechazada/);
});

test('webhook de rampa de entrada exige firma HMAC válida e idempotente', async () => {
  const token = await verifiedUser(s.api);
  const { transfer } = await newTransfer(token);
  const paymentId = transfer.body.payment.paymentId;
  await s.providers.onRamp.simulateFundsReceived(paymentId);
  const raw = JSON.stringify({ event: 'payment.received', paymentId });

  const bad = await s.api('POST', '/v1/webhooks/onramp', { body: raw, headers: { 'x-signature': '00' } });
  assert.equal(bad.status, 401);

  const sig = createHmac('sha256', 'dev-secret-no-usar-en-produccion').update(raw).digest('hex');
  const ok = await s.api('POST', '/v1/webhooks/onramp', { body: raw, headers: { 'x-signature': sig } });
  assert.equal(ok.status, 200);
  const again = await s.api('POST', '/v1/webhooks/onramp', { body: raw, headers: { 'x-signature': sig } });
  assert.equal(again.status, 200);
  await s.transfers.waitForSettlement(transfer.body.id);
  assert.equal((await s.api('GET', `/v1/transfers/${transfer.body.id}`, { token })).body.status, 'COMPLETED');
});

test('un usuario no ve envíos de otro', async () => {
  const a = await verifiedUser(s.api);
  const b = await verifiedUser(s.api);
  const { transfer } = await newTransfer(a);
  const res = await s.api('GET', `/v1/transfers/${transfer.body.id}`, { token: b });
  assert.equal(res.status, 404);
});

test('cancelación de envío pendiente de pago', async () => {
  const token = await verifiedUser(s.api);
  const { transfer } = await newTransfer(token);
  const c = await s.api('POST', `/v1/transfers/${transfer.body.id}/cancel`, { token });
  assert.equal(c.body.status, 'CANCELLED');
});

test('límite mensual del piloto', async () => {
  const token = await verifiedUser(s.api);
  // Simula envíos de días anteriores dentro de los últimos 30 días.
  for (let d = 2; d <= 6; d++) {
    const { transfer } = await newTransfer(token, { amount: '300' });
    s.store.transfers.get(transfer.body.id).createdAt = new Date(Date.now() - d * 86_400_000).toISOString();
  }
  const over = await newTransfer(token, { amount: '10' });
  assert.equal(over.transfer.body.error.code, 'MONTHLY_LIMIT');
});
