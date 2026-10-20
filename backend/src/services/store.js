// Almacén en memoria para el prototipo. La interfaz (Maps por entidad +
// helpers) está pensada para sustituirse por PostgreSQL en la Fase 2.

export function createStore() {
  return {
    users: new Map(), // id -> user
    usersByEmail: new Map(), // email -> id
    recipients: new Map(), // id -> recipient
    quotes: new Map(), // id -> quote
    transfers: new Map(), // id -> transfer
    idempotency: new Map(), // `${userId}:${key}` -> transferId
    ledger: [], // asientos contables
    audit: [], // registro de auditoría (AML / regulador)
  };
}

export function audit(store, actor, action, data = {}) {
  store.audit.push({ at: new Date().toISOString(), actor, action, ...data });
}
