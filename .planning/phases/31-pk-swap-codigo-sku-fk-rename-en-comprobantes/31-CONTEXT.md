# Phase 31: PK Swap codigo→sku + FK rename en comprobantes - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Promueve `articulos.sku` a PK desde el día siguiente al deploy del cutover; deja `articulos.codigo` como agrupador indexado **NOT UNIQUE**; renombra la FK en las 5 tablas hijas (`order_items`, `sale_items`, `purchase_items`, `existencias`, `inventarios_articulos`) de `articulo_codigo` a `articulo_sku`; el webhook `articulo.*` empieza a incluir `sku` en el payload junto al `codigo` existente; el trigger `trg_update_articulo_unidades` (de quick task `260429-rec`) se reescribe para keyear por `articulo_sku` y `articulos.sku`. **Es la fase de mayor riesgo del milestone v1.3**.

**Incluye:**

1. Preflight audit informativo de `articulos.sku` (101.021 filas) + `pg_dump full` automatizado pre-cutover.
2. Migration de Deploy 1 (expand): agrega columna `articulo_sku TEXT` nullable en las 5 hijas + backfill desde JOIN articulos + backend doble-escribe ambas columnas en cada INSERT/UPDATE.
3. Migration de Deploy 2 (switch): overwrite `articulos.sku := stripSep(codigo)` + 7-step ordered transaction con `LOCK ACCESS EXCLUSIVE` (P-01) → DROP PK actual → ADD PRIMARY KEY (sku) → ALTER `codigo` DROP NOT NULL → `CREATE INDEX idx_articulos_codigo (no unique)` → re-add FKs en las 5 hijas pointing to `articulos.sku` + DISABLE TRIGGER trg_update_articulo_unidades + CREATE OR REPLACE FUNCTION (cuerpo nuevo con sku) + recompute manual UPDATE articulos.unidades + ENABLE TRIGGER + backend rekey API a `/api/articulos/:sku` + frontend rekey a `/articulos/[sku]/editar` + webhook payload v2 (sku agregado) + backend `findOne(sku)` + `findByCodigo(codigo)`.
4. Migration de Deploy 3 (contract): DROP COLUMN `articulo_codigo` en las 5 hijas.
5. Gate de validación: queries de integridad referencial del SC#5 + 24-48h soak entre cada deploy.
6. Nota visible en `/settings/webhooks` informando que el payload v2 incluye `sku`.

**NO incluye (scope de otras phases):**

- Modelo de variantes propiamente dicho (ABM de variantes, UI agrupada por `codigo`, edición de modelo vs variante, codigo_barras UNIQUE WHERE NOT NULL) → Phase 32.
- Cascade engine para cambios masivos de SKU desde edición de template (con history append-only + idempotencia + undo last batch) → Phase 33. El trigger guard defensivo `pg_trigger_depth() > 1` también se aplica ahí, no en Phase 31.
- Rename `existencias.columna → ubicacion` + sectores transversales → Phase 34.
- Migración histórica de existencias con sentinel `ubicacion=0` → Phase 36.
- Drift Q9 (TS↔DB en nombres de índices, precision numeric, timestamp(6)) → Phase 37 tech debt. Si la migration de Phase 31 toca tablas afectadas por drift, el planner decide si arregla en passing o lo deja explícito en Phase 37.
- Cableado del trigger `articulos.unidades` con UPDATE OF columnas adicionales (`articulo_sku`) para cubrir cascade de Phase 33 → Phase 33 (el trigger de Phase 31 mantiene el WHEN clause actual: `AFTER INSERT OR UPDATE OF cantidad OR DELETE`).

</domain>

<decisions>
## Implementation Decisions

### Preflight & safety net (Q5 + P-05)

