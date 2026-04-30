# Phase 29: Catálogos de Atributos (Propiedades) - Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 24 nuevos + 4 modificados = 28
**Analogs found:** 26 / 28 (93% — los 2 sin analog son tests Wave 0 sobre infra inexistente)

---

## File Classification

### Backend

| Nuevo / Modificado | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/backend/src/db/schema.ts` (modify, +6 tablas) | model / schema | DDL declarativo | `apps/backend/src/db/schema.ts:261-273` (depositos) + `:323-338` (dispositivosMoviles) | exact (mismo archivo) |
| `apps/backend/drizzle/0004_phase29_propiedades.sql` (new auto-gen) | migration | DDL | `apps/backend/drizzle/0002_kind_jamie_braddock.sql` | role-match (auto-generado) |
| `apps/backend/drizzle/0005_phase29_cache_trigger.sql` (new --custom) | migration | DDL custom (PL/pgSQL) | `apps/backend/drizzle/0003_add_columna_inv_articulos.sql` | role-match (manual SQL) |
| `apps/backend/src/modules/propiedades/propiedades.module.ts` (new) | module | DI registration | `apps/backend/src/modules/dispositivos/dispositivos.module.ts` | exact |
| `apps/backend/src/modules/propiedades/propiedades.controller.ts` (new) | controller | request-response REST | `apps/backend/src/modules/dispositivos/dispositivos.controller.ts` | exact (extend con `:tipo`) |
| `apps/backend/src/modules/propiedades/propiedades.service.ts` (new) | service | CRUD + UNIQUE-violation handling | `apps/backend/src/modules/dispositivos/dispositivos.service.ts` | exact (parametrizado por `tipo`) |
| `apps/backend/src/modules/propiedades/propiedades.constants.ts` (new) | utility / config | static map | sin analog directo (helper de Phase 29) | no analog |
| `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` (new) | DTO | input validation | `apps/backend/src/modules/dispositivos/dto/create-dispositivo.dto.ts` | exact |
| `apps/backend/src/modules/propiedades/dto/update-propiedad.dto.ts` (new) | DTO | input validation | `apps/backend/src/modules/dispositivos/dto/update-dispositivo.dto.ts` | exact |
| `apps/backend/src/modules/propiedades/dto/list-propiedades-query.dto.ts` (new — opcional) | DTO | query validation | sin analog (parsing manual en controller) | partial — research recomienda parsing manual |
| `apps/backend/src/app.module.ts` (modify) | module | DI registration | `apps/backend/src/app.module.ts:14,33` (registro DepositosModule) | exact (mismo archivo) |

### Shared types

| Nuevo / Modificado | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/web/src/types/propiedad.ts` (new — research lo ubica en `apps/web` no en `packages/types`) | model / type | type definition | `apps/web/src/types/deposito.ts` | exact |

> **Nota crítica del research §Open Q5:** los tipos NO van en `packages/types/src/propiedades.ts`. El patrón canónico del repo es `apps/web/src/types/<entidad>.ts` (ver deposito.ts, dispositivo.ts). `packages/types` solo expone `AppRole` + zod schemas auth (verificado en `packages/types/src/index.ts`).

### Web

| Nuevo / Modificado | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/web/src/app/(dashboard)/propiedades/page.tsx` (new — Server Component) | page (RSC) | render | `apps/web/src/app/(dashboard)/settings/depositos/page.tsx` | exact |
| `apps/web/src/components/propiedades/propiedades-page.tsx` (new — Client) | component | UI state (tabs) | sin analog directo (Tabs lazy es nuevo en este repo) | partial — primitiva `tabs.tsx` ya instalada |
| `apps/web/src/components/propiedades/propiedad-table.tsx` (new) | component | request-response (fetch) | `apps/web/src/components/dispositivos/dispositivos-list.tsx` + `apps/web/src/components/depositos/depositos-list.tsx` | exact (combina ambos) |
| `apps/web/src/components/propiedades/propiedad-create-dialog.tsx` (new — reusable Phase 32) | component | form submit | `apps/web/src/components/depositos/deposito-dialog.tsx` + `apps/web/src/components/dispositivos/dispositivo-dialog.tsx` | exact |
| `apps/web/src/components/propiedades/propiedad-edit-dialog.tsx` (new) | component | form submit | mismo deposito-dialog (variante isEditing) | exact |
| `apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx` (new) | component | confirm | sin analog directo (proyecto usa `confirm()` nativo en depositos-list:163) | partial — `AlertDialog` primitiva ya instalada |
| `apps/web/src/components/propiedades/propiedad-config.ts` (new) | utility | static map | `apps/backend/src/modules/propiedades/propiedades.constants.ts` (espejo) | no analog directo |
| `apps/web/src/lib/abrev.ts` (new — pure helper) | utility | transform | sin analog (función pura nueva) | no analog |
| `apps/web/src/lib/api.client.ts` (modify) | utility | request-response | `apps/web/src/lib/api.client.ts:223-269` (depositos block) + `:450-489` (dispositivos block) | exact (mismo archivo) |
| `apps/web/src/config/navigation.ts` (modify) | config | static | `apps/web/src/config/navigation.ts:17-48` (entradas existentes) | exact (mismo archivo) |

### Tests (Wave 0)

| Nuevo / Modificado | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/web/vitest.config.ts` (new — si Camino completo) | config | test infra | **NO ANALOG** — test infra inexistente | no analog |
| `apps/web/src/lib/abrev.test.ts` (new — pure unit) | test | unit | **NO ANALOG** — no hay tests en el repo | no analog |
| `apps/web/playwright.config.ts` (new o modify) | config | test infra | **NO ANALOG** — playwright-testing skill, no config en repo | no analog |
| `apps/web/e2e/propiedades.spec.ts` (new) | test | E2E browser | **NO ANALOG** — primer E2E del repo | no analog |

