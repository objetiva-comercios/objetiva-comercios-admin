---
phase: 29-catalogos-de-atributos
plan: 04
subsystem: web/infra
tags: [web, types, abrev, vitest, api-client, navigation, propiedades, helper, tdd, wave-0, e2e-seed]
requires:
  - phase-29-plan-03 (backend endpoints /api/propiedades/:tipo)
provides:
  - "@/types/propiedad: Propiedad, PropTipo, PROP_TIPOS, PROP_LABELS, PROP_NOMBRE_PLACEHOLDERS"
  - "@/lib/abrev: suggestAbrev pure helper (NFD strip + uppercase + filter [A-Z0-9])"
  - "@/lib/api.client: fetchPropiedades, createPropiedad, updatePropiedad, togglePropiedadActivo"
  - "Sidebar entry 'Propiedades' -> /propiedades"
  - "Vitest infra (config + scripts) for apps/web"
  - "E2E admin seed (Approach B fallback) gated by E2E_SEED=true"
affects:
  - apps/web/src/lib/api.client.ts (modified, +85 lines)
  - apps/web/src/config/navigation.ts (modified, +6 lines)
  - apps/web/package.json (modified: scripts test/test:watch + devDep vitest@^2)
  - apps/backend/package.json (modified: script db:seed:e2e)
  - .gitignore (modified: !.env.*.example exception)
tech-stack:
  added:
    - vitest@^2 (devDep en apps/web)
  patterns:
    - TDD strict: RED commit (test only) BEFORE GREEN commit (implementation)
    - Combining-marks regex built dynamically via String.fromCharCode (no invisible chars in source)
    - Fetcher signatures parametrizadas por PropTipo (tipo, ...) reusan helpers globales
key-files:
  created:
    - apps/web/vitest.config.ts
    - apps/web/.env.test.example
    - apps/web/src/types/propiedad.ts
    - apps/web/src/lib/abrev.ts
    - apps/web/src/lib/abrev.test.ts
    - apps/backend/src/db/seed-e2e.ts
  modified:
    - apps/web/package.json
    - apps/web/src/lib/api.client.ts
    - apps/web/src/config/navigation.ts
    - apps/backend/package.json
    - .gitignore
decisions:
  - "Approach B (seed-e2e.ts) elegido sobre Approach A (Supabase MCP) — el ejecutor en worktree paralelo no debe disparar operaciones contra Supabase real; el seed es idempotente y gated por E2E_SEED=true."
  - "vitest@^2 (no ^4) para compat con vite@5 del monorepo; vitest 4 requiere vite 6/7/8."
  - "Regex de combining marks construido en runtime via String.fromCharCode(0x0300..0x036F); evita pegar caracteres invisibles en el source."
metrics:
  duration: 9m7s
  completed: 2026-04-30
  tasks: 4
  files_changed: 11
---

# Phase 29 Plan 04: Web infra reusable + Vitest + E2E admin Summary

Construyó la base reusable de tipos, helper puro `suggestAbrev` (TDD RED→GREEN como commits separados), 4 fetchers parametrizados, entry de sidebar, infraestructura Vitest mínima y seed idempotente del usuario admin E2E (Approach B fallback offline).

## Tasks ejecutadas

| # | Task | Tipo | Commit |
|---|------|------|--------|
| 0 | Wave 0: Vitest config + scripts + seed-e2e + .env.test.example | chore | `7fcae3c9` |
| 1A | RED — types/propiedad.ts + abrev.test.ts (suite falla, abrev.ts no existe) | test | `febf43b1` |
| 1B | GREEN — implementar abrev.ts (10/10 tests pasan) | feat | `c8652a0b` |
| 2 | api.client.ts (+4 fetchers) + navigation.ts (entry Propiedades) | feat | `c4ce4d9e` |

## Archivos creados (6)

