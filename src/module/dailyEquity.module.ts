import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DailyEquityService } from 'src/services/exchange/cTrader/daily_equity.service';
import { DailyEquityController } from 'src/controllers/equity.controller';

@Module({
  imports: [HttpModule],
  providers: [DailyEquityService],
  controllers: [DailyEquityController],
  exports: [DailyEquityService],
})
export class DailyEquityModule {
  constructor() {
    console.log('DailyEquityModule initialized');
  }
}
