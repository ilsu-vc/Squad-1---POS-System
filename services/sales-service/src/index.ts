import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

dotenv.config();

const app = express();

// ── OWASP: Secure HTTP headers ────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

const PORT = process.env.PORT || 4003;

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  statusCode: 429,
});

// ── Health ────────────────────────────────────────────────────────────────────
// Transaction processing has been moved to transaction-service (port 4007).
// This service is retained as a placeholder to avoid breaking Docker Compose.
app.get('/health', generalLimiter, (_req: Request, res: Response) => {
  res.json({
    service: 'sales-service',
    status: 'ok',
    port: PORT,
    note: 'Transaction processing is handled by transaction-service on port 4007',
  });
});

app.listen(PORT, () => {
  console.log(`✅ sales-service running on port ${PORT} (skeleton — transactions moved to transaction-service:4007)`);
});
