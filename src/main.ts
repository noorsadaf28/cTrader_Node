import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './services/loggers/winston.config';
import { activeBotQueue } from 'config/constant';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use AppLogger as the global logger
  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);

  appLogger.log('Starting Nest application with AppLogger');
  
  await app.listen(3000);
  appLogger.log('Nest application successfully started');
  
  appLogger.log(`------------------------------Exchange set to: ⚡${process.env.exchange}------------------------------`);
  appLogger.log(`---------------------- Bot Type : ${process.env.botType} -------------------------------`);
  appLogger.log(`------------📬 Queue : ${activeBotQueue} ----------`);
}

bootstrap();
