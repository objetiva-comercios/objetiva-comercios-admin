import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApiKeysClient } from '@/components/settings/api-keys/api-keys-client'

export default async function ApiKeysPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = (user?.app_metadata?.role as string) ?? 'viewer'

  if (role !== 'admin') {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Gestioná las keys de acceso para sistemas externos
        </p>
      </div>
      <ApiKeysClient />
    </div>
  )
}