- **D-01: Auditoría preflight informativa pero non-blocking.** El plan ejecuta un script SQL de auditoría sobre `articulos.sku` ANTES del cutover (`SELECT count(*) FILTER (WHERE sku IS NULL) AS null_sku, count(*) FILTER (WHERE sku = codigo) AS sku_eq_codigo, count(*) FILTER (WHERE sku IS NOT NULL AND sku != codigo) AS sku_diff_codigo, count(*) FILTER (WHERE sku IS NOT NULL) - count(DISTINCT sku) FILTER (WHERE sku IS NOT NULL) AS sku_dupes`). Guarda el output en `.planning/phases/31-.../31-PREFLIGHT-AUDIT.md` como evidencia. **NO bloquea el cutover** aunque encuentre `sku_diff_codigo > 0` o `sku_dupes > 0`.
- **D-02: Overwrite ciego de `articulos.sku`.** Tras el preflight informativo, la migration de Deploy 2 ejecuta `UPDATE articulos SET sku = codigoToSku(codigo)` para las 101.021 filas — cualquier valor preexistente en `articulos.sku` se considera ruido sin valor de negocio y se sobreescribe. El audit del D-01 deja papel de qué se borró. **La fórmula `codigoToSku` fue introducida en D-17 (cierre 2026-05-18) porque la fórmula original `stripSep` de Phase 29 D-12 producía 200 grupos de colisión sobre la base actual (ver 31-SKU-COLLISIONS.md).**
- **D-03: codigo_barras UNIQUE WHERE NOT NULL queda fuera de Phase 31.** El constraint es prerequisito de variantes (Phase 32) y de momento no se incluye ni se audita en el preflight de Phase 31. Si más adelante se detectan dupes, Phase 32 los aborda.
- **D-04: pg_dump full automatizado como safety net pre-cutover.** Cada migration de Deploy 2 (y opcionalmente Deploy 3) incluye un paso prep que ejecuta `pg_dump` completo de la DB y lo deja con timestamp en una carpeta acordada. Rollback = restore desde dump. Patrón heredado del operativo del 2026-05-15 post incidente de `db:push --force`. El planner decide path exacto (`backups/`, `~/`, o ubicación montada).

### Cutover orchestration (Q5 + ROADMAP SC#2)

- **D-05: 3 deploys expand → switch → contract.**
  - **Deploy 1 (expand):** migration agrega `articulo_sku TEXT` nullable en las 5 hijas + backfill desde JOIN con `articulos` (al ser `sku=codigo` post-overwrite en Deploy 2, en Deploy 1 todavía no hay overwrite; el backfill usa `articulos.sku` si existe o cae a `articulo_codigo` si `articulos.sku` está null — los detalles los define research/planner; ver Note debajo). Backend doble-escribe ambas columnas en cada INSERT/UPDATE. PK de articulos sigue siendo `codigo`. NO toca trigger, NO toca payload de webhooks. **Nota crítica:** en Deploy 1 el overwrite `sku := stripSep(codigo)` aún NO está aplicado; el research debe definir si Deploy 1 también ejecuta el overwrite (más seguro y desacopla del PK swap) o si el overwrite va en Deploy 2 junto al swap.
  - **Deploy 2 (switch):** 7-step ordered transaction (P-01) que ejecuta: overwrite `articulos.sku := stripSep(codigo)`, ADD PRIMARY KEY (sku), DROP NOT NULL codigo, CREATE INDEX no único en codigo, re-add FKs hijas apuntando a `articulos.sku`, DISABLE TRIGGER + CREATE OR REPLACE FUNCTION + recompute manual + ENABLE TRIGGER, rekey API a `/api/articulos/:sku` + frontend a `/articulos/[sku]/editar`, payload v2 (sku agregado al objeto articulo).
  - **Deploy 3 (contract):** DROP COLUMN `articulo_codigo` en las 5 hijas. El backend ya no doble-escribe. Cleanup final.
