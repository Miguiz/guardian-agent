import type { Address, Hex } from '../../common/types/web3.types';

export interface SwapQuoteRequest {
  readonly chainId: number;
  readonly tokenIn: Address;
  readonly tokenOut: Address;
  readonly amountIn: bigint;
  /**
   * Slippage max côté Uniswap, en **pourcentage** (ex. `0.5` → 0,5 %, `3` → 3 %).
   * Borné entre 0,01 et 50 côté service ; défaut 0,5 % si absent.
   */
  readonly maxSlippagePercent?: number;
  /** Wallet passed to Uniswap `swapper` (quote + calldata). */
  readonly swapper: Address;
}

/** Données de marché extraites du quote (hors exécution). */
export interface SwapQuotePreview {
  readonly source: 'live';
  readonly routing?: string;
  readonly requestId?: string;
  readonly slippageTolerancePercent?: number;
  /** Impact sur le prix de pool (0–100 %), d’après l’API Uniswap. */
  readonly priceImpactPercent?: number;
  /** Montant de sortie attendu (unités minimales du token out), string décimale. */
  readonly expectedAmountOut?: string;
  /** Plancher de sortie après slippage si fourni par l’API. */
  readonly minAmountOut?: string;
  /** Perte max en token out vs quote si le prix va jusqu’à la borne de slippage (unités minimales). */
  readonly slippageMaxOutputLoss?: string;
  readonly gasUseEstimate?: string;
  readonly gasFeeUsd?: string;
  readonly routeSummary?: string;
}

export interface SwapRouteArtifact {
  readonly router: Address;
  readonly calldata: Hex;
  readonly value: bigint;
  readonly minAmountOut?: bigint;
  /** Aperçu Trade API (live). */
  readonly quotePreview?: SwapQuotePreview;
}

export interface SwapAdapter {
  readonly protocolId: string;
  getQuote(request: SwapQuoteRequest): Promise<SwapRouteArtifact>;
}
