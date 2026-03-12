import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { AuthenticatedRequest, AuthenticatedUser } from '../../auth/auth.types'
import { AppRole } from '@objetiva/types'
import { ApiKeysService } from '../../modules/api-keys/api-keys.service'

@Injectable()
export class CompositeAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet>

  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService
  ) {
    const projectId = process.env.SUPABASE_PROJECT_ID
    if (!projectId) {
      throw new Error('SUPABASE_PROJECT_ID environment variable is required')
    }

    this.jwks = createRemoteJWKSet(
      new URL(`https://${projectId}.supabase.co/auth/v1/.well-known/jwks.json`)
    )
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Encabezado de autorización faltante o inválido')
    }

    const token = authHeader.substring(7)

    // Try JWT verification first
    try {
      const projectId = process.env.SUPABASE_PROJECT_ID
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `https://${projectId}.supabase.co/auth/v1`,
        audience: 'authenticated',
      })

      request.user = this.extractUser(payload)
      return true
    } catch {
      // JWT failed — try API key
    }

    // Try API key lookup
    const found = await this.apiKeysService.findByToken(token)
    if (found) {
      request.user = {
        userId: `apikey:${found.name}`,
        email: '',
        role: 'admin' as AppRole,
      }
      void this.apiKeysService.updateLastUsed(found.id)
      return true
    }

    throw new UnauthorizedException('Token inválido o expirado')
  }

  private extractUser(payload: any): AuthenticatedUser {
    return {
      userId: payload.sub ?? '',
      email: (payload.email as string) ?? '',
      role: (payload.app_metadata?.role as AppRole) ?? 'viewer',
    }
  }
}