> **Camino mínimo viable** (recomendado por research §Validation Architecture line 1530-1540): solo los 4 archivos de tests arriba + scripts en `package.json`. **Camino completo**: agrega Jest backend (~10 archivos más). El planner decide y refleja en cantidad de plans.

---

## Pattern Assignments

### `apps/backend/src/db/schema.ts` (model — DDL declarativo)

**Analog:** `apps/backend/src/db/schema.ts:261-273` (depositos) y `:323-338` (dispositivosMoviles).

**Imports actuales del archivo** (líneas 1-15) — agregar `check` al import block:

```typescript
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  doublePrecision,
  timestamp,
  index,
  uniqueIndex,
  numeric,
  boolean,
  jsonb,
  primaryKey,
  // AGREGAR para Phase 29:
  check,
} from 'drizzle-orm/pg-core'
// AGREGAR (helper para LOWER):
import { sql, type AnyPgColumn } from 'drizzle-orm'
```

**Patrón de tabla soft-delete con `activo`** (depositos, líneas 261-273) — copiar shape:

```typescript
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
```

**Patrón de UNIQUE constraint inline** (dispositivosMoviles, línea 328):

```typescript
identificador: varchar('identificador', { length: 100 }).notNull().unique(),
```

> **Nota:** Phase 29 NO usa `.unique()` inline porque necesita UNIQUE LOWER + CHECK regex. Usa `uniqueIndex().on(sql\`lower(...)\`)` y `check()` en el tercer argumento de `pgTable`. Ver Pattern 1 de RESEARCH.md líneas 312-389 para el shape exacto que el planner debe copiar (factory `definePropTable(tableName, indexPrefix)` que retorna `pgTable(...)` con `[uniqueIndex, uniqueIndex, check, index]` en el array de constraints).

**Type exports** (final del archivo, líneas 478-494) — patrón a duplicar al final:

```typescript
export type Deposito = typeof depositos.$inferSelect
export type NewDeposito = typeof depositos.$inferInsert

export type DispositivoMovil = typeof dispositivosMoviles.$inferSelect
export type NewDispositivoMovil = typeof dispositivosMoviles.$inferInsert
```

---

### `apps/backend/src/modules/propiedades/propiedades.module.ts` (module — DI registration)

**Analog:** `apps/backend/src/modules/dispositivos/dispositivos.module.ts` (10 líneas, completo).

**Excerpt — copy verbatim renombrando**:

```typescript
import { Module } from '@nestjs/common'
import { DispositivosController } from './dispositivos.controller'
import { DispositivosService } from './dispositivos.service'

@Module({
  controllers: [DispositivosController],
  providers: [DispositivosService],
  exports: [DispositivosService],
})
export class DispositivosModule {}
```

> Para Phase 29: 1:1 con `Propiedades` en lugar de `Dispositivos`. `exports: [PropiedadesService]` por si Phase 30/31 necesita reusarlo.

---

### `apps/backend/src/modules/propiedades/propiedades.controller.ts` (controller — request-response REST)

**Analog:** `apps/backend/src/modules/dispositivos/dispositivos.controller.ts` (56 líneas).

**Imports pattern** (dispositivos.controller.ts líneas 1-16):

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common'
import { DispositivosService } from './dispositivos.service'
import { CreateDispositivoDto } from './dto/create-dispositivo.dto'
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
```

**Auth/Guard pattern** (dispositivos.controller.ts líneas 36-55) — RBAC `admin`-only para mutaciones:

```typescript
@UseGuards(RolesGuard)
@Roles('admin')
@Post()
create(@Body() dto: CreateDispositivoDto) {
  return this.dispositivosService.create(dto)
}

@UseGuards(RolesGuard)
@Roles('admin')
@Patch(':id')
update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDispositivoDto) {
  return this.dispositivosService.update(id, dto)
}

