import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as csvParser from 'csv-parser';

@Injectable()
export class SpotwareService {
  private readonly spotwareApiUrl: string;
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.spotwareApiUrl = this.configService.get<string>('SPOTWARE_API_URL');
    this.apiToken = this.configService.get<string>('SPOTWARE_API_TOKEN');
  }

  async fetchOpenPositions(login?: number): Promise<any[]> {
    const url = `${this.spotwareApiUrl}/v2/webserv/openPositions`;
    const params: any = { token: this.apiToken };
    if (login) {
      params.login = login;
    }

    const response = await axios.get(url, { params });
    console.log(response);
    const csvData = response.data;
    console.log(csvData);

    // Parse CSV response
    return await this.parseCSVToJson(csvData);
  }

  async fetchClosedPositions(from: string, to: string, login?: number): Promise<any[]> {
    const url = `${this.spotwareApiUrl}/v2/webserv/closedPositions`;
    const params: any = {
      token: this.apiToken,
      from,
      to,
    };
    if (login) {
      params.login = login;
    }

    const response = await axios.get(url, { params });
    const csvData = response.data;

    // Parse CSV response
    return await this.parseCSVToJson(csvData);
  }

  // Utility function to parse CSV to JSON
  private parseCSVToJson(csvData: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results = [];
      csvParser()
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err))
        .end(csvData);
    });
  }
}
