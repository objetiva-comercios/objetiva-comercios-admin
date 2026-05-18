---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Variantes y Modelo de Stock
status: executing
stopped_at: Phase 31 context gathered
last_updated: '2026-05-18T19:27:16.756Z'
last_activity: 2026-05-18 -- Phase 31 planning complete
progress:
  total_phases: 10
  completed_phases: 2
  total_plans: 20
  completed_plans: 11
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one
**Current focus:** Phase 31 — PK swap codigo→sku + FK rename comprobantes (siguiente a planificar)

## Current Position

Phase: 31
Plan: Not started
Status: Ready to execute
Last activity: 2026-05-18 -- Phase 31 planning complete

## Performance Metrics

**Velocity:**

- Total plans completed: 82 (v1.0: 42, v1.1: 18, v1.2: 18)
- Total execution time: ~19 hours

**By Milestone:**

| Milestone              | Phases | Plans   | Shipped    |
| ---------------------- | ------ | ------- | ---------- |
| v1.0                   | 13     | 42      | 2026-03-04 |
| v1.1                   | 5      | 18      | 2026-03-10 |
| v1.2                   | 10     | 18      | 2026-03-13 |
| v1.3                   | 9      | TBD     | (planning) |
| Phase 30 P01           | 6min   | 4 tasks | 8 files    |
| Phase 30 P02           | 7min   | 3 tasks | 3 files    |
| Phase 30 P03           | 8min   | 3 tasks | 10 files   |
| Phase Phase 30 P04 P04 | ~50min | 4 tasks | 10 files   |

## Accumulated Context

### Decisions

Archived to PROJECT.md Key Decisions table. No active decisions pending.

