import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppModule } from './app.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Set global prefix for all routes
  app.setGlobalPrefix('api')

  // Configure global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Auto-transform query params to DTO types
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error on unknown properties
    })
  )

  // Configure global JWT authentication guard
  app.useGlobalGuards(new JwtAuthGuard(new Reflector()))

  // Configure global exception filter
  app.useGlobalFilters(new HttpExceptionFilter())

  // Enable CORS for frontend apps
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })

  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`Backend running on http://localhost:${port}`)
}
bootstrap()
