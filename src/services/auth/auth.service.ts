import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../exchange/cTrader/account.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,  // For handling JWT token operations
    private readonly accountService: AccountService,  // To validate user against the account
  ) {}

  // Method to generate JWT token for a given account
  async generateToken(account: any): Promise<string> {
    const payload = { email: account.email, sub: account.userId };

    // Generate the JWT token
    const token = this.jwtService.sign(payload);
    console.log(token);
    // Return the generated token
    return token;
  }

  // Validate the token by checking if the user exists in the database
  async validateToken(token: string) {
    const account = await this.jwtService.verifyAsync(token);
    const validAccount = await this.accountService.findByUserId(account.userId);

    if (!validAccount) {
      throw new Error('Invalid token or user not found');
    }

    return validAccount;
  }
}
