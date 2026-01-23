import type { Config } from 'tailwindcss'
import { colors, spacing, typography } from '@objetiva/ui/tokens'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ...colors,
      },
      spacing: spacing,
      fontFamily: {
        sans: [...typography.fontFamily.sans],
        mono: [...typography.fontFamily.mono],
      },
      fontSize: typography.fontSize,
    },
  },
  plugins: [],
}

export default config
