import { createApp, createSimulatedProviders } from '../src/app.js';

const silent = { error() {}, warn() {} };

export async function startServer(opts = {}) {
  const ctx = createApp({ stepDelayMs: 0, logger: silent, providers: createSimulatedProviders(opts.providers), ...opts.app });
  const server = await new Promise((resolve) => {
    const s = ctx.app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, path, { body, token, headers = {} } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  return { ...ctx, base, api, close: () => new Promise((r) => server.close(r)) };
}

/** Registra un usuario y completa el KYC. Devuelve el token. */
export async function verifiedUser(api, { email = `u${Math.random()}@test.es`, fullName = 'Ana García' } = {}) {
  const reg = await api('POST', '/v1/auth/register', { body: { email, password: 'contraseña-segura', fullName } });
  const token = reg.body.token;
  const kyc = await api('POST', '/v1/kyc/sessions', { token });
  await api('POST', `/v1/kyc/sessions/${kyc.body.sessionId}/submit`, {
    token,
    body: { documentType: 'DNI', documentNumber: '12345678Z', selfieProvided: true },
  });
  return token;
}

export const nequiRecipient = {
  fullName: 'Carlos Pérez',
  payoutMethod: 'NEQUI',
  documentNumber: '1020304050',
  phone: '3001234567',
};
