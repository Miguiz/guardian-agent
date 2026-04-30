import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../config/configuration';
import { RiskEngineService } from './risk-engine.service';
import { RiskEngineModule } from './risk-engine.module';
import { RiskVerdict } from './types/risk-assessment.types';

describe('RiskEngineService', () => {
  let service: RiskEngineService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        RiskEngineModule,
      ],
    }).compile();

    service = moduleRef.get(RiskEngineService);
  });

  it('returns FAIL when simulation detects revert marker in calldata', async () => {
    const assessment = await service.assess({
      chainId: 1,
      to: '0x0000000000000000000000000000000000000001',
      data: '0xdeadbeef',
      value: 0n,
    });
    expect(assessment.verdict).toBe(RiskVerdict.FAIL);
    expect(assessment.simulation.success).toBe(false);
    expect(assessment.scores.telegram).toBe(100);
  });
});
