import { faker } from '@faker-js/faker'

type ArticuloRef = { codigo: string; nombre: string; sku: string | null }

const SALE_STATUSES = [
  { value: 'completed' as const, weight: 90 },
  { value: 'refunded' as const, weight: 5 },
  { value: 'partial_refund' as const, weight: 5 },
]

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'credit'] as const

export interface GeneratedSaleItem {
  articuloCodigo: string
  articuloNombre: string
  sku: string
  quantity: number
  price: number
  subtotal: number
}

export interface GeneratedSale {
  id: number
  saleNumber: string
  customerId: number
  customerName: string
  items: GeneratedSaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
  status: 'completed' | 'refunded' | 'partial_refund'
  createdAt: string
  updatedAt: string
}

export function generateSale(id: number, articulos: ArticuloRef[]): GeneratedSale {
  // Use deterministic seed for reproducibility
  faker.seed(id + 30000)

  const itemCount = faker.number.int({ min: 1, max: 5 })
  const items: GeneratedSaleItem[] = []

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
  const discount = parseFloat(
    faker.number.float({ min: 0, max: subtotal * 0.2, fractionDigits: 2 }).toFixed(2)
  )
  const total = parseFloat((subtotal + tax - discount).toFixed(2))

  return {
    id,
    saleNumber: `SALE-${faker.string.numeric(8)}`,
    customerId: faker.number.int({ min: 1, max: 1000 }),
    customerName: faker.person.fullName(),
    items,
    subtotal,
    tax,
    discount,
    total,
    paymentMethod: faker.helpers.arrayElement(PAYMENT_METHODS),
    status: faker.helpers.weightedArrayElement(SALE_STATUSES),
    createdAt: faker.date.past({ years: 1 }).toISOString(),
    updatedAt: faker.date.recent({ days: 7 }).toISOString(),
  }
}

export function generateSales(count: number, articulos: ArticuloRef[]): GeneratedSale[] {
  return Array.from({ length: count }, (_, i) => generateSale(i + 1, articulos))
}
