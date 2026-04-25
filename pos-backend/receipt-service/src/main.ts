import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors();
  
  const port = process.env.PORT || 4006;
  await app.listen(port);
  console.log(`✅ receipt-service running on port ${port}`);
}
bootstrap();
