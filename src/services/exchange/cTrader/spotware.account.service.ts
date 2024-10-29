import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ISpotwareService } from 'src/services/Interfaces/IAccount.interface';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { CreateTraderDto } from 'src/dto/create-trader.dto';

@Injectable()
export class SpotwareService implements ISpotwareService {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.spotwareApiUrl = this.configService.get<string>('SPOTWARE_API_URL');
    this.apiToken = this.configService.get<string>('SPOTWARE_API_TOKEN');
  }

  async createCTID(email: string, preferredLanguage: string): Promise<any> {
    try {
      const response = await axios.post(`${this.spotwareApiUrl}/cid/ctid/create`, {
        email,
        preferredLanguage,
      }, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to create cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createTrader(createTraderDto: CreateTraderDto): Promise<any> {
    try {
      const response = await axios.post(`${this.spotwareApiUrl}/v2/webserv/traders`, createTraderDto, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to create Trader Account', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async linkAccountToCTID(traderLogin: number, userId: number, brokerName: string, traderPasswordHash: string): Promise<any> {
    try {
      const response = await axios.post(`${this.spotwareApiUrl}/cid/ctid/link`, {
        traderLogin,
        userId,
        brokerName,
        traderPasswordHash,
        environmentName: 'demo',
        returnAccountDetails: true,
      }, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to link Trader Account to cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