- **D-06: Backend doble-escribe en código aplicación durante coexistencia (Deploy 1 → Deploy 2).** Cada ruta backend que escribe en `order_items / sale_items / purchase_items / existencias / inventarios_articulos` setea `articulo_codigo Y articulo_sku` coincidentes. La derivación `sku` desde `articulo` se centraliza en un helper en el servicio de articulos para evitar drift entre rutas. NO se usa trigger PG `BEFORE INSERT/UPDATE` para sincronizar (no se quiere agregar otro trigger de mantenimiento que después haya que limpiar en Deploy 3).
- **D-07: Gate entre deploys: integridad referencial + 24-48h de soak.** Antes de pasar de D1 a D2 (y de D2 a D3) las 5 queries del ROADMAP SC#5 (`SELECT count(*) FROM <hija> LEFT JOIN articulos a ON <hija>.articulo_sku=a.sku WHERE a.sku IS NULL`) deben retornar 0. Plus 24-48h de tráfico real en producción para detectar regresiones del backend doble-escribe (rutas olvidadas, seeds, sync ERP). El planner define el calendario exacto.
- **D-08: Rekey total de API + frontend a `:sku` en Deploy 2.** `/api/articulos/:codigo` se reescribe como `/api/articulos/:sku` (GET/PATCH/DELETE keyean por sku). El backend agrega `GET /api/articulos/by-codigo/:codigo` que retorna **N filas** (todas las hermanas del modelo). El frontend reescribe `apps/web/src/app/(dashboard)/articulos/[codigo]/...` a `[sku]/...` en el mismo deploy. **NO se mantiene alias temporal de compat** — las URLs viejas mueren con Deploy 2; bookmarks externos rompen. En Phase 31 todavía no hay variantes en data, así que `findByCodigo` retorna típicamente 1 fila; Phase 32 cubre el caso N.

### Webhook payload v2 (P-19)

- **D-09: Payload v2 = mismo envelope + campo `sku` agregado al objeto articulo.** Forma final: `{ event: 'articulo.created' | 'articulo.updated' | 'articulo.deleted', articulo: { sku, codigo, nombre, ... } }`. **No** hay campo `version` explícito en el body. **No** hay header `X-Webhook-Version`. Suscriptores que solo leían campos individuales (codigo, nombre, etc.) siguen funcionando sin cambios; quien quiera tratar `sku` como identificador canónico tiene el campo disponible.
- **D-10: Notice doc-only en `/settings/webhooks`.** Una nota visible en el tab Webhooks del admin: "Desde v1.3 el payload de articulo.\* incluye campo `sku` además de `codigo`. `sku` es el identificador único; `codigo` ahora puede agruparse cuando hay variantes." Sin delivery automática de notice. Sin email manual. La nota es del backend → frontend del admin, no atraviesa webhooks.
- **D-11: El payload v2 sale junto al PK swap en Deploy 2 (switch).** Antes de Deploy 2 los webhooks siguen mandando el shape v1 (sin campo sku). En Deploy 2, el listener de webhooks ya emite el shape v2. Más limpio conceptualmente: "el campo sku oficial" aparece junto a "sku es PK".
- **D-12: Pagos existentes en `webhook_deliveries` (retries pendientes) NO se modifican.** Si hay un delivery pendiente de retry creado pre-Deploy-2, se entrega con el payload almacenado en `webhook_deliveries.payload` (shape v1). Nada se backfillea retroactivamente en la tabla. La nueva forma aplica solo a deliveries creados desde Deploy 2 en adelante.

### Trigger `trg_update_articulo_unidades` (P-02)

- **D-13: DISABLE TRIGGER + recompute manual + ENABLE dentro de la transacción de Deploy 2 (patrón P-02 capa 1).** Pasos exactos dentro del BEGIN..COMMIT del 7-step (P-01):
  1. `ALTER TABLE existencias DISABLE TRIGGER trg_update_articulo_unidades;`
  2. Rename / populate `existencias.articulo_sku` desde `articulo_codigo` (o equivalente según research).
  3. `CREATE OR REPLACE FUNCTION update_articulo_unidades()` con cuerpo nuevo que usa `NEW.articulo_sku`/`OLD.articulo_sku` y `WHERE sku = target_sku` (en lugar de articulo_codigo y codigo).
  4. `UPDATE articulos a SET unidades = COALESCE((SELECT SUM(e.cantidad) FROM existencias e WHERE e.articulo_sku = a.sku), 0);` (recompute manual O(n) una sola vez).
  5. `ALTER TABLE existencias ENABLE TRIGGER trg_update_articulo_unidades;`
