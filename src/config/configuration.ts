export interface AppConfiguration {
  nodeEnv: string;
  port: number;
  riskMinAggregateScore: number;
  uniswapApiBaseUrl: string;
  uniswapApiKey: string | undefined;
  rpcUrlByChainId: Readonly<Record<number, string>>;
  keeperHubRelayEndpoint: string | undefined;
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

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number.isFinite(port) ? port : 3000,
    riskMinAggregateScore: Number.isFinite(riskMinAggregateScore)
      ? riskMinAggregateScore
      : 60,
    uniswapApiBaseUrl:
      process.env.UNISWAP_API_BASE_URL ?? 'https://api.uniswap.org',
    uniswapApiKey: process.env.UNISWAP_API_KEY,
    rpcUrlByChainId,
    keeperHubRelayEndpoint: process.env.KEEPERHUB_RELAY_ENDPOINT,
  };
}
