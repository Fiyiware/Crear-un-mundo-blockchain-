// Corredores habilitados en el MVP. Cada corredor define la moneda de
// origen/destino, el token de liquidación y los métodos de cobro admitidos.

export const PAYOUT_METHODS = {
  NEQUI: { label: 'Nequi', country: 'CO', kind: 'wallet' },
  DAVIPLATA: { label: 'Daviplata', country: 'CO', kind: 'wallet' },
  BANK_CO: { label: 'Cuenta bancaria (Colombia)', country: 'CO', kind: 'bank' },
  BANK_SV: { label: 'Cuenta bancaria (El Salvador)', country: 'SV', kind: 'bank' },
  WALLET_SV: { label: 'Billetera móvil (El Salvador)', country: 'SV', kind: 'wallet' },
};

export const CORRIDORS = {
  'ES-CO': {
    id: 'ES-CO',
    name: 'España ➔ Colombia',
    priority: 'principal',
    sourceCurrency: 'EUR',
    destinationCountry: 'CO',
    destinationCurrency: 'COP',
    settlementToken: 'EURe',
    payoutMethods: ['NEQUI', 'DAVIPLATA', 'BANK_CO'],
    offRampPartner: 'bitso',
  },
  'ES-SV': {
    id: 'ES-SV',
    name: 'España ➔ El Salvador',
    priority: 'secundario',
    sourceCurrency: 'EUR',
    destinationCountry: 'SV',
    destinationCurrency: 'USD',
    settlementToken: 'EURe',
    payoutMethods: ['BANK_SV', 'WALLET_SV'],
    offRampPartner: 'bitso',
  },
};

export const COLOMBIAN_BANKS = {
  '1007': 'Bancolombia',
  '1051': 'Davivienda',
  '1001': 'Banco de Bogotá',
  '1013': 'BBVA Colombia',
  '1023': 'Banco de Occidente',
  '1052': 'Banco AV Villas',
};

export const SALVADORAN_BANKS = {
  AGRICOLA: 'Banco Agrícola',
  CUSCATLAN: 'Banco Cuscatlán',
  DAVIVIENDA_SV: 'Banco Davivienda Salvadoreño',
  BAC_SV: 'BAC Credomatic',
  PROMERICA_SV: 'Banco Promerica',
};

export const getCorridor = (id) => CORRIDORS[id] ?? null;
