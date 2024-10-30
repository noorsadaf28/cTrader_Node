import { Controller, Post, Body, HttpException, HttpStatus, Get, HttpCode, Inject } from '@nestjs/common';
import { CtraderAccountService } from 'src/services/exchange/cTrader/account.service';
import { CreateTraderDto } from 'src/dto/create-trader.dto';
import { IAccountInterface } from 'src/services/Interfaces/IAccount.interface';

@Controller('account')
export class AccountController {
  constructor(@Inject('IAccountInterface') private readonly IAccountInterface:IAccountInterface) {}

  @Post('createAccountCtid')
  async createAccountWithCTID(
    @Body() createTraderDto: CreateTraderDto,
    @Body('email') userEmail: string,
    @Body('preferredLanguage') preferredLanguage: string,
    @Body('depositCurrency') depositCurrency: string,
    @Body('balance') balance:string
  ) {
    try {
      if (!userEmail || !preferredLanguage) {
        throw new HttpException('Email and Preferred Language are required', HttpStatus.BAD_REQUEST);
      }

      const response = await this.IAccountInterface.createAccountWithCTID(createTraderDto, userEmail, preferredLanguage, depositCurrency, balance);
      return response;
      
    } catch (error) {
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Post('accountDetails')
  @HttpCode(HttpStatus.OK)
  async accountDetails(@Body() body ){
    try{
      const response = await this.IAccountInterface.AccountDetails(body);
      return response;
    }
    catch(error){
      console.log("🚀 ~ AccountController ~ accountDetails ~ error:", error)
      
    }
  }
}