@UseGuards(RolesGuard)
@Roles('admin')
@Patch(':id/toggle')
toggleActive(@Param('id', ParseIntPipe) id: number) {
  return this.dispositivosService.toggleActive(id)
}
```

> Reads (`@Get()`, `@Get(':id')`) NO llevan `@UseGuards(RolesGuard)` — `viewer` puede leer. Ver dispositivos.controller.ts líneas 22-34.

**NotFound pattern** (dispositivos.controller.ts líneas 27-34):

```typescript
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number) {
  const dispositivo = await this.dispositivosService.findOne(id)
  if (!dispositivo) {
    throw new NotFoundException(`Dispositivo con ID ${id} no encontrado`)
  }
  return dispositivo
}
```

> **Diferencia clave Phase 29:** la URL es `:tipo/:id` no `:id`. El planner debe agregar el helper `assertValidTipo(tipo)` que valida contra el array `PROP_TIPOS` (ver RESEARCH.md líneas 552-607 para el controller completo prescrito).

---

### `apps/backend/src/modules/propiedades/propiedades.service.ts` (service — CRUD + UNIQUE-violation handling)

**Analog:** `apps/backend/src/modules/dispositivos/dispositivos.service.ts` (100 líneas) — éste es el **patrón canónico para 23505**.

**Imports pattern** (dispositivos.service.ts líneas 1-6):

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { eq, asc } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { dispositivosMoviles } from '../../db/schema'
import { CreateDispositivoDto } from './dto/create-dispositivo.dto'
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto'
```

**Constructor + findAll/findOne pattern** (dispositivos.service.ts líneas 8-26):

```typescript
@Injectable()
export class DispositivosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll() {
    return this.drizzle.db
      .select()
      .from(dispositivosMoviles)
      .orderBy(asc(dispositivosMoviles.nombre))
  }

  async findOne(id: number) {
    const rows = await this.drizzle.db
      .select()
      .from(dispositivosMoviles)
      .where(eq(dispositivosMoviles.id, id))

    return rows[0] ?? null
  }
```

**UNIQUE-violation handling — patrón canónico 23505** (dispositivos.service.ts líneas 28-52):

```typescript
async create(dto: CreateDispositivoDto) {
  try {
    const rows = await this.drizzle.db
      .insert(dispositivosMoviles)
      .values({
        nombre: dto.nombre,
        identificador: dto.identificador,
        descripcion: dto.descripcion,
      })
      .returning()

    return rows[0]
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as Record<string, unknown>).code === '23505'
    ) {
      throw new ConflictException(
        `Ya existe un dispositivo con identificador "${dto.identificador}"`
      )
    }
    throw error
  }
}
```

> **Phase 29 extiende este pattern:** distingue UNIQUE LOWER(nombre) vs UNIQUE(abrev) parseando `error.constraint_name` para mensajes específicos. Ver RESEARCH.md líneas 511-535 (helper `handleUniqueViolation`). El research también flagea como Assumption A1 que el shape de `error.constraint_name` debe verificarse en Wave 0 con un INSERT real.

**Update con `updatedAt: new Date()` pattern** (dispositivos.service.ts líneas 54-84):

```typescript
async update(id: number, dto: UpdateDispositivoDto) {
  try {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre
    if (dto.identificador !== undefined) updateData.identificador = dto.identificador
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion

    const rows = await this.drizzle.db
      .update(dispositivosMoviles)
      .set(updateData)
      .where(eq(dispositivosMoviles.id, id))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Dispositivo con ID ${id} no encontrado`)
    }

    return rows[0]
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as Record<string, unknown>).code === '23505'
    ) {
      throw new ConflictException(
        `Ya existe un dispositivo con identificador "${dto.identificador}"`
      )
    }
    throw error
  }
}
```

**toggleActive pattern** (dispositivos.service.ts líneas 86-99):

```typescript
async toggleActive(id: number) {
  const existing = await this.findOne(id)
  if (!existing) {
    throw new NotFoundException(`Dispositivo con ID ${id} no encontrado`)
  }

  const rows = await this.drizzle.db
    .update(dispositivosMoviles)
    .set({ activo: !existing.activo, updatedAt: new Date() })
    .where(eq(dispositivosMoviles.id, id))
    .returning()

  return rows[0]
}
```

> **Adaptación Phase 29:** todas las funciones reciben `tipo: PropTipo` como primer arg, llaman `tableFor(tipo)` para resolver la tabla del map `PROP_TABLES`. Ver RESEARCH.md líneas 438-536 para el service genérico completo.

---

### `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` (DTO — class-validator)

**Analog:** `apps/backend/src/modules/dispositivos/dto/create-dispositivo.dto.ts` (17 líneas).

**Excerpt completo del analog**:

```typescript
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'

export class CreateDispositivoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  identificador!: string

  @IsOptional()
  @IsString()
  descripcion?: string
}
```

> **Phase 29:** dos campos solamente — `nombre` (con `@MaxLength(255)` por D-03) y `abrev` con `@Matches(/^[A-Z0-9]{1,8}$/)` (por D-06). Ver RESEARCH.md líneas 611-628 para el DTO completo prescrito (incluye `@Transform(({ value }) => value.trim())` opcional).

---

### `apps/backend/src/modules/propiedades/dto/update-propiedad.dto.ts` (DTO)

**Analog:** `apps/backend/src/modules/dispositivos/dto/update-dispositivo.dto.ts` (17 líneas).

**Excerpt completo** — el patrón canónico del repo NO usa `PartialType` de `@nestjs/mapped-types` (verificado: `grep -rn @nestjs/mapped-types apps/backend/src` retorna 0 matches):

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator'

export class UpdateDispositivoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  identificador?: string

  @IsOptional()
  @IsString()
  descripcion?: string
}
```

