import type { SwapQuotePreview } from '../interfaces/swap-adapter.interface';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function readNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Parses POST /v1/quote `QuoteResponse` (Classic) for preview fields used in risk UX.
 * @see https://api-docs.uniswap.org/api-reference/swapping/quote
 */
export function extractQuotePreviewFromGatewayBody(
  responseBody: Record<string, unknown>,
  appliedSlippageTolerancePercent: number,
): SwapQuotePreview {
  const routing = readString(responseBody['routing']);
  const requestId = readString(responseBody['requestId']);
  const inner = responseBody['quote'];
  if (!inner || typeof inner !== 'object') {
    return {
      source: 'live',
      routing,
      requestId,
      slippageTolerancePercent: appliedSlippageTolerancePercent,
    };
  }

  const q = inner as Record<string, unknown>;
  const priceImpactPercent = readNumber(q['priceImpact']);
  const slippageFromQuote = readNumber(q['slippage']);
  const slippageTolerancePercent =
    slippageFromQuote ?? appliedSlippageTolerancePercent;

  const gasUseEstimate = readString(q['gasUseEstimate']);
  const gasFeeUsd = readString(q['gasFeeUSD']);
  const routeSummary = readString(q['routeString']);

  let expectedAmountOut: string | undefined;
  const output = q['output'];
  if (output && typeof output === 'object') {
    expectedAmountOut = readString((output as Record<string, unknown>)['amount']);
  }

  let minAmountOut: string | undefined;
  const agg = q['aggregatedOutputs'];
  if (Array.isArray(agg)) {
    for (const item of agg) {
      if (item && typeof item === 'object') {
        const m = readString((item as Record<string, unknown>)['minAmount']);
        if (m !== undefined) {
          minAmountOut = m;
          break;
        }
      }
    }
  }

  let slippageMaxOutputLoss: string | undefined;
  if (expectedAmountOut && minAmountOut) {
    try {
      const exp = BigInt(expectedAmountOut);
      const mn = BigInt(minAmountOut);
      if (exp >= mn) {
        slippageMaxOutputLoss = (exp - mn).toString(10);
      }
    } catch {
      /* ignore parse */
    }
  }

  return {
    source: 'live',
    routing,
    requestId,
    slippageTolerancePercent,
    priceImpactPercent,
    expectedAmountOut,
    minAmountOut,
    slippageMaxOutputLoss,
    gasUseEstimate,
    gasFeeUsd,
    routeSummary,
  };
}

