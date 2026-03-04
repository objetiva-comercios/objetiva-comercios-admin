import { faker } from '@faker-js/faker'

const CATEGORIES = [
  'Electrónica',
  'Indumentaria',
  'Hogar y Jardín',
  'Deportes',
  'Libros',
  'Juguetes',
  'Alimentos y Bebidas',
  'Salud y Belleza',
  'Automotriz',
  'Artículos de Oficina',
]

const STATUSES = [
  { value: 'active' as const, weight: 85 },
  { value: 'inactive' as const, weight: 10 },
  { value: 'discontinued' as const, weight: 5 },
]

export interface GeneratedProduct {
  id: number
  sku: string
  name: string
  description: string
  price: number
  cost: number
  category: string
  stock: number
  imageUrl: string
  status: 'active' | 'inactive' | 'discontinued'
  createdAt: string
  updatedAt: string
}

export function generateProduct(id: number): GeneratedProduct {
  // Use deterministic seed for reproducibility
  faker.seed(id)

  const price = parseFloat(faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }).toFixed(2))
  const costMultiplier = faker.number.float({ min: 0.4, max: 0.7 })
  const cost = parseFloat((price * costMultiplier).toFixed(2))

  return {
    id,
    sku: `SKU-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price,
    cost,
    category: faker.helpers.arrayElement(CATEGORIES),
    stock: faker.number.int({ min: 0, max: 500 }),
    imageUrl: faker.image.url({
      width: 400,
      height: 400,
    }),
    status: faker.helpers.weightedArrayElement(STATUSES),
    createdAt: faker.date.past({ years: 2 }).toISOString(),
    updatedAt: faker.date.recent({ days: 30 }).toISOString(),
  }
}

export function generateProducts(count: number = 500): GeneratedProduct[] {
  return Array.from({ length: count }, (_, i) => generateProduct(i + 1))
}
