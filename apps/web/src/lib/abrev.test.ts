import { describe, it, expect } from 'vitest'
import { suggestAbrev } from './abrev'

/**
 * Tests para `suggestAbrev` (Phase 29 - RED phase).
 *
 * Esta suite se escribe ANTES de la implementacion `abrev.ts` (TDD strict).
 * Cubre los 9 casos del research (Pattern 6) + 1 caso de cap-test
 * (defense-in-depth).
 *
 * Los inputs SI contienen tildes/diacriticos y caracteres no-ASCII — eso es
 * exactamente lo que el algoritmo debe normalizar (NFD + strip combining
 * marks). La implementacion en `abrev.ts` usa el regex escapado
 * `/[̀-ͯ]/g` (NO la forma con caracteres invisibles).
 */
describe('suggestAbrev', () => {
  it('takes first 4 ASCII chars uppercase from a simple word', () => {
    expect(suggestAbrev('Shimano')).toBe('SHIM')
  })

  it('uses dominant first word for compound names', () => {
    expect(suggestAbrev('Continental Europa')).toBe('CONT')
  })

  it('strips diacritics (NFD): Niño -> NINO', () => {
    expect(suggestAbrev('Niño')).toBe('NINO')
  })

  it("handles apostrophe: L'Oréal -> LORE", () => {
    expect(suggestAbrev("L'Oréal")).toBe('LORE')
  })

  it('handles slashes: AC/DC -> ACDC', () => {
    expect(suggestAbrev('AC/DC')).toBe('ACDC')
  })

  it('preserves digits: 3M -> 3M', () => {
    expect(suggestAbrev('3M')).toBe('3M')
  })

  it('returns empty for empty input', () => {
    expect(suggestAbrev('')).toBe('')
  })

  it('returns empty for whitespace only', () => {
    expect(suggestAbrev('  ')).toBe('')
  })

  it('strips punctuation and trims: "  ¡Hola!  " -> HOLA', () => {
    expect(suggestAbrev('  ¡Hola!  ')).toBe('HOLA')
  })

  it('caps to 8 if takeChars override exceeds 8', () => {
    // defense-in-depth: si alguien pasa takeChars=20, sigue capeado a 8
    expect(suggestAbrev('Abcdefghijklmnop', 20)).toHaveLength(8)
  })
})
