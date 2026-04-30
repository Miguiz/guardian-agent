import type { Address, Hex } from '../../common/types/web3.types';

export interface SwapQuoteRequest {
  readonly chainId: number;
  readonly tokenIn: Address;
  readonly tokenOut: Address;
  readonly amountIn: bigint;
  /**
   * Tolérance envoyée à Uniswap : `slippageTolerance = slippageBps / 100` (%).
   * Ex. `50` → 0,5 %. Plage typique 1–5000 (0,01 %–50 %), bornée côté service.
   */
  readonly slippageBps?: number;
  /** Wallet passed to Uniswap `swapper` (quote + calldata). */
  readonly swapper?: Address;
}

/** Données de marché extraites du quote (hors exécution). */
export interface SwapQuotePreview {
  readonly source: 'live' | 'stub';
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
  readonly stubWarnings?: readonly string[];
}

export interface SwapRouteArtifact {
  readonly router: Address;
  readonly calldata: Hex;
  readonly value: bigint;
  readonly minAmountOut?: bigint;
  /** Aperçu Trade API (live) ou stub — pour tests / UX risque. */
  readonly quotePreview?: SwapQuotePreview;
}

export interface SwapAdapter {
  readonly protocolId: string;
  getQuote(request: SwapQuoteRequest): Promise<SwapRouteArtifact>;
}
