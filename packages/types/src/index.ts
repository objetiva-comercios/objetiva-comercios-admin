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
