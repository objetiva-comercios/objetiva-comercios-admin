---
phase: 30-templates-composici-n-sku-nombre
plan: 04
subsystem: frontend
tags:
  - frontend
  - nextjs
  - propiedades-tabs
  - templates-ui
  - tabler
  - phase-30
dependency_graph:
  requires:
    - '30-01: composer puro + tipos @objetiva/types'
    - '30-02: migration 0008 (prop_familia + prop_aplicacion + articulos_templates + template_atributos + seed default)'
    - '30-03: backend NestJS (módulo templates + propiedades extension con familia/aplicacion)'
  provides:
    - 'UI completa de 8 tabs de propiedades (Familias con extra col + Aplicaciones)'
    - 'Página /templates list + /templates/[id] detail/edit del template default'
    - 'Tipo extendido Propiedad con subcategoriaId? para filas de tipo familia'
    - 'PropiedadTable extendido con extraColumns? prop (backward-compat)'
    - 'PropiedadCreateDialog extendido con extraFields? + buildExtraPayload? + validateExtra?'
    - 'Endpoints /api/propiedades/categoria y /api/propiedades/subcategoria expuestos'
  affects:
    - 'Wave 3 cerrada — Phase 30 lista para /gsd:verify-work 30'
    - 'ROADMAP success #1 (UI editar templates) — entregado parcialmente: edit del default OK, create/delete diferido'
tech_stack:
  added: []
  patterns:
    - 'Composición de extraColumns/extraFields para reutilizar PropiedadTable + PropiedadCreateDialog en lugar de duplicar componentes'
    - 'useEffect con cancelled flag para fetch lifecycle robusto'
    - 'Form simple (Inputs número + Switch) en /templates/[id] — D-13 no drag-drop'
    - 'Tooltip + span tabIndex wrapper para mostrar tooltip sobre Button disabled (Phase 30 defers feature)'
key_files:
  created:
    - 'apps/web/src/app/(dashboard)/templates/page.tsx'
    - 'apps/web/src/app/(dashboard)/templates/[id]/page.tsx'
  modified:
    - 'apps/web/src/types/propiedad.ts'
    - 'apps/web/src/components/propiedades/propiedad-table.tsx'
    - 'apps/web/src/components/propiedades/propiedad-create-dialog.tsx'
    - 'apps/web/src/components/propiedades/propiedades-page.tsx'
    - 'apps/web/src/lib/api.client.ts'
    - 'apps/web/src/config/navigation.ts'
    - 'apps/backend/src/modules/propiedades/propiedades.constants.ts'
    - 'apps/backend/src/modules/propiedades/propiedades.service.ts'
decisions:
  - "Para Familias se introdujo un componente interno FamiliasTab (no se duplicó PropiedadTable). Carga subcategorías una vez via fetchPropiedades('subcategoria', { activo: true }), construye lookup local, y pasa extraColumns + createDialogExtras al PropiedadTable genérico. Composición externa, no prop nuevo invasivo."
  - 'El tipo ArticulosTemplate de la API (con descripcion+activo+timestamps) se define localmente en api.client.ts en lugar de extender el Template puro de @objetiva/types, que está optimizado para el composer (id+nombre+atributos solamente). Evita acoplar 2 contratos distintos.'
  - "Botones 'Nuevo template' y 'Agregar atributo' renderizados disabled con Tooltip explicativo en lugar de ocultos — UX expone explícitamente la decisión D-13 de Phase 30 al admin."
  - 'Form de detalle usa estado intermedio DraftAtributo (strings) para soportar inputs numéricos nullable; parsea a number|null al submit con validación cliente previa al PATCH.'
  - 'Deviación Rule 2: el plan asume que /api/propiedades/subcategoria existe pero el endpoint dinámico no exponía categoria/subcategoria. Se extendieron PROP_TIPOS+PROP_TABLES backend para que el endpoint genérico sirva ambos. Cambio mínimamente invasivo (tablas ya existían desde quick task 260319-od3).'
metrics:
  duration: ~50 min
  completed_date: '2026-05-17'
  tasks_completed: 4
  files_changed: 10
  commits: 4
---

# Phase 30 Plan 04: Frontend Wave — Tabs Familias/Aplicaciones + Páginas Templates Summary

