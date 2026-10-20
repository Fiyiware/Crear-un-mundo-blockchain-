// Plan de pruebas del Sandbox: ejecuta N operaciones simuladas de extremo a
// extremo (positivas y negativas) y genera un informe de evidencias.
//
// Uso: npm run plan-pruebas [-- --n 100 --referencia 6]
//   --n           número total de operaciones (por defecto 100)
//   --referencia  coste medio de referencia del mercado en % (por defecto 6).
//                 Debe sustituirse por el dato oficial del corredor
//                 (Banco Mundial · Remittance Prices Worldwide).
import { createHmac } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, createSimulatedProviders } from '../src/app.js';
import { config } from '../src/config.js';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => a.trim().split(/\s+/)));
const N = Number(args.n ?? 100);
const REFERENCE_COST_PCT = Number(args.referencia ?? 6);
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'evidencias');

const FAIL_DOC = '9999999999'; // cédula CO cuyo abono rechaza el banco (simulado)
const FAIL_DUI = '12345678-4'; // DUI SV válido cuyo abono rechaza el banco (simulado)
const WEBHOOK_SECRET = 'plan-pruebas-secret';
const { app, store, providers, transfers } = createApp({
  stepDelayMs: 0,
  webhookSecret: WEBHOOK_SECRET,
  providers: createSimulatedProviders({ failPayoutFor: [FAIL_DOC, FAIL_DUI.replace('-', '')] }),
  logger: { error() {}, warn() {} },
});
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

async function api(method, path, { body, token, headers = {}, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }), ...headers },
    body: raw ?? (body && JSON.stringify(body)),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

// ---------- Definición de escenarios ----------
const RECIPIENTS = {
  NEQUI: { fullName: 'Carlos Pérez', payoutMethod: 'NEQUI', documentNumber: '1020304050', phone: '3001234567' },
  DAVIPLATA: { fullName: 'Luz Marina Gómez', payoutMethod: 'DAVIPLATA', documentNumber: '52123456', phone: '3109876543' },
  BANK_CO: { fullName: 'Andrés Rojas', payoutMethod: 'BANK_CO', documentNumber: '79876543', bankCode: '1007', accountNumber: '12345678901', accountType: 'AHORROS' },
  BANK_SV: { fullName: 'Rosa Martínez', payoutMethod: 'BANK_SV', documentNumber: '00016297-5', bankCode: 'AGRICOLA', accountNumber: '0012345678' },
  WALLET_SV: { fullName: 'José Hernández', payoutMethod: 'WALLET_SV', documentNumber: '00016297-5', phone: '70123456' },
};
const CORRIDOR_OF = { NEQUI: 'ES-CO', DAVIPLATA: 'ES-CO', BANK_CO: 'ES-CO', BANK_SV: 'ES-SV', WALLET_SV: 'ES-SV' };
const PAY = ['BIZUM', 'CARD', 'SEPA'];

// Reparto: 70 % positivos, 10 % fallo de abono, 5 % AML, 5 % sobre límite,
// 5 % webhook duplicado, 5 % cancelación previa al pago.
const MIX = [
  ['OK', 0.7],
  ['PAYOUT_FAIL', 0.1],
  ['AML_HIT', 0.05],
  ['OVER_LIMIT', 0.05],
  ['WEBHOOK_REPLAY', 0.05],
  ['CANCEL', 0.05],
];
function buildScenarios(n) {
  const list = [];
  for (const [type, share] of MIX) for (let i = 0; i < Math.round(n * share); i++) list.push(type);
  while (list.length < n) list.push('OK');
  return list.slice(0, n).map((type, i) => {
    const method = Object.keys(RECIPIENTS)[i % 5];
    // Importes repartidos entre el mínimo y el máximo del piloto (10–300 €).
    const amountEur = 10 + ((i * 37) % 291);
    return { n: i + 1, type, method, corridorId: CORRIDOR_OF[method], paymentMethod: PAY[i % 3], amount: String(amountEur) };
  });
}

