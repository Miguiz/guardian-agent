import { Module } from '@nestjs/common';
import { SecurityEvaluator } from './evaluators/security.evaluator';
import { SocialEvaluator } from './evaluators/social.evaluator';
import { RiskEngineService } from './risk-engine.service';
import { SimulationService } from './simulation/simulation.service';

@Module({
  providers: [
    RiskEngineService,
    SimulationService,
    SecurityEvaluator,
    SocialEvaluator,
  ],
  exports: [RiskEngineService],
})
export class RiskEngineModule {}
