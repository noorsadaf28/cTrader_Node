import { IsNotEmpty, IsString } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  userId: number;
}
