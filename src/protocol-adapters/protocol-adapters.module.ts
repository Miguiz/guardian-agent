import { Module } from '@nestjs/common';
import { ProtocolAdapterRegistry } from './registry/protocol-adapter.registry';
import { UniswapRoutingService } from './uniswap/uniswap-routing.service';

@Module({
  providers: [UniswapRoutingService, ProtocolAdapterRegistry],
  exports: [UniswapRoutingService, ProtocolAdapterRegistry],
})
export class ProtocolAdaptersModule {}
