import { Module } from '@nestjs/common';
import { ProtocolAdaptersModule } from '../protocol-adapters/protocol-adapters.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [ProtocolAdaptersModule, RiskEngineModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
