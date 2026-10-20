// Orquestador de remesas: coordina rampa de entrada, blockchain y rampa de
// salida, aplicando la máquina de estados y registrando cada paso.
import { setTimeout as sleep } from 'node:timers/promises';
import { config } from '../config.js';
import { newId } from '../lib/ids.js';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../lib/errors.js';
import { STATUS, canTransition, isTerminal, STATUS_LABELS_ES } from '../domain/transferStates.js';
import { getCorridor } from '../domain/corridors.js';
import { paymentFeeMinor } from '../domain/quote.js';
import { audit } from './store.js';

const PAYMENT_METHODS = ['BIZUM', 'CARD', 'SEPA'];
const COUNTS_FOR_LIMIT = new Set(Object.values(STATUS).filter((s) => !['FAILED', 'CANCELLED', 'REFUNDED'].includes(s)));

export function createTransferService({ store, providers, stepDelayMs = config.stepDelayMs, logger = console }) {
  const { kyc, onRamp, chain, offRamp } = providers;
  let treasuryWallet = null;
  const running = new Map(); // transferId -> promise

  async function getTreasuryWallet() {
    if (!treasuryWallet) treasuryWallet = (await chain.createWallet('treasury-custodial')).address;
    return treasuryWallet;
  }

  function transition(t, to, details = {}) {
    if (!canTransition(t.status, to)) {
      throw new Error(`Transición no permitida ${t.status} -> ${to}`);
    }
    t.status = to;
    t.statusLabel = STATUS_LABELS_ES[to];
    t.updatedAt = new Date().toISOString();
    t.timeline.push({ status: to, label: STATUS_LABELS_ES[to], at: t.updatedAt, ...details });
    audit(store, 'system', 'transfer.status', { transferId: t.id, status: to });
  }

  function volume(userId, windowMs, now = Date.now()) {
    let sum = 0;
    for (const t of store.transfers.values()) {
      if (t.userId !== userId || !COUNTS_FOR_LIMIT.has(t.status)) continue;
      if (now - Date.parse(t.createdAt) < windowMs) sum += t.sendAmountMinor;
    }
    return sum;
  }
  const DAY_MS = 24 * 3600 * 1000;
  const dailyVolume = (userId) => volume(userId, DAY_MS);
  const monthlyVolume = (userId) => volume(userId, 30 * DAY_MS);

  async function createTransfer(user, { quoteId, recipientId, paymentMethod, purpose }, idempotencyKey) {
    if (idempotencyKey) {
      const existing = store.idempotency.get(`${user.id}:${idempotencyKey}`);
      if (existing) return store.transfers.get(existing);
    }

    if (user.kycStatus !== 'APPROVED') throw forbidden('KYC_REQUIRED', 'Debes completar la verificación de identidad');

    const quote = store.quotes.get(quoteId);
    if (!quote) throw badRequest('INVALID_QUOTE', 'Cotización no encontrada');
    if (Date.parse(quote.expiresAt) < Date.now()) throw conflict('QUOTE_EXPIRED', 'La cotización ha caducado, solicita una nueva');
    if (quote.usedBy) throw conflict('QUOTE_USED', 'La cotización ya se ha utilizado');

    const recipient = store.recipients.get(recipientId);
    if (!recipient || recipient.userId !== user.id) throw notFound('Destinatario');

    const corridor = getCorridor(quote.corridorId);
    if (!corridor.payoutMethods.includes(recipient.payoutMethod)) {
      throw unprocessable('CORRIDOR_MISMATCH', `El destinatario no es compatible con el corredor ${corridor.name}`);
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw badRequest('INVALID_PAYMENT_METHOD', `Método de pago: ${PAYMENT_METHODS.join(', ')}`);
    }

    const { minPerTransferCents, maxPerTransferCents, maxDailyCents, maxMonthlyCents } = config.limits;
    if (quote.sendAmountMinor < minPerTransferCents || quote.sendAmountMinor > maxPerTransferCents) {
      throw unprocessable('AMOUNT_OUT_OF_RANGE', 'Importe fuera de los límites del piloto', { minPerTransferCents, maxPerTransferCents });
    }
    if (dailyVolume(user.id) + quote.sendAmountMinor > maxDailyCents) {
      throw unprocessable('DAILY_LIMIT', 'Superarías el límite diario de envío del piloto', { maxDailyCents });
    }
    if (monthlyVolume(user.id) + quote.sendAmountMinor > maxMonthlyCents) {
      throw unprocessable('MONTHLY_LIMIT', 'Superarías el límite mensual de envío del piloto', { maxMonthlyCents });
    }

    // Screening AML del destinatario contra listas de sanciones.
    const screening = await kyc.screenName(recipient.fullName);
    if (screening.hit) {
      audit(store, user.id, 'aml.screening_hit', { recipientId, list: screening.list });
      throw forbidden('COMPLIANCE_REVIEW', 'El envío requiere revisión de cumplimiento normativo');
    }

    const now = new Date().toISOString();
    const t = {
      id: newId('trf'),
      userId: user.id,
      corridorId: corridor.id,
      corridorName: corridor.name,
      quoteId,
      recipientId,
      recipientSnapshot: { fullName: recipient.fullName, payoutMethod: recipient.payoutMethod, country: recipient.country },
      purpose: purpose ?? 'Ayuda familiar',
      paymentMethod,
      sourceCurrency: quote.sourceCurrency,
      destinationCurrency: quote.destinationCurrency,
      settlementToken: quote.settlementToken,
      settlementNetwork: chain.network,
      sendAmountMinor: quote.sendAmountMinor,
      paymentFeeMinor: paymentFeeMinor(paymentMethod, quote.sendAmountMinor),
      totalChargeMinor: quote.sendAmountMinor + paymentFeeMinor(paymentMethod, quote.sendAmountMinor),
      convertedAmountMinor: quote.convertedAmountMinor,
      fixedFeeMinor: quote.fixedFeeMinor,
      receiveAmountMinor: quote.receiveAmountMinor,
      customerRate: quote.customerRate,
      status: STATUS.AWAITING_PAYMENT,
      statusLabel: STATUS_LABELS_ES.AWAITING_PAYMENT,
      timeline: [{ status: STATUS.AWAITING_PAYMENT, label: STATUS_LABELS_ES.AWAITING_PAYMENT, at: now }],
      onChain: {},
      createdAt: now,
      updatedAt: now,
    };

    const payment = await onRamp.createPaymentIntent({ transferId: t.id, amountMinor: t.totalChargeMinor, method: paymentMethod, user });
    t.payment = payment;

    quote.usedBy = t.id;
    store.transfers.set(t.id, t);
    if (idempotencyKey) store.idempotency.set(`${user.id}:${idempotencyKey}`, t.id);
    audit(store, user.id, 'transfer.created', { transferId: t.id, amountMinor: t.sendAmountMinor, corridor: corridor.id });
    return t;
  }

  /** Webhook de la rampa de entrada: el partner confirma recepción de euros. */
  async function handleFundsReceived(paymentId) {
    const t = [...store.transfers.values()].find((x) => x.payment?.paymentId === paymentId);
    if (!t) throw notFound('Transferencia para el pago');
    if (t.status !== STATUS.AWAITING_PAYMENT) return t; // webhook repetido: idempotente
    const payment = onRamp.getPayment(paymentId);
    if (payment?.status !== 'RECEIVED') throw conflict('PAYMENT_NOT_RECEIVED', 'El partner no confirma el pago');
    transition(t, STATUS.FUNDS_RECEIVED, { amountMinor: t.totalChargeMinor, method: t.paymentMethod });
    ledger(t, 'customer_payment', t.totalChargeMinor, t.sourceCurrency);
    // El proveedor del medio de pago retiene su comisión antes de abonar al socio EDE.
    if (t.paymentFeeMinor) ledger(t, 'payment_method_cost', -t.paymentFeeMinor, t.sourceCurrency);
    startSettlement(t);
    return t;
  }

  function startSettlement(t) {
    const p = settle(t)
      .catch((err) => fail(t, err))
      .finally(() => running.delete(t.id));
    running.set(t.id, p);
    return p;
  }

  const pause = () => (stepDelayMs ? sleep(stepDelayMs) : Promise.resolve());

  async function settle(t) {
    const treasury = await getTreasuryWallet();
    const corridor = getCorridor(t.corridorId);

    // 2. Emisión del token euro 1:1 en la wallet custodial de tesorería.
    await pause();
    const mint = await onRamp.mintToWallet({ paymentId: t.payment.paymentId, amountMinor: t.sendAmountMinor, toAddress: treasury });
    t.onChain.mintTxHash = mint.txHash;
    transition(t, STATUS.TOKEN_MINTED, { token: mint.token, txHash: mint.txHash });

    // 3. Transferencia on-chain al partner de salida (la comisión fija se queda en tesorería).
    await pause();
    const deposit = await offRamp.getDepositAddress(t.settlementToken);
    const sent = await chain.transfer({ token: t.settlementToken, from: treasury, to: deposit, amountMinor: t.convertedAmountMinor });
    Object.assign(t.onChain, { txHash: sent.txHash, from: treasury, to: deposit, explorerUrl: chain.explorerUrl(sent.txHash), baseUnits: chain.toBaseUnits(t.settlementToken, t.convertedAmountMinor) });
    transition(t, STATUS.ON_CHAIN_SENT, { txHash: sent.txHash, network: chain.network });

    const receipt = await chain.waitForConfirmation(sent.txHash);
    Object.assign(t.onChain, { blockNumber: receipt.blockNumber, confirmations: receipt.confirmations });
    transition(t, STATUS.ON_CHAIN_CONFIRMED, { blockNumber: receipt.blockNumber, confirmations: receipt.confirmations });
    ledger(t, 'fee_revenue', t.fixedFeeMinor, t.sourceCurrency);

    // 4. Conversión a moneda local en el partner LatAm.
    await pause();
    const order = await offRamp.convert({ token: t.settlementToken, amountMinor: t.convertedAmountMinor, currency: t.destinationCurrency, reference: t.id });
    t.conversion = { orderId: order.orderId, rate: order.rate, receivedMinor: order.receivedMinor, partner: corridor.offRampPartner };
    transition(t, STATUS.CONVERTED, { rate: order.rate, receivedMinor: order.receivedMinor });
    const margin = order.receivedMinor - t.receiveAmountMinor;
    ledger(t, 'fx_margin', margin, t.destinationCurrency);
    if (margin < 0) logger.warn?.(`[treasury] margen FX negativo en ${t.id}: ${margin}`);

    // 5. Abono al destinatario (Nequi / Daviplata / banco).
    await pause();
    const recipient = store.recipients.get(t.recipientId);
    const po = await offRamp.payout({ method: recipient.payoutMethod, recipient, amountMinor: t.receiveAmountMinor, currency: t.destinationCurrency, reference: t.id });
    t.payout = { payoutId: po.payoutId, rail: po.rail };
    transition(t, STATUS.PAYOUT_PROCESSING, { rail: po.rail });

    await pause();
    const final = await offRamp.getPayout(po.payoutId);
    if (final?.status !== 'COMPLETED') throw new Error(final?.failureReason ?? 'El abono no se completó');
    t.payout.completedAt = final.completedAt;
    transition(t, STATUS.COMPLETED, { rail: po.rail, amountMinor: t.receiveAmountMinor, currency: t.destinationCurrency });
    ledger(t, 'payout', -t.receiveAmountMinor, t.destinationCurrency);
    audit(store, 'system', 'transfer.completed', { transferId: t.id });
  }

  function fail(t, err) {
    logger.error?.(`[settlement] ${t.id} falló en ${t.status}: ${err.message}`);
    if (isTerminal(t.status) || t.status === STATUS.FAILED) return;
    t.failureReason = err.message;
    transition(t, STATUS.FAILED, { reason: err.message });
    // En sandbox se reembolsa automáticamente al método de pago original.
    // En producción esto pasa por una cola de revisión de operaciones.
    // Se devuelve todo lo cobrado, incluido el coste del medio de pago.
    transition(t, STATUS.REFUNDED, { amountMinor: t.totalChargeMinor, currency: t.sourceCurrency });
    ledger(t, 'refund', -t.totalChargeMinor, t.sourceCurrency);
  }

  function ledger(t, type, amountMinor, currency) {
    store.ledger.push({ id: newId('led'), transferId: t.id, type, amountMinor, currency, at: new Date().toISOString() });
  }

  function cancel(user, id) {
    const t = getForUser(user, id);
    if (t.status !== STATUS.AWAITING_PAYMENT) throw conflict('NOT_CANCELLABLE', 'Sólo se pueden cancelar envíos pendientes de pago');
    transition(t, STATUS.CANCELLED, { by: 'user' });
    return t;
  }

  function getForUser(user, id) {
    const t = store.transfers.get(id);
    if (!t || t.userId !== user.id) throw notFound('Envío');
    return t;
  }

  const listForUser = (user) =>
    [...store.transfers.values()].filter((t) => t.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  /** Espera a que termine la liquidación en curso (útil en tests y demo). */
  const waitForSettlement = (id) => running.get(id) ?? Promise.resolve();

  return { createTransfer, handleFundsReceived, cancel, getForUser, listForUser, waitForSettlement, dailyVolume, monthlyVolume };
}
