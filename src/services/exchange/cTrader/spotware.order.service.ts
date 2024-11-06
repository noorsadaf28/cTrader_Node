import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from 'src/services/loggers/winston.config';

@Injectable()
export class SpotwareService {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;

  constructor(
    private configService: ConfigService,
    private readonly logger: AppLogger // Inject the logger
  ) {
    this.spotwareApiUrl = this.configService.get<string>('SPOTWARE_API_URL');
    this.apiToken = this.configService.get<string>('SPOTWARE_API_TOKEN');
  }

  async getOpenPositions() {
    try {
      this.logger.log('Fetching open positions from Spotware...');
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/openPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { token: this.apiToken },
      });
      this.logger.log('Open positions fetched successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching open positions from Spotware', error.stack); // Pass the error stack as trace
      throw new HttpException('Failed to fetch open positions from Spotware', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getClosedPositions(from: string, to: string) {
    try {
      this.logger.log(`Fetching closed positions from Spotware for date range: ${from} to ${to}`);
      const response = await axios.get(`${this.spotwareApiUrl}/v2/webserv/closedPositions`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        params: { from, to, token: this.apiToken },
      });
      this.logger.log('Closed positions fetched successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching closed positions from Spotware', error.stack); // Pass the error stack as trace
      throw new HttpException('Failed to fetch closed positions from Spotware', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
