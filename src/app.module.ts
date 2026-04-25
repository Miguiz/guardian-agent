import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { AppConfigModule } from './config/config.module';

@Module({
  imports: [AppConfigModule, AgentModule],
})
export class AppModule {}
