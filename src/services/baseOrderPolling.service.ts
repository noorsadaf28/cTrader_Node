import { Injectable, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IOrderInterface } from 'src/services/Interfaces/IOrder.interface';
import { CreateOrderDto } from 'src/dto/create-order.dto';
import { IOrderPollingService } from './Interfaces/IOrderPollingService';

@Injectable()
export class OrderPollingService implements IOrderPollingService {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;
  private readonly logger = new Logger(OrderPollingService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject('IOrderInterface') private readonly IOrderInterface: IOrderInterface
  ) {
    this.spotwareApiUrl = `${this.configService.get<string>('SPOTWARE_API_URL')}`;
    this.apiToken = this.configService.get<string>('SPOTWARE_API_TOKEN');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollPositions(): Promise<void> {
    this.logger.log('Polling for open and closed positions...');
    try {
      const openPositions = await this.fetchOpenPositions();
      const closedPositions = await this.fetchClosedPositions();

      await this.updateXanoWithPositions(openPositions, closedPositions);
    } catch (error) {
      this.logger.error(`Error polling positions: ${error.message}`);
    }
  }

  async fetchOpenPositions(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/openPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      this.logger.log('Fetched open positions from Spotware');
      return this.parseCsvData(response.data);
    } catch (error) {
      this.logger.error(`Failed to fetch open positions: ${error.message}`);
      throw new HttpException('Failed to fetch open positions', HttpStatus.FORBIDDEN);
    }
  }

  async fetchClosedPositions(): Promise<any[]> {
    const now = new Date();
    const to = now.toISOString();
    const from = new Date(now.getTime() - 1 * 60 * 1000).toISOString();


    try {
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/closedPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { from, to, token: this.apiToken },
      });
      this.logger.log('Fetched closed positions from Spotware');
      return this.parseCsvData(response.data);
    } catch (error) {
      this.logger.error(`Failed to fetch closed positions: ${error.message}`);
      throw new HttpException('Failed to fetch closed positions', HttpStatus.FORBIDDEN);
    }
  }

  async updateXanoWithPositions(openPositions: any[], closedPositions: any[]): Promise<void> {
    for (const pos of openPositions) {
      const openOrderData: CreateOrderDto = this.mapOpenPositionToOrderDto(pos);
      try {
        const existingOrder = await this.IOrderInterface.findOrderByTicketId(openOrderData.ticket_id);
        if (!existingOrder) {
          await this.IOrderInterface.createOrder(openOrderData);
          this.logger.log(`New open order created in Xano: ${JSON.stringify(openOrderData)}`);
        } else {
          this.logger.log(`Skipping duplicate open order with ticket_id: ${openOrderData.ticket_id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create open position in Xano: ${error.message}`);
      }
    }

    for (const pos of closedPositions) {
      const closedOrderData: CreateOrderDto = this.mapClosedPositionToOrderDto(pos);
      try {
        const existingOrder = await this.IOrderInterface.findOrderByTicketId(closedOrderData.ticket_id);
        if (existingOrder) {
          await this.IOrderInterface.updateOrderWithCloseData(closedOrderData);
          this.logger.log(`Closed order updated in Xano: ${JSON.stringify(closedOrderData)}`);
        } else {
          this.logger.log(`No existing open order found for closed order with ticket_id: ${closedOrderData.ticket_id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to update closed position in Xano: ${error.message}`);
      }
    }
  }

  mapOpenPositionToOrderDto(position: any): CreateOrderDto {
    return {
      key: position.positionId.toString(),
      ticket_id: Number(position.positionId),
      account: Number(position.login),
      type: position.direction,
      symbol: position.symbol,
      volume: parseFloat(position.volume),
      entry_price: parseFloat(position.entryPrice),
      entry_date: position.openTimestamp,
      broker: 'Spotware',
      open_reason: position.bookType || 'AUTO',
    };
  }

  mapClosedPositionToOrderDto(position: any): CreateOrderDto {
    return {
      key: position.positionId.toString(),
      ticket_id: Number(position.positionId),
      account: Number(position.login),
      type: position.direction,
      symbol: position.symbol,
      volume: parseFloat(position.volume),
      entry_price: parseFloat(position.entryPrice),
      entry_date: position.openTimestamp,
      close_price: parseFloat(position.closePrice),
      close_date: position.closeTimestamp,
      profit: parseFloat(position.pnl),
      broker: 'Spotware',
      open_reason: position.bookType || 'AUTO',
      close_reason: 'AUTO',
    };
  }

  private parseCsvData(csvData: string): any[] {
    const rows = csvData.split('\n').slice(1); // Skip header row
    return rows
      .filter((row) => row.trim())
      .map((row) => {
        const columns = row.split(',');
        return {
          login: columns[0],
          positionId: columns[1],
          openTimestamp: columns[2],
          entryPrice: columns[3],
          direction: columns[4],
          volume: columns[5],
          symbol: columns[6],
          commission: columns[7],
          swap: columns[8],
          bookType: columns[9],
          stake: columns[10],
          spreadBetting: columns[11],
          usedMargin: columns[12],
        };
      });
  }
}
