import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, getAddress, http, isAddress } from 'viem';
import { resolveViemChain } from '../../common/viem-chain';
import { formatUnknownError } from '../../common/format-unknown-error';
import type { Address } from '../../common/types/web3.types';
import type {
  SwapAdapter,
  SwapQuoteRequest,
  SwapRouteArtifact,
} from '../interfaces/swap-adapter.interface';
import {
  extractQuotePreviewFromGatewayBody,
  stubQuotePreview,
} from './uniswap-quote-preview';

const NATIVE = '0x0000000000000000000000000000000000000000';

const UNSUPPORTED_ROUTING = new Set([
  'DUTCH_V2',
  'DUTCH_V3',
  'PRIORITY',
]);

interface ParsedUniswapErr {
  readonly errorCode?: string;
  readonly detail?: string;
  readonly requestId?: string;
}

function parseUniswapErrorJson(bodyText: string): ParsedUniswapErr {
  try {
    const j = JSON.parse(bodyText) as Record<string, unknown>;
    return {
      errorCode: typeof j.errorCode === 'string' ? j.errorCode : undefined,
      detail: typeof j.detail === 'string' ? j.detail : undefined,
      requestId: typeof j.requestId === 'string' ? j.requestId : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Uniswap Labs **Trade API** (Gateway): POST /v1/quote then POST /v1/swap.
 * @see https://api-docs.uniswap.org/
 *
 * Legacy GET on `api.uniswap.org` returns 409 — do not use.
 * Optional stub only when `UNISWAP_ALLOW_STUB_FALLBACK=true` (local demos).
 */
@Injectable()
export class UniswapRoutingService implements SwapAdapter {
  readonly protocolId = 'uniswap';

  private readonly logger = new Logger(UniswapRoutingService.name);

  constructor(private readonly configService: ConfigService) {}

  async getQuote(request: SwapQuoteRequest): Promise<SwapRouteArtifact> {
    const tokenIn = this.normalizeAddress(request.tokenIn);
    const tokenOut = this.normalizeAddress(request.tokenOut);
    await this.assertTokenContractsIfRpc(request.chainId, tokenIn, tokenOut);

    const apiKey = this.configService.get<string | undefined>('uniswapApiKey');
    const allowStub = this.configService.get<boolean>(
      'uniswapAllowStubFallback',
    );

    if (apiKey?.trim()) {
      return await this.fetchLiveQuoteOrBadGateway(
        request,
        tokenIn,
        tokenOut,
        apiKey.trim(),
      );
    }

    if (allowStub) {
      this.logger.warn(
        'UNISWAP_ALLOW_STUB_FALLBACK is enabled — using stub calldata (not a real quote).',
      );
      return this.stubQuote({ ...request, tokenIn, tokenOut });
    }

    throw new UnprocessableEntityException(
      'UNISWAP_API_KEY is required for live Uniswap quotes (header x-api-key). ' +
        'Optional: UNISWAP_ALLOW_STUB_FALLBACK=true for unsafe local stub only.',
    );
  }

  private async fetchLiveQuoteOrBadGateway(
    request: SwapQuoteRequest,
    tokenIn: Address,
    tokenOut: Address,
    apiKey: string,
  ): Promise<SwapRouteArtifact> {
    try {
      return await this.fetchGatewayQuoteAndSwap(
        request,
        tokenIn,
        tokenOut,
        apiKey,
      );
    } catch (e: unknown) {
      if (
        e instanceof UnprocessableEntityException ||
        e instanceof UnauthorizedException ||
        e instanceof HttpException ||
        e instanceof BadGatewayException
      ) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : formatUnknownError(e);
      throw new BadGatewayException(`Uniswap Labs API error: ${msg}`);
    }
  }

  /**
   * Maps Uniswap HTTP failures: 4xx → client errors (no generic 502), 5xx → BadGateway.
   */
  private throwMappedUniswapFailure(
    status: number,
    bodyText: string,
    phase: 'quote' | 'swap',
  ): never {
    const { errorCode, detail, requestId } = parseUniswapErrorJson(bodyText);

    const ref =
      requestId !== undefined ? ` (requestId=${requestId})` : '';

    if (status === HttpStatus.UNAUTHORIZED) {
      throw new UnauthorizedException(
        `Uniswap ${phase}: clé API refusée ou manquante. Vérifie UNISWAP_API_KEY (header x-api-key).${ref}`,
      );
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      throw new HttpException(
        `Uniswap ${phase}: rate limit (429). Réessaie plus tard.${ref}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (
      status === HttpStatus.NOT_FOUND &&
      (errorCode === 'ResourceNotFound' ||
        detail?.toLowerCase().includes('no quotes'))
    ) {
      throw new UnprocessableEntityException(
        `Uniswap : aucun quote pour ce swap (« ${detail ?? errorCode} »).${ref} ` +
          'Causes fréquentes : montant trop bas (minimums sur mainnet), paire non routée, `swapper` incompatible, ou tokens non listés pour cette chaîne. Essaie un montant plus élevé ou une autre paire.',
      );
    }

    if (status >= 400 && status < 500) {
      throw new UnprocessableEntityException(
        `Uniswap ${phase} rejeté (${status}) : ${detail ?? errorCode ?? bodyText.slice(0, 400)}${ref}`,
      );
    }

    throw new BadGatewayException(
      `Uniswap ${phase}: erreur serveur (${status}). ${bodyText.slice(0, 600)}`,
    );
  }

  private normalizeAddress(value: string): Address {
    try {
      return getAddress(value);
    } catch {
      throw new UnprocessableEntityException(
        `Invalid or incorrectly checksummed token address: ${value}`,
      );
    }
  }

  private async assertTokenContractsIfRpc(
    chainId: number,
    tokenIn: Address,
    tokenOut: Address,
  ): Promise<void> {
    const rpcMap = this.configService.get<Readonly<Record<number, string>>>(
      'rpcUrlByChainId',
    );
    const rpcUrl = rpcMap?.[chainId];
    if (!rpcUrl) {
      return;
    }
    const chain = resolveViemChain(chainId, rpcUrl);
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
    for (const token of [tokenIn, tokenOut]) {
      if (token.toLowerCase() === NATIVE) {
        continue;
      }
      const code = await client.getCode({ address: token });
      if (!code || code === '0x') {
        throw new UnprocessableEntityException(
          `No contract code at token address ${token} on chain ${chainId}. Check the address or chain.`,
        );
      }
    }
  }

  private async fetchGatewayQuoteAndSwap(
    request: SwapQuoteRequest,
    tokenIn: Address,
    tokenOut: Address,
    apiKey: string,
  ): Promise<SwapRouteArtifact> {
    const baseUrl =
      this.configService.get<string>('uniswapApiBaseUrl') ??
      'https://trade-api.gateway.uniswap.org';
    const base = baseUrl.replace(/\/$/, '');
    const swapper = this.resolveSwapper(request);
    if (!isAddress(swapper)) {
      throw new UnprocessableEntityException(
        'Invalid swapper address. Set `swapper` on the request or UNISWAP_SWAPPER_ADDRESS.',
      );
    }
    const swapperNorm = getAddress(swapper);

    const slippageTolerance = this.resolveSlippageTolerancePercent(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': apiKey,
      'x-universal-router-version': '2.0',
      'x-permit2-disabled': 'true',
    };

    const quoteRes = await fetch(`${base}/v1/quote`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'EXACT_INPUT',
        amount: request.amountIn.toString(),
        tokenInChainId: request.chainId,
        tokenOutChainId: request.chainId,
        tokenIn,
        tokenOut,
        swapper: swapperNorm,
        slippageTolerance,
      }),
    });

    const quoteText = await quoteRes.text();
    if (!quoteRes.ok) {
      this.throwMappedUniswapFailure(quoteRes.status, quoteText, 'quote');
    }

    let quote: Record<string, unknown>;
    try {
      quote = JSON.parse(quoteText) as Record<string, unknown>;
    } catch {
      throw new TypeError('quote response is not valid JSON');
    }

    const routing = quote['routing'];
    if (typeof routing === 'string' && UNSUPPORTED_ROUTING.has(routing)) {
      throw new UnprocessableEntityException(
        `This swap is routed as "${routing}" (UniswapX / order flow). This backend only supports direct AMM calldata from POST /v1/swap — try another pair, amount, or slippage.`,
      );
    }

    const swapRes = await fetch(`${base}/v1/swap`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        quote,
        simulate: true,
        urgency: 'normal',
      }),
    });

    const swapText = await swapRes.text();
    if (!swapRes.ok) {
      this.throwMappedUniswapFailure(swapRes.status, swapText, 'swap');
    }

    let swapBody: Record<string, unknown>;
    try {
      swapBody = JSON.parse(swapText) as Record<string, unknown>;
    } catch {
      throw new TypeError('swap response is not valid JSON');
    }

    const swap = swapBody['swap'] as Record<string, unknown> | undefined;
    if (!swap || typeof swap !== 'object') {
      throw new TypeError(
        `swap response missing "swap" object: ${swapText.slice(0, 400)}`,
      );
    }

    const to = swap['to'];
    const data = swap['data'];
    const value = swap['value'];
    if (typeof to !== 'string' || typeof data !== 'string') {
      throw new TypeError('swap.swap missing to or data');
    }
    if (typeof value !== 'string') {
      throw new TypeError('swap.swap missing value');
    }

    const quotePreview = extractQuotePreviewFromGatewayBody(
      quote,
      slippageTolerance,
    );

    return {
      router: getAddress(to),
      calldata: data as SwapRouteArtifact['calldata'],
      value: BigInt(value),
      quotePreview,
    };
  }

  private resolveSlippageTolerancePercent(request: SwapQuoteRequest): number {
    return request.slippageBps !== undefined
      ? Math.min(50, Math.max(0.01, request.slippageBps / 100))
      : 0.5;
  }

  private resolveSwapper(request: SwapQuoteRequest): string {
    if (request.swapper) {
      return request.swapper;
    }
    const fromEnv = this.configService.get<string | undefined>(
      'uniswapSwapperAddress',
    );
    if (fromEnv?.trim()) {
      return fromEnv.trim();
    }
    return (
      this.configService.get<string>('simulationFromAddress') ??
      '0x0000000000000000000000000000000000000001'
    );
  }

  private stubQuote(request: SwapQuoteRequest): SwapRouteArtifact {
    const router = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const;
    const selector = '0x414bf389';
    const encodedTail = request.tokenOut.slice(2).padStart(64, '0');
    const calldata =
      `${selector}${encodedTail}` as SwapRouteArtifact['calldata'];
    const slippageTolerance = this.resolveSlippageTolerancePercent(request);
    return {
      router,
      calldata,
      value: 0n,
      quotePreview: stubQuotePreview(slippageTolerance),
    };
  }
}
