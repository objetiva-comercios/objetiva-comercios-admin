# Roadmap: Objetiva Comercios Admin

## Overview

This roadmap delivers a reusable commercial admin foundation from zero to production-ready. We start with monorepo structure and authentication, build backend mock endpoints to validate API contracts early, then implement web and mobile frontends that consume those endpoints. Finally, we replace mock data with real PostgreSQL and polish for production. Each phase delivers a complete, verifiable capability that unblocks the next.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Monorepo** - Establish monorepo structure with authentication and shared packages
- [x] **Phase 2: Backend API with Mock Data** - Build NestJS backend serving realistic dummy data through authenticated endpoints
- [ ] **Phase 3: Web Application** - Create Next.js web app with authentication, navigation, and all operational sections
- [x] **Phase 4: Mobile Application** - Build Capacitor mobile app with platform-specific UI and navigation patterns (completed 2026-03-02)
- [ ] **Phase 5: Database Integration** - Replace mock data with PostgreSQL and Drizzle ORM for real persistence
- [ ] **Phase 6: Polish & Production** - Error handling, responsive refinement, RBAC, performance optimization

## Phase Details

### Phase 1: Foundation & Monorepo

**Goal**: Establish working monorepo with shared packages, TypeScript configuration, and authentication foundation that all apps can build upon
**Depends on**: Nothing (first phase)
**Requirements**: MONO-01, MONO-02, MONO-03, MONO-04, UI-05, AUTH-05, DOC-01, DOC-02, DOC-04
**Success Criteria** (what must be TRUE):

1. Developer can install all dependencies with single pnpm install command
2. TypeScript resolves workspace package imports correctly across all apps
3. Turborepo builds run with caching working for incremental builds
4. packages/ui exports shared design tokens (colors, spacing, typography) and types
5. Supabase Auth project exists and credentials are configured in all apps
6. Backend validates JWT tokens from Supabase successfully in test endpoint
7. README guides developer through environment setup and running all apps
   **Plans**: 4 plans in 3 waves

Plans:

- [x] 01-01-PLAN.md - Monorepo foundation with shared packages (ui, types, utils)
- [x] 01-02-PLAN.md - NestJS backend with JWT authentication
- [x] 01-03-PLAN.md - Web and mobile app skeletons with design tokens
- [x] 01-04-PLAN.md - Developer experience (ESLint, Prettier, Husky) and README

### Phase 2: Backend API with Mock Data

**Goal**: Build complete backend API with realistic mock data endpoints, validating the frontend-backend contract before real database work
**Depends on**: Phase 1
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, MONO-08, MONO-09
**Success Criteria** (what must be TRUE):

1. Backend runs on localhost with health check endpoint responding
2. All API endpoints require valid JWT token and reject invalid tokens
3. Dashboard endpoint returns realistic KPI data (sales, inventory, orders metrics)
4. Products endpoint returns 500+ realistic products with categories, pricing, and attributes
5. Orders endpoint returns realistic order data with various statuses
6. Inventory endpoint returns stock levels matching products
7. Sales and purchases endpoints return realistic transaction history
8. Developer can run backend concurrently with other apps in dev mode
   **Plans**: 5 plans in 3 waves (+1 gap closure)

Plans:

- [x] 02-01-PLAN.md - Common infrastructure (ValidationPipe, global auth guard, exception filter, DTOs)
- [x] 02-02-PLAN.md - Mock data generators with @faker-js/faker (500+ products, orders, inventory, sales, purchases)
- [x] 02-03-PLAN.md - Products, Orders, and Inventory modules with filtering and pagination
- [x] 02-04-PLAN.md - Sales, Purchases, and Dashboard modules completing the API
- [x] 02-05-PLAN.md - Gap closure: enforce JWT auth on all endpoints, add purchases KPI to dashboard

### Phase 3: Web Application

**Goal**: Deliver complete web admin interface with authentication, navigation, and all operational sections displaying backend data
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, NAV-03, NAV-04, NAV-05, NAV-06, NAV-07, UI-01, UI-02, UI-03, UI-04, DASH-01, DASH-02, DASH-03, SET-01, SET-02, SET-03, SET-04, MONO-07, DOC-03
**Success Criteria** (what must be TRUE):

1. User can sign up with email/password and receives confirmation
2. User can log in and session persists across browser refresh
3. User can log out from any page and is redirected to login
4. Web app displays sidebar navigation with all sections always visible
5. All sections are navigable (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings)
6. Dashboard displays key metrics from backend endpoint in dense, admin-oriented layout
7. Each section displays realistic operational data fetched from backend API
8. UI follows shadcn aesthetic with dark theme working correctly
9. User can view and update their profile from Settings
10. Layout is responsive and adapts to desktop, tablet, and mobile screen sizes
    **Plans**: 8 plans in 4 waves

Plans:

