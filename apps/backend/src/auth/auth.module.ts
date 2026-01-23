import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthMiddleware } from './auth.middleware'

@Module({
  controllers: [AuthController],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('api/auth/*')
  }
}
