import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from 'src/controllers/order.controller';
import { OrderService } from 'src/services/exchange/cTrader/order.service';
import { OrderPollingService } from 'src/services/exchange/cTrader/order.polling.service';
import { Order } from 'src/entity/order.entity';
import { SpotwareService } from 'src/services/exchange/cTrader/spotware.order.service';
@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [OrderController],
  providers: [OrderService, OrderPollingService, SpotwareService],
})
export class OrderModule {}
