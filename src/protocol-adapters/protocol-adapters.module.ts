import { Module } from '@nestjs/common';
import { ProtocolAdapterRegistry } from './registry/protocol-adapter.registry';
import { UniswapRoutingService } from './uniswap/uniswap-routing.service';
import { UniswapTradeApiClient } from './uniswap/uniswap-trade-api.client';

@Module({
  providers: [UniswapTradeApiClient, UniswapRoutingService, ProtocolAdapterRegistry],
  exports: [UniswapRoutingService, ProtocolAdapterRegistry],
})
export class ProtocolAdaptersModule {}
