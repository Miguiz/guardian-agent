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
    /** `from` address passed to viem `eth_call` / `estimateGas` (must be valid 0x + 40 hex). */
    simulationFromAddress: string;
}

export function configuration(): AppConfiguration {
    const port = parseInt(process.env.PORT ?? '3000', 10);
    const riskMinAggregateScore = parseInt(process.env.RISK_MIN_AGGREGATE_SCORE ?? '60', 10);

    return {
        nodeEnv: process.env.NODE_ENV ?? 'development',
        port: Number.isFinite(port) ? port : 3000,
        riskMinAggregateScore: Number.isFinite(riskMinAggregateScore) ? riskMinAggregateScore : 60,
        uniswapApiBaseUrl: process.env.UNISWAP_API_BASE_URL ?? 'https://trade-api.gateway.uniswap.org',
        uniswapApiKey: process.env.UNISWAP_API_KEY,
        uniswapSwapperAddress: process.env.UNISWAP_SWAPPER_ADDRESS,
        uniswapAllowStubFallback: ['true', '1', 'yes'].includes(
            (process.env.UNISWAP_ALLOW_STUB_FALLBACK ?? '').toLowerCase(),
        ),
        simulationFromAddress: process.env.SIMULATION_FROM_ADDRESS ?? '0x0000000000000000000000000000000000000001',
    };
}
