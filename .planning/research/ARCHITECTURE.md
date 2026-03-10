# Architecture Patterns

**Domain:** v1.2 feature integration -- File uploads, API Keys, Webhooks, Column config
**Researched:** 2026-03-10
**Confidence:** HIGH (direct codebase analysis + established NestJS/Drizzle patterns)

## Current Architecture Snapshot

### What Exists Today (post-v1.1)

| Layer     | Component                                                                                          | Key Files                                          | Relevance to v1.2                                                         |
| --------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| DB Schema | `articulos` (PK: `codigo` text, ~30 fields, `imagenesProducto`/`imagenesEtiqueta` as jsonb arrays) | `apps/backend/src/db/schema.ts`                    | Image upload target, webhook event source                                 |
| DB Schema | `businessSettings` (singleton row, logos)                                                          | same                                               | Column config candidate, API key management location                      |
| Backend   | `ArticulosModule` (CRUD, text PK routes)                                                           | `apps/backend/src/modules/articulos/`              | Needs file upload endpoints, webhook emission on CUD                      |
| Backend   | `SettingsModule` (GET/PATCH + logo upload via `FileInterceptor`)                                   | `apps/backend/src/modules/settings/`               | Existing file upload pattern to follow; API Keys + Webhooks UI lives here |
| Backend   | `JwtAuthGuard` (global, `@Public()` opt-out)                                                       | `apps/backend/src/common/guards/jwt-auth.guard.ts` | Must coexist with new API Key auth                                        |
| Backend   | `RolesGuard` (per-endpoint, `@Roles('admin')`)                                                     | `apps/backend/src/common/guards/roles.guard.ts`    | API Key requests need role assignment too                                 |
| Frontend  | Settings has sub-pages: business, appearance, depositos, dispositivos, profile                     | `apps/web/src/app/(dashboard)/settings/`           | New sub-pages: api-keys, webhooks                                         |
| Frontend  | Articulos list page with TanStack Table                                                            | `apps/web/src/app/(dashboard)/articulos/`          | Column config consumer                                                    |
| Static    | `uploads/` dir served at `/api/uploads/` prefix                                                    | `apps/backend/src/main.ts`                         | Already configured for logos, extends to articulo images                  |

### Current Auth Flow

```
Request --> JwtAuthGuard (global)
  |
  +-- @Public() route? --> SKIP auth, allow
  |
  +-- Extract Bearer token --> Verify JWT via Supabase JWKS
  |     |
  |     +-- Attach user to request: { userId, email, role }
  |
  +-- @Roles('admin') endpoint? --> RolesGuard checks user.role
```

### Current File Upload Pattern (settings/logo)

```
POST /api/settings/logo/:type
  --> @UseInterceptors(FileInterceptor('file'))
  --> ParseFilePipe (MaxSize 2MB, FileType image/*)
  --> Manual writeFile to uploads/ dir
  --> Store filename in DB (not full path)
  --> Serve via app.useStaticAssets(uploadsDir, { prefix: '/api/uploads/' })
```

---

## Recommended Architecture

### New Components Overview

| Component                  | Type                | Responsibility                                           | Communicates With                  |
| -------------------------- | ------------------- | -------------------------------------------------------- | ---------------------------------- |
| `ApiKeysModule`            | NEW module          | CRUD API keys, hash storage, validation                  | DB, AuthGuard                      |
| `WebhooksModule`           | NEW module          | CRUD subscriptions, emit events, deliver payloads        | DB, ArticulosService, queue        |
| `ApiKeyGuard`              | NEW guard           | Validate `Bearer <api-key>` tokens as alternative to JWT | DB (api_keys table)                |
| `AuthGuard` (composite)    | MODIFIED guard      | Try JWT first, fall back to API key                      | JwtAuthGuard, ApiKeyGuard          |
| Articulos upload endpoints | MODIFIED controller | File upload for imagenes_producto / imagenes_etiqueta    | Filesystem, DB                     |
| Settings sub-pages         | MODIFIED frontend   | New tabs: API Keys, Webhooks                             | Backend API                        |
| Column config              | NEW in settings     | Store global column visibility/order preferences         | DB (businessSettings or new table) |

### New DB Tables