- [ ] 03-01-PLAN.md - Auth foundation (Supabase clients, middleware, ThemeProvider, shadcn/ui setup)
- [ ] 03-02-PLAN.md - Auth pages (Login, Signup, callback, redirects)
- [ ] 03-03-PLAN.md - Dashboard layout (Responsive sidebar, header, user menu, navigation)
- [ ] 03-04-PLAN.md - Dashboard page (KPI cards, charts, alerts, recent orders)
- [ ] 03-05-PLAN.md - Articles section (Products table with TanStack Table, filtering, side panel)
- [ ] 03-06-PLAN.md - Orders and Inventory sections (Data tables with status badges)
- [ ] 03-07-PLAN.md - Sales and Purchases sections (Transaction tables)
- [ ] 03-08-PLAN.md - Settings section and final verification (Profile, business settings, checkpoint)

### Phase 4: Mobile Application

**Goal**: Deliver iOS/Android mobile app with platform-specific navigation (bottom tabs + drawer) consuming same backend as web
**Depends on**: Phase 3
**Requirements**: NAV-01, NAV-02, NAV-04, NAV-05, NAV-06, NAV-07, UI-04, MONO-05, MONO-06
**Success Criteria** (what must be TRUE):

1. User can log in with email/password on mobile and session persists across app restarts
2. Mobile app displays bottom tabs for primary sections (Dashboard, Articles, Orders, Inventory)
3. Mobile app displays drawer navigation from header for secondary actions (Profile, Settings, Logout)
4. Navigation is consistent and NOT context-dependent (tabs/drawer always visible)
5. All sections display same operational data as web but with mobile-optimized UI
6. Mobile app builds and runs in browser for development
7. Mobile app can be built for iOS and Android via Capacitor
8. App feels cohesive with web despite platform-specific UI implementations
   **Plans**: 4 plans in 3 waves

Plans:

- [x] 04-01-PLAN.md - Capacitor setup, auth infrastructure & app entry (HashRouter, Supabase client, Login/Signup, SplashGate)
- [x] 04-02-PLAN.md - Navigation shell & Dashboard (BottomTabs, AppHeader, DrawerNav, AppShell, Dashboard KPIs)
- [x] 04-03-PLAN.md - Shared UI components & primary section pages (Card, StatusBadge, FilterChips, BottomSheet, Articles, Orders, Inventory)
- [x] 04-04-PLAN.md - Secondary sections, settings & verification (Sales, Purchases, Profile, Settings, human checkpoint)

### Phase 5: Database Integration

**Goal**: Replace mock data services with real PostgreSQL database using Drizzle ORM, maintaining API contract so frontends work unchanged
**Depends on**: Phase 4
**Requirements**: None (internal backend change)
**Success Criteria** (what must be TRUE):

1. PostgreSQL database is running and connected to backend
2. Database schema is created via Drizzle migrations
3. All API endpoints return data from database instead of mocks
4. Database is seeded with 500+ realistic products and related data
5. Frontend applications continue working without code changes
6. CRUD operations persist data correctly across sessions
   **Plans**: 3 plans in 3 waves

Plans:

- [ ] 05-01-PLAN.md — Drizzle setup, schema definition (8 tables), migration generation, and seed script
- [ ] 05-02-PLAN.md — Migrate all 5 domain services to Drizzle DB queries and add CRUD endpoints
- [ ] 05-03-PLAN.md — Dashboard async migration, mock data cleanup, and build verification

### Phase 6: Polish & Production

**Goal**: Harden application for production with error handling, loading states, RBAC, responsive refinements, and performance optimization
**Depends on**: Phase 5
**Requirements**: AUTH-06
**Success Criteria** (what must be TRUE):

1. Error boundaries catch and display friendly error messages throughout apps
2. All data fetching shows loading states with skeleton components
3. User roles and permissions system (RBAC) is implemented and enforced
4. Mobile app touch targets meet platform guidelines (44x44px minimum)
5. Web app loads under 3 seconds on 3G connection
6. All forms validate input and show helpful error messages
7. Application handles offline scenarios gracefully on mobile
   **Plans**: 4 plans in 3 waves

Plans:

- [x] 02-01-PLAN.md - Common infrastructure (ValidationPipe, global auth guard, exception filter, DTOs)
- [x] 02-02-PLAN.md - Mock data generators with @faker-js/faker (500+ products, orders, inventory, sales, purchases)
- [x] 02-03-PLAN.md - Products, Orders, and Inventory modules with filtering and pagination
- [x] 02-04-PLAN.md - Sales, Purchases, and Dashboard modules completing the API

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase                         | Plans Complete | Status      | Completed  |
| ----------------------------- | -------------- | ----------- | ---------- |
| 1. Foundation & Monorepo      | 4/4            | Complete    | 2026-01-24 |
| 2. Backend API with Mock Data | 5/5            | Complete    | 2026-03-01 |
| 3. Web Application            | 0/8            | In Progress | -          |
| 4. Mobile Application         | 4/4            | Complete    | 2026-03-02 |
| 5. Database Integration       | 1/3            | In Progress |            |
| 6. Polish & Production        | 0/?            | Not started | -          |

---

_Roadmap created: 2026-01-23_
_Last updated: 2026-03-02_
