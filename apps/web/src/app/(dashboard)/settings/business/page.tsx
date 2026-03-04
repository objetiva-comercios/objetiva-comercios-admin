import { createClient } from '@/lib/supabase/server'
import { BusinessForm } from '@/components/settings/business-form'

export default async function BusinessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const business = user?.user_metadata?.business ?? {
    company_name: '',
    address: '',
    tax_id: '',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración del negocio</h2>
        <p className="text-muted-foreground">
          Configurá la información y preferencias de tu negocio.
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <BusinessForm initialValues={business} />
      </div>
    </div>
  )
}
