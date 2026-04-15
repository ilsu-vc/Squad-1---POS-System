import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class ProxyMiddleware implements NestMiddleware {
    private proxy;
    use(req: Request, res: Response, next: NextFunction): void;
}
export declare class ProtectedProxyMiddleware implements NestMiddleware {
    private supabase;
    private proxies;
    private logger;
    constructor();
    use(req: Request, res: Response, next: NextFunction): Promise<any>;
}
export declare class FrontendProxyMiddleware implements NestMiddleware {
    private proxy;
    use(req: Request, res: Response, next: NextFunction): void;
}
