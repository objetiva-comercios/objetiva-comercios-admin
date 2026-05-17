/**
 * Phase 30 — Templates + Composición SKU/Nombre
 *
 * Tipos compartidos consumidos por:
 *   - packages/utils/src/composer.ts (composeSku, composeNombre)
 *   - apps/backend/src/modules/templates/* (Plan 03)
 *   - apps/web/src/lib/composer.test.ts y futuros consumidores Phase 32+
 *
 * Decisiones cerradas (ver .planning/phases/30-templates-composici-n-sku-nombre/30-CONTEXT.md):
 *   D-13 — schema de articulos_templates + template_atributos
 *   D-16 — composeSku usa filtro esVariante && ordenSku !== null + sort + map + filter Boolean
 *   D-17 — composeNombre usa filtro ordenNombre !== null + sort + join(' ')
 *
 * Sin lógica, sin Zod. Tipos puros únicamente.
 */

export interface TemplateAtributo {
  /** Tipo de atributo: 'objeto' | 'marca' | 'modelo' | 'medida' | 'custom_1' | ... */
  atributoTipo: string
  /** NULL = el atributo NO aparece en el nombre auto */
  ordenNombre: number | null
  /** NULL = el atributo NO aparece en el SKU */
  ordenSku: number | null
  /** Si es eje de variante (segrega artículos del mismo codigo) */
  esVariante: boolean
  /** NULL si no es custom; 1, 2 o 3 si es slot custom mapeado a una tabla prop_* */
  customSlot: number | null
}

export interface Template {
  id: number
  nombre: string
  atributos: TemplateAtributo[]
}

/**
 * Mapa de atributos de un artículo concreto.
 * Clave: atributoTipo (debe coincidir con Template.atributos[*].atributoTipo).
 * Valor: string del valor del atributo, o undefined si no aplica.
 */
export type AtributosMap = Record<string, string | undefined>
