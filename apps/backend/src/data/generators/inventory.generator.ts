import { faker } from '@faker-js/faker'
import { Product, InventoryItem } from '../types'

export function generateInventory(products: Product[]): InventoryItem[] {
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
    }
  })
}
