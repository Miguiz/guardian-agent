import { Test } from '@nestjs/testing';
import { ForbiddenRiskException } from '../common/exceptions/forbidden-risk.exception';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { RiskVerdict } from '../risk-engine/types/risk-assessment.types';
import { ExecutionHubService } from './execution-hub.service';
import { KeeperHubClient } from './keeper-hub/keeper-hub.client';

const passAssessment = {
  verdict: RiskVerdict.PASS,
  scores: { security: 80, social: 70, telegram: 100, aggregate: 76 },
  simulation: { success: true, gasUsed: 100_000n },
  evaluatedAt: new Date().toISOString(),
} as const;

describe('ExecutionHubService', () => {
  let service: ExecutionHubService;
  const assertApproved = jest.fn();
  const relayTransaction = jest.fn();

  beforeEach(async () => {
    assertApproved.mockReset();
    relayTransaction.mockReset();
    relayTransaction.mockResolvedValue({
      txHash: '0x' + '1'.repeat(64),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExecutionHubService,
        {
          provide: RiskEngineService,
          useValue: { assertApprovedForExecution: assertApproved },
        },
        {
          provide: KeeperHubClient,
          useValue: { relayTransaction },
        },
      ],
    }).compile();

    service = moduleRef.get(ExecutionHubService);
  });

  it('does not relay when risk blocks execution', async () => {
    assertApproved.mockImplementation(() => {
      throw new ForbiddenRiskException('blocked');
    });

    await expect(
      service.relayIfApproved({
        chainId: 1,
        to: '0x0000000000000000000000000000000000000001',
        data: '0x',
        value: 0n,
        riskAssessment: {
          ...passAssessment,
          verdict: RiskVerdict.FAIL,
        },
      }),
    ).rejects.toThrow(ForbiddenRiskException);

    expect(relayTransaction).not.toHaveBeenCalled();
  });

  it('relays when assessment is approved', async () => {
    assertApproved.mockImplementation(() => undefined);

    const result = await service.relayIfApproved({
      chainId: 1,
      to: '0x0000000000000000000000000000000000000001',
      data: '0x01',
      value: 0n,
      riskAssessment: passAssessment,
    });

    expect(relayTransaction).toHaveBeenCalledTimes(1);
    expect(result.txHash.startsWith('0x')).toBe(true);
  });
});
