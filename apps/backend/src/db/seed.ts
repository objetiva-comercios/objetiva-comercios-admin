import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import { generateProducts } from './generators/product.generator'
import { generateOrders } from './generators/order.generator'
import { generateInventory } from './generators/inventory.generator'
import { generateSales } from './generators/sale.generator'
import { generatePurchases } from './generators/purchase.generator'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function seed() {
  console.log('Truncating all tables...')
  await db.execute(sql`
    TRUNCATE TABLE
      purchase_items, sale_items, order_items,
      inventory, purchases, sales, orders, products
    RESTART IDENTITY CASCADE
  `)

  // ── Products ─────────────────────────────────────────────────────────────

  console.log('Seeding 500 products...')
  const productsData = generateProducts(500)
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

  // Build mapping from generator ID → real DB ID
  const idMap = new Map<number, number>()
  for (let i = 0; i < productsData.length; i++) {
    idMap.set(productsData[i].id, insertedProducts[i].id)
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  console.log('Seeding inventory (500 items)...')
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
    }))
  )

  // ── Orders + Order Items ──────────────────────────────────────────────────

  console.log('Seeding 200 orders...')
  const ordersData = generateOrders(200, productsData)

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

  // ── Sales + Sale Items ────────────────────────────────────────────────────

  console.log('Seeding 150 sales...')
  const salesData = generateSales(150, productsData)

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

  // ── Purchases + Purchase Items ────────────────────────────────────────────

  console.log('Seeding 50 purchases...')
  const purchasesData = generatePurchases(50, productsData)

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
