import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { CtraderAccountService } from 'src/services/exchange/cTrader/account.service';
import { CreateTraderDto } from 'src/dto/create-trader.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: CtraderAccountService) {}

  @Post('create-with-ctid')
  async createAccountWithCTID(
    @Body() createTraderDto: CreateTraderDto,
    @Body('email') userEmail: string,
    @Body('preferredLanguage') preferredLanguage: string,
    @Body('depositCurrency') depositCurrency:string,
    @Body('balance') balance:number
  ) {
    try {
      if (!userEmail || !preferredLanguage) {
        throw new HttpException('Email and Preferred Language are required', HttpStatus.BAD_REQUEST);
      }
console.log("----------balance", balance)
      const response = await this.accountService.createAccountWithCTID(createTraderDto, userEmail, preferredLanguage, depositCurrency, balance);
      return response;
      
    } catch (error) {
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
