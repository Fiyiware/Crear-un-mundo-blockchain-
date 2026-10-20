// Composición de la aplicación HTTP. Recibe los proveedores por inyección
// para poder usar adaptadores simulados, de sandbox o de producción.
import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { AppError, badRequest, unauthorized, conflict, notFound } from './lib/errors.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from './lib/auth.js';
import { newId } from './lib/ids.js';
import { toMinor } from './lib/money.js';
import { CORRIDORS, PAYOUT_METHODS, COLOMBIAN_BANKS, SALVADORAN_BANKS, getCorridor } from './domain/corridors.js';
import { buildQuote } from './domain/quote.js';
import { validateRecipient, maskRecipient } from './domain/recipients.js';
import { validateIdentityDocument } from './domain/identity.js';
import { createStore, audit } from './services/store.js';
import { createTransferService } from './services/transferService.js';
import { createSimulatedChain } from './providers/simulated/chain.js';
import { createSimulatedOnRamp } from './providers/simulated/onRamp.js';
import { createSimulatedOffRamp } from './providers/simulated/offRamp.js';
import { createSimulatedKyc } from './providers/simulated/kyc.js';

export function createSimulatedProviders({ network = config.settlementNetwork, failPayoutFor } = {}) {
  const chain = createSimulatedChain({ network });
  return {
    chain,
    kyc: createSimulatedKyc(),
    onRamp: createSimulatedOnRamp({ chain }),
    offRamp: createSimulatedOffRamp({ chain, failPayoutFor }),
  };
}

