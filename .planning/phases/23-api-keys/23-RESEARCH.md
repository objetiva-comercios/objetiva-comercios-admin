# Phase 23: API Keys - Research

**Researched:** 2026-03-12
**Domain:** API key management — NestJS guard composition, SHA-256 hashing, Drizzle schema, Next.js admin-only UI
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Formato y seguridad de la key**

- Formato con prefijo: `obj_sk_` + random (largo total ~40 chars). Estilo Stripe.
- En la tabla se muestra solo `obj_sk_...xxxx` (últimos 4 chars)
- Almacenamiento: hash SHA-256 en DB. La key completa se muestra UNA vez al crear.
- Sin expiración — válidas hasta revocación manual
- Sin límite de cantidad de keys activas

**Rol y permisos**

- Toda API key tiene rol `admin` implícito — no configurable por key
- Solo usuarios con rol admin (JWT) pueden crear y revocar keys
- Viewers no ven la sección "API Keys" en Settings (oculta completamente)
- Identidad del request: `userId = 'apikey:{nombre}'`, email vacío, role = 'admin'
- Las rutas CRUD de api-keys solo aceptan JWT de Supabase (no API key) — evita escalación si una key se compromete

**UI en Settings**

- Nueva sección "API Keys" en sidebar de Settings (7mo item), solo visible para admins
- Lista de keys: tabla compacta con columnas Nombre, Key (prefijo), Creada, Último uso, Acción (Revocar)
- Crear key: Dialog modal con campo nombre → al confirmar, segundo Dialog muestra key completa con botón copiar + warning "No se mostrará de nuevo"
- Revocar key: AlertDialog con nombre de la key: "¿Revocar 'X'? Los sistemas que usen esta key dejarán de funcionar inmediatamente"
- Keys revocadas: soft-delete (revokedAt timestamp), ocultas de la tabla — solo se muestran activas

**Comportamiento del guard**

- CompositeAuthGuard reemplaza JwtAuthGuard como guard global
- Flujo: intenta JWT primero → si falla, busca API key hasheada en DB → si ambas fallan, 401
- lastUsedAt se actualiza en cada request autenticado con API key (bajo volumen esperado)
- Rutas @Public() siguen sin requerir auth — sin cambios

### Claude's Discretion

- Schema exacto de la tabla `api_keys` (campos, índices)
- Generación del random de la key (crypto.randomBytes o similar)
- Diseño exacto de los Dialogs (spacing, iconos, colores del warning)
- Si usar tabla simple HTML o ServerDataTable para la lista de keys (pocas filas esperadas)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID        | Description                                                                                     | Research Support                                                        |
| --------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| APIKEY-01 | Admin can create a new API key with a descriptive name, key is shown once and copyable          | Dialog two-step pattern + crypto.randomBytes + SHA-256 hashing findings |
| APIKEY-02 | Admin can list active API keys (showing name, prefix, creation date, last used) and revoke them | Drizzle table schema + soft-delete pattern + NestJS CRUD endpoints      |
| APIKEY-03 | External systems can authenticate via Bearer token (API key) independent of Supabase Auth       | CompositeAuthGuard architecture + JwtAuthGuard extension pattern        |
| APIKEY-04 | System tracks last usage timestamp for each API key                                             | lastUsedAt field + fire-and-forget UPDATE pattern in guard              |

</phase_requirements>

---

## Summary

Phase 23 adds a classic API key system to this NestJS + Next.js 14 monorepo. The work splits cleanly into three domains: (1) a new Drizzle table `api_keys` added to the existing schema, (2) a `CompositeAuthGuard` in NestJS that tries JWT first and falls back to API key lookup, and (3) an admin-only page in the Settings section with create/revoke UI.

The most technically interesting piece is the `CompositeAuthGuard`. The existing `JwtAuthGuard` already holds the JWKS client and `@Public()` logic. The composite guard should copy that structure rather than extend it, to keep concerns separate. It needs to catch JWT verification failures (not just missing tokens) and attempt the API key path before returning 401. The `lastUsedAt` update must be a non-blocking fire-and-forget — the guard should not await the DB write on the hot path.

