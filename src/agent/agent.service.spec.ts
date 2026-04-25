import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../config/configuration';
import type { Hex } from '../common/types/web3.types';
import { ExecutionHubService } from '../execution-hub/execution-hub.service';
import { ProtocolAdapterRegistry } from '../protocol-adapters/registry/protocol-adapter.registry';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { RiskVerdict } from '../risk-engine/types/risk-assessment.types';
import { AgentService } from './agent.service';

describe('AgentService', () => {
  it('does not call execution hub when risk verdict is not PASS', async () => {
    const relayIfApproved = jest.fn();
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
              scores: { security: 0, social: 0, aggregate: 0 },
              simulation: { success: false },
              evaluatedAt: new Date().toISOString(),
            }),
          },
        },
        {
          provide: ExecutionHubService,
          useValue: { relayIfApproved },
        },
      ],
    }).compile();

    const agent = moduleRef.get(AgentService);
    const out = await agent.orchestrateSwap({
      chainId: 1,
      tokenIn: '0x0000000000000000000000000000000000000001',
      tokenOut: '0x0000000000000000000000000000000000000002',
      amountIn: '1000',
    });

    expect(out.verdict).toBe(RiskVerdict.FAIL);
    expect(relayIfApproved).not.toHaveBeenCalled();
  });
});
