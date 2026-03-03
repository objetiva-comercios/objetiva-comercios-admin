export interface Product {
  id: number
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
