import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../services/auth/jwt.strategy';
import { JwtAuthGuard } from '../services/auth/jwt-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccountModule } from './account.module';
import { AuthService } from 'src/services/auth/auth.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        console.log('JWT Secret Loaded:', configService.get<string>('JWT_SECRET'));  // Log JWT secret
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: '60m' },
        };
      },
      inject: [ConfigService],
    }),
    forwardRef(() => AccountModule),  // Log when AccountModule is loaded
  ],
  providers: [JwtStrategy, JwtAuthGuard,AuthService],
  exports: [JwtModule, JwtAuthGuard,AuthService],
})
export class AuthModule {
  constructor() {
    console.log('AuthModule initialized');  // Log when AuthModule is initialized
  }
}
