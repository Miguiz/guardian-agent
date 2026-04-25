import type { Address, Hex } from '../../common/types/web3.types';

/** Normalized quote response used internally after Uniswap API mapping. */
export interface UniswapQuoteNormalized {
  readonly router: Address;
  readonly calldata: Hex;
  readonly value: bigint;
  readonly chainId: number;
}
