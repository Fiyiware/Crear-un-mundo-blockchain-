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
    // Comisión que cobra cada medio de pago (banco, Visa/Mastercard, Bizum).
    // Con passPaymentCostToCustomer=true se muestra al cliente por separado de
    // nuestra comisión de envío y la paga él: la transferencia es gratis.
    // VERIFICAR CON ASESOR: la PSD2 (art. 62.4, RDL 19/2018 en España) prohíbe
    // recargos por pagar con tarjetas de consumo. Si no se puede repercutir,
    // poner false: el cliente paga lo mismo con cualquier método y el coste lo
    // asume la plataforma. Ajustar porcentajes con las tarifas reales.
    passPaymentCostToCustomer: true,
    paymentMethodCosts: {
      SEPA: { pct: 0, fixedCents: 0 },
      BIZUM: { pct: 0.004, fixedCents: 0 },
      CARD: { pct: 0.01, fixedCents: 0 },
    },
  },
};
