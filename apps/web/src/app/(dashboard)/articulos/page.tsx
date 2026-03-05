import { fetchArticulos } from '@/lib/api'
import { ArticulosClient } from './articulos-client'

export default async function ArticulosPage() {
  const response = await fetchArticulos({ page: 1, limit: 20, activo: true })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Articulos</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu catalogo de articulos e inventario.
        </p>
      </div>
      <ArticulosClient initialData={response} />
    </div>
  )
}
