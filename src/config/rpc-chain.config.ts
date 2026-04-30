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

const zeroGMainnet = defineChain({
  id: 16661,
  name: '0G Mainnet',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmrpc.0g.ai'] } },
});

const zeroGGalileoTestnet = defineChain({
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmrpc-testnet.0g.ai'] } },
});

/** `chainId` → définition viem (RPC public = `rpcUrls.default.http[0]`). */
export const chainById: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [base.id]: base,
  [arbitrum.id]: arbitrum,
  [optimism.id]: optimism,
  [polygon.id]: polygon,
  [bsc.id]: bsc,
  [zeroGMainnet.id]: zeroGMainnet,
  [zeroGGalileoTestnet.id]: zeroGGalileoTestnet,
};

export function getSupportedEvmChain(chainId: number): Chain | undefined {
  return chainById[chainId];
}

/** Premier endpoint HTTP public viem pour ce `chainId`. */
export function getRpcUrl(chainId: number): string | undefined {
  return chainById[chainId]?.rpcUrls.default.http[0];
}

export function supportedChainIdsForErrorMessage(): string {
  return Object.keys(chainById).join(', ');
}
