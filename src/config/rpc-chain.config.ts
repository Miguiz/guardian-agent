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

/**
 * [PublicNode](https://publicnode.com/) — remplace les `http[0]` viem (ex. mainnet → merkle.io)
 * souvent en 429 / Cloudflare pour les appels serveur.
 */
const PUBLICNODE_HTTP_RPC: Readonly<Record<number, string>> = {
  [mainnet.id]: 'https://ethereum-rpc.publicnode.com',
  [base.id]: 'https://base-rpc.publicnode.com',
  [arbitrum.id]: 'https://arbitrum-one-rpc.publicnode.com',
  [optimism.id]: 'https://optimism-rpc.publicnode.com',
  [polygon.id]: 'https://polygon-bor-rpc.publicnode.com',
  [bsc.id]: 'https://bsc-rpc.publicnode.com',
};

function chainWithPreferredRpc(chain: Chain): Chain {
  const url = PUBLICNODE_HTTP_RPC[chain.id];
  if (!url) {
    return chain;
  }
  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: { http: [url] },
    },
  };
}

/** `chainId` → définition viem + RPC HTTP (PublicNode pour L1/L2 listées, 0G inchangé). */
export const chainById: Record<number, Chain> = {
  [mainnet.id]: chainWithPreferredRpc(mainnet),
  [base.id]: chainWithPreferredRpc(base),
  [arbitrum.id]: chainWithPreferredRpc(arbitrum),
  [optimism.id]: chainWithPreferredRpc(optimism),
  [polygon.id]: chainWithPreferredRpc(polygon),
  [bsc.id]: chainWithPreferredRpc(bsc),
  [zeroGMainnet.id]: zeroGMainnet,
  [zeroGGalileoTestnet.id]: zeroGGalileoTestnet,
};

export function getSupportedEvmChain(chainId: number): Chain | undefined {
  return chainById[chainId];
}

/** Premier endpoint HTTP configuré pour ce `chainId` (voir `chainById`). */
export function getRpcUrl(chainId: number): string | undefined {
  return chainById[chainId]?.rpcUrls.default.http[0];
}

export function supportedChainIdsForErrorMessage(): string {
  return Object.keys(chainById).join(', ');
}
