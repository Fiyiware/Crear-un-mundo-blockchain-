// Configuración central. Todo se lee de variables de entorno con valores
// por defecto seguros para el modo sandbox/simulado.

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 4000),
  authSecret: env.AUTH_SECRET ?? 'dev-secret-no-usar-en-produccion',
  tokenTtlSeconds: Number(env.TOKEN_TTL_SECONDS ?? 60 * 60 * 12),
  providerMode: env.PROVIDER_MODE ?? 'simulated',
  settlementNetwork: env.SETTLEMENT_NETWORK ?? 'polygon-amoy',
  stepDelayMs: Number(env.SIMULATED_STEP_DELAY_MS ?? 1500),
  quoteTtlSeconds: Number(env.QUOTE_TTL_SECONDS ?? 120),

  // Límites del piloto (Sandbox Regulatorio). Importes en céntimos de euro.
  limits: {
    minPerTransferCents: 1_000, // 10 €
    maxPerTransferCents: 100_000, // 1.000 €
    maxDailyCents: 300_000, // 3.000 € / día / usuario
  },

  // Modelo de comisiones: fijo + margen sobre el tipo de cambio medio.
  fees: {
    fixedCents: 99, // 0,99 €
    fxSpreadBps: 50, // 0,50 %
  },
};
