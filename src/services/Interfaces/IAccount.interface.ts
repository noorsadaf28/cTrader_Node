import { CreateTraderDto } from "src/dto/create-trader.dto";

// Interface for AccountService
export interface IAccountInterface {
  createAccountWithCTID(body);
  UpdateAccount(body);
  UpdateAccountBalance(body)


  // createAccountWithCTID(
  //   createTraderDto: CreateTraderDto,
  //   userEmail: string,
  //   preferredLanguage: string,
  //   depositCurrency:string, balance:string
  // ): Promise<{
  //   ctid: number;
  //   traderLogin: string;
  //   ctidTraderAccountId: number;
  //   message?: string;
  // }>;

  linkAccountToCTID(
    traderLogin: number,
    userId: number,
    brokerName: string,
    hashedPassword: string
  ): Promise<any>;
  AccountDetails(res);
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
