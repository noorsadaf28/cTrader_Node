import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { CreateOrderDto } from 'src/dto/create-order.dto';
import {IOrderInterface } from 'src/services/Interfaces/IOrder.interface';

@Injectable()
export class CtraderOrderService {
  private readonly xanoApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.xanoApiUrl = `${this.configService.get<string>('XANO_API_URL')}`;
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<IOrderInterface> {
    try {
      // Check if the order already exists by `ticket_id`
      const existingOrder = await this.findOrderByTicketId(createOrderDto.ticket_id);
      console.log("hey",existingOrder);
      if (existingOrder) {
        console.log(`Duplicate order detected for ticket_id: ${createOrderDto.ticket_id}. Skipping insertion.`);
        return existingOrder; // Skip creation and return the existing order
      }

      // Proceed to create a new order if it does not exist
      const response = await axios.post(this.xanoApiUrl, createOrderDto);
      console.log(`New open order created in Xano: ${JSON.stringify(response.data)}`);
      return response.data;

    } catch (error) {
      throw new HttpException(
        `Failed to create order in Xano: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateOrderWithCloseData(closeOrderData: CreateOrderDto): Promise<IOrderInterface> {
    try {
      const response = await axios.put(`${this.xanoApiUrl}/${closeOrderData.ticket_id}`, closeOrderData);
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Failed to update order in Xano: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOrderByTicketId(ticket_id: number): Promise<IOrderInterface | null> {
    try {
      const response = await axios.get(`${this.xanoApiUrl}/${ticket_id}`);
      console.log(`Find order response for ticket_id ${ticket_id}:`,response.data.items[0].ticket_id);
      return response.data.items[0].ticket_id;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`No order found for ticket_id ${ticket_id}`);
        return null;
      }
      throw new HttpException(
        `Error fetching order: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
