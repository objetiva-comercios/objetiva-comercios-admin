import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  doublePrecision,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

// ─── Products ────────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    sku: varchar('sku', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: doublePrecision('price').notNull(),
    cost: doublePrecision('cost').notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    stock: integer('stock').notNull().default(0),
    imageUrl: text('image_url'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('products_category_idx').on(table.category),
    index('products_status_idx').on(table.status),
  ]
)

// ─── Orders ──────────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
    customerId: integer('customer_id').notNull(),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }).notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
    tax: doublePrecision('tax').notNull(),
    total: doublePrecision('total').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('orders_status_idx').on(table.status),
    index('orders_created_at_idx').on(table.createdAt),
  ]
)

// ─── Order Items ──────────────────────────────────────────────────────────────

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productName: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    price: doublePrecision('price').notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
  },
  table => [index('order_items_order_id_idx').on(table.orderId)]
)

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventory = pgTable(
  'inventory',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .unique()
      .references(() => products.id, { onDelete: 'cascade' }),
    productName: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull().default(0),
    minStock: integer('min_stock').notNull().default(10),
    maxStock: integer('max_stock').notNull().default(500),
    location: varchar('location', { length: 20 }).notNull(),
    lastRestocked: timestamp('last_restocked').notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull(),
  },
  table => [index('inventory_status_idx').on(table.status)]
)

// ─── Sales ────────────────────────────────────────────────────────────────────

export const sales = pgTable(
  'sales',
  {
    id: serial('id').primaryKey(),
    saleNumber: varchar('sale_number', { length: 20 }).notNull().unique(),
    customerId: integer('customer_id').notNull(),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
    tax: doublePrecision('tax').notNull(),
    discount: doublePrecision('discount').notNull().default(0),
    total: doublePrecision('total').notNull(),
    paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('sales_status_idx').on(table.status),
    index('sales_payment_method_idx').on(table.paymentMethod),
    index('sales_created_at_idx').on(table.createdAt),
  ]
)

// ─── Sale Items ───────────────────────────────────────────────────────────────

export const saleItems = pgTable(
  'sale_items',
  {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productName: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    price: doublePrecision('price').notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
  },
  table => [index('sale_items_sale_id_idx').on(table.saleId)]
)

// ─── Purchases ────────────────────────────────────────────────────────────────

export const purchases = pgTable(
  'purchases',
  {
    id: serial('id').primaryKey(),
    purchaseNumber: varchar('purchase_number', { length: 20 }).notNull().unique(),
    supplierId: integer('supplier_id').notNull(),
    supplierName: varchar('supplier_name', { length: 255 }).notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
    tax: doublePrecision('tax').notNull(),
    total: doublePrecision('total').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    expectedDelivery: timestamp('expected_delivery').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('purchases_status_idx').on(table.status),
    index('purchases_created_at_idx').on(table.createdAt),
  ]
)

// ─── Purchase Items ───────────────────────────────────────────────────────────

export const purchaseItems = pgTable(
  'purchase_items',
  {
    id: serial('id').primaryKey(),
    purchaseId: integer('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productName: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    unitCost: doublePrecision('unit_cost').notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
  },
  table => [index('purchase_items_purchase_id_idx').on(table.purchaseId)]
)

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert

export type InventoryItem = typeof inventory.$inferSelect
export type NewInventoryItem = typeof inventory.$inferInsert

export type Sale = typeof sales.$inferSelect
export type NewSale = typeof sales.$inferInsert

export type SaleItem = typeof saleItems.$inferSelect
export type NewSaleItem = typeof saleItems.$inferInsert

export type Purchase = typeof purchases.$inferSelect
export type NewPurchase = typeof purchases.$inferInsert

export type PurchaseItem = typeof purchaseItems.$inferSelect
export type NewPurchaseItem = typeof purchaseItems.$inferInsert
