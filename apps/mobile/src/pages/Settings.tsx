import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../lib/supabase'

type ThemeOption = {
  value: 'light' | 'dark' | 'system'
  label: string
  description: string
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', description: 'Always use light theme' },
  { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
  { value: 'system', label: 'System', description: 'Follow device preference' },
]

export function Settings() {
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Appearance section */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Appearance
          </p>
        </div>
        <div className="p-3 flex flex-col gap-2">
          {THEME_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors active:opacity-70 ${
                theme === option.value
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-border text-foreground'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className={`text-xs ${
                    theme === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  }`}
                >
                  {option.description}
                </span>
              </div>
              {theme === option.value && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 shrink-0 ml-2"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* App Info section */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            App Info
          </p>
        </div>
        <div className="divide-y divide-border">
          <div className="flex justify-between items-center px-4 py-3">
            <p className="text-sm text-foreground">Version</p>
            <p className="text-sm text-muted-foreground">1.0.0</p>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <p className="text-sm text-foreground">Build</p>
            <p className="text-sm text-muted-foreground">Capacitor + Vite</p>
          </div>
          <div className="flex flex-col px-4 py-3">
            <p className="text-sm text-foreground mb-0.5">API URL</p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {import.meta.env.VITE_API_URL ?? 'Not configured'}
            </p>
          </div>
        </div>
      </div>

      {/* Account section */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Account
          </p>
        </div>
        <div className="p-3">
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-lg border border-destructive text-destructive font-medium text-sm active:opacity-70 transition-opacity"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
