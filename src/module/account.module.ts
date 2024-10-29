import { Module, forwardRef } from '@nestjs/common';
import { AccountController } from 'src/controllers/account.controller';
import { CtraderAccountService } from 'src/services/exchange/cTrader/account.service';
import { SpotwareService } from 'src/services/exchange/cTrader/spotware.account.service';


@Module({
  // imports: [
  //   forwardRef(() => AuthModule),  // Forward reference for AuthModule if required
  // ],
  controllers: [AccountController],
  providers: [CtraderAccountService, SpotwareService],
  exports: [CtraderAccountService],
})
export class AccountModule {
  constructor() {
    console.log('AccountModule initialized');  // Log when AccountModule is initialized
  }
}
