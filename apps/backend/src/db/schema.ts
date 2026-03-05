import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  doublePrecision,
  timestamp,
  index,
  numeric,
  boolean,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core'

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
    shippingAddress: text('shipping_address'),
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
    articuloCodigo: text('articulo_codigo')
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    articuloNombre: varchar('articulo_nombre', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    price: doublePrecision('price').notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
  },
  table => [index('order_items_order_id_idx').on(table.orderId)]
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
    articuloCodigo: text('articulo_codigo')
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    articuloNombre: varchar('articulo_nombre', { length: 255 }).notNull(),
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
    supplierContact: text('supplier_contact'),
    shipping: doublePrecision('shipping').notNull().default(0),
    notes: text('notes'),
    receivedAt: timestamp('received_at'),
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
    articuloCodigo: text('articulo_codigo')
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    articuloNombre: varchar('articulo_nombre', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    unitCost: doublePrecision('unit_cost').notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
  },
  table => [index('purchase_items_purchase_id_idx').on(table.purchaseId)]
)

// ─── Business Settings ───────────────────────────────────────────────────────

export const businessSettings = pgTable('business_settings', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 100 }).notNull().default('Comercio Ejemplo'),
  address: varchar('address', { length: 200 }),
  taxId: varchar('tax_id', { length: 30 }),
  logoSquare: text('logo_square'),
  logoRectangular: text('logo_rectangular'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Articulos ───────────────────────────────────────────────────────────────

export const articulos = pgTable(
  'articulos',
  {
    // PK
    codigo: text('codigo').primaryKey(),

    // Identification
    nombre: varchar('nombre', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 50 }),
    codigoBarras: varchar('codigo_barras', { length: 50 }),
    observaciones: text('observaciones'),

    // Properties
    marca: varchar('marca', { length: 100 }),
    modelo: varchar('modelo', { length: 100 }),
    talle: varchar('talle', { length: 50 }),
    color: varchar('color', { length: 50 }),
    material: varchar('material', { length: 100 }),
    presentacion: varchar('presentacion', { length: 100 }),
    medida: varchar('medida', { length: 50 }),

    // Prices
    precio: numeric('precio', { precision: 10, scale: 2 }),
    costo: numeric('costo', { precision: 10, scale: 2 }),

    // Images
    imagenesProducto: jsonb('imagenes_producto').$type<string[]>().default([]),
    imagenesEtiqueta: jsonb('imagenes_etiqueta').$type<string[]>().default([]),
    etiquetasOcr: jsonb('etiquetas_ocr').$type<string[]>().default([]),
    jsonArticulo: jsonb('json_articulo'),

    // ERP
    erpId: varchar('erp_id', { length: 50 }),
    erpCodigo: varchar('erp_codigo', { length: 50 }),
    erpNombre: varchar('erp_nombre', { length: 255 }),
    erpPrecio: numeric('erp_precio', { precision: 10, scale: 2 }),
    erpCosto: numeric('erp_costo', { precision: 10, scale: 2 }),
    erpUnidades: integer('erp_unidades'),
    erpDatos: jsonb('erp_datos'),
    erpSincronizado: boolean('erp_sincronizado').default(false),
    erpFechaSync: timestamp('erp_fecha_sync'),

    // Origin
    originSource: varchar('origin_source', { length: 50 }),
    originSyncId: varchar('origin_sync_id', { length: 100 }),
    originSyncedAt: timestamp('origin_synced_at'),

    // State
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('articulos_nombre_idx').on(table.nombre),
    index('articulos_sku_idx').on(table.sku),
    index('articulos_codigo_barras_idx').on(table.codigoBarras),
    index('articulos_erp_codigo_idx').on(table.erpCodigo),
    index('articulos_activo_idx').on(table.activo),
    index('articulos_marca_idx').on(table.marca),
  ]
)

// ─── Depositos ───────────────────────────────────────────────────────────────

export const depositos = pgTable(
  'depositos',
  {
    id: serial('id').primaryKey(),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    direccion: varchar('direccion', { length: 255 }),
    descripcion: text('descripcion'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [index('depositos_activo_idx').on(table.activo)]
)

// ─── Existencias ────────────────────────────────────────────────────────────

export const existencias = pgTable(
  'existencias',
  {
    articuloCodigo: text('articulo_codigo')
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    depositoId: integer('deposito_id')
      .notNull()
      .references(() => depositos.id, { onDelete: 'restrict' }),
    cantidad: integer('cantidad').notNull().default(0),
    stockMinimo: integer('stock_minimo').notNull().default(0),
    stockMaximo: integer('stock_maximo').notNull().default(0),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.articuloCodigo, table.depositoId] }),
    index('existencias_deposito_id_idx').on(table.depositoId),
    index('existencias_articulo_codigo_idx').on(table.articuloCodigo),
  ]
)

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert

export type Sale = typeof sales.$inferSelect
export type NewSale = typeof sales.$inferInsert

export type SaleItem = typeof saleItems.$inferSelect
export type NewSaleItem = typeof saleItems.$inferInsert

export type Purchase = typeof purchases.$inferSelect
export type NewPurchase = typeof purchases.$inferInsert

export type PurchaseItem = typeof purchaseItems.$inferSelect
export type NewPurchaseItem = typeof purchaseItems.$inferInsert

export type BusinessSetting = typeof businessSettings.$inferSelect
export type NewBusinessSetting = typeof businessSettings.$inferInsert

export type Articulo = typeof articulos.$inferSelect
export type NewArticulo = typeof articulos.$inferInsert

export type Deposito = typeof depositos.$inferSelect
export type NewDeposito = typeof depositos.$inferInsert

export type Existencia = typeof existencias.$inferSelect
export type NewExistencia = typeof existencias.$inferInsert