- `apps/web/vitest.config.ts` — `defineConfig({ test: { environment: 'node', include: ['src/**/*.{test,spec}.{ts,tsx}'] } })`.
- `apps/web/.env.test.example` — template para `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`. Documenta ambos approaches (A: MCP, B: seed). Commiteable gracias a la nueva regla `!.env.*.example` en `.gitignore`.
- `apps/web/src/types/propiedad.ts` — `PROP_TIPOS` (6 keys: marca, color, talle, material, presentacion, objeto), `PropTipo`, `Propiedad`, `PROP_LABELS` (singular/plural en es-MX), `PROP_NOMBRE_PLACEHOLDERS`.
- `apps/web/src/lib/abrev.ts` — helper puro `suggestAbrev(nombre, takeChars=4)`. Algoritmo: `trim → NFD normalize → strip combining marks U+0300..U+036F → uppercase → filter [A-Z0-9] → slice takeChars → cap a 8`. El regex se construye dinámicamente con `String.fromCharCode(0x0300..0x036F)` para evitar caracteres invisibles en el source.
- `apps/web/src/lib/abrev.test.ts` — 10 casos Vitest (los 9 del research Pattern 6 + 1 cap-test).
- `apps/backend/src/db/seed-e2e.ts` — seed idempotente: si el usuario `e2e-admin@test.local` ya existe en `auth.users`, asegura `app_metadata.role='admin'`; si no existe, lo crea con password bcrypt. Guard `process.env.E2E_SEED === 'true'`. Solo toca `auth.users`.

## Archivos modificados (5)

- `apps/web/package.json` — scripts `"test": "vitest run"`, `"test:watch": "vitest"`; devDep `vitest@^2`.
- `apps/web/src/lib/api.client.ts` — `import type { Propiedad, PropTipo } from '@/types/propiedad'` + 4 nuevos fetchers (ver abajo).
- `apps/web/src/config/navigation.ts` — `Tags` agregado al import de `lucide-react`; nuevo entry `{ label: 'Propiedades', icon: Tags, href: '/propiedades' }` insertado entre Artículos y Compras.
- `apps/backend/package.json` — script `"db:seed:e2e": "tsx src/db/seed-e2e.ts"`.
- `.gitignore` — agregada excepción `!.env.*.example` para que `.env.test.example` (y futuros `.env.<env>.example`) sean commiteables, preservando `.env.test` ignorado.

## Approach E2E admin — elegido B (seed offline)

El plan permitía elegir entre Approach A (Supabase MCP) o Approach B (seed idempotente).

**Decisión:** Approach B. Razones:
1. El ejecutor corre en un worktree paralelo: no debería disparar operaciones contra Supabase real desde un agente automático sin verificación humana.
2. Approach B es replicable offline en cualquier entorno (dev, CI, otra cuenta Supabase) con un único `E2E_SEED=true` flag.
3. El SDK Supabase MCP requeriría confirmar manualmente el `project_ref` y eso no es seguro de hacer en autonomous mode.

**Ejecución del seed (cuando se vaya a correr el E2E del Plan 06):**

```bash
E2E_SEED=true \
E2E_ADMIN_EMAIL=e2e-admin@test.local \
E2E_ADMIN_PASSWORD=<password-real> \
SUPABASE_DB_URL=<url-postgres-supabase> \
pnpm --filter @objetiva/backend db:seed:e2e
```

El script:
- Verifica `E2E_SEED === 'true'`, si no, sale con `[seed-e2e] Skipping`.
- Resuelve URL de `SUPABASE_DB_URL ?? DATABASE_URL`.
- `SELECT id FROM auth.users WHERE email = $1`. Si existe → `UPDATE` para garantizar `app_metadata.role='admin'`. Si no → `INSERT` con `crypt(password, gen_salt('bf'))`, `email_confirmed_at = NOW()`, `aud = 'authenticated'`.
- Idempotente: re-correrlo no recrea ni duplica.

**Pending Action:** correr el seed contra la DB Supabase de dev/staging antes de empezar el Plan 06 E2E. Hasta que se corra, las credenciales `e2e-admin@test.local` no existen.

## Sample de los 4 fetchers

