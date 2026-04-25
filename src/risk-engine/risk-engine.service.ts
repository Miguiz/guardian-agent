import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForbiddenRiskException } from '../common/exceptions/forbidden-risk.exception';
import { SecurityEvaluator } from './evaluators/security.evaluator';
import { SocialEvaluator } from './evaluators/social.evaluator';
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
    private readonly configService: ConfigService,
  ) {}

  /**
   * Full multicriteria assessment: simulation + security + social.
   */
  async assess(intent: ExecutionIntent): Promise<RiskAssessment> {
    const simulation = await this.simulation.simulate(intent);
    const security = this.securityEvaluator.score(intent);
    const social = this.socialEvaluator.score(intent);
    const aggregate = Math.round((security * 0.6 + social * 0.4) * 10) / 10;

    const minScore =
      this.configService.get<number>('riskMinAggregateScore') ?? 60;

    let verdict: RiskVerdict;
    if (!simulation.success) {
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
      scores: { security, social, aggregate },
      simulation,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Enforces Security First: only PASS assessments may proceed to relay.
   */
  assertApprovedForExecution(assessment: RiskAssessment): void {
    if (assessment.verdict !== RiskVerdict.PASS) {
      throw new ForbiddenRiskException(
        `RiskEngine blocked execution: verdict=${assessment.verdict}`,
      );
    }
    if (!assessment.simulation.success) {
      throw new ForbiddenRiskException(
        'RiskEngine blocked execution: simulation did not succeed',
      );
    }
  }
}
