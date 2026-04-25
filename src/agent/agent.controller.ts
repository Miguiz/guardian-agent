import { Body, Controller, Get, Post } from '@nestjs/common';
import { AgentService } from './agent.service';
import { SwapIntentDto } from './dto/swap-intent.dto';

@Controller()
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Post('v1/agent/swap')
  swap(@Body() body: SwapIntentDto) {
    return this.agent.orchestrateSwap(body);
  }
}