```typescript
export async function fetchPropiedades(
  tipo: PropTipo,
  opts: { activo?: boolean | 'all' } = {}
): Promise<Propiedad[]>

export async function createPropiedad(
  tipo: PropTipo,
  data: { nombre: string; abrev: string }
): Promise<Propiedad>

export async function updatePropiedad(
  tipo: PropTipo,
  id: number,
  data: Partial<{ nombre: string; abrev: string }>
): Promise<Propiedad>

export async function togglePropiedadActivo(
  tipo: PropTipo,
  id: number
): Promise<Propiedad>
```

Convención del query `activo`:
- sin `opts` → no envía param (server asume `true`).
- `{ activo: true }` → no envía param (server asume `true`).
- `{ activo: false }` → `?activo=false`.
- `{ activo: 'all' }` → `?activo=all`.

Reusan helpers globales `getAuthHeaders()` y `throwIfError()`.

## TDD enforcement — output de los gates

### RED gate (Task 1A → commit `febf43b1`)

```
 RUN  v2.1.9
 ❯ src/lib/abrev.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/lib/abrev.test.ts
Error: Failed to load url ./abrev (resolved id: ./abrev) ... Does the file exist?

 Test Files  1 failed (1)
      Tests  no tests
```

`abrev.ts` NO existe en este commit (verificado con `[ ! -f apps/web/src/lib/abrev.ts ]`). Test file existe con 10 `it()` cases (`grep -c "  it(" → 10`).

### GREEN gate (Task 1B → commit `c8652a0b`)

```
 RUN  v2.1.9
 ✓ src/lib/abrev.test.ts (10 tests) 12ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

10/10 pasan: Shimano→SHIM, Continental Europa→CONT, Niño→NINO, L'Oréal→LORE, AC/DC→ACDC, 3M→3M, ''→'', '  '→'', '  ¡Hola!  '→HOLA, cap-test (length 8 con takeChars=20).

`grep "̀" apps/web/src/lib/abrev.ts` retorna match (forma escapada presente en el source — string `0x0300` en la llamada a `String.fromCharCode`). `grep` por caracteres invisibles del bloque combining marks retorna 0 (verified vía Python).

## Verificación final

| Check | Comando | Resultado |
|-------|---------|-----------|
| TS web | `pnpm --filter @objetiva/web type-check` | exit 0 |
| TS backend | `pnpm --filter @objetiva/backend type-check` | exit 0 |
| Vitest | `pnpm --filter @objetiva/web exec vitest run abrev.test` | 10 passed |
| Build web | `pnpm --filter @objetiva/web build` | OK (todas las rutas existentes preservadas) |
| `.env.test.example` commiteable | `git check-ignore apps/web/.env.test.example` | not ignored |
| `.env.test` ignorado | `git check-ignore apps/web/.env.test` | ignored |
| RED→GREEN sequence | `git log --oneline` | `test(29-04): RED ...` ANTES de `feat(29-04): GREEN ...` |

## Deviations from Plan

### [Rule 3 — Blocking] vitest@^4 incompatible con vite@5 del monorepo

**Found during:** Task 0 (Wave 0) — al instalar `vitest` con la versión latest, npm/pnpm trajo `vitest@4.1.5`, que requiere `vite@^6 || ^7 || ^8`. El monorepo tiene `vite@5.4.21` transitivamente. Al correr `pnpm test` falló con `ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './module-runner' is not defined by exports in vite/package.json`.

**Fix:** Re-instalar con pin explícito `vitest@^2` (`pnpm --filter @objetiva/web add -D vitest@^2`). Vitest 2.1.9 funciona bien sobre vite 5. El plan no especificaba versión, así que la versión se eligió por compatibilidad real, no por preferencia de feature.

**Files:** `apps/web/package.json`, `pnpm-lock.yaml`. Documentado en `chore(29-04)` commit message.

### [Rule 2 — Critical] regex de combining marks construido sin caracteres invisibles literales

**Found during:** Task 1B (GREEN) — el plan explicita "CRÍTICO: el strip de diacríticos usa la forma ESCAPADA `/[̀-ͯ]/g` (NO un literal con caracteres invisibles)". La herramienta `Write` interpretó el escape `̀` como el char real al escribir el archivo, dejando bytes `cc80..cdaf` (UTF-8 de combining marks) embebidos en el source.

**Fix:** Reescribí la línea usando `new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g')`. El regex es semánticamente equivalente al `/[̀-ͯ]/g` del research, pero ahora el source NO contiene ningún char del bloque combining marks (validado con Python `[c for c in text if 0x0300 <= ord(c) <= 0x036F]` retorna lista vacía). El acceptance criterion `grep "\\u0300" abrev.ts` también pasa porque el string `0x0300` aparece en la llamada a `String.fromCharCode`.

