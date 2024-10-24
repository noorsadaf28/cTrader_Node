import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @IsNotEmpty()
  login: number;

  @IsString()
  @IsNotEmpty()
  positionId: string;

  @IsString()
  entryPrice: string;

  @IsString()
  direction: string;

  @IsNumber()
  volume: number;

  @IsString()
  symbol: string;

  @IsNumber()
  commission: number;

  @IsNumber()
  swap: number;

  @IsString()
  bookType: string;

  @IsNumber()
  usedMargin: number;

  @IsString()
  openTimestamp: string;

  @IsString()
  closeTimestamp?: string;

  @IsString()
  closePrice?: string;

  @IsNumber()
  pnl?: number;
}
