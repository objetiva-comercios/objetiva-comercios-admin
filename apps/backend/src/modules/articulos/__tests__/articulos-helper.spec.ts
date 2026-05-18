/**
 * Unit tests for ArticulosHelper.resolveSku()
 *
 * ESTADO: SKELETON RED — Phase 31 Wave 0 (Plan 31-01)
 *
 * ArticulosHelper no existe aún; se crea en Plan 31-02.
 * Estos tests están marcados con it.skip() hasta que el helper esté disponible.
 * Instrucción para desbloquear: remover it.skip y reemplazar con it() cuando
 * Plan 31-02 cree ArticulosHelper en src/modules/articulos/articulos-helper.ts
 */

// TODO(Plan-31-02): importar ArticulosHelper cuando exista
// import { ArticulosHelper } from '../articulos-helper'

// TODO(Plan-31-02): importar DrizzleService para mock
// import { DrizzleService } from '../../../db.service'

import { NotFoundException } from '@nestjs/common'

/**
 * Placeholder type hasta que el helper exista.
 * Se reemplaza con el import real en Plan 31-02.
 */
interface ArticulosHelperPlaceholder {
  resolveSku(codigo: string): Promise<string>
}

describe('ArticulosHelper', () => {
  // TODO(Plan-31-02): instanciar el helper con Test.createTestingModule y mock DrizzleService
  let helper: ArticulosHelperPlaceholder

  beforeEach(() => {
    // Placeholder: Test.createTestingModule se configura en Plan 31-02
    // cuando el helper real exista.
    helper = {
      resolveSku: async (_codigo: string) => {
        throw new Error('ArticulosHelper no implementado aún — ver Plan 31-02')
      },
    }
  })

  it.skip('resolveSku returns canonical sku for existing articulo', // Descripcion del comportamiento esperado (Plan 31-02 implementa GREEN):
  // - Mock DrizzleService devuelve [{ sku: 'ABC001', codigo: 'ABC-001' }]
  // - helper.resolveSku('ABC-001') debe retornar 'ABC001' (stripSep aplicado)
  // TODO(Plan-31-02): reemplazar it.skip con it() y agregar mock + assertion
  async () => {
    // Arrange: mock DrizzleService para devolver articulo con sku normalizado
    // jest.spyOn(drizzleService, 'db').mockReturnValue(mockDb)
    // mockDb.select().from(articulos).where(eq(articulos.codigo, 'ABC-001'))
    //   .returns([{ sku: 'ABC001', codigo: 'ABC-001' }])

    // Act
    const result = await helper.resolveSku('ABC-001')

    // Assert
    expect(result).toBe('ABC001')
  })

  it.skip('resolveSku throws NotFoundException for missing articulo', // Descripcion del comportamiento esperado (Plan 31-02 implementa GREEN):
  // - Mock DrizzleService devuelve [] (articulo no encontrado)
  // - helper.resolveSku('NOEXISTE') debe lanzar NotFoundException
  // TODO(Plan-31-02): reemplazar it.skip con it() y agregar mock + assertion
  async () => {
    // Arrange: mock DrizzleService devuelve array vacio
    // jest.spyOn(drizzleService, 'db').mockReturnValue(mockEmptyDb)

    // Act + Assert
    await expect(helper.resolveSku('NOEXISTE')).rejects.toThrow(NotFoundException)
  })
})
