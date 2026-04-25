import { Injectable, Logger } from '@nestjs/common';
import type { ExecutionIntent } from '../risk-engine/types/risk-assessment.types';
import { RiskVerdict } from '../risk-engine/types/risk-assessment.types';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { ExecutionHubService } from '../execution-hub/execution-hub.service';
import { ProtocolAdapterRegistry } from '../protocol-adapters/registry/protocol-adapter.registry';
import type { SwapIntentDto } from './dto/swap-intent.dto';
import type { Address, Hex } from '../common/types/web3.types';

export interface SwapExecutionOutcome {
  readonly verdict: RiskVerdict;
  readonly txHash?: Hex;
  readonly reason?: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly adapters: ProtocolAdapterRegistry,
    private readonly riskEngine: RiskEngineService,
    private readonly executionHub: ExecutionHubService,
  ) {}

  /**
   * Orchestrates: protocol quote → risk assessment → KeeperHub relay (if PASS).
   */
  async orchestrateSwap(dto: SwapIntentDto): Promise<SwapExecutionOutcome> {
    const protocolId = dto.protocolId ?? 'uniswap';
    const adapter = this.adapters.getSwapAdapter(protocolId);
    const amountIn = BigInt(dto.amountIn);
    const route = await adapter.getQuote({
      chainId: dto.chainId,
      tokenIn: dto.tokenIn as Address,
      tokenOut: dto.tokenOut as Address,
      amountIn,
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
    if (assessment.verdict !== RiskVerdict.PASS) {
      this.logger.warn(
        `Swap not relayed: verdict=${assessment.verdict} aggregate=${assessment.scores.aggregate}`,
      );
      return {
        verdict: assessment.verdict,
        reason: 'Risk engine did not return PASS',
      };
    }

    const relay = await this.executionHub.relayIfApproved({
      chainId: dto.chainId,
      to: route.router,
      data: route.calldata,
      value: route.value,
      riskAssessment: assessment,
    });

    return { verdict: RiskVerdict.PASS, txHash: relay.txHash };
  }
}
