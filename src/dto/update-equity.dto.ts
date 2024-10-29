import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateEquityDto {
  @IsNumber()
  @IsNotEmpty()
  starting_equity: number;

  @IsNotEmpty()
  accountId: number;
}
