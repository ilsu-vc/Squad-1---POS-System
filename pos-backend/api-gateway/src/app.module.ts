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
      .forRoutes({ path: 'api/auth/*path', method: RequestMethod.ALL });

    consumer
      .apply(ProtectedProxyMiddleware)
      .forRoutes(
        { path: 'api/products/*path', method: RequestMethod.ALL },
        { path: 'api/stock/*path', method: RequestMethod.ALL },
        { path: 'api/transactions/*path', method: RequestMethod.ALL },
        { path: 'api/reporting/*path', method: RequestMethod.ALL },
        { path: 'api/roles/*path', method: RequestMethod.ALL },
        { path: 'api/receipts/*path', method: RequestMethod.ALL },
      );

    // Fallback frontend proxy
    consumer
      .apply(FrontendProxyMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
