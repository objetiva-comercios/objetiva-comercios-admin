# Project Research Summary

**Project:** objetiva-comercios-admin
**Domain:** Cross-Platform Commercial/Retail Admin System
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

This project is a commercial/retail admin system for small-to-mid operations, delivered as a cross-platform solution (mobile iOS/Android + web) with a unified backend. Research shows that successful admin systems in this domain prioritize operational efficiency over aesthetic minimalism - professionals prefer dense, information-rich interfaces that minimize clicks and navigation. The recommended approach uses a monorepo architecture with React-based frontends (Next.js for web, Capacitor for mobile) sharing design tokens and types while implementing platform-specific UIs, backed by a NestJS API with PostgreSQL.

The critical success factors are: (1) establishing proper monorepo TypeScript configuration from day one to avoid resolution hell, (2) building backend mock data endpoints early to validate auth and API contracts before real data, and (3) accepting platform-specific UI implementations rather than forcing component sharing between React DOM and Capacitor. The stack is modern and production-ready (React 19, Next.js 15.5+, Tailwind v4, Capacitor 7.4, NestJS 11) with strong community support and active maintenance.

Key risks center on cross-platform complexity: iOS navigation requires special handling with Capacitor, Supabase auth client must use request scope in backend to avoid session leakage, and Next.js SSR features must be avoided for mobile builds. Starting with opinionated simplicity and deferring advanced patterns (offline-first, real-time, microservices) until proven necessary will prevent the over-engineering trap that commonly derails greenfield projects.

## Key Findings

### Recommended Stack

