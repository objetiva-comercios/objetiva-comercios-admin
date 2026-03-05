export interface Deposito {
  id: number
  nombre: string
  direccion: string | null
  descripcion: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
  stockSummary: {
    totalArticulos: number
    totalUnidades: number
  }
}
