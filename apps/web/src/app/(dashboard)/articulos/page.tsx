import { fetchArticulos } from '@/lib/api'
import { ArticulosClient } from './articulos-client'

export default async function ArticulosPage() {
  const response = await fetchArticulos({ page: 1, limit: 20, activo: true })

  return <ArticulosClient initialData={response} />
}
