import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService, } from '@nestjs/axios';
import * as dayjs from 'dayjs';
import { AxiosResponse } from 'axios';
import * as https from 'https'; 


import { Cron } from '@nestjs/schedule';

import * as utc from 'dayjs/plugin/utc';

import * as timezone from 'dayjs/plugin/timezone';



dayjs.extend(utc);

dayjs.extend(timezone);


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
  
     // Disable SSL verification for HTTPS requests

     this.httpService.axiosRef.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });

    }
  
  
  
    // Cron job that runs daily at 00:00 Madrid time
  
    @Cron('0 0 * * *', {
  
      timeZone: 'Europe/Madrid',
  
    })
  
    async handleCron() {
  
      this.logger.log('Executing daily equity update via cron job at 00:00 Madrid time');
  
      try {
  
        const result = await this.updateDailyEquityForTraders();
  
        this.logger.log('Daily equity update process completed successfully');
  
        this.logger.debug(`Update result: ${JSON.stringify(result)}`);
  
      } catch (error) {
  
        this.logger.error(`Cron job failed: ${error.message}`);
  
      }
  
    }


  // Fetch daily equity data from external service
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

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const mappedData = response.data.trader.map((trader) => ({
        account: trader.login,
        starting_daily_equity: trader.balance.toString(),// Convert balance to string as required by Xano
        sde_date: dayjs().format('YYYY-MM-DD'),
        gmt_date: dayjs().toISOString(),
        created_at: dayjs().toISOString(),
        status: 'pending',
        trading_days: '0',
        challenge_begins: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
        new_status: 'pending',
      }));

      this.logger.log('Successfully fetched and mapped daily equity data');
      return mappedData;
    } catch (error) {
      this.logger.error(`Error fetching daily equity data: ${error.message}`);
      throw new HttpException(`Failed to fetch daily equity data: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Check if data exists in Xano, and then update or create as needed
  async checkAndUpdateDailyEquityInXano(equityData: any[]) {
    this.logger.log('Starting Xano data check and update process');

    // Log to check the equityData content
    this.logger.debug(`Received equityData: ${JSON.stringify(equityData)}`);
    
    const results = [];

    if (!equityData || equityData.length === 0) {
        this.logger.warn('No equity data to process. Exiting function.');
        return results; // Return early if there is no data
    }

    for (const data of equityData) {
      try {
        this.logger.debug(`Processing account: ${data.account}`);
        console.log(`${this.xanoEquityUrl}/${data.account}/`, "Xano check URL");
        const existingDataResponse = await this.httpService
          .get(`${this.xanoEquityUrl}/${data.account}/`, {
            headers: { 'Content-Type': 'application/json' },
          })
          .toPromise();
        
        this.logger.debug(`Received response for account ${data.account}: ${JSON.stringify(existingDataResponse.data)}`);

        if (existingDataResponse.status === 200) {
          this.logger.log(`Account ${data.account} exists in Xano, updating record`);

          const updateResponse = await this.httpService
            .patch(`${this.xanoEquityUrl}/${data.account}`, data, {
              headers: { 'Content-Type': 'application/json' },
            })
            .toPromise();

          this.logger.debug(`Update response for account ${data.account}: ${JSON.stringify(updateResponse.data)}`);
          results.push(updateResponse.data);
        } else {
          this.logger.log(`Account ${data.account} does not exist, creating new record`);

          const createResponse = await this.httpService
            .post(this.xanoEquityUrl, data, {
              headers: { 'Content-Type': 'application/json' },
            })
            .toPromise();

          this.logger.debug(`Create response for account ${data.account}: ${JSON.stringify(createResponse.data)}`);
          results.push(createResponse.data);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          this.logger.log(`Account ${data.account} not found in Xano, creating new record`);

          const createResponse = await this.httpService
            .post(this.xanoEquityUrl, data, {
              headers: { 'Content-Type': 'application/json' },
            })
            .toPromise();

          this.logger.debug(`Create response for account ${data.account}: ${JSON.stringify(createResponse.data)}`);
          results.push(createResponse.data);
        } else {
          this.logger.error(`Failed to process account ${data.account}: ${error.message}`);
          throw new HttpException(`Failed to process account ${data.account}: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    }

    this.logger.log('Completed Xano data check and update process');
    return results;
  }


  // Update the equity for traders daily
  async updateDailyEquityForTraders() {
    const fromDate = dayjs().subtract(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS');
    const toDate = dayjs().startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS');

    this.logger.log(`Starting daily equity update for traders from ${fromDate} to ${toDate}`);

    try {
      const equityData = await this.fetchDailyEquityData(fromDate, toDate);

      if (this.hasDataChanged(equityData)) {
        this.logger.log('Data has changed; proceeding with update');
        const result = await this.checkAndUpdateDailyEquityInXano(equityData);
        this.lastFetchedData = equityData;  // Update the cache
        return result;
      } else {
        this.logger.log('No changes in data; skipping Xano update');
        return { message: 'No changes detected; update skipped.' };
      }
    } catch (error) {
      this.logger.error(`Failed to update daily equity for traders: ${error.message}`);
      throw new HttpException(`Failed to update daily equity for traders: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private hasDataChanged(newData: any[]): boolean {
    return JSON.stringify(this.lastFetchedData) !== JSON.stringify(newData);
  }
}
