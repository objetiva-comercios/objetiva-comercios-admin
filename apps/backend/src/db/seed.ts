import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import { generateArticulos } from './generators/articulo.generator'
import { generateDepositos } from './generators/deposito.generator'
import { generateProducts } from './generators/product.generator'
import { generateOrders } from './generators/order.generator'
import { generateInventory } from './generators/inventory.generator'
import { generateSales } from './generators/sale.generator'
import { generatePurchases } from './generators/purchase.generator'
import { generateExistencias } from './generators/existencia.generator'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function seed() {
  console.log('Truncating all tables...')
  await db.execute(sql`
    TRUNCATE TABLE
      purchase_items, sale_items, order_items,
      inventory, purchases, sales, orders, products,
      existencias, articulos, depositos
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

  // ── Products (v1.0 compat — reduced to 100) ────────────────────────────

  console.log('Seeding 100 products (v1.0 compat)...')
  const productsData = generateProducts(100)
  const insertedProducts = await db
    .insert(schema.products)
    .values(
      productsData.map(p => ({
        sku: p.sku,
        name: p.name,
        description: p.description,
        price: p.price,
        cost: p.cost,
        category: p.category,
        stock: p.stock,
        imageUrl: p.imageUrl,
        status: p.status,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }))
    )
    .returning()

  // Build mapping from generator ID -> real DB ID
  const idMap = new Map<number, number>()
  for (let i = 0; i < productsData.length; i++) {
    idMap.set(productsData[i].id, insertedProducts[i].id)
  }

  // ── Inventory ───────────────────────────────────────────────────────────

  console.log('Seeding inventory (100 items)...')
  const inventoryData = generateInventory(productsData)
  await db.insert(schema.inventory).values(
    inventoryData.map(inv => ({
      productId: idMap.get(inv.productId)!,
      productName: inv.productName,
      sku: inv.sku,
      quantity: inv.quantity,
      minStock: inv.minStock,
      maxStock: inv.maxStock,
      location: inv.location,
      lastRestocked: new Date(inv.lastRestocked),
      status: inv.status,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: inv.availableQuantity,
      reorderPoint: inv.reorderPoint,
    }))
  )

  // ── Orders + Order Items ────────────────────────────────────────────────

  console.log('Seeding 80 orders...')
  const ordersData = generateOrders(80, productsData)

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
          productId: idMap.get(item.productId)!,
          productName: item.productName,
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
  const salesData = generateSales(60, productsData)

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
          productId: idMap.get(item.productId)!,
          productName: item.productName,
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
  const purchasesData = generatePurchases(20, productsData)

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
          productId: idMap.get(item.productId)!,
          productName: item.productName,
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
