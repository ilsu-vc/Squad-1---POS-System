import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

async function bootstrap() {
  // Disable body parser so the proxy forwards raw payloads correctly
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Correlation ID
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });
  // Apply relaxed CSP for Next.js, Supabase, and Google Fonts
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.enableCors();

  morgan.token('correlation-id', (req: Request) => req.headers['x-correlation-id'] as string);
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms [CID: :correlation-id]'));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { default: false },
    keyGenerator: (req: Request) => {
      const terminalId = req.headers['x-terminal-id'];
      if (terminalId) return terminalId as string;
      return req.ip || 'unknown';
    },
    handler: (req, res, next, options) => {
      const key = (req.headers['x-terminal-id'] as string) || req.ip || 'unknown';
      console.warn(`🚨 Rate limit exceeded for key: ${key}`);
      res.status(options.statusCode).json(options.message);
    },
    message: { error: 'Too many requests from this terminal. Please slow down.' },
  });
  app.use(limiter);

  const port = process.env.PORT || 8000;
  await app.listen(port);
  console.log(`🚀 API Gateway running on port ${port}`);
}
bootstrap();