> **Importante:** la nota del RESEARCH.md línea 638 advierte: "si `@nestjs/mapped-types` no está instalado, replicar el patrón actual del repo". **El patrón actual (este excerpt) es lo que debe usarse.** No instalar `@nestjs/mapped-types` para Phase 29.

---

### `apps/backend/src/app.module.ts` (modify — DI registration)

**Analog:** mismo archivo — copiar el shape de la entrada `DispositivosModule`.

**Imports section** (líneas 8-19):

```typescript
import { OrdersModule } from './modules/orders/orders.module'
import { SalesModule } from './modules/sales/sales.module'
import { PurchasesModule } from './modules/purchases/purchases.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { SettingsModule } from './modules/settings/settings.module'
import { ArticulosModule } from './modules/articulos/articulos.module'
import { DepositosModule } from './modules/depositos/depositos.module'
import { ExistenciasModule } from './modules/existencias/existencias.module'
import { InventariosModule } from './modules/inventarios/inventarios.module'
import { DispositivosModule } from './modules/dispositivos/dispositivos.module'
import { ApiKeysModule } from './modules/api-keys/api-keys.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'
```

**Imports array** (líneas 23-39):

```typescript
imports: [
  EventEmitterModule.forRoot({ wildcard: true }),
  DbModule,
  AuthModule,
  OrdersModule,
  SalesModule,
  PurchasesModule,
  DashboardModule,
  SettingsModule,
  ArticulosModule,
  DepositosModule,
  ExistenciasModule,
  InventariosModule,
  DispositivosModule,
  ApiKeysModule,
  WebhooksModule,
],
```

> **Phase 29:** agregar `import { PropiedadesModule } from './modules/propiedades/propiedades.module'` y `PropiedadesModule` en el array (sugerencia: después de `ArticulosModule` y antes de `DepositosModule` para agrupar conceptualmente).

---

### `apps/web/src/types/propiedad.ts` (new — type definition)

**Analog:** `apps/web/src/types/deposito.ts` (13 líneas, completo):

```typescript
export interface Deposito {
  id: number
  nombre: string
  direccion: string | null
  descripcion: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
  stockSummary: {
    totalArticulos: number
    totalUnidades: number
  }
}
```

> **Phase 29:** sin `stockSummary`. Agregar también `export const PROP_TIPOS = [...] as const` y `export type PropTipo = typeof PROP_TIPOS[number]` (ver RESEARCH.md líneas 1167-1182).

---

### `apps/web/src/app/(dashboard)/propiedades/page.tsx` (new — Server Component)

**Analog:** `apps/web/src/app/(dashboard)/settings/depositos/page.tsx` (13 líneas, completo):

```typescript
import { DepositosList } from '@/components/depositos/depositos-list'

export default function DepositosSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Depositos</h2>
        <p className="text-sm text-muted-foreground">Gestion de depositos y almacenes</p>
      </div>
      <DepositosList />
    </div>
  )
}
```

> **Adaptación Phase 29:** título "Propiedades", subtítulo "Gestión de propiedades de artículos" (UI-SPEC.md), monta `<PropiedadesPage />` (Client Component que envuelve `<Tabs>`).
> **Nota de path:** la ruta canónica del repo es `apps/web/src/app/(dashboard)/...` (verificado contra `apps/web/src/app/(dashboard)/settings/depositos/page.tsx`). El research usa indistintamente "(admin)" y "(dashboard)" — el correcto es **(dashboard)**.

---

### `apps/web/src/components/propiedades/propiedad-table.tsx` (new — generic table)

**Analog primario:** `apps/web/src/components/dispositivos/dispositivos-list.tsx` (157 líneas — versión más simple, buena base).
**Analog secundario:** `apps/web/src/components/depositos/depositos-list.tsx` (381 líneas — patrón con `loadData` callback y reload via `setState`).

**Imports pattern** (dispositivos-list.tsx líneas 1-18):

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DispositivoMovil } from '@/types/dispositivo'
import { toggleDispositivo } from '@/lib/api.client'
import { DispositivoDialog } from '@/components/dispositivos/dispositivo-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
```

**State + load + toggle pattern** (depositos-list.tsx líneas 41-72) — preferido sobre `window.location.reload()` de dispositivos-list:

```typescript
const [depositos, setDepositos] = useState<Deposito[]>(initialDepositos ?? [])
const [loading, setLoading] = useState(!initialDepositos)
const [togglingId, setTogglingId] = useState<number | null>(null)
const [dialogOpen, setDialogOpen] = useState(false)
const [editingDeposito, setEditingDeposito] = useState<Deposito | undefined>()

const loadDepositos = useCallback(async () => {
  try {
    const data = await fetchDepositosClient()
    setDepositos(data)
  } catch (error) {
    toast({
      title: 'Error al cargar depositos',
      description: error instanceof Error ? error.message : 'Error desconocido',
      variant: 'destructive',
    })
  } finally {
    setLoading(false)
  }
}, [toast])