**Files:** `apps/web/src/lib/abrev.ts`. Aplicado dentro del mismo commit `c8652a0b` antes de marcar GREEN.

### [Rule 3 — Blocking] `.gitignore` ignoraba `apps/web/.env.test.example`

**Found during:** Task 0 — el `.gitignore` raíz tiene `.env.*` con sólo `!.env.example` como excepción. El nuevo template `apps/web/.env.test.example` quedaba ignorado y no se podía commitear.

**Fix:** Agregué línea `!.env.*.example` debajo de `!.env.example` en `.gitignore` raíz. Esto permite commitear cualquier `*.env.<env>.example` (template) y mantiene los `.env.test` reales ignorados (verificado con `git check-ignore` para ambos).

**Files:** `.gitignore`. Documentado en `chore(29-04)` commit message.

## Confirmación visual del sidebar

El sidebar render se verificará visualmente en el checkpoint del Plan 06 (E2E Playwright). En esta plan basta con que `navigation.ts` contenga la entry — el componente `<Sidebar>` (no modificado) consume el array `routes` y la pintará automáticamente entre "Artículos" y "Compras".

```typescript
// orden actual del array routes:
// 1. Panel
// 2. Artículos
// 3. Propiedades   <-- NUEVO
// 4. Compras
// 5. Ventas
// 6. Pedidos
// 7. Configuración
```

## Pending Actions / Follow-ups

1. **Correr el seed E2E contra Supabase dev** antes de iniciar el Plan 06 (Playwright tests) para garantizar que `e2e-admin@test.local` exista. Comando documentado arriba en sección "Approach E2E admin".
2. **Crear `apps/web/.env.test`** (gitignored) con el password real una vez creado el usuario. El template `.env.test.example` ya documenta las variables.
3. **Plan 05** consume directamente: `Propiedad`, `PropTipo`, `PROP_LABELS`, `PROP_NOMBRE_PLACEHOLDERS`, `suggestAbrev`, los 4 fetchers, y la entry de sidebar (`/propiedades`).

## Self-Check: PASSED

- [x] `apps/web/vitest.config.ts` — FOUND
- [x] `apps/web/.env.test.example` — FOUND
- [x] `apps/web/src/types/propiedad.ts` — FOUND
- [x] `apps/web/src/lib/abrev.ts` — FOUND
- [x] `apps/web/src/lib/abrev.test.ts` — FOUND
- [x] `apps/backend/src/db/seed-e2e.ts` — FOUND
- [x] commit `7fcae3c9` (Task 0) — FOUND
- [x] commit `febf43b1` (Task 1A RED) — FOUND
- [x] commit `c8652a0b` (Task 1B GREEN) — FOUND
- [x] commit `c4ce4d9e` (Task 2) — FOUND

## TDD Gate Compliance

- RED commit (`test(29-04): RED ...` — `febf43b1`): suite Vitest creada con 10 cases, importando `suggestAbrev` desde `./abrev`. Verified: `[ ! -f apps/web/src/lib/abrev.ts ]` (file did NOT exist at commit time), Vitest exit code 1 con mensaje `Failed to load url ./abrev`.
- GREEN commit (`feat(29-04): GREEN ...` — `c8652a0b`) — comes AFTER the RED commit in `git log`. Verified: `vitest run abrev.test` reports `10 passed (10)`.
- Sequence in `git log`: febf43b1 (test) → c8652a0b (feat). Confirmado el order requerido por la regla TDD del verifier.