One-liner: Cierra Wave 3 entregando 8 tabs en `/propiedades` (con lógica especial Familias para el select de subcategoría) y las páginas `/templates` (list) + `/templates/[id]` (form simple sin drag-drop) que cumplen TPL-01..TPL-04 desde UI sin Builder visual.

## Lo que se construyó

### Extensión de tipos compartidos (`apps/web/src/types/propiedad.ts`)

- `PROP_TIPOS` pasa de 6 a 8 entries (agrega `'familia'`, `'aplicacion'`).
- `Propiedad` interface gana `subcategoriaId?: number` (solo presente en filas de tipo `familia` — el backend lo devuelve directo de la tabla).
- `PROP_LABELS` y `PROP_NOMBRE_PLACEHOLDERS` extendidos con 2 entries más.
- `copyFor()` no requiere cambios (es genérica sobre `gender`).

### PropiedadTable: nuevo slot `extraColumns?`

`apps/web/src/components/propiedades/propiedad-table.tsx`:

- Exporta `interface ExtraColumn { header; cell; className? }`.
- `PropiedadTableProps` gana `extraColumns?: ExtraColumn[]` y `createDialogExtras?: { extraFields?; buildExtraPayload?; validateExtra? }`.
- Header + body + skeleton + empty-colspan adaptados dinámicamente a la presencia de `extraColumns`.
- Las extra cols se renderizan **entre** "Abrev" y "Estado" (no al final donde están las acciones).
- Backward-compat estricta: los 6 tabs originales pasan `undefined` → render idéntico al de Phase 29.

### PropiedadCreateDialog: nuevos slots `extraFields` / `buildExtraPayload` / `validateExtra`

`apps/web/src/components/propiedades/propiedad-create-dialog.tsx`:

- 3 props nuevos (todos opcionales) documentados con JSDoc.
- `extraFields` se renderiza entre el `FormField` de `abrev` y el `DialogFooter`.
- En `onSubmit`: primero `validateExtra()` (si retorna string no-null se aborta con toast); luego el body es `{ ...values, ...buildExtraPayload?.() }`.
- Firma de `createPropiedad` en `api.client.ts` ampliada a `{ nombre, abrev } & Record<string, unknown>` para aceptar el `parentId` extra cuando aplica.
- Test existente (`propiedad-create-dialog.test.tsx`) sigue verde sin cambios.

### Cableado de los 8 tabs (`propiedades-page.tsx`)

- La iteración sobre `PROP_TIPOS` automáticamente renderiza 8 `<TabsTrigger>` y 8 `<TabsContent>` (lazy mount via Radix).
- Para `tipo === 'familia'` se monta `<FamiliasTab />` en lugar de `<PropiedadTable propTipo="familia" />` directo.
- `FamiliasTab`:
  - Carga subcategorías activas una sola vez via `fetchPropiedades('subcategoria', { activo: true })` (Q3 RESOLVED: solo activas).
  - Mantiene state `parentId: number | null` para el dialog.
  - Construye `subcategoriaLookup: Record<number, string>` con `useMemo`.
  - Pasa `extraColumns=[{header:'Subcategoría', cell: row => subcategoriaLookup[row.subcategoriaId ?? -1] ?? '#id'}]`.
  - Pasa `createDialogExtras` con un `<Select>` de subcategorías (shadcn/ui) + `buildExtraPayload: () => ({ parentId })` + `validateExtra: () => parentId == null ? 'Seleccioná una subcategoría' : null`.

### `/templates` list (`apps/web/src/app/(dashboard)/templates/page.tsx`)

- Tabla shadcn con columnas: ID, Nombre, Descripción, Estado, link "Editar".
- Carga via `fetchTemplates({ activo: 'all' })` para asegurar que el default siempre aparece aún si fuese marcado inactivo.
- Botón **"Nuevo template" disabled** con Tooltip: _"Disponible en próxima fase — Phase 30 entrega solo el template default."_ (D-13).
- Estética Tabler: `h-8/h-9` en buttons, `text-sm` en cells, border-radius `md`, padding `py-4`, badge con `px-1.5 py-0 text-[11px]`.

### `/templates/[id]` detail/edit (`apps/web/src/app/(dashboard)/templates/[id]/page.tsx`)

