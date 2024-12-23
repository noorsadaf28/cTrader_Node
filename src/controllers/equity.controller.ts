import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { DailyEquityService } from 'src/services/exchange/cTrader/daily_equity.service';
import { IEvaluationInterface } from 'src/services/Interfaces/IEvaluation.interface';

@Controller('daily-equity')
export class DailyEquityController {
  private readonly logger = new Logger(DailyEquityController.name);

  constructor(
    private readonly dailyEquityService: DailyEquityService,
    @Inject('IEvaluationInterface') private readonly IEvaluationInterface: IEvaluationInterface,
  ) {}
// Fetch daily equity data for the past day and create new rows in Xano
  @Get('sync')
async syncDailyEquityData() {
  this.logger.log('Received request to sync daily equity data');

  try {
    const fromDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const toDate = new Date().toISOString(); // now

    // Fetch data
    const equityData = await this.dailyEquityService.fetchDailyEquityData(fromDate, toDate);
    if (!equityData || !Array.isArray(equityData)) {
      this.logger.error('Equity data is empty or malformed');
      throw new HttpException('Failed to fetch daily equity data', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Equity data fetched: ${JSON.stringify(equityData, null, 2)}`);

    // Insert new rows in Xano
    const result = await this.dailyEquityService.createDailyEquityInXano(equityData);

    this.logger.log('Daily equity data synced successfully');
    return result;
  } catch (error) {
    this.logger.error(`Failed to sync daily equity data: ${error.message}`, error.stack);
    throw new HttpException('Failed to sync daily equity data', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


  @Get('getEquity')
  @HttpCode(HttpStatus.OK)
  async updateAccount(@Body() body) {
    if (!body || !body.equity_update_id) {
      this.logger.error('Invalid request body, equity_update_id is required');
      throw new HttpException('Invalid request body', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await this.IEvaluationInterface.getDailyEquity(body.equity_update_id);
      if (!response) {
        this.logger.error('No response from getDailyEquity');
        throw new HttpException('No data found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Equity data retrieved: ${JSON.stringify(response, null, 2)}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to fetch account details for request: ${JSON.stringify(body)}`,
        error.stack,
      );
      throw new HttpException('Failed to retrieve account details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
