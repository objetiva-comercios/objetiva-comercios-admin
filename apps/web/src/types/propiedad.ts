/**
 * Tipos compartidos para Propiedades (Phase 29 - Catalogos de Atributos).
 *
 * Las 6 tablas (`prop_marca`, `prop_color`, `prop_talle`, `prop_material`,
 * `prop_presentacion`, `prop_objeto`) comparten el mismo shape de fila
 * (`Propiedad`). El tipo `PropTipo` se deriva de la tupla canonica `PROP_TIPOS`
 * para garantizar que las 6 keys siempre estan exhaustivamente cubiertas en
 * los registros (`PROP_LABELS`, `PROP_NOMBRE_PLACEHOLDERS`).
 */

export const PROP_TIPOS = ['marca', 'color', 'talle', 'material', 'presentacion', 'objeto'] as const

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
// `gender` se usa para concordancia gramatical en plantillas de UI
// (ver `copyFor` abajo): Nuevo/Nueva, creado/creada, desactivado/desactivada, etc.
export const PROP_LABELS: Record<
  PropTipo,
  { singular: string; plural: string; gender: 'f' | 'm' }
> = {
  marca: { singular: 'Marca', plural: 'Marcas', gender: 'f' },
  color: { singular: 'Color', plural: 'Colores', gender: 'm' },
  talle: { singular: 'Talle', plural: 'Talles', gender: 'm' },
  material: { singular: 'Material', plural: 'Materiales', gender: 'm' },
  presentacion: { singular: 'Presentación', plural: 'Presentaciones', gender: 'f' },
  objeto: { singular: 'Objeto', plural: 'Objetos', gender: 'm' },
}

/**
 * Devuelve todas las formas de copy con concordancia de género para `tipo`.
 *
 *   const c = copyFor('color')
 *   c.nuevo                          // "Nuevo"
 *   `${c.nuevo} ${c.singularLower}`  // "Nuevo color"
 *   `${c.singular} ${c.creada} correctamente`  // "Color creado correctamente"
 *
 * Mantener acá todas las plantillas que dependan del género para no
 * dispersar la lógica gramatical en los componentes.
 */
export function copyFor(tipo: PropTipo) {
  const { singular, plural, gender } = PROP_LABELS[tipo]
  const f = gender === 'f'
  return {
    singular,
    plural,
    singularLower: singular.toLowerCase(),
    pluralLower: plural.toLowerCase(),
    /** "Nueva" o "Nuevo" — para botón / dialog title. */
    nuevo: f ? 'Nueva' : 'Nuevo',
    /** "creada" o "creado" — toast post-create. */
    creada: f ? 'creada' : 'creado',
    /** "actualizada" o "actualizado" — toast post-edit. */
    actualizada: f ? 'actualizada' : 'actualizado',
    /** "desactivada" o "desactivado" — toast post-deactivate. */
    desactivada: f ? 'desactivada' : 'desactivado',
    /** "reactivada" o "reactivado" — toast post-reactivate. */
    reactivada: f ? 'reactivada' : 'reactivado',
    /** "la" o "lo" — pronombre OD: "Los artículos que la/lo usan". */
    pronombre: f ? 'la' : 'lo',
    /** "la" o "el" — artículo definido para frases como "crear la marca / el color". */
    articulo: f ? 'la' : 'el',
    /** "primera" o "primero" — empty state "agregar la primera / el primero".
     *  Nota: la key `ordinalPrimero` es genérica para no engañar al lector
     *  cuando se renderiza para género masculino. */
    ordinalPrimero: f ? 'primera' : 'primero',
  }
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
