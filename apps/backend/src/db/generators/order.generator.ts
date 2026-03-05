import { faker } from '@faker-js/faker'

type ArticuloRef = { codigo: string; nombre: string; sku: string | null }

const ORDER_STATUSES = [
  { value: 'delivered' as const, weight: 50 },
  { value: 'shipped' as const, weight: 20 },
  { value: 'processing' as const, weight: 15 },
  { value: 'pending' as const, weight: 10 },
  { value: 'cancelled' as const, weight: 5 },
]

export interface GeneratedOrderItem {
  articuloCodigo: string
  articuloNombre: string
  sku: string
  quantity: number
  price: number
  subtotal: number
}

export interface GeneratedOrder {
  id: number
  orderNumber: string
  customerId: number
  customerName: string
  customerEmail: string
  items: GeneratedOrderItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  updatedAt: string
  shippingAddress: string
}

export function generateOrder(id: number, articulos: ArticuloRef[]): GeneratedOrder {
  // Use deterministic seed for reproducibility
  faker.seed(id + 20000)

  const itemCount = faker.number.int({ min: 1, max: 5 })
  const items: GeneratedOrderItem[] = []

  for (let i = 0; i < itemCount; i++) {
    const articulo = faker.helpers.arrayElement(articulos)
    const quantity = faker.number.int({ min: 1, max: 10 })
    const price = faker.number.float({ min: 10, max: 500, fractionDigits: 2 })
    const subtotal = parseFloat((quantity * price).toFixed(2))

    items.push({
      articuloCodigo: articulo.codigo,
      articuloNombre: articulo.nombre,
      sku: articulo.sku ?? '',
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
    shippingAddress: faker.location.streetAddress({ useFullAddress: true }),
  }
}

export function generateOrders(count: number, articulos: ArticuloRef[]): GeneratedOrder[] {
  return Array.from({ length: count }, (_, i) => generateOrder(i + 1, articulos))
}