```
api_keys (NEW)
  id: serial PK
  nombre: varchar(100) -- human-readable label
  key_hash: varchar(64) -- SHA-256 hash of the API key
  key_prefix: varchar(8) -- first 8 chars for identification (obj_xxxx...)
  role: varchar(20) -- 'admin' or 'viewer'
  created_by: text -- userId who created it
  last_used_at: timestamp -- nullable
  expires_at: timestamp -- nullable
  activo: boolean default true
  created_at: timestamp
  updated_at: timestamp

webhook_subscriptions (NEW)
  id: serial PK
  url: text NOT NULL -- delivery URL
  entidad: varchar(50) NOT NULL -- 'articulos' (extensible later)
  eventos: jsonb NOT NULL -- ['create', 'update', 'delete']
  secret: varchar(64) -- HMAC signing secret
  activo: boolean default true
  created_by: text
  created_at: timestamp
  updated_at: timestamp

webhook_deliveries (NEW)
  id: serial PK
  subscription_id: integer FK -> webhook_subscriptions.id
  evento: varchar(50) -- 'articulos.create', 'articulos.update', 'articulos.delete'
  payload: jsonb -- the full event payload
  status: varchar(20) -- 'pending', 'success', 'failed'
  status_code: integer -- HTTP response code
  response_body: text -- truncated response
  attempts: integer default 0
  next_retry_at: timestamp
  delivered_at: timestamp
  created_at: timestamp

column_configs (NEW -- or extend businessSettings)
  id: serial PK
  tabla: varchar(50) NOT NULL -- 'articulos' (extensible)
  columnas: jsonb NOT NULL -- [{ key, visible, order, width? }]
  updated_at: timestamp
```

### Component Boundaries (v1.2)

| Component         | Responsibility                                  | Communicates With                     | Status               |
| ----------------- | ----------------------------------------------- | ------------------------------------- | -------------------- |
| `ApiKeysModule`   | CRUD keys, hash/compare, prefix generation      | DB only                               | NEW                  |
| `WebhooksModule`  | CRUD subscriptions, delivery queue, retry       | DB, ArticulosService (event emission) | NEW                  |
| `ArticulosModule` | CRUD + file upload endpoints + webhook emission | DB, filesystem, WebhooksService       | MODIFIED             |
| `SettingsModule`  | Business settings + column config               | DB                                    | MODIFIED (minor)     |
| `JwtAuthGuard`    | JWT validation via Supabase JWKS                | Supabase JWKS endpoint                | MODIFIED (composite) |

### Data Flow

**API Key Authentication:**

```
Request with Bearer token
  |
  +-- CompositeAuthGuard (replaces JwtAuthGuard as global guard)
       |
       +-- Try JWT verification (Supabase JWKS)
       |     |
       |     +-- SUCCESS --> attach user { userId, email, role } from JWT
       |     +-- FAIL --> continue to API key check
       |
       +-- Try API Key lookup
       |     |
       |     +-- Hash the token with SHA-256
       |     +-- Query api_keys WHERE key_hash = hash AND activo = true
       |     +-- Check expiry (expires_at is null OR > now)
       |     +-- SUCCESS --> attach user { userId: 'api-key:<id>', email: '', role: key.role }
       |     +-- Update last_used_at (fire-and-forget, no await)
       |     +-- FAIL --> UnauthorizedException
       |
       +-- @Public() routes skip everything (unchanged)
```

**Key design decision:** API key auth produces the same `AuthenticatedUser` shape on `request.user`. This means `@Roles()` guards work identically for both JWT and API key requests. Zero changes to existing role-protected endpoints.

**File Upload for Articulos:**

```
POST /api/articulos/:codigo/imagenes/:tipo (tipo = 'producto' | 'etiqueta')
  |
  +-- @UseInterceptors(FilesInterceptor('files', maxCount))
  +-- ParseFilePipe: MaxSize 5MB, FileType image/*
  +-- For each file:
  |     +-- Generate filename: articulos/<codigo>/<tipo>-<timestamp>-<random>.<ext>
  |     +-- writeFile to uploads/articulos/<codigo>/
  +-- Read current jsonb array from articulo
  +-- Append new filenames
  +-- Update articulo record
  +-- Return updated articulo

DELETE /api/articulos/:codigo/imagenes/:tipo/:index
  |
  +-- Read current jsonb array
  +-- Remove entry at index
  +-- Delete file from filesystem
  +-- Update articulo record
  +-- Return updated articulo
```

**Directory structure for uploaded images:**

```
uploads/
  logo-*.png              (existing -- settings logos)
  articulos/
    <codigo>/
      producto-1710000000-123456789.jpg
      producto-1710000001-987654321.png
      etiqueta-1710000002-456789123.webp
```

