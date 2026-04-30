import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEthereumAddress,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class SwapIntentDto {
  @ApiProperty({ example: 1, description: 'Identifiant de chaîne EVM' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chainId!: number;

  @ApiProperty({ example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' })
  @IsEthereumAddress()
  tokenIn!: string;

  @ApiProperty({ example: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' })
  @IsEthereumAddress()
  tokenOut!: string;

  @ApiProperty({
    description: 'Montant entrant en plus petite unité (string décimale, pas de notation scientifique)',
    example: '1000000',
  })
  @IsString()
  @Matches(/^\d+$/)
  amountIn!: string;

  @ApiPropertyOptional({ enum: ['uniswap'], default: 'uniswap' })
  @IsOptional()
  @IsIn(['uniswap'])
  protocolId?: 'uniswap';

  @ApiPropertyOptional({
    description: 'Indice 0–100 pour l’évaluateur social (placeholder)',
    example: 55,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  socialHypeIndex?: number;

  @ApiPropertyOptional({
    description:
      'Adresse du wallet Uniswap `swapper` (sinon UNISWAP_SWAPPER_ADDRESS / SIMULATION_FROM_ADDRESS)',
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  })
  @IsOptional()
  @IsEthereumAddress()
  swapper?: string;

  @ApiPropertyOptional({
    description:
      'Tolérance de slippage pour Uniswap : valeur / 100 = pourcentage (ex. 50 → 0,5 %, 300 → 3 %). Max 5000 (50 %).',
    example: 50,
    minimum: 1,
    maximum: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  slippageBps?: number;
}
