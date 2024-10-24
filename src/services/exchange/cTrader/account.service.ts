import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { IAccountService } from 'src/services/Interfaces/IAccount.interface';
import { SpotwareService } from './spotware.account.service';
import { CreateTraderDto } from 'src/dto/create-trader.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from 'src/entity/account.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AccountService implements IAccountService {
  constructor(
    private readonly spotwareService: SpotwareService,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    
  ) {
    console.log('AccountService initialized');
  }

  async findByUserId(userId: number): Promise<Account | undefined> {
    console.log(`Searching for account with userId: ${userId}`);
    const account = await this.accountRepository.findOne({ where: { userId } });
    if (account) {
      console.log(`Found account with userId: ${userId}`);
    } else {
      console.error(`No account found with userId: ${userId}`);
    }
    return account;
  }

  async createAccountWithCTID(
    createTraderDto: CreateTraderDto,
    userEmail: string,
    preferredLanguage: string
  ): Promise<{ ctid: number; traderLogin: string; ctidTraderAccountId: number; message?: string }> {
    try {
      console.log('Creating cTID with email:', userEmail);
      const ctidResponse = await this.spotwareService.createCTID(userEmail, preferredLanguage);
      const userId = ctidResponse.userId;

      if (!userId) {
        console.error('Failed to retrieve userId from Spotware API');
        throw new HttpException('Failed to create cTID', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      console.log('cTID created successfully with userId:', userId);

      const existingAccount = await this.findByUserId(userId);

      if (existingAccount) {
        const message = 'Account already exists in cTrader with this userId';
        console.log(message);
        return {
          ctid: existingAccount.userId,
          traderLogin: existingAccount.traderLogin,
          ctidTraderAccountId: existingAccount.ctidTraderAccountId,
          // token: existingAccount.token,
          message, // Return the message along with the existing account details
        };
      }

      console.log('Creating Trader Account with provided trader data');
      const traderResponse = await this.spotwareService.createTrader(createTraderDto);
      const traderLogin = traderResponse.login;

      if (!traderLogin) {
        console.error('Failed to retrieve traderLogin from Spotware API');
        throw new HttpException('Failed to create Trader Account', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      console.log('Trader account created successfully with login:', traderLogin);

      console.log('Linking Trader Account to cTID');
      const linkResponse = await this.linkAccountToCTID(
        traderLogin,
        userId,
        createTraderDto.brokerName,
        createTraderDto.hashedPassword
      );

      if (!linkResponse.ctidTraderAccountId) {
        console.error('Failed to link Trader Account to cTID');
        throw new HttpException('Failed to link Trader Account to cTID', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      console.log('Account linked successfully to cTID with ID:', linkResponse.ctidTraderAccountId);

    

     

      const newAccount = this.accountRepository.create({
        userId,
        traderLogin,
        ctidTraderAccountId: linkResponse.ctidTraderAccountId,
        email: userEmail,
        preferredLanguage,
        accessRights: createTraderDto.accessRights,
        accountType: createTraderDto.accountType,
        balance: createTraderDto.balance,
        brokerName: createTraderDto.brokerName,
        contactDetails: createTraderDto.contactDetails,
        depositCurrency: createTraderDto.depositCurrency,
        groupName: createTraderDto.groupName,
        hashedPassword: createTraderDto.hashedPassword,
        leverageInCents: createTraderDto.leverageInCents,
        totalMarginCalculationType: createTraderDto.totalMarginCalculationType,
     
      });

      await this.saveAccountLocally(newAccount);

      console.log(`Account with login ${traderLogin} created locally and token stored.`);

      return {
        ctid: userId,
        traderLogin,
        ctidTraderAccountId: linkResponse.ctidTraderAccountId,
        // token: jwtToken,
      };
    } catch (error) {
      console.error('Error during account creation with cTID:', error.message);
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Implementing the linkAccountToCTID method from IAccountService
  async linkAccountToCTID(
    traderLogin: number,
    userId: number,
    brokerName: string,
    hashedPassword: string
  ): Promise<any> {
    console.log(`Linking account for traderLogin: ${traderLogin}, userId: ${userId}`);
    return this.spotwareService.linkAccountToCTID(traderLogin, userId, brokerName, hashedPassword);
  }

  // Implementing the saveAccountLocally method from IAccountService
  async saveAccountLocally(accountDetails: any): Promise<any> {
    console.log(`Saving account locally for userId: ${accountDetails.userId}`);
    return this.accountRepository.save(accountDetails);
  }
}








// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Account } from './account.entity';
// import { CreateTraderDto } from './dto/create-trader.dto';
// import { SpotwareService } from './spotware.service'; // Import SpotwareService
// import { UpdateTraderDto } from './dto/update-trader.dto';

// @Injectable()
// export class AccountService {
//   constructor(
//     private readonly spotwareService: SpotwareService, // Inject SpotwareService
//     @InjectRepository(Account) private readonly accountRepository: Repository<Account>
//   ) {}

//   async createTrader(createTraderDto: CreateTraderDto) {
//     try {
//       console.log('Creating trader locally and on Spotware...');
      
//       // Step 1: Create trader on Spotware API
//       const spotwareResponse = await this.spotwareService.createTrader(createTraderDto);

//       // Step 2: Extract the `login` from Spotware's response
//       const login = spotwareResponse.login; // Assuming `login` comes from Spotware response

//       console.log('Trader created on Spotware. Login:', login);

//       // Step 3: Create and save the trader locally using the `login`
//       const trader = this.accountRepository.create({ ...createTraderDto, login });
//       const savedTrader = await this.accountRepository.save(trader);

//       console.log('Trader saved locally:', savedTrader);
//       return savedTrader;
//     } catch (error) {
//       console.error('Error creating trader:', error.message);
//       throw new HttpException('Could not create trader', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   async getTraderDetails(id: number) {
//     try {
//       console.log('Fetching trader details locally with ID:', id);
//       const trader = await this.accountRepository.findOne({ where: { id } });
//       if (!trader) {
//         throw new HttpException('Trader not found locally', HttpStatus.NOT_FOUND);
//       }
//       console.log('Trader found locally:', trader);
//       return trader;
//     } catch (error) {
//       console.error('Error fetching trader details:', error.message);
//       throw new HttpException('Could not fetch trader details', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   async getTraderDetailsFromSpotware(login: string) {
//     try {
//       console.log('Fetching trader details from Spotware for login:', login);
//       return await this.spotwareService.getTraderDetails(login);
//     } catch (error) {
//       console.error('Error fetching trader details from Spotware:', error.message);
//       throw new HttpException('Could not fetch trader details from Spotware', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
//   async getMultipleTraders(from: string, to: string, fromLastDealTimestamp?: string, toLastDealTimestamp?: string, groupId?: number) {
//     console.log('Fetching multiple traders from Spotware API...');
//     try {
//       const response = await this.spotwareService.getMultipleTraders({
//         from,
//         to,
//         fromLastDealTimestamp,
//         toLastDealTimestamp,
//         groupId,
//       });
//       console.log('Received multiple traders:', response);
      
//       // Optionally, save received traders locally
//       for (const traderData of response.trader) {
//         const existingTrader = await this.accountRepository.findOne({ where: { login: traderData.login } });
//         if (!existingTrader) {
//           await this.accountRepository.save(traderData); // Save if it doesn't exist
//           console.log(`Saved new trader locally: ${traderData.login}`);
//         }
//       }
//       return response;
//     } catch (error) {
//       console.error('Error fetching multiple traders:', error.message);
//       throw new HttpException('Could not fetch traders', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   async updateTrader(login: any, updateTraderDto: UpdateTraderDto) {
//     console.log(`Updating trader with login: ${login}`);
  
//     try {
//       // Step 1: Fetch the existing trader data from Spotware
//       const existingTrader = await this.spotwareService.getTraderDetails(login);
  
//       // Step 2: Merge the existing data with the new data, excluding 'balance'
//       const updatedTrader = {
//         ...existingTrader,  // Keep existing values
//         ...updateTraderDto  // Override with new values, but balance is not allowed
//       };
  
//       // Step 3: Remove balance from the update if it exists
//       delete updatedTrader.balance;
  
//       console.log('Merged updated trader data (without balance):', updatedTrader);
  
//       // Step 4: Send the merged data to Spotware's update API
//       await this.spotwareService.updateTrader(login, updatedTrader);
//       console.log('Trader updated successfully in Spotware');
  
//       // Step 5: Update the local trader record, excluding 'balance'
//       const { balance, ...localUpdateData } = updateTraderDto;  // Exclude 'balance' from local update
//       await this.accountRepository.update({ login }, localUpdateData);
//       console.log('Local trader record updated successfully, excluding balance');
//       return;
//     } catch (error) {
//       console.error('Error updating trader:', error.message);
//       throw new HttpException('Could not update trader', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
  
  
  
  
//   async updateTraderPartial(login: any, updateTraderDto: UpdateTraderDto) {
//     console.log(`Partially updating trader with login: ${login}`);
  
//     try {
//       // Step 1: Fetch the existing trader data from Spotware
//       const existingTrader = await this.spotwareService.getTraderDetails(login);
  
//       // Step 2: Merge the existing data with the new data, excluding 'balance'
//       const updatedTrader = {
//         ...existingTrader,  // Keep existing values
//         ...updateTraderDto  // Override with new values, but balance is not allowed
//       };
  
//       // Step 3: Remove balance from the update if it exists
//       delete updatedTrader.balance;
  
//       console.log('Merged partially updated trader data (without balance):', updatedTrader);
  
//       // Step 4: Send the merged data to Spotware's partial update API
//       await this.spotwareService.updateTraderPartial(login, updatedTrader);
//       console.log('Trader partially updated successfully in Spotware');
  
//       // Step 5: Update the local trader record, excluding 'balance'
//       const { balance, ...localUpdateData } = updateTraderDto;  // Exclude 'balance' from local update
//       await this.accountRepository.update({ login }, localUpdateData);
//       console.log('Local trader record partially updated successfully, excluding balance');
//       return;
//     } catch (error) {
//       console.error('Error partially updating trader:', error.message);
//       throw new HttpException('Could not partially update trader', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
  
  
  

//   async deleteTrader(login: any) {
//     console.log(`Deleting trader with login: ${login}`);
//     try {
//       await this.spotwareService.deleteTrader(login);
//       console.log('Trader deleted successfully from Spotware');

//       // Delete local trader record
//       await this.accountRepository.delete({ login });
//       console.log('Local trader record deleted successfully');
//       return;
//     } catch (error) {
//       console.error('Error deleting trader:', error.message);
//       throw new HttpException('Could not delete trader', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }