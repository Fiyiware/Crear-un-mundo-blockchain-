// Blockchain simulada con semántica tipo EVM (direcciones 0x, hashes de
// transacción, bloques y confirmaciones) para el token euro ERC-20.
// Sustituible por un adaptador real de Polygon Amoy sin cambiar el orquestador.
import { hex, sha256Hex } from '../../lib/ids.js';
import { setTimeout as sleep } from 'node:timers/promises';

const NETWORKS = {
  'polygon-amoy': { chainId: 80002, explorer: 'https://amoy.polygonscan.com/tx/', confirmationsRequired: 3 },
  'solana-devnet': { chainId: null, explorer: 'https://explorer.solana.com/tx/', confirmationsRequired: 1, suffix: '?cluster=devnet' },
  'stellar-testnet': { chainId: null, explorer: 'https://stellar.expert/explorer/testnet/tx/', confirmationsRequired: 1 },
};

// Los tokens euro (EURe/EURC) usan 18 / 6 decimales on-chain; internamente
// trabajamos en céntimos y exponemos también la cantidad en unidades base.
const TOKEN_DECIMALS = { EURe: 18, EURC: 6 };

export function createSimulatedChain({ network = 'polygon-amoy', blockTimeMs = 0 } = {}) {
  const net = NETWORKS[network];
  if (!net) throw new Error(`Red no soportada: ${network}`);

  const balances = new Map(); // `${token}:${address}` -> céntimos
  const txs = new Map();
  let blockNumber = 1_000_000;

  const key = (token, addr) => `${token}:${addr.toLowerCase()}`;
  const get = (token, addr) => balances.get(key(token, addr)) ?? 0;
  const set = (token, addr, v) => balances.set(key(token, addr), v);

  const record = (tx) => {
    const txHash = `0x${sha256Hex(JSON.stringify(tx) + hex(8))}`;
    const full = { ...tx, txHash, blockNumber: ++blockNumber, submittedAt: Date.now(), status: 'pending' };
    txs.set(txHash, full);
    return full;
  };

  return {
    name: `simulated-${network}`,
    network,
    chainId: net.chainId,

    async createWallet(label) {
      return { address: `0x${hex(20)}`, label };
    },

    async balanceOf(token, address) {
      return get(token, address);
    },

    toBaseUnits(token, amountMinor) {
      const decimals = TOKEN_DECIMALS[token] ?? 18;
      return (BigInt(amountMinor) * 10n ** BigInt(decimals - 2)).toString();
    },

    /** Sólo la puede invocar el emisor del token (la rampa de entrada). */
    async mint({ token, to, amountMinor }) {
      set(token, to, get(token, to) + amountMinor);
      const tx = record({ type: 'mint', token, from: '0x0000000000000000000000000000000000000000', to, amountMinor });
      tx.status = 'confirmed';
      return tx;
    },

    async transfer({ token, from, to, amountMinor }) {
      if (get(token, from) < amountMinor) throw new Error('Saldo insuficiente en la wallet custodial');
      set(token, from, get(token, from) - amountMinor);
      set(token, to, get(token, to) + amountMinor);
      const tx = record({ type: 'transfer', token, from, to, amountMinor, baseUnits: this.toBaseUnits(token, amountMinor) });
      return { txHash: tx.txHash, status: tx.status };
    },

    async waitForConfirmation(txHash) {
      const tx = txs.get(txHash);
      if (!tx) throw new Error(`Transacción desconocida: ${txHash}`);
      if (blockTimeMs) await sleep(blockTimeMs);
      tx.status = 'confirmed';
      blockNumber += net.confirmationsRequired;
      return {
        txHash,
        blockNumber: tx.blockNumber,
        confirmations: blockNumber - tx.blockNumber + 1,
        status: tx.status,
        networkFeeEstimateEur: 0.002, // coste orientativo de gas en Polygon
      };
    },

    explorerUrl(txHash) {
      return `${net.explorer}${txHash}${net.suffix ?? ''}`;
    },
  };
}
