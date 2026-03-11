# Articulos Field Visibility Configuration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings section where users can toggle which article fields are visible across the entire UI.

**Architecture:** JSONB column `articulos_config` on existing `business_settings` table. New `/settings/articulos` page with toggle switches. A `useArticulosConfig()` hook provides visibility state to form, sheet, columns, and edit page.

**Tech Stack:** Drizzle ORM, NestJS (class-validator), Next.js 14, shadcn/ui Switch, module-level cache for client-side deduplication.

---

## File Structure

| Action    | File                                                                  | Responsibility                                         |
| --------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Create    | `apps/backend/src/modules/settings/articulos-config.ts`               | Shared type + defaults                                 |
| Modify    | `apps/backend/src/db/schema.ts:158-167`                               | Add `articulosConfig` column                           |
| Modify    | `apps/backend/src/modules/settings/dto/update-settings.dto.ts`        | Add nested DTO validation                              |
| Create    | `apps/web/src/types/articulos-config.ts`                              | Frontend types + defaults (mirror backend)             |
| Modify    | `apps/web/src/types/settings.ts`                                      | Add `articulosConfig` to `BusinessSettings`            |
| Modify    | `apps/web/src/lib/api.client.ts:49-60`                                | Add `fetchSettingsClient()`, update `updateSettings()` |
| Create    | `apps/web/src/hooks/use-articulos-config.ts`                          | Hook: fetches settings, exposes `isCampoVisible()`     |
| Create    | `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`            | Settings page with toggle groups                       |
| Modify    | `apps/web/src/components/settings/settings-nav.tsx`                   | Add "Artículos" nav item                               |
| Modify    | `apps/web/src/components/articulos/articulo-form.tsx`                 | Conditionally hide fields                              |
| Modify    | `apps/web/src/components/articulos/articulo-sheet.tsx`                | Conditionally hide fields + costo stat card            |
| Modify    | `apps/web/src/components/articulos/articulos-columns.tsx`             | Filter columns by config                               |
| Modify    | `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx:126-128` | Pass camposVisibles to getColumns                      |
| No change | `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx`     | Uses ArticuloForm — changes propagate automatically    |

---

## Chunk 1: Backend — Schema, Types, DTO

### Task 1: Shared types and defaults

**Files:**

- Create: `apps/backend/src/modules/settings/articulos-config.ts`

- [ ] **Step 1: Create the shared types + defaults file**

```typescript
// apps/backend/src/modules/settings/articulos-config.ts

export interface CamposVisibles {
  marca: boolean
  modelo: boolean
  talle: boolean
  color: boolean
  material: boolean
  presentacion: boolean
  medida: boolean
  sku: boolean
  codigoBarras: boolean
  costo: boolean
  observaciones: boolean
  erp: boolean
  origen: boolean
}

export interface ArticulosConfig {
  camposVisibles: CamposVisibles
}

export const DEFAULT_ARTICULOS_CONFIG: ArticulosConfig = {
  camposVisibles: {
    marca: true,
    modelo: true,
    talle: false,
    color: false,
    material: false,
    presentacion: true,
    medida: true,
    sku: true,
    codigoBarras: true,
    costo: true,
    observaciones: true,
    erp: true,
    origen: true,
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/settings/articulos-config.ts
git commit -m "feat(settings): add ArticulosConfig shared types and defaults"
```

### Task 2: Extend Drizzle schema

**Files:**

- Modify: `apps/backend/src/db/schema.ts:158-167`

- [ ] **Step 1: Add articulosConfig column to businessSettings**

In `apps/backend/src/db/schema.ts`, import the type and default, then add the column after `logoRectangular`:

```typescript
// Add import at top
import { DEFAULT_ARTICULOS_CONFIG } from '../modules/settings/articulos-config'
import type { ArticulosConfig } from '../modules/settings/articulos-config'

// Add to businessSettings table, after logoRectangular:
articulosConfig: jsonb('articulos_config').$type<ArticulosConfig>().default(DEFAULT_ARTICULOS_CONFIG),
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd apps/backend && pnpm db:generate && pnpm db:migrate
```

- [ ] **Step 3: Verify and patch the migration**

Check the generated migration SQL has `ALTER TABLE business_settings ADD COLUMN articulos_config JSONB DEFAULT '...'`.

