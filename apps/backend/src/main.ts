import 'dotenv/config'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Ensure uploads directory exists and serve statically
  const uploadsDir = join(process.cwd(), 'uploads')
  mkdirSync(uploadsDir, { recursive: true })
  app.useStaticAssets(uploadsDir, { prefix: '/api/uploads/' })

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
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173']

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`Backend running on http://localhost:${port}`)
}
bootstrap()
