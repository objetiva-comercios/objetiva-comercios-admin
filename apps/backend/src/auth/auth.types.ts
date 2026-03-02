import { Request } from 'express'
import { AppRole } from '@objetiva/types'

export interface AuthenticatedUser {
  userId: string
  email: string
  role: AppRole
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}
