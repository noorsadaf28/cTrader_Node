import { Controller, Post, Body, HttpException,HttpCode, HttpStatus, Inject, Logger } from '@nestjs/common';
import { CreateTraderDto } from 'src/dto/create-trader.dto';
import { IAccountInterface } from 'src/services/Interfaces/IAccount.interface';

@Controller('account')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    @Inject('IAccountInterface') 
    private readonly accountService: IAccountInterface
  ) {}

  @Post('createAccountCtid')
  async createAccountWithCTID(
    @Body() createTraderDto: CreateTraderDto,
    @Body('email') userEmail: string,
    @Body('preferredLanguage') preferredLanguage: string,
    @Body('depositCurrency') depositCurrency: string,
    @Body('balance') balance: string
  ) {
    if (!userEmail || !preferredLanguage) {
      this.logger.warn('Missing required fields: email or preferredLanguage');
      throw new HttpException('Email and Preferred Language are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await this.accountService.createAccountWithCTID(
        createTraderDto,
        userEmail,
        preferredLanguage,
        depositCurrency,
        balance
      );
      this.logger.log(`Account created successfully for email: ${userEmail}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to create account with CTID for email: ${userEmail}`, error.stack);
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('accountDetails')
  @HttpCode(HttpStatus.OK)
  async accountDetails(@Body() body: any) {
    try {
      const response = await this.accountService.AccountDetails(body);
      this.logger.log(`Fetched account details successfully for request: ${JSON.stringify(body)}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch account details for request: ${JSON.stringify(body)}`, error.stack);
      throw new HttpException('Failed to retrieve account details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
