# Phase 19: Articulos CRUD - Verification

**Verified:** 2026-03-12
**Status:** PASSED

---

## ART-01: Crear articulo

**Requirement:** El sistema permite crear un articulo con todos sus campos via formulario con validacion.

### Backend evidence

**Endpoint:** `POST /api/articulos` — `apps/backend/src/modules/articulos/articulos.controller.ts` line 42-45

```typescript
@UseGuards(RolesGuard)
@Roles('admin')
@Post()
create(@Body() dto: CreateArticuloDto) {
  return this.articulosService.create(dto)
}
```

**Service:** `apps/backend/src/modules/articulos/articulos.service.ts` lines 96-106

```typescript
async create(dto: CreateArticuloDto) {
  const rows = await this.drizzle.db
    .insert(articulos)
    .values(dto as typeof articulos.$inferInsert)
    .returning()
  const articulo = rows[0]
  this.eventEmitter.emit('articulo.created', { articulo })
  return articulo
}
```

Emits `articulo.created` event (fire and forget, non-blocking) after insert.

### Frontend evidence

**Route:** `apps/web/src/app/(dashboard)/articulos/nuevo/page.tsx` — renders `<ArticuloForm mode="create" />`, redirects to `/articulos` on success.

**Form:** `apps/web/src/components/articulos/articulo-form.tsx` — Zod schema with ~22 fields: `codigo`, `nombre`, `sku`, `codigoBarras`, `observaciones`, `marca`, `modelo`, `talle`, `color`, `material`, `presentacion`, `medida`, `precio`, `costo`, `erpId`, `erpCodigo`, `erpNombre`, `erpPrecio`, `erpCosto`, `erpUnidades`, `erpSincronizado`, `originSource`, `originSyncId`, `activo` (lines 28-53).

**API client:** `apps/web/src/lib/api.client.ts` `createArticulo()` — `POST /api/articulos` with JSON body and auth headers (lines 135-144).

---

## ART-02: Editar articulo

**Requirement:** El sistema permite editar todos los campos de un articulo existente con datos pre-cargados.

### Backend evidence

**Endpoint:** `PATCH /api/articulos/:codigo` — `apps/backend/src/modules/articulos/articulos.controller.ts` lines 47-52

```typescript
@UseGuards(RolesGuard)
@Roles('admin')
@Patch(':codigo')
update(@Param('codigo') codigo: string, @Body() dto: UpdateArticuloDto) {
  return this.articulosService.update(codigo, dto)
}
```

**Service:** `apps/backend/src/modules/articulos/articulos.service.ts` lines 108-122

```typescript
async update(codigo: string, dto: UpdateArticuloDto) {
  const rows = await this.drizzle.db
    .update(articulos)
    .set({ ...(dto as Partial<typeof articulos.$inferInsert>), updatedAt: new Date() })
    .where(eq(articulos.codigo, codigo))
    .returning()
  if (!rows[0]) {
    throw new NotFoundException(...)
  }
  this.eventEmitter.emit('articulo.updated', { articulo: rows[0] })
  return rows[0]
}
```

Emits `articulo.updated` event.

### Frontend evidence

**Route:** `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` — loads articulo via `fetchArticuloByCodigoClient(codigo)` (line 43), renders `<ArticuloForm mode="edit" articulo={articulo} />` (lines 173-180).

**Pre-population:** Form receives `articulo` prop; in `mode="edit"` React Hook Form is initialized with `reset(values)` from the loaded articulo object.

**API client:** `apps/web/src/lib/api.client.ts` `updateArticulo(codigo, data)` — `PATCH /api/articulos/${encodeURIComponent(codigo)}` with JSON body and auth headers (lines 146-158).

---

## ART-03: Soft-delete con confirmacion

**Requirement:** Desactivar un articulo via soft-delete (no eliminacion fisica) con dialogo de confirmacion, dispara evento `articulo.deleted`. Reactivar dispara `articulo.updated`.

### Backend evidence

**Endpoint:** `DELETE /api/articulos/:codigo` — `apps/backend/src/modules/articulos/articulos.controller.ts` lines 61-67

