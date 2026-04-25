import { Type } from 'class-transformer';
import {
  IsEthereumAddress,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class SwapIntentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chainId!: number;

  @IsEthereumAddress()
  tokenIn!: string;

  @IsEthereumAddress()
  tokenOut!: string;

  /** Wei / smallest unit as decimal string (avoids JSON bigint issues). */
  @IsString()
  @Matches(/^\d+$/)
  amountIn!: string;

  @IsOptional()
  @IsIn(['uniswap'])
  protocolId?: 'uniswap';

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  socialHypeIndex?: number;
}
