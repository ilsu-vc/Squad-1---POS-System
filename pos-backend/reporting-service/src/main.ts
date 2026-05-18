import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors();
  
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests. Please slow down.' },
      statusCode: 429,
    }),
  );
  
  const port = process.env.PORT || 4004;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ reporting-service running on port ${port} bound to 0.0.0.0`);
}
bootstrap();
