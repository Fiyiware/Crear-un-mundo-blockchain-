// Demo end-to-end para la memoria del Sandbox Regulatorio:
// un pago de prueba en euros recorre toda la cadena hasta el abono en Nequi.
// Uso: npm run demo [-- importe] (por defecto 200 €)
import { createApp } from '../src/app.js';
import { format } from '../src/lib/money.js';

const amount = process.argv[2] ?? '200';
const { app, transfers } = createApp({ stepDelayMs: 300, logger: { error: console.error, warn() {} } });
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

async function api(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${JSON.stringify(json)}`);
  return json;
}

const step = (n, text) => console.log(`\n\x1b[1m${n}. ${text}\x1b[0m`);

try {
  step(1, 'Registro del remitente en España');
  const { token, user } = await api('POST', '/v1/auth/register', { email: 'demo@remesas.es', password: 'demo-1234', fullName: 'Lucía Fernández' });
  console.log(`   Usuario ${user.fullName} (${user.id})`);

  step(2, 'Verificación KYC (DNI + selfie) vía partner EDE');
  const kyc = await api('POST', '/v1/kyc/sessions', null, token);
  const decision = await api('POST', `/v1/kyc/sessions/${kyc.sessionId}/submit`, { documentType: 'DNI', documentNumber: '12345678Z', selfieProvided: true }, token);
  console.log(`   Resultado: ${decision.status}`);

  step(3, 'Alta del destinatario en Colombia (Nequi)');
  const rcp = await api('POST', '/v1/recipients', { fullName: 'Carlos Pérez', payoutMethod: 'NEQUI', documentNumber: '1020304050', phone: '3001234567' }, token);
  console.log(`   ${rcp.fullName} · Nequi ${rcp.phone} · CC ${rcp.documentNumber}`);

  step(4, `Cotización para enviar ${amount} €`);
  const q = await api('POST', '/v1/quotes', { corridorId: 'ES-CO', amount });
  console.log(`   Envías:            ${format(q.sendAmountMinor, 'EUR')}`);
  console.log(`   Comisión fija:     ${format(q.fixedFeeMinor, 'EUR')}`);
  console.log(`   Tipo aplicado:     1 € = ${q.customerRate} COP (medio ${q.midMarketRate})`);
  console.log(`   Recibe:            ${format(q.receiveAmountMinor, 'COP')}`);
  console.log(`   Coste total:       ${q.totalCostPct}% (referencia: coste medio global de remesas ≈ 6%, Banco Mundial)`);

  step(5, 'Creación del envío y pago con Bizum (simulado)');
  const t = await api('POST', '/v1/transfers', { quoteId: q.id, recipientId: rcp.id, paymentMethod: 'BIZUM' }, token);
  console.log(`   Envío ${t.id} · concepto Bizum ${t.payment.reference}`);
  const started = Date.now();
  await api('POST', `/v1/sandbox/transfers/${t.id}/simulate-payment`, null, token);
  await transfers.waitForSettlement(t.id);

  step(6, 'Trazabilidad del envío');
  const final = await api('GET', `/v1/transfers/${t.id}`, null, token);
  for (const e of final.timeline) {
    const extra = e.txHash ? ` · tx ${e.txHash.slice(0, 18)}…` : e.rail ? ` · ${e.rail}` : '';
    console.log(`   ${e.at.slice(11, 23)}  ${e.status.padEnd(19)} ${e.label}${extra}`);
  }
  console.log(`\n   Explorador: ${final.onChain.explorerUrl}`);
  console.log(`   Estado final: \x1b[32m${final.statusLabel}\x1b[0m en ${((Date.now() - started) / 1000).toFixed(1)} s`);

  step(7, 'Asientos de tesorería');
  const { ledger } = await api('GET', '/v1/sandbox/ledger');
  for (const l of ledger) console.log(`   ${l.type.padEnd(17)} ${format(l.amountMinor, l.currency)}`);
} finally {
  server.close();
}
