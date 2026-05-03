import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// ── Correlation ID Middleware ────────────────────────────────────────────────
// Generates a unique ID for every request to enable end-to-end tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

// Initialize Supabase for JWT validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ API Gateway: Missing Supabase env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.set('trust proxy', 1); // Trust first-level proxy in Docker environment
app.use(cors());

// Custom morgan format to include Correlation ID
morgan.token('correlation-id', (req: Request) => req.headers['x-correlation-id'] as string);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms [CID: :correlation-id]'));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// 100 requests per minute per Terminal ID (with IP fallback)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // Disable default IPv6 check to avoid warning since we handle it in keyGenerator
  validate: {
    default: false,
  },
  keyGenerator: (req: Request) => {
    // Priority: Header > IP
    const terminalId = req.headers['x-terminal-id'];
    if (terminalId) return terminalId as string;
    
    // Fallback to IP if terminal ID is missing
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

// ── JWT Validation Middleware ─────────────────────────────────────────────────
const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    // Token is valid
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:4002';
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const transactionServiceUrl = process.env.TRANSACTION_SERVICE_URL || 'http://localhost:4007';
const reportingServiceUrl = process.env.REPORTING_SERVICE_URL || 'http://localhost:4004';
const roleServiceUrl = process.env.ROLE_SERVICE_URL || 'http://localhost:4005';
const receiptServiceUrl = process.env.RECEIPT_SERVICE_URL || 'http://localhost:4006';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// ── Proxy Middleware Shared Configuration ─────────────────────────────────────
const proxyOptions = {
  changeOrigin: true,
  onProxyReq: (proxyReq: any, req: Request, res: Response) => {
    // Forward the Correlation ID to the downstream service
    const cid = req.headers['x-correlation-id'];
    if (cid) {
      proxyReq.setHeader('X-Correlation-ID', cid);
    }
  }
};

// ── Open Routes (No JWT required) ──
app.use('/api/auth', createProxyMiddleware({
  ...proxyOptions,
  target: authServiceUrl,
  pathRewrite: { '^/api/auth': '' },
}));

// ── Protected Routes (JWT required) ──
app.use('/api/products', verifyJWT, createProxyMiddleware({
  ...proxyOptions,
  target: inventoryServiceUrl,
  pathRewrite: { '^/api/products': '' },
}));

app.use('/api/stock', verifyJWT, createProxyMiddleware({
  ...proxyOptions,
  target: inventoryServiceUrl,
  pathRewrite: { '^/api/stock': '' },
}));

app.use('/api/transactions', verifyJWT, createProxyMiddleware({
  ...proxyOptions,
  target: transactionServiceUrl,
  pathRewrite: { '^/api/transactions': '' },
}));

app.use('/api/reporting', verifyJWT, createProxyMiddleware({
  ...proxyOptions,
  target: reportingServiceUrl,
  pathRewrite: { '^/api/reporting': '' },
}));

app.use('/api/roles', verifyJWT, createProxyMiddleware({
  ...proxyOptions,
  target: roleServiceUrl,
  pathRewrite: { '^/api/roles': '' },
}));

app.use('/api/receipts', verifyJWT, createProxyMiddleware({
  ...proxyOptions,
  target: receiptServiceUrl,
  pathRewrite: { '^/api/receipts': '' },
}));

// ── Fall through remaining routes to POS Monolith (Frontend) ──
app.use('/', createProxyMiddleware({
  ...proxyOptions,
  target: frontendUrl,
  ws: true, // Support websocket for Next.js HMR
}));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`➡️  Inventory Service: ${inventoryServiceUrl}`);
  console.log(`➡️  Auth Service: ${authServiceUrl}`);
  console.log(`➡️  POS Monolith: ${frontendUrl}`);
});
