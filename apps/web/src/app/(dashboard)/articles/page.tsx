import { fetchProducts } from '@/lib/api'
import { ArticlesClient } from './articles-client'

export default async function ArticlesPage() {
  // Fetch products from backend
  const response = await fetchProducts()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <p className="text-muted-foreground">Manage your product catalog and inventory items.</p>
      </div>
      <ArticlesClient products={response.data} />
    </div>
  )
}