Then append to the migration file an UPDATE for existing rows:

```sql
UPDATE business_settings SET articulos_config = '{"camposVisibles":{"marca":true,"modelo":true,"talle":false,"color":false,"material":false,"presentacion":true,"medida":true,"sku":true,"codigoBarras":true,"costo":true,"observaciones":true,"erp":true,"origen":true}}' WHERE articulos_config IS NULL;
```

Re-run `pnpm db:migrate` to apply the update.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/ apps/backend/drizzle/
git commit -m "feat(db): add articulos_config JSONB column to business_settings"
```

### Task 3: Extend DTO for validation

**Files:**

- Modify: `apps/backend/src/modules/settings/dto/update-settings.dto.ts`

- [ ] **Step 1: Add nested DTO classes**

Replace the file content with:

```typescript
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class CamposVisiblesDto {
  @IsBoolean() marca: boolean
  @IsBoolean() modelo: boolean
  @IsBoolean() talle: boolean
  @IsBoolean() color: boolean
  @IsBoolean() material: boolean
  @IsBoolean() presentacion: boolean
  @IsBoolean() medida: boolean
  @IsBoolean() sku: boolean
  @IsBoolean() codigoBarras: boolean
  @IsBoolean() costo: boolean
  @IsBoolean() observaciones: boolean
  @IsBoolean() erp: boolean
  @IsBoolean() origen: boolean
}

class ArticulosConfigDto {
  @ValidateNested()
  @Type(() => CamposVisiblesDto)
  camposVisibles: CamposVisiblesDto
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxId?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ArticulosConfigDto)
  articulosConfig?: ArticulosConfigDto
}
```

- [ ] **Step 2: Verify class-transformer is installed**

```bash
cd apps/backend && grep "class-transformer" package.json
```

If not installed: `pnpm add class-transformer`

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/settings/dto/update-settings.dto.ts
git commit -m "feat(settings): add ArticulosConfig nested DTO validation"
```

---

## Chunk 2: Frontend — Types, API, Hook

### Task 4: Frontend types and defaults

**Files:**

- Create: `apps/web/src/types/articulos-config.ts`
- Modify: `apps/web/src/types/settings.ts`

- [ ] **Step 1: Create frontend types file**

```typescript
// apps/web/src/types/articulos-config.ts

export interface CamposVisibles {
  marca: boolean
  modelo: boolean
  talle: boolean
  color: boolean
  material: boolean
  presentacion: boolean
  medida: boolean
  sku: boolean
  codigoBarras: boolean
  costo: boolean
  observaciones: boolean
  erp: boolean
  origen: boolean
}

export interface ArticulosConfig {
  camposVisibles: CamposVisibles
}

export const DEFAULT_ARTICULOS_CONFIG: ArticulosConfig = {
  camposVisibles: {
    marca: true,
    modelo: true,
    talle: false,
    color: false,
    material: false,
    presentacion: true,
    medida: true,
    sku: true,
    codigoBarras: true,
    costo: true,
    observaciones: true,
    erp: true,
    origen: true,
  },
}

/** Human-readable labels for each campo */
export const CAMPOS_LABELS: Record<keyof CamposVisibles, string> = {
  marca: 'Marca',
  modelo: 'Modelo',
  talle: 'Talle',
  color: 'Color',
  material: 'Material',
  presentacion: 'Presentación',
  medida: 'Medida',
  sku: 'SKU',
  codigoBarras: 'Código de barras',
  costo: 'Costo',
  observaciones: 'Observaciones',
  erp: 'ERP',
  origen: 'Origen',
}
```

- [ ] **Step 2: Update BusinessSettings type**

In `apps/web/src/types/settings.ts`, add the import and field:

```typescript
import type { ArticulosConfig } from './articulos-config'

export interface BusinessSettings {
  id: number
  companyName: string
  address: string | null
  taxId: string | null
  logoSquare: string | null
  logoRectangular: string | null
  articulosConfig: ArticulosConfig | null
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/articulos-config.ts apps/web/src/types/settings.ts
git commit -m "feat(web): add ArticulosConfig types, defaults, and labels"
```

### Task 5: API client functions

**Files:**

- Modify: `apps/web/src/lib/api.client.ts:49-60`

- [ ] **Step 1: Add fetchSettingsClient and update updateSettings**

