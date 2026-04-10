-- Production migration: sync Drizzle schema with ERP-created DB
-- SAFE TO RE-RUN: all statements are idempotent (IF NOT EXISTS)
-- Run via: docker exec -i erp-postgres psql -U sanchez -d erp_sanchez < migration-prod.sql
--
-- NOTE: This migration does NOT alter existing column types (varchar->text, jsonb->text[],
-- precision changes) because production already has the correct types. Only the Drizzle
-- schema needed updating to match production reality.

-- ═══════════════════════════════════════════════════════════════════════════════
-- Section 1: Create business_settings table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS business_settings (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Comercio Ejemplo',
  address TEXT,
  tax_id TEXT,
  logo_square TEXT,
  logo_rectangular TEXT,
  articulos_config JSONB DEFAULT '{"camposVisibles":{}}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default row if empty
INSERT INTO business_settings (id)
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM business_settings);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Section 2: Add missing columns to articulos
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE articulos ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS subcategoria TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS codigo_equivalencia TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS nombre_corto TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS descripcion_web TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS rubro TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS subrubro TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS adjetivo TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS prop_aux_1 TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS prop_aux_2 TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS prop_aux_3 TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS prop_aux_4 TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS prop_aux_5 TEXT;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS unidades INTEGER DEFAULT 0;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS erp_creado TIMESTAMP;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS erp_actualizado TIMESTAMP;
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS imagenes_producto_procesadas TEXT[];

-- ═══════════════════════════════════════════════════════════════════════════════
-- Section 3: Create all missing admin-app tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  tax DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  shipping_address TEXT
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  articulo_codigo TEXT NOT NULL REFERENCES articulos(codigo) ON DELETE RESTRICT,
  articulo_nombre VARCHAR(255) NOT NULL,
  sku VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  sale_number VARCHAR(20) NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  tax DOUBLE PRECISION NOT NULL,
  discount DOUBLE PRECISION NOT NULL DEFAULT 0,
  total DOUBLE PRECISION NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  articulo_codigo TEXT NOT NULL REFERENCES articulos(codigo) ON DELETE RESTRICT,
  articulo_nombre VARCHAR(255) NOT NULL,
  sku VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  purchase_number VARCHAR(20) NOT NULL UNIQUE,
  supplier_id INTEGER NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  tax DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  status VARCHAR(20) NOT NULL,
  expected_delivery TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  supplier_contact TEXT,
  shipping DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT,
  received_at TIMESTAMP
);

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  articulo_codigo TEXT NOT NULL REFERENCES articulos(codigo) ON DELETE RESTRICT,
  articulo_nombre VARCHAR(255) NOT NULL,
  sku VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DOUBLE PRECISION NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL
);

-- Depositos
CREATE TABLE IF NOT EXISTS depositos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(255),
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Existencias (composite PK)
CREATE TABLE IF NOT EXISTS existencias (
  articulo_codigo TEXT NOT NULL REFERENCES articulos(codigo) ON DELETE RESTRICT,
  deposito_id INTEGER NOT NULL REFERENCES depositos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  stock_maximo INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (articulo_codigo, deposito_id)
);