**Webhook Delivery Flow:**

```
1. ArticulosService.create/update/delete completes DB operation
     |
     +-- Returns articulo data
     |
     +-- Calls WebhooksService.emit('articulos', 'create', articuloData)
           (fire-and-forget -- does NOT block the API response)

2. WebhooksService.emit()
     |
     +-- Query webhook_subscriptions WHERE entidad='articulos'
     |   AND eventos @> '["create"]' AND activo=true
     |
     +-- For each matching subscription:
           +-- Insert webhook_deliveries row (status='pending')
           +-- Schedule delivery (setTimeout or process.nextTick)

3. WebhooksService.deliver(deliveryId)
     |
     +-- Read delivery + subscription
     +-- Build payload: { evento, timestamp, data }
     +-- Sign with HMAC-SHA256 using subscription.secret
     +-- POST to subscription.url
     |     Headers: X-Webhook-Signature, X-Webhook-Event, Content-Type: application/json
     |
     +-- SUCCESS (2xx):
     |     Update delivery: status='success', status_code, delivered_at
     |
     +-- FAIL (non-2xx or network error):
           Update delivery: status='failed', status_code, attempts++
           If attempts < 3: set next_retry_at (exponential: 1min, 5min, 30min)
           Schedule retry
```

**v1.2 scope note:** No external queue (Bull/Redis). Use in-process `setTimeout` for retries. The scale (few webhooks, low volume) doesn't justify queue infrastructure. If v2.0 needs it, the `WebhooksService.emit()` interface stays the same -- only the delivery mechanism changes.

**Column Configuration Flow:**

```
GET /api/settings/column-config/:tabla
  --> Returns { tabla, columnas: [{ key, visible, order, width? }] }
  --> If no config exists, return default columns for that tabla

PATCH /api/settings/column-config/:tabla
  --> Body: { columnas: [{ key, visible, order, width? }] }
  --> Upsert column_configs row
  --> Return updated config

Frontend:
  --> Articulos page fetches column config on mount
  --> User toggles columns via dropdown (shadcn DropdownMenu)
  --> Save to backend on change (debounced)
  --> TanStack Table columnVisibility controlled by config
```

**Design decision: global config, not per-user.** Rationale: this is a small-team admin app (1-5 users). Per-user adds complexity (user ID tracking, preferences table, merge logic). Global config means the team agrees on a view. If per-user is needed later, the API shape (`/api/settings/column-config/:tabla`) stays the same -- just add a query param `?userId=...`.

---

## Integration Points -- Detailed Impact Analysis

### 1. New Modules (Backend)

| Module              | Files to Create                                                                                                                 | Dependencies |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `modules/api-keys/` | `api-keys.module.ts`, `api-keys.controller.ts`, `api-keys.service.ts`, `dto/create-api-key.dto.ts`                              | DbModule     |
| `modules/webhooks/` | `webhooks.module.ts`, `webhooks.controller.ts`, `webhooks.service.ts`, `dto/create-webhook.dto.ts`, `dto/update-webhook.dto.ts` | DbModule     |

### 2. Modified Modules (Backend)

| Module            | Changes                                                                   | Impact                                       |
| ----------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| `ArticulosModule` | Add upload endpoints (2 routes), inject WebhooksService, call emit on CUD | MEDIUM -- 3 service methods gain 1 line each |
| `SettingsModule`  | Add column config endpoints (GET + PATCH per tabla)                       | LOW -- 2 new routes, straightforward CRUD    |
| `app.module.ts`   | Import ApiKeysModule, WebhooksModule                                      | LOW                                          |

### 3. Modified Guards (Backend)

| File                | Change                                                                      | Impact                           |
| ------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| `jwt-auth.guard.ts` | Rename to `auth.guard.ts`, add API key fallback logic                       | HIGH -- this is the global guard |
| `roles.guard.ts`    | No changes needed -- works on `request.user.role` regardless of auth method | NONE                             |

**Implementation approach for composite guard:**

```typescript
// auth.guard.ts (renamed from jwt-auth.guard.ts)
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeysService: ApiKeysService // injected
  ) {
    /* ... */
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check @Public()
    if (isPublic) return true

    // 2. Extract Bearer token
    const token = extractBearerToken(request)

    // 3. Try JWT first (fast path -- most requests are JWT)
    try {
      const jwtUser = await this.verifyJwt(token)
      request.user = jwtUser
      return true
    } catch {
      /* not a valid JWT, try API key */
    }

    // 4. Try API key
    const apiKeyUser = await this.apiKeysService.validateKey(token)
    if (apiKeyUser) {
      request.user = apiKeyUser
      return true
    }

    throw new UnauthorizedException('Token invalido')
  }
}
```

