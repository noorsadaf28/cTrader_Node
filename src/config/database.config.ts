import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EnvConfig } from './env.config';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: EnvConfig.database.host,
  port: EnvConfig.database.port,
  username: EnvConfig.database.username,
  password: EnvConfig.database.password,
  database: EnvConfig.database.name,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Disable in production
};
