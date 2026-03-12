# Roadmap: Objetiva Comercios Admin

## Milestones

- ✅ **v1.0 MVP** — Phases 1-13 (shipped 2026-03-04) — [Full details](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Modelo Articulos + Inventario** — Phases 14-18 (shipped 2026-03-10) — [Full details](milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 Articulos CRUD + Imagenes + API Keys + Webhooks** — Phases 19-24 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-13) — SHIPPED 2026-03-04</summary>

- [x] Phase 1: Foundation & Monorepo (4/4 plans) — completed 2026-01-24
- [x] Phase 2: Backend API with Mock Data (5/5 plans) — completed 2026-03-01
- [x] Phase 3: Web Application (8/8 plans) — completed 2026-01-26
- [x] Phase 4: Mobile Application (4/4 plans) — completed 2026-03-02
- [x] Phase 5: Database Integration (3/3 plans) — completed 2026-03-02
- [x] Phase 6: Polish & Production (4/4 plans) — completed 2026-03-02
- [x] Phase 7: Fix Integration Bugs (2/2 plans) — completed 2026-03-02
- [x] Phase 8: Verify & Close Phases 3+4 (3/3 plans) — completed 2026-03-02
- [x] Phase 9: Fix Mobile Purchase & Login Bugs (2/2 plans) — completed 2026-03-02
- [x] Phase 10: Code Quality & Type Safety Cleanup (4/4 plans) — completed 2026-03-03
- [x] Phase 11: Fix Sales Detail View Crash (1/1 plans) — completed 2026-03-03
- [x] Phase 12: Fix Dashboard Links & Doc Sync (1/1 plans) — completed 2026-03-03
- [x] Phase 13: Tech Debt Cleanup (1/1 plans) — completed 2026-03-03

</details>

<details>
<summary>✅ v1.1 Modelo Articulos + Inventario (Phases 14-18) — SHIPPED 2026-03-10</summary>

- [x] Phase 14: Schema Foundation + Articulos + Depositos (5/5 plans) — completed 2026-03-05
- [x] Phase 15: Existencias (3/3 plans) — completed 2026-03-05
- [x] Phase 16: Downstream Migration + Dashboard + Navigation (4/4 plans) — completed 2026-03-05
- [x] Phase 17: Inventarios (5/5 plans) — completed 2026-03-06
- [x] Phase 18: Fix Inventarios Article Count Display (1/1 plans) — completed 2026-03-06

</details>

### 🚧 v1.2 Articulos CRUD + Imagenes + API Keys + Webhooks (In Progress)

**Milestone Goal:** Completar el CRUD de articulos con imagenes, agregar columnas configurables, habilitar integraciones externas via API keys, y notificar eventos via webhooks.

- [x] **Phase 19: Articulos CRUD Completo** - Wiring de crear/editar/soft-delete + busqueda en lista + config visibilidad campos
- [x] **Phase 20: Image Upload Backend** - Infraestructura de upload, procesamiento con sharp, serving estatico (completed 2026-03-12)
- [x] **Phase 21: Image Upload Frontend + Detalle** - Grid de slots con upload/preview/drag-drop + panel lateral de detalle (completed 2026-03-12)
- [x] **Phase 22: Vista Lista Configurable** - Columnas show/hide persistidas + sort por columnas (completed 2026-03-12)
- [ ] **Phase 23: API Keys** - CRUD de keys, CompositeAuthGuard (JWT + Bearer), UI en Settings
- [ ] **Phase 24: Webhooks** - Suscripciones CRUD, entrega asincrona con retry, firma HMAC, log de entregas

## Phase Details

### Phase 19: Articulos CRUD Completo

**Goal**: El usuario puede crear, editar y desactivar articulos con todos los ~30 campos, y buscar en la lista en tiempo real
**Depends on**: Phase 18 (v1.1 complete)
**Requirements**: ART-01, ART-02, ART-03, ART-04
**Success Criteria** (what must be TRUE):

1. User can create a new articulo filling all ~30 fields in a grouped form, and it appears in the list after saving
2. User can click edit on any articulo, see the form pre-populated with current data, modify fields, and save changes
3. User can soft-delete an articulo (toggle activo/inactivo) via a confirmation dialog, and the list reflects the change
4. User can type in a search box and the articulos list filters in real-time with debounce
   **Plans:** 3 plans

Plans:

- [x] 19-01-PLAN.md — Backend search expansion + table row actions + AlertDialog toggle
- [x] 19-02-PLAN.md — Edit page AlertDialog + Sheet JSONB read-only sections
- [x] 19-03-PLAN.md — Articulos field visibility configuration (settings page + hook + consumers)

### Phase 20: Image Upload Backend

**Goal**: El backend puede recibir, procesar y servir imagenes de articulos con thumbnails automaticos
**Depends on**: Phase 19
**Requirements**: IMG-03
**Success Criteria** (what must be TRUE):

1. Backend accepts image uploads via POST endpoint with file validation (type, size, magic bytes)
2. Uploaded images are automatically converted to WebP and resized (200x200 thumbnail, 1000px max detail)
3. Images are served as static files accessible via URL from the frontend
   **Plans:** 1/1 plans complete

Plans:

- [ ] 20-01-PLAN.md — Install sharp, image processing service (upload/delete), controller con Multer + MulterError filter

### Phase 21: Image Upload Frontend + Detalle

**Goal**: El usuario puede gestionar imagenes de articulos en slots etiquetados y ver el detalle completo de un articulo en panel lateral
**Depends on**: Phase 20
**Requirements**: IMG-01, IMG-02, IMG-04, VIEW-02
**Success Criteria** (what must be TRUE):

1. User can upload images into labeled slots (3 etiqueta + 6 producto) within the articulo form
2. User can see uploaded images as thumbnails and remove individual images from their slots
3. User can drag and drop image files into the corresponding slot
4. User can click an articulo row and see a lateral panel/sheet showing all fields and uploaded images
   **Plans:** 2/2 plans complete

Plans:

- [ ] 21-01-PLAN.md — API client functions + ImagenSlot/ImagenSlotGrid components + edit page integration
- [ ] 21-02-PLAN.md — ImagenLightbox component + images section in ArticuloSheet

### Phase 22: Vista Lista Configurable

**Goal**: El usuario puede personalizar que columnas ve en la lista de articulos y ordenarlos por cualquier columna
**Depends on**: Phase 19
**Requirements**: VIEW-01, VIEW-03
**Success Criteria** (what must be TRUE):

1. User can open a column visibility dropdown and toggle which columns appear in the articulos table
2. Column visibility preference is persisted globally in the database and restored on page reload
3. User can click any column header to sort the list ascending/descending
   **Plans:** 2/2 plans complete

Plans:

- [ ] 22-01-PLAN.md — Schema objeto + types + 4 new columns + DB-driven column visibility + Settings immediate-persist
- [ ] 22-02-PLAN.md — Server-side sorting via clickable column headers with tri-state indicators

### Phase 23: API Keys

**Goal**: Administradores pueden crear y gestionar API keys para que sistemas externos se autentiquen sin Supabase
**Depends on**: Phase 19
**Requirements**: APIKEY-01, APIKEY-02, APIKEY-03, APIKEY-04
**Success Criteria** (what must be TRUE):

1. Admin can create a new API key with a name, the full key is displayed once and can be copied to clipboard
2. Admin can see a list of active API keys (name, prefix, creation date, last used) and revoke any key
3. An external system can call any authenticated endpoint using a Bearer token (API key) without Supabase JWT
4. The system records the last usage timestamp each time an API key is used to authenticate a request
   **Plans**: TBD

Plans:

- [ ] 23-01: TBD
- [ ] 23-02: TBD

### Phase 24: Webhooks

**Goal**: Administradores pueden configurar webhooks que notifican eventos de articulos a URLs externas con entrega confiable
**Depends on**: Phase 19, Phase 23
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05, HOOK-06, HOOK-07
**Success Criteria** (what must be TRUE):

1. Admin can create a webhook subscription selecting entity (articulos) + event (create/update/delete) + destination URL
2. Admin can edit and delete existing webhook subscriptions
3. When an articulo is created, updated, or deleted, subscribed webhooks receive the payload asynchronously with up to 3 retries
4. Admin can view a delivery log showing status (ok/fail), HTTP response code, and timestamp for each delivery attempt
5. Admin can send a test ping to a webhook URL to verify connectivity before relying on it
   **Plans**: TBD

Plans:

- [ ] 24-01: TBD
- [ ] 24-02: TBD
- [ ] 24-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 19 → 20 → 21 → 22 → 23 → 24
(Phases 22 and 23 depend only on 19, not on each other — can be parallelized if needed)

| Phase                                  | Milestone | Plans Complete | Status      | Completed  |
| -------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Foundation & Monorepo               | v1.0      | 4/4            | Complete    | 2026-01-24 |
| 2. Backend API with Mock Data          | v1.0      | 5/5            | Complete    | 2026-03-01 |
| 3. Web Application                     | v1.0      | 8/8            | Complete    | 2026-01-26 |
| 4. Mobile Application                  | v1.0      | 4/4            | Complete    | 2026-03-02 |
| 5. Database Integration                | v1.0      | 3/3            | Complete    | 2026-03-02 |
| 6. Polish & Production                 | v1.0      | 4/4            | Complete    | 2026-03-02 |
| 7. Fix Integration Bugs                | v1.0      | 2/2            | Complete    | 2026-03-02 |
| 8. Verify & Close Phases 3+4           | v1.0      | 3/3            | Complete    | 2026-03-02 |
| 9. Fix Mobile Purchase & Login Bugs    | v1.0      | 2/2            | Complete    | 2026-03-02 |
| 10. Code Quality & Type Safety Cleanup | v1.0      | 4/4            | Complete    | 2026-03-03 |
| 11. Fix Sales Detail View Crash        | v1.0      | 1/1            | Complete    | 2026-03-03 |
| 12. Fix Dashboard Links & Doc Sync     | v1.0      | 1/1            | Complete    | 2026-03-03 |
| 13. Tech Debt Cleanup                  | v1.0      | 1/1            | Complete    | 2026-03-03 |
| 14. Schema + Articulos + Depositos     | v1.1      | 5/5            | Complete    | 2026-03-05 |
| 15. Existencias                        | v1.1      | 3/3            | Complete    | 2026-03-05 |
| 16. Downstream + Dashboard + Nav       | v1.1      | 4/4            | Complete    | 2026-03-05 |
| 17. Inventarios                        | v1.1      | 5/5            | Complete    | 2026-03-06 |
| 18. Fix Inventarios Article Count      | v1.1      | 1/1            | Complete    | 2026-03-06 |
| 19. Articulos CRUD Completo            | v1.2      | 3/3            | Complete    | 2026-03-11 |
| 20. Image Upload Backend               | v1.2      | 1/1            | Complete    | 2026-03-12 |
| 21. Image Upload Frontend + Detalle    | 2/2       | Complete       | 2026-03-12  | -          |
| 22. Vista Lista Configurable           | 2/2       | Complete       | 2026-03-12  | -          |
| 23. API Keys                           | v1.2      | 0/?            | Not started | -          |
| 24. Webhooks                           | v1.2      | 0/?            | Not started | -          |

---

_Roadmap created: 2026-01-23_
_Last updated: 2026-03-12 (Phase 22 planned — 2 plans)_
