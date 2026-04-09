---
phase: quick-260409-jwl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/backend/src/db/schema.ts
  - apps/backend/src/db/migration-prod.sql
  - apps/backend/src/modules/articulos/articulos-imagenes.service.ts
  - apps/backend/src/modules/articulos/dto/create-articulo.dto.ts
  - apps/backend/src/modules/articulos/dto/update-articulo.dto.ts
  - apps/web/src/types/articulo.ts
autonomous: true
requirements: [SYNC-SCHEMA]
must_haves:
  truths:
    - 'Drizzle schema matches production DB column names and types exactly'
    - 'Backend compiles without TypeScript errors after schema changes'
    - 'Migration SQL is additive-only (CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS)'
    - 'Production DB gets business_settings table and missing tables created'
    - 'Production articulos table gets categoria and subcategoria columns'
  artifacts:
    - path: 'apps/backend/src/db/schema.ts'
      provides: 'Updated Drizzle schema matching production reality'
    - path: 'apps/backend/src/db/migration-prod.sql'
      provides: 'Additive SQL migration script for production'
  key_links:
    - from: 'apps/backend/src/db/schema.ts'
      to: 'apps/backend/src/modules/articulos/articulos-imagenes.service.ts'
      via: 'text[] array type instead of jsonb for image columns'
      pattern: "articulo\\[dbField\\]"
---

<objective>
Sync the Drizzle ORM schema with the production PostgreSQL database so the NestJS backend works against real ERP data (100K articulos).

Purpose: The production DB was created by Prisma (ERP sync). Drizzle schema has wrong types (varchar vs text, jsonb vs text[], wrong nullability, wrong precision) and missing columns. The backend crashes on startup or returns wrong data.

Output: Updated schema.ts, migration SQL script, fixed TypeScript compilation across backend and frontend types.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/backend/src/db/schema.ts
@apps/backend/src/modules/settings/settings.service.ts
@apps/backend/src/modules/articulos/articulos.service.ts
@apps/backend/src/modules/articulos/articulos-imagenes.service.ts
@apps/backend/src/modules/articulos/dto/create-articulo.dto.ts
@apps/web/src/types/articulo.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Drizzle schema to match production DB</name>
  <files>apps/backend/src/db/schema.ts</files>
  <action>
Update the `articulos` table definition in schema.ts with these changes:

**Type changes (varchar to text):**

- `nombre`: change from `varchar('nombre', { length: 255 }).notNull()` to `text('nombre')` (nullable in production, remove .notNull())
- `sku`: `varchar` -> `text`
- `codigoBarras`: `varchar` -> `text`
- `marca`: `varchar` -> `text`
- `modelo`: `varchar` -> `text`
- `talle`: `varchar` -> `text`
- `color`: `varchar` -> `text`
- `material`: `varchar` -> `text`
- `presentacion`: `varchar` -> `text`
- `medida`: `varchar` -> `text`
- `categoria`: `varchar` -> `text`
- `subcategoria`: `varchar` -> `text`
- `erpId`: `varchar` -> `text`
- `erpCodigo`: `varchar` -> `text`
- `erpNombre`: `varchar` -> `text`
- `originSource`: `varchar` -> `text`
- `originSyncId`: `varchar` -> `text`

**Nullability changes:**

- `activo`: change from `.notNull().default(true)` to `.default(true)` (nullable in production)

**Numeric precision changes:**

- `precio`: change from `numeric('precio', { precision: 10, scale: 2 })` to `numeric('precio')` (no precision in production)
- `costo`: change from `numeric('costo', { precision: 10, scale: 2 })` to `numeric('costo')`
- `erpPrecio`: same — remove precision
- `erpCosto`: same — remove precision

**JSONB to text[] array changes:**

- `imagenesProducto`: change from `jsonb('imagenes_producto').$type<string[]>().default([])` to `text('imagenes_producto').array()` (text[] in production)
- `imagenesEtiqueta`: change from `jsonb('imagenes_etiqueta').$type<string[]>().default([])` to `text('imagenes_etiqueta').array()`
- `etiquetasOcr`: change from `jsonb('etiquetas_ocr').$type<string[]>().default([])` to `text('etiquetas_ocr').array()`
- `imagenesProductoProcesadas`: ADD NEW — `text('imagenes_producto_procesadas').array()` (exists in production)

**JSONB default changes:**

- `erpDatos`: add `.default({})` (production has `'{}'::jsonb`)
- `jsonArticulo`: add `.default({})` (production has `'{}'::jsonb`)

**New columns to add (exist in production, missing in Drizzle):**

