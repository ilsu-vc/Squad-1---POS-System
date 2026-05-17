import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProxyMiddleware, ProtectedProxyMiddleware, FrontendProxyMiddleware } from './proxy.middleware';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ProxyMiddleware)
      .forRoutes({ path: 'api/auth/*', method: RequestMethod.ALL });

    consumer
      .apply(ProtectedProxyMiddleware)
      .forRoutes(
        { path: 'api/products/*', method: RequestMethod.ALL },
        { path: 'api/stock/*', method: RequestMethod.ALL },
        { path: 'api/transactions/*', method: RequestMethod.ALL },
        { path: 'api/reporting/*', method: RequestMethod.ALL },
        { path: 'api/roles/*', method: RequestMethod.ALL },
        { path: 'api/receipts/*', method: RequestMethod.ALL },
      );

    // Fallback frontend proxy
    consumer
      .apply(FrontendProxyMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