In `apps/web/src/lib/api.client.ts`, add `fetchSettingsClient` and update `updateSettings` to accept `articulosConfig`:

```typescript
// Add import at top
import type { ArticulosConfig } from '@/types/articulos-config'

// Add fetchSettingsClient (new function, before updateSettings)
export async function fetchSettingsClient(): Promise<BusinessSettings> {
  const response = await fetch(`${API_BASE_URL}/api/settings`)
  await throwIfError(response)
  return response.json()
}

// Update updateSettings to accept articulosConfig
export async function updateSettings(
  data: Partial<Pick<BusinessSettings, 'companyName' | 'address' | 'taxId'>> & {
    articulosConfig?: ArticulosConfig
  }
): Promise<BusinessSettings> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api.client.ts
git commit -m "feat(web): add fetchSettingsClient and update updateSettings for articulosConfig"
```

### Task 6: useArticulosConfig hook

**Files:**

- Create: `apps/web/src/hooks/use-articulos-config.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/web/src/hooks/use-articulos-config.ts
'use client'

import { useEffect, useState } from 'react'
import { fetchSettingsClient } from '@/lib/api.client'
import type { CamposVisibles } from '@/types/articulos-config'
import { DEFAULT_ARTICULOS_CONFIG } from '@/types/articulos-config'

// Module-level cache to avoid re-fetching across components
let cachedConfig: CamposVisibles | null = null
let fetchPromise: Promise<CamposVisibles> | null = null

function fetchConfig(): Promise<CamposVisibles> {
  if (cachedConfig) return Promise.resolve(cachedConfig)
  if (fetchPromise) return fetchPromise

  fetchPromise = fetchSettingsClient()
    .then(settings => {
      const config =
        settings.articulosConfig?.camposVisibles ?? DEFAULT_ARTICULOS_CONFIG.camposVisibles
      cachedConfig = config
      return config
    })
    .catch(() => {
      return DEFAULT_ARTICULOS_CONFIG.camposVisibles
    })
    .finally(() => {
      fetchPromise = null
    })

  return fetchPromise
}

/** Invalidate cache (call after saving config) */
export function invalidateArticulosConfig() {
  cachedConfig = null
}

export function useArticulosConfig() {
  const [camposVisibles, setCamposVisibles] = useState<CamposVisibles>(
    cachedConfig ?? DEFAULT_ARTICULOS_CONFIG.camposVisibles
  )
  const [isLoading, setIsLoading] = useState(!cachedConfig)

  useEffect(() => {
    let cancelled = false
    fetchConfig().then(config => {
      if (!cancelled) {
        setCamposVisibles(config)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function isCampoVisible(campo: keyof CamposVisibles): boolean {
    return camposVisibles[campo]
  }

  return { camposVisibles, isCampoVisible, isLoading }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/use-articulos-config.ts
git commit -m "feat(web): add useArticulosConfig hook with module-level cache"
```

---

## Chunk 3: Settings Page

### Task 7: Settings nav + page

**Files:**

- Modify: `apps/web/src/components/settings/settings-nav.tsx`
- Create: `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`

- [ ] **Step 1: Add nav item**

In `apps/web/src/components/settings/settings-nav.tsx`:

Add `Package` to the lucide-react import:

```typescript
import { User, Building2, Palette, Warehouse, Smartphone, Package } from 'lucide-react'
```

Add the item after "Negocio" in the `settingsNavItems` array:

```typescript
{
  title: 'Artículos',
  href: '/settings/articulos',
  icon: Package,
  description: 'Configurá qué campos de artículos se muestran',
},
```

- [ ] **Step 2: Create the settings page**