- `codigoEquivalencia: text('codigo_equivalencia')` (nullable)
- `nombreCorto: text('nombre_corto')` (nullable)
- `descripcion: text('descripcion')` (nullable)
- `descripcionWeb: text('descripcion_web')` (nullable)
- `rubro: text('rubro')` (nullable)
- `subrubro: text('subrubro')` (nullable)
- `adjetivo: text('adjetivo')` (nullable)
- `propAux1: text('prop_aux_1')` through `propAux5: text('prop_aux_5')` (all nullable)
- `unidades: integer('unidades').default(0)` (nullable)
- `erpCreado: timestamp('erp_creado')` (nullable)
- `erpActualizado: timestamp('erp_actualizado')` (nullable)

Group new columns logically: identification section for nombre_corto/descripcion/descripcion_web/codigo_equivalencia, classification section for rubro/subrubro/adjetivo, properties section for prop_aux_1-5/unidades, ERP section for erp_creado/erp_actualizado, images section for imagenes_producto_procesadas.

Also update the `businessSettings` table: change `companyName` from `varchar` to `text`, `address` from `varchar` to `text`, `taxId` from `varchar` to `text`. Keep all other fields as-is.

Remove `varchar` from the import if no longer used by any table definition. Check all tables — orders, sales, purchases, etc. still use varchar, so keep the import.
</action>
<verify>
<automated>cd /home/sanchez/proyectos/objetiva-comercios-admin && npx tsc --noEmit -p apps/backend/tsconfig.build.json 2>&1 | head -50</automated>
</verify>
<done>schema.ts reflects production reality: text instead of varchar for articulos, text[] arrays instead of jsonb for image columns, correct nullability, all missing production columns present, numeric without precision constraints</done>
</task>

<task type="auto">
  <name>Task 2: Fix TypeScript compilation across backend services, DTOs, and frontend types</name>
  <files>
    apps/backend/src/modules/articulos/articulos-imagenes.service.ts
    apps/backend/src/modules/articulos/dto/create-articulo.dto.ts
    apps/backend/src/modules/articulos/dto/update-articulo.dto.ts
    apps/web/src/types/articulo.ts
  </files>
  <action>
The jsonb-to-text[] change in schema.ts will cause TypeScript errors in files that cast image columns. Fix each:

**articulos-imagenes.service.ts:**

- Lines 89 and 162: `(articulo[dbField] as string[])` — the type is already `string[] | null` from text().array(), so change the cast to just handle null: `(articulo[dbField] ?? [])`. The type from Drizzle text().array() returns `string[] | null`, which is compatible.
- Lines 100 and 170: The `.set({ [dbField]: currentArr, ... })` should work since text[].array() accepts string arrays. But the `updatedAt` field name in the set call uses the JS property name — verify it matches the column mapping (`timestamp('actualizado')`). The Drizzle property is `updatedAt` which maps to column `actualizado`, so `{ updatedAt: new Date() }` is correct.

**create-articulo.dto.ts:**

- Remove all `@MaxLength()` decorators since all varchar fields are now text (no length limits in production). Keep `@IsString()` and `@IsOptional()`.
- Add new optional fields matching new schema columns: `codigoEquivalencia`, `nombreCorto`, `descripcion`, `descripcionWeb`, `rubro`, `subrubro`, `adjetivo`, `propAux1` through `propAux5` (all @IsOptional() @IsString()), `unidades` (@IsOptional() @IsInt()).

**update-articulo.dto.ts:**

- Should use PartialType(CreateArticuloDto) or OmitType. If it's a manual copy, apply the same MaxLength removal and new field additions. Read the file first to determine its structure.

**apps/web/src/types/articulo.ts:**

- `nombre`: change from `string` to `string | null` (now nullable)
- `activo`: change from `boolean` to `boolean | null` (now nullable)
- Add new fields matching schema additions:
  - `codigoEquivalencia: string | null`
  - `nombreCorto: string | null`
  - `descripcion: string | null`
  - `descripcionWeb: string | null`
  - `rubro: string | null`
  - `subrubro: string | null`
  - `adjetivo: string | null`
  - `propAux1` through `propAux5`: `string | null`
  - `unidades: number | null`
  - `erpCreado: string | null`
  - `erpActualizado: string | null`
  - `imagenesProductoProcesadas: string[] | null`

After all changes, run TypeScript compilation for both backend and web to verify zero errors.
</action>
<verify>
<automated>cd /home/sanchez/proyectos/objetiva-comercios-admin && npx tsc --noEmit -p apps/backend/tsconfig.build.json 2>&1 | head -30 && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -30</automated>
</verify>
<done>Zero TypeScript errors in both backend and web. All DTOs accept new fields. Frontend Articulo type reflects nullable nombre/activo and all new production columns.</done>
</task>

