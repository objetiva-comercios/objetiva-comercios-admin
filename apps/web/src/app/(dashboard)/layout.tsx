import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { fetchSettings } from '@/lib/api'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await fetchSettings()
    return { title: `${settings.companyName} - Admin` }
  } catch {
    return { title: 'Comercio Ejemplo - Admin' }
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Check authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch branding
  let branding = { companyName: 'Comercio Ejemplo', logoSquare: null as string | null }
  try {
    const settings = await fetchSettings()
    branding = { companyName: settings.companyName, logoSquare: settings.logoSquare }
  } catch {
    // Use defaults
  }

  // Prepare user data for client components
  const userData = {
    email: user.email!,
    name: user.user_metadata?.name,
    avatar_url: user.user_metadata?.avatar_url,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar className="hidden md:flex" branding={branding} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={userData} branding={branding} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
