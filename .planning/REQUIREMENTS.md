# Requirements: Objetiva Comercios Admin

**Defined:** 2026-03-10
**Core Value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one

## v1.2 Requirements

Requirements for milestone v1.2: Articulos CRUD + Imagenes + API Keys + Webhooks.

### Articulos CRUD

- [ ] **ART-01**: User can create a new articulo filling all ~30 fields grouped efficiently (frequent fields on top)
- [ ] **ART-02**: User can edit an existing articulo with the same form, pre-populated with current data
- [ ] **ART-03**: User can soft-delete an articulo (toggle activo/inactivo) with confirmation dialog
- [ ] **ART-04**: User can search/filter articulos in the list with debounce (real-time as they type)

### Imagenes

- [x] **IMG-01**: User can upload images to labeled slots (3 etiqueta + 6 producto) stored on filesystem
- [x] **IMG-02**: User can preview uploaded images as thumbnails and remove individual images
- [x] **IMG-03**: System generates automatic thumbnails (200x200 for list, 800px max for detail) via sharp
- [x] **IMG-04**: User can drag & drop images into the corresponding slot in the form

### Vista Lista & Detalle

- [ ] **VIEW-01**: User can configure which columns are visible in the articulos list (global setting persisted in DB)
- [ ] **VIEW-02**: User can view articulo detail in a lateral panel/sheet showing all fields and images
- [ ] **VIEW-03**: User can sort the articulos list by clicking column headers (asc/desc)

### API Keys

- [ ] **APIKEY-01**: Admin can create a new API key with a descriptive name, key is shown once and copyable
- [ ] **APIKEY-02**: Admin can list active API keys (showing name, prefix, creation date, last used) and revoke them
- [ ] **APIKEY-03**: External systems can authenticate via Bearer token (API key) independent of Supabase Auth
- [ ] **APIKEY-04**: System tracks last usage timestamp for each API key

### Webhooks

- [ ] **HOOK-01**: Admin can create webhook subscriptions selecting entity + event + destination URL
- [ ] **HOOK-02**: Admin can edit and delete webhook subscriptions
- [ ] **HOOK-03**: System delivers webhook payloads asynchronously with 3 retries and exponential backoff
- [ ] **HOOK-04**: Admin can view delivery log with status (ok/fail), HTTP response code, and timestamp
- [ ] **HOOK-05**: Admin can send a test ping to a webhook URL to verify connectivity
- [ ] **HOOK-06**: System signs webhook payloads with HMAC-SHA256, included in X-Signature header
- [ ] **HOOK-07**: v1.2 supports articulos entity events (create/update/delete), architecture supports adding more entities

## Future Requirements

### Webhooks — Extended Entities

- **HOOK-F01**: Webhook events for existencias changes (stock updates)
- **HOOK-F02**: Webhook events for inventarios lifecycle (created/started/completed)
- **HOOK-F03**: Webhook events for orders, sales, purchases

### Mobile Enhancements

- **MOB-F01**: Articulos CRUD from mobile app
- **MOB-F02**: Image capture from camera for articulo slots

## Out of Scope

| Feature                              | Reason                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Per-user column preferences          | 1-5 user admin app, global config sufficient                                 |
| BullMQ/Redis for webhook queue       | Overkill for volume (10-50 webhooks/day), PostgreSQL table + cron sufficient |
| OAuth/OIDC for API Keys              | Simple Bearer tokens cover the use case, no OAuth flow needed                |
| Real-time webhook status (WebSocket) | Polling delivery log is sufficient for admin use                             |
| Image CDN or cloud storage           | Filesystem local is sufficient for current scale                             |
| Webhook payload transformation       | Fixed payload format per entity, no user-defined templates                   |
| API key rate limiting                | Trusted internal/partner consumers, rate limiting deferred                   |

## Traceability

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| ART-01      | Phase 19 | Pending  |
| ART-02      | Phase 19 | Pending  |
| ART-03      | Phase 19 | Pending  |
| ART-04      | Phase 19 | Pending  |
| IMG-01      | Phase 21 | Complete |
| IMG-02      | Phase 21 | Complete |
| IMG-03      | Phase 20 | Complete |
| IMG-04      | Phase 21 | Complete |
| VIEW-01     | Phase 22 | Pending  |
| VIEW-02     | Phase 21 | Pending  |
| VIEW-03     | Phase 22 | Pending  |
| APIKEY-01   | Phase 23 | Pending  |
| APIKEY-02   | Phase 23 | Pending  |
| APIKEY-03   | Phase 23 | Pending  |
| APIKEY-04   | Phase 23 | Pending  |
| HOOK-01     | Phase 24 | Pending  |
| HOOK-02     | Phase 24 | Pending  |
| HOOK-03     | Phase 24 | Pending  |
| HOOK-04     | Phase 24 | Pending  |
| HOOK-05     | Phase 24 | Pending  |
| HOOK-06     | Phase 24 | Pending  |
| HOOK-07     | Phase 24 | Pending  |

**Coverage:**

- v1.2 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---

_Requirements defined: 2026-03-10_
_Last updated: 2026-03-10 after roadmap creation_
