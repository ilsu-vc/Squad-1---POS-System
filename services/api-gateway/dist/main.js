"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = require("express-rate-limit");
const crypto = __importStar(require("crypto"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((req, res, next) => {
        const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
        req.headers['x-correlation-id'] = correlationId;
        res.setHeader('X-Correlation-ID', correlationId);
        next();
    });
    app.use((0, helmet_1.default)());
    app.enableCors();
    morgan_1.default.token('correlation-id', (req) => req.headers['x-correlation-id']);
    app.use((0, morgan_1.default)(':method :url :status :res[content-length] - :response-time ms [CID: :correlation-id]'));
    const limiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        validate: { default: false },
        keyGenerator: (req) => {
            const terminalId = req.headers['x-terminal-id'];
            if (terminalId)
                return terminalId;
            return req.ip || 'unknown';
        },
        handler: (req, res, next, options) => {
            const key = req.headers['x-terminal-id'] || req.ip || 'unknown';
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
//# sourceMappingURL=main.js.map