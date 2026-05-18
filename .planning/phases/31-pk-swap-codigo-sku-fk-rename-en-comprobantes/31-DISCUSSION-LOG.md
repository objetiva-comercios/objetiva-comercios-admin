# Phase 31: PK Swap codigo→sku + FK rename en comprobantes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 31-PK Swap codigo→sku + FK rename en comprobantes
**Areas discussed:** Preflight de articulos.sku, Cutover en single deploy vs multi-deploy, Webhook payload v2 — shape + notice, Trigger trg_update_articulo_unidades

---

## Preflight de articulos.sku (Q5 + P-05)

### Decisión 1: Política si la auditoría encuentra valores legacy

| Option                                    | Description                                                                                  | Selected |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| Overwrite ciego (sku := stripSep(codigo)) | Asume que cualquier dato preexistente en articulos.sku es ruido. Reversible solo con backup. | ✓        |
| Abort + triage manual con el usuario      | Script de auditoría con counts; si diff>0 o dupes>0, frena y espera decisión explícita.      |          |
| Rename a sku_legacy + start clean         | Renombra la columna existente; agrega sku NEW desde cero. Cero pérdida pero suma drift.      |          |

**User's choice:** Overwrite ciego (sku := stripSep(codigo) para todos).
**Notes:** El usuario asume que articulos.sku no tiene valor de negocio en prod. La auditoría informativa del D-01 deja papel.

### Decisión 2: ¿Correr auditoría preflight?

| Option                                      | Description                                                                                                                                       | Selected |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Sí, auditoría informativa pero non-blocking | Script ejecuta counts (null/eq_codigo/diff_codigo/dupes) y guarda output en 31-PREFLIGHT-AUDIT.md; sigue con overwrite incluso si encuentra diff. | ✓        |
| Sí, y bumpear codigo_barras también         | Auditoría informativa + auditar codigo_barras dupes en el mismo script.                                                                           |          |
| No, saltamos directo al overwrite           | Cero auditoría. UPDATE corre sin checks previos.                                                                                                  |          |

**User's choice:** Sí, auditoría informativa pero non-blocking.

### Decisión 3: ¿UNIQUE WHERE NOT NULL en codigo_barras entra a Phase 31?

| Option                                                | Description                                                                                       | Selected |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| Phase 32 (Variantes UI), no entra ahora               | Phase 31 solo hace PK swap. UNIQUE de codigo_barras es prerequisito de variantes.                 | ✓        |
| Phase 31 (incluir UNIQUE partial en este cutover)     | Aprovecha el LOCK ya en curso. Riesgo: dupes en prod → migration falla → aborta cutover entero.   |          |
| Solo auditar dupes en preflight (no crear constraint) | Reportar dupes en el preflight sin crear el constraint. Decisión + creación quedan para Phase 32. |          |

**User's choice:** Phase 32 (Variantes UI), no entra ahora.

### Decisión 4: Backup pre-cutover

| Option                                             | Description                                                                                | Selected |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| pg_dump full automatizado en el plan               | Backup completo de la DB con timestamp antes de correr la migration. Rollback = restore.   | ✓        |
| pg_dump selectivo de las 6 tablas tocadas          | Solo articulos + 5 hijas, --data-only. Más rápido, footprint chico, no cubre schema-level. |          |
| Snapshot del provider + backup selectivo defensivo | Patrón operativo 2026-05-15. Doble red de seguridad.                                       |          |

**User's choice:** Backup completo de la DB (pg_dump full) automatizado en el plan.
**Notes:** Incidente del 30-abr/1-may con db:push --force motiva la elección defensiva.

---

## Cutover en single deploy vs multi-deploy (Q5 + ROADMAP SC#2)

### Decisión 5: Orquestación entre migration + backend + drop final

| Option                                                                     | Description                                                                                                                  | Selected |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- |
| 2 deploys: migration+backend+frontend juntos, drop articulo_codigo después | Patrón expand-contract clásico. Deploy 1 todo junto, Deploy 2 cleanup.                                                       |          |
| 3 deploys: expand, switch, contract                                        | Más seguro, más lento. Deploy 1: add columnas + doble-escribe. Deploy 2: swap PK + frontend. Deploy 3: drop columnas viejas. | ✓        |
| Single deploy: migration + backend + frontend + drop todo junto            | Más simple, sin coexistencia temporal. Rollback requiere restore desde pg_dump si algo falla.                                |          |

