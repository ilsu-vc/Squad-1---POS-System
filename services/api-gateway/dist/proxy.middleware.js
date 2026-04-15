"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendProxyMiddleware = exports.ProtectedProxyMiddleware = exports.ProxyMiddleware = void 0;
const common_1 = require("@nestjs/common");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const supabase_js_1 = require("@supabase/supabase-js");
const proxyOptions = {
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        const cid = req.headers['x-correlation-id'];
        if (cid) {
            proxyReq.setHeader('X-Correlation-ID', cid);
        }
    }
};
let ProxyMiddleware = class ProxyMiddleware {
    proxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
        ...proxyOptions,
        target: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
        pathRewrite: { '^/api/auth': '' },
    });
    use(req, res, next) {
        this.proxy(req, res, next);
    }
};
exports.ProxyMiddleware = ProxyMiddleware;
exports.ProxyMiddleware = ProxyMiddleware = __decorate([
    (0, common_1.Injectable)()
], ProxyMiddleware);
let ProtectedProxyMiddleware = class ProtectedProxyMiddleware {
    supabase;
    proxies;
    logger = new common_1.Logger('ProtectedProxyMiddleware');
    constructor() {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:4002';
        const transactionServiceUrl = process.env.TRANSACTION_SERVICE_URL || 'http://localhost:4007';
        const reportingServiceUrl = process.env.REPORTING_SERVICE_URL || 'http://localhost:4004';
        const roleServiceUrl = process.env.ROLE_SERVICE_URL || 'http://localhost:4005';
        const receiptServiceUrl = process.env.RECEIPT_SERVICE_URL || 'http://localhost:4006';
        this.proxies = {
            products: (0, http_proxy_middleware_1.createProxyMiddleware)({ ...proxyOptions, target: inventoryServiceUrl, pathRewrite: { '^/api/products': '' } }),
            stock: (0, http_proxy_middleware_1.createProxyMiddleware)({ ...proxyOptions, target: inventoryServiceUrl, pathRewrite: { '^/api/stock': '' } }),
            transactions: (0, http_proxy_middleware_1.createProxyMiddleware)({ ...proxyOptions, target: transactionServiceUrl, pathRewrite: { '^/api/transactions': '' } }),
            reporting: (0, http_proxy_middleware_1.createProxyMiddleware)({ ...proxyOptions, target: reportingServiceUrl, pathRewrite: { '^/api/reporting': '' } }),
            roles: (0, http_proxy_middleware_1.createProxyMiddleware)({ ...proxyOptions, target: roleServiceUrl, pathRewrite: { '^/api/roles': '' } }),
            receipts: (0, http_proxy_middleware_1.createProxyMiddleware)({ ...proxyOptions, target: receiptServiceUrl, pathRewrite: { '^/api/receipts': '' } }),
        };
    }
    async use(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or invalid Authorization header');
        }
        const token = authHeader.split(' ')[1];
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser(token);
            if (error || !user) {
                throw new common_1.UnauthorizedException('Unauthorized: Invalid token');
            }
        }
        catch (err) {
            this.logger.error('JWT Verification Error:', err);
            throw new common_1.UnauthorizedException('Internal server error during authentication');
        }
        const pathSegments = req.path.split('/');
        if (pathSegments.length > 2 && pathSegments[1] === 'api') {
            const service = pathSegments[2];
            if (this.proxies[service]) {
                return this.proxies[service](req, res, next);
            }
        }
        next();
    }
};
exports.ProtectedProxyMiddleware = ProtectedProxyMiddleware;
exports.ProtectedProxyMiddleware = ProtectedProxyMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ProtectedProxyMiddleware);
let FrontendProxyMiddleware = class FrontendProxyMiddleware {
    proxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
        ...proxyOptions,
        target: process.env.FRONTEND_URL || 'http://localhost:3000',
        ws: true,
    });
    use(req, res, next) {
        if (!req.path.startsWith('/api')) {
            this.proxy(req, res, next);
        }
        else {
            next();
        }
    }
};
exports.FrontendProxyMiddleware = FrontendProxyMiddleware;
exports.FrontendProxyMiddleware = FrontendProxyMiddleware = __decorate([
    (0, common_1.Injectable)()
], FrontendProxyMiddleware);
//# sourceMappingURL=proxy.middleware.js.map