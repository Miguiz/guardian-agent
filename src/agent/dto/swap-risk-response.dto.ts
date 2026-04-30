import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskVerdict } from '../../risk-engine/types/risk-assessment.types';

export class QuotePreviewResponseDto {
  @ApiProperty({ enum: ['live', 'stub'] })
  source!: 'live' | 'stub';

  @ApiPropertyOptional({ example: 'CLASSIC' })
  routing?: string;

  @ApiPropertyOptional()
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Tolérance de slippage utilisée pour le quote (%)',
    example: 0.5,
  })
  slippageTolerancePercent?: number;

  @ApiPropertyOptional({
    description: 'Impact prix pools Uniswap (0–100 %)',
    example: 0.14,
  })
  priceImpactPercent?: number;

  @ApiPropertyOptional({
    description: 'Montant sortie attendu (unités minimales token out)',
  })
  expectedAmountOut?: string;

  @ApiPropertyOptional({
    description: 'Plancher sortie après slippage (unités minimales)',
  })
  minAmountOut?: string;

  @ApiPropertyOptional({
    description:
      'Perte max en token out vs quote si le prix atteint la borne de slippage (unités minimales)',
  })
  slippageMaxOutputLoss?: string;

  @ApiPropertyOptional({ example: '180350' })
  gasUseEstimate?: string;

  @ApiPropertyOptional({ example: '1.27' })
  gasFeeUsd?: string;

  @ApiPropertyOptional({
    description: 'Résumé de route (texte Uniswap)',
  })
  routeSummary?: string;

  @ApiPropertyOptional({ type: [String] })
  stubWarnings?: string[];
}

export class TradeRiskHintsResponseDto {
  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  level!: 'low' | 'medium' | 'high';

  @ApiProperty({
    type: [String],
    description:
      'Heuristiques marché / MEV / config / simulation — pas une preuve de scam',
  })
  reasons!: string[];
}

export class RiskScoreResponseDto {
  @ApiProperty({ example: 70 })
  security!: number;

  @ApiProperty({ example: 50 })
  social!: number;

  @ApiProperty({ example: 80, description: '0–100 (Telegram / blocklist)' })
  telegram!: number;

  @ApiProperty({ example: 68.5 })
  aggregate!: number;
}

export class SimulationResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Gas estimé (bigint sérialisé en décimal string)',
    example: '150000',
  })
  gasUsed?: string;

  @ApiPropertyOptional({ type: [String] })
  logs?: string[];
}

export class SwapRiskResponseDto {
  @ApiProperty({ enum: RiskVerdict })
  verdict!: RiskVerdict;

  @ApiProperty({ type: RiskScoreResponseDto })
  scores!: RiskScoreResponseDto;

  @ApiProperty({ type: SimulationResponseDto })
  simulation!: SimulationResponseDto;

  @ApiPropertyOptional({
    type: QuotePreviewResponseDto,
    description:
      'Données Trade API (slippage, impact prix, perte max slippage, gas) — absent si quote minimale',
  })
  quotePreview?: QuotePreviewResponseDto;

  @ApiProperty({
    type: TradeRiskHintsResponseDto,
    description:
      'Niveau de vigilance heuristique (scam / MEV / illiquidité — indications seulement)',
  })
  tradeRiskHints!: TradeRiskHintsResponseDto;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  evaluatedAt!: string;
}
