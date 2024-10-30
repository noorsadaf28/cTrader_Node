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
import { BotController } from './controllers/bot.controller';
import { BullModule } from '@nestjs/bull';
import { activeBotQueue } from 'config/constant';
import { ExpressAdapter } from '@nestjs/platform-express';
import { CtraderAuthService } from './services/exchange/cTrader/auth.service';
import { AuthController } from './controllers/auth.controller';
import { SpotwareService } from './services/exchange/cTrader/spotware.account.service';
import { AccountController } from './controllers/account.controller';
import { OrderController } from './controllers/order.controller';
import { OrderPollingService } from './services/exchange/cTrader/order.polling.service';

@Module({
  imports: [ 
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Removed TypeORM configuration as it's no longer needed
    ScheduleModule.forRoot(),
    AccountModule,
     // BULLMQ
     BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
      
    }),

      BullModule.registerQueue({
        name: activeBotQueue,
        defaultJobOptions: {
          attempts: 2
        },},
    ),
   
    // config
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),],
  controllers: [AppController, EvaluationController, BotController, AuthController, AccountController, OrderController],
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
    {
      provide:'IAuthInterface',
      useClass:
      process.env.exchange === 'CTRADER'? CtraderAuthService: CtraderAuthService
      
    },
    SpotwareService, OrderPollingService, ConfigService,
  ],
})
export class AppModule {}