**Problem: global guard instantiation.** Currently `main.ts` does `app.useGlobalGuards(new JwtAuthGuard(new Reflector()))` -- manual instantiation bypasses DI. The composite guard needs `ApiKeysService` injected, which requires DI.

**Solution:** Switch to module-based global guard registration:

```typescript
// auth.module.ts
@Module({
  imports: [ApiKeysModule], // for ApiKeysService
  providers: [
    AuthGuard,
    { provide: APP_GUARD, useClass: AuthGuard }, // replaces useGlobalGuards()
  ],
  exports: [AuthGuard],
})
export class AuthModule {}
```

Remove `app.useGlobalGuards(...)` from `main.ts`. This is a cleaner NestJS pattern that enables DI for global guards.

### 4. New DB Tables (Schema)

Add to `schema.ts`:

```typescript
// 4 new tables, ~60 lines total
export const apiKeys = pgTable('api_keys', {
  /* ... */
})
export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  /* ... */
})
export const webhookDeliveries = pgTable('webhook_deliveries', {
  /* ... */
})
export const columnConfigs = pgTable('column_configs', {
  /* ... */
})
```

Plus type exports:

```typescript
export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect
// etc.
```

### 5. Frontend Changes (Web)

| Path                                             | Action        | What Changes                                                 |
| ------------------------------------------------ | ------------- | ------------------------------------------------------------ |
| `app/(dashboard)/settings/api-keys/page.tsx`     | NEW           | List keys, create dialog, revoke button                      |
| `app/(dashboard)/settings/webhooks/page.tsx`     | NEW           | List subscriptions, create dialog, test button, delivery log |
| `app/(dashboard)/settings/layout.tsx`            | MODIFY        | Add nav items for API Keys and Webhooks                      |
| `app/(dashboard)/articulos/articulos-client.tsx` | MODIFY        | Add column config dropdown, image column, detail panel       |
| `app/(dashboard)/articulos/[codigo]/page.tsx`    | NEW or MODIFY | Detail view with images, upload interface                    |
| `app/(dashboard)/articulos/nuevo/page.tsx`       | MODIFY        | Image upload fields in create form                           |

### 6. Static File Serving

Already configured in `main.ts`:

```typescript
app.useStaticAssets(uploadsDir, { prefix: '/api/uploads/' })
```

Images stored at `uploads/articulos/<codigo>/producto-*.jpg` will be served at `GET /api/uploads/articulos/<codigo>/producto-*.jpg`. No changes needed.

The `uploads/articulos/` subdirectory must be created on first upload (use `mkdirSync({ recursive: true })`).

---

## Patterns to Follow

### Pattern 1: API Key Generation and Storage

**What:** Generate cryptographically secure keys, store only the hash, show the key once.
**When:** Creating a new API key.
**Example:**

```typescript
import { randomBytes, createHash } from 'crypto'

// Generate key
const rawKey = `obj_${randomBytes(32).toString('hex')}` // obj_64hexchars
const prefix = rawKey.substring(0, 8) // obj_xxxx
const hash = createHash('sha256').update(rawKey).digest('hex')

// Store in DB: { key_hash: hash, key_prefix: prefix }
// Return to user ONCE: { key: rawKey, prefix }
// Never store rawKey. Never return it again.
```

**Why this way:** Same pattern as GitHub personal access tokens, Stripe API keys. Prefix allows identification without exposing the key. Hash means DB breach doesn't compromise keys.

### Pattern 2: Webhook HMAC Signing

**What:** Sign webhook payloads so receivers can verify authenticity.
**When:** Every webhook delivery.
**Example:**

```typescript
import { createHmac } from 'crypto'

const payload = JSON.stringify({
  evento: 'articulos.create',
  timestamp: Date.now(),
  data: articulo,
})
const signature = createHmac('sha256', subscription.secret).update(payload).digest('hex')

// Send with headers:
// X-Webhook-Signature: sha256=<signature>
// X-Webhook-Event: articulos.create
// X-Webhook-Delivery: <delivery-id>
```

### Pattern 3: Fire-and-Forget Webhook Emission

**What:** Webhook emission must not block API responses.
**When:** After any articulo CUD operation.
**Example:**

