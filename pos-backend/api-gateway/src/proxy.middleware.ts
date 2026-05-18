import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createClient } from '@supabase/supabase-js';

const proxyOptions = {
  changeOrigin: true,
  onProxyReq: (proxyReq: any, req: Request, res: Response) => {
    const cid = req.headers['x-correlation-id'];
    if (cid) {
      proxyReq.setHeader('X-Correlation-ID', cid);
    }
  }
};

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private proxy = createProxyMiddleware({
    ...proxyOptions,
    target: process.env.POS_GATEWAY_AUTH_SERVICE_URL || 'http://localhost:3032',
    pathRewrite: { '^/api/auth': '' },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.proxy(req, res, next);
  }
}

@Injectable()
export class ProtectedProxyMiddleware implements NestMiddleware {
  private supabase: any;
  private proxies: Record<string, any>;
  private logger = new Logger('ProtectedProxyMiddleware');

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_POS_GATEWAY_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_POS_GATEWAY_SUPABASE_ANON_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);

    const inventoryServiceUrl = process.env.POS_GATEWAY_INVENTORY_SERVICE_URL || 'http://localhost:3033';
    const transactionServiceUrl = process.env.POS_GATEWAY_TRANSACTION_SERVICE_URL || 'http://localhost:3038';
    const reportingServiceUrl = process.env.POS_GATEWAY_REPORTING_SERVICE_URL || 'http://localhost:3035';
    const roleServiceUrl = process.env.POS_GATEWAY_ROLE_SERVICE_URL || 'http://localhost:3036';
    const receiptServiceUrl = process.env.POS_GATEWAY_RECEIPT_SERVICE_URL || 'http://localhost:3034';

    this.proxies = {
      products: createProxyMiddleware({ ...proxyOptions, target: inventoryServiceUrl, pathRewrite: { '^/api/products': '' } }),
      stock: createProxyMiddleware({ ...proxyOptions, target: inventoryServiceUrl, pathRewrite: { '^/api/stock': '' } }),
      transactions: createProxyMiddleware({ ...proxyOptions, target: transactionServiceUrl, pathRewrite: { '^/api/transactions': '' } }),
      reporting: createProxyMiddleware({ ...proxyOptions, target: reportingServiceUrl, pathRewrite: { '^/api/reporting': '' } }),
      roles: createProxyMiddleware({ ...proxyOptions, target: roleServiceUrl, pathRewrite: { '^/api/roles': '' } }),
      receipts: createProxyMiddleware({ ...proxyOptions, target: receiptServiceUrl, pathRewrite: { '^/api/receipts': '' } }),
    };
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`Missing or invalid Authorization header for path: ${req.path}`);
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      if (error || !user) {
        this.logger.error(`Supabase Auth Error for path ${req.path}: ${error?.message || 'No user found'}`);
        throw new UnauthorizedException(`Unauthorized: ${error?.message || 'Invalid token'}`);
      }
      this.logger.log(`User authenticated: ${user.id} for path: ${req.path}`);
    } catch (err: any) {
      this.logger.error(`JWT Verification Exception for path ${req.path}:`, err.message || err);
      throw new UnauthorizedException('Internal server error during authentication');
    }

    // Determine target based on path
    const pathSegments = req.path.split('/');
    // e.g. /api/products/... -> pathSegments = ['', 'api', 'products', ...]
    if (pathSegments.length > 2 && pathSegments[1] === 'api') {
      const service = pathSegments[2];
      if (this.proxies[service]) {
        return this.proxies[service](req, res, next);
      }
    }

    next();
  }
}

@Injectable()
export class FrontendProxyMiddleware implements NestMiddleware {
  private proxy = createProxyMiddleware({
    ...proxyOptions,
    target: process.env.POS_GATEWAY_FRONTEND_URL || 'http://localhost:3030',
    ws: true,
  });

  use(req: Request, res: Response, next: NextFunction) {
    // Only forward if it doesn't start with /api (handled by other middlewares)
    if (!req.path.startsWith('/api')) {
      this.proxy(req, res, next);
    } else {
      next();
    }
  }
}
