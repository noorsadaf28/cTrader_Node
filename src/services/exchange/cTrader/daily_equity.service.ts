import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as dayjs from 'dayjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class DailyEquityService {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;
  private readonly xanoEquityUrl: string;
  private readonly logger = new Logger(DailyEquityService.name);
  private lastFetchedData: any[] = [];

  constructor(private readonly httpService: HttpService) {
    this.spotwareApiUrl = process.env.SPOTWARE_API_URL;
    this.apiToken = process.env.SPOTWARE_API_TOKEN;
    this.xanoEquityUrl = process.env.XANO_API_EQUITYURL;
  }

  async fetchDailyEquityData(fromDate: string, toDate: string) {
    this.logger.log(`Fetching daily equity data from Spotware for date range ${fromDate} to ${toDate}`);

    try {
      const response: AxiosResponse = await this.httpService
        .get(`${this.spotwareApiUrl}/v2/webserv/traders/`, {
          params: {
            from: fromDate,
            to: toDate,
            fields: 'login,balance,minEquityDaily,maxEquityDaily',
            token: this.apiToken,
          },
        })
        .toPromise();

      this.logger.debug(`Received status code: ${response.status}`);

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const mappedData = response.data.trader.map((trader) => ({
        account: trader.login, // This should remain as an integer
        starting_daily_equity: trader.balance.toString(), // Convert balance to string
        sde_date: dayjs().format('YYYY-MM-DD'), // Already a formatted string
        gmt_date: dayjs().toISOString(), // Already a formatted string
        created_at: dayjs().toISOString(), // Optional if you want to set it, else let DB handle it
        status: 'pending', // Ensure this is a valid enum value
        trading_days: '0', // Keep as a string
        challenge_begins: dayjs().subtract(30, 'days').format('YYYY-MM-DD'), // Already a formatted string
        new_status: 'pending', // Ensure this is a valid enum value
      }));
      

      this.logger.log('Successfully fetched and mapped daily equity data');
      this.logger.debug(`Mapped data: ${JSON.stringify(mappedData)}`);
      return mappedData;

    } catch (error) {
      this.logger.error(`Error fetching daily equity data: ${error.message}`);
      throw new HttpException(`Failed to fetch daily equity data: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private hasDataChanged(newData: any[]): boolean {
    return JSON.stringify(this.lastFetchedData) !== JSON.stringify(newData);
  }

  async postDailyEquityToXano(equityData: any[]) {
    this.logger.log('Posting daily equity data to Xano');
    
    for (const data of equityData) {
      this.logger.debug(`Payload for Xano: ${JSON.stringify(data)}`);
  
      try {
        const response: AxiosResponse = await this.httpService
          .post(this.xanoEquityUrl, data, {
            headers: { 'Content-Type': 'application/json' },
          })
          .toPromise();
  
        this.logger.debug(`Xano response status code: ${response.status}`);
        
        if (response.status !== 200) {
          throw new Error(`Unexpected status code from Xano: ${response.status}`);
        }
  
        this.logger.log('Successfully posted equity data to Xano');
        this.logger.debug(`Response from Xano: ${JSON.stringify(response.data)}`);
        
      } catch (error) {
        this.logger.error(`Error posting equity data to Xano: ${error.message}`);
        throw new HttpException(`Failed to post equity data to Xano: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
  

  async updateDailyEquityForTraders() {
    const fromDate = dayjs().subtract(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS');
    const toDate = dayjs().startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS');

    this.logger.log(`Starting daily equity update for traders from ${fromDate} to ${toDate}`);
    
    try {
      const equityData = await this.fetchDailyEquityData(fromDate, toDate);

      if (this.hasDataChanged(equityData)) {
        this.logger.log('Data has changed; updating Xano');
        const result = await this.postDailyEquityToXano(equityData);
        
        // Update last fetched data
        this.lastFetchedData = equityData;
        
        this.logger.log('Daily equity update completed successfully');
        return result;
      } else {
        this.logger.log('No changes in data; skipping Xano update');
      }

    } catch (error) {
      this.logger.error(`Failed to update daily equity for traders: ${error.stack}`);
      throw new HttpException(`Failed to update daily equity for traders: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
