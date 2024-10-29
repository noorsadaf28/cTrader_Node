import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AccountModule } from './module/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderModule } from './module/order.module';
// Removed TypeOrmModule and Order entity

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
  controllers: [AppController], // Register AppController
  providers: [AppService], // Register AppService
})
export class AppModule {}
