import { PropiedadesPage } from '@/components/propiedades/propiedades-page'

export default function PropiedadesRoute() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Propiedades</h2>
        <p className="text-sm text-muted-foreground">
          Gestión de propiedades de artículos
        </p>
      </div>
      <PropiedadesPage />
    </div>
  )
}
