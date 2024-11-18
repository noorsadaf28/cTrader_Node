import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsNumber()
  @IsNotEmpty()
  ticket_id: number;

  @IsNumber()
  @IsNotEmpty()
  account: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  @IsNotEmpty()
  volume: number;

  @IsNumber()
  @IsNotEmpty()
  entry_price: number;

  @IsString()
  @IsNotEmpty()
  entry_date: string;

  @IsString()
  @IsNotEmpty()
  broker: string;

  @IsString()
  @IsOptional()
  open_reason: string;

  @IsString()
  @IsOptional()
  close_reason?: string;

  @IsNumber()
  @IsOptional()
  profit?: number;

  // Add these properties to match the type
  @IsNumber()
  @IsOptional()
  close_price?: number;

  @IsString()
  @IsOptional()
  close_date?: string;

  @IsString()
  @IsOptional()
  take_profit?: string;

  @IsString()
  @IsOptional()
  stop_loss?: string;
}
