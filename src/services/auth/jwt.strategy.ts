import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccountService } from 'src/services/exchange/cTrader/account.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });

    console.log('JwtStrategy initialized');  // Log when JwtStrategy is initialized
  }

  async validate(payload: any) {
    console.log('Validating JWT payload:', payload);  // Log JWT payload

    const { sub: userId, email } = payload;
    const account = await this.accountService.findByUserId(userId);

    if (!account || account.email !== email) {
      console.error('Invalid token or account not found');  // Log error details
      throw new UnauthorizedException('Invalid token');
    }

    console.log('JWT token validated successfully for user:', account.email);  // Log success
    return account;
  }
}
