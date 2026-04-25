import { Injectable } from '@nestjs/common';
import type { ExecutionIntent } from '../types/risk-assessment.types';

/** Heuristic security score 0–100 for the given intent. */
@Injectable()
export class SecurityEvaluator {
  score(intent: ExecutionIntent): number {
    const dataLen = intent.data.length;
    if (dataLen < 10) {
      return 40;
    }
    const calldataSelector = intent.data.slice(0, 10).toLowerCase();
    if (calldataSelector === '0xa9059cbb') {
      return 85;
    }
    return 72;
  }
}
