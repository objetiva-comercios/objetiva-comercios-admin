import { Controller, Get, Req } from '@nestjs/common'
import { AuthenticatedRequest } from './auth.types'

@Controller('auth')
export class AuthController {
  @Get('verify')
  verify(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Autenticación exitosa',
      user: req.user,
      timestamp: new Date().toISOString(),
    }
  }
}
