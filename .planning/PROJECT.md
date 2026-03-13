# Objetiva Comercios Admin

## What This Is

A reusable admin platform for commercial applications with full-stack authentication, operational dashboards, and cross-platform apps. Serves small to mid-sized commercial operations (store owners, internal staff) with mobile apps (iOS/Android), web app, and NestJS backend — all sharing Supabase authentication with a separate PostgreSQL database for business data. Covers core business workflows: dashboard KPIs, articulo management with ERP-aligned schema (~30 fields, image upload, configurable columns), multi-deposito stock tracking, physical inventory counts, purchase/sale tracking, orders, business settings, API key management for external integrations, and webhook notifications for articulo events.

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
- ✓ Articulos full CRUD with text PK (codigo) and ~30 fields including ERP sync — v1.1
- ✓ Depositos CRUD for multi-location warehouse management — v1.1
- ✓ Existencias: stock per articulo per deposito with low-stock alerts, inline editing, dual views — v1.1
- ✓ Inventarios: physical count events with sectors, dispositivos, status workflow, discrepancy view — v1.1
- ✓ FK migration: orders/sales/purchases reference articuloCodigo (text FK) — v1.1
- ✓ Dashboard KPIs rewired to articulos/existencias model — v1.1
- ✓ Navigation web + mobile updated to new Spanish model names — v1.1
- ✓ Settings RBAC gap fixed, web type drift resolved, mobile labels localized — v1.1
- ✓ Artículos CRUD completo con ~30 campos, formulario agrupado, búsqueda real-time, soft-delete — v1.2
- ✓ Upload y gestión de imágenes (3 etiqueta + 6 producto) con sharp WebP, DnD, lightbox — v1.2
- ✓ Vista lista configurable con columnas show/hide persistidas en DB + sorting por columnas — v1.2
- ✓ Vista detalle en panel lateral (ArticuloSheet) con todos los campos e imágenes — v1.2
- ✓ API Keys: CompositeAuthGuard (JWT + Bearer), CRUD en Settings, SHA-256 hashing — v1.2
- ✓ Webhooks: CRUD + HMAC-SHA256 + retry backoff + delivery log + test ping, artículos events — v1.2

### Active

(None — planning next milestone)

### Out of Scope

- Analytics or BI features — operations-first, not analytics-heavy
- Supabase database for business data — PostgreSQL is separate, Supabase is auth-only
- Ionic, Material UI, Chakra, or other UI frameworks — shadcn aesthetic is non-negotiable
- Nx monorepo tooling — Using pnpm workspaces + Turborepo only
- Advanced inventory forecasting (ML) — simple stock alerts sufficient
- Mobile POS app — admin focus, not cashier UX
- Multi-currency/multi-language — single locale (es-MX/MXN) initially
- Full variant/SKU matrix (size x color = N child SKUs) — flat properties covers real use case
- Automatic reorder/purchase generation from low stock — scope creep into procurement
- Real-time stock sync with external ERP — erp_codigo for reference, not live sync
- Lot/batch/serial number tracking — not needed for general commercial operations
- FIFO/LIFO/weighted average costing — accounting-level valuation is separate domain

## Context

**Current state:** Shipped v1.2 with ~23,600 LOC TypeScript across 128+ modified files. Full artículos CRUD with images, API keys for external integrations, and webhook notifications for articulo events.

**Tech stack:**

- Web: Next.js 14 (App Router), shadcn/ui, Tailwind CSS, TanStack Table
- Mobile: React + Vite + Capacitor (iOS/Android), TanStack Query
- Backend: NestJS, Drizzle ORM, PostgreSQL, jose (JWT validation), sharp (image processing), @nestjs/event-emitter (webhooks)
- Shared: pnpm workspaces, Turborepo, @objetiva/{types,ui,utils}
- Auth: Supabase (auth only — JWT validation via JWKS) + API Keys (CompositeAuthGuard)
- DB: PostgreSQL with Drizzle ORM (articulos, depositos, existencias, inventarios, orders, sales, purchases, settings, api_keys, webhooks, webhook_deliveries + related tables)

**Target users:** Store owners and internal staff managing daily commercial operations, plus external systems via API keys and webhooks.

