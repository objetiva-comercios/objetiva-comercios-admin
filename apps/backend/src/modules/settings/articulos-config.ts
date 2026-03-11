export interface CamposVisibles {
  marca: boolean
  modelo: boolean
  talle: boolean
  color: boolean
  material: boolean
  presentacion: boolean
  medida: boolean
  sku: boolean
  codigoBarras: boolean
  costo: boolean
  observaciones: boolean
  erp: boolean
  origen: boolean
}

export interface ArticulosConfig {
  camposVisibles: CamposVisibles
}

export const DEFAULT_ARTICULOS_CONFIG: ArticulosConfig = {
  camposVisibles: {
    marca: true,
    modelo: true,
    talle: false,
    color: false,
    material: false,
    presentacion: true,
    medida: true,
    sku: true,
    codigoBarras: true,
    costo: true,
    observaciones: true,
    erp: true,
    origen: true,
  },
}