useEffect(() => {
  loadDepositos()
}, [loadDepositos])
```

**Toggle handler pattern** (depositos-list.tsx líneas 126-143):

```typescript
async function handleToggle(deposito: Deposito) {
  setTogglingId(deposito.id)
  try {
    await toggleDepositoActivo(deposito.id)
    toast({
      title: deposito.activo ? 'Deposito desactivado' : 'Deposito activado',
    })
    await loadDepositos()
  } catch (error) {
    toast({
      title: 'Error al cambiar estado',
      description: error instanceof Error ? error.message : 'Error desconocido',
      variant: 'destructive',
    })
  } finally {
    setTogglingId(null)
  }
}
```

**Header bar + create button pattern** (dispositivos-list.tsx líneas 73-80):

```tsx
<div className="flex items-center justify-between mb-4">
  <div />
  <Button size="sm" onClick={handleCreate}>
    <Plus className="mr-2 h-4 w-4" />
    Nuevo Dispositivo
  </Button>
</div>
```

**Table pattern** (dispositivos-list.tsx líneas 86-146) — versión con Badge `activo/inactivo` + columna acciones:

```tsx
<div className="rounded-sm border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Nombre</TableHead>
        <TableHead>Identificador</TableHead>
        <TableHead>Descripcion</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="text-right">Acciones</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {dispositivos.map(dispositivo => (
        <TableRow key={dispositivo.id}>
          <TableCell className="font-medium text-sm">{dispositivo.nombre}</TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {dispositivo.identificador}
          </TableCell>
          <TableCell>
            <Badge variant={dispositivo.activo ? 'default' : 'outline'} className="text-xs">
              {dispositivo.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleEdit(dispositivo)}
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={togglingId === dispositivo.id}
                onClick={() => handleToggle(dispositivo)}
                title={dispositivo.activo ? 'Desactivar' : 'Activar'}
              >
                {togglingId === dispositivo.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : dispositivo.activo ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

**DropdownMenu row actions pattern** (UI-SPEC requiere `MoreHorizontal h-3.5 w-3.5` + `DropdownMenu`, NO botones inline) — `apps/web/src/components/articulos/articulos-columns.tsx:21-50`:

```tsx
function RowActions({ articulo, handlers }: { articulo: Articulo; handlers: ColumnHandlers }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-6 w-6 p-0" onClick={e => e.stopPropagation()}>
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={e => {
            e.stopPropagation()
            handlers.onEdit(articulo)
          }}
        >
          <PencilIcon className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={e => {
            e.stopPropagation()
            handlers.onToggle(articulo)
          }}
        >
          {articulo.activo ? 'Desactivar' : 'Reactivar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

> **Decisión Phase 29:** UI-SPEC manda `DropdownMenu` con `MoreHorizontal`. Usar este pattern de articulos-columns para la columna acciones, NO los botones inline ToggleLeft/ToggleRight de dispositivos-list. Ver shape completo en RESEARCH.md líneas 1307-1330.

**Empty state pattern** (dispositivos-list.tsx líneas 82-86):

```tsx
{dispositivos.length === 0 ? (
  <div className="text-center py-8 text-sm text-muted-foreground">
    No hay dispositivos registrados. Crea uno para empezar.
  </div>
) : ( ... )}
```

> Phase 29 copy (UI-SPEC): "Sin {plural}. Usá el botón Nueva {singular} para agregar la primera."

---

### `apps/web/src/components/propiedades/propiedad-create-dialog.tsx` (new — reusable Phase 32)

**Analog:** `apps/web/src/components/depositos/deposito-dialog.tsx` (171 líneas, full canonical pattern).

**Imports + zod schema pattern** (deposito-dialog.tsx líneas 1-43):

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { Deposito } from '@/types/deposito'
import { createDeposito, updateDeposito } from '@/lib/api.client'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const depositoFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no debe superar los 100 caracteres'),
  direccion: z
    .string()
    .max(255, 'La direccion no debe superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
  descripcion: z.string().optional().or(z.literal('')),
})

type DepositoFormValues = z.infer<typeof depositoFormSchema>
```

**Component signature + RHF setup** (deposito-dialog.tsx líneas 45-74):

```typescript
interface DepositoDialogProps {
  deposito?: Deposito
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DepositoDialog({ deposito, open, onOpenChange, onSuccess }: DepositoDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!deposito

  const form = useForm<DepositoFormValues>({
    resolver: zodResolver(depositoFormSchema),
    defaultValues: {
      nombre: '',
      direccion: '',
      descripcion: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: deposito?.nombre ?? '',
        direccion: deposito?.direccion ?? '',
        descripcion: deposito?.descripcion ?? '',
      })
    }
  }, [open, deposito, form])
```

**Submit handler with toast pattern** (deposito-dialog.tsx líneas 76-101):

```typescript
async function onSubmit(values: DepositoFormValues) {
  setIsLoading(true)
  try {
    if (isEditing) {
      await updateDeposito(deposito.id, values)
      toast({ title: 'Deposito actualizado correctamente' })
    } else {
      await createDeposito({
        nombre: values.nombre,
        direccion: values.direccion || undefined,
        descripcion: values.descripcion || undefined,
      })
      toast({ title: 'Deposito creado correctamente' })
    }
    onOpenChange(false)
    onSuccess()
  } catch (error) {
    toast({
      title: isEditing ? 'Error al actualizar el deposito' : 'Error al crear el deposito',
      description: error instanceof Error ? error.message : 'Error desconocido',
      variant: 'destructive',
    })
  } finally {
    setIsLoading(false)
  }
}
```

**Dialog/Form JSX pattern** (deposito-dialog.tsx líneas 103-170):

```tsx
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar Deposito' : 'Nuevo Deposito'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Deposito principal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* otros FormFields */}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear deposito'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  </Dialog>
)
```

> **Phase 29 adaptaciones específicas (RESEARCH.md líneas 762-935):**
> 1. Añadir `propTipo: PropTipo` prop, `onCreated?: (created) => void` callback (Phase 32 hook), `trigger?: ReactNode`, controlled/uncontrolled `open`/`onOpenChange`.
> 2. Auto-suggest abrev: `useEffect` que escucha `form.watch('nombre')`, llama `suggestAbrev()` y hace `form.setValue('abrev', ...)` SI `abrevManuallyEdited === false`.
> 3. Input abrev `onChange`: `field.onChange(e.target.value.toUpperCase())` + `setAbrevManuallyEdited(true)`.
> 4. Mapear errores 409 del backend a `form.setError('nombre' | 'abrev')` parseando el message.
> 5. Schema zod: `abrev: z.string().regex(/^[A-Z0-9]{1,8}$/, '...')`.

---

### `apps/web/src/components/propiedades/propiedad-edit-dialog.tsx` (new)

**Analog:** mismo `apps/web/src/components/depositos/deposito-dialog.tsx` — la rama `isEditing === true` (líneas 78-83 y 161-164).

**Diff respecto al create dialog:**
- `propiedad: Propiedad` requerido (no opcional).
- Title: "Editar {Singular}".
- Submit button: "Guardar cambios".
- Llama `updatePropiedad(propTipo, id, values)` en lugar de `createPropiedad`.
- Sin auto-suggest (el abrev ya existe; el usuario edita manualmente si quiere).
- Reset del form en `useEffect` con valores de `propiedad` cuando `open === true`.

> Por consistencia con el repo, **no es estrictamente necesario un archivo separado**: el research lo propone separado pero podría ser el mismo componente con `propiedad?: Propiedad`. Decisión queda al planner.

---

### `apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx` (new — confirm)

**Analog parcial:** patrón actual del repo es `confirm()` nativo (`depositos-list.tsx:163`). UI-SPEC manda **AlertDialog** de shadcn (primitiva ya instalada en `apps/web/src/components/ui/alert-dialog.tsx`).

**Sin analog directo en codebase.** Usar la primitiva con la signature shadcn estándar:

```tsx
'use client'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Uso en handler:
<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Desactivar &apos;{propiedad.nombre}&apos;</AlertDialogTitle>
      <AlertDialogDescription>
        Vas a desactivar &apos;{propiedad.nombre}&apos;. Los artículos existentes
        que la usan no se modifican. ¿Confirmás?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirm}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Desactivar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

> Loading: usa `togglingId === propiedad.id` flag desde `propiedad-table` (mismo patrón que `togglingId` en depositos-list.tsx:127).

---

### `apps/web/src/lib/api.client.ts` (modify — add fetchers)

**Analog:** mismo archivo — bloque `Depositos` líneas 223-269.

**fetchDepositosClient pattern** (líneas 223-230):

```typescript
export async function fetchDepositosClient(): Promise<Deposito[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}
```

**createDeposito pattern** (líneas 232-245):

```typescript
export async function createDeposito(data: {
  nombre: string
  direccion?: string
  descripcion?: string
}): Promise<Deposito> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}
```

**updateDeposito + toggle pattern** (líneas 247-269):

```typescript
export async function updateDeposito(
  id: number,
  data: Partial<{ nombre: string; direccion: string; descripcion: string }>
): Promise<Deposito> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function toggleDepositoActivo(id: number): Promise<Deposito> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/depositos/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}
```

> **Phase 29 adapta:** todas las funciones reciben `tipo: PropTipo` como primer arg y construyen `${API_BASE_URL}/api/propiedades/${tipo}[/${id}][/toggle]`. Ver RESEARCH.md líneas 1099-1163 para los 4 fetchers completos. Adicionalmente, `fetchPropiedades` recibe `opts: { activo?: boolean | 'all' }` y construye `URLSearchParams`.

---

### `apps/web/src/config/navigation.ts` (modify — add entry)

**Analog:** mismo archivo (49 líneas), entrada de "Artículos" (líneas 23-27):

```typescript
{
  label: 'Artículos',
  icon: Package,
  href: '/articulos',
},
```

**Imports section** (líneas 1-9):

```typescript
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  Settings,
  type LucideIcon,
} from 'lucide-react'
```

> **Phase 29:** agregar `Tags` al import de `lucide-react`, insertar entrada `{ label: 'Propiedades', icon: Tags, href: '/propiedades' }` después de "Artículos" (líneas 27, antes de "Compras").

---

### `apps/web/src/lib/abrev.ts` (new — pure helper)

**No analog en el codebase.** Ver RESEARCH.md líneas 974-983 para la implementación completa. Función pura ~10 LOC, sin dependencias externas, basada en `String.prototype.normalize('NFD')` + regex strip diacritics.

---

### `apps/backend/drizzle/0005_phase29_cache_trigger.sql` (new — custom)

**Analog:** `apps/backend/drizzle/0003_add_columna_inv_articulos.sql` (4 líneas — único custom SQL del repo):

```sql
-- Manual migration applied 2026-04-29 to align production DB with schema.ts after refactor c735e9c1
-- (replace sectorId with columna). Was missing from the regenerated migration-prod.sql.
-- Idempotent: safe to re-run.
ALTER TABLE "inventarios_articulos" ADD COLUMN IF NOT EXISTS "columna" integer;
```

> **Phase 29:** archivo SQL header descriptivo + bloque `CREATE OR REPLACE FUNCTION cache_nombre_prop()` + `CREATE TRIGGER` **comentado** (Opción A del RESEARCH.md líneas 650-682). Phase 30/31 lo descomentará.
> Generación: `pnpm db:generate --custom --name=phase29_cache_trigger` (drizzle-kit lo crea vacío; el dev escribe el SQL).

---

## Shared Patterns

### Authentication & RBAC

**Source:** `apps/backend/src/common/guards/roles.guard.ts` + `apps/backend/src/common/decorators/roles.decorator.ts`

**Apply to:** Todos los endpoints write en `propiedades.controller.ts` (POST, PATCH, PATCH /toggle).

**Excerpt — roles.decorator.ts**:

```typescript
import { SetMetadata } from '@nestjs/common'
import { AppRole } from '@objetiva/types'

export { AppRole } from '@objetiva/types'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles)
```

**Excerpt — roles.guard.ts** (líneas 11-34):

```typescript
canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
    context.getHandler(),
    context.getClass(),
  ])

  if (!requiredRoles || requiredRoles.length === 0) {
    return true
  }

  const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
  const user = request.user

  if (!user) {
    throw new ForbiddenException('Usuario no autenticado')
  }

  if (!requiredRoles.includes(user.role)) {
    throw new ForbiddenException('Permisos insuficientes')
  }

  return true
}
```

**Usage pattern** (dispositivos.controller.ts líneas 36-55):

```typescript
@UseGuards(RolesGuard)
@Roles('admin')
@Post()
create(@Body() dto: CreateDispositivoDto) { ... }
```

> Phase 29: aplicar a todos los endpoints write. JWT auth ya cubierto globalmente por `CompositeAuthGuard` (registrado en `app.module.ts:42-46` como `APP_GUARD`).

---

### Error Handling — UNIQUE violation 23505

**Source:** `apps/backend/src/modules/dispositivos/dispositivos.service.ts:40-51`
**Apply to:** `propiedades.service.ts` create + update.

**Excerpt:**

```typescript
} catch (error: unknown) {
  if (
    error instanceof Error &&
    'code' in error &&
    (error as Record<string, unknown>).code === '23505'
  ) {
    throw new ConflictException(
      `Ya existe un dispositivo con identificador "${dto.identificador}"`
    )
  }
  throw error
}
```

> Phase 29 extiende a doble UNIQUE (LOWER(nombre) + abrev) parseando `error.constraint_name` o `error.detail` para distinguir cuál se violó. Helper `handleUniqueViolation` en RESEARCH.md líneas 511-535.

---

### Validation — class-validator + ValidationPipe global

**Source:** `apps/backend/src/main.ts:22-28`
**Apply to:** Todos los DTOs de Phase 29.

**Excerpt — ValidationPipe global config**:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true, // Auto-transform query params to DTO types
    whitelist: true, // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error on unknown properties
  })
)
```

