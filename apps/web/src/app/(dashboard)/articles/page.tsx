import { fetchProducts } from '@/lib/api'
import { ArticlesClient } from './articles-client'

export default async function ArticlesPage() {
  // Fetch products from backend
  const response = await fetchProducts()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Artículos</h1>
        <p className="text-muted-foreground">Gestioná tu catálogo de artículos e inventario.</p>
      </div>
      <ArticlesClient products={response.data} />
    </div>
  )
}
