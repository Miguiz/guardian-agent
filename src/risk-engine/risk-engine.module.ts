import { Module } from '@nestjs/common';
import { SecurityEvaluator } from './evaluators/security.evaluator';
import { SocialEvaluator } from './evaluators/social.evaluator';
import { TelegramRiskEvaluator } from './evaluators/telegram-risk.evaluator';
import { TelegramRiskFeedService } from './feeds/telegram-risk-feed.service';
import { RiskEngineService } from './risk-engine.service';
import { SimulationService } from './simulation/simulation.service';

@Module({
  providers: [
    RiskEngineService,
    SimulationService,
    SecurityEvaluator,
    SocialEvaluator,
    TelegramRiskFeedService,
    TelegramRiskEvaluator,
  ],
  exports: [RiskEngineService],
})
export class RiskEngineModule {}
