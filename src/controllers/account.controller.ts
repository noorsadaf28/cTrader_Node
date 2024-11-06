import { Controller, Post, Body, HttpException,HttpCode, HttpStatus, Inject, Logger ,Patch} from '@nestjs/common';
import { CreateTraderDto } from 'src/dto/create-trader.dto';
import { IAccountInterface } from 'src/services/Interfaces/IAccount.interface';

@Controller('account')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    @Inject('IAccountInterface') 
    private readonly IAccountInterface: IAccountInterface
  ) {}

  // @Post('createAccountCtid')
  // async createAccountWithCTID(
  //   @Body() createTraderDto: CreateTraderDto,
  //   @Body('email') userEmail: string,
  //   @Body('preferredLanguage') preferredLanguage: string,
  //   @Body('depositCurrency') depositCurrency: string,
  //   @Body('balance') balance:string
  // ) {
  //   try {
  //     if (!userEmail || !preferredLanguage) {
  //       throw new HttpException('Email and Preferred Language are required', HttpStatus.BAD_REQUEST);
  //     }

  //     const response = await this.IAccountInterface.createAccountWithCTID(createTraderDto, userEmail, preferredLanguage, depositCurrency, balance);
  //     return response;
      
  //   } catch (error) {
  //     throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }
  @Post('createAccountCtid')
  @HttpCode(HttpStatus.OK)
  async createAccountWithCTID(@Body() body) {
    try {
    console.log("🚀 ~ AccountController ~ accountDetails ~ body:", body)

      if (!body.email || !body.preferredLanguage) {
        throw new HttpException('Email and Preferred Language are required', HttpStatus.BAD_REQUEST);
      }

      const response = await this.IAccountInterface.createAccountWithCTID(body);
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to create account with CTID for email: ${body.userEmail}`, error.stack);
      console.log("🚀 ~ AccountController ~ createAccountWithCTID ~ error:", error)
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('accountDetails')
  @HttpCode(HttpStatus.OK)
  async accountDetails(@Body() body: any) {
    try {
      const response = await this.IAccountInterface.AccountDetails(body);
      this.logger.log(`Fetched account details successfully for request: ${JSON.stringify(body)}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch account details for request: ${JSON.stringify(body)}`, error.stack);
      throw new HttpException('Failed to retrieve account details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Patch('updateAccount')
  @HttpCode(HttpStatus.OK)
  async updateAccount(@Body() body ){
    try{
      const response = await this.IAccountInterface.UpdateAccount(body);
      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch account details for request: ${JSON.stringify(body)}`, error.stack);
      throw new HttpException('Failed to retrieve account details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

 

}
