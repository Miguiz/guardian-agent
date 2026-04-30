import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RiskVerdict } from '../../risk-engine/types/risk-assessment.types';

export const riskVerdictSchema = z.nativeEnum(RiskVerdict);

export const quotePreviewResponseSchema = z.object({
  source: z.literal('live'),
  routing: z.string().optional(),
  requestId: z.string().optional(),
  slippageTolerancePercent: z.number().optional(),
  priceImpactPercent: z.number().optional(),
  expectedAmountOut: z.string().optional(),
  minAmountOut: z.string().optional(),
  slippageMaxOutputLoss: z.string().optional(),
  gasUseEstimate: z.string().optional(),
  gasFeeUsd: z.string().optional(),
  routeSummary: z.string().optional(),
});

export const tradeRiskHintsResponseSchema = z.object({
  level: z.enum(['low', 'medium', 'high']),
  reasons: z.array(z.string()),
});

export const riskScoreResponseSchema = z.object({
  security: z.number(),
  social: z.number(),
  telegram: z.number(),
  aggregate: z.number(),
});

export const simulationResponseSchema = z.object({
  success: z.boolean(),
  gasUsed: z.string().optional(),
  logs: z.array(z.string()).optional(),
});

export const swapRiskResponseSchema = z.object({
  verdict: riskVerdictSchema,
  scores: riskScoreResponseSchema,
  simulation: simulationResponseSchema,
  quotePreview: quotePreviewResponseSchema.optional(),
  tradeRiskHints: tradeRiskHintsResponseSchema,
  evaluatedAt: z.string(),
});

export class QuotePreviewResponseDto extends createZodDto(
  quotePreviewResponseSchema,
) {}

export class TradeRiskHintsResponseDto extends createZodDto(
  tradeRiskHintsResponseSchema,
) {}

export class RiskScoreResponseDto extends createZodDto(riskScoreResponseSchema) {}

export class SimulationResponseDto extends createZodDto(
  simulationResponseSchema,
) {}

export class SwapRiskResponseDto extends createZodDto(swapRiskResponseSchema) {}
