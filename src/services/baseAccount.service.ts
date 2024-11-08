import axios from "axios";
import { IAccountInterface } from "./Interfaces/IAccount.interface";
import { CreateTraderDto } from "src/dto/create-trader.dto";
import { ConfigService } from "@nestjs/config";
import { SpotwareService } from "./exchange/cTrader/spotware.account.service";
import { HttpException, HttpStatus } from "@nestjs/common";
import { v4 as uuidv4 } from 'uuid'; // Import the UUID function

export abstract class BaseAccountService implements IAccountInterface {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly spotwareService: SpotwareService,
  ) {
    this.spotwareApiUrl = process.env.SPOTWARE_API_URL;
    this.apiToken = process.env.SPOTWARE_API_TOKEN;
  }

  async createAccountWithCTID(req) {
    try {
      const xanoApiUrl = process.env.XANO_API_URL_1;
      const ctidResponse = await this.createCTID(req.email, req.preferredLanguage);
      const userId = parseInt(ctidResponse.userId);
      console.log("🚀 ~ BaseAccountService ~ userId:", userId);

      if (!userId) {
        throw new HttpException('Failed to create cTID', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Generate a new UUID for this account
      const generatedUuid = uuidv4();
      console.log("🚀 ~ BaseAccountService ~ Generated UUID:", generatedUuid);

      const createTrader = await this.createReq(req);
      console.log("🚀 ~ BaseAccountService ~ createTrader:", createTrader);

      const traderResponse = await this.createTrader(createTrader);
      console.log("🚀 ~ BaseAccountService ~ traderResponse:", traderResponse);

      if (!traderResponse.login) {
        return traderResponse;
      }
      const traderLogin = traderResponse.login;

      const linkResponse = await this.linkAccountToCTID(
        traderLogin,
        userId,
        createTrader.brokerName,
        createTrader.hashedPassword
      );

      const dataJson = {
        "uuid": generatedUuid, // Use the generated UUID here
        "accounts": [{
          id: userId,
          status: process.env.active,
          currency: req.Currency,
          initialBalance: req.Initial_balance,
          finalBalance: req.Initial_balance
        }]
      };
// Enhanced console log to display data types and values
console.log("Data Structure and Types:");
console.log("UUID:", generatedUuid, "| Type:", typeof generatedUuid);
console.log("User ID:", userId, "| Type:", typeof userId);
console.log("Status:", process.env.active, "| Type:", typeof process.env.active);
console.log("Currency:", req.Currency, "| Type:", typeof req.Currency);
console.log("Initial Balance:", req.Initial_balance, "| Type:", typeof req.Initial_balance);
console.log("Final Balance:", req.Initial_balance, "| Type:", typeof req.Initial_balance);

// Log the entire dataJson object
console.log("Constructed dataJson:", dataJson, "| Type:", typeof dataJson);
      const response = await axios.post(xanoApiUrl, dataJson);
      console.log('Account created in Xano:', response.data);

      return {
        ctid: userId,
        traderLogin,
        ctidTraderAccountId: linkResponse.ctidTraderAccountId,
      };
    } catch (error) {
      console.error('Error in createAccountWithCTID:', error);
      throw new HttpException('Failed to create account with cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async AccountDetails(res) {
    try {
      const accountId = res.accountId;
      console.log("🚀 ~ BaseAccountService ~ AccountDetails ~ accountId:", accountId);
      const token = process.env.token;
      const url = `${process.env.accountinfo}${accountId}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { token: token }
      });
      console.log("🚀 ~ BaseAccountService ~ AccountDetails ~ response:", response.data);
      return response.data;
    } catch (error) {
      console.log("🚀 ~ BaseAccountService ~ AccountDetails ~ error:", error);
    }
  }

  async createCTID(email: string, preferredLanguage: string): Promise<any> {
    try {
      const response = await axios.post(`${this.spotwareApiUrl}/cid/ctid/create`, {
        email,
        preferredLanguage,
      }, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to create cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createTrader(createTrader) {
    try {
      const response = await axios.post(`${this.spotwareApiUrl}/v2/webserv/traders`, createTrader, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      return response.data;
    } catch (error) {
      console.log("🚀 ~ BaseAccountService ~ createTrader ~ error:", error.response.data);
      return error.response.data;
    }
  }

  async linkAccountToCTID(traderLogin: number, userId: number, brokerName: string, traderPasswordHash: string): Promise<any> {
    try {
      const response = await axios.post(`${this.spotwareApiUrl}/cid/ctid/link`, {
        traderLogin,
        userId,
        brokerName,
        traderPasswordHash,
        environmentName: 'demo',
        returnAccountDetails: true,
      }, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to link Trader Account to cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createReq(req) {
    try {
      const accessRights = process.env.fullAccess;
      const accountType = process.env.hedged;
      const balance = req.Initial_balance;
      const brokerName = process.env.brokerName;
      const depositCurrency = req.Currency;
      const groupName = process.env.groupName;
      const hashedPassword = process.env.hashedPassword;
      const leverageInCents = 10000;
      const totalMarginCalculationType = process.env.margingType;
      const createTrader = {
        accessRights, accountType, balance, brokerName, depositCurrency, groupName, hashedPassword, leverageInCents, totalMarginCalculationType
      };
      return createTrader;
    } catch (error) {
      console.log("🚀 ~ BaseAccountService ~ createReq ~ error:", error);
    }
  }
}
