import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { loginSchema } from '@objetiva/types'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate email and password before submitting (works in Capacitor native mode)
    const loginResult = loginSchema.safeParse({ email, password })
    if (!loginResult.success) {
      setError(loginResult.error.errors[0]?.message ?? 'Please check your credentials')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
    }
    // On success, useAuth hook picks up session change via onAuthStateChange automatically
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Objetiva Comercios</h1>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-foreground font-medium underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
