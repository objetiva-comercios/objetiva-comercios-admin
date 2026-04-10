import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import { generateArticulos } from './generators/articulo.generator'
import { generateDepositos } from './generators/deposito.generator'
import { generateOrders } from './generators/order.generator'
import { generateSales } from './generators/sale.generator'
import { generatePurchases } from './generators/purchase.generator'
import { generateExistencias } from './generators/existencia.generator'
import { generateDispositivos } from './generators/dispositivo.generator'
import { generateInventarioSectores, generateInventarios } from './generators/inventario.generator'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function seed() {
  console.log('Truncating all tables...')
  await db.execute(sql`
    TRUNCATE TABLE
      inventarios_articulos, inventarios, inventario_sectores, dispositivos_moviles,
      purchase_items, sale_items, order_items,
      purchases, sales, orders,
      existencias, articulos, depositos,
      business_settings
    RESTART IDENTITY CASCADE
  `)

  // ── Depositos ───────────────────────────────────────────────────────────

  const depositosData = generateDepositos()
  console.log(`Seeding ${depositosData.length} depositos...`)
  await db.insert(schema.depositos).values(
    depositosData.map(d => ({
      nombre: d.nombre,
      direccion: d.direccion,
      descripcion: d.descripcion,
      activo: d.activo,
    }))
  )

  // ── Articulos ───────────────────────────────────────────────────────────

  const articulosData = generateArticulos(300)
  console.log(`Seeding ${articulosData.length} articulos...`)

  // Insert in batches of 100 to avoid parameter limit
  for (let i = 0; i < articulosData.length; i += 100) {
    const batch = articulosData.slice(i, i + 100)
    await db.insert(schema.articulos).values(
      batch.map(a => ({
        codigo: a.codigo,
        nombre: a.nombre,
        sku: a.sku,
        codigoBarras: a.codigoBarras,
        observaciones: a.observaciones,
        marca: a.marca,
        modelo: a.modelo,
        talle: a.talle,
        color: a.color,
        material: a.material,
        presentacion: a.presentacion,
        medida: a.medida,
        precio: a.precio,
        costo: a.costo,
        imagenesProducto: a.imagenesProducto,
        imagenesEtiqueta: a.imagenesEtiqueta,
        etiquetasOcr: a.etiquetasOcr,
        jsonArticulo: a.jsonArticulo,
        erpId: a.erpId,
        erpCodigo: a.erpCodigo,
        erpNombre: a.erpNombre,
        erpPrecio: a.erpPrecio,
        erpCosto: a.erpCosto,
        erpUnidades: a.erpUnidades,
        erpDatos: a.erpDatos,
        erpSincronizado: a.erpSincronizado,
        erpFechaSync: a.erpFechaSync,
        originSource: a.originSource,
        originSyncId: a.originSyncId,
        originSyncedAt: a.originSyncedAt,
        activo: a.activo,
      }))
    )
  }

  // ── Existencias ─────────────────────────────────────────────────────────

  // Get inserted deposito IDs
  const insertedDepositos = await db.select({ id: schema.depositos.id }).from(schema.depositos)
  const depositoIds = insertedDepositos.map(d => d.id)
  const articuloCodigos = articulosData.map(a => a.codigo)

  const existenciasData = generateExistencias(articuloCodigos, depositoIds)
  console.log(`Seeding ${existenciasData.length} existencias...`)

  for (let i = 0; i < existenciasData.length; i += 100) {
    const batch = existenciasData.slice(i, i + 100)
    await db.insert(schema.existencias).values(
      batch.map(e => ({
        articuloCodigo: e.articuloCodigo,
        depositoId: e.depositoId,
        cantidad: e.cantidad,
        stockMinimo: e.stockMinimo,
        stockMaximo: e.stockMaximo,
      }))
    )
  }

  // ── Dispositivos Moviles ───────────────────────────────────────────────

  const dispositivosData = generateDispositivos()
  console.log(`Seeding ${dispositivosData.length} dispositivos moviles...`)
  const insertedDispositivos = await db
    .insert(schema.dispositivosMoviles)
    .values(
      dispositivosData.map(d => ({
        nombre: d.nombre,
        identificador: d.identificador,
        descripcion: d.descripcion,
        activo: d.activo,
      }))
    )
    .returning({ id: schema.dispositivosMoviles.id })
  const dispositivoIds = insertedDispositivos.map(d => d.id)

  // ── Inventario Sectores ───────────────────────────────────────────────

  const sectoresData = generateInventarioSectores(depositoIds)
  console.log(`Seeding ${sectoresData.length} inventario sectores...`)
  const insertedSectores = await db
    .insert(schema.inventarioSectores)
    .values(
      sectoresData.map(s => ({
        depositoId: s.depositoId,
        nombre: s.nombre,
        columnas: s.columnas,
      }))
    )
    .returning({ id: schema.inventarioSectores.id })
  const sectorIds = insertedSectores.map(s => s.id)

  // ── Inventarios + Inventarios Articulos ───────────────────────────────

  const { inventarios: inventariosData, inventariosArticulos: invArticulosData } =
    generateInventarios(depositoIds, articuloCodigos, dispositivoIds, sectorIds)
  console.log(`Seeding ${inventariosData.length} inventarios...`)

  const insertedInventarioIds: number[] = []
  for (const inv of inventariosData) {
    const [inserted] = await db
      .insert(schema.inventarios)
      .values({
        nombre: inv.nombre,
        fecha: inv.fecha,
        depositoId: inv.depositoId,
        descripcion: inv.descripcion,
        estado: inv.estado,
      })
      .returning({ id: schema.inventarios.id })
    insertedInventarioIds.push(inserted.id)
  }

  console.log(`Seeding ${invArticulosData.length} inventarios articulos...`)
  for (let i = 0; i < invArticulosData.length; i += 100) {
    const batch = invArticulosData.slice(i, i + 100)
    await db.insert(schema.inventariosArticulos).values(
      batch.map(ia => ({
        inventarioId: insertedInventarioIds[ia.inventarioIdx],
        articuloCodigo: ia.articuloCodigo,
        cantidadContada: ia.cantidadContada,
        dispositivoId: ia.dispositivoId,
        sectorId: ia.sectorId,
        observaciones: ia.observaciones,
      }))
    )
  }

  // ── Orders + Order Items ────────────────────────────────────────────────

  console.log('Seeding 80 orders...')
  const ordersData = generateOrders(80, articulosData)

  for (const order of ordersData) {
    const [insertedOrder] = await db
      .insert(schema.orders)
      .values({
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        status: order.status,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
        shippingAddress: order.shippingAddress,
      })
      .returning()

    if (order.items.length > 0) {
      await db.insert(schema.orderItems).values(
        order.items.map(item => ({
          orderId: insertedOrder.id,
          articuloCodigo: item.articuloCodigo,
          articuloNombre: item.articuloNombre,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        }))
      )
    }
  }

  // ── Sales + Sale Items ──────────────────────────────────────────────────

  console.log('Seeding 60 sales...')
  const salesData = generateSales(60, articulosData)

  for (const sale of salesData) {
    const [insertedSale] = await db
      .insert(schema.sales)
      .values({
        saleNumber: sale.saleNumber,
        customerId: sale.customerId,
        customerName: sale.customerName,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: new Date(sale.createdAt),
        updatedAt: new Date(sale.updatedAt),
      })
      .returning()

    if (sale.items.length > 0) {
      await db.insert(schema.saleItems).values(
        sale.items.map(item => ({
          saleId: insertedSale.id,
          articuloCodigo: item.articuloCodigo,
          articuloNombre: item.articuloNombre,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        }))
      )
    }
  }

  // ── Purchases + Purchase Items ──────────────────────────────────────────

  console.log('Seeding 20 purchases...')
  const purchasesData = generatePurchases(20, articulosData)

  for (const purchase of purchasesData) {
    const [insertedPurchase] = await db
      .insert(schema.purchases)
      .values({
        purchaseNumber: purchase.purchaseNumber,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        subtotal: purchase.subtotal,
        tax: purchase.tax,
        total: purchase.total,
        status: purchase.status,
        expectedDelivery: new Date(purchase.expectedDelivery),
        createdAt: new Date(purchase.createdAt),
        updatedAt: new Date(purchase.updatedAt),
        supplierContact: purchase.supplierContact,
        shipping: purchase.shipping,
        notes: purchase.notes,
        receivedAt: purchase.receivedAt ? new Date(purchase.receivedAt) : null,
      })
      .returning()

    if (purchase.items.length > 0) {
      await db.insert(schema.purchaseItems).values(
        purchase.items.map(item => ({
          purchaseId: insertedPurchase.id,
          articuloCodigo: item.articuloCodigo,
          articuloNombre: item.articuloNombre,
          sku: item.sku,
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal: item.subtotal,
        }))
      )
    }
  }

  await client.end()
  console.log('Seed complete.')
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
