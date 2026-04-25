import type { Chain } from 'viem';
import { defineChain } from 'viem';
import {
  arbitrum,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
} from 'viem/chains';

const known = new Map<number, Chain>([
  [mainnet.id, mainnet],
  [base.id, base],
  [arbitrum.id, arbitrum],
  [optimism.id, optimism],
  [polygon.id, polygon],
  [bsc.id, bsc],
]);

/**
 * Resolves a viem `Chain` for simulation. Unknown ids become minimal custom chains using the given RPC.
 */
export function resolveViemChain(chainId: number, rpcUrl: string): Chain {
  const preset = known.get(chainId);
  if (preset) {
    return {
      ...preset,
      rpcUrls: {
        ...preset.rpcUrls,
        default: { http: [rpcUrl] },
      },
    };
  }
  return defineChain({
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { name: 'Native', symbol: 'N', decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  });
}
