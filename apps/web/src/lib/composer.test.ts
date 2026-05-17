import { describe, it, expect } from 'vitest'
import { stripSep, composeSku, composeNombre } from '@objetiva/utils'
import type { Template } from '@objetiva/types'

/**
 * Tests para el composer de Phase 30 — RED phase (TDD strict).
 *
 * Esta suite se escribe ANTES de la implementacion `packages/utils/src/composer.ts`.
 * Los 12+ casos cubren los 8 casos de borde críticos documentados en:
 *   - .planning/phases/30-templates-composici-n-sku-nombre/30-RESEARCH.md
 *     §"Casos de borde críticos para el composer (Wave 0)"
 *   - .planning/phases/30-templates-composici-n-sku-nombre/30-VALIDATION.md
 *     §"Casos de Borde Críticos (composer)"
 *
 * Decisiones aplicadas: D-14 (receta nombre default), D-15 (sku shortcut sin variantes),
 * D-16 (composeSku algoritmo), D-17 (composeNombre algoritmo).
 */

// Fixture: template default automotor (D-13, D-14).
// Receta nombre: [objeto, marca, modelo, medida, custom_1] ordenNombre 1..5.
// Receta SKU: vacía (esVariante=false en todos los atributos) → sku = stripSep(codigo) (D-15).
const templateDefault: Template = {
  id: 1,
  nombre: 'default',
  atributos: [
    {
      atributoTipo: 'objeto',
      ordenNombre: 1,
      ordenSku: null,
      esVariante: false,
      customSlot: null,
    },
    {
      atributoTipo: 'marca',
      ordenNombre: 2,
      ordenSku: null,
      esVariante: false,
      customSlot: null,
    },
    {
      atributoTipo: 'modelo',
      ordenNombre: 3,
      ordenSku: null,
      esVariante: false,
      customSlot: null,
    },
    {
      atributoTipo: 'medida',
      ordenNombre: 4,
      ordenSku: null,
      esVariante: false,
      customSlot: null,
    },
    {
      atributoTipo: 'custom_1',
      ordenNombre: 5,
      ordenSku: null,
      esVariante: false,
      customSlot: 1,
    },
  ],
}

// Fixture: template con variantes (talle, color) — para tests composeSku con receta no-vacía.
// Orden SKU: talle=1, color=2.
const templateConVariantes: Template = {
  id: 2,
  nombre: 'indumentaria',
  atributos: [
    {
      atributoTipo: 'objeto',
      ordenNombre: 1,
      ordenSku: null,
      esVariante: false,
      customSlot: null,
    },
    {
      atributoTipo: 'talle',
      ordenNombre: 2,
      ordenSku: 1,
      esVariante: true,
      customSlot: null,
    },
    {
      atributoTipo: 'color',
      ordenNombre: 3,
      ordenSku: 2,
      esVariante: true,
      customSlot: null,
    },
  ],
}

describe('stripSep', () => {
  it('removes hyphens from codigo: AMOR-001 -> AMOR001', () => {
    expect(stripSep('AMOR-001')).toBe('AMOR001')
  })

  it('removes dots from codigo: X.001.A -> X001A', () => {
    expect(stripSep('X.001.A')).toBe('X001A')
  })

  it('removes spaces from codigo: AMOR 001 -> AMOR001', () => {
    expect(stripSep('AMOR 001')).toBe('AMOR001')
  })

  it('removes underscores from codigo: A_B_C -> ABC', () => {
    expect(stripSep('A_B_C')).toBe('ABC')
  })

  it('collapses consecutive mixed separators: AB-_. C -> ABC', () => {
    expect(stripSep('AB-_. C')).toBe('ABC')
  })
})

describe('composeNombre', () => {
  it('omits empty/undefined attributes without producing double spaces (caso 4 VALIDATION)', () => {
    const atributos = {
      objeto: 'Amortiguador',
      marca: '',
      medida: undefined,
    }
    expect(composeNombre(atributos, templateDefault)).toBe('Amortiguador')
  })

  it('respects ordenNombre ascending order from template (caso 6 VALIDATION)', () => {
    // Si proporcionamos atributos en cualquier orden, el resultado sigue el ordenNombre del template.
    const atributos = {
      modelo: 'C24-A',
      objeto: 'Amortiguador',
      marca: 'Sachs',
    }
    expect(composeNombre(atributos, templateDefault)).toBe('Amortiguador Sachs C24-A')
  })

  it('builds full nombre with all 5 attributes (receta default D-14)', () => {
    const atributos = {
      objeto: 'Amortiguador',
      marca: 'Sachs',
      modelo: 'C24-A',
      medida: '345mm',
      custom_1: 'Fiat Cronos 1.3',
    }
    expect(composeNombre(atributos, templateDefault)).toBe(
      'Amortiguador Sachs C24-A 345mm Fiat Cronos 1.3'
    )
  })

  it('returns empty string when no attributes are present', () => {
    expect(composeNombre({}, templateDefault)).toBe('')
  })
})

describe('composeSku', () => {
  it('returns stripSep(codigo) shortcut when template has no variantes (caso 5 VALIDATION + D-15)', () => {
    expect(composeSku('AMOR-001', {}, templateDefault)).toBe('AMOR001')
  })

  it('returns stripSep(codigo) shortcut when template has empty atributos array', () => {
    const emptyTemplate: Template = { id: 99, nombre: 'empty', atributos: [] }
    expect(composeSku('XY.99', { objeto: 'Foo' }, emptyTemplate)).toBe('XY99')
  })

  it('concatenates variant values with hyphens when template has variantes', () => {
    const atributos = { talle: 'M', color: 'Rojo' }
    expect(composeSku('XYZ-100', atributos, templateConVariantes)).toBe('XYZ100-M-Rojo')
  })

  it('handles cross-prop value collision without conflict (caso 7 VALIDATION)', () => {
    // talle=XL y color=XL en variantes distintas → ambos aparecen sin colisión
    const atributos = { talle: 'XL', color: 'XL' }
    expect(composeSku('XYZ', atributos, templateConVariantes)).toBe('XYZ-XL-XL')
  })

  it('omits es_variante atributos with undefined value without error (caso 8 VALIDATION)', () => {
    // talle definido, color undefined → solo aparece talle
    const atributos = { talle: 'M', color: undefined }
    expect(composeSku('XYZ-001', atributos, templateConVariantes)).toBe('XYZ001-M')
  })

  it('omits es_variante atributos with empty string value', () => {
    const atributos = { talle: 'M', color: '' }
    expect(composeSku('XYZ-001', atributos, templateConVariantes)).toBe('XYZ001-M')
  })

  it('returns stripSep(codigo) only when all variant values are missing', () => {
    const atributos = { talle: undefined, color: undefined }
    expect(composeSku('XYZ-001', atributos, templateConVariantes)).toBe('XYZ001')
  })

  it('respects ordenSku ascending when building SKU parts', () => {
    // Sanity check: si invertimos el orden en el fixture en runtime, el output sigue ordenSku.
    const reversedTemplate: Template = {
      id: 3,
      nombre: 'reversed',
      atributos: [
        {
          atributoTipo: 'color',
          ordenNombre: null,
          ordenSku: 1, // color primero
          esVariante: true,
          customSlot: null,
        },
        {
          atributoTipo: 'talle',
          ordenNombre: null,
          ordenSku: 2, // talle segundo
          esVariante: true,
          customSlot: null,
        },
      ],
    }
    expect(composeSku('XYZ', { talle: 'M', color: 'Rojo' }, reversedTemplate)).toBe(
      'XYZ-Rojo-M'
    )
  })
})
