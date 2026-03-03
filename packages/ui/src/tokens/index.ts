export * from './spacing'
export * from './typography'

// Export as single object for programmatic access
import { spacing } from './spacing'
import { typography } from './typography'

export const tokens = {
  spacing,
  typography,
} as const
