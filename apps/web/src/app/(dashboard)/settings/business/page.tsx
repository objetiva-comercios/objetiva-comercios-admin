import { fetchSettings } from '@/lib/api'
import { BusinessForm } from '@/components/settings/business-form'

export default async function BusinessPage() {
  const settings = await fetchSettings()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración del negocio</h2>
        <p className="text-muted-foreground">
          Configurá la información y preferencias de tu negocio.
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <BusinessForm initialValues={settings} />
      </div>
    </div>
  )
}