```typescript
// articulos.service.ts
async create(dto: CreateArticuloDto) {
  const [articulo] = await this.drizzle.db.insert(articulos).values(dto).returning()

  // Fire and forget -- do NOT await
  this.webhooksService.emit('articulos', 'create', articulo).catch(err => {
    console.error('Webhook emission failed:', err)
  })

  return articulo
}
```

### Pattern 4: Multi-File Upload with NestJS

**What:** Upload multiple images in a single request for articulos.
**When:** Adding product or label images.
**Example:**

```typescript
@Post(':codigo/imagenes/:tipo')
@UseInterceptors(FilesInterceptor('files', 6)) // max 6 files per request
@UseGuards(RolesGuard)
@Roles('admin')
async uploadImages(
  @Param('codigo') codigo: string,
  @Param('tipo') tipo: 'producto' | 'etiqueta',
  @UploadedFiles(new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
      new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ }),
    ],
  }))
  files: Express.Multer.File[]
) {
  return this.articulosService.addImages(codigo, tipo, files)
}
```

### Pattern 5: Column Config as Controlled TanStack Table State

**What:** Column visibility driven by backend config, with local toggle UI.
**When:** Articulos list page.
**Example:**

```typescript
// Frontend: articulos-client.tsx
const { data: columnConfig } = useQuery({
  queryKey: ['column-config', 'articulos'],
  queryFn: () => fetchColumnConfig('articulos'),
})

const columnVisibility = useMemo(() => {
  if (!columnConfig) return DEFAULT_VISIBILITY
  return Object.fromEntries(columnConfig.columnas.map(c => [c.key, c.visible]))
}, [columnConfig])

const table = useReactTable({
  state: { columnVisibility },
  onColumnVisibilityChange: updater => {
    // Update local state + debounced save to backend
  },
})
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Raw API Keys in the Database

**What:** Saving the full API key in plaintext.
**Why bad:** Any DB access (backup, breach, admin panel) exposes all keys. Industry standard is hash-only.
**Instead:** Store SHA-256 hash + 8-char prefix. Return raw key exactly once on creation.

### Anti-Pattern 2: Synchronous Webhook Delivery

**What:** `await fetch(webhook.url)` inside the articulo create/update/delete handler.
**Why bad:** Slow/unreachable webhook URLs block API responses. If 5 subscriptions exist and one times out (30s default), the API response takes 30+ seconds.
**Instead:** Fire-and-forget with `.catch()`. Delivery happens asynchronously. Failures are logged in `webhook_deliveries`.

### Anti-Pattern 3: Separate Auth Guards (JWT OR ApiKey decorator per route)

**What:** Creating `@UseGuards(ApiKeyGuard)` as an alternative decorator, requiring developers to choose per route.
**Why bad:** Every route must be explicitly decorated. Easy to forget. Inconsistent behavior. Maintenance burden grows with routes.
**Instead:** Single composite guard as global guard. Every authenticated route accepts either JWT or API key. Zero per-route changes.

### Anti-Pattern 4: Using Multer Disk Storage

**What:** Configuring Multer's `diskStorage` for file handling.
**Why bad:** Adds configuration complexity (destination function, filename function). The existing settings/logo pattern uses memory storage + manual `writeFile`, which is simpler and gives full control over directory structure and naming.
**Instead:** Keep the existing pattern: `FileInterceptor` (memory storage) + manual `writeFile`. Consistent with the codebase.

### Anti-Pattern 5: Per-User Column Config in v1.2

**What:** Building a `user_preferences` table with per-user column visibility.
**Why bad:** 1-5 users in this admin app. Per-user adds: user FK, merge defaults logic, migration when new columns are added, orphan cleanup. Way over-engineered.
**Instead:** Global config in `column_configs` table. One row per `tabla`. Entire team shares the view.

### Anti-Pattern 6: Bull/Redis Queue for Webhooks at This Scale

**What:** Adding BullMQ + Redis for webhook delivery queue.
**Why bad:** The app has 0 production users. Webhook volume will be single-digit per minute at most. Bull/Redis adds infrastructure dependency, Docker service, connection management, worker process.
**Instead:** In-process delivery with `setTimeout` retries. If scale demands it in v2.0+, swap the delivery mechanism inside `WebhooksService` without changing the `emit()` interface.

---

## Suggested Build Order

The dependency chain determines phase ordering:

```
Phase A: File Upload for Articulos
  (independent -- no dependency on other v1.2 features)

