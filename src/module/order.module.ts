import { Module } from '@nestjs/common';
import { OrderController } from 'src/controllers/order.controller';
import { OrderService } from 'src/services/exchange/cTrader/order.service';
import { OrderPollingService } from 'src/services/exchange/cTrader/order.polling.service';
import { SpotwareService } from 'src/services/exchange/cTrader/spotware.order.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [OrderController],
  providers: [OrderService, OrderPollingService, SpotwareService],
})
export class OrderModule {}
