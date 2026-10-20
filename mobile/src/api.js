// Cliente HTTP del backend de remesas.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(status, error) {
    super(error?.message ?? 'Error de red');
    this.status = status;
    this.code = error?.code;
    this.details = error?.details;
  }
}

let authToken = null;
export const setToken = (t) => {
  authToken = t;
};

async function request(method, path, body, headers = {}) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { message: `No se puede conectar con ${BASE_URL}` });
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, json?.error);
  return json;
}

const idemKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const api = {
  register: (data) => request('POST', '/v1/auth/register', data),
  login: (data) => request('POST', '/v1/auth/login', data),
  me: () => request('GET', '/v1/me'),
  startKyc: () => request('POST', '/v1/kyc/sessions'),
  submitKyc: (id, data) => request('POST', `/v1/kyc/sessions/${id}/submit`, data),
  corridors: () => request('GET', '/v1/corridors'),
  quote: (data) => request('POST', '/v1/quotes', data),
  recipients: () => request('GET', '/v1/recipients'),
  addRecipient: (data) => request('POST', '/v1/recipients', data),
  deleteRecipient: (id) => request('DELETE', `/v1/recipients/${id}`),
  createTransfer: (data) => request('POST', '/v1/transfers', data, { 'Idempotency-Key': idemKey() }),
  transfers: () => request('GET', '/v1/transfers'),
  transfer: (id) => request('GET', `/v1/transfers/${id}`),
  cancelTransfer: (id) => request('POST', `/v1/transfers/${id}/cancel`),
  simulatePayment: (id) => request('POST', `/v1/sandbox/transfers/${id}/simulate-payment`),
};