Cerradas en discuss-phase 29 (CONTEXT.md): Q1 (set de 6 tablas prop\_\*), Q2 (FK por id + cache via trigger), Q11 (UI tabs + componente genérico + SC#5 diferido a 32). Adicionalmente: revisión decisión cerrada #4 (sku=stripSep(codigo)).

Pendiente cerrar via /gsd-discuss-phase posteriores: Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10 — distribuidas según ROADMAP.md (Phase 30/31/33/36/37).

- [Phase ?]: Wave 0 (Plan 30-01): composer puro en @objetiva/utils + tipos en @objetiva/types; packages/utils declara @objetiva/types explícitamente para evitar hoisting accidental (lección feedback_schema_drift_silencioso.md)
- [Phase ?]: Plan 30-03: nombre='default' resuelve template default (sin columna is_default, D-13). replaceAtributos = DELETE+INSERT en transacción Drizzle con validación previa de existencia del template. Cast localizado as-any en .values() para PROP_TABLES heterogéneo (familia tiene subcategoriaId).
- [Phase ?]: Phase 30 Plan 04: composición externa (FamiliasTab wraps PropiedadTable con extraColumns + createDialogExtras) en lugar de duplicar tabla. Reutiliza componente genérico al 100%.
- [Phase ?]: Phase 30 Plan 04 deviation Rule 2: backend expose categoria/subcategoria via endpoint dinámico (prop_subcategoria ya existía desde quick 260319-od3 pero módulo dinámico no la conocía).

### Roadmap Evolution

- 2026-05-01: Phase 38 added — Reconciliar drift sistemico de DB de produccion (reactiva, post-detección durante smoke phase 29). Recomendado ejecutar antes de Phase 37.

### Pending Todos

- [auditar-desfase-sistemico-db-de-produccion](./todos/pending/2026-05-01-auditar-desfase-sistemico-db-de-produccion.md) — DB prod tiene `__drizzle_migrations` registrando hashes pero múltiples tablas faltan (`business_settings`, `inv_articulos`, `prop_*` antes del fix manual). Detectado durante smoke /propiedades → 500. Posible relación con quick task `260409-jwl Sync Drizzle schema with production DB` (parcial). Requiere reconciliación full antes del próximo `db:push`.

### Blockers/Concerns

None active. All v1.2 blockers resolved.

### Quick Tasks Completed

| #          | Description                                                                                                | Date       | Commit   | Directory                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 260317-qz6 | Igualar tamaño de fuente de lista de artículos con compras/ventas/pedidos                                  | 2026-03-17 | d28cd8c  | [260317-qz6-igualar-tama-o-de-fuente-de-lista-de-art](./quick/260317-qz6-igualar-tama-o-de-fuente-de-lista-de-art/)                 |
| 260318-2l2 | Agregar escala UI 90% global configurable con persistencia localStorage                                    | 2026-03-18 | 26dadbe  | [260318-2l2-agregar-escala-ui-90-global-configurable](./quick/260318-2l2-agregar-escala-ui-90-global-configurable/)                 |
| 260318-fsf | Simplificar header sticky edicion articulos + Switch activo/inactivo en card Identificacion                | 2026-03-18 | 83bf43b  | [260318-fsf-mejoras-ui-edici-n-art-culos-bot-n-volve](./quick/260318-fsf-mejoras-ui-edici-n-art-culos-bot-n-volve/)                 |
| 260318-m5y | Redisenar seccion imagenes vista detalle: 9 slots horizontales fijos (6 producto + 3 etiqueta)             | 2026-03-18 | 2578ab7  | [260318-m5y-redise-ar-secci-n-im-genes-vista-detalle](./quick/260318-m5y-redise-ar-secci-n-im-genes-vista-detalle/)                 |
| 260319-ly5 | Mejorar visibilidad secciones vista detalle articulo con jerarquía visual Tabler                           | 2026-03-19 | 28032cc  | [260319-ly5-mejorar-visibilidad-secciones-vista-deta](./quick/260319-ly5-mejorar-visibilidad-secciones-vista-deta/)                 |
| 260319-od3 | Fix botón editar, agregar categoría/subcategoría end-to-end, separar metadata                              | 2026-03-19 | a505e2c  | [260319-od3-fix-boton-editar-spacing-x-agregar-categ](./quick/260319-od3-fix-boton-editar-spacing-x-agregar-categ/)                 |
| 260319-whs | Fix sticky header gap en edición y error 500 al subir imagen (text[] → jsonb)                              | 2026-03-19 | f4a232d  | [260319-whs-fix-sticky-header-gap-y-error-upload-ima](./quick/260319-whs-fix-sticky-header-gap-y-error-upload-ima/)                 |
| 260409-jwl | Sync Drizzle schema with production DB                                                                     | 2026-04-09 | ab23b75  | [260409-jwl-sync-drizzle-schema-with-production-db](./quick/260409-jwl-sync-drizzle-schema-with-production-db/)                     |
| 260409-lik | Auditar modelo stock/depositos/unidades + migrar a existencias + trigger PG                                | 2026-04-09 | 79ed24b  | [260409-lik-auditar-modelo-stock-depositos-unidades-](./quick/260409-lik-auditar-modelo-stock-depositos-unidades-/)                 |
| 260409-m40 | Fix columna unidades en lista (erpUnidades→unidades) + unificar terminología Stock→Unidades                | 2026-04-09 | b5db7cc  | [260409-m40-fix-columna-lista-articulos-erpunidades-](./quick/260409-m40-fix-columna-lista-articulos-erpunidades-/)                 |
| 260409-ndp | Fix migrate-images: leer de DB sanchez y poblar imágenes en erp_sanchez                                    | 2026-04-09 | bd587ff  | [260409-ndp-fix-migrate-images-leer-de-db-sanchez-y-](./quick/260409-ndp-fix-migrate-images-leer-de-db-sanchez-y-/)                 |
| 260409-r97 | Agregar iconos secciones y color #056ed1 en sidebar y headers                                              | 2026-04-09 | 463e172  | [260409-r97-agregar-iconos-a-titulos-de-seccion-y-co](.planning/quick/260409-r97-agregar-iconos-a-titulos-de-seccion-y-co/)         |
| 260409-v0e | Cards existencias (total artículos/unidades) + normalizar tamaño títulos secciones                         | 2026-04-09 | eb86a01  | [260409-v0e-cards-existencias-y-tama-o-titulos-secci](./quick/260409-v0e-cards-existencias-y-tama-o-titulos-secci/)                 |
| 260410-ifc | Rediseño imágenes artículos: iconos en lista + 9 slots en detalle                                          | 2026-04-10 | 9a8e6a28 | [260410-ifc-redise-o-de-im-genes-de-art-culos-iconos](./quick/260410-ifc-redise-o-de-im-genes-de-art-culos-iconos/)                 |
| 260410-juo | Ensanchar sheet detalle articulo a max-w-[35rem]                                                           | 2026-04-10 | fa80a0d3 | [260410-juo-ensanchar-sheet-detalle-articulo-a-max-w](./quick/260410-juo-ensanchar-sheet-detalle-articulo-a-max-w/)                 |
| 260428-mig | Aplicar migration-prod.sql pendiente desde Abr 9: restaurar 16 tablas y 2 columnas en produccion           | 2026-04-28 | db558335 | [260428-mig-aplicar-migration-prod-pendiente](./quick/260428-mig-aplicar-migration-prod-pendiente/)                                 |
| 260429-rec | Recuperar datos historicos de inventarios/depositos/existencias desde admin_base_sanchez (7745+7873 filas) | 2026-04-29 | b47db5d6 | [260429-rec-recuperar-datos-inventarios-existencias](./quick/260429-rec-recuperar-datos-inventarios-existencias/)                   |
| 260502-tqf | Restore selectivo prod erp_sanchez: 16 tablas recuperadas desde backup Apr 30 post-incidente data wipe     | 2026-05-02 | 775c91bd | [260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta](./quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/)                 |
| 260517-i9d | Reubicar /propiedades y /templates bajo /settings/articulos con tabs Tabler                                | 2026-05-17 | debcbe5f | [260517-i9d-mover-propiedades-templates-a-settings-articulos](./quick/260517-i9d-mover-propiedades-templates-a-settings-articulos/) |

## Session Continuity

Last session: 2026-05-18T16:07:53.660Z
Stopped at: Phase 31 context gathered
Phase 30 ROADMAP marca: completed 2026-05-17. UAT visual cerrado 2026-05-18.
Findings no bloqueantes de Phase 30 UAT (ver 30-HUMAN-UAT.md sección "Findings adicionales"):

- Warning React Select uncontrolled→controlled en dialog Familias (deuda menor)
- prop_categoria/prop_subcategoria con 0 filas en prod (seed pendiente para activar Familias)
- erp.sanchezrepuestos.com.ar solo HTTP (infra debt preexistente)
  Next action: `/gsd-discuss-phase 31` para arrancar Phase 31 (PK Swap codigo→sku + FK rename en orders/sales/purchases/existencias/inventarios_articulos + webhook payload v2).

---

_State initialized: 2026-01-23_
_Last updated: 2026-04-29 (v1.3 roadmap created)_
