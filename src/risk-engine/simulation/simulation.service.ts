import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExecutionIntent } from '../types/risk-assessment.types';
import type { SimulationResult } from './simulation.types';

/**
 * Transaction simulation layer (RPC / Tenderly placeholder).
 * Replace internals with Viem `simulateContract` or Tenderly HTTP API.
 */
@Injectable()
export class SimulationService {
  constructor(private readonly configService: ConfigService) {}

  async simulate(intent: ExecutionIntent): Promise<SimulationResult> {
    const rpcMap = this.configService.get<Readonly<Record<number, string>>>(
      'rpcUrlByChainId',
    );
    const rpcUrl = rpcMap?.[intent.chainId];

    if (intent.data.toLowerCase().includes('deadbeef')) {
      return {
        success: false,
        logs: ['simulation: intentional test revert marker'],
      };
    }

    if (!rpcUrl) {
      return {
        success: true,
        gasUsed: 150_000n,
        logs: ['simulation: stub (no RPC configured for chain)'],
      };
    }

    return {
      success: true,
      gasUsed: 180_000n,
      logs: ['simulation: stub (RPC present, full simulation not wired)'],
    };
  }
}
