import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from './module/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Account } from './entity/account.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Challenge } from './entity/challenge.entity';
import { DailyEquity } from './entity/equity.entity';
import { Order } from './entity/order.entity';
import { Notification } from './entity/notification.entity';
import { User } from './entity/auth.entity';
// import { AuthModule } from './auth/auth.module';
import { OrderModule } from './module/order.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Configure TypeORM asynchronously using environment variables
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: parseInt(configService.get<string>('DATABASE_PORT'), 10),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [Account,Challenge,DailyEquity,Order,Notification,User],
        // entities: [Account,Order], // Replace with your entities
        synchronize: true,  // Make sure to disable in production
        logging: true,
      }),
      inject: [ConfigService],
    }),    
    // Import the AccountModule 
    ScheduleModule.forRoot(),
    OrderModule,AccountModule  ],
  controllers: [AppController], // Register AppController
  providers: [AppService], // Register AppService
})
export class AppModule {}
