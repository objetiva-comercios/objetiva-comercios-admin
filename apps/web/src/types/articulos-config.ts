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

/** Human-readable labels for each campo */
export const CAMPOS_LABELS: Record<keyof CamposVisibles, string> = {
  marca: 'Marca',
  modelo: 'Modelo',
  talle: 'Talle',
  color: 'Color',
  material: 'Material',
  presentacion: 'Presentacion',
  medida: 'Medida',
  sku: 'SKU',
  codigoBarras: 'Codigo de barras',
  costo: 'Costo',
  observaciones: 'Observaciones',
  erp: 'ERP',
  origen: 'Origen',
}
