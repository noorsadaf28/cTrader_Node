import { CreateTraderDto } from "src/dto/create-trader.dto";

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
    message?: string;
  }>;

  linkAccountToCTID(
    traderLogin: number,
    userId: number,
    brokerName: string,
    hashedPassword: string
  ): Promise<any>;
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
