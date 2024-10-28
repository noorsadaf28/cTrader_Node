import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CtraderAccountService } from './services/exchange/cTrader/account.service';
import { CtraderBotService } from './services/exchange/cTrader/bot.service';
import { EvaluationProcessService } from './BotType/Evaluation/evaluationProcess.service';
import { CtraderEvaluationService } from './services/exchange/cTrader/evaluation.service';
import { CtraderOrderService } from './services/exchange/cTrader/order.service';
import { CtraderConnectionService } from './services/exchange/cTrader/connection.service';
import { EvaluationController } from './controllers/evaluation.controller';

@Module({
  imports: [ 
    //db
    TypeOrmModule.forRoot({
      type: 'postgres',           // Database type
      host: 'localhost',          // PostgreSQL host
      port: 5432,                 // PostgreSQL port
      username: 'postgres',  // Your PostgreSQL username
      password: '987654321',  // Your PostgreSQL password
      database: 'CtraderDatabase',  // Your PostgreSQL database name
      entities: [__dirname + '/**/*.entity{.ts,.js}'],  // Entities path
      synchronize: true,          // Set to `true` in development mode
    }),
    // config
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),],
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
      
    }
  ], 
})
export class AppModule {}
