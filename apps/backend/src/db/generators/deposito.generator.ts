export interface GeneratedDeposito {
  nombre: string
  direccion: string
  descripcion: string
  activo: boolean
}

const DEPOSITOS: GeneratedDeposito[] = [
  {
    nombre: 'Deposito Central',
    direccion: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX',
    descripcion: 'Almacen principal de mercaderia y distribucion',
    activo: true,
  },
  {
    nombre: 'Sucursal Norte',
    direccion: 'Blvd. Manuel Avila Camacho 567, Naucalpan, Edo. Mex.',
    descripcion: 'Punto de venta y almacen zona norte',
    activo: true,
  },
  {
    nombre: 'Sucursal Sur',
    direccion: 'Calz. de Tlalpan 890, Col. Portales, CDMX',
    descripcion: 'Punto de venta y almacen zona sur',
    activo: true,
  },
  {
    nombre: 'Almacen Auxiliar',
    direccion: 'Calle 5 de Febrero 321, Parque Industrial, Querétaro',
    descripcion: 'Almacen de sobrestock y mercaderia estacional',
    activo: true,
  },
  {
    nombre: 'Deposito Temporal',
    direccion: 'Av. Central 456, Bodega 12, Ecatepec, Edo. Mex.',
    descripcion: 'Almacen temporal para recepciones y despachos en transito',
    activo: true,
  },
]

export function generateDepositos(): GeneratedDeposito[] {
  return DEPOSITOS
}
