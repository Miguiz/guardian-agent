import { Injectable } from '@nestjs/common';
import { TelegramRiskFeedService } from '../feeds/telegram-risk-feed.service';
import type { ExecutionIntent } from '../types/risk-assessment.types';

/**
 * Downgrades risk when the target contract appears on Telegram-fed or static blocklists.
 */
@Injectable()
export class TelegramRiskEvaluator {
  constructor(private readonly feed: TelegramRiskFeedService) {}

  /** 0 = flagged on Telegram/static list, 100 = no Telegram signal hit. */
  score(intent: ExecutionIntent): number {
    const flagged = this.feed.getFlaggedAddresses();
    const to = intent.to.toLowerCase();
    if (flagged.has(to)) {
      return 0;
    }
    return 100;
  }
}
