import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { SwapIntentDto } from './dto/swap-intent.dto';
import { swapIntentApiBody } from './dto/swap-intent.swagger';
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
      'Quote Uniswap (Trade API) → évaluation RiskEngine (scores, simulation). `UNISWAP_API_KEY` obligatoire au démarrage du serveur. Aucune transaction n’est exécutée ni relayée.',
  })
  @ApiBody(swapIntentApiBody)
  @ApiOkResponse({ type: SwapRiskResponseDto })
  assessSwapRisk(@Body() body: SwapIntentDto): Promise<SwapRiskResponseDto> {
    return this.agent.assessSwapRisk(body);
  }
}
