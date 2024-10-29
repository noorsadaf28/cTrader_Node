import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AccountModule } from './module/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderModule } from './module/order.module';
// Removed TypeOrmModule and Order entity
import { TypeOrmModule } from '@nestjs/typeorm';
import { CtraderAccountService } from './services/exchange/cTrader/account.service';
import { CtraderBotService } from './services/exchange/cTrader/bot.service';
import { EvaluationProcessService } from './BotType/Evaluation/evaluationProcess.service';
import { CtraderEvaluationService } from './services/exchange/cTrader/evaluation.service';
import { CtraderOrderService } from './services/exchange/cTrader/order.service';
import { CtraderConnectionService } from './services/exchange/cTrader/connection.service';
import { EvaluationController } from './controllers/evaluation.controller';
import { SpotwareService } from './services/exchange/cTrader/spotware.account.service';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Removed TypeORM configuration as it's no longer needed
    ScheduleModule.forRoot(),
    AccountModule,
  ],
  controllers: [AppController, EvaluationController],
  providers:
  [
    AppService,

    {
      provide: 'IAccountInterface', 
      useClass:
      process.env.exchange === 'CTRADER' ? CtraderAccountService: CtraderAccountService
        
    },

    {
    provide:'IBotInterface',
    useClass:
    process.env.exchange === 'CTRADER'? CtraderBotService: CtraderBotService
    
    },
    {
      provide:'IBotProcessInterface',
      useClass:
      process.env.botType === 'Evaluation'? EvaluationProcessService: EvaluationProcessService
      
    },
    {
      provide:'IEvaluationInterface',
      useClass:
      process.env.exchange === 'CTRADER'? CtraderEvaluationService: CtraderEvaluationService
      
    },
    {
      provide:'IOrderInterface',
      useClass:
      process.env.exchange === 'CTRADER'? CtraderOrderService: CtraderOrderService
      
    },
    {
      provide:'IConnectionInterface',
      useClass:
      process.env.exchange === 'CTRADER'? CtraderConnectionService: CtraderConnectionService
      
    },
    SpotwareService
  ],
})
export class AppModule {}
