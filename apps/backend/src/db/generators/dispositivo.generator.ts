export interface GeneratedDispositivo {
  nombre: string
  identificador: string
  descripcion: string | null
  activo: boolean
}

const DISPOSITIVOS: GeneratedDispositivo[] = [
  {
    nombre: 'Tablet Almacen 1',
    identificador: 'DEV-001',
    descripcion: 'Samsung Galaxy Tab A8 para conteo en deposito central',
    activo: true,
  },
  {
    nombre: 'Scanner Piso 2',
    identificador: 'DEV-002',
    descripcion: 'Lector de codigos de barras portatil segundo piso',
    activo: true,
  },
  {
    nombre: 'Tablet Sucursal Norte',
    identificador: 'DEV-003',
    descripcion: 'Dispositivo movil para inventario sucursal norte',
    activo: true,
  },
  {
    nombre: 'Scanner Auxiliar',
    identificador: 'DEV-004',
    descripcion: 'Lector portatil de respaldo',
    activo: false,
  },
  {
    nombre: 'Tablet Recepcion',
    identificador: 'DEV-005',
    descripcion: null,
    activo: true,
  },
]

export function generateDispositivos(): GeneratedDispositivo[] {
  return DISPOSITIVOS
}
