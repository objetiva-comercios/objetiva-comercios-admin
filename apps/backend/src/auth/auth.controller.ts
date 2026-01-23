import { Controller, Get, Req } from '@nestjs/common'
import { AuthenticatedRequest } from './auth.types'

@Controller('api/auth')
export class AuthController {
  @Get('verify')
  verify(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Authentication successful',
      user: req.user,
      timestamp: new Date().toISOString(),
    }
  }
}
