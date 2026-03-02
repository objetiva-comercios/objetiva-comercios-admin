import { z } from 'zod'

// App role type for RBAC
export type AppRole = 'admin' | 'viewer'

// User type (will be expanded in Phase 2)
export interface User {
  id: string
  email: string
  role: AppRole
}

// API response wrapper
export interface ApiResponse<T> {
  data: T
  error?: string
}

// Shared validation schemas
export const emailSchema = z.string().email('Please enter a valid email address').toLowerCase()

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Password strength utility
export function getPasswordStrength(pwd: string): 'weak' | 'fair' | 'strong' {
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return 'weak'
  if (score <= 2) return 'fair'
  return 'strong'
}
