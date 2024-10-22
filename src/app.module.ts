import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [ 
    //db
    TypeOrmModule.forRoot({
      type: 'postgres',           // Database type
      host: 'localhost',          // PostgreSQL host
      port: 5432,                 // PostgreSQL port
      username: 'your-username',  // Your PostgreSQL username
      password: 'your-password',  // Your PostgreSQL password
      database: 'your-database',  // Your PostgreSQL database name
      entities: [__dirname + '/**/*.entity{.ts,.js}'],  // Entities path
      synchronize: true,          // Set to `true` in development mode
    }),
    // config
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
