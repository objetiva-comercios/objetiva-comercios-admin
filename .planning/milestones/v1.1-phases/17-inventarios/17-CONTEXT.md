# Phase 17: Inventarios - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Physical inventory count events: create events linked to a deposito, record per-articulo counts, view discrepancies vs system stock (existencias), finalize events (locking counts as read-only). Includes: inventarios schema tables (MIG-05), backend CRUD module, web UI for events + counting + discrepancy review, sectores config on depositos, dispositivos moviles CRUD in settings, web navigation (sub-tab of Articulos). Does NOT include: mobile counting app (v1.2+), barcode scanning (SCAN-01/02), auto-apply discrepancies to existencias (STOK-01), stock transfers (STOK-02).

</domain>

<decisions>
## Implementation Decisions

### Evento de inventario - creacion y lista

- Creacion via dialog inline (como depositos) con campos: nombre, fecha, deposito (select), descripcion
- Lista de eventos en ServerDataTable con columnas: nombre, fecha, deposito, estado (badge), articulos contados
- Filtros por estado y fecha en la tabla
- Status workflow: pendiente -> en_curso -> finalizado (o cancelado)

### Evento de inventario - transiciones de estado

- Botones de accion contextual en la pagina de detalle del evento (no dropdown en la tabla)
- Boton segun estado actual: "Iniciar Conteo" (pendiente->en_curso), "Finalizar" (en_curso->finalizado), "Cancelar" (cualquiera->cancelado)
- Un solo boton visible a la vez segun el estado
- Finalizar solo bloquea conteos como read-only. No modifica existencias automaticamente (auto-apply es STOK-01, v1.2+)

### Experiencia de conteo

- Pagina dedicada de conteo: /articulos/inventarios/[id]/conteo
- Articulos se agregan al conteo via busqueda manual (por codigo, nombre, SKU) — no pre-carga automatica
- Tabla de conteo muestra: Articulo, Cantidad Contada, Stock Sistema, Diferencia (con color: verde=ok, rojo=faltante, amarillo=sobrante)
- Columna de diferencia siempre visible + filtro/toggle para ver solo discrepancias
- Solo web en esta fase — no hay conteo desde mobile (eso es v1.2+ con barcode scanning)

### Sectores

- Sectores son configuracion permanente del deposito, no por evento
- Se gestionan dentro de Settings > Depositos (cada deposito tiene sus sectores)
- Un sector agrupa columnas del deposito fisico (nombre + columnas)
- El evento de inventario hereda los sectores del deposito seleccionado

### Dispositivos moviles

- CRUD en Settings > Dispositivos (subseccion de Settings, como Depositos)
- Dialog inline para crear/editar (nombre, identificador, descripcion)
- No hay asignacion previa de dispositivos a inventarios
- El dispositivo_id se registra en cada conteo de articulo automaticamente (cuando un dispositivo registra un conteo, se guarda su ID)
- El CRUD solo sirve para dar nombre legible a los dispositivos

### Navegacion y estructura (web)

- Sub-tab dentro de Articulos: Listado | Existencias | Inventarios
- Rutas: /articulos/inventarios (lista), /articulos/inventarios/[id] (detalle), /articulos/inventarios/[id]/conteo (conteo)
- No se agrega a mobile en esta fase (mobile queda sin seccion inventarios)

### Claude's Discretion

- Diseno de la pagina de detalle del evento (layout, secciones)
- Componente de busqueda de articulos en pagina de conteo
- Loading skeletons y empty states
- KPI cards en la lista de inventarios (si aplica)
- Responsive design de la tabla de conteo
- Seed data para inventarios, sectores, dispositivos

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ServerDataTable` (`@/components/tables/server-data-table.tsx`): Tabla server-driven para lista de eventos
- `InlineEditCell` (`@/components/existencias/inline-edit-cell.tsx`): Click-to-edit pattern para cantidades contadas
- `Badge` (`@/components/ui/badge.tsx`): Para badges de estado (pendiente/en_curso/finalizado/cancelado)
- Dialog inline pattern de depositos: reutilizar para crear evento y gestionar dispositivos
- Segmented control pattern: reutilizar para filtros de estado
- Articulos layout con tabs (Listado | Existencias): extender con tab Inventarios
- Existencias KPI cards pattern: reutilizar si se agregan KPIs a inventarios

### Established Patterns

- NestJS module: controller + service + dto + module (ver articulos/, existencias/, depositos/)
- Drizzle schema: todas las tablas en schema.ts con $inferSelect/$inferInsert
- RBAC: @UseGuards(RolesGuard) + @Roles('admin') en write endpoints
- Settings sub-page: nav item + /settings/[section]/page.tsx + componente dedicado (ver depositos)
- Client layout con usePathname para tab navigation (ver articulos/layout.tsx)

### Integration Points

- `apps/backend/src/db/schema.ts` — Agregar tablas: inventarios, inventarios_articulos, inventario_sectores, dispositivos_moviles
- `apps/backend/src/db/seed.ts` — Agregar seed data para nuevas tablas
- `apps/backend/src/modules/` — Nuevos modulos: inventarios/, dispositivos/
- `apps/web/src/app/(dashboard)/articulos/inventarios/` — Nuevas rutas para inventarios
- `apps/web/src/app/(dashboard)/articulos/layout.tsx` — Agregar tab "Inventarios"
- `apps/web/src/app/(dashboard)/settings/` — Agregar subseccion Dispositivos
- `apps/backend/src/modules/depositos/` — Extender para CRUD de sectores del deposito

</code_context>

<specifics>
## Specific Ideas

- Dialog inline para crear evento: mismo patron minimalista que depositos (pocos campos, rapido)
- Pagina de conteo separada del detalle del evento — permite enfocarse en registrar cantidades
- Discrepancias siempre visibles (columna) + filtro para ver solo problemas — doble vista util para revision
- Sectores son del deposito fisico, no del evento — configuracion estable que no cambia con cada conteo
- Dispositivos son identificadores, no asignaciones — se registran automaticamente al contar

</specifics>

<deferred>
## Deferred Ideas

- Conteo desde app movil con barcode scanning — SCAN-01/02, v1.2+
- Auto-apply discrepancias a existencias — STOK-01, v1.2+
- Vista de inventarios en mobile — cuando se implemente el conteo movil
- Pre-carga automatica de articulos del deposito al iniciar conteo — posible mejora futura

</deferred>

---

_Phase: 17-inventarios_
_Context gathered: 2026-03-05_
