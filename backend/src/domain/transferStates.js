// Máquina de estados de una remesa. Cada transición queda registrada en el
// historial (timeline) del envío para trazabilidad y auditoría.

export const STATUS = {
  AWAITING_PAYMENT: 'AWAITING_PAYMENT', // 0. Creada, esperando pago en € del usuario
  FUNDS_RECEIVED: 'FUNDS_RECEIVED', // 1. Rampa UE confirma recepción de euros
  TOKEN_MINTED: 'TOKEN_MINTED', // 2. Emitido el token euro (EURe/EURC)
  ON_CHAIN_SENT: 'ON_CHAIN_SENT', // 3a. Transacción enviada a la red
  ON_CHAIN_CONFIRMED: 'ON_CHAIN_CONFIRMED', // 3b. Transacción confirmada
  CONVERTED: 'CONVERTED', // 4a. Token vendido por moneda local en el partner LatAm
  PAYOUT_PROCESSING: 'PAYOUT_PROCESSING', // 4b. Orden de abono enviada (Nequi/Daviplata/banco)
  COMPLETED: 'COMPLETED', // 5. Abonado al destinatario
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

const TRANSITIONS = {
  AWAITING_PAYMENT: ['FUNDS_RECEIVED', 'CANCELLED', 'FAILED'],
  FUNDS_RECEIVED: ['TOKEN_MINTED', 'FAILED'],
  TOKEN_MINTED: ['ON_CHAIN_SENT', 'FAILED'],
  ON_CHAIN_SENT: ['ON_CHAIN_CONFIRMED', 'FAILED'],
  ON_CHAIN_CONFIRMED: ['CONVERTED', 'FAILED'],
  CONVERTED: ['PAYOUT_PROCESSING', 'FAILED'],
  PAYOUT_PROCESSING: ['COMPLETED', 'FAILED'],
  FAILED: ['REFUNDED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;

export const isTerminal = (status) => (TRANSITIONS[status]?.length ?? 0) === 0;

export const STATUS_LABELS_ES = {
  AWAITING_PAYMENT: 'Esperando tu pago',
  FUNDS_RECEIVED: 'Pago recibido',
  TOKEN_MINTED: 'Euros tokenizados',
  ON_CHAIN_SENT: 'En tránsito',
  ON_CHAIN_CONFIRMED: 'Liquidado en blockchain',
  CONVERTED: 'Convertido a moneda local',
  PAYOUT_PROCESSING: 'Abonando al destinatario',
  COMPLETED: 'Entregado',
  FAILED: 'Incidencia',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};
