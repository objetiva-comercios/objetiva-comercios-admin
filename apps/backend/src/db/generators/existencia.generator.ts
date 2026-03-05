import { faker } from '@faker-js/faker'

export interface GeneratedExistencia {
  articuloCodigo: string
  depositoId: number
  cantidad: number
  stockMinimo: number
  stockMaximo: number
}

export function generateExistencias(
  articuloCodigos: string[],
  depositoIds: number[]
): GeneratedExistencia[] {
  const existencias: GeneratedExistencia[] = []

  for (const codigo of articuloCodigos) {
    // Each articulo gets stock in 1-3 random depositos (sparse matrix)
    const numDepositos = faker.number.int({ min: 1, max: Math.min(3, depositoIds.length) })
    const shuffled = faker.helpers.shuffle([...depositoIds])
    const selectedDepositos = shuffled.slice(0, numDepositos)

    for (const depositoId of selectedDepositos) {
      const stockMinimo = faker.number.int({ min: 5, max: 50 })
      const stockMaximo = stockMinimo * 5

      // ~10% chance of zero quantity for "sin stock" KPI data
      const isOutOfStock = faker.number.float({ min: 0, max: 1 }) < 0.1
      const cantidad = isOutOfStock ? 0 : faker.number.int({ min: 0, max: 500 })

      existencias.push({
        articuloCodigo: codigo,
        depositoId,
        cantidad,
        stockMinimo,
        stockMaximo,
      })
    }
  }

  return existencias
}
