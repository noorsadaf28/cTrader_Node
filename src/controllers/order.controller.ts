import { Controller, Post, Get, Inject, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { OrderPollingService } from 'src/services/baseOrderPolling.service';
import { CtraderOrderService } from 'src/services/exchange/cTrader/order.service';
import { IOrderInterface } from 'src/services/Interfaces/IOrder.interface';
import {Job} from 'bullmq';

@Controller('order')
export class OrderController {
  constructor(@Inject('IOrderInterface') 
    private readonly IOrderInterface: IOrderInterface
  ) {}

  @Post('fetchOrders')
  @HttpCode(HttpStatus.OK)
  async fetchOpenPositions(@Body() body) {
   return await this.IOrderInterface.pollPositions(body);
  }
  @Post('symbolInfo')
  async getSymbolInfo(){
    
  }
   
}
