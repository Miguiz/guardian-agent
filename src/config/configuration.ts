export interface AppConfiguration {
  nodeEnv: string;
  port: number;
  riskMinAggregateScore: number;
  /** Clé Uniswap Labs (obligatoire — le service ne démarre pas sans). */
  uniswapApiKey: string;
}

export function configuration(): AppConfiguration {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const riskMinAggregateScore = parseInt(
    process.env.RISK_MIN_AGGREGATE_SCORE ?? '60',
    10,
  );

  const uniswapApiKey = process.env.UNISWAP_API_KEY?.trim();
  if (!uniswapApiKey) {
    throw new Error(
      'UNISWAP_API_KEY is required (Uniswap Labs Trade API). Set it in the environment — see .env.example.',
    );
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number.isFinite(port) ? port : 3000,
    riskMinAggregateScore: Number.isFinite(riskMinAggregateScore)
      ? riskMinAggregateScore
      : 60,
    uniswapApiKey,
  };
}
