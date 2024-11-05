import { Injectable, HttpService, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';

@Injectable()
export class DailyEquityService {
  private readonly xanoApiUrl: string;
  private readonly slackWebhookUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.xanoApiUrl = this.configService.get<string>('XANO_SDE_ENDPOINT');
    this.slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
  }

  // Function to retrieve equity and post to Xano
  async recordDailyEquity(accountId: number) {
    try {
      const currentEquity = await this.getCurrentEquity(accountId); // Implement to fetch equity
      const gmtDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
      const sdeDate = dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss'); // Adjusted to Madrid time

      const payload = {
        account: accountId,
        gmt_date: gmtDate,
        sde_date: sdeDate,
        trading_days: await this.getTradingDays(accountId),
        challenge_begins: await this.getChallengeBeginDate(accountId),
        starting_daily_equity: currentEquity,
      };

      const response = await this.httpService.post(this.xanoApiUrl, payload).toPromise();
      if (response.status !== 200) {
        throw new HttpException('Failed to save daily equity in Xano', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      console.log(`Starting Daily Equity recorded for account ${accountId} at ${gmtDate}`);
    } catch (error) {
      await this.sendSlackNotification(`Failed to record Starting Daily Equity for account ${accountId}: ${error.message}`);
    }
  }

  private async getCurrentEquity(accountId: number): Promise<number> {
    // Mock method to fetch equity; replace with actual API call to cTrader
    return 5000.00;
  }

  private async getTradingDays(accountId: number): Promise<number> {
    // Implement the logic to fetch trading days for the account
    return 10; // Mock data
  }

  private async getChallengeBeginDate(accountId: number): Promise<string> {
    // Implement the logic to fetch the challenge begin date
    return '2024-01-05'; // Mock data
  }

  private async sendSlackNotification(message: string) {
    await this.httpService.post(this.slackWebhookUrl, { text: message }).toPromise();
  }
}
