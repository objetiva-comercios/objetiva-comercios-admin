export * from './colors'
export * from './spacing'
export * from './typography'

// Export as single object for programmatic access
import { colors } from './colors'
import { spacing } from './spacing'
import { typography } from './typography'

export const tokens = {
  colors,
  spacing,
  typography,
} as const
