import type { Address, Hex } from '../../common/types/web3.types';
import type { SimulationResult } from '../simulation/simulation.types';

export enum RiskVerdict {
  PASS = 'PASS',
  FAIL = 'FAIL',
  REVIEW = 'REVIEW',
}

export interface RiskScore {
  readonly security: number;
  readonly social: number;
  /** 0–100 from Telegram channel / static blocklist signals. */
  readonly telegram: number;
  readonly aggregate: number;
}

export interface RiskAssessment {
  readonly verdict: RiskVerdict;
  readonly scores: RiskScore;
  readonly simulation: SimulationResult;
  readonly evaluatedAt: string;
}

/** Intent submitted to the risk engine before any on-chain relay. */
export interface ExecutionIntent {
  readonly chainId: number;
  readonly to: Address;
  readonly data: Hex;
  readonly value: bigint;
  readonly context?: Readonly<Record<string, unknown>>;
}
