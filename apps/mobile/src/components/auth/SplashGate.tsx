import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { useAuth } from '../../hooks/useAuth'
import { Login } from '../../pages/Login'
import { Signup } from '../../pages/Signup'
import { AppShell } from '../layout/AppShell'
import { Dashboard } from '../../pages/Dashboard'
import { Articles } from '../../pages/Articles'
import { Orders } from '../../pages/Orders'
import { Inventory } from '../../pages/Inventory'
import { Sales } from '../../pages/Sales'
import { Purchases } from '../../pages/Purchases'
import { Profile } from '../../pages/Profile'
import { Settings } from '../../pages/Settings'
import { SectionErrorFallback } from '../ui/SectionErrorFallback'

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

  // Authenticated — render app routes inside AppShell layout
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppShell />}>
        <Route
          path="/dashboard"
          element={
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <Dashboard />
            </ErrorBoundary>
          }
        />
        <Route
          path="/articles"
          element={
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <Articles />
            </ErrorBoundary>
          }
        />
        <Route
          path="/orders"
          element={
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <Orders />
            </ErrorBoundary>
          }
        />
        <Route
          path="/inventory"
          element={
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <Inventory />
            </ErrorBoundary>
          }
        />
        <Route
          path="/sales"
          element={
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <Sales />
            </ErrorBoundary>
          }
        />
        <Route
          path="/purchases"
          element={
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <Purchases />
            </ErrorBoundary>
          }
        />
        <Route
          path="/profile"
          element={
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <Profile />
            </ErrorBoundary>
          }
        />
        <Route
          path="/settings"
          element={
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <Settings />
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
