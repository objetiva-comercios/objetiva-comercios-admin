import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DrizzleService } from '../../db'
import { articulos } from '../../db/schema'

/**
 * ArticulosHelper — Centraliza la derivación articulo_codigo → articulo_sku
 * durante la coexistencia Deploy 1 → Deploy 2 (Phase 31).
 *
 * Una sola fuente de verdad para evitar drift entre rutas que escriben en las
 * 5 tablas hijas (order_items, sale_items, purchase_items, existencias,
 * inventarios_articulos). Threat T-31-05 mitigado.
 *
 * IMPORTANTE: resolveSku NUNCA infiere sku como codigoToSku(codigo) en runtime
 * — siempre lee de articulos. Razón: post-Deploy-2 podrían crearse variantes
 * donde sku != codigoToSku(codigo).
 */
@Injectable()
export class ArticulosHelper {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Resuelve articulo_codigo → articulo_sku para doble-escritura.
   * Mientras la PK sea codigo, hace 1 query a articulos para obtener sku.
   * Post-Deploy-2, el caller puede usar directamente articulo_sku como param.
   *
   * @throws NotFoundException si el articulo no existe o su sku es null/undefined
   */
  async resolveSku(articuloCodigo: string): Promise<string> {
    const [row] = await this.drizzle.db
      .select({ sku: articulos.sku })
      .from(articulos)
      .where(eq(articulos.codigo, articuloCodigo))
      .limit(1)

    if (!row?.sku) {
      throw new NotFoundException(`Articulo ${articuloCodigo} no tiene sku asignado`)
    }

    return row.sku
  }

  /**
   * Conveniencia: devuelve par { articuloCodigo, articuloSku } para spread en .values()
   */
  async toRefPair(
    articuloCodigo: string
  ): Promise<{ articuloCodigo: string; articuloSku: string }> {
    const articuloSku = await this.resolveSku(articuloCodigo)
    return { articuloCodigo, articuloSku }
  }
}
