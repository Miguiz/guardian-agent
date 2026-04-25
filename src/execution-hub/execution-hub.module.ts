import { Module } from '@nestjs/common';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { ExecutionHubService } from './execution-hub.service';
import { KeeperHubClient } from './keeper-hub/keeper-hub.client';

@Module({
  imports: [RiskEngineModule],
  providers: [ExecutionHubService, KeeperHubClient],
  exports: [ExecutionHubService],
})
export class ExecutionHubModule {}
