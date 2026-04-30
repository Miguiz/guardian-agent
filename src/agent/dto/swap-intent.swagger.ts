import { SwapIntentDto } from './swap-intent.dto';

/** Exemples Swagger — `swapper` obligatoire ; base URL Uniswap fixe dans le code. */
export const swapIntentApiBody = {
  type: SwapIntentDto,
  examples: {
    ethereumUsdcToWeth: {
      summary: 'Ethereum — 1 USDC → WETH',
      description:
        'USDC 6 décimales : 1 USDC = `1000000`. Le `swapper` doit avoir les USDC + approve sur mainnet.',
      value: {
        chainId: 1,
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        amountIn: '1000000',
        protocolId: 'uniswap',
        swapper: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        maxSlippagePercent: 0.5,
      },
    },
    baseMinimal: {
      summary: 'Base — champs minimaux',
      description:
        '`maxSlippagePercent` optionnel ; `swapper` obligatoire (même règle solde + approve).',
      value: {
        chainId: 8453,
        tokenIn: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        tokenOut: '0x4200000000000000000000000000000000000006',
        amountIn: '5000000',
        swapper: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      },
    },
    zeroGravityMainnet: {
      summary: '0G mainnet (16661)',
      description:
        'Vérifier routage Uniswap sur 0G ; `swapper` financé + approve requis.',
      value: {
        chainId: 16661,
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        amountIn: '1000000',
        protocolId: 'uniswap',
        swapper: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        maxSlippagePercent: 1,
      },
    },
  },
};
