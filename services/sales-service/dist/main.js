"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.enableCors();
    const port = process.env.PORT || 4003;
    await app.listen(port);
    console.log(`✅ sales-service running on port ${port} (skeleton — transactions moved to transaction-service:4007)`);
}
bootstrap();
//# sourceMappingURL=main.js.map