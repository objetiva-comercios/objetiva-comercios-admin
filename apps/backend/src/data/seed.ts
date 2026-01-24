import { Product, Order, InventoryItem, Sale, Purchase } from './types'
import { generateProducts } from './generators/product.generator'
import { generateOrders } from './generators/order.generator'
import { generateInventory } from './generators/inventory.generator'
import { generateSales } from './generators/sale.generator'
import { generatePurchases } from './generators/purchase.generator'

export interface MockData {
  products: Product[]
  orders: Order[]
  inventory: InventoryItem[]
  sales: Sale[]
  purchases: Purchase[]
}

/**
 * Central seeding function that generates all mock data with referential integrity.
 * All data is deterministically generated - same output every time.
 *
 * @returns MockData object containing all generated entities
 */
export function seedAll(): MockData {
  // Generate products first (they're the foundation for all other entities)
  const products = generateProducts(500)

  // Generate related data - all reference the products array
  const orders = generateOrders(200, products)
  const inventory = generateInventory(products)
  const sales = generateSales(150, products)
  const purchases = generatePurchases(50, products)

  return {
    products,
    orders,
    inventory,
    sales,
    purchases,
  }
}
