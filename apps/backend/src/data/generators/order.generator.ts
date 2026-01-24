import { faker } from '@faker-js/faker'
import { Order, OrderItem, Product } from '../types'

const ORDER_STATUSES = [
  { value: 'delivered' as const, weight: 50 },
  { value: 'shipped' as const, weight: 20 },
  { value: 'processing' as const, weight: 15 },
  { value: 'pending' as const, weight: 10 },
  { value: 'cancelled' as const, weight: 5 },
]

export function generateOrder(id: number, products: Product[]): Order {
  // Use deterministic seed for reproducibility
  faker.seed(id + 20000)

  const itemCount = faker.number.int({ min: 1, max: 5 })
  const items: OrderItem[] = []

  for (let i = 0; i < itemCount; i++) {
    const product = faker.helpers.arrayElement(products)
    const quantity = faker.number.int({ min: 1, max: 10 })
    const price = product.price
    const subtotal = parseFloat((quantity * price).toFixed(2))

    items.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity,
      price,
      subtotal,
    })
  }

  const subtotal = parseFloat(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2))
  const tax = parseFloat((subtotal * 0.16).toFixed(2))
  const total = parseFloat((subtotal + tax).toFixed(2))

  return {
    id,
    orderNumber: `ORD-${faker.string.numeric(8)}`,
    customerId: faker.number.int({ min: 1, max: 1000 }),
    customerName: faker.person.fullName(),
    customerEmail: faker.internet.email(),
    items,
    subtotal,
    tax,
    total,
    status: faker.helpers.weightedArrayElement(ORDER_STATUSES),
    createdAt: faker.date.past({ years: 1 }).toISOString(),
    updatedAt: faker.date.recent({ days: 7 }).toISOString(),
  }
}

export function generateOrders(count: number, products: Product[]): Order[] {
  return Array.from({ length: count }, (_, i) => generateOrder(i + 1, products))
}
