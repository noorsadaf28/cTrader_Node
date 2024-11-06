// src/services/Interfaces/IOrderPollingService.interface.ts
import { CreateOrderDto } from 'src/dto/create-order.dto';

export interface IOrderPollingService {
  pollPositions(): Promise<void>;
  fetchOpenPositions(): Promise<any[]>;
  fetchClosedPositions(): Promise<any[]>;
  updateXanoWithPositions(openPositions: any[], closedPositions: any[]): Promise<void>;
  mapOpenPositionToOrderDto(position: any): CreateOrderDto;
  mapClosedPositionToOrderDto(position: any): CreateOrderDto;
}
