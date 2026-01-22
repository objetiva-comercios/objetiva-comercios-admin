# Stack Research

**Domain:** Cross-platform Commercial Admin Application (Mobile + Web + Backend)
**Researched:** 2026-01-22
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **React** | 19.2.x | UI library for mobile & web | Industry standard for component-based UIs. React 19 (stable Dec 2024) brings Server Components, improved concurrent rendering, new hooks (`useActionState`, `useOptimistic`), and refs as props without `forwardRef`. Current stable: 19.2.3. [Source](https://react.dev/blog/2024/12/05/react-19) |
| **TypeScript** | 5.5+ | Type safety across all layers | Required for Zod v4 compatibility (tested against 5.5+), provides static analysis for monorepo code sharing, and is first-class citizen in all stack components (Next.js, NestJS, Vite). |
| **Next.js** | 15.x (15.5+) | Web application framework | App Router (stable) with React Server Components, optimized for production. **Critical:** Use 15.5+ for latest security patches (CVE-2025-55184, CVE-2025-55183). Next.js 16 available but 15.x recommended for stability. [Source](https://nextjs.org/blog/security-update-2025-12-11) |
| **Vite** | 6.x | Mobile app bundler | 6.0 released Nov 2024 as "most significant release since Vite 2". Environment API for dev/prod parity, 5x faster full builds, supports Node 18/20/22+. Native React+TypeScript templates (`react-ts`, `react-swc-ts`). [Source](https://vite.dev/blog/announcing-vite6) |
| **Capacitor** | 7.4.x (or 8.x) | Mobile runtime (iOS/Android) | Cross-platform native runtime for web apps. Version 7.4.5 (latest 7.x, Jan 2025) supports Android 15 & iOS 18. Requires Node 20+, Java JDK 21. Version 8.0.1 available for cutting-edge. Works seamlessly with React+Vite. [Source](https://ionic.io/blog/capacitor-7-has-hit-ga) |
| **NestJS** | 11.x (latest) | Backend API framework | Progressive Node.js framework with TypeScript, built-in DI, modular architecture. First-class PostgreSQL support via TypeORM/Prisma/Drizzle. Designed for scalable enterprise applications with strong conventions. [Source](https://docs.nestjs.com/) |
| **PostgreSQL** | 15+ | Primary database | Industry-standard relational database. Use 15+ for performance improvements. All recommended ORMs (Drizzle, Prisma, TypeORM) have excellent PostgreSQL support. |
| **Supabase Auth** | Latest | Authentication service | JWT-based auth with automatic token management. Backend validates JWTs using `passport-jwt` strategy in NestJS. Client libraries for React (web/mobile). No database coupling required. [Source](https://supabase.com/docs/guides/auth/jwts) |
| **pnpm** | 10.x | Package manager | v10 focus: security-first (scripts blocked by default), config dependencies for monorepo centralization. 2x more downloads than 2024. Built-in workspaces, strict node_modules, parallel installs. [Source](https://pnpm.io/blog/2025/12/29/pnpm-in-2025) |
| **Turborepo** | 2.x | Monorepo build system | High-performance build system by Vercel. Remote caching, intelligent task scheduling, zero-config for Next.js. Perfect pairing with pnpm workspaces. [Source](https://turbo.build/repo/docs) |
| **Tailwind CSS** | 4.x | Utility-first CSS | v4.0 released Jan 22, 2025. 5x faster full builds, 100x faster incremental builds (microseconds). Auto-detects content (no config), first-party Vite plugin, modern CSS (cascade layers, @property). [Source](https://tailwindcss.com/blog/tailwindcss-v4) |
| **shadcn/ui** | Latest | Component library | Copy-paste accessible components. Built on Radix UI + Tailwind. Official monorepo support with `@workspace/ui` pattern. Next.js (Monorepo) template available. Uses React 19 + Tailwind v4. [Source](https://ui.shadcn.com/docs/monorepo) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **TanStack Query** | v5.x (latest) | Server state management | Every app needs API data fetching. Industry standard for caching, background updates, optimistic updates. Works client-side (mobile/web). Replace Redux/Context for server state. [Source](https://tanstack.com/query/v5/docs/framework/react/overview) |
| **Zod** | v4.x (4.3.5+) | Schema validation | v4 released 2025: 14x faster strings, 7x faster arrays. Use `@zod/mini` (~1.9kb gzipped) for frontend. Validates API requests/responses, form inputs. TypeScript-first. [Source](https://github.com/colinhacks/zod/releases) |
| **React Router** | 6.x | Mobile routing (Capacitor) | For Capacitor mobile app (SPA mode). Use v6.x for SPA routing. TanStack Router is alternative for advanced type-safety but React Router is simpler/proven. Next.js handles web routing. |
| **Drizzle ORM** | Latest | Database ORM (NestJS) | **Recommended** for new projects. Fastest ORM (2025), ~7.4kb, zero deps, edge-compatible. Raw SQL speed + TypeScript safety. Best for performance-critical apps. [Source](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) |
| **Axios** | 1.x | HTTP client | Simple, interceptor support for auth tokens. Alternative: `fetch` (native) + TanStack Query. Use axios for consistent error handling and request/response transformation. |
| **date-fns** | 3.x | Date utilities | Lightweight, tree-shakable, functional. Better than Moment.js (deprecated). Alternative: Day.js (smaller). |
| **class-validator** | Latest | DTO validation (NestJS) | Decorator-based validation for NestJS DTOs. Works alongside Zod. Standard in NestJS ecosystem. |
| **class-transformer** | Latest | DTO transformation (NestJS) | Converts plain objects to class instances. Pairs with class-validator. Standard in NestJS. |
| **@supabase/supabase-js** | 2.x | Supabase client | Client library for Supabase Auth in React (web/mobile). Handles token refresh, session management. |
| **passport-jwt** | Latest | JWT validation (NestJS) | Passport strategy for validating Supabase JWTs in NestJS. Use with `@nestjs/passport`. [Source](https://github.com/hiro1107/nestjs-supabase-auth) |
| **Vitest** | 4.x | Testing framework | Vite-native testing. 2025 stack: React 18.3.1, @testing-library/react 16.3.0, Vitest 2.1.0+. Faster than Jest, native ESM, browser mode available. [Source](https://vitest.dev/) |
| **@testing-library/react** | 16.x | Component testing | Industry standard for React testing. Focuses on user behavior. Works with Vitest. |
| **Playwright** | Latest | E2E testing | Modern E2E testing. Better than Cypress for cross-browser. Auto-waits, trace viewer, codegen. Optional for E2E layer. |
| **ESLint** | 9.x | Linting | Static analysis. Use `@typescript-eslint` parser, `eslint-config-next` for Next.js, NestJS ESLint configs. |
| **Prettier** | 3.x | Code formatting | Opinionated formatter. Reduces bikeshedding. Use with `eslint-config-prettier` to avoid conflicts. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Turborepo** | Monorepo task runner | Configure in `turbo.json`. Define `build`, `dev`, `test`, `lint` tasks. Use `dependsOn` for task ordering. |
| **pnpm workspaces** | Package management | Define in `pnpm-workspace.yaml`. Use `packages: ["apps/*", "packages/*"]` pattern. |
| **TypeScript** | Type checking | Shared `tsconfig.json` in root, extended in each package. Use `@repo/tsconfig` for shared configs. |
| **shadcn CLI** | Component installation | `npx shadcn@latest add [component]`. Use in both `apps/web` and `packages/ui` with proper aliases. |
| **Drizzle Kit** | Database migrations | `drizzle-kit generate`, `drizzle-kit migrate`. Type-safe schema definitions, auto-migration generation. |
| **Capacitor CLI** | Mobile builds | `npx cap sync`, `npx cap open ios/android`. Syncs web assets to native projects. |
| **VS Code** | IDE | Best TypeScript support. Extensions: ESLint, Prettier, Tailwind IntelliSense, Error Lens. |

## Installation

### Monorepo Initialization
```bash
# Initialize Turborepo with Next.js template
pnpm dlx create-turbo@latest

# Or start from scratch
mkdir objetiva-comercios-admin && cd objetiva-comercios-admin
pnpm init
```

### Root Dependencies
```bash
# Core monorepo tools
pnpm add -Dw turbo prettier eslint typescript

# TypeScript configs (workspace packages)
# Created manually in packages/tsconfig
```

### Web App (apps/web - Next.js)
```bash
cd apps/web

# Core dependencies
pnpm add next@latest react@latest react-dom@latest

# TanStack Query
pnpm add @tanstack/react-query @tanstack/react-query-devtools

# Form & validation
pnpm add zod react-hook-form @hookform/resolvers

# Supabase Auth
pnpm add @supabase/supabase-js

# Utilities
pnpm add axios date-fns clsx tailwind-merge

# Dev dependencies
pnpm add -D tailwindcss postcss autoprefixer @types/node @types/react @types/react-dom eslint eslint-config-next typescript
```

### Mobile App (apps/mobile - Capacitor + React + Vite)
```bash
cd apps/mobile

# Initialize Vite React TypeScript
pnpm create vite@latest . --template react-swc-ts

# Core dependencies
pnpm add react@latest react-dom@latest react-router-dom

# Capacitor
pnpm add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
pnpm add @capacitor/app @capacitor/keyboard @capacitor/splash-screen @capacitor/status-bar

# TanStack Query
pnpm add @tanstack/react-query @tanstack/react-query-devtools

# Form & validation
pnpm add zod react-hook-form @hookform/resolvers

# Supabase Auth
pnpm add @supabase/supabase-js

# Utilities
pnpm add axios date-fns clsx tailwind-merge

# Dev dependencies
pnpm add -D vite @vitejs/plugin-react-swc tailwindcss postcss autoprefixer @types/react @types/react-dom typescript vitest
```

### Backend API (apps/api - NestJS)
```bash
# Create NestJS app
pnpm dlx @nestjs/cli new apps/api

cd apps/api

# Core dependencies (if not included)
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs

# Database - Drizzle (recommended)
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Alternative: Prisma
# pnpm add prisma @prisma/client
# pnpm add -D prisma

# Alternative: TypeORM (if enterprise/existing codebase)
# pnpm add @nestjs/typeorm typeorm pg

# Auth
pnpm add @nestjs/passport @nestjs/jwt passport passport-jwt
pnpm add -D @types/passport-jwt

# Validation
pnpm add class-validator class-transformer

# Configuration
pnpm add @nestjs/config

# Utilities
pnpm add zod date-fns

# Dev dependencies
pnpm add -D @nestjs/testing @types/node @types/express typescript ts-node tsconfig-paths
```

### Shared UI Package (packages/ui)
```bash
cd packages/ui

# Initialize shadcn/ui
pnpm dlx shadcn@latest init

# Core dependencies (peer dependencies)
# react, react-dom, tailwindcss provided by consuming apps

# Radix UI primitives (installed by shadcn)
# @radix-ui/* packages

# Utilities
pnpm add clsx tailwind-merge class-variance-authority lucide-react
```

### Testing
```bash
# In each app/package
pnpm add -D vitest @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui

# E2E (optional, in apps/web or apps/mobile)
pnpm add -D @playwright/test
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Drizzle ORM** | Prisma | Use Prisma if DX > performance (early-stage products, rapid prototyping). Excellent migration tooling and Prisma Studio. Accept ~10-30% perf overhead. [Source](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) |
| **Drizzle ORM** | TypeORM | Use TypeORM for massive enterprise monoliths with existing TypeORM codebases. First-class NestJS integration. More mature but slower. [Source](https://docs.nestjs.com/techniques/database) |
| **React Router** | TanStack Router | Use TanStack Router if type-safety is critical and team can invest learning time. Best for client-heavy interactive dashboards. Still beta for SSR (TanStack Start). [Source](https://betterstack.com/community/comparisons/tanstack-router-vs-react-router/) |
| **Tailwind CSS v4** | Tailwind CSS v3 | Stay on v3 if upgrading is not urgent. v4 is production-ready but requires migration. Both are maintained. |
| **Capacitor** | React Native | Use React Native if native performance/complex animations are required or team has RN expertise. Capacitor is simpler for web-first teams. |
| **Vitest** | Jest | Use Jest only if existing codebase requires it. Vitest is faster, better DX, and native ESM support. |
| **Axios** | Native fetch | Use native `fetch` + TanStack Query for smaller bundle. Axios is better for interceptor patterns (auth, logging). |
| **date-fns** | Day.js | Use Day.js if bundle size is critical (2kb vs 13kb tree-shaken). date-fns is more functional and comprehensive. |
| **Supabase Auth** | Auth0 / Clerk | Use Auth0 for enterprise SSO requirements. Use Clerk for pre-built UI components. Supabase is simpler for JWT-only validation. |
| **shadcn/ui** | Mantine / Chakra UI | Use Mantine/Chakra if you prefer component library with theme system. shadcn gives full control (copy-paste) and better customization. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Moment.js** | Deprecated since 2020. Large bundle (67kb). Mutable API causes bugs. | date-fns (13kb) or Day.js (2kb) |
| **Create React App (CRA)** | No longer maintained. Slow builds. No SSR/SSG. React team recommends frameworks. | Vite (for mobile SPA) or Next.js (for web) |
| **Redux Toolkit** | Overkill for server state. TanStack Query solves 90% of state needs. Use only for complex client state. | TanStack Query + React Context for UI state |
| **Lerna** | Outdated monorepo tool. Poor performance. Most features now in pnpm/npm workspaces. | Turborepo + pnpm workspaces |
| **Angular** | Wrong framework. Stack is React-based. | React (as specified in constraints) |
| **MongoDB** | Stack uses PostgreSQL. NoSQL not ideal for relational data (products, orders, inventory). | PostgreSQL + Drizzle/Prisma |
| **GraphQL** | Unnecessary complexity for CRUD admin. REST is simpler, faster to develop. Use GraphQL only if frontend needs are complex. | REST API (NestJS controllers) |
| **Yarn v1** | Classic Yarn is slow, deprecated. Yarn v2+ (Berry) has breaking changes and poor compatibility. | pnpm (faster, better monorepo support) |
| **Next.js 13 / 14** | Security vulnerabilities (CVE-2025-55184, CVE-2025-55183). Upgrade to 15.5+ immediately. | Next.js 15.5+ [Source](https://nextjs.org/blog/security-update-2025-12-11) |
| **Emotion / Styled Components** | Runtime CSS-in-JS hurts performance. Tailwind v4 is 5x faster. React 19 Server Components don't support runtime CSS-in-JS. | Tailwind CSS v4 |
| **Sequelize** | Legacy ORM with poor TypeScript support. Slow, verbose API. Active alternatives exist. | Drizzle, Prisma, or TypeORM |
| **Expo** | Constraints specify Capacitor. Expo ties you to Expo ecosystem. | Capacitor (as specified) |

## Stack Patterns by Variant

### If you need offline-first mobile capabilities:
- Use **TanStack Query** with `persistQueryClient` + async storage
- Add **@capacitor/preferences** for key-value storage
- Add **@capacitor/network** for connection monitoring
- Consider **Drizzle ORM** in mobile app (with SQLite) for local DB

### If you need real-time features:
- Add **Supabase Realtime** (WebSocket subscriptions)
- Or use **WebSockets** in NestJS (`@nestjs/websockets`, `@nestjs/platform-socket.io`)
- TanStack Query can auto-refetch on events

### If you need file uploads:
- Use **Supabase Storage** (S3-compatible) for simple use cases
- Or implement **Multer** in NestJS for custom storage logic
- Add **@capacitor/camera** for mobile photo uploads

### If you need background jobs:
- Add **Bull** (Redis-based queue) in NestJS
- Or use **BullMQ** (modern Bull v4+)
- Use for email sending, report generation, data imports

### If you need multi-tenancy:
- Use **PostgreSQL Row-Level Security (RLS)** if using Supabase
- Or implement **tenant_id** column + middleware in NestJS
- Drizzle: use `$dynamic()` for runtime tenant filters

### If you need advanced data tables:
- Add **TanStack Table v8** (headless table library)
- Handles sorting, filtering, pagination, column visibility
- Works with shadcn/ui `<Table>` components

### If you need charts/dashboards:
- Add **Recharts** (simpler) or **Chart.js** (more features)
- Or use **Apache ECharts** for complex visualizations
- Consider **Tremor** (React library for dashboards)

### If you need PDF generation:
- Add **Puppeteer** (server-side) for HTML-to-PDF
- Or use **jsPDF** / **pdfmake** for client-side generation
- Or use **@react-pdf/renderer** for declarative PDFs

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| **React 19.x** | Next.js 15.5+ | Next.js 15 supports React 19. Next.js 14 uses React 18. |
| **React 19.x** | TanStack Query v5 | Fully compatible. React 18 also supported. |
| **React 19.x** | React Router v6 | Compatible. v7 also supports React 19. |
| **Tailwind v4** | shadcn/ui latest | shadcn monorepo template uses Tailwind v4. Migration guide available. [Source](https://ui.shadcn.com/docs/tailwind-v4) |
| **Vite 6.x** | React 19.x | Vite 6 fully supports React 19 with `@vitejs/plugin-react` or `@vitejs/plugin-react-swc`. |
| **Vitest 4.x** | React 19.x | Compatible. Use @testing-library/react 16.x. |
| **pnpm 10.x** | Turborepo 2.x | Fully compatible. Turborepo officially supports pnpm. |
| **TypeScript 5.5+** | Zod v4.x | Zod v4 tested against TS 5.5+. Older versions may work but not supported. |
| **NestJS 11.x** | Drizzle ORM | No official NestJS integration, but works with dependency injection. Use `drizzle-orm/postgres`. |
| **NestJS 11.x** | Prisma 6.x | Official `@nestjs/prisma` module available. Prisma 6+ recommended. |
| **NestJS 11.x** | TypeORM 0.3.x | Official `@nestjs/typeorm` module. Use TypeORM 0.3.20+. |
| **Capacitor 7.x** | Node 20+ | Capacitor 7 requires Node 20+, Java JDK 21. |
| **Capacitor 7.x** | Vite 6.x | Fully compatible. Capacitor works with any bundler. |

## Sources

### Official Documentation
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19) - React 19 features and release notes
- [Next.js 15 Security Update](https://nextjs.org/blog/security-update-2025-12-11) - Critical security patches
- [Vite 6.0 Announcement](https://vite.dev/blog/announcing-vite6) - Vite 6 features and performance
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) - Tailwind v4 release and features
- [Capacitor 7 GA](https://ionic.io/blog/capacitor-7-has-hit-ga) - Capacitor 7 release announcement
- [pnpm in 2025](https://pnpm.io/blog/2025/12/29/pnpm-in-2025) - pnpm v10 features and security
- [TanStack Query v5 Docs](https://tanstack.com/query/v5/docs/framework/react/overview) - TanStack Query usage
- [shadcn/ui Monorepo](https://ui.shadcn.com/docs/monorepo) - Monorepo setup with shadcn
- [NestJS Database Guide](https://docs.nestjs.com/techniques/database) - NestJS ORM integration
- [Supabase Auth JWTs](https://supabase.com/docs/guides/auth/jwts) - JWT validation in Supabase

### Context7 Verified
- `/vercel/next.js` - Next.js App Router patterns and best practices
- `/websites/capacitorjs` - Capacitor React integration
- `/websites/nestjs` - NestJS REST API patterns
- `/websites/turborepo` - Turborepo monorepo setup
- `/websites/ui_shadcn` - shadcn/ui component patterns
- `/websites/tanstack_query_v5` - TanStack Query data fetching

### Community Analysis (2025)
- [Best ORM for NestJS in 2025](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) - Drizzle vs Prisma vs TypeORM
- [TanStack Router vs React Router v7](https://betterstack.com/community/comparisons/tanstack-router-vs-react-router/) - Router comparison
- [Complete Monorepo Guide: pnpm + Workspace + Changesets](https://jsdev.space/complete-monorepo-guide/) - Monorepo best practices
- [NestJS Supabase Auth](https://github.com/hiro1107/nestjs-supabase-auth) - JWT validation with Passport
- [Zod v4 Release](https://github.com/colinhacks/zod/releases) - Zod v4 performance improvements

---
*Stack research for: Cross-platform Commercial Admin Application*
*Researched: 2026-01-22*
*All versions and recommendations verified against official sources and 2025 community best practices*
