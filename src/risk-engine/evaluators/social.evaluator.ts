import { Injectable } from '@nestjs/common';
import type { ExecutionIntent } from '../types/risk-assessment.types';

/** Placeholder for social / reputation signals (APIs, subgraphs). */
@Injectable()
export class SocialEvaluator {
  score(intent: ExecutionIntent): number {
    const ctx = intent.context;
    const hype = typeof ctx?.socialHypeIndex === 'number' ? ctx.socialHypeIndex : 50;
    return Math.max(0, Math.min(100, Math.round(hype)));
  }
}
