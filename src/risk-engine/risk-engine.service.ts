import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityEvaluator } from './evaluators/security.evaluator';
import { SocialEvaluator } from './evaluators/social.evaluator';
import { TelegramRiskEvaluator } from './evaluators/telegram-risk.evaluator';
import { SimulationService } from './simulation/simulation.service';
import type {
  ExecutionIntent,
  RiskAssessment,
} from './types/risk-assessment.types';
import { RiskVerdict } from './types/risk-assessment.types';

@Injectable()
export class RiskEngineService {
  constructor(
    private readonly simulation: SimulationService,
    private readonly securityEvaluator: SecurityEvaluator,
    private readonly socialEvaluator: SocialEvaluator,
    private readonly telegramRiskEvaluator: TelegramRiskEvaluator,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Full multicriteria assessment: simulation + security + social.
   */
  async assess(intent: ExecutionIntent): Promise<RiskAssessment> {
    const simulation = await this.simulation.simulate(intent);
    const security = this.securityEvaluator.score(intent);
    const social = this.socialEvaluator.score(intent);
    const telegram = this.telegramRiskEvaluator.score(intent);
    const aggregate =
      Math.round(
        (security * 0.35 + social * 0.25 + telegram * 0.4) * 10,
      ) / 10;

    const minScore =
      this.configService.get<number>('riskMinAggregateScore') ?? 60;

    let verdict: RiskVerdict;
    if (!simulation.success) {
      verdict = RiskVerdict.FAIL;
    } else if (telegram === 0) {
      verdict = RiskVerdict.FAIL;
    } else if (aggregate < minScore) {
      verdict = RiskVerdict.REVIEW;
    } else {
      verdict = RiskVerdict.PASS;
    }

    if (aggregate < minScore - 20) {
      verdict = RiskVerdict.FAIL;
    }

    return {
      verdict,
      scores: { security, social, telegram, aggregate },
      simulation,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
