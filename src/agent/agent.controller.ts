import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { SwapIntentDto } from './dto/swap-intent.dto';
import { SwapRiskResponseDto } from './dto/swap-risk-response.dto';

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

  @Post('v1/agent/swap/risk')
  @ApiOperation({
    summary: 'Évaluer le risque d’un swap',
    description:
      'Quote Uniswap (ou stub) → évaluation RiskEngine (scores, simulation). Aucune transaction n’est exécutée ni relayée.',
  })
  @ApiBody({ type: SwapIntentDto })
  @ApiOkResponse({ type: SwapRiskResponseDto })
  assessSwapRisk(@Body() body: SwapIntentDto): Promise<SwapRiskResponseDto> {
    return this.agent.assessSwapRisk(body);
  }
}
