import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SpotwareService } from './spotware.order.service';
import { IOrderService } from 'src/services/Interfaces/IOrder.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from 'src/entity/order.entity';

@Injectable()
export class OrderService implements IOrderService {
  constructor(
    private readonly spotwareService: SpotwareService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async fetchOpenPositions(login?: number): Promise<any[]> {
    const openPositions = await this.spotwareService.fetchOpenPositions(login);
    console.log('Fetched open positions:', openPositions);
    return openPositions;
  }

  async fetchClosedPositions(from: string, to: string, login?: number): Promise<any[]> {
    const closedPositions = await this.spotwareService.fetchClosedPositions(from, to, login);
    console.log('Fetched closed positions:', closedPositions);
    return closedPositions;
  }

  // Polling function to continuously update open positions
  async updatePositionsData(): Promise<void> {
    setInterval(async () => {
      const openPositions = await this.fetchOpenPositions();
      console.log('Updating positions in DB...');
      for (const position of openPositions) {
        await this.createOrUpdateOrder(position);  // Updated to call the new method
      }
    }, 30000); // Poll every 30 seconds
  }

  // Method to create or update an order
  async createOrUpdateOrder(position: any): Promise<void> {
    const existingOrder = await this.orderRepository.findOne({
      where: { positionId: position.positionId },
    });

    if (existingOrder) {
      // Update existing position
      existingOrder.closePrice = position.closePrice || existingOrder.closePrice;
      existingOrder.closeTimestamp = position.closeTimestamp || existingOrder.closeTimestamp;
      existingOrder.volume = position.volume;
      existingOrder.entryPrice = position.entryPrice;
      await this.orderRepository.save(existingOrder);
    } else {
      // Save new position
      const newOrder = this.orderRepository.create(position);
      await this.orderRepository.save(newOrder);
    }
  }

  // Method to delete a closed order
  async deleteOrder(positionId: number): Promise<void> {
    const existingOrder = await this.orderRepository.findOne({ where: { positionId } });

    if (!existingOrder) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    await this.orderRepository.remove(existingOrder);
    console.log(`Order with positionId ${positionId} deleted`);
  }

  // New method to delete closed positions based on polling
  async pollAndDeleteClosedPositions(): Promise<void> {
    const from = new Date().toISOString().split('T')[0] + 'T00:00:00.000';
    const to = new Date().toISOString().split('T')[0] + 'T23:59:59.999';
    
    const closedPositions = await this.fetchClosedPositions(from, to);

    for (const position of closedPositions) {
      await this.deleteOrder(position.positionId);
    }
  }
}