const EXPECTED = {
  OK: 'COMPLETED',
  PAYOUT_FAIL: 'REFUNDED',
  AML_HIT: 'REJECTED:COMPLIANCE_REVIEW',
  OVER_LIMIT: 'REJECTED:AMOUNT_OUT_OF_RANGE',
  WEBHOOK_REPLAY: 'COMPLETED',
  CANCEL: 'CANCELLED',
};
const FULL_PATH = ['AWAITING_PAYMENT', 'FUNDS_RECEIVED', 'TOKEN_MINTED', 'ON_CHAIN_SENT', 'ON_CHAIN_CONFIRMED', 'CONVERTED', 'PAYOUT_PROCESSING', 'COMPLETED'];

async function runScenario(sc) {
  // Un usuario por operación: aísla los límites diarios/mensuales.
  const reg = await api('POST', '/v1/auth/register', { body: { email: `pp${sc.n}@sandbox.test`, password: 'plan-pruebas', fullName: `Usuario Prueba ${sc.n}` } });
  const token = reg.body.token;
  const kyc = await api('POST', '/v1/kyc/sessions', { token });
  await api('POST', `/v1/kyc/sessions/${kyc.body.sessionId}/submit`, { token, body: { documentType: 'NIE', documentNumber: 'X1234567L', selfieProvided: true } });

  const recipient = { ...RECIPIENTS[sc.method] };
  if (sc.type === 'PAYOUT_FAIL') recipient.documentNumber = sc.corridorId === 'ES-CO' ? FAIL_DOC : FAIL_DUI;
  if (sc.type === 'AML_HIT') recipient.fullName = 'Juan Sancionado';
  const rcp = await api('POST', '/v1/recipients', { token, body: recipient });
  const amount = sc.type === 'OVER_LIMIT' ? '300,01' : sc.amount;
  const quote = await api('POST', '/v1/quotes', { body: { corridorId: sc.corridorId, amount } });
  const created = await api('POST', '/v1/transfers', { token, body: { quoteId: quote.body.id, recipientId: rcp.body.id, paymentMethod: sc.paymentMethod } });

  const r = { ...sc, amount, quote: quote.body };
  if (created.status !== 201) {
    r.outcome = `REJECTED:${created.body.error.code}`;
    return r;
  }
  const t = created.body;
  if (sc.type === 'CANCEL') {
    r.outcome = (await api('POST', `/v1/transfers/${t.id}/cancel`, { token })).body.status;
    return r;
  }

  const t0 = performance.now();
  // El partner EDE confirma el pago mediante webhook firmado (HMAC).
  await providers.onRamp.simulateFundsReceived(t.payment.paymentId);
  const raw = JSON.stringify({ event: 'payment.received', paymentId: t.payment.paymentId });
  const sig = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  const deliveries = sc.type === 'WEBHOOK_REPLAY' ? 3 : 1;
  for (let i = 0; i < deliveries; i++) await api('POST', '/v1/webhooks/onramp', { raw, headers: { 'x-signature': sig } });
  await transfers.waitForSettlement(t.id);
  r.processingMs = performance.now() - t0;

  const final = (await api('GET', `/v1/transfers/${t.id}`, { token })).body;
  r.outcome = final.status;
  r.transfer = final;
  r.mintCount = final.timeline.filter((e) => e.status === 'TOKEN_MINTED').length;
  r.traceable = final.status !== 'COMPLETED' || (JSON.stringify(final.timeline.map((e) => e.status)) === JSON.stringify(FULL_PATH) && /^0x[0-9a-f]{64}$/.test(final.onChain.txHash) && /^0x[0-9a-f]{64}$/.test(final.onChain.mintTxHash));
  return r;
}

// ---------- Ejecución ----------
const scenarios = buildScenarios(N);
const results = [];
const started = Date.now();
for (const sc of scenarios) results.push(await runScenario(sc));
server.close();

