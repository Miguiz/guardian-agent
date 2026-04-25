import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskVerdict } from '../../risk-engine/types/risk-assessment.types';

export class SwapExecutionResponseDto {
  @ApiProperty({ enum: RiskVerdict, description: 'Verdict du RiskEngine' })
  verdict!: RiskVerdict;

  @ApiPropertyOptional({
    description: 'Hash de transaction renvoyé par KeeperHub lorsque verdict = PASS',
    example: '0x' + 'a'.repeat(64),
  })
  txHash?: string;

  @ApiPropertyOptional({
    description: 'Précision lorsque le relay n’a pas lieu',
  })
  reason?: string;
}
