import { faker } from '@faker-js/faker'
import type { GeneratedProduct } from './product.generator'

const PURCHASE_STATUSES = [
  { value: 'received' as const, weight: 60 },
  { value: 'ordered' as const, weight: 25 },
  { value: 'draft' as const, weight: 10 },
  { value: 'cancelled' as const, weight: 5 },
]

export interface GeneratedPurchaseItem {
  productId: number
  productName: string
  sku: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface GeneratedPurchase {
  id: number
  purchaseNumber: string
  supplierId: number
  supplierName: string
  items: GeneratedPurchaseItem[]
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'ordered' | 'received' | 'cancelled'
  expectedDelivery: string
  createdAt: string
  updatedAt: string
  supplierContact: string
  shipping: number
  notes: string
  receivedAt: string | null
}

export function generatePurchase(id: number, products: GeneratedProduct[]): GeneratedPurchase {
  // Use deterministic seed for reproducibility
  faker.seed(id + 40000)

  const itemCount = faker.number.int({ min: 1, max: 10 })
  const items: GeneratedPurchaseItem[] = []

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
  const status = faker.helpers.weightedArrayElement(PURCHASE_STATUSES)
  const createdAt = faker.date.past({ years: 1 }).toISOString()

  return {
    id,
    purchaseNumber: `PO-${faker.string.numeric(8)}`,
    supplierId: faker.number.int({ min: 1, max: 50 }),
    supplierName: faker.company.name(),
    items,
    subtotal,
    tax,
    total,
    status,
    expectedDelivery: faker.date.future({ years: 0.25 }).toISOString(),
    createdAt,
    updatedAt: faker.date.recent({ days: 7 }).toISOString(),
    supplierContact: faker.internet.email(),
    shipping: parseFloat(faker.commerce.price({ min: 10, max: 200 })),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }) ?? '',
    receivedAt:
      status === 'received'
        ? faker.date.between({ from: new Date(createdAt), to: new Date() }).toISOString()
        : null,
  }
}

export function generatePurchases(
  count: number,
  products: GeneratedProduct[]
): GeneratedPurchase[] {
  return Array.from({ length: count }, (_, i) => generatePurchase(i + 1, products))
}
