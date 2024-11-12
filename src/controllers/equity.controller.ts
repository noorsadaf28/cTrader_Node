import { Controller, Get, HttpException, HttpStatus, Logger, Param } from '@nestjs/common';
import { DailyEquityService } from 'src/services/exchange/cTrader/daily_equity.service';

@Controller('daily-equity')
export class DailyEquityController {
  private readonly logger = new Logger(DailyEquityController.name);

  constructor(private readonly dailyEquityService: DailyEquityService) {}

  // Endpoint to fetch balance data for a specific user and create new records in Xano
  @Get('sync/:userId')
  async syncDailyEquityData(@Param('userId') userId: number) {
    this.logger.log(`Received request to sync daily equity data for user ID: ${userId}`);

    try {
      // Fetch user balance data from the external service
      const equityData = await this.dailyEquityService.fetchUserBalanceData(userId);

      // Insert new rows in Xano
      const result = await this.dailyEquityService.createDailyEquityInXano([equityData]);

      this.logger.log('Daily equity data synced successfully');
      return result;
    } catch (error) {
      this.logger.error(`Failed to sync daily equity data for user ID ${userId}: ${error.message}`);
      throw new HttpException(`Failed to sync daily equity data for user ID ${userId}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
