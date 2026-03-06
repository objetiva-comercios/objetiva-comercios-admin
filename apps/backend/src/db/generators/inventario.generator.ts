import { faker } from '@faker-js/faker'

export interface GeneratedInventarioSector {
  depositoId: number
  nombre: string
  columnas: string[]
}

export interface GeneratedInventario {
  nombre: string
  fecha: Date
  depositoId: number
  descripcion: string | null
  estado: string
}

export interface GeneratedInventarioArticulo {
  inventarioIdx: number
  articuloCodigo: string
  cantidadContada: number
  dispositivoId: number | null
  sectorId: number | null
  observaciones: string | null
}

const SECTOR_NAMES = [
  'Sector A',
  'Sector B',
  'Sector C',
  'Pasillo 1',
  'Pasillo 2',
  'Pasillo 3',
  'Estanteria Principal',
  'Zona Recepcion',
  'Zona Despacho',
  'Piso 1',
  'Piso 2',
]

const ESTADO_DISTRIBUTION: string[] = [
  'pendiente',
  'pendiente',
  'pendiente',
  'en_curso',
  'en_curso',
  'en_curso',
  'finalizado',
  'finalizado',
  'cancelado',
]

export function generateInventarioSectores(depositoIds: number[]): GeneratedInventarioSector[] {
  const sectores: GeneratedInventarioSector[] = []

  for (const depositoId of depositoIds) {
    const numSectores = faker.number.int({ min: 2, max: 4 })
    const shuffledNames = faker.helpers.shuffle([...SECTOR_NAMES])
    const selectedNames = shuffledNames.slice(0, numSectores)

    for (const nombre of selectedNames) {
      const numColumnas = faker.number.int({ min: 2, max: 5 })
      const columnas = Array.from({ length: numColumnas }, (_, i) => `Col ${i + 1}`)

      sectores.push({
        depositoId,
        nombre,
        columnas,
      })
    }
  }

  return sectores
}

export function generateInventarios(
  depositoIds: number[],
  articuloCodigos: string[],
  dispositivoIds: number[],
  sectorIds: number[]
): { inventarios: GeneratedInventario[]; inventariosArticulos: GeneratedInventarioArticulo[] } {
  const inventarios: GeneratedInventario[] = []
  const inventariosArticulos: GeneratedInventarioArticulo[] = []

  const count = faker.number.int({ min: 8, max: 10 })
  const now = new Date()
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const estado = ESTADO_DISTRIBUTION[i % ESTADO_DISTRIBUTION.length]
    const depositoId = faker.helpers.arrayElement(depositoIds)
    const fecha = faker.date.between({ from: threeMonthsAgo, to: now })

    inventarios.push({
      nombre: `Inventario ${String(i + 1).padStart(3, '0')}`,
      fecha,
      depositoId,
      descripcion: faker.datatype.boolean(0.7) ? faker.lorem.sentence() : null,
      estado,
    })

    // Each inventario gets 5-15 counted articulos
    const numArticulos = faker.number.int({ min: 5, max: 15 })
    const shuffledCodigos = faker.helpers.shuffle([...articuloCodigos])
    const selectedCodigos = shuffledCodigos.slice(0, numArticulos)

    for (const articuloCodigo of selectedCodigos) {
      inventariosArticulos.push({
        inventarioIdx: i,
        articuloCodigo,
        cantidadContada: faker.number.int({ min: 0, max: 100 }),
        dispositivoId: faker.datatype.boolean(0.4)
          ? faker.helpers.arrayElement(dispositivoIds)
          : null,
        sectorId:
          faker.datatype.boolean(0.5) && sectorIds.length > 0
            ? faker.helpers.arrayElement(sectorIds)
            : null,
        observaciones: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : null,
      })
    }
  }

  return { inventarios, inventariosArticulos }
}
