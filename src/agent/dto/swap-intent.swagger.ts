import { SwapIntentDto } from './swap-intent.dto';

/** Exemples affichés dans Swagger (évite les int/string génériques générés). */
export const swapIntentApiBody = {
  type: SwapIntentDto,
  examples: {
    ethereumUsdcToWeth: {
      summary: 'Ethereum — 1 USDC → WETH',
      description:
        'USDC 6 décimales : 1 USDC = `1000000`. Uniswap Trade API doit supporter la paire.',
      value: {
        chainId: 1,
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        amountIn: '1000000',
        protocolId: 'uniswap',
        swapper: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        maxSlippagePercent: 0.5,
      },
    },
    zeroGravityMainnet: {
      summary: '0G mainnet (chainId 16661)',
      description:
        'Remplacer les jetons par ceux réellement routés sur 0G par Uniswap (l’API ne couvre pas toutes les chaînes).',
      value: {
        chainId: 16661,
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        amountIn: '1000000',
        protocolId: 'uniswap',
        maxSlippagePercent: 1,
      },
    },
    baseMinimal: {
      summary: 'Base — champs minimaux',
      description:
        '`swapper` et `maxSlippagePercent` optionnels (valeurs par défaut côté serveur / Uniswap).',
      value: {
        chainId: 8453,
        tokenIn: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        tokenOut: '0x4200000000000000000000000000000000000006',
        amountIn: '5000000',
      },
    },
  },
};
