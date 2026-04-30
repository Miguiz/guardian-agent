import { Injectable, Logger } from '@nestjs/common';
import { formatUnknownError } from '../../common/format-unknown-error';
import { createPublicClient, getAddress, http } from 'viem';
import type { ExecutionIntent } from '../types/risk-assessment.types';
import type { SimulationResult } from './simulation.types';
import {
  getRpcUrl,
  getSupportedEvmChain,
} from '../../config/rpc-chain.config';

/** Compte `from` pour `eth_call` / `estimateGas` (lecture seule, pas de config env). */
const SIMULATION_FROM = '0x0000000000000000000000000000000000000001' as const;

/**
 * On-chain simulation via viem `eth_call` pour une chaîne supportée ; sinon stub léger.
 */
@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  async simulate(intent: ExecutionIntent): Promise<SimulationResult> {
    if (intent.data.toLowerCase().includes('deadbeef')) {
      return {
        success: false,
        logs: ['simulation: intentional test revert marker'],
      };
    }

    const chain = getSupportedEvmChain(intent.chainId);
    const rpcUrl = getRpcUrl(intent.chainId);
    if (!chain || !rpcUrl) {
      return {
        success: true,
        gasUsed: 150_000n,
        logs: ['simulation: stub (unsupported chain)'],
      };
    }

    const sender = getAddress(SIMULATION_FROM);

    try {
      const client = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });

      const to = getAddress(intent.to);
      await client.call({
        account: sender,
        to,
        data: intent.data,
        value: intent.value,
      });

      let gasUsed: bigint | undefined;
      try {
        gasUsed = await client.estimateGas({
          account: sender,
          to,
          data: intent.data,
          value: intent.value,
        });
      } catch {
        gasUsed = undefined;
      }

      return {
        success: true,
        gasUsed,
        logs: ['simulation: viem eth_call succeeded'],
      };
    } catch (e: unknown) {
      const msg = formatUnknownError(e);
      this.logger.debug(`viem simulation revert: ${msg}`);
      return {
        success: false,
        logs: [`simulation: viem eth_call reverted — ${msg.slice(0, 500)}`],
      };
    }
  }
}
