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
    async createAccountWithCTID(
        createTraderDto: CreateTraderDto,
        userEmail: string,
        preferredLanguage: string,
        depositCurrency:string
        , balance:string
      ): Promise<{ ctid: number; traderLogin: string; ctidTraderAccountId: number; message?: string }> {
        try {
          const xanoApiUrl = process.env.XANO_API_URL_1;
        console.log('AccountService initialized with Xano');
          console.log('Creating cTID with email:', userEmail);
          const ctidResponse = await this.createCTID(userEmail, preferredLanguage);
          const userId = parseInt(ctidResponse.userId);
          console.log("🚀 ~ BaseAccountService ~ userId:", userId)
    
          if (!userId) {
            throw new HttpException('Failed to create cTID', HttpStatus.INTERNAL_SERVER_ERROR);
          }
    
          const traderResponse = await this.createTrader(createTraderDto);
          const traderLogin = traderResponse.login;
    
          if (!traderLogin) {
            throw new HttpException('Failed to create Trader Account', HttpStatus.INTERNAL_SERVER_ERROR);
          }
    
          const linkResponse = await this.linkAccountToCTID(
            traderLogin,
            userId,
            createTraderDto.brokerName,
            createTraderDto.hashedPassword
          );
          const dataJson= {
            "uuid": "jsjnsj",
            "accounts": [{
                id:userId,
                status:"Active",
                currency:depositCurrency,
                initialBalance : balance,
                finalBalance: balance
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
          console.error('Error in createAccountWithCTID:', error.message);
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
          console.log("🚀 ~ CtraderAccountService ~ AccountDetails ~ error:", error.data)
          
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
      async createTrader(createTraderDto: CreateTraderDto): Promise<any> {
        try {
          const response = await axios.post(`${this.spotwareApiUrl}/v2/webserv/traders`, createTraderDto, {
            headers: { Authorization: `Bearer ${this.apiToken}` },
            params: { token: this.apiToken },
          });
          return response.data;
        } catch (error) {
          throw new HttpException('Failed to create Trader Account', HttpStatus.INTERNAL_SERVER_ERROR);
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
    
}