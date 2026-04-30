import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../config/configuration';
import type { Hex } from '../common/types/web3.types';
import { ProtocolAdapterRegistry } from '../protocol-adapters/registry/protocol-adapter.registry';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { RiskVerdict } from '../risk-engine/types/risk-assessment.types';
import { AgentService } from './agent.service';

const mockAssessmentPass = {
  verdict: RiskVerdict.PASS,
  scores: { security: 80, social: 70, telegram: 90, aggregate: 82 },
  simulation: { success: true, gasUsed: 21000n, logs: ['ok'] as const },
  evaluatedAt: '2025-01-01T00:00:00.000Z',
};

describe('AgentService', () => {
  it('returns full risk payload when verdict is not PASS', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [
        AgentService,
        {
          provide: ProtocolAdapterRegistry,
          useValue: {
            getSwapAdapter: () => ({
              protocolId: 'uniswap',
              getQuote: async () => ({
                router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                calldata: '0xdeadbeef' as Hex,
                value: 0n,
              }),
            }),
          },
        },
        {
          provide: RiskEngineService,
          useValue: {
            assess: jest.fn().mockResolvedValue({
              verdict: RiskVerdict.FAIL,
              scores: { security: 0, social: 0, telegram: 0, aggregate: 0 },
              simulation: { success: false },
              evaluatedAt: new Date().toISOString(),
            }),
          },
        },
      ],
    }).compile();

    const agent = moduleRef.get(AgentService);
    const out = await agent.assessSwapRisk({
      chainId: 1,
      tokenIn: '0x0000000000000000000000000000000000000001',
      tokenOut: '0x0000000000000000000000000000000000000002',
      amountIn: '1000',
    });

    expect(out.verdict).toBe(RiskVerdict.FAIL);
    expect(out.scores.aggregate).toBe(0);
    expect(out.simulation.success).toBe(false);
    expect(out.evaluatedAt).toBeDefined();
    expect(out.tradeRiskHints.level).toBe('high');
    expect(out.tradeRiskHints.reasons.length).toBeGreaterThan(0);
    expect(out.quotePreview).toBeUndefined();
  });

  it('returns full risk payload with string gasUsed when verdict is PASS', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [
        AgentService,
        {
          provide: ProtocolAdapterRegistry,
          useValue: {
            getSwapAdapter: () => ({
              protocolId: 'uniswap',
              getQuote: async () => ({
                router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                calldata: '0xcafe' as Hex,
                value: 0n,
                quotePreview: {
                  source: 'live' as const,
                  priceImpactPercent: 0.1,
                  slippageTolerancePercent: 0.5,
                  expectedAmountOut: '1000000',
                  minAmountOut: '995000',
                  slippageMaxOutputLoss: '5000',
                },
              }),
            }),
          },
        },
        {
          provide: RiskEngineService,
          useValue: {
            assess: jest.fn().mockResolvedValue(mockAssessmentPass),
          },
        },
      ],
    }).compile();

    const agent = moduleRef.get(AgentService);
    const out = await agent.assessSwapRisk({
      chainId: 1,
      tokenIn: '0x0000000000000000000000000000000000000001',
      tokenOut: '0x0000000000000000000000000000000000000002',
      amountIn: '1000',
    });

    expect(out.verdict).toBe(RiskVerdict.PASS);
    expect(out.simulation.gasUsed).toBe('21000');
    expect(out.simulation.logs).toEqual(['ok']);
    expect(out.quotePreview?.source).toBe('live');
    expect(out.quotePreview?.slippageMaxOutputLoss).toBe('5000');
    expect(out.tradeRiskHints.level).toBe('low');
  });
});
