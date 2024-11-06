import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountModule } from './module/account.module';
import { OrderModule } from './module/order.module';
import { DailyEquityModule } from './module/dailyEquity.module';
import { AppLogger } from './services/loggers/winston.config';

import { CtraderAccountService } from './services/exchange/cTrader/account.service';
import { CtraderBotService } from './services/exchange/cTrader/bot.service';
import { CtraderEvaluationService } from './services/exchange/cTrader/evaluation.service';
import { CtraderOrderService } from './services/exchange/cTrader/order.service';
import { CtraderConnectionService } from './services/exchange/cTrader/connection.service';
import { CtraderAuthService } from './services/exchange/cTrader/auth.service';
import { SpotwareService } from './services/exchange/cTrader/spotware.account.service';

import { EvaluationController } from './controllers/evaluation.controller';
import { BotController } from './controllers/bot.controller';
import { AuthController } from './controllers/auth.controller';
import { AccountController } from './controllers/account.controller';
import { OrderController } from './controllers/order.controller';
import { DailyEquityController } from './controllers/equity.controller';

import { OrderPollingService } from './services/exchange/cTrader/order.polling.service';
import { EvaluationBotProcess } from './services/botProcess/evaluationBot.process';
import { IOrderPollingService } from './services/Interfaces/IOrderPollingService';
import { activeBotQueue } from 'config/constant';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    AccountModule,
    DailyEquityModule,
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: activeBotQueue,
      defaultJobOptions: {
        attempts: 2,
      },
    }),
  ],
  controllers: [
    AppController,
    EvaluationController,
    BotController,
    AuthController,
    AccountController,
    OrderController,
    DailyEquityController,
  ],
  providers: [
    AppService,
    AppLogger, // Add AppLogger here
    {
      provide: 'IAccountInterface',
      useClass: process.env.exchange === 'CTRADER' ? CtraderAccountService : CtraderAccountService,
    },
    {
      provide: 'IBotInterface',
      useClass: process.env.exchange === 'CTRADER' ? CtraderBotService : CtraderBotService,
    },
    {
      provide: 'IBotProcessInterface',
      useClass: process.env.botType === 'Evaluation' ? EvaluationBotProcess : EvaluationBotProcess,
    },
    {
      provide: 'IEvaluationInterface',
      useClass: process.env.exchange === 'CTRADER' ? CtraderEvaluationService : CtraderEvaluationService,
    },
    {
      provide: 'IOrderInterface',
      useClass: process.env.exchange === 'CTRADER' ? CtraderOrderService : CtraderOrderService,
    },
    {
      provide: 'IConnectionInterface',
      useClass: process.env.exchange === 'CTRADER' ? CtraderConnectionService : CtraderConnectionService,
    },
    {
      provide: 'IAuthInterface',
      useClass: process.env.exchange === 'CTRADER' ? CtraderAuthService : CtraderAuthService,
    },
    {
      provide: 'IOrderPollingService',
      useClass: process.env.exchange === 'CTRADER' ? OrderPollingService : OrderPollingService,
    },
    SpotwareService,
    OrderPollingService,
    ConfigService,
  ],
})
export class AppModule {
  constructor(private readonly appLogger: AppLogger) {
    appLogger.log('Application Module initialized'); // Log module initialization
  }
}
