import type { Template, AtributosMap } from '@objetiva/types'

/**
 * Phase 30 — Templates + Composición SKU/Nombre
 *
 * Funciones puras consumidas por:
 *   - apps/backend: composición de SKU/nombre auto al crear/editar articulos
 *   - apps/web (Phase 32): preview de SKU/nombre en ArticuloForm
 *
 * Decisiones (.planning/phases/30-templates-composici-n-sku-nombre/30-CONTEXT.md):
 *   D-15 — receta SKU default vacía → sku = codigoToSku(codigo)
 *   D-16 — composeSku: filtra esVariante && ordenSku !== null, sort por ordenSku, mapea
 *          a atributos[atributoTipo], filtra Boolean. Si vacío → codigoToSku(codigo).
 *          Si no vacío → codigoToSku(codigo) + '-' + partes.join('-')
 *   D-17 — composeNombre: filtra ordenNombre !== null, sort por ordenNombre, mapea
 *          a atributos[atributoTipo], filtra Boolean, join con ' ' (espacio).
 *
 * Phase 31 sobreescribe D-12 (Phase 29): la fórmula original `stripSep` eliminaba
 * todos los separadores y producía colisiones (200 grupos sobre 101k filas reales).
 * La nueva fórmula `codigoToSku` mapea cada tipo de separador a un carácter
 * URL-safe distinto, mantiene el guion medio libre como separador de variantes
 * (D-16), y produce 0 colisiones sobre la base actual.
 *
 * Reglas:
 *   - Sin side effects, sin dependencias externas (NO slugify — PITFALL-6).
 *   - Sin imports de drizzle-orm ni de apps/*.
 *   - Valores undefined o '' se filtran (no producen dobles espacios ni guiones colgados).
 */

/**
 * Convierte un `codigo` en un `sku` canónico URL-safe, manteniendo el guion medio
 * libre para usarse como separador de variantes (D-16).
 *
 * Patrón Phase 31 (sobreescribe el `stripSep` de Phase 29 D-12).
 *
 * Reemplazos:
 *   - `-` (guion medio) → `_` (underscore)
 *   - cualquier whitespace → `~` (tilde, URL-safe RFC 3986 unreserved)
 *   - resto (`.`, `/`, `(`, `)`, `+`, `,`, `=`, `'`, alfanuméricos) → sin cambio
 *
 * Underscore y tilde fueron elegidos porque no aparecen en ninguno de los 101.021
 * códigos actuales (verificado pre-cutover Phase 31), garantizando una
 * transformación bijectiva.
 *
 * @example
 *   codigoToSku('AMOR-001')      // 'AMOR_001'
 *   codigoToSku('AMOR 001')      // 'AMOR~001'
 *   codigoToSku('X.001.A')       // 'X.001.A'
 *   codigoToSku('A_B_C')         // 'A_B_C'  (underscore en input se preserva)
 *   codigoToSku('AB-_. C')       // 'AB__.~C'
 *   codigoToSku('2137-RA X')     // '2137_RA~X'
 *   codigoToSku('AC/30-RA C18')  // 'AC/30_RA~C18'
 */
export function codigoToSku(codigo: string): string {
  return codigo.replace(/-/g, '_').replace(/\s+/g, '~')
}

/**
 * @deprecated Phase 31 sobreescribe esta función con `codigoToSku`. Se mantiene
 * exportada solo para no romper imports antiguos durante la transición; el código
 * de producción debe migrar a `codigoToSku`. Será eliminada en Phase 33 (cascade
 * engine) cuando ya no haya consumidores.
 *
 * Remueve separadores estándar (`-`, `_`, `.`, espacios). Patrón Phase 29 D-12
 * (sobreescrito por Phase 31 — esta función ya no se usa en composeSku).
 */
export function stripSep(codigo: string): string {
  return codigo.replace(/[-_.\s]+/g, '')
}

/**
 * Compone el SKU de un artículo según la receta del template.
 *
 * Algoritmo (D-16, sobreescrito por Phase 31 — usa `codigoToSku` en lugar de `stripSep`):
 *   1. Filtrar atributos del template con esVariante === true && ordenSku !== null.
 *   2. Sort ascending por ordenSku.
 *   3. Mapear cada uno a atributos[atributoTipo].
 *   4. Filtrar valores falsy (undefined, '').
 *   5. Si lista resultante vacía → return codigoToSku(codigo) (shortcut D-15).
 *   6. Si no vacía → return codigoToSku(codigo) + '-' + partes.join('-').
 *
 * El guion medio sigue actuando como separador entre baseSku y partes de variante;
 * `codigoToSku` reemplaza los guiones del input por underscore para garantizar que
 * el guion medio de la salida sólo aparece como separador, nunca como contenido.
 */
export function composeSku(codigo: string, atributos: AtributosMap, template: Template): string {
  const partes = template.atributos
    .filter(a => a.esVariante && a.ordenSku !== null)
    .slice()
    .sort((a, b) => (a.ordenSku ?? 0) - (b.ordenSku ?? 0))
    .map(a => atributos[a.atributoTipo])
    .filter((v): v is string => Boolean(v))

  const base = codigoToSku(codigo)
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
