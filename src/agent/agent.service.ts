import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import type {
  ExecutionIntent,
  RiskAssessment,
} from '../risk-engine/types/risk-assessment.types';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { ProtocolAdapterRegistry } from '../protocol-adapters/registry/protocol-adapter.registry';
import type { SwapQuotePreview } from '../protocol-adapters/interfaces/swap-adapter.interface';
import type { SwapIntentDto } from './dto/swap-intent.dto';
import type {
  QuotePreviewResponseDto,
  SwapRiskResponseDto,
} from './dto/swap-risk-response.dto';
import type { Address } from '../common/types/web3.types';
import {
  computeTradeRiskHints,
  type TradeRiskHints,
} from './trade-risk-hints';
import {
  getSupportedEvmChain,
  supportedChainIdsForErrorMessage,
} from '../config/rpc-chain.config';

function mapQuotePreview(p: SwapQuotePreview): QuotePreviewResponseDto {
  return {
    source: p.source,
    ...(p.routing !== undefined ? { routing: p.routing } : {}),
    ...(p.requestId !== undefined ? { requestId: p.requestId } : {}),
    ...(p.slippageTolerancePercent !== undefined
      ? { slippageTolerancePercent: p.slippageTolerancePercent }
      : {}),
    ...(p.priceImpactPercent !== undefined
      ? { priceImpactPercent: p.priceImpactPercent }
      : {}),
    ...(p.expectedAmountOut !== undefined
      ? { expectedAmountOut: p.expectedAmountOut }
      : {}),
    ...(p.minAmountOut !== undefined ? { minAmountOut: p.minAmountOut } : {}),
    ...(p.slippageMaxOutputLoss !== undefined
      ? { slippageMaxOutputLoss: p.slippageMaxOutputLoss }
      : {}),
    ...(p.gasUseEstimate !== undefined
      ? { gasUseEstimate: p.gasUseEstimate }
      : {}),
    ...(p.gasFeeUsd !== undefined ? { gasFeeUsd: p.gasFeeUsd } : {}),
    ...(p.routeSummary !== undefined ? { routeSummary: p.routeSummary } : {}),
  };
}

function toSwapRiskResponse(
  assessment: RiskAssessment,
  quotePreview: SwapQuotePreview | undefined,
  tradeRiskHints: TradeRiskHints,
): SwapRiskResponseDto {
  const gasUsed = assessment.simulation.gasUsed;
  return {
    verdict: assessment.verdict,
    scores: { ...assessment.scores },
    simulation: {
      success: assessment.simulation.success,
      ...(gasUsed !== undefined
        ? { gasUsed: gasUsed.toString(10) }
        : {}),
      ...(assessment.simulation.logs !== undefined
        ? { logs: [...assessment.simulation.logs] }
        : {}),
    },
    ...(quotePreview !== undefined
      ? { quotePreview: mapQuotePreview(quotePreview) }
      : {}),
    tradeRiskHints: {
      level: tradeRiskHints.level,
      reasons: [...tradeRiskHints.reasons],
    },
    evaluatedAt: assessment.evaluatedAt,
  };
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly adapters: ProtocolAdapterRegistry,
    private readonly riskEngine: RiskEngineService,
  ) {}

  /**
   * Quote (adapter) → risk assessment only (no on-chain relay).
   */
  async assessSwapRisk(dto: SwapIntentDto): Promise<SwapRiskResponseDto> {
    if (!getSupportedEvmChain(dto.chainId)) {
      throw new UnprocessableEntityException(
        `Unsupported chainId: ${dto.chainId}. Supported: ${supportedChainIdsForErrorMessage()}.`,
      );
    }
    const protocolId = dto.protocolId ?? 'uniswap';
    const adapter = this.adapters.getSwapAdapter(protocolId);
    const amountIn = BigInt(dto.amountIn);
    const route = await adapter.getQuote({
      chainId: dto.chainId,
      tokenIn: dto.tokenIn as Address,
      tokenOut: dto.tokenOut as Address,
      amountIn,
      swapper: dto.swapper as Address,
      maxSlippagePercent: dto.maxSlippagePercent,
    });

    const ctx: Record<string, unknown> = {};
    if (route.quotePreview?.priceImpactPercent !== undefined) {
      ctx.quotePriceImpactPercent = route.quotePreview.priceImpactPercent;
    }
    if (route.quotePreview?.slippageTolerancePercent !== undefined) {
      ctx.quoteSlippageTolerancePercent =
        route.quotePreview.slippageTolerancePercent;
    }

    const intent: ExecutionIntent = {
      chainId: dto.chainId,
      to: route.router,
      data: route.calldata,
      value: route.value,
      ...(Object.keys(ctx).length > 0 ? { context: ctx } : {}),
    };

    const assessment = await this.riskEngine.assess(intent);
    const tradeRiskHints = computeTradeRiskHints(
      route.quotePreview,
      assessment,
    );
    this.logger.log(
      `Swap risk assessed: verdict=${assessment.verdict} aggregate=${assessment.scores.aggregate} hints=${tradeRiskHints.level}`,
    );
    return toSwapRiskResponse(assessment, route.quotePreview, tradeRiskHints);
  }
}
