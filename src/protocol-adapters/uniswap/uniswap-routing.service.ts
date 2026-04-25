import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  SwapAdapter,
  SwapQuoteRequest,
  SwapRouteArtifact,
} from '../interfaces/swap-adapter.interface';
import type { UniswapQuoteNormalized } from './uniswap.types';

/**
 * Uniswap routing via HTTP API (v1-style aggregator endpoints).
 * Falls back to deterministic stub calldata when API is unavailable.
 */
@Injectable()
export class UniswapRoutingService implements SwapAdapter {
  readonly protocolId = 'uniswap';

  private readonly logger = new Logger(UniswapRoutingService.name);

  constructor(private readonly configService: ConfigService) {}

  async getQuote(request: SwapQuoteRequest): Promise<SwapRouteArtifact> {
    const baseUrl = this.configService.get<string>('uniswapApiBaseUrl');
    const apiKey = this.configService.get<string | undefined>('uniswapApiKey');

    if (!baseUrl) {
      return this.stubQuote(request);
    }

    try {
      const normalized = await this.fetchQuoteFromApi(
        baseUrl,
        apiKey,
        request,
      );
      return {
        router: normalized.router,
        calldata: normalized.calldata,
        value: normalized.value,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Uniswap API fallback to stub: ${message}`);
      return this.stubQuote(request);
    }
  }

  private async fetchQuoteFromApi(
    baseUrl: string,
    apiKey: string | undefined,
    request: SwapQuoteRequest,
  ): Promise<UniswapQuoteNormalized> {
    const url = new URL('/v1/quote', baseUrl.replace(/\/$/, ''));
    url.searchParams.set('chainId', String(request.chainId));
    url.searchParams.set('tokenIn', request.tokenIn);
    url.searchParams.set('tokenOut', request.tokenOut);
    url.searchParams.set('amount', request.amountIn.toString());

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(url.toString(), { method: 'GET', headers });
    if (!res.ok) {
      throw new Error(`Uniswap API status ${res.status}`);
    }
    const body = (await res.json()) as Record<string, unknown>;
    const router = body.router as string | undefined;
    const calldata = body.calldata as string | undefined;
    const value = body.value as string | undefined;
    if (
      typeof router !== 'string' ||
      typeof calldata !== 'string' ||
      typeof value !== 'string'
    ) {
      throw new Error('Uniswap API response shape unexpected');
    }
    return {
      router: router as UniswapQuoteNormalized['router'],
      calldata: calldata as UniswapQuoteNormalized['calldata'],
      value: BigInt(value),
      chainId: request.chainId,
    };
  }

  private stubQuote(request: SwapQuoteRequest): SwapRouteArtifact {
    const router = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const;
    const selector = '0x414bf389';
    const encodedTail = request.tokenOut.slice(2).padStart(64, '0');
    const calldata = `${selector}${encodedTail}` as SwapRouteArtifact['calldata'];
    return {
      router,
      calldata,
      value: 0n,
    };
  }
}