**User's choice:** 3 deploys: expand, switch, contract.
**Notes:** Conservador máximo. Es la fase de mayor riesgo del milestone.

### Decisión 6: Sincronización entre articulo_codigo y articulo_sku durante coexistencia

| Option                                                             | Description                                                                                                              | Selected |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| Backend doble-escribe en código aplicación                         | Cada INSERT/UPDATE escribe ambas columnas coincidentes. Control explícito, fácil auditar. Riesgo: ruta olvidada → drift. | ✓        |
| Trigger PG BEFORE INSERT/UPDATE en hijas                           | Trigger sincroniza articulo_sku desde articulo_codigo automáticamente. Cero drift; un trigger más a mantener.            |          |
| Backend reescribe a articulo_sku, articulo_codigo freeze read-only | Post-backfill, articulo_codigo no se vuelve a escribir. Rollback a articulo_codigo entre deploys imposible.              |          |

**User's choice:** Backend doble-escribe en código aplicación.
**Notes:** Centralizar el helper de derivación sku desde codigo en el servicio de articulos.

### Decisión 7: Gate de validación entre deploys

| Option                                           | Description                                                            | Selected |
| ------------------------------------------------ | ---------------------------------------------------------------------- | -------- |
| Query de integridad referencial + 24-48h de soak | Queries del SC#5 + soak para detectar regresiones reales bajo tráfico. | ✓        |
| Query de integridad + smoke manual en admin      | Mismas queries + humano clickea admin. Sin soak time obligatorio.      |          |
| Solo query de integridad, sin gate temporal      | Las queries pasan → next deploy. Cero tiempo de espera.                |          |

**User's choice:** Query de integridad referencial + 24-48h de soak.

### Decisión 8: Split de findOne/findByCodigo y rekey de API

| Option                                                                | Description                                                                                               | Selected |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| Rekey total: /api/articulos/:sku + frontend a /articulos/[sku]/editar | La nueva PK manda. Rompe URLs viejas sin redirect. Agrega GET /api/articulos/by-codigo/:codigo (N filas). | ✓        |
| Rekey + alias temporal de compat                                      | Igual al anterior, pero backend mantiene /api/articulos/:codigo por 1-2 deploys con WARN.                 |          |
| Mantener :codigo como path param                                      | /api/articulos/:codigo sigue. Cuando hay N hermanas retorna error o lista. Phase 32 refactoriza.          |          |

**User's choice:** Rekey total a `:sku`.
**Notes:** Sin alias de compat. Bookmarks externos rompen en Deploy 2.

---

## Webhook payload v2 — shape + notice (P-19)

### Decisión 9: Shape exacto del payload v2

| Option                                                                                | Description                                                                                                                      | Selected |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Envelope versionado: { event, version: 2, occurred_at, articulo: { sku, codigo, … } } | Campo version explícito + header X-Webhook-Version: 2. Suscriptores rompen ruidosamente y migran sabiendo qué cambió.            |          |
| Mismo envelope, solo agrega sku al objeto articulo                                    | { event, articulo: { sku, codigo, … } }. Sin version field. Suscriptores actuales siguen funcionando si leen campos específicos. | ✓        |
| Body como ahora + headers nuevos (X-Articulo-Sku, X-Articulo-Codigo)                  | Máxima compat del body. Toda info nueva via headers.                                                                             |          |

**User's choice:** Mismo envelope, solo agrega sku al objeto articulo.

### Decisión 10: Notice a suscriptores existentes

| Option                                             | Description                                                                                                              | Selected |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| Solo nota en /settings/webhooks (doc-only)         | Una nota visible en admin: "Desde v1.3 el payload de articulo.\* incluye sku además de codigo". Sin delivery automática. | ✓        |
| Delivery automática de notice + nota en /settings  | Dispatch de articulo.notice especial pre-cutover a webhooks activos.                                                     |          |
| Email/contacto manual al owner + nota en /settings | Comunicación humana directa al duenio de cada webhook.                                                                   |          |

**User's choice:** Solo nota en /settings/webhooks (doc-only).

