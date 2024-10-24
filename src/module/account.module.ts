import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountController } from 'src/controllers/account.controller';
import { AccountService } from 'src/services/exchange/cTrader/account.service';
import { Account } from 'src/entity/account.entity';
import { SpotwareService } from 'src/services/exchange/cTrader/spotware.account.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
    forwardRef(() => AuthModule),  // Log when AuthModule is loaded
  ],
  controllers: [AccountController],
  providers: [AccountService, SpotwareService],
  exports: [AccountService],
})
export class AccountModule {
  constructor() {
    console.log('AccountModule initialized');  // Log when AccountModule is initialized
  }
}
