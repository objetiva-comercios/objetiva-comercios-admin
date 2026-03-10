# Milestones

## v1.1 Modelo Articulos + Inventario (Shipped: 2026-03-10)

**Phases completed:** 5 phases, 18 plans
**Timeline:** 3 days (2026-03-04 → 2026-03-06)
**Commits:** 95 | **Files:** 412 | **Lines:** +25,066 / -5,732
**Requirements:** 49/49 satisfied

**Key accomplishments:**

1. Migración completa del modelo de datos: products → articulos con PK texto (codigo), depositos multi-ubicación
2. Sistema de existencias con stock por articulo/deposito, alertas de bajo stock, edición inline, vistas dual (por deposito / por articulo)
3. Inventarios de conteo físico con sectores, dispositivos móviles, workflow de estados (pendiente → en_curso → finalizado), vista de discrepancias
4. Migración downstream de FK en orders/sales/purchases + dashboard KPIs rewired al nuevo modelo
5. Navegación web y mobile actualizada al nuevo modelo en español, dead code cleanup

### Known Gaps

Tech debt menor aceptado:

| #   | Item                                                                  | Severity |
| --- | --------------------------------------------------------------------- | -------- |
| 1   | INT-ORPHAN-01: POST /api/existencias (upsert) sin consumidor frontend | Low      |
| 2   | Frontmatter incompleto en 14-01-SUMMARY.md                            | Low      |
| 3   | Comentario placeholder en header.tsx:20                               | Low      |

### v1.0 Gaps Resolved

| #   | v1.0 Gap                                            | Resolution                     |
| --- | --------------------------------------------------- | ------------------------------ |
| 1   | INT-SETTINGS-RBAC: Settings missing @Roles('admin') | Fixed in Phase 14 (DEBT-01)    |
| 2   | INT-WEB-TYPE-DRIFT: Web types missing DB fields     | Resolved in Phase 15 (DEBT-02) |
| 3   | INT-MOBILE-LABELS: Mobile nav not in Spanish        | Fixed in Phase 16 (DEBT-03)    |
| 4   | Unused @objetiva/types exports                      | Cleaned in Phase 14 (DEBT-04)  |

---

## v1.0 MVP (Shipped: 2026-03-04)

**Phases completed:** 13 phases, 42 plans
**Timeline:** 41 days (2026-01-22 → 2026-03-04)
**Commits:** 199 | **Files:** 377 | **LOC:** 12,650 TypeScript
**Requirements:** 47/47 satisfied

**Key accomplishments:**

1. Monorepo foundation — pnpm workspaces + Turborepo with shared packages (types, ui, utils)
2. Full-stack backend — NestJS API with PostgreSQL/Drizzle ORM, JWT auth, RBAC, 15+ endpoints
3. Web admin dashboard — Next.js App Router with shadcn/ui, 7 operational sections, dark theme
4. Mobile app — Capacitor (iOS/Android) with bottom tabs + drawer navigation, shared design language
5. Database integration — Drizzle ORM schema (8 tables), migrations, 500+ product seed data
6. Production hardening — Error boundaries, RBAC, offline detection, form validation, touch targets

### Known Gaps

Carried forward as tech debt for next milestone:

| #   | Item                                                                       | Severity |
| --- | -------------------------------------------------------------------------- | -------- |
| 1   | INT-SETTINGS-RBAC: PATCH/POST/DELETE /api/settings missing @Roles('admin') | High     |
| 2   | INT-WEB-TYPE-DRIFT: Web OrderItem missing subtotal/sku from DB schema      | Medium   |
| 3   | INT-WEB-TYPE-DRIFT: Web Inventory missing minStock/maxStock/location       | Medium   |
| 4   | INT-WEB-TYPE-DRIFT: Web Product missing stock/imageUrl                     | Medium   |
| 5   | INT-MOBILE-LABELS: Mobile navigation labels not localized to Spanish       | Low      |
| 6   | @objetiva/types exports unused User, ApiResponse<T>                        | Low      |
| 7   | @objetiva/ui exports unused spacing/typography tokens                      | Low      |
| 8   | Import path inconsistency (web deep-import vs mobile root-import for cn)   | Low      |

---
