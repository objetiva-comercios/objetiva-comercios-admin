import { fetchSettings } from '@/lib/api'

const API_BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  let logoRectangular: string | null = null
  try {
    const settings = await fetchSettings()
    logoRectangular = settings.logoRectangular
  } catch {
    // Settings not available yet, skip logo
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        {logoRectangular && (
          <div className="flex justify-center mb-8">
            <img
              src={`${API_BASE_URL}/api/uploads/${logoRectangular}`}
              alt="Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