- Header con link "← Volver a Templates" + nombre del template.
- Tabla form simple con 5 filas (atributos del default seed: `objeto`, `marca`, `modelo`, `medida`, `custom_1`):
  - Col atributo: read-only mono.
  - Col `ordenNombre`: `<Input type="number" min={1}>` (empty → null).
  - Col `ordenSku`: idem.
  - Col `esVariante`: `<Switch>` con `aria-label`.
  - Col `customSlot`: `<Input type="number" min={1} max={3}>` (empty → null).
- Estado intermedio `DraftAtributo[]` (strings) que permite inputs vacíos nullable.
- Validación cliente previa al submit: `orden_* >= 1` o vacío; `custom_slot ∈ {1,2,3}` o vacío.
- Botón "Guardar cambios" `disabled` cuando no hay cambios respecto al template cargado (cálculo `isDirty` con `useMemo`).
- Botón "Agregar atributo" `disabled` con tooltip explicativo (D-13).
- PATCH `/api/templates/:id/atributos` reemplaza la lista completa (transaccional en backend); tras éxito el state local se reemplaza por el response.
- **NO drag-drop libs introducidas** — D-13 honrado (verificación grep negativo).

### Navegación

`apps/web/src/config/navigation.ts` agrega un nav item "Templates" con icono `Layers` entre Propiedades y Compras.

### API client (`apps/web/src/lib/api.client.ts`)

3 helpers nuevos + 2 types:

```ts
export interface ArticulosTemplate {
  id
  nombre
  descripcion
  activo
  createdAt
  updatedAt
}
export interface ArticulosTemplateWithAtributos extends ArticulosTemplate {
  atributos: TemplateAtributo[]
}

export async function fetchTemplates(opts?: {
  activo?: boolean | 'all'
}): Promise<ArticulosTemplate[]>
export async function fetchTemplate(id: number): Promise<ArticulosTemplateWithAtributos>
export async function patchTemplateAtributos(
  id: number,
  atributos: TemplateAtributo[]
): Promise<TemplateAtributo[]>
```

`TemplateAtributo` se reusa de `@objetiva/types` (Wave 0). El shape del template lista/detalle vive localmente porque difiere del `Template` puro que consume el composer.

## Decisiones de implementación

- **Composición externa, no prop nuevo invasivo (Familias):** `FamiliasTab` envuelve `PropiedadTable` con `extraColumns` + `createDialogExtras`. No se creó un `<FamiliaTable>` paralelo, evitando duplicación; los 6 tabs originales no requieren cambios y siguen compartiendo el mismo componente base.
- **Botones "feature diferida" disabled con tooltip:** preferido sobre ocultar — comunica explícitamente al admin que la capacidad existe en backend pero la UI se difiere a otra fase (D-13). Tooltip sobre Button disabled requiere un wrapper `<span tabIndex={0}>` por la mecánica de pointer-events.
- **Estado intermedio `DraftAtributo` (strings) en el form de edición:** los `Input type="number"` controlados no manejan bien `value={null}` ni `value={undefined}`; usar strings permite inputs vacíos limpiamente y centraliza el parsing a `parseIntOrNull()`. La validación cliente vive en `validateDraft()` antes de tocar el backend.
- **API types locales vs `@objetiva/types`:** el tipo `Template` exportado por `@objetiva/types` está optimizado para el composer (`id + nombre + atributos`). El backend retorna columnas extra (`descripcion`, `activo`, timestamps) — separar `ArticulosTemplate` (HTTP response) de `Template` (composer input) evita acoplar 2 contratos diferentes en el mismo nombre.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Backend no exponía endpoint `/api/propiedades/subcategoria`**