export function createApp({
  store = createStore(),
  providers = createSimulatedProviders(),
  stepDelayMs = config.stepDelayMs,
  webhookSecret = config.authSecret,
  sandboxEnabled = config.providerMode === 'simulated',
  logger = console,
} = {}) {
  const app = express();
  const transfers = createTransferService({ store, providers, stepDelayMs, logger });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ---------- Auth ----------
  const publicUser = (u) => ({ id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, kycStatus: u.kycStatus, createdAt: u.createdAt });

  const requireAuth = (req, _res, next) => {
    const [, token] = /^Bearer (.+)$/.exec(req.get('authorization') ?? '') ?? [];
    const payload = token && verifyToken(token, config.authSecret);
    const user = payload && store.users.get(payload.sub);
    if (!user) return next(unauthorized());
    req.user = user;
    next();
  };

  const issueSession = (user) => ({ token: signToken({ sub: user.id }, config.authSecret, config.tokenTtlSeconds), user: publicUser(user) });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, mode: config.providerMode, network: providers.chain.network, providers: Object.fromEntries(Object.entries(providers).map(([k, v]) => [k, v.name])) });
  });

  app.post('/v1/auth/register', (req, res) => {
    const { email, password, fullName, phone } = req.body ?? {};
    const normEmail = String(email ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normEmail)) throw badRequest('INVALID_EMAIL', 'Email no válido');
    if (String(password ?? '').length < 8) throw badRequest('WEAK_PASSWORD', 'La contraseña debe tener al menos 8 caracteres');
    if (String(fullName ?? '').trim().length < 3) throw badRequest('INVALID_NAME', 'Nombre completo obligatorio');
    if (store.usersByEmail.has(normEmail)) throw conflict('EMAIL_TAKEN', 'Ya existe una cuenta con ese email');
    const user = {
      id: newId('usr'),
      email: normEmail,
      passwordHash: hashPassword(password),
      fullName: String(fullName).trim(),
      phone: phone ? String(phone).trim() : undefined,
      kycStatus: 'NOT_STARTED',
      createdAt: new Date().toISOString(),
    };
    store.users.set(user.id, user);
    store.usersByEmail.set(normEmail, user.id);
    audit(store, user.id, 'user.registered');
    res.status(201).json(issueSession(user));
  });

  app.post('/v1/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    const user = store.users.get(store.usersByEmail.get(String(email ?? '').trim().toLowerCase()));
    if (!user || !verifyPassword(String(password ?? ''), user.passwordHash)) throw unauthorized('Email o contraseña incorrectos');
    res.json(issueSession(user));
  });

  app.get('/v1/me', requireAuth, (req, res) => {
    res.json({ ...publicUser(req.user), limits: config.limits, dailyVolumeMinor: transfers.dailyVolume(req.user.id), monthlyVolumeMinor: transfers.monthlyVolume(req.user.id) });
  });

  // ---------- KYC ----------
  app.post('/v1/kyc/sessions', requireAuth, async (req, res) => {
    const session = await providers.kyc.startVerification(req.user);
    req.user.kycSessionId = session.sessionId;
    req.user.kycStatus = 'PENDING';
    res.status(201).json(session);
  });

  app.post('/v1/kyc/sessions/:id/submit', requireAuth, async (req, res) => {
    if (req.user.kycSessionId !== req.params.id) throw notFound('Sesión KYC');
    const { documentType, documentNumber, selfieProvided } = req.body ?? {};
    if (!validateIdentityDocument(documentType, documentNumber)) {
      throw badRequest('INVALID_DOCUMENT', 'Documento no válido (DNI, NIE o PASAPORTE)');
    }
    await providers.kyc.submitDocuments(req.params.id, { documentType, documentNumber, selfieProvided: !!selfieProvided });
    const decision = await providers.kyc.getDecision(req.params.id);
    req.user.kycStatus = decision.status;
    audit(store, req.user.id, 'kyc.decision', { status: decision.status });
    res.json({ ...decision, user: publicUser(req.user) });
  });

  // ---------- Catálogo y cotizaciones ----------
  app.get('/v1/corridors', (_req, res) => {
    res.json({ corridors: Object.values(CORRIDORS), payoutMethods: PAYOUT_METHODS, banks: { CO: COLOMBIAN_BANKS, SV: SALVADORAN_BANKS } });
  });

  app.post('/v1/quotes', async (req, res) => {
    const { corridorId, mode = 'send', amount } = req.body ?? {};
    const corridor = getCorridor(corridorId);
    if (!corridor) throw badRequest('INVALID_CORRIDOR', 'Corredor no soportado');
    const midRate = await providers.offRamp.getMidRate(corridor.settlementToken, corridor.destinationCurrency);
    const quote = buildQuote({ corridorId, mode, amountMinor: toMinor(amount), midRate });
    store.quotes.set(quote.id, quote);
    res.status(201).json(quote);
  });

  // ---------- Destinatarios ----------
  app.get('/v1/recipients', requireAuth, (req, res) => {
    const list = [...store.recipients.values()].filter((r) => r.userId === req.user.id).map(maskRecipient);
    res.json({ recipients: list });
  });

  app.post('/v1/recipients', requireAuth, (req, res) => {
    const result = validateRecipient(req.body);
    if (!result.ok) throw badRequest('INVALID_RECIPIENT', 'Datos del destinatario no válidos', result.errors);
    const rec = { id: newId('rcp'), userId: req.user.id, ...result.value, createdAt: new Date().toISOString() };
    store.recipients.set(rec.id, rec);
    res.status(201).json(maskRecipient(rec));
  });

  app.delete('/v1/recipients/:id', requireAuth, (req, res) => {
    const rec = store.recipients.get(req.params.id);
    if (!rec || rec.userId !== req.user.id) throw notFound('Destinatario');
    store.recipients.delete(rec.id);
    res.sendStatus(204);
  });

  // ---------- Envíos ----------
  app.post('/v1/transfers', requireAuth, async (req, res) => {
    const t = await transfers.createTransfer(req.user, req.body ?? {}, req.get('idempotency-key'));
    res.status(201).json(t);
  });

  app.get('/v1/transfers', requireAuth, (req, res) => {
    res.json({ transfers: transfers.listForUser(req.user) });
  });

  app.get('/v1/transfers/:id', requireAuth, (req, res) => {
    res.json(transfers.getForUser(req.user, req.params.id));
  });

  app.post('/v1/transfers/:id/cancel', requireAuth, (req, res) => {
    res.json(transfers.cancel(req.user, req.params.id));
  });

  // ---------- Webhooks de partners ----------
  // La rampa de entrada notifica la recepción de fondos con firma HMAC.
  app.post('/v1/webhooks/onramp', async (req, res) => {
    const given = Buffer.from(req.get('x-signature') ?? '', 'hex');
    const expected = createHmac('sha256', webhookSecret).update(req.rawBody ?? '').digest();
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw unauthorized('Firma de webhook no válida');
    const { event, paymentId } = req.body ?? {};
    if (event !== 'payment.received') return res.json({ ignored: true });
    const t = await transfers.handleFundsReceived(paymentId);
    res.json({ transferId: t.id, status: t.status });
  });

  // ---------- Utilidades de sandbox (sólo en modo simulado) ----------
  if (sandboxEnabled) {
    app.post('/v1/sandbox/transfers/:id/simulate-payment', requireAuth, async (req, res) => {
      const t = transfers.getForUser(req.user, req.params.id);
      await providers.onRamp.simulateFundsReceived(t.payment.paymentId);
      await transfers.handleFundsReceived(t.payment.paymentId);
      res.status(202).json(t);
    });

    app.get('/v1/sandbox/ledger', (_req, res) => res.json({ ledger: store.ledger }));
    app.get('/v1/sandbox/audit', (_req, res) => res.json({ audit: store.audit }));
  }

  app.use((_req, _res, next) => next(notFound('Ruta')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON no válido' } });
    }
    logger.error?.(err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno' } });
  });

  return { app, store, providers, transfers };
}