- **D-14: Mismo nombre de trigger y mismo nombre de función.** No se versiona con sufijo `_v2`. `CREATE OR REPLACE FUNCTION update_articulo_unidades()` mantiene el nombre original — el cuerpo cambia para usar sku y articulos.sku. El trigger `trg_update_articulo_unidades` queda apuntando a la misma función ya reemplazada. Tras `ENABLE`, las escrituras post-cutover funcionan inmediatamente.
- **D-15: WHEN clause del trigger se mantiene en `AFTER INSERT OR UPDATE OF cantidad OR DELETE`.** No se agrega `UPDATE OF articulo_sku` al WHEN. Razón: Phase 31 no introduce UPDATE de `articulo_sku` en existencias (cada existencia queda con su sku asignado al INSERT). Phase 33 (cascade engine) es la que va a hacer UPDATE masivo de `articulo_sku` y va a manejar el WHEN clause + guard `pg_trigger_depth()` defensivo en su propia migration.
- **D-16: Sin guard `pg_trigger_depth() > 1` ni session GUC `gsd.skip_unidades_trigger`.** El patrón P-02 capa 1 (DISABLE/ENABLE) es suficiente para Phase 31. Las capas 2 y 3 quedan diferidas a Phase 33 si ahí se necesitan para el cascade engine.

### Fórmula codigo → sku (cierre 2026-05-18, sobreescribe Phase 29 D-12)

- **D-17: La transformación canónica `codigoToSku` reemplaza `stripSep` en todo el sistema.** Razón: el preflight audit de Plan 31-01 detectó 200 grupos de colisión (402 artículos sobre 101.021) bajo la fórmula original `regex_replace(codigo, '[-_.\s]+', '', 'g')`. Aplicar el overwrite ciego D-02 con `stripSep` haría imposible `ADD PRIMARY KEY (sku)` en Plan 31-03 (Postgres tiraría duplicate key error). La fórmula nueva produce 0 colisiones sobre la misma base.

  **Definición:**

  ```ts
  // packages/utils/src/composer.ts
  export function codigoToSku(codigo: string): string {
    return codigo.replace(/-/g, '_').replace(/\s+/g, '~')
  }
  ```

  **Equivalente SQL:**

  ```sql
  regexp_replace(regexp_replace(codigo, '-', '_', 'g'), '[[:space:]]+', '~', 'g')
  ```

  **Reglas:**
  - `-` (guion medio) → `_` (underscore). Razón: deja el `-` libre para usarse como separador de partes en variantes (D-13 Phase 29 sigue válido: `sku = codigoToSku(codigo) + '-' + abrev1 + ...`).
  - whitespace (espacio, tab) colapsado → `~` (tilde, RFC 3986 unreserved, URL-safe).
  - `.`, `/`, `(`, `)`, `+`, `,`, `=`, `'` y alfanuméricos → sin cambio.
  - `_` y `~` no aparecen en ninguno de los 101.021 códigos actuales (verificado pre-cutover) → transformación bijectiva sobre la base existente.

  **Implicaciones cross-phase:**
  - Phase 29 D-12 (`stripSep`) queda deprecated. La función se mantiene exportada en `@objetiva/utils` para no romper imports antiguos pero su uso de runtime se migra a `codigoToSku`.
  - Phase 30 D-15/D-16 (`composeSku`) usa internamente `codigoToSku` en lugar de `stripSep` desde el commit que aplica D-17. La regla "sin variantes → sku = base; con variantes → sku = base + '-' + partes" sigue siendo válida; `base` ahora es `codigoToSku(codigo)`.
  - Plan 31-02 ejecuta el overwrite con la nueva regex SQL. Plan 31-02 también renombra el helper backend para que la fuente única de verdad sea `codigoToSku`.
  - El test suite `composer.test.ts` se extiende con casos para `codigoToSku` y los assertions de `composeSku` se actualizan al nuevo output.

### Claude's Discretion