-- Inventarios
CREATE TABLE IF NOT EXISTS inventarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  fecha TIMESTAMP NOT NULL,
  deposito_id INTEGER NOT NULL REFERENCES depositos(id) ON DELETE RESTRICT,
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Dispositivos Moviles
CREATE TABLE IF NOT EXISTS dispositivos_moviles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  identificador VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventario Sectores
CREATE TABLE IF NOT EXISTS inventario_sectores (
  id SERIAL PRIMARY KEY,
  deposito_id INTEGER NOT NULL REFERENCES depositos(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  columnas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventarios Articulos
CREATE TABLE IF NOT EXISTS inventarios_articulos (
  id SERIAL PRIMARY KEY,
  inventario_id INTEGER NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
  articulo_codigo TEXT NOT NULL REFERENCES articulos(codigo) ON DELETE RESTRICT,
  cantidad_contada INTEGER NOT NULL DEFAULT 0,
  dispositivo_id INTEGER REFERENCES dispositivos_moviles(id) ON DELETE SET NULL,
  sector_id INTEGER REFERENCES inventario_sectores(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  prefix VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  entity VARCHAR(50) NOT NULL DEFAULT 'articulo',
  events TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Webhook Deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  delivery_id VARCHAR(36) NOT NULL,
  event_name VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  success BOOLEAN NOT NULL,
  http_status INTEGER,
  response_body TEXT,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Section 4: Create indexes (idempotent via IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Orders indexes
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);

-- Order Items indexes
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

-- Sales indexes
CREATE INDEX IF NOT EXISTS sales_status_idx ON sales(status);
CREATE INDEX IF NOT EXISTS sales_payment_method_idx ON sales(payment_method);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON sales(created_at);

-- Sale Items indexes
CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON sale_items(sale_id);

-- Purchases indexes
CREATE INDEX IF NOT EXISTS purchases_status_idx ON purchases(status);
CREATE INDEX IF NOT EXISTS purchases_created_at_idx ON purchases(created_at);

-- Purchase Items indexes
CREATE INDEX IF NOT EXISTS purchase_items_purchase_id_idx ON purchase_items(purchase_id);

-- Depositos indexes
CREATE INDEX IF NOT EXISTS depositos_activo_idx ON depositos(activo);

-- Existencias indexes
CREATE INDEX IF NOT EXISTS existencias_deposito_id_idx ON existencias(deposito_id);
CREATE INDEX IF NOT EXISTS existencias_articulo_codigo_idx ON existencias(articulo_codigo);

-- Inventarios indexes
CREATE INDEX IF NOT EXISTS inventarios_deposito_id_idx ON inventarios(deposito_id);
CREATE INDEX IF NOT EXISTS inventarios_estado_idx ON inventarios(estado);
CREATE INDEX IF NOT EXISTS inventarios_fecha_idx ON inventarios(fecha);

-- Dispositivos Moviles indexes
CREATE INDEX IF NOT EXISTS dispositivos_moviles_identificador_idx ON dispositivos_moviles(identificador);
CREATE INDEX IF NOT EXISTS dispositivos_moviles_activo_idx ON dispositivos_moviles(activo);

-- Inventario Sectores indexes
CREATE INDEX IF NOT EXISTS inv_sectores_deposito_id_idx ON inventario_sectores(deposito_id);

-- Inventarios Articulos indexes
CREATE INDEX IF NOT EXISTS inv_articulos_inventario_id_idx ON inventarios_articulos(inventario_id);
CREATE INDEX IF NOT EXISTS inv_articulos_articulo_codigo_idx ON inventarios_articulos(articulo_codigo);
CREATE INDEX IF NOT EXISTS inv_articulos_dispositivo_id_idx ON inventarios_articulos(dispositivo_id);
CREATE UNIQUE INDEX IF NOT EXISTS inv_articulos_unique_idx ON inventarios_articulos(inventario_id, articulo_codigo);

-- API Keys indexes
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_revoked_at_idx ON api_keys(revoked_at);

-- Webhooks indexes
CREATE INDEX IF NOT EXISTS webhooks_active_idx ON webhooks(active);
CREATE INDEX IF NOT EXISTS webhooks_revoked_at_idx ON webhooks(revoked_at);
CREATE INDEX IF NOT EXISTS webhooks_entity_idx ON webhooks(entity);

-- Webhook Deliveries indexes
CREATE INDEX IF NOT EXISTS wh_deliveries_webhook_id_idx ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS wh_deliveries_delivery_id_idx ON webhook_deliveries(delivery_id);
CREATE INDEX IF NOT EXISTS wh_deliveries_created_at_idx ON webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS wh_deliveries_success_idx ON webhook_deliveries(success);
