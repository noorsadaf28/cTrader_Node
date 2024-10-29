import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

// JWT Payload Interface
export interface JwtPayload {
  email: string;
  sub: number;  // Typically the user ID
}

// DTO for authentication (login/register)
export class AuthDto {
  @IsEmail()  // Validate email format
  @IsNotEmpty()
  email: string;

  @IsString()  // Validate that password is a string
  @IsNotEmpty()
  password: string;
}
