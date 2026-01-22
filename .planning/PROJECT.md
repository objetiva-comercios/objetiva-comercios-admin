# Objetiva Comercios Admin

## What This Is

A reusable admin base for commercial applications, providing a solid foundation with authentication, navigation structure, and operational sections. Serves small to mid-sized commercial operations (store owners, internal staff) with mobile apps (iOS/Android), web app, and backend all sharing authentication. Displays realistic operational data across core business workflows: dashboard KPIs, product management, purchase/sale tracking, orders, and inventory.

## Core Value

A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can log in with email/password on mobile and web via Supabase Auth
- [ ] User session persists and works correctly across both platforms
- [ ] Mobile app displays bottom tabs for primary sections (Dashboard, Articles, Orders, Inventory)
- [ ] Mobile app displays drawer navigation from header for secondary actions (Profile, Settings, Logout)
- [ ] Web app displays sidebar navigation for all sections
- [ ] Main layout is consistent and stable across platforms (header, navigation, content area)
- [ ] All sections (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings) are navigable
- [ ] Each section displays realistic operational data from backend endpoints
- [ ] Backend exposes mock endpoints (/api/dashboard, /api/products, /api/orders, etc.) with realistic dummy data
- [ ] Backend validates JWT tokens from Supabase Auth
- [ ] UI feels cohesive, dense, and admin-oriented following shadcn aesthetic
- [ ] Monorepo structure with pnpm workspaces + Turborepo is functional
- [ ] packages/ui defines shared design tokens and component APIs
- [ ] Documentation covers installation, environment setup, and running all apps

### Out of Scope

- Real business logic implementation — Phase 1 is structure and navigation only
- Analytics or BI features — This is operations-first, not analytics-heavy
- Supabase database for business data — PostgreSQL is separate, Supabase is auth-only
- Ionic, Material UI, Chakra, or other UI frameworks — shadcn aesthetic is non-negotiable
- Empty states — Show realistic dummy data to demonstrate layout density
- Nx monorepo tooling — Using pnpm workspaces + Turborepo only
- Supabase infrastructure management — Project already exists, just consume auth

## Context

**Target users:** Store owners and internal staff managing daily commercial operations. Core workflows include checking dashboard metrics, managing inventory and products, registering purchases and sales, tracking orders, and configuring business settings.

**Technical environment:** Greenfield project built from scratch. No existing code, no refactoring, no legacy constraints. This is a base template that will be reused across multiple commercial applications.

**Platform requirements:**
- Mobile must work on iOS and Android via Capacitor
- Web and mobile share Supabase authentication
- Backend validates JWT from Supabase but uses separate PostgreSQL for business data
- All platforms must feel cohesive and follow the same design language

**UI philosophy:** Modern, dense, admin-oriented interface clearly inspired by shadcn. Components are copy/paste style (not abstracted UI kits). Visual consistency across platforms through shared design tokens and patterns, but platform-specific implementations (not forcing cross-platform abstractions that hurt DX/UX).

**Navigation patterns:**
- Mobile: Bottom tabs for high-frequency sections, drawer from header for secondary navigation
- Web: Sidebar navigation
- Pattern is consistent and NOT context-dependent

**Data approach:** Backend serves realistic dummy data via REST endpoints. Frontend consumes these endpoints (not local mock data). This validates the frontend ↔ backend contract early and ensures auth, headers, and data flow are production-like.

## Constraints

- **Tech Stack — Mobile**: React + TypeScript, Capacitor (iOS/Android), Vite, shadcn-style UI (copy/paste components), Tailwind/native-friendly styling
- **Tech Stack — Web**: Next.js (App Router), React + TypeScript, shadcn/ui, Tailwind CSS
- **Tech Stack — Backend**: NestJS, TypeScript, PostgreSQL (separate from Supabase), Supabase Auth (JWT validation only)
- **Monorepo**: pnpm workspaces + Turborepo (not Nx)
- **Authentication**: Supabase Auth only — shared across mobile, web, and backend
- **Design System**: shadcn aesthetic required — NO Ionic, Material UI, Chakra, Ant, Mantine, NativeBase
- **UI Components**: Must live in packages/ui with shared design tokens and component APIs
- **Database**: Supabase PostgreSQL is NOT used for business data — separate PostgreSQL instance required
- **Phase 1 Scope**: Navigation structure, authentication, layout, and mock sections only — no real business logic yet

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth only, separate PostgreSQL for data | Clean separation of concerns — auth is a commodity, business data has specific requirements and scaling needs | — Pending |
| pnpm + Turborepo over Nx | Simpler mental model, less abstraction, easier to understand and maintain for monorepo structure | — Pending |
| Platform-specific UI implementations with shared design language | Avoid cross-platform abstractions that hurt DX/UX — visual consistency through design tokens, not code reuse | — Pending |
| Backend serves mock data vs frontend local mocks | Validates contract early, ensures auth/headers/data flow work correctly from day one | — Pending |
| Bottom tabs + drawer pattern for mobile | Tabs for high-frequency operational workflows, drawer for secondary admin actions — clear mental model | — Pending |
| Realistic dummy data over empty states | Demonstrates layout density, spacing, hierarchy — empty states not a priority in Phase 1 | — Pending |

---
*Last updated: 2026-01-22 after initialization*
