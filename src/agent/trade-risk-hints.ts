import type { SwapQuotePreview } from '../protocol-adapters/interfaces/swap-adapter.interface';
import type { RiskAssessment } from '../risk-engine/types/risk-assessment.types';
import { RiskVerdict } from '../risk-engine/types/risk-assessment.types';

export type TradeRiskHintLevel = 'low' | 'medium' | 'high';

export interface TradeRiskHints {
  readonly level: TradeRiskHintLevel;
  /**
   * Heuristiques (marché, MEV, config, simulation) — indication seulement,
   * pas une preuve qu’un contrat est malveillant.
   */
  readonly reasons: readonly string[];
}

export function computeTradeRiskHints(
  preview: SwapQuotePreview | undefined,
  assessment: RiskAssessment,
): TradeRiskHints {
  const reasons: string[] = [];
  let weight = 0;

  if (!preview || preview.source === 'stub') {
    reasons.push(
      'Mode stub ou quote incomplète : ne pas utiliser pour estimer perte réelle ni risque scam.',
    );
    weight += 2;
  }

  if (preview?.priceImpactPercent !== undefined) {
    const pi = preview.priceImpactPercent;
    if (pi >= 15) {
      reasons.push(
        `Impact prix très élevé (${pi.toFixed(2)} %) — liquidité faible, manipulation ou mauvais routage possibles ; risque MEV / sandwich élevé.`,
      );
      weight += 3;
    } else if (pi >= 5) {
      reasons.push(
        `Impact prix élevé (${pi.toFixed(2)} %) — glissement effectif et attaques MEV plus probables.`,
      );
      weight += 2;
    } else if (pi >= 2) {
      reasons.push(`Impact prix modéré (${pi.toFixed(2)} %).`);
      weight += 1;
    }
  }

  if (preview?.slippageTolerancePercent !== undefined) {
    const s = preview.slippageTolerancePercent;
    if (s > 5) {
      reasons.push(
        `Slippage toléré large (${s} %) : perte maximale admise sur la sortie potentiellement importante.`,
      );
      weight += 1;
    }
  }

  if (
    preview?.slippageMaxOutputLoss &&
    preview.expectedAmountOut &&
    preview.source === 'live'
  ) {
    try {
      const loss = BigInt(preview.slippageMaxOutputLoss);
      const out = BigInt(preview.expectedAmountOut);
      if (out > 0n) {
        const ratio = Number(loss) / Number(out);
        if (ratio > 0.05) {
          reasons.push(
            'Au pire slippage, la sortie peut être > 5 % inférieure au quote (perte vs prix spot du quote).',
          );
          weight += 1;
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!assessment.simulation.success) {
    reasons.push(
      'Simulation on-chain en échec : exécution probablement impossible ou revert.',
    );
    weight += 2;
  }

  if (assessment.scores.telegram === 0) {
    reasons.push(
      'Contrat cible ou chemin signalé par Telegram / blocklist statique (score Telegram = 0).',
    );
    weight += 2;
  }

  if (assessment.verdict === RiskVerdict.FAIL) {
    reasons.push('Verdict moteur : FAIL (agrégat ou règles bloquantes).');
    weight += 1;
  } else if (assessment.verdict === RiskVerdict.REVIEW) {
    reasons.push('Verdict REVIEW : révision manuelle recommandée.');
    weight += 1;
  }

  let level: TradeRiskHintLevel = 'low';
  if (weight >= 5) {
    level = 'high';
  } else if (weight >= 2) {
    level = 'medium';
  }
  return { level, reasons };
}
