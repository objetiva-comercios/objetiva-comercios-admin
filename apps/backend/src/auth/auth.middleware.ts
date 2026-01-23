import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { Response, NextFunction } from 'express'
import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose'
import { AuthenticatedRequest, AuthenticatedUser } from './auth.types'

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private jwks: ReturnType<typeof createRemoteJWKSet>

  constructor() {
    const projectId = process.env.SUPABASE_PROJECT_ID
    if (!projectId) {
      throw new Error('SUPABASE_PROJECT_ID environment variable is required')
    }

    this.jwks = createRemoteJWKSet(
      new URL(`https://${projectId}.supabase.co/auth/v1/.well-known/jwks.json`)
    )
  }

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)

    try {
      const projectId = process.env.SUPABASE_PROJECT_ID
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `https://${projectId}.supabase.co/auth/v1`,
        audience: 'authenticated',
      })

      req.user = this.extractUser(payload)
      next()
    } catch (error) {
      console.error('JWT verification failed:', error instanceof Error ? error.message : error)
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  private extractUser(payload: JWTPayload): AuthenticatedUser {
    return {
      userId: payload.sub ?? '',
      email: (payload.email as string) ?? '',
      role: (payload.role as string) ?? 'authenticated',
    }
  }
}
