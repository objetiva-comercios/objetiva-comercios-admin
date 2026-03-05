import { faker } from '@faker-js/faker'

const MARCAS = [
  'Samsung',
  'LG',
  'Sony',
  'Whirlpool',
  'Mabe',
  'Hisense',
  'Philips',
  'Bosch',
  'Black & Decker',
  'Oster',
  'Hamilton Beach',
  'KitchenAid',
  'Nike',
  'Adidas',
  'Puma',
  null,
]

const COLORES = [
  'Negro',
  'Blanco',
  'Rojo',
  'Azul',
  'Gris',
  'Verde',
  'Amarillo',
  'Rosa',
  'Beige',
  null,
]

const MATERIALES = [
  'Algodón',
  'Poliéster',
  'Acero inoxidable',
  'Plástico',
  'Madera',
  'Vidrio',
  'Cuero',
  'Nylon',
  null,
]

const PRESENTACIONES = ['Unidad', 'Par', 'Docena', 'Paquete x3', 'Paquete x6', 'Caja x12', null]

const TALLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', null]

const MEDIDAS = ['Chico', 'Mediano', 'Grande', '500ml', '1L', '250g', '500g', '1kg', null]

export interface GeneratedArticulo {
  codigo: string
  nombre: string
  sku: string | null
  codigoBarras: string | null
  observaciones: string | null
  marca: string | null
  modelo: string | null
  talle: string | null
  color: string | null
  material: string | null
  presentacion: string | null
  medida: string | null
  precio: string | null
  costo: string | null
  imagenesProducto: string[]
  imagenesEtiqueta: string[]
  etiquetasOcr: string[]
  jsonArticulo: null
  erpId: string | null
  erpCodigo: string | null
  erpNombre: string | null
  erpPrecio: string | null
  erpCosto: string | null
  erpUnidades: number | null
  erpDatos: null
  erpSincronizado: boolean
  erpFechaSync: Date | null
  originSource: string | null
  originSyncId: string | null
  originSyncedAt: Date | null
  activo: boolean
}

function maybeNull<T>(value: T, populatedChance = 0.6): T | null {
  return faker.number.float({ min: 0, max: 1 }) < populatedChance ? value : null
}

export function generateArticulo(index: number): GeneratedArticulo {
  faker.seed(index + 10000)

  const codigo = `ART-${String(index).padStart(3, '0')}`
  const precio = faker.number.float({ min: 10, max: 9999.99, fractionDigits: 2 })
  const costoMultiplier = faker.number.float({ min: 0.6, max: 0.8 })
  const costo = parseFloat((precio * costoMultiplier).toFixed(2))

  const hasErp = faker.number.float({ min: 0, max: 1 }) < 0.2
  const hasOrigin = faker.number.float({ min: 0, max: 1 }) < 0.1

  return {
    codigo,
    nombre: faker.commerce.productName(),
    sku: maybeNull(faker.string.alphanumeric(8).toUpperCase()),
    codigoBarras: maybeNull(faker.string.numeric(13)),
    observaciones: maybeNull(faker.lorem.sentence()),
    marca: faker.helpers.arrayElement(MARCAS),
    modelo: maybeNull(faker.commerce.product()),
    talle: faker.helpers.arrayElement(TALLES),
    color: faker.helpers.arrayElement(COLORES),
    material: faker.helpers.arrayElement(MATERIALES),
    presentacion: faker.helpers.arrayElement(PRESENTACIONES),
    medida: faker.helpers.arrayElement(MEDIDAS),
    precio: precio.toFixed(2),
    costo: costo.toFixed(2),
    imagenesProducto: [],
    imagenesEtiqueta: [],
    etiquetasOcr: [],
    jsonArticulo: null,
    erpId: hasErp ? faker.string.uuid() : null,
    erpCodigo: hasErp ? `ERP-${faker.string.alphanumeric(6).toUpperCase()}` : null,
    erpNombre: hasErp ? faker.commerce.productName() : null,
    erpPrecio: hasErp ? precio.toFixed(2) : null,
    erpCosto: hasErp ? costo.toFixed(2) : null,
    erpUnidades: hasErp ? faker.number.int({ min: 1, max: 100 }) : null,
    erpDatos: null,
    erpSincronizado: hasErp,
    erpFechaSync: hasErp ? faker.date.recent({ days: 30 }) : null,
    originSource: hasOrigin ? faker.helpers.arrayElement(['csv', 'api', 'manual']) : null,
    originSyncId: hasOrigin ? faker.string.uuid() : null,
    originSyncedAt: hasOrigin ? faker.date.recent({ days: 60 }) : null,
    activo: faker.number.float({ min: 0, max: 1 }) < 0.9,
  }
}

export function generateArticulos(count: number = 300): GeneratedArticulo[] {
  return Array.from({ length: count }, (_, i) => generateArticulo(i + 1))
}
