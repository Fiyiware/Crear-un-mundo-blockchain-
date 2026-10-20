// KYC simulado. Reglas deterministas para poder probar todos los caminos:
//  - Nombre que contiene "RECHAZO" -> verificación rechazada.
//  - Nombre en la lista de sanciones de prueba -> coincidencia en screening.
import { newId } from '../../lib/ids.js';

const TEST_SANCTIONS_LIST = ['JUAN SANCIONADO', 'MARIA BLOQUEADA'];

export function createSimulatedKyc() {
  const sessions = new Map();

  return {
    name: 'simulated-kyc',

    async startVerification(user) {
      const sessionId = newId('kyc');
      sessions.set(sessionId, { userId: user.id, fullName: user.fullName, createdAt: Date.now() });
      return { sessionId, sdkToken: `sdk_test_${sessionId}`, provider: 'partner-ede-sandbox' };
    },

    async submitDocuments(sessionId, { documentType, documentNumber, selfieProvided }) {
      const s = sessions.get(sessionId);
      if (!s) throw new Error('Sesión KYC desconocida');
      Object.assign(s, { documentType, documentNumber, selfieProvided, submittedAt: Date.now() });
    },

    async getDecision(sessionId) {
      const s = sessions.get(sessionId);
      if (!s) return { status: 'PENDING' };
      if (!s.submittedAt) return { status: 'PENDING' };
      if (!s.selfieProvided) return { status: 'REJECTED', reason: 'Falta la verificación facial' };
      if (/RECHAZO/i.test(s.fullName)) return { status: 'REJECTED', reason: 'Documento no verificable' };
      return { status: 'APPROVED' };
    },

    async screenName(fullName) {
      const normalized = String(fullName).normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
      const hit = TEST_SANCTIONS_LIST.includes(normalized);
      return { hit, list: hit ? 'TEST-SANCTIONS' : undefined };
    },
  };
}
