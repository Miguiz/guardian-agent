import { Injectable } from '@nestjs/common';
import type { SwapAdapter } from '../interfaces/swap-adapter.interface';
import { UniswapRoutingService } from '../uniswap/uniswap-routing.service';

export type SwapProtocolId = 'uniswap';

@Injectable()
export class ProtocolAdapterRegistry {
  constructor(private readonly uniswap: UniswapRoutingService) {}

  getSwapAdapter(protocolId: SwapProtocolId): SwapAdapter {
    switch (protocolId) {
      case 'uniswap':
        return this.uniswap;
    }
  }
}
