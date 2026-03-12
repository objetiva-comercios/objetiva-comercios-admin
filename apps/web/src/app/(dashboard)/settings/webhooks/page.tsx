import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WebhooksClient } from '@/components/settings/webhooks/webhooks-client'

export default async function WebhooksPage() {
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
        <h2 className="text-lg font-medium">Webhooks</h2>
        <p className="text-sm text-muted-foreground">
          Configurá las notificaciones a URLs externas
        </p>
      </div>
      <WebhooksClient />
    </div>
  )
}