```typescript
@UseGuards(RolesGuard)
@Roles('admin')
@Delete(':codigo')
@HttpCode(HttpStatus.OK)
softDelete(@Param('codigo') codigo: string) {
  return this.articulosService.softDelete(codigo)
}
```

`@HttpCode(HttpStatus.OK)` — returns 200 with body (not 204), body is the updated articulo.

**Service:** `apps/backend/src/modules/articulos/articulos.service.ts` lines 142-158

```typescript
async softDelete(codigo: string) {
  const existing = await this.findOne(codigo)
  if (!existing) throw new NotFoundException(...)
  const rows = await this.drizzle.db
    .update(articulos)
    .set({ activo: false, updatedAt: new Date() })
    .where(eq(articulos.codigo, codigo))
    .returning()
  const articulo = rows[0]
  this.eventEmitter.emit('articulo.deleted', { articulo })
  return articulo
}
```

Sets `activo=false` (soft-delete, not physical deletion). Emits `articulo.deleted` — distinct from `toggleActive()` which emits `articulo.updated`.

**Reactivation:** `PATCH /api/articulos/:codigo/toggle` → `toggleActive()` — flips `activo` field, emits `articulo.updated` (lines 124-140).

### Webhook flow (end-to-end)

```
deleteArticulo(codigo)              [api.client.ts - line 173]
  → DELETE /api/articulos/:codigo   [articulos.controller.ts - line 65]
    → softDelete(codigo)            [articulos.service.ts - line 142]
      → activo = false              [articulos.service.ts - line 150]
      → emit('articulo.deleted')    [articulos.service.ts - line 156]
        → handleArticuloDeleted()   [webhooks.listener.ts - line 19]
          → dispatchEvent(...)      [webhooks.listener.ts - line 21]
```

**WebhooksListener:** `apps/backend/src/modules/webhooks/webhooks.listener.ts` lines 19-22

```typescript
@OnEvent('articulo.deleted')
async handleArticuloDeleted(payload: { articulo: unknown }) {
  await this.webhooksService.dispatchEvent('articulo.deleted', payload)
}
```

### Frontend confirmation dialog

**articulos-client.tsx:** `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx`

- `AlertDialog` (lines 300-319) displays confirmation before any toggle action
- `handleConfirmToggle()` (lines 224-254): conditional logic — `deleteArticulo()` for active articles, `toggleArticuloActivo()` for inactive
- Import: `deleteArticulo` added at line 27

**editar/page.tsx:** `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx`

- `AlertDialog` (lines 211-230) confirms toggle action
- `handleConfirmToggle()` (lines 56-73): `deleteArticulo()` + `router.push('/articulos')` for active; `toggleArticuloActivo()` + `setArticulo(updated)` for inactive
- Import: `deleteArticulo` added at line 9

---

## ART-04: Busqueda con debounce

**Requirement:** La lista de articulos tiene busqueda en tiempo real con debounce para reducir llamadas al backend.

### Frontend evidence

**Search input:** `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` lines 263-270 — `<Input placeholder="Buscar articulos..." value={search} onChange={e => setSearch(e.target.value)} />` inside toolbar.

**Debounce via useEffect:** lines 104-119

```typescript
useEffect(() => {
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current)
  }
  searchTimeoutRef.current = setTimeout(() => {
    setPage(1)
    fetchData(1, search, statusFilter, sortBy, sortOrder)
  }, 300) // 300ms debounce

  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [search])
```

Uses `useRef<NodeJS.Timeout>` (line 64) to track the timeout across renders.

### Backend evidence

**Query param:** `apps/backend/src/modules/articulos/articulos.service.ts` lines 28-47 — `findAll()` accepts `query.search`, builds `ilike` across 13 fields: `codigo`, `nombre`, `sku`, `codigoBarras`, `erpCodigo`, `marca`, `modelo`, `talle`, `color`, `material`, `presentacion`, `medida`, `observaciones` using `or()` + `and()` composition.

**DTO:** `apps/backend/src/modules/articulos/dto/articulo-query.dto.ts` — declares `search` as optional string query param.
