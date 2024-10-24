import { CreateTraderDto } from "src/dto/create-trader.dto";
import { Account } from 'src/entity/account.entity';

// Interface for AccountService
export interface IAccountService {
  createAccountWithCTID(
    createTraderDto: CreateTraderDto,
    userEmail: string,
    preferredLanguage: string
  ): Promise<{
    ctid: number;
    traderLogin: string;
    ctidTraderAccountId: number;
    // token: string;
    
  }>;

  findByUserId(userId: number): Promise<Account | undefined>;

  linkAccountToCTID(
    traderLogin: number,
    userId: number,
    brokerName: string,
    hashedPassword: string
  ): Promise<any>;

  saveAccountLocally(accountDetails: any): Promise<any>;
}

// Interface for SpotwareService
export interface ISpotwareService {
  createCTID(email: string, preferredLanguage: string): Promise<any>;

  createTrader(createTraderDto: CreateTraderDto): Promise<any>;

  linkAccountToCTID(
    traderLogin: number,
    userId: number,
    brokerName: string,
    traderPasswordHash: string
  ): Promise<any>;
}