### Decisión 11: Timing del payload v2 dentro de los 3 deploys

| Option                                                             | Description                                                                         | Selected |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| Deploy 1 (expand) — desde el momento que el backend conoce sku     | Webhooks empiezan a mandar sku enseguida (derivado en runtime, sku=codigo todavía). |          |
| Deploy 2 (switch) — cuando sku es PK                               | Payload v2 sale junto al PK swap. Antes, shape v1. Más limpio conceptualmente.      | ✓        |
| Inmediatamente, en un PR separado dentro de Phase 31 (pre-cutover) | Suscriptores pueden migrar mientras se prepara el resto. Deploy adicional.          |          |

**User's choice:** Deploy 2 (switch) — cuando sku es PK.

---

## Trigger trg_update_articulo_unidades (P-02)

### Decisión 12: ¿Qué hacemos con el trigger durante el UPDATE masivo?

| Option                                                           | Description                                                        | Selected |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| DISABLE TRIGGER + recompute manual + ENABLE (recomendado P-02)   | Dentro de la transacción de Deploy 2. Recompute O(n) una sola vez. | ✓        |
| Recrear trigger nuevo y dropear el viejo en la misma transacción | Más SQL pero deja el trigger explícitamente reapuntado.            |          |
| DISABLE + recompute + drop viejo + create nuevo + ENABLE         | Combo defensivo, más pasos.                                        |          |

**User's choice:** DISABLE TRIGGER + recompute manual + ENABLE (capa 1 de P-02).

### Decisión 13: Cómo reescribir la función del trigger

| Option                                                               | Description                                                                                              | Selected |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| CREATE OR REPLACE FUNCTION dentro de la misma transacción            | DISABLE → rename → CREATE OR REPLACE FUNCTION (cuerpo nuevo con sku) → recompute → ENABLE. Mismo nombre. | ✓        |
| Crear función y trigger nuevos con sufijo \_v2 (drop viejos después) | Nombre versionado evita confusión histórica; más SQL para escribir.                                      |          |
| Reusar nombre + agregar guard pg_trigger_depth() defensivo           | CREATE OR REPLACE + 'IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;'. Cubre cascade engine futuro.   |          |

**User's choice:** CREATE OR REPLACE FUNCTION dentro de la misma transacción.
**Notes:** Sin guard `pg_trigger_depth()`. Phase 33 (cascade engine) lo agrega si hace falta.

---

## Claude's Discretion

- Naming exacto del script de auditoría preflight (path, lenguaje TypeScript/SQL/bash).
- Calendario concreto del 24-48h soak entre deploys (qué horario, métricas, criterios de abort).
- Path exacto y formato del pg_dump full (gzip vs no, full vs schema+data de las 6 tablas).
- Si el overwrite `articulos.sku := stripSep(codigo)` ocurre en Deploy 1 (más seguro) o en Deploy 2 (mantiene Deploy 1 minimal) — research evalúa, planner propone, usuario confirma.
- Forma exacta del 7-step ordered transaction (P-01) en SQL siguiendo PITFALLS.md líneas 28-67.
- Naming exacto de la nueva ruta backend findByCodigo y su contrato JSON (paginación, ordenamiento, response shape).
- Forma exacta del texto del notice en /settings/webhooks (Alert, Banner, párrafo en la sección de eventos).

## Deferred Ideas

- codigo_barras UNIQUE WHERE NOT NULL → Phase 32.
- Guard `pg_trigger_depth() > 1` en `update_articulo_unidades()` → Phase 33.
- Session GUC `gsd.skip_unidades_trigger` y `pg_advisory_xact_lock` por codigo → Phase 33.
- Cascade engine para cambios de receta de template (preview + history + idempotencia + undo) → Phase 33.
- WHEN clause del trigger ampliado a UPDATE OF articulo_sku → Phase 33.
- Drift TS↔DB (índices, numeric, timestamp) → Phase 37.
- Alias temporal /api/articulos/:codigo (compat URLs viejas) → descartado en D-08.
- Notice automático a suscriptores existentes (delivery o email) → descartado en D-10.
- Sentinel ubicacion=0 + migración histórica de existencias → Phase 36.
- Calendario concreto del cutover → research/planner propone.
- Email manual a owners de webhooks pre-cutover → descartado en D-10.
