import { Controller, Post, Get, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { OrderPollingService } from 'src/services/baseOrderPolling.service';
import { CtraderOrderService } from 'src/services/exchange/cTrader/order.service';
import { IOrderInterface } from 'src/services/Interfaces/IOrder.interface';

@Controller('order')
export class OrderController {
  constructor(@Inject('IOrderInterface') 
    private readonly IOrderInterface: IOrderInterface
  ) {}

  @Post('fetchOrders')
  @HttpCode(HttpStatus.OK)
  async fetchOpenPositions() {
    await this.IOrderInterface.pollPositions();
  }
  @Post('symbolInfo')
  async getSymbolInfo(){
    
  }
   
}
