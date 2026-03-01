import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Login } from '../../pages/Login'
import { Signup } from '../../pages/Signup'

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground mt-2">Coming soon</p>
    </div>
  )
}

export function SplashGate() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show branded splash screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-16 h-16 bg-primary rounded-xl mb-6" />
        <h1 className="text-xl font-bold text-foreground mb-4">Objetiva Comercios</h1>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated — show auth routes only
  if (!user) {
    const isAuthRoute = ['/login', '/signup'].includes(location.pathname)
    if (!isAuthRoute) return <Navigate to="/login" replace />
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    )
  }

  // Authenticated — render app routes
  // Plan 02 will replace PlaceholderPage with AppShell + real pages
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
      <Route path="/articles" element={<PlaceholderPage title="Articles" />} />
      <Route path="/orders" element={<PlaceholderPage title="Orders" />} />
      <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
      <Route path="/sales" element={<PlaceholderPage title="Sales" />} />
      <Route path="/purchases" element={<PlaceholderPage title="Purchases" />} />
      <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
      <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
