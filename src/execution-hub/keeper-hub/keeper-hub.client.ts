import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Hex } from '../../common/types/web3.types';

export interface KeeperRelayPayload {
  readonly chainId: number;
  readonly to: string;
  readonly data: Hex;
  readonly value: string;
}

/**
 * KeeperHub relay client (EIP-712 / sponsored tx — wire real SDK here).
 * Uses HTTP POST when KEEPERHUB_RELAY_ENDPOINT is set; otherwise deterministic stub hash.
 */
@Injectable()
export class KeeperHubClient {
  private readonly logger = new Logger(KeeperHubClient.name);

  constructor(private readonly configService: ConfigService) {}

  async relayTransaction(payload: KeeperRelayPayload): Promise<{ txHash: Hex }> {
    const endpoint = this.configService.get<string | undefined>(
      'keeperHubRelayEndpoint',
    );
    if (!endpoint) {
      const stub = this.stubTxHash(payload);
      this.logger.debug(`KeeperHub stub relay chainId=${payload.chainId}`);
      return { txHash: stub };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId: payload.chainId,
        to: payload.to,
        data: payload.data,
        value: payload.value,
      }),
    });
    if (!res.ok) {
      throw new Error(`KeeperHub relay failed: ${res.status}`);
    }
    const body = (await res.json()) as Record<string, unknown>;
    const txHash = body.txHash ?? body.hash;
    if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
      throw new Error('KeeperHub response missing txHash');
    }
    return { txHash: txHash as Hex };
  }

  private stubTxHash(payload: KeeperRelayPayload): Hex {
    const material = `${payload.chainId}:${payload.to}:${payload.data}:${payload.value}`;
    let h = 0;
    for (let i = 0; i < material.length; i += 1) {
      h = (Math.imul(31, h) + material.charCodeAt(i)) | 0;
    }
    const hex = (h >>> 0).toString(16).padStart(8, '0');
    return `0x${'0'.repeat(56)}${hex}` as Hex;
  }
}