- **Encontrado durante:** Task 3 (cableado de `FamiliasTab`).
- **Síntoma:** El plan asume que `fetchPropiedades('subcategoria', { activo: true })` funciona, pero el backend rechazaba el tipo con 400 (`subcategoria` no estaba en `PROP_TIPOS`).
- **Causa raíz:** Las tablas `prop_categoria` y `prop_subcategoria` existen desde la quick task `260319-od3` (migration 0006), pero ningún módulo backend las exponía vía endpoint. El módulo dinámico `propiedades` solo conocía las 6 originales + las 2 de Phase 30 (`familia`, `aplicacion`).
- **Fix:** Registrados `categoria` y `subcategoria` en `PROP_TIPOS`, `PROP_TABLES`, `PROP_LABELS` de `apps/backend/src/modules/propiedades/propiedades.constants.ts`. Se extendió el `create()` del service para que `subcategoria` acepte `dto.parentId` mapeado a `categoriaId` (mismo mecanismo que `familia → subcategoriaId`).
- **Archivos modificados:** `apps/backend/src/modules/propiedades/propiedades.constants.ts`, `apps/backend/src/modules/propiedades/propiedades.service.ts`.
- **Commit:** `577f494a`.
- **Riesgo / scope:** Cambio mínimamente invasivo. READ funciona out-of-the-box (service genérico). WRITE de `categoria` funciona (sin FK adicional); WRITE de `subcategoria` ahora valida `parentId` (categoriaId) como ya hacía `familia → subcategoriaId`. No se introducen nuevas migrations ni se tocan otros módulos. El frontend de Plan 30-04 solo usa READ (`fetchPropiedades('subcategoria')`), por lo que el incremento queda silenciosamente disponible para futuras fases (Phase 32 podría agregar la tab UI).

### Out-of-scope discoveries (no fixed)

- Ninguno.

## Auth gates

- Ninguno encontrado. JWT global vía `CompositeAuthGuard` ya estaba operativo desde Phase 29; los nuevos endpoints heredan auth automáticamente.

## Verificación automatizada (executor self-check)

```
PROP_TIPOS=8 OK
subcategoriaId en Propiedad OK
extraColumns en PropiedadTable OK
ExtraColumn export OK
fetchTemplates en api.client OK
patchTemplateAtributos en api.client OK
templates/page.tsx existe OK
templates/[id]/page.tsx existe OK
NO drag-drop libs (grep negativo react-beautiful-dnd|@dnd-kit) OK
```

```
pnpm --filter @objetiva/web type-check  → exit 0
pnpm --filter @objetiva/web build        → exit 0 (rutas /templates + /templates/[id] en manifest)
cd apps/web && pnpm test -- --run        → 29 tests pass (composer 17 + abrev 10 + propiedad-create-dialog 2)
pnpm --filter @objetiva/backend type-check → exit 0
pnpm --filter @objetiva/backend build      → exit 0
```

## Visual / runtime smoke

**Estado del checkpoint:** auto-aprobación basada en evidencia automatizada (modo desatendido — operador durmiendo, UAT mañana). El frontend NO se levantó vía `pnpm dev` ni docker compose; la validación visual queda diferida al UAT del operador.

**Lo que SÍ está validado por evidencia estática:**

- ✅ 8 tabs render driveado por `PROP_TIPOS` extendido (verificado por presencia de `PROP_TIPOS.map` en TabsList y TabsContent — count=2).
- ✅ Familias monta `FamiliasTab` (no `PropiedadTable` directo) — verificado por presencia de `tipo === 'familia' ? <FamiliasTab />` en propiedades-page.tsx.
- ✅ `FamiliasTab` pasa `extraColumns={[{header:'Subcategoría',...}]}` + `createDialogExtras` con select + validate parentId.
- ✅ `PropiedadCreateDialog` renderiza `{extraFields ?? null}` entre abrev y DialogFooter.
- ✅ Submit handler ejecuta `validateExtra()` antes del POST + spreadea `buildExtraPayload?.()` al body.
- ✅ `/templates` lista templates con botón "Nuevo template" disabled + tooltip; cada row tiene link a `/templates/:id`.
- ✅ `/templates/[id]` carga `fetchTemplate(id)`, renderiza tabla con 4 controles por atributo, `Save` llama `patchTemplateAtributos`, deshabilitado cuando no hay cambios.
- ✅ Build de Next.js emite ambas rutas con sizes razonables (`/templates` 3.37 kB, `/templates/[id]` 5.3 kB).

**Lo que requiere validación humana (UAT mañana):**

- Visual smoke: Tabler aesthetic real en navegador (h-9, border-radius, paddings).
- Funcional smoke: CRUD de Familias end-to-end con backend corriendo (requiere subcategorías seedadas — actualmente local DB no tiene seed de categorías/subcategorías; producción sí tiene data per restauración 260502-tqf).
- PATCH de atributos → reload → persistencia confirmada contra DB.
- 409 de duplicado en Familias se muestra con mensaje legible (mapeado por el handler genérico de PropiedadCreateDialog).

