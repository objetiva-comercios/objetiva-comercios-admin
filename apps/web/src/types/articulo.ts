/**
 * Articulo type matching Drizzle schema output from articulos table.
 * Note: `precio` and `costo` are string | null because PostgreSQL numeric/doublePrecision
 * returns strings via Drizzle. Use parseFloat() for display/math.
 */
export interface Articulo {
  codigo: string // PK — text, e.g. "ART-001"
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
  precio: string | null // numeric → string, use parseFloat() for display
  costo: string | null // numeric → string, use parseFloat() for display
  imagenesProducto: string[]
  imagenesEtiqueta: string[]
  etiquetasOcr: string[]
  jsonArticulo: unknown | null
  erpId: string | null
  erpCodigo: string | null
  erpNombre: string | null
  erpPrecio: string | null
  erpCosto: string | null
  erpUnidades: number | null
  erpDatos: unknown | null
  erpSincronizado: boolean | null
  erpFechaSync: string | null // Date serialized as string from API
  originSource: string | null
  originSyncId: string | null
  originSyncedAt: string | null // Date serialized as string from API
  activo: boolean
  createdAt: string // Date serialized as string from API
  updatedAt: string // Date serialized as string from API
}
