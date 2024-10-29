import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { IAccountService } from 'src/services/Interfaces/IAccount.interface';
import { SpotwareService } from './spotware.account.service';
import { CreateTraderDto } from 'src/dto/create-trader.dto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccountService implements IAccountService {
  private readonly xanoApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly spotwareService: SpotwareService,
  ) {
    this.xanoApiUrl = this.configService.get<string>('XANO_API_URL_1');
    console.log('AccountService initialized with Xano');
  }

  async createAccountWithCTID(
    createTraderDto: CreateTraderDto,
    userEmail: string,
    preferredLanguage: string
  ): Promise<{ ctid: number; traderLogin: string; ctidTraderAccountId: number; message?: string }> {
    try {
      console.log('Creating cTID with email:', userEmail);
      const ctidResponse = await this.spotwareService.createCTID(userEmail, preferredLanguage);
      const userId = parseInt(ctidResponse.userId);

      if (!userId) {
        throw new HttpException('Failed to create cTID', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const traderResponse = await this.spotwareService.createTrader(createTraderDto);
      const traderLogin = traderResponse.login;

      if (!traderLogin) {
        throw new HttpException('Failed to create Trader Account', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const linkResponse = await this.linkAccountToCTID(
        traderLogin,
        userId,
        createTraderDto.brokerName,
        createTraderDto.hashedPassword
      );

      const response = await axios.post(this.xanoApiUrl, {
        ctid: userId,
        traderLogin,
        ctidTraderAccountId: linkResponse.ctidTraderAccountId,
        email: userEmail,
        balance: createTraderDto.balance,
        accountType: createTraderDto.accountType,
        depositCurrency: createTraderDto.depositCurrency,
      });

      console.log('Account created in Xano:', response.data);
      return {
        ctid: userId,
        traderLogin,
        ctidTraderAccountId: linkResponse.ctidTraderAccountId,
      };
    } catch (error) {
      console.error('Error in createAccountWithCTID:', error.message);
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async linkAccountToCTID(
    traderLogin: number,
    userId: number,
    brokerName: string,
    hashedPassword: string
  ): Promise<any> {
    return this.spotwareService.linkAccountToCTID(traderLogin, userId, brokerName, hashedPassword);
  }
}