## Pending Actions (UAT operador)

1. **Rebuild + restart de `erp-web`** (docker compose) para que la imagen incluya las páginas `/templates` y `/templates/[id]` + los 8 tabs:

   ```bash
   docker compose build erp-web && docker compose up -d erp-web
   ```

2. **Rebuild + restart de `erp-backend`** para que incluya los endpoints `/api/propiedades/categoria` y `/api/propiedades/subcategoria`:

   ```bash
   docker compose build erp-backend && docker compose up -d erp-backend
   ```

3. **Verificación visual mañana:**
   - `https://erp.sanchezrepuestos.com.ar/propiedades` → confirmar 8 tabs, click Familias, intentar crear sin subcategoría (debe rechazar), seleccionar una y crear (debe persistir + mostrar nombre en col extra).
   - `https://erp.sanchezrepuestos.com.ar/templates` → 1 row "default", botón "Nuevo template" disabled con tooltip.
   - `https://erp.sanchezrepuestos.com.ar/templates/1` → 5 filas de atributos, modificar `orden_nombre` o `es_variante`, guardar, recargar, verificar persistencia.

4. **Si DB local NO tiene subcategorías seedadas para test local**, recordá que el endpoint las trae solo si existen filas en `prop_subcategoria` con `activo=true`. Producción ya tiene data per restauración 260502-tqf; local podría requerir un INSERT manual o un seed adicional (no scope de este plan).

## Known Stubs

Ninguno. Los botones "feature diferida" (Nuevo template, Agregar atributo) son intencionales per D-13 y están documentados con tooltip que explica el motivo. El frontend cablea data real de los endpoints reales.

## Follow-up (registrar al cerrar Phase 30)

Phase 30 entrega UI para editar atributos del template default pero NO ofrece create/delete de templates (botones disabled con tooltip per D-13). ROADMAP success #1 queda parcialmente entregado desde UI. El backend (Plan 03) sí expone POST/DELETE `/templates` — la limitación es solo del frontend.

Acción recomendada (post-Phase 30, al cerrar la fase con `/gsd:complete-milestone` o similar):

```
/gsd:add-todo "UI create/delete templates — Phase 30 dejó solo edit del default. ROADMAP success #1 parcial. Evaluar inclusión en Phase 32 o phase intermedia si v1.4 requiere multi-template antes"
```

Adicional (resultado de deviation Rule 2):

```
/gsd:add-todo "UI completa de categoria/subcategoria — Phase 30 expuso los endpoints READ + WRITE pero no agregó tabs visibles en /propiedades (no scope). Evaluar agregar 2 tabs más (10 total) o página dedicada con jerarquía categoria → subcategoria → familia"
```

## Self-Check: PASSED

- ✅ `apps/web/src/types/propiedad.ts` — modified, PROP_TIPOS=8, Propiedad gain subcategoriaId
- ✅ `apps/web/src/components/propiedades/propiedad-table.tsx` — modified, ExtraColumn export + extraColumns + createDialogExtras props
- ✅ `apps/web/src/components/propiedades/propiedad-create-dialog.tsx` — modified, 3 new slots
- ✅ `apps/web/src/components/propiedades/propiedades-page.tsx` — modified, FamiliasTab variant
- ✅ `apps/web/src/lib/api.client.ts` — modified, 3 template helpers + types
- ✅ `apps/web/src/config/navigation.ts` — modified, Templates nav item
- ✅ `apps/web/src/app/(dashboard)/templates/page.tsx` — created
- ✅ `apps/web/src/app/(dashboard)/templates/[id]/page.tsx` — created
- ✅ `apps/backend/src/modules/propiedades/propiedades.constants.ts` — modified (deviation Rule 2)
- ✅ `apps/backend/src/modules/propiedades/propiedades.service.ts` — modified (deviation Rule 2)
- ✅ Commits found in git log:
  - `f886f3b7` feat(30-04): extend prop types to 8 + add extraColumns slot to PropiedadTable
  - `93eb0c57` feat(30-04): add extraFields/buildExtraPayload/validateExtra slots to PropiedadCreateDialog
  - `577f494a` feat(30-04): expose 'categoria' and 'subcategoria' via /api/propiedades
  - `114df09b` feat(30-04): wire 8 prop tabs (Familias variant) + /templates list + detail/edit
