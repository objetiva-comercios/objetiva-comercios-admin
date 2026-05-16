---
phase: 30
slug: templates-composici-n-sku-nombre
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-16
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

> El planner llena la tabla completa cuando emita los PLAN.md. Base extraída de RESEARCH.md §"Phase Requirements → Test Map":

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | TPL-03, TPL-04 | — | `composeSku/Nombre` puras sin side effects | unit | `cd apps/web && pnpm test composer` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | TPL-01, TPL-05 | T-30-01 (data loss) | Migration atómica + backup pre-DROP | manual | backup + `psql --single-transaction --set ON_ERROR_STOP=1` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | TPL-01 | T-30-02 (SQL inj) | Drizzle prepared stmts en CRUD | smoke | curl `GET /propiedades/familia` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | TPL-02 | — | template_atributos persiste es_variante | smoke | curl `GET /templates/1/atributos` | ❌ W0 | ⬜ pending |
| TBD | TBD | 3 | TPL-01 | — | Tabs Familias/Aplicaciones cargan en `/propiedades` | manual | Playwright + visual | ❌ W0 | ⬜ pending |

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
| Template default insertado con receta correcta | TPL-05 | Seed verifica post-apply | `SELECT * FROM articulos_templates WHERE is_default = true;` + `SELECT atributo_tipo, orden_nombre, orden_sku, es_variante, custom_slot FROM template_atributos WHERE template_id = (SELECT id FROM articulos_templates WHERE is_default = true);` |
| `_journal.json` sincronizado tras migration | — | Lección incidente 2026-05-15 — sin journal sync drizzle queries fallan silenciosamente | Inspeccionar `apps/backend/drizzle/meta/_journal.json` contiene entry `0008` |
| Tab Familias y Aplicaciones renderizan en `/propiedades` | TPL-01 | Validación visual (sin tests E2E configurados) | Playwright MCP: navegar a `/propiedades`, click tab Familias, ver tabla; click Aplicaciones, ver tabla |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 archivos arriba)
- [ ] No watch-mode flags (todo corre con `vitest run`)
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter una vez que el planner pueble la tabla con task IDs reales

**Approval:** pending
