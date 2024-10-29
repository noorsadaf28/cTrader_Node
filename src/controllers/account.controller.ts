import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AccountService } from 'src/services/exchange/cTrader/account.service';
import { CreateTraderDto } from 'src/dto/create-trader.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post('create-with-ctid')
  async createAccountWithCTID(
    @Body() createTraderDto: CreateTraderDto,
    @Body('email') userEmail: string,
    @Body('preferredLanguage') preferredLanguage: string,
  ) {
    try {
      if (!userEmail || !preferredLanguage) {
        throw new HttpException('Email and Preferred Language are required', HttpStatus.BAD_REQUEST);
      }

      const response = await this.accountService.createAccountWithCTID(createTraderDto, userEmail, preferredLanguage);
      return response;
      
    } catch (error) {
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
