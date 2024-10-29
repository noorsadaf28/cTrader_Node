import { Controller, Post, Get } from '@nestjs/common';
import { OrderPollingService } from 'src/services/exchange/cTrader/order.polling.service';
import { CtraderOrderService } from 'src/services/exchange/cTrader/order.service';
import { IOrderInterface } from 'src/services/Interfaces/IOrder.interface';

@Controller('order')
export class OrderController {
  constructor(
    private readonly orderPollingService: OrderPollingService,
    private readonly orderService: CtraderOrderService,
  ) {}

  @Post('fetch-open-positions')
  async fetchOpenPositions(): Promise<void> {
    await this.orderPollingService.pollPositions();
  }

   
}
