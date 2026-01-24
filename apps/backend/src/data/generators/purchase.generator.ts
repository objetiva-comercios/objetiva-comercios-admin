import { faker } from '@faker-js/faker'
import { Purchase, PurchaseItem, Product } from '../types'

const PURCHASE_STATUSES = [
  { value: 'received' as const, weight: 60 },
  { value: 'ordered' as const, weight: 25 },
  { value: 'draft' as const, weight: 10 },
  { value: 'cancelled' as const, weight: 5 },
]

export function generatePurchase(id: number, products: Product[]): Purchase {
  // Use deterministic seed for reproducibility
  faker.seed(id + 40000)

  const itemCount = faker.number.int({ min: 1, max: 10 })
  const items: PurchaseItem[] = []

  for (let i = 0; i < itemCount; i++) {
    const product = faker.helpers.arrayElement(products)
    const quantity = faker.number.int({ min: 10, max: 100 })
    const unitCost = product.cost
    const subtotal = parseFloat((quantity * unitCost).toFixed(2))

    items.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitCost,
      subtotal,
    })
  }

  const subtotal = parseFloat(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2))
  const tax = parseFloat((subtotal * 0.16).toFixed(2))
  const total = parseFloat((subtotal + tax).toFixed(2))

  return {
    id,
    purchaseNumber: `PO-${faker.string.numeric(8)}`,
    supplierId: faker.number.int({ min: 1, max: 50 }),
    supplierName: faker.company.name(),
    items,
    subtotal,
    tax,
    total,
    status: faker.helpers.weightedArrayElement(PURCHASE_STATUSES),
    expectedDelivery: faker.date.future({ years: 0.25 }).toISOString(),
    createdAt: faker.date.past({ years: 1 }).toISOString(),
    updatedAt: faker.date.recent({ days: 7 }).toISOString(),
  }
}

export function generatePurchases(count: number, products: Product[]): Purchase[] {
  return Array.from({ length: count }, (_, i) => generatePurchase(i + 1, products))
}