- **Naming exacto del script de auditoría preflight** (path, lenguaje TypeScript/SQL/bash, integración con el plan de Drizzle migration o un node-pg-migrate aparte). Research/planner deciden.
- **Calendario concreto del 24-48h soak** entre deploys (qué horario, qué métricas monitorear durante la ventana, criterios de abort). Research/planner proponen, usuario aprueba antes del cutover real.
- **Path exacto y formato del `pg_dump` full** (gzip vs sin compresión, dump completo vs solo schema+data de las 6 tablas — el usuario eligió "completo" pero el planner puede ajustar si el dump completo es prohibitivamente grande).
- **Decisión exacta de si el overwrite `articulos.sku := stripSep(codigo)` ocurre en Deploy 1 (más seguro, desacopla del PK swap) o en Deploy 2 (mantiene Deploy 1 minimal).** Research evalúa trade-off; planner propone; usuario confirma antes de implementar.
- **Forma exacta del 7-step ordered transaction (P-01)** — research va a producir el SQL exacto siguiendo el patrón de PITFALLS.md líneas 28-67 (con CHECK DO blocks intercalados). Planner traduce a Drizzle migration `.sql` custom (no `db:generate` auto).
- **Naming exacto de la nueva ruta backend `findByCodigo` y su contrato JSON** (paginación, ordenamiento por sku, response shape). Research/planner deciden.
- **Forma exacta del texto del notice en `/settings/webhooks`** (un Alert, un Banner, un párrafo en la sección de eventos). Frontend planner decide.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these antes de planificar o implementar.**

### Roadmap & Requirements

- `.planning/ROADMAP.md` §"Phase 31: PK Swap codigo→sku + FK rename en comprobantes" (líneas 137-155) — goal, success criteria 1-5, Pitfalls P-01/P-02/P-05/P-19, Open Qs Q5/Q9.
- `.planning/REQUIREMENTS.md` §VAR-10 — único requisito activo mapeado a Phase 31.
- `.planning/PROJECT.md` §"Current Milestone: v1.3" y §"Key Decisions" — overview del milestone + decisiones cerradas sobre SKU/variantes.

### Decisiones cerradas previas que aplican a Phase 31

