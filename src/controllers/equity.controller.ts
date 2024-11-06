import { Controller, Get, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { DailyEquityService } from 'src/services/exchange/cTrader/daily_equity.service';

@Controller('daily-equity')
export class DailyEquityController {
  private readonly logger = new Logger(DailyEquityController.name);

  constructor(private readonly dailyEquityService: DailyEquityService) {}

  // Fetch daily equity data for the past day and post it to Xano
  @Get('sync')
  async syncDailyEquityData() {
    this.logger.log('Received request to sync daily equity data');

    try {
      const fromDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const toDate = new Date().toISOString(); // now
      
      // Fetch data from the external service
      const equityData = await this.dailyEquityService.fetchDailyEquityData(fromDate, toDate);
      
      // Post data to Xano
      const result = await this.dailyEquityService.postDailyEquityToXano(equityData);
      
      this.logger.log('Daily equity data synced successfully');
      return result;

    } catch (error) {
      this.logger.error(`Failed to sync daily equity data: ${error.message}`);
      throw new HttpException('Failed to sync daily equity data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
