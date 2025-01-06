import axios from "axios";
import { IAccountInterface } from "./Interfaces/IAccount.interface";
import { CreateTraderDto } from "src/dto/create-trader.dto";
import { ConfigService } from "@nestjs/config";
import { SpotwareService } from "./exchange/cTrader/spotware.account.service";
import { HttpException, HttpStatus } from "@nestjs/common";
import { v4 as uuidv4 } from 'uuid'; // Import the UUID function
import * as dayjs from 'dayjs';
import { AxiosResponse } from 'axios';
import * as https from 'https'; 
import { Cron } from '@nestjs/schedule';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

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
      const MakeUrl = process.env.MAKEENDPOINT_URL;
      const xanoDailyEquityUrl=process.env.XANO_API_EQUITYURL;
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
        uuid: generatedUuid,
        accounts: [{
          id: traderLogin,
          status: process.env.active,
          currency: req.Currency,
          initial_balance: req.Initial_balance,
          final_balance: req.Initial_balance
        }],
        // Additional fields for Make endpoint
        Account: traderLogin.toString(), // Convert to string as it was hardcoded in the example
        Platform: "CTrader",
        ChallengeID: req.ChallengeID || "1292" // Use the ChallengeID from the request if available, otherwise use a default
      };
      
      
      // Enhanced console log to display data types and values for each property in accounts
      console.log("Data Structure and Types for accounts[0]:");
      console.log("UUID:", generatedUuid, "| Type:", typeof generatedUuid);
      console.log("ID:", dataJson.accounts[0].id, "| Type:", typeof dataJson.accounts[0].id);
      console.log("Status:", dataJson.accounts[0].status, "| Type:", typeof dataJson.accounts[0].status);
      console.log("Currency:", dataJson.accounts[0].currency, "| Type:", typeof dataJson.accounts[0].currency);
      console.log("Initial Balance:", dataJson.accounts[0].initial_balance, "| Type:", typeof dataJson.accounts[0].initial_balance);
      console.log("Final Balance:", dataJson.accounts[0].final_balance, "| Type:", typeof dataJson.accounts[0].final_balance);
      


      const response = await axios.post(xanoApiUrl, dataJson);
      const response1 = await axios.post(MakeUrl, dataJson);


      // Create daily equity data
    const dailyEquityData = {
      account: traderLogin,
      starting_daily_equity: traderResponse.balance,
      sde_date:dayjs().tz('Europe/Madrid').format('YYYY.MM.DD HH:mm:ss'), // For local time
      gmt_date: dayjs().tz('UTC').format('YYYY.MM.DD HH:mm:ss'),          // For UTC
      created_at: dayjs().toISOString(),
      status: 'pending',
      trading_days: '0',
      challenge_begins:(dayjs(Date.now()).format('YYYY.MM.DD')).toString(),
      new_status: 'sent'
    };

    const response2 = await axios.post(xanoDailyEquityUrl, dailyEquityData);

    console.log('Account created in Make:', response1.data);
    console.log('Account created in Xano:', response.data);
    console.log('Daily equity data created in Xano:', response2.data);

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
      //console.log("🚀 ~ BaseAccountService ~ AccountDetails ~ accountId:", accountId);
      const token = process.env.token;
      const url = `${process.env.accountinfo}${accountId}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { token: token }
      });
      //console.log("🚀 ~ BaseAccountService ~ AccountDetails ~ response:", response.data);
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
    console.log("🚀 ~ BaseAccountService ~ createTrader ~ createTrader:", createTrader)
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
      //const leverageInCents = req.Leverage;
      const leverageInCents = await this.calculateLeverageInCents(req.Leverage);
      const totalMarginCalculationType = process.env.margingType;
      const createTrader = {
        accessRights, accountType, balance, brokerName, depositCurrency, groupName, hashedPassword, leverageInCents, totalMarginCalculationType
      };
      return createTrader;
    } catch (error) {
      console.log("🚀 ~ BaseAccountService ~ createReq ~ error:", error);
    }
  }


  async UpdateAccount(req) {

    if (!req.accountId) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Account ID is required',
      error: true,
    };
  }
  if (!req.accessRights) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Access rights are required',
      error: true,
    };
  }

  console.log("Updating account with request:", req);
  try {
    const updateData = {
      accessRights: req.accessRights
    };
    const updateUrl = `${this.spotwareApiUrl}/v2/webserv/traders/${req.accountId}`;

    const response = await axios.patch(updateUrl, updateData, {
      headers: { Authorization: `Bearer ${this.apiToken}` },
      params: { token: this.apiToken },
    });

    console.log("Account updated successfully:", response.data);
    console.log("response", response.status);

    return {
      statusCode: response.status,
      message: "Account updated successfully",
      error: false
    };
  } catch (error) {
    console.error("Error updating account:", error.response?.data || error.message);
    if (error.code === 'ECONNABORTED') {
      return {
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: "The request timed out. Please try again later.",
        error: true
      };
    }
    if (error.response) {
      const statusCode = error.response.status;
      const errorMessage = error.response.data?.message || "Failed to update account";
      return {
        statusCode,
        message: errorMessage,
        error: true,
        data: error.response.data
      };
    }
    // Fallback for Unknown Errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      error: true,
      data: error.message 
    };
    throw new HttpException('Failed to update account', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


async UpdateAccountBalance(req) {

  console.log("update balance request........");
  console.log("update Account balance request-----",req);
  if (!req.login) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Account ID is required',
      error: true,
    };
  }
  if (!req.preciseAmount) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Access rights are required',
      error: true,
    };
  }
  
  try {

    const updateData = {
      preciseAmount: req.preciseAmount,
      login:req.login,
      type:req.type
    };
    const updateUrl = `${this.spotwareApiUrl}/v2/webserv/traders/${req.login}/changebalance`;
    
    console.log("updateUrl",updateUrl);
  
    const response = await axios.post(updateUrl, updateData, {
      headers: { Authorization: `Bearer ${this.apiToken}` },
      params: { token: this.apiToken },
    });


    console.log("Account updated successfully:", response.data);
    console.log("response", response.status);
    return {
      statusCode: response.status,
      message: "Account Balance updated successfully",
      error: false
    };
   
  } catch (error) {
    console.error("Error updating account:", error.response?.data || error.message);
  }
 }
 async calculateLeverageInCents(ratio:string){
  try{
    //Validate the input ratio format
  const match = ratio.match(/^1:(\d+)$/);
  if (!match) {
    throw new Error('Invalid ratio format. Expected format is 1:X (e.g., 1:100).');
  }

  const leverageValue = parseInt(match[1], 10);
  console.log("🚀 ~ BaseAccountService ~ calculateLeverageInCents ~ leverageValue:", leverageValue)
  return leverageValue * 100; // Multiply the leverage value by 100 to get leverageInCents
  }
  catch(error){
    console.log("🚀 ~ BaseAccountService ~ calculateLeverageInCents ~ error:", error)
  }
}

}
