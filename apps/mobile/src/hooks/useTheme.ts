import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'system'
  )

  useEffect(() => {
    const effective = getEffectiveTheme(theme)
    document.documentElement.classList.toggle('dark', effective === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for system theme changes when set to 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return { theme, setTheme }
}
