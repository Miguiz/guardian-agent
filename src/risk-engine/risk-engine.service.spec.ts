import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ForbiddenRiskException } from '../common/exceptions/forbidden-risk.exception';
import { configuration } from '../config/configuration';
import { RiskEngineService } from './risk-engine.service';
import { RiskEngineModule } from './risk-engine.module';
import { RiskVerdict } from './types/risk-assessment.types';

function testConfiguration(): ReturnType<typeof configuration> {
  return {
    ...configuration(),
    telegramBotToken: undefined,
    telegramPollIntervalMs: 0,
  };
}

describe('RiskEngineService', () => {
  let service: RiskEngineService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [testConfiguration],
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
  });

  it('fails when target is on static Telegram risk list', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): ReturnType<typeof configuration> => ({
              ...testConfiguration(),
              telegramRiskStaticAddresses: [
                '0x2222222222222222222222222222222222222222',
              ],
            }),
          ],
        }),
        RiskEngineModule,
      ],
    }).compile();

    const flaggedEngine = moduleRef.get(RiskEngineService);
    const assessment = await flaggedEngine.assess({
      chainId: 1,
      to: '0x2222222222222222222222222222222222222222',
      data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      value: 0n,
    });
    expect(assessment.scores.telegram).toBe(0);
    expect(assessment.verdict).toBe(RiskVerdict.FAIL);
  });

  it('assertApprovedForExecution throws on non-PASS verdict', () => {
    expect(() =>
      service.assertApprovedForExecution({
        verdict: RiskVerdict.REVIEW,
        scores: { security: 50, social: 50, telegram: 50, aggregate: 50 },
        simulation: { success: true },
        evaluatedAt: new Date().toISOString(),
      }),
    ).toThrow(ForbiddenRiskException);
  });
});
