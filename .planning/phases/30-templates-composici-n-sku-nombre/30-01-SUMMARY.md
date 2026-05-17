---
phase: 30-templates-composici-n-sku-nombre
plan: 01
subsystem: shared-utils

tags:
  - composer
  - typescript
  - vitest
  - tdd
  - shared-utils
  - monorepo-workspace

# Dependency graph
requires:
  - phase: 29-catalogos-de-atributos
    provides: stripSep pattern (D-12), separator '-' convention (D-11)
provides:
  - 'Funciones puras stripSep, composeSku, composeNombre en @objetiva/utils'
  - 'Tipos compartidos Template, TemplateAtributo, AtributosMap en @objetiva/types'
  - 'Backend declara @objetiva/utils como workspace dep (PITFALL-5 cerrado)'
  - 'Suite Vitest 17/17 GREEN cubriendo los 8 casos de borde críticos'
affects:
  - 30-02 (migration agrega articulos_templates + seed)
  - 30-03 (backend module consume composer al armar templates)
  - 30-04 (frontend UI muestra preview SKU/nombre)
  - 32 (Variantes UI: ArticuloForm consume composer en tiempo real)

# Tech tracking
tech-stack:
  added: [] # NO se instalaron dependencias externas (PITFALL-6: NO slugify)
  patterns:
    - 'Función pura testeable en packages/utils (sin side effects, sin imports de apps/)'
    - 'Tipos pure-types en packages/types (sin Zod, sin lógica) en archivo dedicado por dominio'
    - 'Workspace dep explícita (no hoisting accidental) packages/utils → @objetiva/types'
    - 'Tests Vitest viven en apps/web aunque la implementación esté en packages/utils (backend no tiene framework de tests — PITFALL-4)'

key-files:
  created:
    - packages/types/src/template.ts
    - packages/utils/src/composer.ts
    - apps/web/src/lib/composer.test.ts
  modified:
    - packages/types/src/index.ts (barrel: + export * from './template')
    - packages/utils/src/index.ts (barrel: + export * from './composer')
    - packages/utils/package.json (+ dependencies."@objetiva/types": workspace:*)
    - apps/backend/package.json (+ dependencies."@objetiva/utils": workspace:*)
    - pnpm-lock.yaml (sync)

key-decisions:
  - "stripSep usa regex /[-_.\\s]+/g (colapsa separadores consecutivos en un solo paso)"
  - '.slice() antes de .sort() para no mutar template.atributos (defensa: composer es pure)'
  - 'Type predicate .filter((v): v is string => Boolean(v)) para narrow desde string|undefined → string sin cast'
  - 'Tipos viven en packages/types/src/template.ts (no en index.ts) — alinea con D-13/D-16/D-17 y deja espacio para futuros tipos de templates'
  - 'packages/utils/package.json declara @objetiva/types explícitamente — evita el hoisting accidental documentado en feedback_schema_drift_silencioso.md'

patterns-established:
  - 'Composer puro: filter → slice → sort → map → filter Boolean → join (algoritmo D-16/D-17 reutilizable)'
  - 'Suite Vitest con fixtures locales (templateDefault, templateConVariantes) para evitar dependencias en seed real de DB'

requirements-completed:
  - TPL-03
  - TPL-04

# Metrics
duration: 6min
completed: 2026-05-17
---

# Phase 30 Plan 01: Shared Composer + Tipos (Wave 0) Summary

**Funciones puras `composeSku`/`composeNombre` con 17 tests Vitest GREEN y tipos compartidos `Template`/`TemplateAtributo`/`AtributosMap` listos para que Waves 1-3 los consuman.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-17T03:14:00Z
- **Completed:** 2026-05-17T03:20:43Z
- **Tasks:** 4
- **Files created:** 3
- **Files modified:** 5

## Accomplishments

- `@objetiva/types` exporta `Template`, `TemplateAtributo`, `AtributosMap` — la nueva fuente de verdad de los tipos de template para todo el monorepo.
- `@objetiva/utils` exporta `stripSep`, `composeSku`, `composeNombre` — funciones puras, sin side effects, sin dependencias externas (slugify NO instalado — PITFALL-6 honrado).
- Suite Vitest de 17 tests GREEN cubre los 8 casos de borde críticos documentados en RESEARCH/VALIDATION (`stripSep` 5 casos, `composeNombre` 4 casos, `composeSku` 8 casos).
- `apps/backend` declara `@objetiva/utils` como workspace dep — PITFALL-5 cerrado: Plan 03 puede importar el composer sin riesgo de fallo de resolución.
- `packages/utils` declara `@objetiva/types` como workspace dep — evita el patrón frágil de hoisting accidental que históricamente generó drift silencioso (lección incidente 2026-05-15).

## Task Commits

Cada task se commiteó atómicamente:

1. **Task 1: Crear tipos compartidos en `packages/types`** — `7a121e44` (feat)
2. **Task 2: Escribir tests RED del composer (Vitest)** — `c99ed485` (test)
3. **Task 3: Implementar composer (GREEN) + barrel export** — `27d1a460` (feat)
4. **Task 4: Wire workspace dep + type-check end-to-end** — `111cd57d` (chore)

_Nota: TDD strict — Task 2 commitea tests en RED antes de la implementación. Lint-staged (husky pre-commit) corrió en Task 3 y Task 4 sin modificar contenido funcional._

## Files Created/Modified

### Created

- `packages/types/src/template.ts` — Interfaces `TemplateAtributo`, `Template` y tipo `AtributosMap`. Sin Zod, sin lógica.
- `packages/utils/src/composer.ts` — `stripSep` (regex `/[-_.\s]+/g`), `composeSku` (D-16), `composeNombre` (D-17). Importa solo tipos desde `@objetiva/types`.
- `apps/web/src/lib/composer.test.ts` — Suite Vitest con 3 `describe`, 17 `it`, dos fixtures locales (`templateDefault` per D-14, `templateConVariantes` para validar ordering y casos cross-prop).

### Modified

- `packages/types/src/index.ts` — Append `export * from './template'` al final (no toca exports previos: Zod schemas, `AppRole`, `getPasswordStrength`).
- `packages/utils/src/index.ts` — Append `export * from './composer'` después de `./formatters`.
- `packages/utils/package.json` — Agrega bloque `"dependencies": { "@objetiva/types": "workspace:*" }`.
- `apps/backend/package.json` — Agrega `"@objetiva/utils": "workspace:*"` en `dependencies` (orden alfabético, justo después de `@objetiva/types`).
- `pnpm-lock.yaml` — Sincronizado (`pnpm install --no-frozen-lockfile`).

## Decisions Made

- **Implementación de `stripSep` en una sola pasada:** `/[-_.\s]+/g` colapsa separadores consecutivos en un único `replace`, evitando dos pases (uno por separador y otro para colapsar). Verificado con caso `'AB-_. C' → 'ABC'`.
- **Inmutabilidad defensiva con `.slice()`:** Antes de `.sort()` se crea una copia del array filtrado para no mutar `template.atributos` aunque sea el mismo objeto pasado por el caller. Mantiene la pureza efectiva incluso si la lista del template tiene aliasing con datos externos.
- **Type predicate `.filter((v): v is string => Boolean(v))`:** Permite narrow seguro de `string | undefined` → `string` sin cast `as string[]`. Más expresivo y safe que el ejemplo de RESEARCH.
- **Archivo dedicado `template.ts` (no append a `index.ts` de types):** Mejor separación por dominio y deja espacio para crecer (futuros tipos relacionados a templates) sin engrosar el barrel.
- **`packages/utils` declara explícitamente `@objetiva/types`:** Aunque por hoisting de pnpm podría haber funcionado, declararlo de forma explícita evita el patrón frágil documentado en `feedback_schema_drift_silencioso.md`. Costo cero, robustez alta.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adelanté el wire `packages/utils → @objetiva/types` desde Task 4 a Task 3**

- **Found during:** Task 3 (implementar composer)
- **Issue:** Sin la dep declarada en `packages/utils/package.json`, el `tsc` de `pnpm --filter @objetiva/utils build` no resuelve `import type from '@objetiva/types'` y el composer NO termina en `dist/`. Como los tests del web app resuelven `@objetiva/utils` desde `./dist/index.js` (campo `main` del package.json), sin el build correcto los tests Task 3 nunca podrían pasar GREEN — Task 3 quedaría perpetuamente RED hasta correr Task 4.
- **Fix:** Agregué `"dependencies": { "@objetiva/types": "workspace:*" }` al `packages/utils/package.json` antes de buildear, corrí `pnpm install --no-frozen-lockfile` y luego `pnpm --filter @objetiva/utils build` — el composer apareció correctamente en `dist/`. Los tests pasaron 17/17 GREEN. El edit del package.json quedó staged y se commiteó en Task 4 (no en Task 3) junto con el wire de backend para preservar atomicidad del Task 4 según el plan.
- **Files modified:** `packages/utils/package.json` (committed en Task 4 commit `111cd57d`).
- **Verification:** `cd apps/web && pnpm test composer -- --run` → 17/17 passed antes y después del commit Task 4.
- **Committed in:** `111cd57d` (Task 4 commit — el archivo viajó staged entre Task 3 y Task 4, sin commit intermedio).

---

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** Ninguno funcionalmente. El plan declaraba el wire `utils → types` como subtask del Task 4; lo apliqué un paso antes para destrabar el GREEN de Task 3. El commit del package.json se hizo en Task 4 como el plan lo prescribía. No hay scope creep — solo reordenamiento operativo de un mismo cambio planeado.

## Issues Encountered

- **Husky pre-commit warnings:** El hook `.husky/pre-commit` muestra `DEPRECATED` warnings de husky v10 y un hint `was ignored because it's not set as executable`. No bloqueante — los commits se completaron y `lint-staged` corrió correctamente (eslint + prettier). Si querés silenciar el warning, hay que actualizar el formato del hook a la v10 (dos líneas iniciales eliminadas) — fuera del scope de este plan.
- **Lint-staged reformatea archivos durante commit:** En Task 3 y Task 4, `prettier` reformateó automáticamente `composer.ts` y los `package.json`. Los cambios son cosméticos (espaciado), no funcionales — incluidos en el mismo commit.

## User Setup Required

None — sin configuración de servicios externos. Todo es código y deps de workspace.

## Verification Summary

```
✓ test -f packages/types/src/template.ts
✓ grep "export interface Template" packages/types/src/template.ts
✓ grep "export interface TemplateAtributo" packages/types/src/template.ts
✓ grep "export type AtributosMap" packages/types/src/template.ts
✓ grep "export * from './template'" packages/types/src/index.ts
✓ test -f packages/utils/src/composer.ts
✓ grep "export function stripSep" packages/utils/src/composer.ts
✓ grep "export function composeSku" packages/utils/src/composer.ts
✓ grep "export function composeNombre" packages/utils/src/composer.ts
✓ grep "export * from './composer'" packages/utils/src/index.ts
✓ ! grep "slugify" packages/utils/src/composer.ts   (PITFALL-6 honrado)
✓ ! grep "drizzle-orm" packages/utils/src/composer.ts
✓ test -f apps/web/src/lib/composer.test.ts        (3 describe, 17 it)
✓ grep "@objetiva/types" packages/utils/package.json    (workspace dep declarada)
✓ grep "@objetiva/utils" apps/backend/package.json      (PITFALL-5 cerrado)
✓ test -f packages/utils/dist/composer.js          (build OK)
✓ test -f packages/utils/dist/composer.d.ts         (types OK)
✓ pnpm --filter @objetiva/backend type-check → exit 0
✓ pnpm --filter @objetiva/web type-check     → exit 0
✓ cd apps/web && pnpm test composer -- --run → 17/17 passed (1.23s)
```

## Next Phase Readiness

- **Wave 0 cerrada.** Wave 1 (Plan 02 — migration `0008_phase30_templates.sql` + schema.ts sync) puede arrancar sin bloqueos.
- **Wave 2 (Plan 03 — backend templates module + agregar `familia`+`aplicacion` a `PROP_TIPOS`)** puede importar `import { Template, TemplateAtributo, AtributosMap } from '@objetiva/types'` y `import { composeSku, composeNombre } from '@objetiva/utils'`. PITFALL-5 cerrado.
- **Wave 3 (Plan 04 — frontend tabs + página `/templates`)** ya tiene tipos compartidos disponibles para tipar las respuestas del backend.
- **Phase 32** (cuando se cablee `ArticuloForm` con preview de SKU/nombre): el composer está listo para ser consumido reactivamente en React.

## Self-Check: PASSED

Files verificados existentes en filesystem:

- FOUND: `packages/types/src/template.ts`
- FOUND: `packages/utils/src/composer.ts`
- FOUND: `apps/web/src/lib/composer.test.ts`

Commits verificados en `git log`:

- FOUND: `7a121e44` (Task 1)
- FOUND: `c99ed485` (Task 2)
- FOUND: `27d1a460` (Task 3)
- FOUND: `111cd57d` (Task 4)

Tests verificados ejecutados: `17/17 passed` (cd apps/web && pnpm test composer -- --run).

---

_Phase: 30-templates-composici-n-sku-nombre_
_Plan: 01_
_Completed: 2026-05-17_
