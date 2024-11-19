import { Module } from '@nestjs/common';
import { OrderController } from 'src/controllers/order.controller';
import { CtraderOrderService } from 'src/services/exchange/cTrader/order.service';
// import { SpotwareService } from 'src/services/exchange/cTrader/spotware.order.service';
import { ConfigModule } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

@Module({
  imports: [ConfigModule],
  controllers: [OrderController],
  providers: [CtraderOrderService],
  exports: [CtraderOrderService],
})
export class OrderModule {}
