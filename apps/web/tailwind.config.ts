import type { Config } from 'tailwindcss'
import { spacing, typography } from '@objetiva/ui/tokens'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      spacing: spacing,
      fontFamily: {
        sans: [...typography.fontFamily.sans],
        mono: [...typography.fontFamily.mono],
      },
      fontSize: typography.fontSize,
      borderRadius: {
        '4xl': '24px',
        '3xl': '20px',
        '2xl': '16px',
        xl: '12px',
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
      boxShadow: {
        xs: '0 1px 1px rgba(18, 18, 23, 0.06)',
        sm: '0 1px 3px 0 rgba(18, 18, 23, 0.1), 0 1px 2px 0 rgba(18, 18, 23, 0.06)',
        DEFAULT: 'rgba(18, 18, 23, 0.04) 0 2px 4px 0',
        md: '0 4px 6px -1px rgba(18, 18, 23, 0.1), 0 2px 4px -1px rgba(18, 18, 23, 0.06)',
        lg: '0 10px 15px -3px rgba(18, 18, 23, 0.1), 0 4px 6px -2px rgba(18, 18, 23, 0.05)',
        xl: '0 20px 25px -5px rgba(18, 18, 23, 0.1), 0 10px 10px -5px rgba(18, 18, 23, 0.04)',
        '2xl': '0 25px 50px -12px rgba(18, 18, 23, 0.25)',
      },
    },
  },
  plugins: [],
}

export default config