> Implicación: cualquier campo en el body que no esté declarado en el DTO retorna 400 automáticamente. Confirma assumption A3 del research.

---

### Frontend Forms — RHF + zod + Dialog

**Source:** `apps/web/src/components/depositos/deposito-dialog.tsx` (canónico) + `apps/web/src/components/dispositivos/dispositivo-dialog.tsx` (variante)
**Apply to:** Todos los dialogs de Phase 29 (create, edit).

**Patrón canónico documentado en sección "PropiedadCreateDialog" arriba** — `sm:max-w-md`, `space-y-4` form, `Loader2 mr-2 h-4 w-4 animate-spin` en submit, `useEffect(() => form.reset(...))` cuando `open === true`.

---

### Frontend API client — fetch + Bearer JWT

**Source:** `apps/web/src/lib/api.client.ts:28-48` (helpers globales)
**Apply to:** Todas las funciones nuevas en `api.client.ts` para Phase 29.

**Excerpt — helpers globales**:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createBrowserSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return {
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

async function throwIfError(response: Response): Promise<void> {
  if (response.ok) return
  let detail = ''
  try {
    const body = await response.json()
    detail = body.message ?? JSON.stringify(body)
  } catch {
    detail = response.statusText
  }
  throw new Error(detail)
}
```

> **Importante:** `throwIfError` devuelve `body.message` cuando el backend retorna `{ message: '...' }` (NestJS default). Así llegan los mensajes 409 del helper `handleUniqueViolation` directo al `error.message` que Form ve. **No reinventar manejo de errores.**

---

### Sidebar nav — active-state styling

**Source:** `apps/web/src/components/layout/sidebar.tsx:43-62`
**Apply to:** Verificación visual del entry "Propiedades".

**Excerpt:**

```tsx
{routes.map(route => {
  const Icon = route.icon
  const isActive = pathname === route.href || pathname.startsWith(`${route.href}/`)

  return (
    <Link
      key={route.href}
      href={route.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4" style={isActive ? undefined : { color: '#056ed1' }} />
      <span>{route.label}</span>
    </Link>
  )
})}
```

> Phase 29 simplemente agrega una entry al array `routes` en `navigation.ts`. El Sidebar la pinta automáticamente con el patrón active/inactive. Color `#056ed1` (brand blue) ya cumplido por la lógica existente.

---

## No Analog Found

| File | Role | Data Flow | Reason | Recomendación |
|------|------|-----------|--------|----------------|
| `apps/backend/src/modules/propiedades/propiedades.constants.ts` | utility / static map | static data | El repo no tiene maps de tipo enum→table similares todavía | Inventar siguiendo el shape del RESEARCH.md líneas 400-426 |
| `apps/web/src/components/propiedades/propiedades-page.tsx` (Tabs lazy) | component | UI state | No hay Radix Tabs en uso en el repo todavía (primitiva instalada pero no usada) | Patrón canónico Radix (default lazy mount) — RESEARCH.md líneas 717-751 |
| `apps/web/src/components/propiedades/propiedad-config.ts` | utility / config | static map | Espejo cliente del backend `PROP_LABELS` | Replicar shape de `propiedades.constants.ts` |
| `apps/web/src/lib/abrev.ts` | utility | pure transform | No hay helpers de slugify/transliteración en `apps/web/src/lib/` | Función pura ~10 LOC — RESEARCH.md líneas 974-983 |
| `apps/web/vitest.config.ts` | config / test infra | — | **No hay tests en el repo.** Wave 0 lo crea desde cero | Vitest oficial Next 14 + jsdom |
| `apps/web/src/lib/abrev.test.ts` | test (unit) | unit | Sin precedente en el repo | Formato Vitest standard |
| `apps/web/playwright.config.ts` | config / test infra | — | Skill `playwright-testing` se usa, pero no hay config en repo | Generación standard `npx playwright init` |
| `apps/web/e2e/propiedades.spec.ts` | test (E2E) | browser | Primer E2E del repo | Ejemplos de Playwright docs (login admin → CRUD propiedades) |

> **Para los 4 archivos de tests:** el research recomienda **Camino mínimo viable** (líneas 1530-1540) — solo `abrev.test.ts` + `propiedades.spec.ts` Playwright + scripts en `package.json`. Backend tests se difieren a quick task posterior.

---

## Metadata

**Analog search scope:**
- `apps/backend/src/modules/{depositos,dispositivos,articulos}/`
- `apps/backend/src/db/schema.ts` y `apps/backend/drizzle/`
- `apps/backend/src/common/guards/` y `apps/backend/src/common/decorators/`
- `apps/backend/src/main.ts`, `apps/backend/src/app.module.ts`
- `apps/web/src/components/{depositos,dispositivos,articulos}/`
- `apps/web/src/app/(dashboard)/settings/{depositos,dispositivos}/page.tsx`
- `apps/web/src/lib/api.client.ts`, `apps/web/src/types/`
- `apps/web/src/config/navigation.ts`, `apps/web/src/components/layout/sidebar.tsx`
- `packages/types/src/index.ts`

**Files scanned:** 22 archivos directos + verificación negativa (`@nestjs/mapped-types` sin uso, tests inexistentes, `prop_*` no en schema).

**Pattern extraction date:** 2026-04-30

**Confianza:**
- **Backend module/controller/service/DTO:** HIGH — analog 1:1 (`Dispositivos*`).
- **Backend schema (Drizzle declarativo):** HIGH — el archivo objetivo ya tiene el patrón base (depositos), Drizzle 0.45 soporta `check()` y `uniqueIndex().on(sql\`lower(...)\`)` declarativos (verificado en RESEARCH.md §Hallazgo crítico).
- **Web list/dialog:** HIGH — analog 1:1 (`Depositos*`/`Dispositivos*` web).
- **Web Tabs lazy:** MEDIUM — primitiva instalada, sin uso previo en el repo. Radix default behavior cubre el comportamiento.
- **Web tests:** LOW — sin analog. Wave 0 los crea desde cero.

