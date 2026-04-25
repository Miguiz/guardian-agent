import { Injectable } from '@nestjs/common';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import type {
  ExecutionRequest,
  RelayResult,
} from './types/execution-request.types';
import { KeeperHubClient } from './keeper-hub/keeper-hub.client';

@Injectable()
export class ExecutionHubService {
  constructor(
    private readonly riskEngine: RiskEngineService,
    private readonly keeperHub: KeeperHubClient,
  ) {}

  /**
   * Relays via KeeperHub only after RiskEngine approval (defense in depth).
   */
  async relayIfApproved(request: ExecutionRequest): Promise<RelayResult> {
    this.riskEngine.assertApprovedForExecution(request.riskAssessment);
    return this.keeperHub.relayTransaction({
      chainId: request.chainId,
      to: request.to,
      data: request.data,
      value: request.value.toString(),
    });
  }
}
