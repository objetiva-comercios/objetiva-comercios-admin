import type { Template, AtributosMap } from '@objetiva/types'

/**
 * Phase 30 — Templates + Composición SKU/Nombre
 *
 * Funciones puras consumidas por:
 *   - apps/backend: composición de SKU/nombre auto al crear/editar articulos
 *   - apps/web (Phase 32): preview de SKU/nombre en ArticuloForm
 *
 * Decisiones (.planning/phases/30-templates-composici-n-sku-nombre/30-CONTEXT.md):
 *   D-15 — receta SKU default vacía → sku = stripSep(codigo)
 *   D-16 — composeSku: filtra esVariante && ordenSku !== null, sort por ordenSku, mapea
 *          a atributos[atributoTipo], filtra Boolean. Si vacío → stripSep(codigo).
 *          Si no vacío → stripSep(codigo) + '-' + partes.join('-')
 *   D-17 — composeNombre: filtra ordenNombre !== null, sort por ordenNombre, mapea
 *          a atributos[atributoTipo], filtra Boolean, join con ' ' (espacio).
 *
 * Reglas:
 *   - Sin side effects, sin dependencias externas (NO slugify — PITFALL-6).
 *   - Sin imports de drizzle-orm ni de apps/*.
 *   - Valores undefined o '' se filtran (no producen dobles espacios ni guiones colgados).
 */

/**
 * Remueve separadores estándar (`-`, `_`, `.`, espacios) de un código.
 * Patrón Phase 29 D-12.
 *
 * @example
 *   stripSep('AMOR-001')  // 'AMOR001'
 *   stripSep('X.001.A')   // 'X001A'
 *   stripSep('AMOR 001')  // 'AMOR001'
 *   stripSep('A_B_C')     // 'ABC'
 *   stripSep('AB-_. C')   // 'ABC'
 */
export function stripSep(codigo: string): string {
  return codigo.replace(/[-_.\s]+/g, '')
}

/**
 * Compone el SKU de un artículo según la receta del template.
 *
 * Algoritmo (D-16):
 *   1. Filtrar atributos del template con esVariante === true && ordenSku !== null.
 *   2. Sort ascending por ordenSku.
 *   3. Mapear cada uno a atributos[atributoTipo].
 *   4. Filtrar valores falsy (undefined, '').
 *   5. Si lista resultante vacía → return stripSep(codigo) (shortcut D-15).
 *   6. Si no vacía → return stripSep(codigo) + '-' + partes.join('-').
 */
export function composeSku(codigo: string, atributos: AtributosMap, template: Template): string {
  const partes = template.atributos
    .filter(a => a.esVariante && a.ordenSku !== null)
    .slice()
    .sort((a, b) => (a.ordenSku ?? 0) - (b.ordenSku ?? 0))
    .map(a => atributos[a.atributoTipo])
    .filter((v): v is string => Boolean(v))

  const base = stripSep(codigo)
  return partes.length === 0 ? base : `${base}-${partes.join('-')}`
}

/**
 * Compone el nombre auto de un artículo según la receta del template.
 *
 * Algoritmo (D-17):
 *   1. Filtrar atributos del template con ordenNombre !== null.
 *   2. Sort ascending por ordenNombre.
 *   3. Mapear cada uno a atributos[atributoTipo].
 *   4. Filtrar valores falsy (undefined, '').
 *   5. Join con ' ' (espacio simple, sin separador adicional).
 */
export function composeNombre(atributos: AtributosMap, template: Template): string {
  return template.atributos
    .filter(a => a.ordenNombre !== null)
    .slice()
    .sort((a, b) => (a.ordenNombre ?? 0) - (b.ordenNombre ?? 0))
    .map(a => atributos[a.atributoTipo])
    .filter((v): v is string => Boolean(v))
    .join(' ')
}
