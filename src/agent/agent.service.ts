import { Injectable, Logger } from '@nestjs/common';
import type { ExecutionIntent } from '../risk-engine/types/risk-assessment.types';
import type { RiskAssessment } from '../risk-engine/types/risk-assessment.types';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { ProtocolAdapterRegistry } from '../protocol-adapters/registry/protocol-adapter.registry';
import type { SwapIntentDto } from './dto/swap-intent.dto';
import type { SwapRiskResponseDto } from './dto/swap-risk-response.dto';
import type { Address } from '../common/types/web3.types';

function toSwapRiskResponse(assessment: RiskAssessment): SwapRiskResponseDto {
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
    const protocolId = dto.protocolId ?? 'uniswap';
    const adapter = this.adapters.getSwapAdapter(protocolId);
    const amountIn = BigInt(dto.amountIn);
    const route = await adapter.getQuote({
      chainId: dto.chainId,
      tokenIn: dto.tokenIn as Address,
      tokenOut: dto.tokenOut as Address,
      amountIn,
      swapper: dto.swapper as Address | undefined,
    });

    const intent: ExecutionIntent = {
      chainId: dto.chainId,
      to: route.router,
      data: route.calldata,
      value: route.value,
      context:
        dto.socialHypeIndex !== undefined
          ? { socialHypeIndex: dto.socialHypeIndex }
          : undefined,
    };

    const assessment = await this.riskEngine.assess(intent);
    this.logger.log(
      `Swap risk assessed: verdict=${assessment.verdict} aggregate=${assessment.scores.aggregate}`,
    );
    return toSwapRiskResponse(assessment);
  }
}