// ---------- Métricas ----------
const pct = (a, b) => (b ? Math.round((a / b) * 10000) / 100 : 0);
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const percentile = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
const eur = (minor) => (minor / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

for (const r of results) r.pass = r.outcome === EXPECTED[r.type];
const completed = results.filter((r) => r.outcome === 'COMPLETED');
const times = completed.map((r) => r.processingMs);
const costs = completed.map((r) => r.quote.totalCostPct);
const sent = completed.reduce((a, r) => a + r.quote.sendAmountMinor, 0);
const ourCost = completed.reduce((a, r) => a + r.quote.totalCostMinor, 0);
const refCost = Math.round(sent * (REFERENCE_COST_PCT / 100));

// Conciliación: la wallet de tesorería debe contener exactamente las
// comisiones fijas de las operaciones que llegaron a liquidarse on-chain.
const onChainTransfers = results.filter((r) => r.transfer?.onChain?.txHash);
const treasury = onChainTransfers[0]?.transfer.onChain.from;
const treasuryBalance = treasury ? await providers.chain.balanceOf('EURe', treasury) : 0;
const expectedTreasury = onChainTransfers.reduce((a, r) => a + r.transfer.fixedFeeMinor, 0);
const ledgerIn = store.ledger.filter((l) => l.type === 'customer_payment').reduce((a, l) => a + l.amountMinor, 0);
const ledgerRefund = -store.ledger.filter((l) => l.type === 'refund').reduce((a, l) => a + l.amountMinor, 0);
const fxMarginNegative = store.ledger.filter((l) => l.type === 'fx_margin' && l.amountMinor < 0).length;

const byType = Object.keys(EXPECTED).map((type) => {
  const rs = results.filter((r) => r.type === type);
  return { type, total: rs.length, passed: rs.filter((r) => r.pass).length, expected: EXPECTED[type] };
});
const byMethod = Object.keys(RECIPIENTS).map((m) => {
  const rs = completed.filter((r) => r.method === m);
  return { method: m, completed: rs.length, avgCostPct: Math.round(avg(rs.map((r) => r.quote.totalCostPct)) * 100) / 100 };
});

const checks = [
  ['Todas las operaciones obtienen el resultado esperado', results.every((r) => r.pass)],
  ['Trazabilidad completa (8 estados + hash de emisión y de transferencia) en el 100 % de las completadas', completed.every((r) => r.traceable)],
  ['Sin doble emisión de tokens ante webhooks duplicados', results.filter((r) => r.type === 'WEBHOOK_REPLAY').every((r) => r.mintCount === 1)],
  ['Conciliación de tesorería on-chain (saldo = comisiones cobradas)', treasuryBalance === expectedTreasury],
  ['Reembolso íntegro en el 100 % de los abonos fallidos', results.filter((r) => r.type === 'PAYOUT_FAIL').every((r) => r.outcome === 'REFUNDED')],
  ['Sin margen FX negativo', fxMarginNegative === 0],
  ['Ninguna operación supera el límite por operación del piloto', results.filter((r) => r.transfer).every((r) => r.transfer.sendAmountMinor <= config.limits.maxPerTransferCents)],
];

const summary = {
  generatedAt: new Date().toISOString(),
  environment: { mode: 'simulado', network: providers.chain.network, token: 'EURe', node: process.version },
  totals: { operations: results.length, passed: results.filter((r) => r.pass).length, completed: completed.length, durationSeconds: (Date.now() - started) / 1000 },
  processingMs: { avg: avg(times), p95: percentile(times, 95), max: Math.max(0, ...times) },
  cost: { avgPct: avg(costs), minPct: Math.min(...costs), maxPct: Math.max(...costs), referencePct: REFERENCE_COST_PCT, sentMinor: sent, ourCostMinor: ourCost, referenceCostMinor: refCost, savingsMinor: refCost - ourCost },
  reconciliation: { treasuryBalance, expectedTreasury, ledgerIn, ledgerRefund },
  limits: config.limits,
  byType,
  byMethod,
  checks: checks.map(([name, ok]) => ({ name, ok })),
};

// ---------- Informe ----------
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'plan-pruebas-resultados.json'), JSON.stringify({ summary, operations: results.map(({ transfer, quote, ...r }) => ({ ...r, transferId: transfer?.id, txHash: transfer?.onChain?.txHash, sendAmountMinor: quote?.sendAmountMinor, receiveAmountMinor: quote?.receiveAmountMinor, destinationCurrency: quote?.destinationCurrency, totalCostPct: quote?.totalCostPct })) }, null, 2));

