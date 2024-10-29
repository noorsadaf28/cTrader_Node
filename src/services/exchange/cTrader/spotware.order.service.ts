import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SpotwareService {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.spotwareApiUrl = this.configService.get<string>('SPOTWARE_API_URL');
    this.apiToken = this.configService.get<string>('SPOTWARE_API_TOKEN');
  }

  async getOpenPositions() {
    try {
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/openPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      console.log('Open positions fetched from Spotware:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching open positions from Spotware:', error.message);
      throw new HttpException('Failed to fetch open positions from Spotware', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getClosedPositions(from: string, to: string) {
    try {
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/closedPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { from, to, token: this.apiToken },
      });
      console.log('Closed positions fetched from Spotware:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching closed positions from Spotware:', error.message);
      throw new HttpException('Failed to fetch closed positions from Spotware', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
