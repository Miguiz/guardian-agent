import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { SwapExecutionResponseDto } from './dto/swap-execution-response.dto';
import { SwapIntentDto } from './dto/swap-intent.dto';

@ApiTags('Guardian DeFi Agent')
@Controller()
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { status: { type: 'string', example: 'ok' } },
    },
  })
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Post('v1/agent/swap')
  @ApiOperation({
    summary: 'Orchestrer un swap',
    description:
      'Quote Uniswap (ou stub) → évaluation RiskEngine → relay KeeperHub uniquement si verdict PASS.',
  })
  @ApiBody({ type: SwapIntentDto })
  @ApiOkResponse({ type: SwapExecutionResponseDto })
  swap(@Body() body: SwapIntentDto): Promise<SwapExecutionResponseDto> {
    return this.agent.orchestrateSwap(body);
  }
}
