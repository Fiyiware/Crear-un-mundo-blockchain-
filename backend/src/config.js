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
    // Coste del medio de pago, repercutido a quien lo elige. La transferencia
    // bancaria (SEPA Instant al IBAN del socio EDE) no tiene coste extra.
    // Ajustar con las tarifas reales del adquirente / TPV.
    // VERIFICAR CON ASESOR: la PSD2 (art. 62.4) prohíbe recargos por tarjetas
    // de consumo. Alternativa legal con las mismas cifras: precio estándar que
    // ya incluye el coste de tarjeta y descuento por pagar con Bizum o transferencia.
    paymentMethods: {
      SEPA: { pct: 0, fixedCents: 0 },
      BIZUM: { pct: 0.004, fixedCents: 0 },
      CARD: { pct: 0.01, fixedCents: 0 },
    },
  },
};
