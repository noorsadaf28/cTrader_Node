
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as dayjs from 'dayjs';
import { AxiosResponse } from 'axios';
import * as https from 'https';

@Injectable()
export class DailyEquityService {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;
  private readonly xanoEquityUrl: string;
  private readonly logger = new Logger(DailyEquityService.name);

  constructor(private readonly httpService: HttpService) {
    this.spotwareApiUrl = process.env.SPOTWARE_API_URL;
    this.apiToken = process.env.SPOTWARE_API_TOKEN;
    this.xanoEquityUrl = process.env.XANO_API_EQUITYURL;
    this.httpService.axiosRef.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });
  }

  // Fetch user balance data from the external Spotware API
  async fetchUserBalanceData(userId: number) {
    this.logger.log(`Fetching balance data for user ID: ${userId}`);
  
    try {
      const response: AxiosResponse = await this.httpService
        .get(`${this.spotwareApiUrl}/v2/webserv/traders/${userId}/`, {
          params: {
            token: this.apiToken,
          },
        })
        .toPromise();
  
      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
  
      const traderData = response.data;
  
      // Check if there was trading activity for the day (usedMargin > 0 or balance difference)
      const tradingOccurred = traderData.equity !== traderData.balance;
  
      // Fetch existing data from Xano to get current trading days
      const currentDataResponse = await this.httpService
        .get(`${this.xanoEquityUrl}/${userId}/`, {
          headers: { 'Content-Type': 'application/json' },
        })
        .toPromise();
  
      const currentTradingDays = currentDataResponse.data.trading_days || '0';
  
      // Increment trading days only if trading occurred
      const updatedTradingDays = tradingOccurred 
        ? (parseInt(currentTradingDays) + 1).toString() 
        : currentTradingDays;
  
      this.logger.debug(`Calculated updated trading days: ${updatedTradingDays}`);
  
      return {
        id: userId,
        account: traderData.login,
        starting_daily_equity: traderData.balance.toString(),
        sde_date: dayjs().format('YYYY-MM-DD'),
        gmt_date: dayjs().toISOString(),
        created_at: dayjs().toISOString(),
        status: 'pending',
        trading_days: updatedTradingDays,
        challenge_begins: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
        new_status: 'pending',
      };
    } catch (error) {
      this.logger.error(`Error fetching balance data for user ID ${userId}: ${error.message}`);
      throw new HttpException(`Failed to fetch balance data for user ID ${userId}: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  

  // Create new daily equity records in Xano
  async createDailyEquityInXano(equityData: any[]) {
    this.logger.log('Starting process to create new daily equity records in Xano');
    this.logger.debug(`Received equityData: ${JSON.stringify(equityData)}`);
    
    const results = [];

    if (!equityData || equityData.length === 0) {
      this.logger.warn('No equity data to process. Exiting function.');
      return results;
    }

    for (const data of equityData) {
      try {
        this.logger.debug(`Creating new record for account: ${data.account}`);

        const createResponse = await this.httpService
          .post(this.xanoEquityUrl, data, {
            headers: { 'Content-Type': 'application/json' },
          })
          .toPromise();

        this.logger.debug(`Create response for account ${data.account}: ${JSON.stringify(createResponse.data)}`);
        results.push(createResponse.data);
      } catch (error) {
        this.logger.error(`Failed to create record for account ${data.account}: ${error.message}`);
        throw new HttpException(`Failed to create record for account ${data.account}: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    this.logger.log('Completed creation of new daily equity records in Xano');
    return results;
  }
}