```typescript
// apps/web/src/app/(dashboard)/settings/articulos/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { fetchSettingsClient, updateSettings } from '@/lib/api.client'
import { invalidateArticulosConfig } from '@/hooks/use-articulos-config'
import type { CamposVisibles } from '@/types/articulos-config'
import { DEFAULT_ARTICULOS_CONFIG, CAMPOS_LABELS } from '@/types/articulos-config'

interface ToggleGroupProps {
  title: string
  description: string
  campos: (keyof CamposVisibles)[]
  values: CamposVisibles
  onChange: (campo: keyof CamposVisibles, value: boolean) => void
}

function ToggleGroup({ title, description, campos, values, onChange }: ToggleGroupProps) {
  return (
    <div className="border rounded-sm p-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {campos.map(campo => (
          <div key={campo} className="flex items-center justify-between py-1">
            <Label htmlFor={campo} className="text-sm font-normal cursor-pointer">
              {CAMPOS_LABELS[campo]}
            </Label>
            <Switch
              id={campo}
              checked={values[campo]}
              onCheckedChange={checked => onChange(campo, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ArticulosSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<CamposVisibles>(
    DEFAULT_ARTICULOS_CONFIG.camposVisibles
  )

  useEffect(() => {
    fetchSettingsClient()
      .then(settings => {
        if (settings.articulosConfig?.camposVisibles) {
          setConfig(settings.articulosConfig.camposVisibles)
        }
      })
      .catch(() => {
        toast({
          title: 'Error al cargar configuración',
          variant: 'destructive',
        })
      })
      .finally(() => setLoading(false))
  }, [toast])

  function handleChange(campo: keyof CamposVisibles, value: boolean) {
    setConfig(prev => ({ ...prev, [campo]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateSettings({
        articulosConfig: { camposVisibles: config },
      })
      invalidateArticulosConfig()
      toast({ title: 'Configuración guardada' })
    } catch {
      toast({
        title: 'Error al guardar',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Artículos</h2>
        <p className="text-muted-foreground">
          Configurá qué campos se muestran en formularios, listados y detalle de artículos.
        </p>
      </div>

      <div className="space-y-4">
        <ToggleGroup
          title="Propiedades físicas"
          description="Características del producto"
          campos={['marca', 'modelo', 'talle', 'color', 'material', 'presentacion', 'medida']}
          values={config}
          onChange={handleChange}
        />

        <ToggleGroup
          title="Identificación adicional"
          description="Códigos opcionales de identificación"
          campos={['sku', 'codigoBarras']}
          values={config}
          onChange={handleChange}
        />

        <ToggleGroup
          title="Precios"
          description="El precio de venta siempre se muestra"
          campos={['costo']}
          values={config}
          onChange={handleChange}
        />

        <ToggleGroup
          title="Secciones"
          description="Secciones completas del módulo de artículos"
          campos={['observaciones', 'erp', 'origen']}
          values={config}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the page loads**

Run `cd apps/web && pnpm dev` and navigate to `/settings/articulos`. Verify:

- Nav item appears between Negocio and Depositos
- Page loads with 4 toggle groups
- Toggles switch on/off
- Save button works (check network tab for PATCH to /api/settings)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/settings/settings-nav.tsx apps/web/src/app/\(dashboard\)/settings/articulos/
git commit -m "feat(settings): add articulos field visibility config page"
```

---

## Chunk 4: Consume config in article components

### Task 8: ArticuloForm — hide fields

**Files:**

- Modify: `apps/web/src/components/articulos/articulo-form.tsx`

- [ ] **Step 1: Add hook and conditional rendering**

In `articulo-form.tsx`:

Add import at top:

```typescript
import { useArticulosConfig } from '@/hooks/use-articulos-config'
```

Inside `ArticuloForm` component, after `const [isLoading, setIsLoading] = useState(false)`:

```typescript
const { isCampoVisible } = useArticulosConfig()
```

Then wrap each toggleable field in the JSX with conditional checks. The fields to wrap:

**Identification section** — wrap SKU and codigoBarras fields:

```tsx
{/* In the Identificacion grid, wrap SKU field */}
{isCampoVisible('sku') && (
  <FormField control={form.control} name="sku" ... />
)}

{/* After the grid, wrap codigoBarras field */}
{isCampoVisible('codigoBarras') && (
  <FormField control={form.control} name="codigoBarras" ... />
)}
```

**Properties section** — wrap the entire section:

