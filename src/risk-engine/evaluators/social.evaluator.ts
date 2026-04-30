import { Injectable } from '@nestjs/common';
import type { ExecutionIntent } from '../types/risk-assessment.types';

/**
 * Score « social / marché » dérivé uniquement côté serveur à partir du contexte
 * (impact prix et slippage du quote) — le client ne fournit pas d’indice manuel.
 */
@Injectable()
export class SocialEvaluator {
  score(intent: ExecutionIntent): number {
    const ctx = intent.context;
    const pi =
      typeof ctx?.quotePriceImpactPercent === 'number'
        ? ctx.quotePriceImpactPercent
        : undefined;
    const slip =
      typeof ctx?.quoteSlippageTolerancePercent === 'number'
        ? ctx.quoteSlippageTolerancePercent
        : undefined;

    let s: number;
    if (pi === undefined) {
      s = 58;
    } else if (pi >= 15) {
      s = 28;
    } else if (pi >= 10) {
      s = 38;
    } else if (pi >= 5) {
      s = 52;
    } else if (pi >= 2) {
      s = 68;
    } else if (pi >= 0.5) {
      s = 80;
    } else {
      s = 88;
    }

    if (slip !== undefined && slip > 5) {
      s -= 8;
    } else if (slip !== undefined && slip > 2) {
      s -= 4;
    }

    return Math.max(0, Math.min(100, Math.round(s)));
  }
}
