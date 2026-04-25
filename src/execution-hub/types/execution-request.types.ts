import type { Address, Hex } from '../../common/types/web3.types';
import type { RiskAssessment } from '../../risk-engine/types/risk-assessment.types';

export interface ExecutionRequest {
  readonly chainId: number;
  readonly to: Address;
  readonly data: Hex;
  readonly value: bigint;
  readonly riskAssessment: RiskAssessment;
}

export interface RelayResult {
  readonly txHash: Hex;
}