```tsx
{/* Wrap the Propiedades section - only show if at least one property is visible */}
{(isCampoVisible('marca') || isCampoVisible('modelo') || isCampoVisible('talle') || isCampoVisible('color') || isCampoVisible('material') || isCampoVisible('presentacion') || isCampoVisible('medida')) && (
  <div className="border rounded-sm p-4 space-y-3">
    <SectionHeader title="Propiedades" />
    <div className="grid gap-3 sm:grid-cols-2">
      {isCampoVisible('marca') && (<FormField ... name="marca" ... />)}
      {isCampoVisible('modelo') && (<FormField ... name="modelo" ... />)}
      {isCampoVisible('talle') && (<FormField ... name="talle" ... />)}
      {isCampoVisible('color') && (<FormField ... name="color" ... />)}
      {isCampoVisible('material') && (<FormField ... name="material" ... />)}
      {isCampoVisible('presentacion') && (<FormField ... name="presentacion" ... />)}
    </div>
    {isCampoVisible('medida') && (<FormField ... name="medida" ... />)}
  </div>
)}
```

**Prices section** — wrap costo field:

```tsx
{isCampoVisible('costo') && (
  <FormField control={form.control} name="costo" ... />
)}
```

**Observaciones section** — wrap entire section:

```tsx
{
  isCampoVisible('observaciones') && (
    <div className="border rounded-sm p-4 space-y-3">
      <SectionHeader title="Observaciones" />
      ...
    </div>
  )
}
```

**ERP and Origen collapsibles** — wrap each:

```tsx
{
  /* Wrap ERP collapsible */
}
{
  isCampoVisible('erp') && <Collapsible className="flex-1 border rounded-sm">...ERP...</Collapsible>
}

{
  /* Wrap Origen collapsible */
}
{
  isCampoVisible('origen') && (
    <Collapsible className="flex-1 border rounded-sm">...Origen...</Collapsible>
  )
}
```

If both ERP and Origen are hidden, also hide the parent `<div className="flex gap-2">`.

- [ ] **Step 2: Verify form hides fields**

Navigate to `/articulos/nuevo` and `/articulos/[code]/editar`. Verify that fields with `false` config (talle, color, material by default) don't appear.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/articulos/articulo-form.tsx
git commit -m "feat(articulos): hide form fields based on articulosConfig"
```

### Task 9: ArticuloSheet — hide fields + costo stat card

**Files:**

- Modify: `apps/web/src/components/articulos/articulo-sheet.tsx`

- [ ] **Step 1: Add hook and conditional rendering**

In `articulo-sheet.tsx`:

Add import:

```typescript
import { useArticulosConfig } from '@/hooks/use-articulos-config'
```

Inside `ArticuloSheet`, after the `useState` calls:

```typescript
const { isCampoVisible } = useArticulosConfig()
```

**Hero stat cards** — conditionally show costo card:

```tsx
<div className="flex gap-2">
  <StatCard label="Precio" value={...} />
  {isCampoVisible('costo') && (
    <StatCard label="Costo" value={...} />
  )}
  <StatCard label="Stock" value={...} />
</div>
```

**Properties grid** — wrap each FieldRow:

```tsx
<div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
  {isCampoVisible('marca') && <FieldRow label="Marca" value={articulo.marca} />}
  {isCampoVisible('modelo') && <FieldRow label="Modelo" value={articulo.modelo} />}
  {isCampoVisible('talle') && <FieldRow label="Talle" value={articulo.talle} />}
  {isCampoVisible('color') && <FieldRow label="Color" value={articulo.color} />}
  {isCampoVisible('material') && <FieldRow label="Material" value={articulo.material} />}
  {isCampoVisible('presentacion') && (
    <FieldRow label="Presentacion" value={articulo.presentacion} />
  )}
  {isCampoVisible('medida') && <FieldRow label="Medida" value={articulo.medida} />}
</div>
```

**Below the grid** — wrap codigoBarras and observaciones:

```tsx
{
  ;((isCampoVisible('codigoBarras') && articulo.codigoBarras) ||
    (isCampoVisible('observaciones') && articulo.observaciones)) && (
    <div className="mt-2 space-y-1">
      {isCampoVisible('codigoBarras') && articulo.codigoBarras && (
        <FieldRow label="Cod. Barras" value={articulo.codigoBarras} />
      )}
      {isCampoVisible('observaciones') && articulo.observaciones && (
        <FieldRow label="Observaciones" value={articulo.observaciones} />
      )}
    </div>
  )
}
```

**SKU in header** — conditionally show SKU in SheetDescription:

```tsx
<SheetDescription>
  {articulo.codigo}
  {isCampoVisible('sku') && articulo.sku ? ` · SKU: ${articulo.sku}` : ''}
