import { Controller, Get, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { DailyEquityService } from 'src/services/exchange/cTrader/daily_equity.service';

@Controller('daily-equity')
export class DailyEquityController {
  private readonly logger = new Logger(DailyEquityController.name);

  constructor(private readonly dailyEquityService: DailyEquityService) {}

  // Fetch daily equity data for the past day and create new rows in Xano
  @Get('sync')
  async syncDailyEquityData() {
    this.logger.log('Received request to sync daily equity data');

    try {
      const fromDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const toDate = new Date().toISOString(); // now
      
      // Fetch data from the external service
      const equityData = await this.dailyEquityService.fetchDailyEquityData(fromDate, toDate);
      
      // Insert new rows in Xano
      const result = await this.dailyEquityService.createDailyEquityInXano(equityData);
      
      this.logger.log('Daily equity data synced successfully');
      return result;

    } catch (error) {
      this.logger.error(`Failed to sync daily equity data: ${error.message}`);
      throw new HttpException('Failed to sync daily equity data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}




// import { Controller, Get, HttpException, HttpStatus, Logger } from '@nestjs/common';
// import { DailyEquityService } from 'src/services/exchange/cTrader/daily_equity.service';

// @Controller('daily-equity')
// export class DailyEquityController {
//   private readonly logger = new Logger(DailyEquityController.name);

//   constructor(private readonly dailyEquityService: DailyEquityService) {}

//   // Fetch daily equity data for the past day and sync it with Xano
//   @Get('sync')
//   async syncDailyEquityData() {
//     this.logger.log('Received request to sync daily equity data');

//     try {
//       const fromDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
//       const toDate = new Date().toISOString(); // now
      
//       // Fetch data from the external service
//       const equityData = await this.dailyEquityService.fetchDailyEquityData(fromDate, toDate);
      
//       // Check and update or create data in Xano
//       const result = await this.dailyEquityService.checkAndUpdateDailyEquityInXano(equityData);
      
//       this.logger.log('Daily equity data synced successfully');
//       return result;

//     } catch (error) {
//       this.logger.error(`Failed to sync daily equity data: ${error.message}`);
//       throw new HttpException('Failed to sync daily equity data', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }
