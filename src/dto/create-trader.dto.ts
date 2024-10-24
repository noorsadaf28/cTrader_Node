import { IsNotEmpty, IsString, IsEnum, IsNumber, IsObject } from 'class-validator';

export enum AccessRights {
  FULL_ACCESS = 'FULL_ACCESS',
  CLOSE_ONLY = 'CLOSE_ONLY',
  NO_TRADING = 'NO_TRADING',
  NO_LOGIN = 'NO_LOGIN',
}

export enum AccountType {
  HEDGED = 'HEDGED',
  NETTED = 'NETTED',
  SPREAD_BETTING = 'SPREAD_BETTING',
}

export class ContactDetails {
  @IsString()
  address?: string;

  @IsString()
  city?: string;

  @IsNumber()
  countryId?: number;

  @IsString()
  documentId?: string;

  @IsString()
  email?: string;

  @IsString()
  phone?: string;

  @IsString()
  state?: string;

  @IsString()
  zipCode?: string;

  @IsString()
  introducingBroker1?: string;

  @IsString()
  introducingBroker2?: string;
}

export class CreateTraderDto {
  @IsEnum(AccessRights)
  accessRights: AccessRights;

  @IsEnum(AccountType)
  accountType: AccountType;

  @IsNumber()
  @IsNotEmpty()
  balance: number;

  @IsString()
  @IsNotEmpty()
  brokerName: string;

  @IsObject()
  contactDetails: ContactDetails;

  @IsString()
  @IsNotEmpty()
  depositCurrency: string;

  @IsString()
  @IsNotEmpty()
  groupName: string;

  @IsString()
  @IsNotEmpty()
  hashedPassword: string;

  @IsNumber()
  @IsNotEmpty()
  leverageInCents: number;

  @IsString()
  @IsNotEmpty()
  totalMarginCalculationType: string;

  // Optional fields
  description?: string;
  isLimitedRisk?: boolean;
  lastName?: string;
  limitedRiskMarginCalculationStrategy?: string;
  maxLeverage?: number;
  name?: string;
  sendOwnStatement?: boolean;
  sendStatementToBroker?: boolean;
  swapFree?: boolean;
}
