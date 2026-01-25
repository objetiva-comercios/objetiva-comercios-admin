export interface Product {
  id: string
  sku: string
  name: string
  description: string
  category: string
  price: number
  cost: number
  status: 'active' | 'inactive' | 'discontinued'
  createdAt: string
  updatedAt: string
}
