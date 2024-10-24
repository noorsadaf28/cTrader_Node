import { Controller, Post, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { AccountService } from 'src/services/exchange/cTrader/account.service';
import { CreateTraderDto } from 'src/dto/create-trader.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';  // Import JWT Guard

@Controller('account')
export class AccountController {
  constructor(private readonly accountCreationService: AccountService) {}

  // Protect this route with JWT
  // @UseGuards(JwtAuthGuard)
  @Post('create-with-ctid')
  async createAccountWithCTID(
    @Body() createTraderDto: CreateTraderDto,
    @Body('email') userEmail: string,  // Email is now extracted properly
    @Body('preferredLanguage') preferredLanguage: string,
  ) {
    try {
      // Logging the incoming request data for validation
      console.log('Received request to create account with cTID');
      console.log('Email:', userEmail);
      console.log('Preferred Language:', preferredLanguage);

      // Ensure the email and language are provided
      if (!userEmail || !preferredLanguage) {
        throw new HttpException('Email and Preferred Language are required', HttpStatus.BAD_REQUEST);
      }

      // Call the service to handle account and cTID creation
      const response = await this.accountCreationService.createAccountWithCTID(createTraderDto, userEmail, preferredLanguage);
      
      console.log('Successfully created account and linked to cTID:', response);
      return response;
      
    } catch (error) {
      console.error('Error in account creation controller:', error.message);
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


// import { Controller, Post, Body, Get, Param, Query, HttpException, HttpStatus, UsePipes, Put, Patch, Delete } from '@nestjs/common';
// import { AccountService } from './account.service';
// import { CreateTraderDto } from './dto/create-trader.dto';
// import { ValidationPipe } from '../common/pipes/validation.pipe';
// import { UpdateTraderDto } from './dto/update-trader.dto';

// @Controller('account')
// export class AccountController {
//   constructor(private readonly accountService: AccountService) {}

//   @Post('trader/create')
//   @UsePipes(new ValidationPipe())
//   async createTrader(@Body() createTraderDto: CreateTraderDto) {
//     console.log('Received request to create trader');
//     try {
//       const trader = await this.accountService.createTrader(createTraderDto);
//       console.log('Trader created successfully:', trader);
//       return trader;
//     } catch (error) {
//       console.error('Error creating trader:', error.message);
//       throw new HttpException(
//         { message: 'Trader creation failed', error: error.message },
//         HttpStatus.BAD_REQUEST,
//       );
//     }
//   }

//   @Get('traders')
//   async getMultipleTraders(
//     @Query('from') from: string,
//     @Query('to') to: string,
//     @Query('fromLastDealTimestamp') fromLastDealTimestamp?: string,
//     @Query('toLastDealTimestamp') toLastDealTimestamp?: string,
//     @Query('groupId') groupId?: number
//   ) {
//     console.log('Received request to fetch multiple traders');
//     try {
//       const traders = await this.accountService.getMultipleTraders(from, to, fromLastDealTimestamp, toLastDealTimestamp, groupId);
//       return traders;
//     } catch (error) {
//       console.error('Error fetching multiple traders:', error.message);
//       throw new HttpException('Could not fetch traders', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   @Put('trader/:login')
// @UsePipes(new ValidationPipe())
// async updateTrader(@Param('login') login: number, @Body() updateTraderDto: UpdateTraderDto) {
//   console.log(`Received request to update trader with login: ${login}`);
//   try {
//     await this.accountService.updateTrader(login, updateTraderDto);
//     return; // No output expected
//   } catch (error) {
//     console.error('Error updating trader:', error.message);
//     throw new HttpException('Could not update trader', HttpStatus.INTERNAL_SERVER_ERROR);
//   }
// }

// @Patch('trader/:login')
// @UsePipes(new ValidationPipe())
// async updateTraderPartial(@Param('login') login: number, @Body() updateTraderDto: UpdateTraderDto) {
//   console.log(`Received request to partially update trader with login: ${login}`);
//   try {
//     await this.accountService.updateTraderPartial(login, updateTraderDto);
//     return; // No output expected
//   } catch (error) {
//     console.error('Error partially updating trader:', error.message);
//     throw new HttpException('Could not partially update trader', HttpStatus.INTERNAL_SERVER_ERROR);
//   }
// }


//   @Delete('trader/:login')
//   async deleteTrader(@Param('login') login: number) {
//     console.log(`Received request to delete trader with login: ${login}`);
//     try {
//       await this.accountService.deleteTrader(login);
//       return; // No output expected
//     } catch (error) {
//       console.error('Error deleting trader:', error.message);
//       throw new HttpException('Could not delete trader', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }
