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
import {
  getRpcUrl,
  getSupportedEvmChain,
  supportedChainIdsForErrorMessage,
} from '../../config/rpc-chain.config';
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
import { UniswapTradeApiClient } from './uniswap-trade-api.client';
import {
  parseUniswapErrorBody,
  parseUniswapQuoteEnvelope,
  parseUniswapSwapSuccess,
} from './uniswap-trade-api.schema';

const NATIVE = '0x0000000000000000000000000000000000000000';

const UNSUPPORTED_ROUTING = new Set([
  'DUTCH_V2',
  'DUTCH_V3',
  'PRIORITY',
]);

/**
 * Uniswap Labs **Trade API** (Gateway): POST /v1/quote puis POST /v1/swap.
 * HTTP via **axios** ; réponses validées avec **Zod**.
 * @see https://api-docs.uniswap.org/
 */
@Injectable()
export class UniswapRoutingService implements SwapAdapter {
  readonly protocolId = 'uniswap';

  private readonly logger = new Logger(UniswapRoutingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tradeApi: UniswapTradeApiClient,
  ) {}

  async getQuote(request: SwapQuoteRequest): Promise<SwapRouteArtifact> {
    if (!getSupportedEvmChain(request.chainId)) {
      throw new UnprocessableEntityException(
        `Unsupported chainId: ${request.chainId}. Supported: ${supportedChainIdsForErrorMessage()}.`,
      );
    }
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

  private stringifyUniswapBody(data: unknown, maxLen = 800): string {
    if (typeof data === 'string') {
      return data.slice(0, maxLen);
    }
    try {
      return JSON.stringify(data).slice(0, maxLen);
    } catch {
      return String(data).slice(0, maxLen);
    }
  }

  /**
   * Maps Uniswap HTTP failures: 4xx → client errors (no generic 502), 5xx → BadGateway.
   */
  private throwMappedUniswapFailure(
    status: number,
    body: unknown,
    phase: 'quote' | 'swap',
  ): never {
    const bodyText = this.stringifyUniswapBody(body);
    const parsed = parseUniswapErrorBody(
      typeof body === 'object' && body !== null ? body : {},
    );
    const errorCode = parsed.errorCode;
    const detail = parsed.detail;
    const requestId = parsed.requestId;

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
        `Uniswap ${phase} rejeté (${status}) : ${detail ?? errorCode ?? bodyText}${ref}`,
      );
    }

    throw new BadGatewayException(
      `Uniswap ${phase}: erreur serveur (${status}). ${bodyText}`,
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
    const chain = getSupportedEvmChain(chainId);
    const rpcUrl = getRpcUrl(chainId);
    if (!chain || !rpcUrl) {
      return;
    }
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

    const quoteUrl = `${base}/v1/quote`;
    const quoteResult = await this.tradeApi.postJson(quoteUrl, headers, {
      type: 'EXACT_INPUT',
      amount: request.amountIn.toString(),
      tokenInChainId: request.chainId,
      tokenOutChainId: request.chainId,
      tokenIn,
      tokenOut,
      swapper: swapperNorm,
      slippageTolerance,
    });

    if (quoteResult.status < 200 || quoteResult.status >= 300) {
      this.throwMappedUniswapFailure(quoteResult.status, quoteResult.data, 'quote');
    }

    let quoteResponse: ReturnType<typeof parseUniswapQuoteEnvelope>;
    try {
      quoteResponse = parseUniswapQuoteEnvelope(quoteResult.data);
    } catch (e: unknown) {
      const hint = this.stringifyUniswapBody(quoteResult.data);
      throw new UnprocessableEntityException(
        e instanceof Error
          ? e.message
          : `Réponse /quote inattendue (Zod): ${hint}`,
      );
    }

    if (
      typeof quoteResponse.routing === 'string' &&
      UNSUPPORTED_ROUTING.has(quoteResponse.routing)
    ) {
      throw new UnprocessableEntityException(
        `This swap is routed as "${quoteResponse.routing}" (UniswapX / order flow). This backend only supports direct AMM calldata from POST /v1/swap — try another pair, amount, or slippage.`,
      );
    }

    const swapQuotePayload = quoteResponse.quote;
    if (!swapQuotePayload || typeof swapQuotePayload !== 'object') {
      throw new UnprocessableEntityException(
        'Réponse Uniswap /quote invalide : champ « quote » (objet de route) absent — impossible d’appeler POST /v1/swap.',
      );
    }

    const swapUrl = `${base}/v1/swap`;
    const swapResult = await this.tradeApi.postJson(swapUrl, headers, {
      quote: swapQuotePayload,
      simulateTransaction: true,
      urgency: 'normal',
    });

    if (swapResult.status < 200 || swapResult.status >= 300) {
      this.throwMappedUniswapFailure(swapResult.status, swapResult.data, 'swap');
    }

    let swapParsed: ReturnType<typeof parseUniswapSwapSuccess>;
    try {
      swapParsed = parseUniswapSwapSuccess(swapResult.data);
    } catch (e: unknown) {
      const hint = this.stringifyUniswapBody(swapResult.data);
      throw new UnprocessableEntityException(
        e instanceof Error
          ? e.message
          : `Réponse /swap inattendue (Zod): ${hint}`,
      );
    }

    const { swap } = swapParsed;
    let valueBn: bigint;
    try {
      valueBn = BigInt(swap.value);
    } catch {
      throw new UnprocessableEntityException(
        `swap.value non convertible en bigint: ${swap.value}`,
      );
    }

    const quotePreview = extractQuotePreviewFromGatewayBody(
      quoteResponse as unknown as Record<string, unknown>,
      slippageTolerance,
    );

    return {
      router: getAddress(swap.to),
      calldata: swap.data as SwapRouteArtifact['calldata'],
      value: valueBn,
      quotePreview,
    };
  }

  private resolveSlippageTolerancePercent(request: SwapQuoteRequest): number {
    if (request.maxSlippagePercent !== undefined) {
      return Math.min(50, Math.max(0.01, request.maxSlippagePercent));
    }
    return 0.5;
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
