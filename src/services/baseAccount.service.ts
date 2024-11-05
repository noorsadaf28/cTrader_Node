import axios from "axios";
import { IAccountInterface } from "./Interfaces/IAccount.interface";
import { CreateTraderDto } from "src/dto/create-trader.dto";
import { ConfigService } from "@nestjs/config";
import { SpotwareService } from "./exchange/cTrader/spotware.account.service";
import { HttpException , HttpStatus} from "@nestjs/common";

export abstract class BaseAccountService implements IAccountInterface{
  private readonly spotwareApiUrl: string;
    private readonly apiToken: string;
    constructor(
    private readonly configService: ConfigService,
    private readonly spotwareService: SpotwareService,
    
  ) {
    
        this.spotwareApiUrl = process.env.SPOTWARE_API_URL;
        this.apiToken = process.env.SPOTWARE_API_TOKEN;
  }
    async createAccountWithCTID(req){
        try {
          console.log("here")
          const xanoApiUrl = process.env.XANO_API_URL_1;
        console.log('AccountService initialized with Xano');
          console.log('Creating cTID with email:', req.email);
          const ctidResponse = await this.createCTID(req.email, req.preferredLanguage);
          const userId = parseInt(ctidResponse.userId);
          console.log("🚀 ~ BaseAccountService ~ userId:", userId)
    
          if (!userId) {
            throw new HttpException('Failed to create cTID', HttpStatus.INTERNAL_SERVER_ERROR);
          }
          
          const createTrader = await this.createReq(req);
          console.log("🚀 ~ BaseAccountService ~ createAccountWithCTID ~ createTrader:", createTrader)
          const traderResponse = await this.createTrader(createTrader);
          console.log("🚀 ~ BaseAccountService ~ createAccountWithCTID ~ traderResponse:", traderResponse)
          if(!traderResponse.login){
            return traderResponse;
          }
          const traderLogin = traderResponse.login;
    
          const linkResponse = await this.linkAccountToCTID(
            traderLogin,
            userId,
            createTrader.brokerName,
            createTrader.hashedPassword
          );
          const dataJson= {
            "uuid": "jsjnsj",
            "accounts": [{
                id:userId,
                status:"Active",
                currency:req.depositCurrency,
                initialBalance : req.balance,
                finalBalance: req.balance
            }]
          }
    
          const response = await axios.post(xanoApiUrl,dataJson );
    
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
    async AccountDetails(res){
        try{
          const accountId= res.accountId;
          console.log("🚀 ~ BaseAccountService ~ AccountDetails ~ accountId:", accountId)
          const token = process.env.token;
          const url = `${process.env.accountinfo}${accountId}`;
    
          const response = await axios.get(url,{headers: { Authorization: `Bearer ${token}` },
            params: { token: token }});
          console.log("🚀 ~ BaseAccountService ~ AccountDetails ~ response:", response.data)
          return response.data;
    
        }
        catch(error){
          console.log("🚀 ~ CtraderAccountService ~ AccountDetails ~ error:", error)
          
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
      async createTrader(createTrader){
        try {
          const response = await axios.post(`${this.spotwareApiUrl}/v2/webserv/traders`, createTrader, {
            headers: { Authorization: `Bearer ${this.apiToken}` },
            params: { token: this.apiToken },
          });
          return response.data;
        } catch (error) {
          console.log("🚀 ~ BaseAccountService ~ createTrader ~ error:", error.response.data)
          return error.response.data;
          //throw new HttpException('Failed to create Trader Account', HttpStatus.INTERNAL_SERVER_ERROR);
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
      async createReq(req){
        try{
          const accessRights = process.env.fullAccess;
          const accountType = process.env.hedged;
          const balance = req.balance;
          const brokerName = process.env.brokerName;
          const depositCurrency = req.depositCurrency;
          const groupName = process.env.groupName;
          const hashedPassword = process.env.hashedPassword;
          const leverageInCents = 10000;
          const totalMarginCalculationType = process.env.margingType;
          const createTrader = {
            accessRights, accountType, balance, brokerName, depositCurrency, groupName, hashedPassword, leverageInCents, totalMarginCalculationType
          }
          return createTrader;
        }
        catch(error){
          console.log("🚀 ~ BaseAccountService ~ createDto ~ error:", error)
          
        }
        
      }
    
}