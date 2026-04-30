import { createZodDto } from 'nestjs-zod';
import BigNumber from 'bignumber.js';
import { z } from 'zod';
import { isAddress } from 'viem';

const ethereumAddress = z
  .string()
  .describe(
    'Contrat ERC-20 ou équivalent (0x + 40 hex). Ex. USDC Ethereum `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`.',
  )
  .refine((a) => isAddress(a), { message: 'Adresse Ethereum invalide' });

const amountInString = z
  .string()
  .describe(
    'Montant entrant en plus petite unité du token (entier décimal). Ex. 1 USDC (6 déc.) → `1000000`.',
  )
  .regex(/^\d+$/, 'Montant: uniquement des chiffres')
  .refine((s) => {
    try {
      const bn = new BigNumber(s);
      return bn.isFinite() && !bn.isNegative();
    } catch {
      return false;
    }
  }, { message: 'Montant invalide' });

export const swapIntentSchema = z.object({
  chainId: z
    .number()
    .int()
    .min(1)
    .max(2_147_483_647)
    .describe(
      'EVM chainId parmi ceux supportés par l’API (voir README / Swagger). Sinon **422** `Unsupported chainId`.',
    ),
  tokenIn: ethereumAddress,
  tokenOut: ethereumAddress,
  amountIn: amountInString,
  protocolId: z.literal('uniswap').optional().describe('Protocole de routage'),
  swapper: ethereumAddress.describe(
    'Wallet Uniswap (`swapper` Trade API). Doit détenir `amountIn` de `tokenIn` et approuver le routeur sur la chaîne, sinon TRANSFER_FROM_FAILED.',
  ),
  maxSlippagePercent: z
    .number()
    .min(0.01)
    .max(50)
    .optional()
    .describe(
      'Slippage max en pourcentage (ex. 0.5 pour 0,5 %). Défaut 0,5 % côté Uniswap.',
    ),
});

export class SwapIntentDto extends createZodDto(swapIntentSchema) {}
