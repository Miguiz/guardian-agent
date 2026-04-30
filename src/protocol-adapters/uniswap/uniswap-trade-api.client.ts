import { BadGatewayException, Injectable } from '@nestjs/common';
import axios, { type AxiosInstance, isAxiosError } from 'axios';
import { formatUnknownError } from '../../common/format-unknown-error';

export interface UniswapJsonPostResult {
  readonly status: number;
  readonly data: unknown;
}

/**
 * Client HTTP minimal pour Uniswap Trade API (timeouts, pas de throw sur 4xx).
 */
@Injectable()
export class UniswapTradeApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      timeout: 45_000,
      validateStatus: () => true,
      headers: { Accept: 'application/json' },
    });
  }

  async postJson(
    url: string,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<UniswapJsonPostResult> {
    try {
      const res = await this.http.post(url, body, { headers });
      return { status: res.status, data: res.data };
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        throw new BadGatewayException(
          `Uniswap réseau (${url}): ${e.message}`,
        );
      }
      throw new BadGatewayException(
        `Uniswap réseau: ${formatUnknownError(e)}`,
      );
    }
  }
}
