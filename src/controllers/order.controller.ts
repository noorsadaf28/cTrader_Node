import { Controller, Get, Query } from '@nestjs/common';
import { OrderService } from 'src/services/exchange/cTrader/order.service';

@Controller('positions')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('open')
  async getOpenPositions(@Query('login') login: number) {
    return this.orderService.fetchOpenPositions(login);
  }

  @Get('closed')
  async getClosedPositions(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('login') login: number,
  ) {
    return this.orderService.fetchClosedPositions(from, to, login);
  }
}
