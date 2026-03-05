# Objetiva Comercios Admin

## What This Is

A reusable admin platform for commercial applications with full-stack authentication, operational dashboards, and cross-platform apps. Serves small to mid-sized commercial operations (store owners, internal staff) with mobile apps (iOS/Android), web app, and NestJS backend — all sharing Supabase authentication with a separate PostgreSQL database for business data. Covers core business workflows: dashboard KPIs, product management, purchase/sale tracking, orders, inventory, and business settings.

## Core Value

A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one.

## Requirements

### Validated

- ✓ User can sign up and log in with email/password on mobile and web via Supabase Auth — v1.0
- ✓ User session persists across browser/app refresh on both platforms — v1.0
- ✓ Mobile app displays bottom tabs (Dashboard, Articles, Orders, Inventory) + drawer navigation — v1.0
- ✓ Web app displays sidebar navigation for all sections — v1.0
- ✓ Layout is consistent and stable across platforms (header, navigation, content area) — v1.0
- ✓ All 7 sections navigable (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings) — v1.0
- ✓ Each section displays operational data from PostgreSQL via backend API — v1.0
- ✓ Backend exposes 15+ authenticated REST endpoints with RBAC — v1.0
- ✓ Backend validates JWT tokens from Supabase Auth — v1.0
- ✓ UI follows shadcn aesthetic with dark theme across platforms — v1.0
- ✓ Monorepo structure with pnpm workspaces + Turborepo functional — v1.0
- ✓ Shared packages (types, ui, utils) with design tokens — v1.0
- ✓ Documentation covers installation, environment setup, and running all apps — v1.0
- ✓ RBAC system (admin/viewer roles) enforced on write endpoints — v1.0

### Active

#### Current Milestone: v1.1 — Modelo Articulos + Inventario

**Goal:** Replace products/inventory models with articulos/existencias/inventarios to align with the real business data model.

**Target features:**

- Articulos: full CRUD with the real business schema (PK: codigo), replacing products
- Existencias: stock per article per deposito, replacing inventory
- Inventarios: periodic physical count events with sectors and mobile devices
- Depositos: warehouse/location management
- FK migration: orders/sales/purchases updated to reference articulos.codigo
- UI: 3 new sections (Articulos, Existencias, Inventarios) replacing 2 old ones

### Out of Scope

- Analytics or BI features — operations-first, not analytics-heavy
- Supabase database for business data — PostgreSQL is separate, Supabase is auth-only
- Ionic, Material UI, Chakra, or other UI frameworks — shadcn aesthetic is non-negotiable
- Nx monorepo tooling — Using pnpm workspaces + Turborepo only
- Advanced inventory forecasting (ML) — simple stock alerts sufficient
- Mobile POS app — admin focus, not cashier UX
- Multi-currency/multi-language — single locale (es-MX/MXN) initially

## Context

**Current state:** Shipped v1.0 with 12,650 LOC TypeScript across 377 files. Starting v1.1 data model migration.

**Tech stack:**

- Web: Next.js 14 (App Router), shadcn/ui, Tailwind CSS, TanStack Table
- Mobile: React + Vite + Capacitor (iOS/Android), TanStack Query
- Backend: NestJS, Drizzle ORM, PostgreSQL, jose (JWT validation)
- Shared: pnpm workspaces, Turborepo, @objetiva/{types,ui,utils}
- Auth: Supabase (auth only — JWT validation via JWKS)
- DB: PostgreSQL with Drizzle ORM (8 tables, 500+ seed products)

**Target users:** Store owners and internal staff managing daily commercial operations.

**Known tech debt from v1.0:**

- Settings RBAC gap (high) — PATCH/POST/DELETE /api/settings missing @Roles('admin')
- Web type drift (medium) — 3 type interfaces missing fields from DB schema
- Mobile labels not localized to Spanish (low)
- Unused shared package exports (low)

## Constraints

- **Tech Stack — Mobile**: React + TypeScript, Capacitor (iOS/Android), Vite, shadcn-style UI, Tailwind
- **Tech Stack — Web**: Next.js (App Router), React + TypeScript, shadcn/ui, Tailwind CSS
- **Tech Stack — Backend**: NestJS, TypeScript, PostgreSQL + Drizzle ORM, Supabase Auth (JWT validation only)
- **Monorepo**: pnpm workspaces + Turborepo (not Nx)
- **Authentication**: Supabase Auth only — shared across mobile, web, and backend
- **Design System**: shadcn aesthetic required — NO Ionic, Material UI, Chakra, Ant, Mantine, NativeBase
- **Database**: Supabase PostgreSQL is NOT used for business data — separate PostgreSQL instance

## Key Decisions

| Decision                                             | Rationale                                                                                   | Outcome                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Supabase for auth only, separate PostgreSQL for data | Clean separation of concerns — auth is a commodity, business data has specific requirements | ✓ Good — clean auth/data boundary, easy to swap either side           |
| pnpm + Turborepo over Nx                             | Simpler mental model, less abstraction                                                      | ✓ Good — fast builds, minimal config overhead                         |
| Platform-specific UI with shared design language     | Avoid cross-platform abstractions that hurt DX/UX                                           | ✓ Good — each platform feels native while staying cohesive            |
| Backend serves mock data → replaced by real DB       | Validates contract early, then seamless DB migration                                        | ✓ Good — frontend required zero changes when DB replaced mocks        |
| Bottom tabs + drawer pattern for mobile              | Tabs for high-frequency sections, drawer for secondary admin                                | ✓ Good — clear navigation mental model                                |
| HashRouter for Capacitor mobile                      | Capacitor native uses file:// protocol where BrowserRouter fails                            | ✓ Good — works on iOS/Android native without config                   |
| Drizzle ORM over TypeORM/Prisma                      | Lightweight, SQL-like query builder, good TypeScript inference                              | ✓ Good — clean migrations, fast queries, small bundle                 |
| jose for JWT validation                              | Async JWKS validation, no Supabase SDK dependency on backend                                | ✓ Good — lightweight, secure, handles key rotation                    |
| Global JWT guard with @Public() opt-out              | Deny-by-default — all new routes auto-protected                                             | ✓ Good — prevented auth gaps as features were added                   |
| doublePrecision for monetary fields                  | Returns JS numbers directly, no string parsing needed                                       | ⚠️ Revisit — may need numeric() for precision in financial operations |

| PK articulos is `codigo` (text), not numeric ID | Real business model uses ERP codes as identifiers, not surrogate keys | — Pending |
| Existencias split from articulos | Multi-deposito support requires separate stock table per location | — Pending |
| Inventarios = periodic physical counts | Distinct from stock/existencias — events with sectors and mobile devices | — Pending |

---

_Last updated: 2026-03-05 after v1.1 milestone start_
