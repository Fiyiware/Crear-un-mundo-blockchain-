// Verificación de conectividad con los entornos sandbox reales de los
// proveedores. Genera docs/evidencias/verificacion-sandbox.json como
// "prueba de integración técnica" para la memoria del Sandbox Regulatorio.
//
// Uso: copia backend/.env.example a backend/.env, rellena las claves y ejecuta
//   npm run verificar-sandbox
//
// IMPORTANTE: las rutas siguen la documentación pública de cada proveedor en el
// momento de escribir este script. Si un proveedor ha cambiado su API, ajusta
// la URL base en .env o la ruta aquí. Nunca se guardan claves ni tokens en el informe.
import { createHmac } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const env = process.env;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'evidencias', 'verificacion-sandbox.json');

const MONERIUM_API_URL = env.MONERIUM_API_URL ?? 'https://api.monerium.dev';
const BITSO_API_URL = env.BITSO_API_URL ?? 'https://stage.bitso.com';
const POLYGON_AMOY_RPC_URL = env.POLYGON_AMOY_RPC_URL ?? 'https://rpc-amoy.polygon.technology';

async function check(name, fn) {
  const t0 = performance.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Math.round(performance.now() - t0), detail };
  } catch (e) {
    return { name, ok: false, ms: Math.round(performance.now() - t0), error: e.message };
  }
}

async function http(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${new URL(url).pathname}: ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

const results = [];

// 1. Monerium (rampa de entrada UE · EURe). OAuth2 client credentials.
if (env.MONERIUM_CLIENT_ID && env.MONERIUM_CLIENT_SECRET) {
  let token;
  results.push(
    await check('Monerium · autenticación OAuth2 (client_credentials)', async () => {
      const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: env.MONERIUM_CLIENT_ID, client_secret: env.MONERIUM_CLIENT_SECRET });
      const r = await http(`${MONERIUM_API_URL}/auth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
      token = r.access_token;
      if (!token) throw new Error('Respuesta sin access_token');
      return { tokenType: r.token_type, expiresIn: r.expires_in };
    }),
  );
  if (token) {
    results.push(
      await check('Monerium · contexto de la cuenta sandbox', async () => {
        const r = await http(`${MONERIUM_API_URL}/auth/context`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.monerium.api-v2+json' } });
        return { keys: Object.keys(r ?? {}) };
      }),
    );
  }
} else {
  results.push({ name: 'Monerium', ok: false, skipped: true, error: 'Faltan MONERIUM_CLIENT_ID / MONERIUM_CLIENT_SECRET' });
}

// 2. Bitso (rampa de salida LatAm). Endpoint público + endpoint firmado.
results.push(
  await check('Bitso · libros de órdenes disponibles (público)', async () => {
    const r = await http(`${BITSO_API_URL}/v3/available_books/`);
    const books = (r.payload ?? []).map((b) => b.book);
    return { total: books.length, relevantes: books.filter((b) => /(eur|usdc|usd).*_(cop|usd|mxn)$/.test(b)) };
  }),
);
if (env.BITSO_API_KEY && env.BITSO_API_SECRET) {
  results.push(
    await check('Bitso · autenticación firmada (balance)', async () => {
      const path = '/v3/balance/';
      const nonce = String(Date.now());
      const signature = createHmac('sha256', env.BITSO_API_SECRET).update(`${nonce}GET${path}`).digest('hex');
      const r = await http(`${BITSO_API_URL}${path}`, { headers: { authorization: `Bitso ${env.BITSO_API_KEY}:${nonce}:${signature}` } });
      return { currencies: (r.payload?.balances ?? []).map((b) => b.currency) };
    }),
  );
} else {
  results.push({ name: 'Bitso · autenticación firmada', ok: false, skipped: true, error: 'Faltan BITSO_API_KEY / BITSO_API_SECRET' });
}

// 3. Polygon Amoy (red de liquidación de pruebas).
results.push(
  await check('Polygon Amoy · RPC (chainId y último bloque)', async () => {
    const rpc = (method) => http(POLYGON_AMOY_RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }) });
    const [chain, block] = await Promise.all([rpc('eth_chainId'), rpc('eth_blockNumber')]);
    const chainId = parseInt(chain.result, 16);
    if (chainId !== 80002) throw new Error(`chainId inesperado: ${chainId}`);
    return { chainId, blockNumber: parseInt(block.result, 16) };
  }),
);

const report = { generatedAt: new Date().toISOString(), endpoints: { MONERIUM_API_URL, BITSO_API_URL, POLYGON_AMOY_RPC_URL }, results };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
for (const r of results) console.log(`${r.ok ? '✅' : r.skipped ? '⏭️ ' : '❌'} ${r.name}${r.ok ? ` (${r.ms} ms)` : ` — ${r.error}`}`);
console.log(`\nInforme: docs/evidencias/verificacion-sandbox.json`);