**Known tech debt:**

- POST /api/existencias (upsert) has no frontend consumer (low)
- Placeholder comment in header.tsx (low)
- doublePrecision for monetary fields — may need numeric() for precision (medium, deferred)
- HOOK-03, HOOK-06 missing from SUMMARY frontmatter (info-level documentation gap)

## Constraints

- **Tech Stack — Mobile**: React + TypeScript, Capacitor (iOS/Android), Vite, shadcn-style UI, Tailwind
- **Tech Stack — Web**: Next.js (App Router), React + TypeScript, shadcn/ui, Tailwind CSS
- **Tech Stack — Backend**: NestJS, TypeScript, PostgreSQL + Drizzle ORM, Supabase Auth (JWT validation only)
- **Monorepo**: pnpm workspaces + Turborepo (not Nx)
- **Authentication**: Supabase Auth only — shared across mobile, web, and backend
- **Design System**: shadcn aesthetic required — NO Ionic, Material UI, Chakra, Ant, Mantine, NativeBase
- **Database**: Supabase PostgreSQL is NOT used for business data — separate PostgreSQL instance

## Key Decisions

| Decision                                             | Rationale                                             | Outcome                                                 |
| ---------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Supabase for auth only, separate PostgreSQL for data | Clean separation of concerns                          | ✓ Good — clean auth/data boundary                       |
| pnpm + Turborepo over Nx                             | Simpler mental model, less abstraction                | ✓ Good — fast builds, minimal config                    |
| Platform-specific UI with shared design language     | Avoid cross-platform abstractions                     | ✓ Good — each platform feels native                     |
| Backend serves mock data → replaced by real DB       | Validates contract early                              | ✓ Good — frontend required zero changes                 |
| Bottom tabs + drawer pattern for mobile              | Tabs for high-frequency, drawer for secondary         | ✓ Good — clear nav mental model                         |
| HashRouter for Capacitor mobile                      | file:// protocol where BrowserRouter fails            | ✓ Good — works on iOS/Android native                    |
| Drizzle ORM over TypeORM/Prisma                      | Lightweight, SQL-like, good TS inference              | ✓ Good — clean migrations, fast queries                 |
| jose for JWT validation                              | Async JWKS, no Supabase SDK dependency                | ✓ Good — lightweight, handles key rotation              |
| Global JWT guard with @Public() opt-out              | Deny-by-default auth                                  | ✓ Good — prevented auth gaps                            |
| PK articulos is `codigo` (text), not numeric ID      | Real business model uses ERP codes as identifiers     | ✓ Good — natural alignment with ERP data                |
| Existencias split from articulos                     | Multi-deposito support requires separate stock table  | ✓ Good — clean per-location stock tracking              |
| Inventarios = periodic physical counts               | Distinct from stock/existencias — events with sectors | ✓ Good — clear domain separation                        |
| doublePrecision for monetary fields                  | Returns JS numbers, no string parsing                 | ⚠️ Revisit — may need numeric() for financial precision |
| Clean-cut migration (db:push + re-seed)              | No production data to preserve in dev                 | ✓ Good — fast iteration without migration complexity    |
| Filesystem local for article images                  | Simple, no CDN/cloud needed at current scale          | ✓ Good — zero external dependencies                     |
| sharp for image processing (WebP + resize)           | Quality thumbnails, single dependency                 | ✓ Good — fast in-memory pipeline                        |
| CompositeAuthGuard (JWT + API key)                   | External systems need auth without Supabase           | ✓ Good — clean fallback chain                           |
| @nestjs/event-emitter for webhook dispatch           | Lightweight, in-process, no message queue needed      | ✓ Good — adequate for 10-50 webhooks/day                |
| HMAC-SHA256 for webhook signatures                   | Industry standard, verifiable by consumers            | ✓ Good — secure payload verification                    |
| DB-driven column visibility (JSONB in settings)      | Global config, no per-user tables                     | ✓ Good — simple, immediate-persist UX                   |
| objeto field as plain Input (no Select/Combobox)     | Parameter table integration deferred                  | ✓ Good — pragmatic, extensible later                    |

---

_Last updated: 2026-03-13 after v1.2 milestone_
