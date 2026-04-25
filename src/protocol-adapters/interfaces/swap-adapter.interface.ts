import type { Address, Hex } from '../../common/types/web3.types';

export interface SwapQuoteRequest {
  readonly chainId: number;
  readonly tokenIn: Address;
  readonly tokenOut: Address;
  readonly amountIn: bigint;
  readonly slippageBps?: number;
  /** Wallet passed to Uniswap `swapper` (quote + calldata). */
  readonly swapper?: Address;
}

export interface SwapRouteArtifact {
  readonly router: Address;
  readonly calldata: Hex;
  readonly value: bigint;
  readonly minAmountOut?: bigint;
}

export interface SwapAdapter {
  readonly protocolId: string;
  getQuote(request: SwapQuoteRequest): Promise<SwapRouteArtifact>;
}
