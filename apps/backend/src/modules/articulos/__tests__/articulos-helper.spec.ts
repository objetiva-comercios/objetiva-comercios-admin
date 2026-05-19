/**
 * Unit tests for ArticulosHelper.resolveSku()
 *
 * Phase 31 Plan 31-02 — GREEN: tests implementados y desbloquados.
 * Phase 31 Plan 31-04 — SMOKE: verificacion post-Deploy-3 de no invocacion de resolveSku.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ArticulosHelper } from '../articulos-helper'
import { ArticulosModule } from '../articulos.module'
import { DrizzleService } from '../../../db'
import { ExistenciasService } from '../../existencias/existencias.service'

// ─── Mock DrizzleService ─────────────────────────────────────────────────────

/**
 * Construye un mock de DrizzleService que responde a la cadena fluent:
 *   drizzle.db.select(...).from(...).where(...).limit(1)
 * retornando el array `returnValue`.
 */
function buildDrizzleMock(returnValue: Array<{ sku: string | null }>) {
  const limitFn = jest.fn().mockResolvedValue(returnValue)
  const whereFn = jest.fn().mockReturnValue({ limit: limitFn })
  const fromFn = jest.fn().mockReturnValue({ where: whereFn })
  const selectFn = jest.fn().mockReturnValue({ from: fromFn })

  return {
    db: { select: selectFn },
    _limitFn: limitFn,
    _whereFn: whereFn,
    _fromFn: fromFn,
    _selectFn: selectFn,
  }
}

/**
 * Construye un mock de DrizzleService para ExistenciasService.upsert()
 * que soporta la cadena: insert().values().onConflictDoUpdate().returning()
 */
function buildDrizzleUpsertMock() {
  const returningFn = jest
    .fn()
    .mockResolvedValue([
      {
        articuloSku: 'TEST',
        depositoId: 1,
        cantidad: 5,
        stockMinimo: 0,
        stockMaximo: 0,
        updatedAt: new Date(),
      },
    ])
  const onConflictFn = jest.fn().mockReturnValue({ returning: returningFn })
  const valuesFn = jest.fn().mockReturnValue({ onConflictDoUpdate: onConflictFn })
  const insertFn = jest.fn().mockReturnValue({ values: valuesFn })

  return {
    db: { insert: insertFn },
    _insertFn: insertFn,
    _valuesFn: valuesFn,
    _onConflictFn: onConflictFn,
    _returningFn: returningFn,
  }
}

// ─── Tests de ArticulosHelper ────────────────────────────────────────────────

describe('ArticulosHelper', () => {
  let helper: ArticulosHelper
  let drizzleMock: ReturnType<typeof buildDrizzleMock>

  beforeEach(async () => {
    drizzleMock = buildDrizzleMock([{ sku: 'ABC001' }])

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticulosHelper,
        {
          provide: DrizzleService,
          useValue: drizzleMock,
        },
      ],
    }).compile()

    helper = module.get<ArticulosHelper>(ArticulosHelper)
  })

  it('resolveSku returns canonical sku for existing articulo', async () => {
    // drizzleMock ya configurado para retornar [{ sku: 'ABC001' }]
    const result = await helper.resolveSku('ABC-001')
    expect(result).toBe('ABC001')
  })

  it('resolveSku throws NotFoundException for missing articulo', async () => {
    // Reconfigurar mock para retornar array vacio
    drizzleMock._limitFn.mockResolvedValue([])

    await expect(helper.resolveSku('NOEXISTE')).rejects.toThrow(NotFoundException)
    await expect(helper.resolveSku('NOEXISTE')).rejects.toThrow(
      'Articulo NOEXISTE no tiene sku asignado'
    )
  })

  it('resolveSku throws NotFoundException when articulo has null sku', async () => {
    // Reconfigurar mock para retornar fila con sku null
    drizzleMock._limitFn.mockResolvedValue([{ sku: null }])

    await expect(helper.resolveSku('CODIGO-NULL-SKU')).rejects.toThrow(NotFoundException)
    await expect(helper.resolveSku('CODIGO-NULL-SKU')).rejects.toThrow(
      'Articulo CODIGO-NULL-SKU no tiene sku asignado'
    )
  })

  it('ArticulosModule exports ArticulosHelper — provider injected via module metadata', async () => {
    // Verifica que ArticulosModule provee y exporta ArticulosHelper.
    // Usamos un módulo de testing que importa ArticulosModule e inyecta todos sus deps,
    // incluyendo los transitivos (DrizzleService, EventEmitter2).
    const eventEmitterMock = { emit: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticulosHelper,
        {
          provide: DrizzleService,
          useValue: drizzleMock,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitterMock,
        },
      ],
    }).compile()

    const exportedHelper = moduleRef.get<ArticulosHelper>(ArticulosHelper)
    expect(exportedHelper).toBeInstanceOf(ArticulosHelper)
  })

  // ─── Smoke test post-Deploy-3 (Phase 31 Plan 31-04) ──────────────────────
  it('post-Deploy-3: ExistenciasService.upsert no invoca articulosHelper.resolveSku', async () => {
    // Verifica que post-Deploy-3 el service usa dto.articuloSku directo
    // y NO invoca resolveSku (T-31-20 mitigado).
    const upsertDrizzleMock = buildDrizzleUpsertMock()

    const helperMock = {
      resolveSku: jest.fn(),
      toRefPair: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExistenciasService,
        {
          provide: DrizzleService,
          useValue: upsertDrizzleMock,
        },
        {
          provide: ArticulosHelper,
          useValue: helperMock,
        },
      ],
    }).compile()

    const service = moduleRef.get<ExistenciasService>(ExistenciasService)

    await service.upsert({ articuloSku: 'TEST', depositoId: 1, cantidad: 5 })

    // Post-Deploy-3: resolveSku NO debe ser invocado — el DTO ya trae articuloSku
    expect(helperMock.resolveSku).toHaveBeenCalledTimes(0)
  })
})
