export interface AppConfiguration {
  nodeEnv: string;
  port: number;
  riskMinAggregateScore: number;
  uniswapApiBaseUrl: string;
  uniswapApiKey: string | undefined;
  /** Default `swapper` for Uniswap Trade API when the HTTP body omits `swapper`. */
  uniswapSwapperAddress: string | undefined;
  /** When true and no API key, use legacy stub calldata (unsafe). */
  uniswapAllowStubFallback: boolean;
  rpcUrlByChainId: Readonly<Record<number, string>>;
  keeperHubRelayEndpoint: string | undefined;
  /** `from` address passed to viem `eth_call` / `estimateGas` (must be valid 0x + 40 hex). */
  simulationFromAddress: string;
  telegramBotToken: string | undefined;
  /** If > 0 and `telegramBotToken` is set, polls Telegram `getUpdates` on this interval (ms). */
  telegramPollIntervalMs: number;
  /** If non-empty, only `channel_post` from these chat ids are ingested. */
  telegramAlertChatIds: ReadonlySet<number>;
  /** Comma-separated 0x addresses always treated as flagged (demo / manual mirror of channels). */
  telegramRiskStaticAddresses: readonly string[];
}

export function configuration(): AppConfiguration {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const riskMinAggregateScore = parseInt(
    process.env.RISK_MIN_AGGREGATE_SCORE ?? '60',
    10,
  );

  const rpcUrlByChainId: Record<number, string> = {};
  const ethRpc = process.env.RPC_URL_ETHEREUM;
  if (ethRpc) {
    rpcUrlByChainId[1] = ethRpc;
  }
  const baseRpc = process.env.RPC_URL_BASE;
  if (baseRpc) {
    rpcUrlByChainId[8453] = baseRpc;
  }
  const arbRpc = process.env.RPC_URL_ARBITRUM;
  if (arbRpc) {
    rpcUrlByChainId[42161] = arbRpc;
  }
  const polRpc = process.env.RPC_URL_POLYGON;
  if (polRpc) {
    rpcUrlByChainId[137] = polRpc;
  }

  const telegramIdsRaw = process.env.TELEGRAM_ALERT_CHAT_IDS ?? '';
  const telegramAlertChatIds = new Set<number>();
  for (const part of telegramIdsRaw.split(',')) {
    const n = parseInt(part.trim(), 10);
    if (Number.isFinite(n)) {
      telegramAlertChatIds.add(n);
    }
  }

  const staticAddrRaw = process.env.TELEGRAM_RISK_ADDRESSES ?? '';
  const telegramRiskStaticAddresses = staticAddrRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const telegramPollIntervalMs = parseInt(
    process.env.TELEGRAM_POLL_INTERVAL_MS ?? '0',
    10,
  );

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number.isFinite(port) ? port : 3000,
    riskMinAggregateScore: Number.isFinite(riskMinAggregateScore)
      ? riskMinAggregateScore
      : 60,
    uniswapApiBaseUrl:
      process.env.UNISWAP_API_BASE_URL ??
      'https://trade-api.gateway.uniswap.org',
    uniswapApiKey: process.env.UNISWAP_API_KEY,
    uniswapSwapperAddress: process.env.UNISWAP_SWAPPER_ADDRESS,
    uniswapAllowStubFallback: ['true', '1', 'yes'].includes(
      (process.env.UNISWAP_ALLOW_STUB_FALLBACK ?? '').toLowerCase(),
    ),
    rpcUrlByChainId,
    keeperHubRelayEndpoint: process.env.KEEPERHUB_RELAY_ENDPOINT,
    simulationFromAddress:
      process.env.SIMULATION_FROM_ADDRESS ??
      '0x0000000000000000000000000000000000000001',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramPollIntervalMs: Number.isFinite(telegramPollIntervalMs)
      ? telegramPollIntervalMs
      : 0,
    telegramAlertChatIds,
    telegramRiskStaticAddresses,
  };
}
