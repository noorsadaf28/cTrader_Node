import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DailyEquityService } from 'src/services/exchange/cTrader/daily_equity.service';
import { DailyEquityController } from 'src/controllers/equity.controller';
import { CtraderOrderService } from 'src/services/exchange/cTrader/order.service';
import { CtraderEvaluationService } from 'src/services/exchange/cTrader/evaluation.service';
import { CtraderAccountService } from 'src/services/exchange/cTrader/account.service';

@Module({
  imports: [HttpModule],
  providers: [DailyEquityService, {
    provide: 'IOrderInterface', 
    useClass:
    process.env.exchange === 'CTRADER' ? CtraderOrderService: CtraderOrderService
      
  },
  {
    provide: 'IEvaluationInterface',
    useClass: process.env.exchange === 'CTRADER' ? CtraderEvaluationService : CtraderEvaluationService,
  },
  {
    provide: 'IAccountInterface',
    useClass: process.env.exchange === 'CTRADER' ? CtraderAccountService : CtraderAccountService,
  }],
  controllers: [DailyEquityController, ],
  exports: [DailyEquityService],
})
export class DailyEquityModule {
  constructor() {
    console.log('DailyEquityModule initialized');
  }
}
