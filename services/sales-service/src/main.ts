import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors();
  
  const port = process.env.PORT || 4003;
  await app.listen(port);
  console.log(`✅ sales-service running on port ${port} (skeleton — transactions moved to transaction-service:4007)`);
}
bootstrap();