On the frontend, the primary decision point (Claude's Discretion) is whether to use a full `ServerDataTable` or a simple static table. Given low row count (typically < 20 keys), a simple server-rendered table with client-side mutation is the right call — no need for TanStack Table overhead here. Role visibility on the sidebar item requires reading `app_metadata.role` from the Supabase user object, which is available in Server Components via `supabase.auth.getUser()`.

**Primary recommendation:** Build the backend module first (schema + service + controller + guard swap), then the frontend page. The guard swap is the most critical change — it touches every authenticated request.

---

## Standard Stack

### Core

| Library                     | Version                     | Purpose                                                                           | Why Standard                              |
| --------------------------- | --------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| Node.js `crypto` (built-in) | Node 20 built-in            | `crypto.randomBytes(32)` for key entropy, `createHash('sha256')` for storage hash | Zero deps, CSPRNG, already in the runtime |
| `drizzle-orm`               | ^0.45.1 (already installed) | `api_keys` table definition and queries                                           | Already the project ORM                   |
| `@nestjs/common`            | ^10 (already installed)     | Guard, controller, service decorators                                             | Already the project framework             |
| `jose`                      | ^5.0.0 (already installed)  | JWT verification in CompositeAuthGuard                                            | Already used by JwtAuthGuard              |

### Supporting

| Library                        | Version                      | Purpose                              | When to Use                                  |
| ------------------------------ | ---------------------------- | ------------------------------------ | -------------------------------------------- |
| `lucide-react`                 | ^0.563.0 (already installed) | `Key` icon for Settings sidebar item | Already used throughout web app              |
| `@radix-ui/react-dialog`       | already installed            | Create key + show-once dialog flows  | Already in project UI components             |
| `@radix-ui/react-alert-dialog` | already installed            | Revoke confirmation                  | Already in project, matches Phase 19 pattern |

### Alternatives Considered

| Instead of                          | Could Use                        | Tradeoff                                                                                                              |
| ----------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Node.js `crypto` built-in           | `bcrypt` for hashing             | bcrypt is designed for slow password hashing — overkill and wrong for lookup-by-hash; SHA-256 is correct for API keys |
| Simple server table                 | TanStack Table / ServerDataTable | Full table overhead not justified for < 20 rows; simple table matches Settings pages like depositos/page.tsx          |
| Fire-and-forget `lastUsedAt` update | Await update in guard            | Awaiting adds latency to every authenticated request; non-blocking is the right pattern at this volume                |

**Installation:** No new packages needed. All dependencies are already in `apps/backend/package.json` and `apps/web/package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/
├── common/guards/
│   ├── jwt-auth.guard.ts          (existing — keep as-is)
│   └── composite-auth.guard.ts    (NEW — replaces jwt-auth as APP_GUARD)
├── modules/api-keys/
│   ├── api-keys.module.ts         (NEW)
│   ├── api-keys.controller.ts     (NEW — JWT-only routes for CRUD)
│   ├── api-keys.service.ts        (NEW — generate, list, revoke, lookup)
│   └── dto/
│       └── create-api-key.dto.ts  (NEW)
└── db/schema.ts                   (MODIFY — add api_keys table)

apps/web/src/
├── app/(dashboard)/settings/api-keys/
│   └── page.tsx                   (NEW — server component, admin-only)
├── components/settings/
│   ├── settings-nav.tsx           (MODIFY — add Key item conditionally)
│   └── api-keys/
│       ├── api-keys-list.tsx      (NEW — client component, table + dialogs)
│       └── create-key-dialog.tsx  (NEW — two-step dialog flow)
└── lib/api.client.ts              (MODIFY — add api key CRUD functions)
```

### Pattern 1: CompositeAuthGuard — try JWT, fallback to API key

```typescript
// apps/backend/src/common/guards/composite-auth.guard.ts
@Injectable()
export class CompositeAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeysService: ApiKeysService,
  ) {
    // same JWKS setup as JwtAuthGuard
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. @Public() bypass — unchanged
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [...])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('...')
    }

    const token = authHeader.substring(7)

    // 2. Try JWT first
    try {
      const { payload } = await jwtVerify(token, this.jwks, { issuer: ..., audience: ... })
      request.user = this.extractUserFromJwt(payload)
      return true
    } catch {
      // JWT failed — fall through to API key check
    }

    // 3. Try API key
    const apiKey = await this.apiKeysService.findByToken(token)
    if (apiKey) {
      request.user = {
        userId: `apikey:${apiKey.name}`,
        email: '',
        role: 'admin',
      }
      // Fire-and-forget — do NOT await
      void this.apiKeysService.updateLastUsed(apiKey.id)
      return true
    }

    throw new UnauthorizedException('Token inválido o expirado')
  }
}
```

**Key detail:** `findByToken` receives the raw token, hashes it with SHA-256, then queries `WHERE keyHash = $hash AND revokedAt IS NULL`.

### Pattern 2: app.module.ts guard swap

```typescript
// apps/backend/src/app.module.ts
import { APP_GUARD } from '@nestjs/core'
import { CompositeAuthGuard } from './common/guards/composite-auth.guard'
import { ApiKeysModule } from './modules/api-keys/api-keys.module'

@Module({
  imports: [
    DbModule,
    AuthModule,
    ApiKeysModule, // ADD
    // ... other modules
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CompositeAuthGuard, // REPLACES JwtAuthGuard
    },
    // RolesGuard if currently registered here — keep it
  ],
})
export class AppModule {}
```

**Important:** Check current `app.module.ts` — `JwtAuthGuard` is currently NOT registered as APP_GUARD there (it's used via `@UseGuards` per-controller or per-route). The composite guard needs to be added as APP_GUARD, which means all routes become guarded by default. Verify existing controller decorators don't double-apply the guard.

### Pattern 3: API key generation and hashing

```typescript
// apps/backend/src/modules/api-keys/api-keys.service.ts
import { createHash, randomBytes } from 'node:crypto'

generateKeyPair(name: string): { fullKey: string; keyHash: string; prefix: string } {
  // 32 random bytes → 64 hex chars
  const random = randomBytes(32).toString('hex')
  // Total key: "obj_sk_" + first 33 hex chars = ~40 chars total
  const fullKey = `obj_sk_${random.substring(0, 33)}`
  // Display prefix: "obj_sk_...XXXX" (last 4 of the random part)
  const prefix = `obj_sk_...${random.substring(29, 33)}`
  // Store only the SHA-256 hash — never the full key
  const keyHash = createHash('sha256').update(fullKey).digest('hex')
  return { fullKey, keyHash, prefix }
}
```

**Why SHA-256 (not bcrypt):** API key auth requires O(1) hash lookup — `WHERE keyHash = $computed_hash`. bcrypt is intentionally slow and can't be used for equality lookups this way. SHA-256 is the industry standard for this pattern (see Stripe, GitHub).

### Pattern 4: Drizzle table schema for api_keys

```typescript
// apps/backend/src/db/schema.ts — add at end

export const apiKeys = pgTable(
  'api_keys',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
    prefix: varchar('prefix', { length: 20 }).notNull(), // "obj_sk_...xxxx"
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),
  },
  table => [
    uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
    index('api_keys_revoked_at_idx').on(table.revokedAt),
  ]
)

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
```

**No userId FK:** API keys are system-level credentials, not per-user. The `createdBy` field was considered but excluded (CONTEXT.md did not request it and admin-only access makes it redundant).

### Pattern 5: Admin-only Settings nav item

```typescript
// apps/web/src/app/(dashboard)/settings/api-keys/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

export default async function ApiKeysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role from app_metadata
  const role = user.app_metadata?.role ?? 'viewer'
  if (role !== 'admin') notFound()  // or redirect('/settings')

  // Fetch active keys from backend (server-side, JWT auth)
  const keys = await fetchApiKeys()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Gestioná las keys de acceso para sistemas externos
        </p>
      </div>
      <ApiKeysList keys={keys} />
    </div>
  )
}
```

**Settings nav conditional item:**

```typescript
// settings-nav.tsx — add to settingsNavItems array (position 7, after Apariencia):
// BUT: the nav is a Client Component ('use client') — cannot call supabase server there.
// Solution: Read role from Supabase client session in the browser.
// OR: Pass role as prop from the server-side layout.
```

**Critical nav item consideration:** `settings-nav.tsx` is a `'use client'` component. It cannot call `createClient()` (server-side). Two viable approaches:

1. Pass `role` as prop from `settings/layout.tsx` (Server Component) — cleanest, already reads user
2. Use `createBrowserSupabaseClient()` in the nav to get session — adds async complexity

Approach 1 is recommended: modify `settings/layout.tsx` to fetch role and pass `{ userRole }` prop to `SettingsNav`.

### Pattern 6: Two-step create key dialog

```
Step 1: "Nueva API Key" Dialog
  - Input: Nombre (required, maxLength 100)
  - Botones: Cancelar | Crear

Step 2: "Key creada" Dialog (replaces or stacks on step 1)
  - Heading: "Tu nueva API Key"
  - Warning box (amber/yellow): "Guardá esta key ahora. No se mostrará de nuevo."
  - Code display: full key in monospace, selectable
  - Button: "Copiar al portapapeles" (navigator.clipboard.writeText)
  - Confirm: "Entendido, guardé la key"
```

**Implementation:** Use a single `Dialog` with internal state `step: 'create' | 'reveal'`. When step='reveal', replace dialog content — the created key data is in component state. No route change needed.

### Anti-Patterns to Avoid

- **Storing the full key:** Never persist the plaintext key. After generating, hash immediately and discard the original. Only return it in the API response once.
- **Awaiting lastUsedAt update in the guard:** This adds DB latency to every authenticated request. Use `void service.updateLastUsed(id)` — fire and forget.
- **Using JwtAuthGuard on api-keys CRUD routes via APP_GUARD:** Once CompositeAuthGuard is APP_GUARD, it covers everything. API-keys CRUD routes are protected by JWT implicitly (they require a JWT because API keys can't manage API keys — enforced by rejecting API key auth for these routes via a custom decorator or by checking `userId.startsWith('apikey:')` in the service).
- **Double-guarding:** If CompositeAuthGuard is APP_GUARD, don't also add `@UseGuards(JwtAuthGuard)` on individual controllers — that would run two guards.

---

## Don't Hand-Roll

| Problem                  | Don't Build                        | Use Instead                                      | Why                                                                 |
| ------------------------ | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| Secure random generation | Custom UUID or Math.random         | `crypto.randomBytes(32)`                         | CSPRNG, constant-time, built into Node                              |
| Key hashing for lookup   | Custom encoding, base64 comparison | `createHash('sha256').update(key).digest('hex')` | Standard pattern, deterministic, no salt needed for lookup equality |
| Copy to clipboard        | Manual DOM manipulation            | `navigator.clipboard.writeText()`                | Browser API, already available, handles permissions                 |

**Key insight:** The entire security of API keys rests on SHA-256 being pre-image resistant. An attacker with DB access sees only hashes — they cannot reverse-engineer keys. This is why you never need to "salt" API key hashes (unlike passwords): the key itself has 256 bits of entropy from `randomBytes(32)`, making rainbow tables infeasible.

---

## Common Pitfalls

### Pitfall 1: Guard circular dependency via ApiKeysService

**What goes wrong:** `CompositeAuthGuard` depends on `ApiKeysService`. If `ApiKeysModule` imports something that transitively uses `APP_GUARD`, you get a circular dependency.
**Why it happens:** APP_GUARD is registered in AppModule but needs a service from ApiKeysModule; NestJS resolves this at bootstrap.
**How to avoid:** `ApiKeysModule` must NOT import `AuthModule` or any module that imports the guard. Keep `ApiKeysModule` deps to just `DbModule` (which is `@Global()` — no explicit import needed).
**Warning signs:** Bootstrap error "Nest can't resolve dependencies of CompositeAuthGuard".

### Pitfall 2: Blocking the guard with DB writes

**What goes wrong:** `await this.apiKeysService.updateLastUsed(id)` in the guard adds a DB round-trip to every API key authenticated request.
**Why it happens:** Temptation to make the update transactional with the request.
**How to avoid:** `void this.apiKeysService.updateLastUsed(id)` — explicitly fire-and-forget. Log but don't throw if it fails.
**Warning signs:** Noticeably higher latency on API key authenticated endpoints vs JWT endpoints.

### Pitfall 3: Settings nav role check breaks for viewers

**What goes wrong:** Viewer navigates directly to `/settings/api-keys` and sees a 404 or crash instead of a graceful redirect.
**Why it happens:** If only the nav is hidden but the page has no guard.
**How to avoid:** Always guard the page itself (`if (role !== 'admin') redirect('/settings')`) in addition to hiding the nav link. Both layers are needed.
**Warning signs:** Direct URL navigation exposes the page to viewer-role users.

### Pitfall 4: APP_GUARD not wired for ApiKeysModule

**What goes wrong:** CompositeAuthGuard is declared but never registered as APP_GUARD — routes remain unprotected or still use the old behavior.
**Why it happens:** Current code uses `@UseGuards(JwtAuthGuard)` decorators on individual controllers, not APP_GUARD. Need to check if there's an existing APP_GUARD registration.
**How to avoid:** Search `app.module.ts` for existing APP_GUARD provider. The current `app.module.ts` does NOT have an APP_GUARD — guards are applied per-controller. Adding APP_GUARD will make ALL routes (except `@Public()`) require auth.
**Warning signs:** After adding APP_GUARD, previously unprotected endpoints start returning 401.

### Pitfall 5: `prefix` display collision

**What goes wrong:** Two different keys could produce the same display prefix `obj_sk_...xxxx` if the last 4 chars of the random portion collide.
**Why it happens:** 4 hex chars = 16^4 = 65,536 possibilities; with < 20 keys, collision is extremely unlikely but not impossible.
**How to avoid:** The prefix is display-only — it doesn't need to be unique. The `keyHash` (unique index) is the actual identifier. Don't add a unique constraint on `prefix`.
**Warning signs:** Migration fails on unique constraint for prefix column.

---

## Code Examples

### Creating a key (service)

```typescript
// Source: Node.js crypto docs + project pattern
async create(name: string, db: PostgresJsDatabase): Promise<{ key: ApiKey; fullKey: string }> {
  const random = randomBytes(32).toString('hex')
  const fullKey = `obj_sk_${random.substring(0, 33)}`
  const prefix = `obj_sk_...${random.substring(29, 33)}`
  const keyHash = createHash('sha256').update(fullKey).digest('hex')

  const [created] = await db
    .insert(apiKeys)
    .values({ name, keyHash, prefix })
    .returning()

  return { key: created, fullKey }  // fullKey returned ONCE, never stored
}
```

### Looking up by token (service)

```typescript
// Called from CompositeAuthGuard
async findByToken(token: string): Promise<ApiKey | null> {
  const hash = createHash('sha256').update(token).digest('hex')
  const [found] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1)
  return found ?? null
}
```

### Revoking (service)

```typescript
async revoke(id: number): Promise<void> {
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
}
```

### Listing active keys (service)

```typescript
async findAll(): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKeys)
    .where(isNull(apiKeys.revokedAt))
    .orderBy(desc(apiKeys.createdAt))
}
```

### Frontend: copy to clipboard

```typescript
// In 'use client' component, after key is revealed
async function handleCopy(key: string) {
  await navigator.clipboard.writeText(key)
  // Show toast: "Key copiada al portapapeles"
}
```

---

## State of the Art

| Old Approach                         | Current Approach                        | When Changed          | Impact                                                                  |
| ------------------------------------ | --------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| Per-route `@UseGuards(JwtAuthGuard)` | Single `APP_GUARD` with composite logic | Phase 23 (this phase) | All routes automatically protected, no per-controller decoration needed |
| JWT-only authentication              | JWT + API key composite                 | Phase 23 (this phase) | Enables external system integration                                     |

**Deprecated/outdated:**

- `JwtAuthGuard` as the only auth path: replaced by `CompositeAuthGuard`. The `JwtAuthGuard` class can be kept for reference but is no longer registered as APP_GUARD.

---

## Open Questions

1. **Does current code have an APP_GUARD already?**
   - What we know: `app.module.ts` does NOT currently register APP_GUARD — auth is per-controller via `@UseGuards`
   - What's unclear: Some controllers (orders, sales, etc.) may already use `@UseGuards(JwtAuthGuard)` — these will double-execute the JWT logic if APP_GUARD is also set
   - Recommendation: Before adding APP_GUARD, audit which controllers use `@UseGuards(JwtAuthGuard)` and remove those decorators to avoid double-guarding. Or, only add `@UseGuards` to specific controllers that need API key support. **Simpler approach**: keep current per-controller pattern, add CompositeAuthGuard only where needed for now. But CONTEXT.md says "CompositeAuthGuard reemplaza JwtAuthGuard como guard global" — so proceed with APP_GUARD and remove per-controller `@UseGuards(JwtAuthGuard)` decorators.

2. **How does the settings/layout.tsx pass role to SettingsNav?**
   - What we know: `settings/layout.tsx` is a Server Component; `settings-nav.tsx` is `'use client'`; role is in `user.app_metadata.role`
   - What's unclear: Current layout doesn't fetch user — the dashboard `(dashboard)/layout.tsx` does. Settings layout only renders the nav structure.
   - Recommendation: Modify `apps/web/src/app/(dashboard)/settings/layout.tsx` to add `supabase.auth.getUser()` call, extract role, and pass it as prop to `SettingsNav`. This is a small, isolated change.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| Framework          | None detected (no jest.config, no vitest.config, no test/ dir) |
| Config file        | None — Wave 0 gap                                              |
| Quick run command  | N/A                                                            |
| Full suite command | N/A                                                            |

### Phase Requirements → Test Map

| Req ID    | Behavior                                               | Test Type   | Automated Command                                         | File Exists?     |
| --------- | ------------------------------------------------------ | ----------- | --------------------------------------------------------- | ---------------- |
| APIKEY-01 | Key generation returns full key once, stores only hash | manual-only | verify via POST /api/api-keys + inspect DB                | ❌ no test infra |
| APIKEY-02 | List returns active keys only; revoke sets revokedAt   | manual-only | GET /api/api-keys before/after DELETE                     | ❌ no test infra |
| APIKEY-03 | Bearer token auth works for any protected endpoint     | manual-only | curl -H "Authorization: Bearer obj*sk*..." /api/articulos | ❌ no test infra |
| APIKEY-04 | lastUsedAt updates on API key auth                     | manual-only | check DB after request                                    | ❌ no test infra |

### Sampling Rate

- **Per task commit:** Manual smoke test — create a key via UI, use it with curl against `/api/articulos`
- **Per wave merge:** Verify revoke invalidates the key (curl returns 401)
- **Phase gate:** All 4 APIKEY requirements manually verified before `/gsd:verify-work`

### Wave 0 Gaps

- No automated test infrastructure detected in this project (no Jest, no Vitest)
- All validation is manual / integration-by-observation
- _(If no gaps: this project has no test setup — manual verification is the established pattern)_

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `apps/backend/src/common/guards/jwt-auth.guard.ts`, `app.module.ts`, `db/schema.ts`, `db/index.ts`
- Direct codebase inspection — `apps/web/src/components/settings/settings-nav.tsx`, `settings/layout.tsx`
- Node.js built-in `crypto` module — no version concerns, available in Node 20

### Secondary (MEDIUM confidence)

- API key security patterns (SHA-256 for lookup, `randomBytes` for entropy) — well-established industry practice matching Stripe/GitHub token format
- NestJS APP_GUARD pattern — standard NestJS docs pattern for global guards

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new dependencies, all existing
- Architecture: HIGH — based on direct codebase reading, established NestJS/Next.js patterns
- Pitfalls: HIGH — derived from actual code structure (circular deps, double-guard risk are real given current setup)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable stack)
