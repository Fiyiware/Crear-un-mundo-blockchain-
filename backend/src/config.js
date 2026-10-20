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
  // Deliberadamente bajos para acotar el riesgo durante las pruebas.
  limits: {
    minPerTransferCents: 1_000, // 10 €
    maxPerTransferCents: 30_000, // 300 € por operación
    maxDailyCents: 60_000, // 600 € / 24 h / usuario
    maxMonthlyCents: 150_000, // 1.500 € / 30 días / usuario
  },

  // Modelo de comisiones: fijo + margen sobre el tipo de cambio medio.
  fees: {
    fixedCents: 99, // 0,99 €
    fxSpreadBps: 50, // 0,50 %
  },
};
