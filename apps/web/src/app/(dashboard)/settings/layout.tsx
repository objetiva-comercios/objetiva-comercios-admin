import { Settings } from 'lucide-react'
import { SettingsNav } from '@/components/settings/settings-nav'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userRole = (user?.app_metadata?.role as string) ?? 'viewer'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Settings className="h-7 w-7" style={{ color: '#056ed1' }} />Configuración</h1>
        <p className="text-muted-foreground">
          Administrá tu cuenta y las preferencias de la aplicación.
        </p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="lg:w-64 shrink-0">
          <SettingsNav userRole={userRole} />
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
