import {
  propMarca,
  propColor,
  propTalle,
  propMaterial,
  propPresentacion,
  propObjeto,
  propFamilia,
  propAplicacion,
} from '../../db/schema'

// Tipos canónicos del sistema de propiedades (D-01, D-04 de 29-CONTEXT.md).
// El orden importa para la UI de Tabs y para validaciones del controller.
// Phase 30: extendido con 'familia' (FK a prop_subcategoria, requiere parentId)
// y 'aplicacion' (factory genérico estándar, sin parentId).
export const PROP_TIPOS = [
  'marca',
  'color',
  'talle',
  'material',
  'presentacion',
  'objeto',
  'familia',
  'aplicacion',
] as const

export type PropTipo = (typeof PROP_TIPOS)[number]

// Mapa tipo → tabla Drizzle. Permite implementar el service genérico
// parametrizado por `:tipo` (Pattern 2 del 29-RESEARCH.md).
export const PROP_TABLES = {
  marca: propMarca,
  color: propColor,
  talle: propTalle,
  material: propMaterial,
  presentacion: propPresentacion,
  objeto: propObjeto,
  familia: propFamilia,
  aplicacion: propAplicacion,
} as const

// Etiquetas en español (es-MX) usadas en mensajes de error y respuestas.
// Singular/plural se concatenan según el caso (NotFoundException usa singular,
// ConflictException de duplicado de abrev usa plural).
export const PROP_LABELS: Record<PropTipo, { singular: string; plural: string }> = {
  marca: { singular: 'marca', plural: 'marcas' },
  color: { singular: 'color', plural: 'colores' },
  talle: { singular: 'talle', plural: 'talles' },
  material: { singular: 'material', plural: 'materiales' },
  presentacion: { singular: 'presentación', plural: 'presentaciones' },
  objeto: { singular: 'objeto', plural: 'objetos' },
  familia: { singular: 'familia', plural: 'familias' },
  aplicacion: { singular: 'aplicación', plural: 'aplicaciones' },
}
