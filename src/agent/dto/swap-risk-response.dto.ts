import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskVerdict } from '../../risk-engine/types/risk-assessment.types';

export class RiskScoreResponseDto {
  @ApiProperty({ example: 70 })
  security!: number;

  @ApiProperty({ example: 50 })
  social!: number;

  @ApiProperty({ example: 80, description: '0–100 (Telegram / blocklist)' })
  telegram!: number;

  @ApiProperty({ example: 68.5 })
  aggregate!: number;
}

export class SimulationResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Gas estimé (bigint sérialisé en décimal string)',
    example: '150000',
  })
  gasUsed?: string;

  @ApiPropertyOptional({ type: [String] })
  logs?: string[];
}

export class SwapRiskResponseDto {
  @ApiProperty({ enum: RiskVerdict })
  verdict!: RiskVerdict;

  @ApiProperty({ type: RiskScoreResponseDto })
  scores!: RiskScoreResponseDto;

  @ApiProperty({ type: SimulationResponseDto })
  simulation!: SimulationResponseDto;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  evaluatedAt!: string;
}
