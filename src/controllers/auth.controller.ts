// import { Controller, Get, UseGuards, Request } from '@nestjs/common';
// import { JwtAuthGuard } from 'src/services/auth/jwt-auth.guard';
// import { AuthService } from 'src/services/auth/auth.service';

// @Controller('auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   // Example of an endpoint to validate or verify a token
//   @UseGuards(JwtAuthGuard)
//   @Get('validate-token')
//   async validateToken(@Request() req: any) {
//     return this.authService.validateToken(req.user);
//   }
// }
