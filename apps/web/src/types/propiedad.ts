/**
 * Tipos compartidos para Propiedades (Phase 29 - Catalogos de Atributos).
 *
 * Las 6 tablas (`prop_marca`, `prop_color`, `prop_talle`, `prop_material`,
 * `prop_presentacion`, `prop_objeto`) comparten el mismo shape de fila
 * (`Propiedad`). El tipo `PropTipo` se deriva de la tupla canonica `PROP_TIPOS`
 * para garantizar que las 6 keys siempre estan exhaustivamente cubiertas en
 * los registros (`PROP_LABELS`, `PROP_NOMBRE_PLACEHOLDERS`).
 */

export const PROP_TIPOS = [
  'marca',
  'color',
  'talle',
  'material',
  'presentacion',
  'objeto',
] as const

export type PropTipo = (typeof PROP_TIPOS)[number]

export interface Propiedad {
  id: number
  nombre: string
  abrev: string
  activo: boolean
  createdAt: string
  updatedAt: string
}

// Etiquetas en español (es-MX) para copy en componentes.
export const PROP_LABELS: Record<PropTipo, { singular: string; plural: string }> = {
  marca: { singular: 'Marca', plural: 'Marcas' },
  color: { singular: 'Color', plural: 'Colores' },
  talle: { singular: 'Talle', plural: 'Talles' },
  material: { singular: 'Material', plural: 'Materiales' },
  presentacion: { singular: 'Presentación', plural: 'Presentaciones' },
  objeto: { singular: 'Objeto', plural: 'Objetos' },
}

// Placeholders por tipo para el campo "nombre" del Dialog.
export const PROP_NOMBRE_PLACEHOLDERS: Record<PropTipo, string> = {
  marca: 'Ej: Shimano',
  color: 'Ej: Rojo',
  talle: 'Ej: XL',
  material: 'Ej: Cuero',
  presentacion: 'Ej: Caja',
  objeto: 'Ej: Casco',
}
