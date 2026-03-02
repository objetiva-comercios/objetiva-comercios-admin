import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppRole } from '@objetiva/types'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { AuthenticatedRequest } from '../../auth/auth.types'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // If no @Roles() decorator is present, allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return true
  }
}
