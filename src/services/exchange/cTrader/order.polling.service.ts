import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderService } from './order.service';
import { SpotwareService } from './spotware.order.service';
import { CreateOrderDto } from 'src/dto/create-order.dto';

@Injectable()
export class OrderPollingService {
  private readonly logger = new Logger(OrderPollingService.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly spotwareService: SpotwareService,
  ) {}

  // Cron job to poll Spotware API every minute
  @Cron('*/10 * * * * *')
  async pollOpenPositions() {
    this.logger.log('Polling for open positions...');
    
    try {
      const openPositions = await this.spotwareService.fetchOpenPositions();

      for (const position of openPositions) {
        const createOrderDto: CreateOrderDto = {
          login: position.login,
          positionId: position.positionId,
          entryPrice: position.entryPrice,
          direction: position.direction,
          volume: position.volume,
          symbol: position.symbol,
          commission: position.commission,
          swap: position.swap,
          bookType: position.bookType,
          usedMargin: position.usedMargin,
          openTimestamp: position.openTimestamp,
        };
        await this.orderService.createOrUpdateOrder(createOrderDto);
      }
    } catch (error) {
      this.logger.error('Error polling open positions:', error.message);
    }
  }

  @Cron('*/10 * * * * *')
async pollClosedPositions() {
  this.logger.log('Polling for closed positions...');
  
  const currentTime = new Date();
  const twelveHoursAgo = new Date(currentTime.getTime() - 12 * 60 * 60 * 1000); // Subtract 12 hours

  const from = twelveHoursAgo.toISOString();
  const to = currentTime.toISOString();

  try {
    const closedPositions = await this.spotwareService.fetchClosedPositions(from, to);

    for (const position of closedPositions) {
      await this.orderService.deleteOrder(position.positionId);
    }
  } catch (error) {
    this.logger.error('Error polling closed positions:', error.message);
  }
}
}
