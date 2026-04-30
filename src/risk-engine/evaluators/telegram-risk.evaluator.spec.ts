import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../../config/configuration';
import { TelegramRiskFeedService } from '../feeds/telegram-risk-feed.service';
import { TelegramRiskEvaluator } from './telegram-risk.evaluator';

function testConfiguration(): ReturnType<typeof configuration> {
  return {
    ...configuration(),
    telegramBotToken: undefined,
    telegramPollIntervalMs: 5_000,
  };
}

describe('TelegramRiskEvaluator', () => {
  it('returns 0 when intent.to is flagged', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [testConfiguration],
        }),
      ],
      providers: [TelegramRiskFeedService, TelegramRiskEvaluator],
    }).compile();

    const feed = moduleRef.get(TelegramRiskFeedService);
    jest.spyOn(feed, 'getFlaggedAddresses').mockReturnValue(
      new Set(['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb']),
    );

    const evaluator = moduleRef.get(TelegramRiskEvaluator);
    expect(
      evaluator.score({
        chainId: 1,
        to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        data: '0x',
        value: 0n,
      }),
    ).toBe(0);
    expect(
      evaluator.score({
        chainId: 1,
        to: '0xcccccccccccccccccccccccccccccccccccccccc',
        data: '0x',
        value: 0n,
      }),
    ).toBe(100);
  });
});
