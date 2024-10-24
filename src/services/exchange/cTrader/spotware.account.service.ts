import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { IAccountService,ISpotwareService } from 'src/services/Interfaces/IAccount.interface';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { CreateTraderDto } from 'src/dto/create-trader.dto';

@Injectable()
export class SpotwareService implements ISpotwareService {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.spotwareApiUrl = this.configService.get<string>('SPOTWARE_API_URL');
    this.apiToken = this.configService.get<string>('SPOTWARE_API_TOKEN');
  }

  async createCTID(email: string, preferredLanguage: string): Promise<any> {
    try {
      console.log('Sending request to Spotware API to create cTID for email:', email);
      const response = await axios.post(`${this.spotwareApiUrl}/cid/ctid/create`, {
        email,
        preferredLanguage,
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        params: {
          token: this.apiToken,
        },
      });
      console.log('Response from Spotware (createCTID):', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating cTID on Spotware:', error.response?.data || error.message);
      throw new HttpException('Failed to create cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createTrader(createTraderDto: CreateTraderDto): Promise<any> {
    try {
      console.log('Sending request to Spotware API to create Trader Account');
      const response = await axios.post(`${this.spotwareApiUrl}/v2/webserv/traders`, createTraderDto, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        params: {
          token: this.apiToken,
        },
      });
      console.log('Response from Spotware (createTrader):', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating Trader Account on Spotware:', error.response?.data || error.message);
      throw new HttpException('Failed to create Trader Account', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async linkAccountToCTID(traderLogin: number, userId: number, brokerName: string, traderPasswordHash: string): Promise<any> {
    try {
      console.log(`Sending request to Spotware API to link Trader (login: ${traderLogin}) to cTID (userId: ${userId})`);
      const response = await axios.post(`${this.spotwareApiUrl}/cid/ctid/link`, {
        traderLogin,
        userId,
        brokerName,
        traderPasswordHash,
        environmentName: 'demo',
        returnAccountDetails: true,
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        params: {
          token: this.apiToken,
        },
      });
      console.log('Response from Spotware (linkAccountToCTID):', response.data);
      return response.data;
    } catch (error) {
      console.error('Error linking Trader Account to cTID on Spotware:', error.response?.data || error.message);
      throw new HttpException('Failed to link Trader Account to cTID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}







// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import axios from 'axios';
// import { CreateTraderDto } from './dto/create-trader.dto';

// @Injectable()
// export class SpotwareService {
//   private readonly spotwareApiUrl = 'https://demo-propsandbox.webapi.ctrader.com:8443/v2/webserv';
//   private readonly apiToken = 'bdd22715-9de7-4d48-bcba-36f117d73dbf'; // Spotware API token

//   // Create trader via Spotware API
//   async createTrader(traderData: any) {
//     console.log('Sending request to Spotware API to create a trader...');
//     try {
//       const response = await axios.post(`${this.spotwareApiUrl}/traders`, traderData, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${this.apiToken}`,
//         },
//         params: {
//           token: this.apiToken,  // Add token as query parameter
//         },
//       });
//       console.log('Received response from Spotware API:', response.data);
//       return response.data; // Spotware API response, including login
//     } catch (error) {
//       console.error('Error creating trader on Spotware:', error.response?.data || error.message);
//       throw new HttpException(
//         'Failed to create trader via Spotware API',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   // Fetch trader details from Spotware
//   async getTraderDetails(loginId: string) {
//     console.log(`Fetching trader details from Spotware API for login: ${loginId}`);
//     try {
//       const response = await axios.get(`${this.spotwareApiUrl}/traders/${loginId}`, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${this.apiToken}`,
//         },
//         params: {
//           token: this.apiToken,  // Add token as query parameter
//         },
//       });
//       console.log('Received trader details from Spotware:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching trader details from Spotware:', error.response?.data || error.message);
//       throw new HttpException(
//         'Failed to fetch trader details from Spotware API',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   async getMultipleTraders(params: { from: string, to: string, fromLastDealTimestamp?: string, toLastDealTimestamp?: string, groupId?: number }) {
//     console.log('Fetching multiple traders with parameters:', params);
//     try {
//       const response = await axios.get(`${this.spotwareApiUrl}/traders`, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${this.apiToken}`,
//         },
//         params: {
//           ...params,
//           token: this.apiToken,  // Add token as query parameter
//         },
//       });
//       console.log('Received multiple traders from Spotware:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching multiple traders from Spotware:', error.message);
//       throw new HttpException('Failed to fetch traders from Spotware API', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   async updateTrader(login: number, updateTraderDto: CreateTraderDto) {
//     console.log(`Updating trader on Spotware API for login: ${login}`);
//     try {
//       await axios.put(`${this.spotwareApiUrl}/traders/${login}`, updateTraderDto, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${this.apiToken}`,
//         },
//         params: {
//           token: this.apiToken,  // Add token as query parameter
//         },
//       });
//       console.log('Trader updated successfully on Spotware');
//     } catch (error) {
//       console.error('Error updating trader on Spotware:', error.message);
//       throw new HttpException('Failed to update trader on Spotware API', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   async updateTraderPartial(login: number, updateFields: Partial<CreateTraderDto>) {
//     console.log(`Partially updating trader on Spotware API for login: ${login}`);
//     try {
//       await axios.patch(`${this.spotwareApiUrl}/traders/${login}`, updateFields, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${this.apiToken}`,
//         },
//         params: {
//           token: this.apiToken,  // Add token as query parameter
//         },
//       });
//       console.log('Trader partially updated successfully on Spotware');
//     } catch (error) {
//       console.error('Error partially updating trader on Spotware:', error.message);
//       throw new HttpException('Failed to partially update trader on Spotware API', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   async deleteTrader(login: number) {
//     console.log(`Deleting trader from Spotware API with login: ${login}`);
//     try {
//       await axios.delete(`${this.spotwareApiUrl}/traders/${login}`, {
//         headers: {
//           'Authorization': `Bearer ${this.apiToken}`,
//         },
//         params: {
//           token: this.apiToken,  // Add token as query parameter
//         },
//       });
//       console.log('Trader deleted successfully from Spotware');
//     } catch (error) {
//       console.error('Error deleting trader on Spotware:', error.message);
//       throw new HttpException('Failed to delete trader on Spotware API', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }