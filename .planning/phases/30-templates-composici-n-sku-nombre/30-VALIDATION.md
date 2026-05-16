---
phase: 30
slug: templates-composici-n-sku-nombre
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-16
updated: 2026-05-16
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: ver RESEARCH.md §"Validation Architecture" para detalle expandido.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (única infraestructura de tests del repo) |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `cd apps/web && pnpm test` |
| **Full suite command** | `cd apps/web && pnpm test` (vitest run — sin watch) |
| **Estimated runtime** | ~5-10 segundos (suite chica) |

**Nota crítica:** Backend NO tiene tests automatizados. El composer vive en `packages/utils/src/composer.ts` pero sus tests se escriben en `apps/web/src/lib/composer.test.ts` siguiendo el patrón canónico de `abrev.test.ts`.

---

## Sampling Rate

- **After every task commit:** `cd apps/web && pnpm test`
- **After every plan wave:** `cd apps/web && pnpm test` + manual smoke (curl/psql) según task
- **Before `/gsd-verify-work`:** Vitest 100% verde + checklist manual completo
- **Max feedback latency:** 15 segundos (vitest + arranque cold)

---

## Per-Task Verification Map

> Tabla poblada con los Task IDs reales de los 4 planes de Phase 30. Cada fila mapea a su `<automated>` command real (extraído de los `<verify>` de cada plan). `nyquist_compliant: true` declarado arriba.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01/T1 | 01 | 0 | TPL-03, TPL-04 | — | Tipos compartidos `Template/TemplateAtributo/AtributosMap` exportados desde `@objetiva/types` | unit (compile) | `test -f packages/types/src/template.ts && grep -q "export interface Template" packages/types/src/template.ts && grep -q "export interface TemplateAtributo" packages/types/src/template.ts && grep -q "export type AtributosMap" packages/types/src/template.ts && grep -q "export \* from './template'" packages/types/src/index.ts` | ❌ W0 | ⬜ pending |
| 30-01/T2 | 01 | 0 | TPL-03, TPL-04 | — | Suite Vitest RED de los 12+ casos de borde | unit (RED) | `test -f apps/web/src/lib/composer.test.ts && [ $(grep -c "describe(" apps/web/src/lib/composer.test.ts) -ge 3 ] && [ $(grep -c "^\\s*it(" apps/web/src/lib/composer.test.ts) -ge 12 ] && grep -q "from '@objetiva/utils'" apps/web/src/lib/composer.test.ts` | ❌ W0 | ⬜ pending |
| 30-01/T3 | 01 | 0 | TPL-03, TPL-04 | — | composer GREEN sin slugify ni drizzle-orm | unit (GREEN) | `test -f packages/utils/src/composer.ts && grep -q "export function stripSep" packages/utils/src/composer.ts && grep -q "export function composeSku" packages/utils/src/composer.ts && grep -q "export function composeNombre" packages/utils/src/composer.ts && grep -q "export \* from './composer'" packages/utils/src/index.ts && ! grep -q "slugify" packages/utils/src/composer.ts && cd apps/web && pnpm test composer -- --run 2>&1 \| grep -E "Test Files\\s+[0-9]+ passed"` | ❌ W0 | ⬜ pending |
| 30-01/T4 | 01 | 0 | TPL-03, TPL-04 | PITFALL-5 | Backend declara `@objetiva/utils` workspace dep | smoke (build) | `grep -q '"@objetiva/utils": "workspace:\\*"' apps/backend/package.json && pnpm install --frozen-lockfile=false 2>&1 \| tail -5 && pnpm --filter @objetiva/utils build && test -f packages/utils/dist/composer.js && pnpm --filter @objetiva/backend type-check && pnpm --filter @objetiva/web type-check && cd apps/web && pnpm test composer -- --run 2>&1 \| grep -E "Test Files\\s+[0-9]+ passed"` | ❌ W0 | ⬜ pending |
| 30-02/T1 | 02 | 1 | TPL-01, TPL-05 | T-30-01 (data loss) | Backup + pre-DROP COUNT=0 | manual | `pg_dump -t articulos > backup_pre_phase30_$(date +%Y%m%d_%H%M%S).sql` + COUNT query (debe retornar 0) | ❌ W0 | ⬜ pending |
| 30-02/T2 | 02 | 1 | TPL-01, TPL-05 | T-30-04 (drift) | Migration SQL + schema.ts sincronizados en mismo commit | source + build | `test -f apps/backend/drizzle/0008_phase30_templates.sql && [ $(grep -c "DROP COLUMN IF EXISTS" apps/backend/drizzle/0008_phase30_templates.sql) -eq 8 ] && [ $(grep -c "ADD COLUMN IF NOT EXISTS" apps/backend/drizzle/0008_phase30_templates.sql) -eq 5 ] && [ $(grep -c "CREATE TABLE" apps/backend/drizzle/0008_phase30_templates.sql) -eq 4 ] && grep -q "export const propFamilia" apps/backend/src/db/schema.ts && grep -q "export const propAplicacion" apps/backend/src/db/schema.ts && grep -q "export const articulosTemplates" apps/backend/src/db/schema.ts && grep -q "export const templateAtributos" apps/backend/src/db/schema.ts && ! grep -E "^\\s+rubro: text\\('rubro'\\)" apps/backend/src/db/schema.ts && ! grep -E "^\\s+propAux1: text" apps/backend/src/db/schema.ts && pnpm --filter @objetiva/backend type-check && pnpm --filter @objetiva/backend build` | ❌ W0 | ⬜ pending |
| 30-02/T3 | 02 | 1 | TPL-01, TPL-05 | T-30-01 + T-30-04 | Apply atómico `--single-transaction` + journal sync + post-apply smoke | manual | `psql --single-transaction --set ON_ERROR_STOP=1 -f apps/backend/drizzle/0008_phase30_templates.sql` + edit `_journal.json` + INSERT en `__drizzle_migrations` + `\d` checks + `SELECT * FROM articulos_templates WHERE nombre='default'` | ❌ W0 | ⬜ pending |
| 30-02/T4 | 02 | 1 | TPL-01, TPL-05 | T-30-04 | Commit atómico con los 3 archivos en mismo SHA | source (git) | `git log -1 --pretty=%s \| grep -q "phase 30" && [ $(git show --stat HEAD \| grep -c -E "(0008_phase30\|schema\\.ts\|_journal\\.json)") -eq 3 ] && git status --porcelain \| wc -l \| grep -E "^\\s*0\\s*$"` | ❌ W0 | ⬜ pending |
| 30-03/T1 | 03 | 2 | TPL-01 | T-30-02 (SQL inj) | Drizzle prepared stmts en CRUD `familia`+`aplicacion` | smoke + build | `grep -q "'familia'" apps/backend/src/modules/propiedades/propiedades.constants.ts && grep -q "'aplicacion'" apps/backend/src/modules/propiedades/propiedades.constants.ts && grep -q "familia: propFamilia" apps/backend/src/modules/propiedades/propiedades.constants.ts && grep -q "parentId" apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts && grep -q "tipo === 'familia'" apps/backend/src/modules/propiedades/propiedades.service.ts && pnpm --filter @objetiva/backend type-check && pnpm --filter @objetiva/backend build` | ❌ W0 | ⬜ pending |
| 30-03/T2 | 03 | 2 | TPL-01, TPL-02, TPL-03, TPL-04, TPL-05 | T-30-02 | Módulo NestJS `templates` con CRUD + DTOs validados con class-validator | source + build | `test -f apps/backend/src/modules/templates/templates.module.ts && test -f apps/backend/src/modules/templates/templates.controller.ts && test -f apps/backend/src/modules/templates/templates.service.ts && test -f apps/backend/src/modules/templates/dto/create-template.dto.ts && test -f apps/backend/src/modules/templates/dto/update-template.dto.ts && test -f apps/backend/src/modules/templates/dto/template-atributos.dto.ts && grep -q "export class TemplatesModule" apps/backend/src/modules/templates/templates.module.ts && grep -q "@Roles('admin')" apps/backend/src/modules/templates/templates.controller.ts && [ $(grep -cE "async (findAll\|findOne\|create\|update\|findAtributos\|replaceAtributos)" apps/backend/src/modules/templates/templates.service.ts) -ge 6 ] && pnpm --filter @objetiva/backend type-check && pnpm --filter @objetiva/backend build` | ❌ W0 | ⬜ pending |
| 30-03/T3 | 03 | 2 | TPL-01, TPL-05 | — | TemplatesModule registrado en AppModule + smoke runtime contra DB live | smoke (curl) | `grep -c "TemplatesModule" apps/backend/src/app.module.ts \| grep -E "^2$" && pnpm --filter @objetiva/backend build` + curl `GET /templates` retorna template `default` con 5 atributos | ❌ W0 | ⬜ pending |
| 30-04/T1 | 04 | 3 | TPL-01 | — | Tipos extendidos a 8 + `extraColumns?` backward-compat | source + tests | `[ $(grep -oE "'(marca\|color\|talle\|material\|presentacion\|objeto\|familia\|aplicacion)'" apps/web/src/types/propiedad.ts \| sort -u \| wc -l) -eq 8 ] && grep -q "subcategoriaId" apps/web/src/types/propiedad.ts && grep -q "extraColumns" apps/web/src/components/propiedades/propiedad-table.tsx && grep -q "export interface ExtraColumn" apps/web/src/components/propiedades/propiedad-table.tsx && pnpm --filter @objetiva/web type-check && pnpm --filter @objetiva/web build && cd apps/web && pnpm test -- --run 2>&1 \| grep -E "Test Files\\s+[0-9]+ passed"` | ❌ W0 | ⬜ pending |
| 30-04/T2 | 04 | 3 | TPL-01 | — | Dialog extendido con `extraFields`/`buildExtraPayload`/`validateExtra` backward-compat | source + tests | `grep -q "extraFields" apps/web/src/components/propiedades/propiedad-create-dialog.tsx && grep -q "buildExtraPayload" apps/web/src/components/propiedades/propiedad-create-dialog.tsx && grep -q "validateExtra" apps/web/src/components/propiedades/propiedad-create-dialog.tsx && pnpm --filter @objetiva/web type-check && pnpm --filter @objetiva/web build && cd apps/web && pnpm test propiedad-create-dialog -- --run 2>&1 \| grep -E "Test Files\\s+[0-9]+ passed"` | ❌ W0 | ⬜ pending |
| 30-04/T3 | 04 | 3 | TPL-01 | — | Wiring `propiedades-page.tsx` con 8 tabs + página `/templates` (list + edit) | source + build + tests | `[ $(grep -oE "'(marca\|color\|talle\|material\|presentacion\|objeto\|familia\|aplicacion)'" apps/web/src/components/propiedades/propiedades-page.tsx \| sort -u \| wc -l) -ge 1 ] && test -f apps/web/src/app/\\(dashboard\\)/templates/page.tsx && test -f apps/web/src/app/\\(dashboard\\)/templates/\\[id\\]/page.tsx && pnpm --filter @objetiva/web type-check && pnpm --filter @objetiva/web build && cd apps/web && pnpm test -- --run 2>&1 \| grep -E "Test Files\\s+[0-9]+ passed"` | ❌ W0 | ⬜ pending |
| 30-04/T4 | 04 | 3 | TPL-01 | — | Validación visual humana: 8 tabs `/propiedades` + `/templates` list + edit | manual (human) | Operador navega a `/propiedades` → ve 8 tabs; navega a `/templates` → ve tabla con `default`; click en row → entra a detalle/edit; edita `orden_sku`/`orden_nombre`/`es_variante`/`custom_slot` y guarda → PATCH 200 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/lib/composer.test.ts` — archivo nuevo, tests RED para los 8 casos de borde de RESEARCH.md
- [ ] `packages/utils/src/composer.ts` — stubs `stripSep`, `composeSku`, `composeNombre` (RED)
- [ ] `packages/types/src/template.ts` — tipos `Template`, `TemplateAtributo`, `AtributosMap`
- [ ] `packages/utils/src/index.ts` — re-exportar composer
- [ ] `apps/backend/package.json` — agregar `"@objetiva/utils": "workspace:*"` si el backend lo consume

---

## Casos de Borde Críticos (composer)

Wave 0 debe asegurar que estos 8 casos están cubiertos como tests RED antes de implementar `composer.ts`:

1. `stripSep('AMOR-001')` → `'AMOR001'`
2. `stripSep('X.001.A')` → `'X001A'`
3. `stripSep('AMOR 001')` → `'AMOR001'`
4. `composeNombre({ objeto: 'Amortiguador', marca: '', medida: undefined }, template)` → `'Amortiguador'` (sin doble espacio)
5. `composeSku(codigo, atributos, templateDefault)` → `stripSep(codigo)` (shortcut con variantes vacías)
6. `composeNombre` respeta `orden_nombre` ascending del template
7. Variantes con texto repetido cross-prop (`talle:'XL'`, `color:'XL'`) → ambos aparecen en SKU sin colisión
8. Atributo marcado `es_variante` pero `undefined` en `atributos` → se omite del SKU sin error

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration `0008` aplica limpia con backup pre-DROP | TPL-01, TPL-05 | Toca prod (101.021 filas) — backup safety net obligatorio | `pg_dump articulos > backup_pre_phase30.sql` → `psql --single-transaction --set ON_ERROR_STOP=1 -f drizzle/0008_*.sql` → verificar `\d articulos` |
| Las 8 columnas legacy siguen con 0 filas non-null al ejecutar migration | A2 (RESEARCH) | Pre-condición crítica para DROP seguro | `SELECT COUNT(*) FROM articulos WHERE rubro IS NOT NULL OR subrubro IS NOT NULL OR adjetivo IS NOT NULL OR prop_aux_1 IS NOT NULL OR prop_aux_2 IS NOT NULL OR prop_aux_3 IS NOT NULL OR prop_aux_4 IS NOT NULL OR prop_aux_5 IS NOT NULL;` debe devolver `0` |
| Template default insertado con receta correcta | TPL-05 | Seed verifica post-apply | `SELECT * FROM articulos_templates WHERE nombre = 'default';` + `SELECT atributo_tipo, orden_nombre, orden_sku, es_variante, custom_slot FROM template_atributos WHERE template_id = (SELECT id FROM articulos_templates WHERE nombre = 'default') ORDER BY orden_nombre;` |
| `_journal.json` sincronizado tras migration | — | Lección incidente 2026-05-15 — sin journal sync drizzle queries fallan silenciosamente | Inspeccionar `apps/backend/drizzle/meta/_journal.json` contiene entry `0008` |
| Tab Familias y Aplicaciones renderizan en `/propiedades` | TPL-01 | Validación visual (sin tests E2E configurados) | Playwright MCP: navegar a `/propiedades`, click tab Familias, ver tabla; click Aplicaciones, ver tabla |
| Página `/templates` (list + detail/edit) | TPL-01 | Validación visual — no hay E2E configurado | Navegar a `/templates` → tabla con 1 row (`default`); click row → detalle con form de atributos editable; modificar `orden_sku`/`orden_nombre`/`es_variante`/`custom_slot` → PATCH 200 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 archivos arriba)
- [x] No watch-mode flags (todo corre con `vitest run`)
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter (tabla poblada con 14 task IDs reales)

**Approval:** pending — `wave_0_complete: false` hasta que Wave 0 (Plan 01) ejecute en GREEN.