<task type="auto">
  <name>Task 3: Generate additive SQL migration and document deployment steps</name>
  <files>apps/backend/src/db/migration-prod.sql</files>
  <action>
Create `apps/backend/src/db/migration-prod.sql` with additive-only SQL. Every statement must use IF NOT EXISTS or equivalent to be safe to re-run.

**Section 1: Create business_settings table**

```sql
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
INSERT INTO business_settings (id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM business_settings);
```

**Section 2: Add missing columns to articulos** (all use ADD COLUMN IF NOT EXISTS — requires PostgreSQL 9.6+)

```sql
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
```

NOTE: Do NOT add `categoria` and `subcategoria` here if they already exist in production. The domain context says they DON'T exist in production, so include them. But use IF NOT EXISTS to be safe.

**Section 3: Create all missing tables** (orders, order_items, sales, sale_items, purchases, purchase_items, depositos, existencias, inventarios, inventarios_articulos, inventario_sectores, dispositivos_moviles, api_keys, webhooks, webhook_deliveries).

For each table, use CREATE TABLE IF NOT EXISTS with columns matching schema.ts exactly. Include all indexes. Use the exact column names and types from schema.ts.

For foreign keys referencing articulos.codigo, these are safe because the articulos table already has 100K rows with the codigo column.

**Section 4: Create indexes** (only if they don't exist — wrap in DO blocks or use IF NOT EXISTS on CREATE INDEX)

Add a header comment:

```sql
-- Production migration: sync Drizzle schema with ERP-created DB
-- SAFE TO RE-RUN: all statements are idempotent (IF NOT EXISTS)
-- Run via: docker exec -i erp-postgres psql -U sanchez -d erp_sanchez < migration-prod.sql
```

The migration does NOT alter existing column types (varchar->text, jsonb->text[], precision changes) because:

1. Production already has the correct types (text, text[], numeric without precision)
2. Only the Drizzle schema needed updating to match production
3. Altering 100K-row columns is risky and unnecessary
   </action>
   <verify>
   <automated>cd /home/sanchez/proyectos/objetiva-comercios-admin && cat apps/backend/src/db/migration-prod.sql | grep -c "IF NOT EXISTS"</automated>
   </verify>
   <done>migration-prod.sql contains idempotent SQL that creates business_settings, adds missing columns to articulos (categoria, subcategoria + ERP columns), and creates all admin-app tables (orders, sales, purchases, depositos, existencias, inventarios, api_keys, webhooks). Every statement uses IF NOT EXISTS. File includes docker exec command in header comment for easy deployment.</done>
   </task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary                 | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| SQL migration -> prod DB | Direct SQL execution on production with 100K+ rows                  |
| Schema nullability       | Making nombre/activo nullable could cause frontend null dereference |

## STRIDE Threat Register

| Threat ID  | Category                   | Component             | Disposition | Mitigation Plan                                                                                            |
| ---------- | -------------------------- | --------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| T-quick-01 | T (Tampering)              | migration-prod.sql    | mitigate    | All statements use IF NOT EXISTS — idempotent, no ALTER on existing data columns, no DROP                  |
| T-quick-02 | D (Denial of Service)      | ALTER TABLE articulos | accept      | ADD COLUMN IF NOT EXISTS on 100K rows is lightweight (no rewrite), takes <1s                               |
| T-quick-03 | I (Information Disclosure) | schema.ts new columns | accept      | New columns (prop_aux_1-5, descripcion_web) may contain ERP data — existing auth guards protect API access |

</threat_model>

<verification>
1. `npx tsc --noEmit -p apps/backend/tsconfig.build.json` — zero errors
2. `npx tsc --noEmit -p apps/web/tsconfig.json` — zero errors
3. migration-prod.sql contains only IF NOT EXISTS / ADD COLUMN IF NOT EXISTS statements
4. Schema articulos definition uses text() not varchar() for all string columns
5. Image columns (imagenesProducto, imagenesEtiqueta, etiquetasOcr) use text().array() not jsonb()
</verification>

<success_criteria>

- Backend and web compile with zero TypeScript errors
- Drizzle schema articulos table has all production columns (including codigo_equivalencia, nombre_corto, descripcion, rubro, subrubro, prop_aux_1-5, etc.)
- Drizzle schema uses text() for all articulos string columns (no varchar)
- Image columns use text().array() matching production text[] type
- migration-prod.sql is fully idempotent and creates all missing DB objects
- Frontend Articulo type includes all new fields
  </success_criteria>

<output>
After completion, create `.planning/quick/260409-jwl-sync-drizzle-schema-with-production-db/260409-jwl-SUMMARY.md`
</output>