The stack prioritizes modern, production-ready technologies with strong TypeScript support and active maintenance. Core decisions: React 19 with Next.js 15.5+ for web (App Router, Server Components), Vite 6 + Capacitor 7.4 for mobile, NestJS 11 for backend, PostgreSQL 15+ with Drizzle ORM (performance over Prisma's DX), Supabase Auth for JWT-based authentication, and Turborepo + pnpm for monorepo management.

**Core technologies:**
- **React 19.2.x + TypeScript 5.5+**: UI framework for mobile and web - latest stable version with Server Components, improved hooks, refs as props
- **Next.js 15.5+**: Web framework with App Router - critical security patches required (CVE-2025-55184)
- **Capacitor 7.4.x**: Mobile runtime for iOS/Android - supports latest OS versions, requires Node 20+ and Java JDK 21
- **Vite 6.x**: Mobile bundler - 5x faster builds, Environment API for dev/prod parity
- **NestJS 11.x**: Backend API framework - modular architecture, first-class TypeScript, strong conventions
- **PostgreSQL 15+ + Drizzle ORM**: Database and ORM - fastest ORM (2025), type-safe, edge-compatible, ~7.4kb
- **Supabase Auth**: Managed authentication - JWT issuance, OAuth providers, session management
- **Turborepo 2.x + pnpm 10.x**: Monorepo tooling - intelligent caching, parallel builds, workspace management
- **Tailwind CSS v4**: Styling - 5x faster builds, 100x faster incremental builds, auto-content detection
- **shadcn/ui**: Component library - copy-paste accessible components on Radix UI, official monorepo support

**Critical version notes:**
- Next.js 15.5+ required for security patches (older versions have critical CVEs)
- TypeScript 5.5+ required for Zod v4 compatibility
- Tailwind v4 released Jan 22, 2025 - production ready, migration guide available
- React 19 stable since Dec 2024 - fully supported by Next.js 15 and Vite 6

### Expected Features

Research reveals a clear feature hierarchy: table stakes users assume exist, differentiators that provide competitive advantage, and anti-features that seem good but create problems.

**Must have (table stakes):**
- **Dashboard with Key Metrics** - Operations-focused (today's sales, low stock alerts, pending orders, recent transactions), not analytics-heavy
- **Inventory Management** - Real-time stock levels, product variants, SKU management, stock alerts, bulk operations
- **Sales Transaction Recording** - Transaction history with search/filter, refunds/returns, payment status tracking
- **Product/Catalog Management** - CRUD operations, categories, pricing, images, bulk import/export essential
- **Order Management** - Order status workflow, fulfillment tracking, clear status indicators
- **User Roles & Permissions** - RBAC with granular permissions and audit logs (security non-negotiable)
- **Search & Filtering** - Fast search across products/orders/customers, multiple filter criteria
- **Data Export** - Export to CSV/Excel for accounting and analysis (mandatory, import is bonus)

**Should have (competitive):**
- **Dense Data Display** - Information-rich interface showing more per screen than competitors (Bloomberg terminal aesthetic)
- **Bulk Operations UX** - Excel-like bulk editing for products, pricing, inventory (power users love this)
- **Smart Stock Alerts** - Predictive low-stock based on sales velocity, not just static thresholds
- **Keyboard Shortcuts** - Alt+N for new order, Ctrl+K for search, etc. (discoverable shortcuts)
- **Intelligent Search** - Fuzzy matching, SKU fragments, product attributes, typo tolerance
- **Realistic Demo Data** - Seed database shows 500+ products with realistic density (not 5 products with lorem ipsum)
- **Mobile-Responsive Admin** - Core workflows mobile-friendly (not full feature parity, but check stock/process orders on the go)

**Defer (v2+):**
- **POS Integration** - Complex real integration; MVP can use manual sales entry
- **Offline-First Architecture** - Significant technical complexity; defer until users report connectivity pain
- **Multi-location Support** - Add when users request warehouse vs storefront separation
- **Advanced Analytics/BI** - Small businesses don't have data scientists; provide basic reports + Excel export instead

**Anti-features (commonly requested, often problematic):**
- **Advanced Analytics Dashboards** - Creates bloat, slows UI, requires clean data and training
- **Full CRM Suite** - Scope explosion; integrate with actual CRM tools via API instead
- **Mobile POS App** - Becomes second product to maintain; web-responsive POS works on tablets
- **Everything Customizable** - Decision paralysis, testing nightmare, support hell
- **AI Chatbot Support** - Masks poor UX; if users need chatbot to navigate, interface is wrong

### Architecture Approach

The architecture follows a monorepo pattern with separated concerns: platform-specific UIs consuming shared design tokens and types, unified backend serving both clients, managed authentication, and separate business database. This avoids the common pitfall of trying to share component code between React DOM (web) and Capacitor (mobile).

**Major components:**
1. **Mobile App (React + Capacitor + Vite)** - iOS/Android native experience with bottom tab navigation + drawer, platform-specific UI components using shared design tokens
2. **Web App (Next.js 15 App Router)** - Desktop-optimized with sidebar navigation, SSR/CSR mix, shadcn/ui components, must use `output: 'export'` for Capacitor compatibility
3. **Shared UI Package** - Design tokens (colors, spacing, typography), TypeScript types (data models, API contracts), utilities - NOT component implementations
4. **Backend API (NestJS)** - Modular feature architecture (Products, Orders, Inventory modules), JWT validation with passport-jwt, mock data services initially
5. **Supabase Auth** - Managed authentication service for JWT issuance, session management - clients use @supabase/supabase-js, backend validates tokens
6. **PostgreSQL (Business Data)** - Separate from Supabase PostgreSQL, accessed via Drizzle ORM with type-safe queries and migrations

**Key patterns:**
- **Shared tokens, not components**: Extract design tokens into shared package, each platform implements own components using these tokens
- **Backend serves mock data**: Backend exposes REST endpoints with realistic dummy data instead of frontend mocks - validates auth and contract early
- **Request-scoped auth**: Supabase client in NestJS uses `Scope.REQUEST` to prevent session leakage between users
- **Turborepo build pipeline**: Define task dependencies so shared packages build before apps, enable caching for speed

### Critical Pitfalls

Research identified 10 critical pitfalls, with the top 5 posing the highest risk to project success:

1. **TypeScript Workspace Resolution Hell** - TypeScript fails to resolve internal dependencies despite successful builds; must configure project references and paths in tsconfig.json from Phase 1
2. **Turborepo Caching Misconfiguration** - Cache hits when outputs should rebuild or constant misses; explicitly declare all inputs including env files and config files outside package directories
3. **Next.js SSR Assumptions with Capacitor** - SSR features stop working in mobile builds; configure `output: 'export'` and `unoptimized: true` for images from day one
4. **iOS Navigation Routing Breaks** - Navigation works on web/Android but completely breaks on iOS due to Capacitor's custom scheme (`capacitor://localhost`); requires patching Next.js router or using Capacitor App plugin
5. **Supabase Auth Client Scope Leakage** - Singleton-scoped client causes auth context to leak between users; use `@Injectable({ scope: Scope.REQUEST })` and `persistSession: false`

**Additional critical pitfalls:**
- **Platform Abstraction Forced Too Early** - Attempting unified components leads to poor UX on both platforms; accept platform-specific implementations
- **Dark Mode Works on Web, Breaks in Mobile** - Theme propagation issues with portaled components (dialogs, popovers) in Capacitor context
- **Mock Data Too Perfect, Production Integration Fails** - UI works with clean mocks but breaks with real data; include error scenarios, slow responses, incomplete data
- **Dependency Version Drift** - Different packages use different versions of same dependency causing type mismatches and bloat; use workspace protocol and syncpack
- **Over-Engineering Phase 1** - Complex architecture (microservices, event sourcing) before knowing requirements; optimize for changeability not premature scale

## Implications for Roadmap

Based on research, suggested phase structure follows a clear dependency chain: foundation (monorepo + auth) → backend (mock data validates contract) → web (faster iteration) → mobile (reuses patterns).

### Phase 1: Foundation & Authentication
**Rationale:** Monorepo configuration, TypeScript project references, and auth must be correct before any code sharing or protected routes can work. These are load-bearing decisions that are expensive to change later.

**Delivers:**
- Monorepo structure with pnpm workspaces + Turborepo configuration
- packages/ui with design tokens (colors, spacing, typography) and shared types
- Supabase Auth project setup and configuration
- NestJS backend auth module with JWT validation strategy
- TypeScript project references configured correctly

**Addresses (STACK):**
- Turborepo + pnpm setup for monorepo management
- TypeScript 5.5+ configuration for type resolution
- Supabase Auth integration pattern

**Avoids (PITFALLS):**
- Pitfall #1: TypeScript Workspace Resolution Hell (Phase 1 critical)
- Pitfall #2: Turborepo Caching Misconfiguration (Phase 1 critical)
- Pitfall #5: Supabase Auth Client Scope Leakage (Phase 1 critical)
- Pitfall #9: Dependency Version Drift (Phase 1 critical)

**Research flag:** SKIP - Standard monorepo patterns well-documented in Turborepo/pnpm docs

### Phase 2: Backend API with Mock Data
**Rationale:** Backend must serve realistic mock data through real REST endpoints before frontend development. This validates auth flow (JWT headers), tests API contract early, and prevents "frontend works in isolation but integration fails" scenario.

**Delivers:**
- NestJS feature modules (Products, Orders, Inventory, Dashboard)
- Mock data services with realistic dummy data (500+ products, varied transactions)
- REST endpoints with JWT guards protecting routes
- CORS configuration for web (localhost:3000) and mobile
- Shared database module and configuration management

**Addresses (FEATURES):**
- Product Catalog Management (mock CRUD operations)
- Inventory Management (mock stock levels)
- Sales Transaction Recording (mock transaction history)
- Order Management (mock order workflow)

**Uses (STACK):**
- NestJS 11.x modular architecture
- passport-jwt for JWT validation
- class-validator/class-transformer for DTOs
- Mock data pattern (no ORM yet, just in-memory arrays)

**Avoids (PITFALLS):**
- Pitfall #8: Mock Data Too Perfect (include error scenarios, slow responses, incomplete data in mocks)

**Research flag:** SKIP - Standard NestJS REST API patterns well-documented

### Phase 3: Web Application
**Rationale:** Web is faster to develop and test than mobile (no build/deploy to device), so it validates backend API contract and auth flow first. Establishes design patterns and component structure that mobile app will adapt (not copy).

**Delivers:**
- Next.js 15 app with App Router structure and layouts
- Supabase Auth integration (login, signup, session management)
- Sidebar navigation layout (always visible, no hamburger menu)
- Core section pages: Dashboard, Products, Orders, Inventory
- shadcn/ui components adapted for dense data display
- API client with JWT headers in Authorization Bearer token
- TanStack Query for server state management and caching

**Addresses (FEATURES):**
- Dashboard with Key Metrics (operations-focused, dense but hierarchical)
- Product/Catalog Management (CRUD with dense forms)
- Inventory Management (stock levels, adjustments)
- Sales Transaction Recording (transaction list)
- Order Management (order status workflow)
- Search & Filtering (fast product/order search)
- Data Export (CSV export capability)

**Uses (STACK):**
- Next.js 15.5+ with App Router and `output: 'export'` configuration
- React 19.2.x with Server Components
- Tailwind CSS v4 for styling
- shadcn/ui component library
- TanStack Query v5 for data fetching
- Zod v4 for validation

**Implements (ARCHITECTURE):**
- Client-side data fetching pattern (no SSR for Capacitor compatibility)
- Dense data display philosophy (more info per screen)
- Sidebar navigation with persistent layout

**Avoids (PITFALLS):**
- Pitfall #3: Next.js SSR Assumptions (configure `output: 'export'` from start)
- Pitfall #6: Platform Abstraction Forced Early (web-specific components, not shared)
- Pitfall #10: Over-Engineering Phase 1 (simple patterns, straightforward state management)

**Research flag:** SKIP - Next.js App Router and shadcn/ui have extensive documentation

### Phase 4: Mobile Application
**Rationale:** Mobile comes last because it depends on web's validated patterns (auth, API integration, data flow). Capacitor build/deploy cycle is slower than web, and most complexity is already solved. Mobile adapts web patterns to platform-specific UI (bottom tabs + drawer instead of sidebar).

**Delivers:**
- React + Vite + Capacitor project structure
- Supabase Auth integration (reuse pattern from web)
- Bottom tab navigation (primary sections) + drawer (secondary actions)
- Core section screens with same content as web but mobile-optimized UI
- Platform-specific UI components using shared design tokens
- API client with JWT headers (reuse pattern from web)
- TanStack Query for data fetching (same as web)

**Addresses (FEATURES):**
- Mobile-Responsive Admin (core workflows mobile-friendly)
- Same functional features as web (Dashboard, Products, Orders, Inventory)
- Platform-appropriate navigation (bottom tabs vs sidebar)

**Uses (STACK):**
- Vite 6.x for bundling
- Capacitor 7.4.x for iOS/Android runtime
- React 19.2.x (same as web)
- Tailwind-compatible styling solution or inline styles
- Capacitor plugins (@capacitor/app, @capacitor/keyboard, etc.)

**Implements (ARCHITECTURE):**
- Platform-specific UI components (not shared with web)
- Bottom tab navigation + drawer pattern
- Mobile-optimized touch targets and spacing

**Avoids (PITFALLS):**
- Pitfall #4: iOS Navigation Routing Breaks (use Capacitor App plugin or patch Next.js router)
- Pitfall #6: Platform Abstraction Forced Early (mobile-specific components accepted)
- Pitfall #7: Dark Mode Breaks in Mobile (test theme propagation to portaled components)

**Research flag:** NEEDS RESEARCH - iOS navigation workarounds are niche and version-specific; may need deeper investigation during implementation

### Phase 5: Database Integration
**Rationale:** Replace mock data with real PostgreSQL + Drizzle ORM after frontend-backend contract is validated and stable. This is a backend-only change that shouldn't require frontend modifications if contract was correct.

**Delivers:**
- PostgreSQL database schema with migrations
- Drizzle ORM integration in NestJS
- Real CRUD operations replacing mock data services
- Database seeding with realistic demo data (500+ products)
- Connection pooling and optimization

**Uses (STACK):**
- PostgreSQL 15+ database
- Drizzle ORM with type-safe queries
- Drizzle Kit for migrations

**Addresses (ARCHITECTURE):**
- Data layer persistence
- Realistic demo data for showcasing product

**Avoids (PITFALLS):**
- Pitfall #8: Mock Data Too Perfect (maintain error handling and edge cases from mock phase)

**Research flag:** SKIP - Drizzle ORM with NestJS is straightforward despite no official integration

### Phase 6: Polish & Production Readiness
**Rationale:** After core functionality works, focus on production-critical features: error handling, loading states, responsive design, performance optimization, security hardening.

**Delivers:**
- Error boundaries throughout application
- Comprehensive loading states with skeletons
- Mobile responsive refinements (tablet and phone)
- Performance optimization (bundle splitting, image optimization)
- User roles and permissions (RBAC guards)
- Security audit (RLS policies if using Supabase features, rate limiting, input sanitization)

**Addresses (FEATURES):**
- User Roles & Permissions (Phase 2 feature)
- Responsive Layout (complete mobile optimization)
- Keyboard Shortcuts (power user efficiency)

**Avoids (PITFALLS):**
- Security mistakes (RLS policies, input validation, secrets management)
- UX pitfalls (loading states, error states, feedback on actions)
- Performance traps (pagination, bundle splitting)

**Research flag:** SKIP - Standard production hardening patterns

### Phase Ordering Rationale

**Critical path:** Foundation → Backend → Web → Mobile → Database → Polish

This order is based on:

1. **Dependency chain from ARCHITECTURE:** packages/ui must exist before apps can import design tokens; backend auth must work before protected routes can be tested; web validates patterns before mobile adapts them

2. **Risk mitigation from PITFALLS:** Phase 1 addresses all "must fix immediately" pitfalls (TypeScript resolution, Turborepo caching, auth scope leakage, dependency drift); Phase 2 validates mock data pattern to prevent integration surprises; Phase 3 establishes web patterns before mobile complexity

3. **Feature dependencies from FEATURES:** Dashboard requires transactional data sources (sales, inventory, orders); Order Management requires Inventory for stock deduction; Reporting enhances with export capability

4. **Validation strategy:** Backend serves mocks → Web validates contract → Mobile reuses patterns → Database swaps implementation (minimal frontend change)

5. **Iteration speed:** Web is faster to develop/test than mobile (no device builds), so it validates API and UX patterns first

**Parallel work opportunities:**
- After Phase 1: Backend (Phase 2) and packages/ui enhancements can develop in parallel
- After Phase 2: Web (Phase 3) and mobile (Phase 4) can start in parallel if different developers, but web should finish first to establish patterns
- Phase 5 (Database) and Phase 6 (Polish) can overlap - database migration in backend while frontend polish continues

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Mobile):** iOS navigation workarounds with Capacitor are version-specific and niche; GitHub issues show ongoing challenges with Next.js router + Capacitor custom schemes; may need `/gsd:research-phase` to find current workarounds for Capacitor 7.4 + Next.js 15.5

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Turborepo + pnpm monorepo setup is well-documented with multiple templates and guides
- **Phase 2 (Backend):** NestJS REST API with JWT authentication follows standard patterns extensively documented
- **Phase 3 (Web):** Next.js App Router with shadcn/ui has comprehensive official documentation and examples
- **Phase 5 (Database):** Drizzle ORM integration is straightforward despite no official NestJS module
- **Phase 6 (Polish):** Standard production hardening patterns apply universally

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are production-ready with stable releases, official documentation, and active maintenance. Version compatibility verified across stack (React 19 + Next.js 15.5+, TypeScript 5.5+ + Zod v4, etc.). Multiple real-world examples of this stack combination in monorepo contexts. |
| Features | HIGH | Based on analysis of industry standards, competitor feature sets, and best practices from multiple retail management systems. Clear consensus on table stakes vs differentiators. Anti-features identified from feature bloat research and usability studies. |
| Architecture | HIGH | Monorepo architecture extensively documented with Turborepo + pnpm. Cross-platform patterns validated by multiple sources. Auth strategy (Supabase + NestJS JWT validation) has working examples and community implementations. Separation of concerns follows established best practices. |
| Pitfalls | HIGH | Pitfalls sourced from real GitHub issues (Capacitor iOS navigation), production experience reports (Supabase scope leakage), and documented monorepo challenges (TypeScript resolution, Turborepo caching). Prevention strategies are specific and actionable. |

**Overall confidence:** HIGH

### Gaps to Address

Despite high confidence, several areas need attention during planning and execution:

- **iOS Navigation Workaround:** The Capacitor + Next.js router incompatibility has multiple proposed solutions (patch-package, Capacitor App plugin, custom router wrapper) but no definitive "best practice." Phase 4 planning should research current state with Capacitor 7.4 + Next.js 15.5 specifically.

- **Dark Mode Implementation Details:** Research shows the problem (portaled components don't inherit theme) but solutions vary by Tailwind version and framework. Testing required early in Phase 1 to validate approach for Tailwind v4 + Next.js + Capacitor combination.

- **Realistic Demo Data Approach:** Features research emphasizes importance of realistic data density (500+ products) but implementation details need planning: seed script strategy, data generation tool choice (Faker.js alternatives), maintaining data across phases (mock → database migration).

- **Dense UI Design Patterns:** "Information-rich, Bloomberg terminal aesthetic" is the goal but specific component layouts and hierarchy need design exploration. This is less technical gap, more design validation - does target user actually prefer density or is it preference assumption?

- **Mobile Touch Target Adaptation:** shadcn/ui components are web-optimized (mouse targets); mobile needs larger hit areas (44x44px iOS/Android guidelines). Systematic approach needed: override all shadcn components or case-by-case adaptation?

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19) - React 19 features, Server Components, new hooks
- [Next.js 15 Security Update](https://nextjs.org/blog/security-update-2025-12-11) - Critical CVE-2025-55184 and CVE-2025-55183 patches
- [Vite 6.0 Announcement](https://vite.dev/blog/announcing-vite6) - Environment API, performance improvements
- [Tailwind CSS v4 Release](https://tailwindcss.com/blog/tailwindcss-v4) - 5x faster builds, auto-content detection
- [Capacitor 7 GA Announcement](https://ionic.io/blog/capacitor-7-has-hit-ga) - Android 15 & iOS 18 support
- [pnpm in 2025](https://pnpm.io/blog/2025/12/29/pnpm-in-2025) - pnpm v10 security-first features
- [Turborepo Docs](https://turbo.build/repo/docs) - Monorepo build system documentation
- [shadcn/ui Monorepo Guide](https://ui.shadcn.com/docs/monorepo) - Official monorepo setup patterns
- [NestJS Database Guide](https://docs.nestjs.com/techniques/database) - ORM integration patterns
- [Supabase Auth Architecture](https://supabase.com/docs/guides/auth/architecture) - JWT validation patterns

**Context7 Libraries (verified source):**
- /vercel/next.js - Next.js App Router patterns and best practices
- /websites/capacitorjs - Capacitor React integration
- /websites/nestjs - NestJS REST API patterns
- /websites/turborepo - Turborepo monorepo setup
- /websites/ui_shadcn - shadcn/ui component patterns
- /websites/tanstack_query_v5 - TanStack Query data fetching

### Secondary (MEDIUM confidence)

**Industry Analysis & Best Practices:**
- [Best Retail Management Systems 2026 | Capterra](https://www.capterra.com/retail-management-systems-software/) - Feature comparison and user expectations
- [Retail Business Management Guide | Synergix](https://www.synergixtech.com/news-event/business-blog/retail-business-management-for-smes/) - SME-specific requirements
- [Best ORM for NestJS 2025 | DEV](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) - Drizzle vs Prisma performance comparison
- [Complete Monorepo Guide | jsdev.space](https://jsdev.space/complete-monorepo-guide/) - pnpm + Workspace + Changesets patterns
- [Monorepo Configuration | Nhost](https://nhost.io/blog/how-we-configured-pnpm-and-turborepo-for-our-monorepo) - Production monorepo experience

**Cross-Platform Architecture:**
- [Setup Monorepo NestJS + Next.js | Medium](https://medium.com/@alan.nguyen2050/setup-monorepo-for-nestjs-api-nextjs-fe-05e82945a8b5) - Monorepo patterns
- [Turborepo + pnpm + Capacitor | DEV](https://dev.to/saltorgil/from-monolith-to-monorepo-building-faster-with-turborepo-pnpm-and-capacitor-41ng) - Build optimization
- [Backends for Frontends Pattern | AWS](https://aws.amazon.com/blogs/mobile/backends-for-frontends-pattern/) - When to use BFF pattern
- [NestJS Supabase Auth | GitHub](https://github.com/hiro1107/nestjs-supabase-auth) - JWT validation implementation

### Tertiary (LOW confidence - requires validation)

**Pitfall-Specific Issues:**
- [Capacitor iOS Navigation Issue #3664](https://github.com/ionic-team/capacitor/issues/3664) - Next.js router + iOS custom scheme incompatibility (version-specific)
- [Setup Supabase with NestJS | Blog](https://blog.andriishupta.dev/setup-supabase-with-nestjs) - Auth client scope considerations (single blog post)
- [Dark Mode in Shadcn | Medium](https://medium.com/@hiteshchauhan2023/dark-mode-in-shadcn-easy-theme-switching-3f3fde99eeb6) - Theme switching patterns (community guide)
- [Building with Mock Data | Medium](https://medium.com/lotuss-it/building-with-mock-data-smart-front-end-strategy-or-future-headache-548cafe95c7b) - Mock data strategy considerations (opinion piece)

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
