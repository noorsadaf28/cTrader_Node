import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { activeBotQueue } from 'config/constant';

async function bootstrap() {
   const app = await NestFactory.create(AppModule, {
    // logger: new AppLogger(),
  });

  await app.listen(3000);
  console.log(`------------------------------Exchange set to: ⚡${process.env.exchange}------------------------------`);
  console.log(`---------------------- Bot Type : ${process.env.botType} -------------------------------`)
console.log(`------------📬 Queue : ${activeBotQueue} ----------`)
}
bootstrap();



