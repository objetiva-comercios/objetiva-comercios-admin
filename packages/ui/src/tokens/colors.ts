export const colors = {
  // Primitive tokens - Full gray scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Semantic tokens (context-aware)
  primary: {
    DEFAULT: '#3b82f6',
    foreground: '#ffffff',
  },
  secondary: {
    DEFAULT: '#64748b',
    foreground: '#ffffff',
  },
  destructive: {
    DEFAULT: '#ef4444',
    foreground: '#ffffff',
  },
  muted: {
    DEFAULT: '#f1f5f9',
    foreground: '#64748b',
  },
  accent: {
    DEFAULT: '#f1f5f9',
    foreground: '#0f172a',
  },
  background: '#ffffff',
  foreground: '#0f172a',
  border: '#e2e8f0',
} as const

export type Colors = typeof colors
