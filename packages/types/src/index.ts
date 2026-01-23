// User type (will be expanded in Phase 2)
export interface User {
  id: string
  email: string
  role: string
}

// API response wrapper
export interface ApiResponse<T> {
  data: T
  error?: string
}
