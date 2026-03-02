import { faker } from '@faker-js/faker'
import type { GeneratedProduct } from './product.generator'

export interface GeneratedInventoryItem {
  id: number
  productId: number
  productName: string
  sku: string
  quantity: number
  minStock: number
  maxStock: number
  location: string
  lastRestocked: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  reservedQuantity: number
  availableQuantity: number
  reorderPoint: number
}

export function generateInventory(products: GeneratedProduct[]): GeneratedInventoryItem[] {
  return products.map(product => {
    // Use deterministic seed based on product ID
    faker.seed(product.id + 10000)

    const quantity = product.stock
    const minStock = faker.number.int({ min: 5, max: 20 })

    // Derive status from quantity
    let status: 'in_stock' | 'low_stock' | 'out_of_stock'
    if (quantity === 0) {
      status = 'out_of_stock'
    } else if (quantity <= minStock) {
      status = 'low_stock'
    } else {
      status = 'in_stock'
    }

    const reservedQuantity =
      quantity > 0 ? faker.number.int({ min: 0, max: Math.floor(quantity * 0.3) }) : 0
    const availableQuantity = quantity - reservedQuantity

    return {
      id: product.id,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity,
      minStock,
      maxStock: faker.number.int({ min: 100, max: 500 }),
      location: `${faker.string.alpha({ length: 1, casing: 'upper' })}${faker.number.int({ min: 1, max: 99 })}-${faker.number.int({ min: 1, max: 50 })}`,
      lastRestocked: faker.date.recent({ days: 60 }).toISOString(),
      status,
      reservedQuantity,
      availableQuantity,
      reorderPoint: minStock,
    }
  })
}