Phase B: API Keys (backend + frontend)
  (independent -- no dependency on other v1.2 features)

Phase C: Column Config (backend + frontend)
  (independent -- no dependency on other v1.2 features)

Phase D: Webhooks (backend + frontend)
  (depends on articulos CUD methods existing -- they already exist from v1.1)
  (benefits from API Keys existing -- external consumers need auth)
```

**Recommended order:** A -> B -> D -> C

**Rationale:**

1. **File Upload (A)** first because it completes the articulos CRUD story (v1.2's primary goal). The existing `FileInterceptor` pattern from settings/logo means low risk.
2. **API Keys (B)** second because it's a clean new module with no existing code modification (except the global guard). Once done, external consumers can authenticate.
3. **Webhooks (D)** third because it modifies ArticulosService (adds emit calls). Having API Keys done first means webhook consumers can authenticate to the API.
4. **Column Config (C)** last because it's purely UI polish. The articulos list works fine with hardcoded columns; config just improves UX. Lowest priority.

**Alternative:** If the articulos form/detail page is the main v1.2 deliverable, then the "Articulos CRUD completo" work (form groups, all ~30 fields, detail panel) should come before file upload. File upload is the last piece of the articulos form.

---

## Scalability Considerations

| Concern                  | Current (dev)             | At 1K articulos                    | At 10K+ articulos                      |
| ------------------------ | ------------------------- | ---------------------------------- | -------------------------------------- |
| File storage             | Filesystem, ~50MB         | Filesystem fine, ~500MB            | Consider S3/MinIO, serve via CDN       |
| Webhook delivery         | In-process setTimeout     | Fine, <10 deliveries/min           | BullMQ + Redis, dedicated worker       |
| API key validation       | DB query per request      | Add in-memory cache (5min TTL)     | Same cache approach, fine at any scale |
| Column config            | DB query per page load    | Cache on frontend (React Query)    | Same, never a bottleneck               |
| Webhook deliveries table | Grows with every delivery | Retention policy: delete > 30 days | Partition by month, archive old        |

---

## New API Endpoints Summary

### API Keys

```
GET    /api/api-keys              -- List all keys (shows prefix, never full key)
POST   /api/api-keys              -- Create key (returns full key ONCE)
PATCH  /api/api-keys/:id          -- Update (name, active status, expiry)
DELETE /api/api-keys/:id          -- Hard delete
```

### Webhooks

```
GET    /api/webhooks                    -- List subscriptions
POST   /api/webhooks                    -- Create subscription
PATCH  /api/webhooks/:id               -- Update subscription
DELETE /api/webhooks/:id               -- Delete subscription
POST   /api/webhooks/:id/test          -- Send test payload
GET    /api/webhooks/:id/deliveries    -- List delivery history
```

### Articulo Images

```
POST   /api/articulos/:codigo/imagenes/:tipo    -- Upload images (multipart)
DELETE /api/articulos/:codigo/imagenes/:tipo/:index -- Delete single image
```

### Column Config

```
GET    /api/settings/column-config/:tabla    -- Get config for a table
PATCH  /api/settings/column-config/:tabla    -- Update config
```

All endpoints require authentication (JWT or API key). Write endpoints require `@Roles('admin')`.

---

## Sources

- Direct codebase analysis: `apps/backend/src/main.ts` (global guard registration, static assets, CORS)
- Direct codebase analysis: `apps/backend/src/common/guards/jwt-auth.guard.ts` (JWT verification flow)
- Direct codebase analysis: `apps/backend/src/common/guards/roles.guard.ts` (role checking pattern)
- Direct codebase analysis: `apps/backend/src/modules/settings/settings.controller.ts` (FileInterceptor + upload pattern)
- Direct codebase analysis: `apps/backend/src/modules/articulos/articulos.service.ts` (CUD methods to add webhook emission)
- Direct codebase analysis: `apps/backend/src/db/schema.ts` (existing tables, jsonb image arrays)
- NestJS global guards via DI: `APP_GUARD` provider pattern -- HIGH confidence (core NestJS feature)
- NestJS `FilesInterceptor` for multi-file upload -- HIGH confidence (documented in @nestjs/platform-express)
- SHA-256 key hashing pattern: industry standard (GitHub, Stripe, AWS) -- HIGH confidence
- HMAC webhook signing: industry standard (GitHub, Stripe, Shopify) -- HIGH confidence
- PostgreSQL jsonb array operations for image lists -- HIGH confidence (well-documented)