- `.planning/phases/29-catalogos-de-atributos/29-CONTEXT.md` — especialmente:
  - **D-11** (separator SKU = `-`)
  - **D-12** (`stripSep(codigo)` función pura para armar SKU)
  - **D-13** (reabre decisión #4 del design-notes: sin variantes `sku = stripSep(codigo)`, con variantes `sku = stripSep(codigo) + '-' + abrev1 + …`)
  - **D-14** (composer NO necesita slugificar valores con catálogo)
- `.planning/phases/30-templates-composici-n-sku-nombre/30-CONTEXT.md` — especialmente:
  - **D-15** (template default tiene receta SKU vacía → `sku = stripSep(codigo)` para autopartes)
  - **D-16** (`composeSku(codigo, atributos, template)` función pura ya entregada en `@objetiva/utils`)
- `.planning/research/v1.3-design-notes.md` §"Decisiones cerradas" (#1-9 + #19-20) — modelo single-table flat, sku como identificador universal, codigo NOT UNIQUE agrupador, codigo_barras separado del SKU, preview+cascade+history (Phase 33 no Phase 31).

### Pitfalls asignados explícitamente a Phase 31

- `.planning/research/PITFALLS.md` §P-01 (líneas 9-67) — **CRÍTICO**: 7-step ordered transaction con `LOCK ACCESS EXCLUSIVE` para PK swap. **El SQL ejemplo de las líneas 28-67 es la receta canónica** que research/planner debe seguir literalmente (adaptando nombres de columnas).
- `.planning/research/PITFALLS.md` §P-02 (líneas 69-115) — DISABLE TRIGGER + recompute manual + ENABLE; el bloque SQL de las líneas 78-86 es el patrón a implementar.
- `.planning/research/PITFALLS.md` §P-05 (líneas 156-186) — script de auditoría preflight con counts (null/eq_codigo/diff_codigo/dupes).
- `.planning/research/PITFALLS.md` §P-19 (líneas 439-449) — bump de payload + notice a suscriptores.

### Estado actual de la DB y schema TS

- `apps/backend/src/db/schema.ts:179-259` — tabla `articulos` actual: `codigo` PK, `sku text` nullable con index no-único (línea 187, 253), `codigoBarras text` (188), `unidades integer default 0` (215), `templateId` FK a `articulosTemplates` (212) — agregado en Phase 30.
- `apps/backend/src/db/schema.ts:50-60, 96-106, 144-154` — `orderItems`, `saleItems`, `purchaseItems` con `articuloCodigo` text FK a `articulos.codigo`.
- `apps/backend/src/db/schema.ts:279-300` — `existencias` con `articuloCodigo` text FK + PK compuesta `(articulo_codigo, deposito_id)`.
- `apps/backend/src/db/schema.ts:361-386` — `inventariosArticulos` con `articuloCodigo` text FK + `inv_articulos_articulo_codigo_idx` + `inv_articulos_unique_idx(inventario_id, articulo_codigo)`.
- `apps/backend/src/db/schema.ts:407-452` — tabla `webhooks` y `webhookDeliveries`. `webhookDeliveries.payload jsonb` almacena el shape entregado (referenciado por D-12).
- `apps/backend/src/db/migrate-unidades.sql` — script original del trigger `trg_update_articulo_unidades` (función `update_articulo_unidades()`, AFTER INSERT/UPDATE/DELETE en existencias). Líneas 50-70 es el cuerpo de la función que Phase 31 reescribe.
- `apps/backend/drizzle/` — migrations actuales 0000-0008 (Phase 30 dejó 0008). Phase 31 inicia con 0009 (Deploy 1 expand), 0010 (Deploy 2 switch), 0011 (Deploy 3 contract). Naming sugerido: `0009_phase31_expand.sql`, `0010_phase31_switch.sql`, `0011_phase31_contract.sql` — planner decide.
- `apps/backend/src/modules/articulos/articulos.service.ts:105` — emisión de `WEBHOOK_EVENTS.ARTICULO_CREATED` (idem patches/deletes). Es el sitio que cambia en Deploy 2 para incluir `sku` en el `{ articulo }` despachado.
- `apps/backend/src/modules/webhooks/webhooks.service.ts:155-215` — `dispatchEvent` y `testPing`. Test ping NO cambia (su payload es propio: `{ evento: 'ping', timestamp, webhook_id, test: true }`).
- `apps/backend/src/modules/webhooks/webhooks.listener.ts:11-22` — listeners que reciben `{ articulo: unknown }` y disparan `dispatchEvent`. Aquí se enriquece el `articulo` con `sku` antes de dispatch (o se hace upstream en articulos.service donde se emite el evento).
- `apps/backend/src/modules/webhooks/webhook-events.ts` — definición de event names (`articulo.created`, etc.).

### Frontend afectado por el rekey de Deploy 2 (D-08)

- `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` → renombrar a `[sku]/editar/page.tsx`.
- `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` — listados que arman links `/articulos/{codigo}/...`.
- `apps/web/src/components/articulos/articulo-sheet.tsx`, `imagen-slot.tsx`, `imagen-slot-grid.tsx` — referencian articulo.codigo en URLs.
- `apps/web/src/lib/api.client.ts` — funciones que llaman a `/api/articulos/{codigo}` deben rekey a `{sku}`.
- `apps/web/src/types/{order,sale,purchase,existencia,inventario,dashboard}.ts` — types con `articuloCodigo` que se renombran a `articuloSku` (o se agrega `articuloSku` y luego se quita en Deploy 3).

### Quick tasks históricas relevantes

- `.planning/quick/260429-rec-recuperar-datos-inventarios-existencias/` — instaló el trigger `trg_update_articulo_unidades` (relevancia directa a D-13/D-14).
- `.planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/` — incidente del wipe 30-abr/1-may por `db:push --force`. Motiva D-04 (pg_dump full safety net). Ver también `feedback_db_push_force_prod.md` y `feedback_schema_drift_silencioso.md` en memoria global.
- `.planning/quick/260428-mig-aplicar-migration-prod-pendiente/` — patrón de migration con `--single-transaction --set ON_ERROR_STOP=1`. Phase 31 hereda este flujo.
- `.planning/phases/38-reconciliar-drift-sistemico-de-db-de-produccion/38-ABORTED.md` — contexto del drift histórico TS↔DB. Phase 37 (no esta) cubre el cleanup; si Phase 31 cruza con drift conocido, el planner decide.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **`stripSep(codigo)`** (Phase 29 D-12): función pura que reemplaza `[-_.\s]+` por `''`. Vive en `@objetiva/utils` (confirmar path exacto durante research). Phase 31 la consume para el overwrite del backfill `articulos.sku := stripSep(codigo)` y como helper compartido entre backend y plantilla/composer.
- **`composeSku(codigo, atributos, template)`** y **`composeNombre()`** (Phase 30 D-16/D-17): funciones puras en `@objetiva/utils` con tests Vitest. Phase 31 NO las consume directamente para el cutover (que es un overwrite simple), pero las usa Phase 32 cuando arme variantes.
- **`trg_update_articulo_unidades`** (quick `260429-rec`): trigger AFTER INSERT/UPDATE/DELETE en `existencias`. Phase 31 reescribe la función vía `CREATE OR REPLACE` manteniendo nombre.
- **Patrón de migration custom SQL en Drizzle**: `apps/backend/drizzle/0007_drop_sector_id_huerfana.sql` y `0008_phase30_templates.sql` son ejemplos de migrations custom con SQL escrito a mano (no `db:generate` auto). Phase 31 sigue este patrón porque `db:generate` no maneja PK swap + LOCK + recompute con seguridad.
- **`webhooks.service.ts dispatchEvent`** y **`articulos.service.ts emit(WEBHOOK_EVENTS.ARTICULO_*)`**: son los 2 puntos donde el payload muta. El enriquecimiento de `articulo` con `sku` se puede hacer en el upstream (articulos.service) o en el listener (webhooks.listener.ts) — planner decide.
- **`CompositeAuthGuard`** (apps/backend): protege endpoints write con JWT o API key. Las nuevas rutas `findByCodigo` heredan el mismo guard sin cambios.

### Established Patterns

- **Migration con `--single-transaction --set ON_ERROR_STOP=1`** + backup safety net previo (operativo 2026-05-15). Phase 31 lo aplica a las 3 migrations (Deploy 1/2/3).
- **`_journal.json` + `__drizzle_migrations`** sincronizados — 9 entries actualmente (0000-0008). Phase 31 agrega 3 (0009/0010/0011) con journal sync atómico.
- **`PARTITION BY RANGE` y append-only history**: Phase 33 (cascade engine) introduce `articulo_sku_history`. Phase 31 NO la crea — la mecánica de history es Phase 33.
- **Soft-delete vía `activo` boolean**: irrelevant para Phase 31 (cutover no activa/desactiva nada).
- **Tabler aesthetic + shadcn-tabler-mcp**: si el frontend rekey toca componentes, mantener consistencia (el ArticuloSheet, links de listados).

### Integration Points

- **`articulos` table** (apps/backend/src/db/schema.ts:179): el primary key change (`codigo` → `sku`) afecta a TODA query que asume `WHERE codigo = ?` como búsqueda por PK. Buscar `eq(articulos.codigo, ...)` en backend; reemplazar por `eq(articulos.sku, ...)` donde aplica. Centralizar el helper de derivación sku desde codigo en el servicio articulos.
- **5 tablas hijas** (existencias, inventariosArticulos, orderItems, saleItems, purchaseItems): cambio coordinado de FK + columna + PK compuesta donde aplique (existencias tiene `primaryKey({ columns: [articuloCodigo, depositoId] })` — el swap requiere DROP + ADD compuesta nueva con articulo_sku).
- **Backend API**: `apps/backend/src/modules/articulos/articulos.controller.ts` (asumido path) define las rutas `:codigo`. Rekey a `:sku` + nueva ruta `by-codigo/:codigo`.
- **Frontend rutas dinámicas**: `apps/web/src/app/(dashboard)/articulos/[codigo]/...` renombre + actualización de todos los links que arman URLs.
- **Schema TS sincronizado en el mismo commit que la migration** (lección `feedback_schema_drift_silencioso.md` global): cada Deploy debe commitear `schema.ts` actualizado + migration `.sql` + journal en un mismo cambio atómico para evitar drizzle queries con 500.
- **Webhook event emission** (articulos.service.ts:105): agregar `sku` al `{ articulo }` antes del emit en Deploy 2.

</code_context>

<specifics>
## Specific Ideas

- **El usuario explícitamente eligió el patrón más conservador para cada decisión clave** (3 deploys, gate de 24-48h, pg_dump full). Es la fase de mayor riesgo del milestone — research/planner debe respetar el sesgo defensivo.
- **Backend doble-escribe debe centralizarse en un helper compartido** dentro del servicio de articulos para evitar drift entre rutas (lección histórica: una sola ruta backend olvidando escribir un campo causa data inconsistency silenciosa). El planner define el helper exacto.
- **El nombre `update_articulo_unidades` y `trg_update_articulo_unidades` no se versiona**. Mismo identifier antes y después del cutover. Esto se alinea con el patrón Drizzle `CREATE OR REPLACE FUNCTION` y simplifica el cleanup.
- **El rekey de frontend a `:sku` no mantiene alias de compat para URLs viejas.** Bookmarks externos rompen tras Deploy 2. El usuario aceptó este trade-off de simplicidad.
- **El payload v2 del webhook es deliberadamente conservador**: solo agrega `sku`, no introduce campo `version` ni cambia envelope. Maximum compat con suscriptores existentes que solo leían campos individuales.
- **`articulo_sku_history` NO se crea en Phase 31.** Es scope estricto de Phase 33 (cascade engine). Phase 31 entrega un sku PK estable; los cambios masivos de sku futuros son problema de Phase 33.

</specifics>

<deferred>
## Deferred Ideas

- **`codigo_barras UNIQUE WHERE codigo_barras IS NOT NULL`** → Phase 32 (Variantes UI). Es prerequisito de variantes, no del PK swap. Si el preflight de Phase 31 detectara dupes accidentalmente (no se busca, pero podría aparecer en checks colaterales), reportar y derivar a Phase 32.
- **Guard `pg_trigger_depth() > 1` en `update_articulo_unidades()`** → Phase 33 (cascade engine). Phase 31 no lo necesita porque no hace UPDATE masivo de `articulo_sku` post-cutover (cada existencia queda con su sku asignado al INSERT).
- **Session GUC `gsd.skip_unidades_trigger` y `pg_advisory_xact_lock` por `codigo`** → Phase 33. Capa 3 de defensa para cascade engine.
- **Cascade engine para cambios de receta de template** (con preview + history append-only + idempotencia + undo last batch) → Phase 33 (Cascade Engine + Audit History).
- **WHEN clause del trigger ampliado a `UPDATE OF articulo_sku`** → Phase 33. Phase 31 mantiene el WHEN actual (`UPDATE OF cantidad`).
- **Drift TS↔DB en nombres de índices, `numeric(10,2)` vs `numeric`, `timestamp(6)` vs `timestamp`** → Phase 37 (Tech Debt). Si la migration de Phase 31 toca alguno de esos en passing, planner decide si arregla o lo deja explícito en Phase 37.
- **Alias temporal `/api/articulos/:codigo` (compat URLs viejas)** → descartado en D-08 (rekey total sin alias). Si suscriptores externos lo requieren post-Deploy 2, decidir como hotfix; no entra a Phase 31.
- **Notice automático a suscriptores existentes (delivery o email)** → descartado en D-10 (solo nota en `/settings/webhooks`). Si emerge un suscriptor crítico que rompe, decidir manualmente.
- **Sentinel `ubicacion=0` y migración histórica de existencias desde `sanchez`** → Phase 36.
- **Calendario concreto del cutover** (cuándo se hace cada deploy en horario real) → research/planner propone; usuario aprueba antes del cutover real.
- **Email manual a owners de webhooks pre-cutover** — descartado en D-10. Si después aparece la necesidad, se hace fuera del scope de Phase 31.

### Reviewed Todos (not folded)

- (No hubo todos pendientes matched para Phase 31 — `gsd-sdk query todo.match-phase 31` devolvió 0 matches.)

</deferred>

---

_Phase: 31-PK Swap codigo→sku + FK rename en comprobantes_
_Context gathered: 2026-05-18_
