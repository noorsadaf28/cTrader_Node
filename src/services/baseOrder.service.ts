import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { CreateOrderDto } from 'src/dto/create-order.dto';
import { IOrderInterface } from './Interfaces/IOrder.interface';
import {Job} from 'bull';
import { tmpdir } from 'os';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class BaseOrderService implements IOrderInterface {
  private readonly xanoApiUrl: string;
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;
  private readonly xanoEquityUrl: string;
  private readonly logger = new Logger(BaseOrderService.name);

  constructor(private readonly configService: ConfigService) {
    this.xanoApiUrl = process.env.XANO_API_URL;
    this.spotwareApiUrl = configService.get<string>('SPOTWARE_API_URL');
    this.apiToken = configService.get<string>('SPOTWARE_API_TOKEN');
    this.xanoEquityUrl = process.env.XANO_API_EQUITYURL;
  }

  // // Polling logic with login parameter
  // async pollPositions(botInfo:Job) {
  //   const login = botInfo.data.traderLogin;  // replace this with the desired login value or fetch dynamically if needed
  //   this.logger.log(`Polling for open and closed positions for login: ${login}...`);
  //   try {
  //     const openPositions = await this.fetchOpenPositions(login);
  //     console.log("🚀 ~ BaseOrderService ~ pollPositions ~ openPositions:", openPositions);
  //     for (let i = 0; i < openPositions.length; i++) {
  //       if (!botInfo.data.symbols.includes(openPositions[i].symbol)) {
  //         botInfo.data.symbols.push(openPositions[i].symbol);
  //       }
  //       if(botInfo.data.openTimestamp)
  //     }
  //     //console.log("🚀 ~ BaseOrderService ~ pollPositions ~ botInfo:", botInfo.data)
  //     const closedPositions = await this.fetchClosedPositions(login);
  //     await this.updateXanoWithPositions(openPositions, closedPositions);
  //     return {"message":`Polling started for account ${login}`}
  //   } catch (error) {
  //     this.logger.error(`Error during polling: ${error.message}`);
  //   }
  // }
  // Polling logic with login parameter
async pollPositions(botInfo: Job) {
  const login = botInfo.data.traderLogin; // Replace this with the desired login value or fetch dynamically if needed
  this.logger.log(`Polling for open and closed positions for login: ${login}...`);
  
  try {
    const openPositionsData = await this.fetchOpenPositions(login, botInfo);
    // Fetch and update closed positions
    const closedPositions = await this.fetchClosedPositions(login);
    await this.updateXanoWithPositions(openPositionsData.openPositions, closedPositions);

    return { message: `Polling started for account ${login}` };
  } catch (error) {
    this.logger.error(`Error during polling: ${error.message}`);
  }
}


  async fetchOpenPositions(login: number, botInfo:Job) {
    try {
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/openPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken, login },
      });
      this.logger.log('Fetched open positions from Spotware', response.data);
      const openPositions = this.parseOpenPositionsCsv(response.data);
      console.log("🚀 ~ BaseOrderService ~ pollPositions ~ openPositions:", openPositions);

      // Track unique trading days
      const tradingDaysSet = new Set<string>(); // Use a set to store unique dates
      let tradingDays;

      for (let i = 0; i < openPositions.length; i++) {
        const position = openPositions[i];

        // Add symbol to botInfo if not already included
        if (!botInfo.data.symbols.includes(position.symbol)) {
          botInfo.data.symbols.push(position.symbol);
        }

        // Extract the date from the openTimestamp and add it to the tradingDaysSet
        const openDate = new Date(position.openTimestamp).toISOString().split('T')[0]; // Extract date part
        tradingDaysSet.add(openDate);
        botInfo.data.tradingDaysSet = tradingDaysSet;
        tradingDays = tradingDaysSet.size;
        botInfo.data.tradingDays = tradingDays
        const tempData = botInfo.data;
        botInfo.update(tempData);
      }
      this.logger.log(`Trading days for login ${login}: ${botInfo.data.tradingDays}`);

      return {openPositions, tradingDays};
    } catch (error) {
      this.logger.error(`Failed to fetch open positions: ${error.message}`);
      throw new HttpException('Failed to fetch open positions', HttpStatus.FORBIDDEN);
    }
  }

  private async fetchClosedPositions(login: number) {
    const now = new Date();
    const to = now.toISOString();
    const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    try {
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/closedPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { from, to, token: this.apiToken, login },
      });
      this.logger.log('Fetched closed positions from Spotware');
      return this.parseClosedPositionsCsv(response.data);
    } catch (error) {
      this.logger.error(`Failed to fetch closed positions: ${error.message}`);
      throw new HttpException('Failed to fetch closed positions', HttpStatus.FORBIDDEN);
    }
  }

  private parseOpenPositionsCsv(csvData: string): any[] {
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
          stop_loss:'NULL'
        };
      });
  }

  private parseClosedPositionsCsv(csvData: string): any[] {
    const rows = csvData.split('\n').slice(1); // Skip header row
    return rows
      .filter((row) => row.trim())
      .map((row) => {
        const columns = row.split(',');
        return {
          login: columns[0],
          positionId: columns[1],
          openTimestamp: columns[2],
          closeTimestamp: columns[3],
          closePrice: columns[4],
          direction: columns[5],
          volume: columns[6],
          symbol: columns[7],
          commission: columns[8],
          swap: columns[9],
          pnl: columns[10],
          depositConversionRate: columns[11],
          usdConversionRate: columns[12],
          bookType: columns[13],
          stake: columns[14],
          spreadBetting: columns[15],
          entryPrice: columns[16],
          dealId: columns[17],
          take_profit:'NULL',
          updated_at:Date.now()
        };
      });
  }
  private async updateXanoWithPositions(openPositions: any[], closedPositions: any[]) {
    for (const pos of openPositions) {
      const openOrderData: CreateOrderDto = this.mapOpenPositionToOrderDto(pos);
      try {
        const existingOrder = await this.findOrderByTicketId(openOrderData.ticket_id);
        if (!existingOrder) {
          await this.createOrder(openOrderData);
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
        const existingOrder = await this.findOrderByTicketId(closedOrderData.ticket_id);
        if (existingOrder) {
          await this.updateOrderWithCloseData(closedOrderData);
          this.logger.log(`Closed order updated in Xano: ${JSON.stringify(closedOrderData)}`);
        } else {
          this.logger.log(`No existing open order found for closed order with ticket_id: ${closedOrderData.ticket_id}. Creating new entry.`);
          await this.createOrder(closedOrderData);
          this.logger.log(`New closed order created in Xano: ${JSON.stringify(closedOrderData)}`);
        }
      } catch (error) {
        this.logger.error(`Failed to update closed position in Xano: ${error.message}`);
      }
    }
  }

  // Implementation for IOrderInterface methods

  async createOrder(createOrderDto: CreateOrderDto): Promise<IOrderInterface> {
    try {
      const response = await axios.post(this.xanoApiUrl, createOrderDto);
      return response.data;
    } catch (error) {
      throw new HttpException(`Failed to create order in Xano: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateOrderWithCloseData(closeOrderData: CreateOrderDto): Promise<IOrderInterface> {
    try {
      const response = await axios.patch(`${this.xanoApiUrl}/${closeOrderData.ticket_id}`, closeOrderData);
      return response.data;
    } catch (error) {
      throw new HttpException(`Failed to update order in Xano: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOrderByTicketId(ticket_id: number): Promise<IOrderInterface | null> {
    try {
      const response = await axios.get(`${this.xanoApiUrl}/${ticket_id}`);
      return response.data || null;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw new HttpException(`Error fetching order: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  // Helper methods for mapping positions to DTOs
  private mapOpenPositionToOrderDto(position: any): CreateOrderDto {
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

  private mapClosedPositionToOrderDto(position: any): CreateOrderDto {
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
      stop_loss:'NULL',
      take_profit:'NULL',
      open_reason: position.bookType || 'AUTO',
      close_reason: 'AUTO',
      updated_at: Date.now()
    
    };
  }
}