const LABEL = { OK: 'Envío estándar', PAYOUT_FAIL: 'Abono rechazado en destino', AML_HIT: 'Destinatario en lista de sanciones', OVER_LIMIT: 'Importe superior al límite', WEBHOOK_REPLAY: 'Notificación de pago duplicada', CANCEL: 'Cancelación antes del pago' };
const md = `# Informe del plan de pruebas (entorno simulado)

Generado: ${summary.generatedAt} · Red: ${summary.environment.network} (simulada) · Token: EURe · Node ${process.version}

> Las cifras de tiempo miden el procesamiento interno del orquestador sin
> latencia de red real. Deben repetirse con los sandbox reales de los
> proveedores (Monerium, Bitso, Polygon Amoy) antes de presentarlas como
> tiempos de liquidación.

## Resumen

| Indicador | Resultado |
|---|---|
| Operaciones ejecutadas | ${summary.totals.operations} |
| Resultado conforme a lo esperado | ${summary.totals.passed} / ${summary.totals.operations} (${pct(summary.totals.passed, summary.totals.operations)} %) |
| Envíos completados | ${completed.length} |
| Tiempo de procesamiento interno (media / p95 / máx.) | ${summary.processingMs.avg.toFixed(1)} ms / ${summary.processingMs.p95.toFixed(1)} ms / ${summary.processingMs.max.toFixed(1)} ms |
| Coste total para el usuario (media / mín. / máx.) | ${summary.cost.avgPct.toFixed(2)} % / ${summary.cost.minPct.toFixed(2)} % / ${summary.cost.maxPct.toFixed(2)} % |
| Volumen enviado (completados) | ${eur(sent)} |
| Coste para los usuarios con esta solución | ${eur(ourCost)} |
| Coste con la referencia de mercado (${REFERENCE_COST_PCT} %) | ${eur(refCost)} |
| Ahorro estimado para las familias | **${eur(refCost - ourCost)}** |

La referencia de mercado (${REFERENCE_COST_PCT} %) es un parámetro: sustitúyase por el coste medio oficial del corredor España ➔ Colombia / El Salvador publicado por el Banco Mundial (*Remittance Prices Worldwide*) y cítese la fuente en la memoria.

> **Comisión fija:** con 0,99 € por envío, el coste porcentual es mayor en los envíos pequeños (${summary.cost.maxPct.toFixed(2)} % en el mínimo de 10 €) y baja hacia el 0,8 % en los grandes. Si se quiere comunicar un coste máximo del 1–1,5 %, hay que revisar la comisión fija o fijar un importe mínimo más alto.

## Resultados por escenario

| Escenario | Operaciones | Resultado esperado | Conformes |
|---|---|---|---|
${byType.map((t) => `| ${LABEL[t.type]} | ${t.total} | \`${t.expected}\` | ${t.passed} / ${t.total} |`).join('\n')}

## Envíos completados por método de cobro

| Método | Completados | Coste medio |
|---|---|---|
${byMethod.map((m) => `| ${m.method} | ${m.completed} | ${m.avgCostPct.toFixed(2)} % |`).join('\n')}

## Controles verificados

| Control | Resultado |
|---|---|
${summary.checks.map((c) => `| ${c.name} | ${c.ok ? '✅ Cumple' : '❌ No cumple'} |`).join('\n')}

## Conciliación

- Saldo de la wallet de tesorería: ${eur(treasuryBalance)} · comisiones esperadas: ${eur(expectedTreasury)}
- Euros recibidos de usuarios: ${eur(ledgerIn)} · reembolsados: ${eur(ledgerRefund)}

## Límites aplicados

${eur(config.limits.minPerTransferCents)} – ${eur(config.limits.maxPerTransferCents)} por operación · ${eur(config.limits.maxDailyCents)} / 24 h · ${eur(config.limits.maxMonthlyCents)} / 30 días por usuario.

El detalle de cada operación (importes, hash de transacción y resultado) está en \`plan-pruebas-resultados.json\`.
`;
writeFileSync(join(OUT_DIR, 'plan-pruebas-informe.md'), md);

console.log(`Operaciones: ${summary.totals.operations} · conformes: ${summary.totals.passed} · completadas: ${completed.length}`);
console.log(`Coste medio: ${summary.cost.avgPct.toFixed(2)} % · ahorro estimado vs ${REFERENCE_COST_PCT} %: ${eur(refCost - ourCost)}`);
for (const c of summary.checks) console.log(`${c.ok ? '✅' : '❌'} ${c.name}`);
console.log(`Informe: docs/evidencias/plan-pruebas-informe.md`);
process.exitCode = summary.checks.every((c) => c.ok) ? 0 : 1;