</SheetDescription>
```

**ERP collapsible** — wrap with config check:

```tsx
{
  isCampoVisible('erp') && hasAnyErpField(articulo) && (
    <CollapsibleSection title="ERP">...</CollapsibleSection>
  )
}
```

**Origen collapsible** — wrap with config check:

```tsx
{
  isCampoVisible('origen') && hasAnyOriginField(articulo) && (
    <CollapsibleSection title="Origen">...</CollapsibleSection>
  )
}
```

- [ ] **Step 2: Verify sheet hides fields**

Open a sheet for an article. Verify talle, color, material don't appear. Toggle costo off in settings and verify the costo stat card disappears.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/articulos/articulo-sheet.tsx
git commit -m "feat(articulos): hide sheet fields based on articulosConfig"
```

### Task 10: ArticulosColumns — filter columns

**Files:**

- Modify: `apps/web/src/components/articulos/articulos-columns.tsx`

- [ ] **Step 1: Make getColumns accept camposVisibles**

In `articulos-columns.tsx`:

Add import:

```typescript
import type { CamposVisibles } from '@/types/articulos-config'
```

Change the `getColumns` signature to accept config:

```typescript
export function getColumns(handlers: ColumnHandlers, camposVisibles?: CamposVisibles): ColumnDef<Articulo>[] {
```

Filter out disabled columns. After building the full array, filter before returning:

```typescript
const allColumns: ColumnDef<Articulo>[] = [
  // ... all existing column definitions unchanged ...
]

if (!camposVisibles) return allColumns

// Map column accessorKeys to config keys
const columnConfigMap: Record<string, keyof CamposVisibles> = {
  marca: 'marca',
  modelo: 'modelo',
  talle: 'talle',
  color: 'color',
  material: 'material',
  sku: 'sku',
  codigoBarras: 'codigoBarras',
  costo: 'costo',
  erpCodigo: 'erp',
}

return allColumns.filter(col => {
  const key = (col as { accessorKey?: string }).accessorKey
  if (!key || !(key in columnConfigMap)) return true
  return camposVisibles[columnConfigMap[key]]
})
```

Keep `defaultColumnVisibility` unchanged — it controls which enabled columns start hidden in the column picker. The `allColumns.filter()` removes disabled columns entirely so they can't be toggled on.

- [ ] **Step 2: Verify hidden columns are excluded**

Navigate to `/articulos`. Open column visibility dropdown. Verify columns for disabled fields (talle, color, material) don't appear at all.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/articulos/articulos-columns.tsx
git commit -m "feat(articulos): filter table columns based on articulosConfig"
```

### Task 11: Update articulos-client to pass config to getColumns

**Files:**

- Modify: `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx:126-128`

- [ ] **Step 1: Import hook and pass camposVisibles**

In `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx`:

Add import:

```typescript
import { useArticulosConfig } from '@/hooks/use-articulos-config'
```

Inside the component, add the hook call (near the other hooks):

```typescript
const { camposVisibles } = useArticulosConfig()
```

Update the `useMemo` for columns (around line 126-128):

```typescript
const tableColumns = useMemo(
  () => getColumns({ onEdit: handleEdit, onToggle: handleToggleRequest }, camposVisibles),
  [handleEdit, handleToggleRequest, camposVisibles]
)
```

Note: `camposVisibles` is a stable reference from the module-level cache (same object on each render after initial load), so it won't cause unnecessary re-memoization.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/articulos/articulos-client.tsx
git commit -m "feat(articulos): pass camposVisibles to table columns"
```

---

## Chunk 5: Final verification

### Task 12: End-to-end verification

- [ ] **Step 1: Test the full flow**

1. Go to `/settings/articulos`
2. Verify talle, color, material are OFF by default
3. Toggle costo OFF and save
4. Go to `/articulos` — verify costo column is gone from visibility options
5. Click an article — verify costo stat card is hidden in sheet, talle/color/material not shown
6. Go to edit page — verify costo field hidden, talle/color/material hidden
7. Go back to settings, toggle costo ON, save
8. Verify costo reappears everywhere

- [ ] **Step 2: Test data preservation**

1. Create an article with all fields filled
2. Toggle some fields OFF in settings
3. Verify the fields disappear from UI
4. Toggle them back ON
5. Verify the data is still there, unchanged

- [ ] **Step 3: Final commit if any fixes needed**
