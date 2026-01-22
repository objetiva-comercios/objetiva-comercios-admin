# Architecture Research

**Domain:** Cross-Platform Commercial Admin System (Mobile + Web + Backend)
**Researched:** 2026-01-22
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Mobile App     │  │    Web App       │  │  Shared UI Pkg   │  │
│  │  (React+Cap)     │  │   (Next.js)      │  │  (Design System) │  │
│  │  - iOS           │  │   - App Router   │  │  - Tokens        │  │
│  │  - Android       │  │   - SSR          │  │  - Components    │  │
│  │  - Bottom Tabs   │  │   - Sidebar      │  │  - Types         │  │
│  │  - Drawer Nav    │  │   - CSR          │  │  - Utils         │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │             │
│           └─────────────────────┴─────────────────────┘             │
│                                 │                                   │
├─────────────────────────────────┼───────────────────────────────────┤
│                        AUTH LAYER (Supabase)                         │
│  ┌──────────────────────────────┴────────────────────────────────┐  │
│  │  Supabase Auth (JWT issuance, user management, sessions)      │  │
│  │  - Email/Password, OAuth providers                            │  │
│  │  - JWT signing with RS256 (asymmetric keys)                   │  │
│  │  - Token refresh, session management                          │  │
│  └────────────────────────────┬──────────────────────────────────┘  │
│                                │ (JWT Bearer Token)                  │
├─────────────────────────────────┼───────────────────────────────────┤
│                          BACKEND LAYER                               │
│  ┌────────────────────────────┴──────────────────────────────────┐  │
│  │                      NestJS API                                │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐ │  │
│  │  │ Auth Module   │  │  Core Modules │  │  Shared Module    │ │  │
│  │  │ - JWT Guard   │  │  - Products   │  │  - Config         │ │  │
│  │  │ - Passport    │  │  - Orders     │  │  - Database       │ │  │
│  │  │ - Supabase    │  │  - Inventory  │  │  - Logging        │ │  │
│  │  │   Strategy    │  │  - Dashboard  │  │  - Validation     │ │  │
│  │  └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘ │  │
│  │          │                  │                     │           │  │
│  │          └──────────────────┴─────────────────────┘           │  │
│  │                             │                                  │  │
│  └─────────────────────────────┼──────────────────────────────────┘  │
│                                │                                     │
├─────────────────────────────────┼───────────────────────────────────┤
│                          DATA LAYER                                  │
│  ┌────────────────────────────┴──────────────────────────────────┐  │
│  │              PostgreSQL (Business Data)                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │ Products │  │  Orders  │  │Inventory │  │ Settings │      │  │
│  │  │  Table   │  │  Table   │  │  Table   │  │  Table   │      │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │  │
│  │                                                                 │  │
│  │  Note: Separate from Supabase PostgreSQL (auth.users)         │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Mobile App** | iOS/Android native experience with platform-specific navigation (bottom tabs + drawer) | React + TypeScript + Capacitor + Vite. Platform-specific UI components styled with Tailwind-compatible solution or inline styles. |
| **Web App** | Desktop-optimized admin interface with sidebar navigation and SSR/CSR | Next.js 14+ (App Router) + React + TypeScript + shadcn/ui + Tailwind CSS. Server and client components based on data needs. |
| **Shared UI Package** | Design system with tokens, component APIs, types, and utilities shared across platforms | TypeScript package with design tokens (colors, spacing, typography), type definitions, shared utilities. NOT full component implementations (platform-specific). |
| **Supabase Auth** | User authentication, JWT issuance, session management | Managed service. Clients use @supabase/supabase-js, backend validates JWTs with passport-jwt + SUPABASE_JWT_SECRET. |
| **NestJS Backend** | Business logic, data access, REST API endpoints, JWT validation | Modular architecture with feature modules (Products, Orders, etc.), shared module (config, database, guards), and auth module (JWT strategy). |
| **PostgreSQL (Business)** | Persistent storage for all business data | Separate PostgreSQL instance from Supabase. Accessed via Prisma or Drizzle ORM with type-safe queries and migrations. |

## Recommended Project Structure

```
root/
├── apps/                           # Application services
│   ├── mobile/                     # Mobile app (React + Capacitor)
│   │   ├── src/
│   │   │   ├── app/                # App entry, routing, tab/drawer navigation
│   │   │   ├── features/           # Feature modules (dashboard, products, etc.)
│   │   │   ├── components/         # Mobile-specific UI components
│   │   │   ├── hooks/              # React hooks for state, auth, data fetching
│   │   │   ├── services/           # API client, Supabase client
│   │   │   ├── stores/             # State management (Zustand/Context)
│   │   │   └── styles/             # Platform-specific styles
│   │   ├── capacitor.config.ts     # Capacitor config for iOS/Android
│   │   ├── vite.config.ts          # Vite bundler config
│   │   └── package.json
│   │
│   ├── web/                        # Web app (Next.js)
│   │   ├── src/
│   │   │   ├── app/                # App Router pages and layouts
│   │   │   │   ├── (auth)/         # Auth routes (login, register)
│   │   │   │   ├── (dashboard)/    # Dashboard routes with sidebar layout
│   │   │   │   ├── layout.tsx      # Root layout
│   │   │   │   └── page.tsx        # Home page
│   │   │   ├── components/         # Web-specific UI components
│   │   │   │   ├── ui/             # shadcn/ui components
│   │   │   │   └── features/       # Feature-specific components
│   │   │   ├── lib/                # Utilities, API client, Supabase client
│   │   │   ├── hooks/              # React hooks
│   │   │   └── stores/             # State management
│   │   ├── public/                 # Static assets
│   │   ├── next.config.js          # Next.js configuration
│   │   └── package.json
│   │
│   └── backend/                    # Backend API (NestJS)
│       ├── src/
│       │   ├── main.ts             # Application entry point
│       │   ├── app.module.ts       # Root module
│       │   ├── auth/               # Auth module (JWT strategy, guards)
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.guard.ts
│       │   │   ├── supabase.strategy.ts
│       │   │   └── decorators/
│       │   ├── modules/            # Feature modules
│       │   │   ├── products/
│       │   │   │   ├── products.module.ts
│       │   │   │   ├── products.controller.ts
│       │   │   │   ├── products.service.ts
│       │   │   │   └── dto/
│       │   │   ├── orders/
│       │   │   ├── inventory/
│       │   │   ├── dashboard/
│       │   │   └── ...
│       │   ├── shared/             # Shared module
│       │   │   ├── database/       # Prisma/Drizzle service
│       │   │   ├── config/         # Configuration
│       │   │   └── pipes/          # Validation pipes
│       │   └── prisma/             # Prisma schema and migrations
│       │       ├── schema.prisma
│       │       └── migrations/
│       ├── nest-cli.json
│       └── package.json
│
├── packages/                       # Shared packages
│   ├── ui/                         # Shared design system
│   │   ├── src/
│   │   │   ├── tokens/             # Design tokens (colors, spacing, etc.)
│   │   │   │   ├── colors.ts
│   │   │   │   ├── spacing.ts
│   │   │   │   ├── typography.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/              # Shared TypeScript types
│   │   │   │   ├── models.ts       # Data models (Product, Order, etc.)
│   │   │   │   ├── api.ts          # API request/response types
│   │   │   │   └── index.ts
│   │   │   └── utils/              # Shared utilities
│   │   │       ├── formatters.ts   # Date, currency, number formatting
│   │   │       ├── validators.ts   # Input validation helpers
│   │   │       └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── eslint-config/              # Shared ESLint config
│       └── package.json
│
├── turbo.json                      # Turborepo pipeline configuration
├── pnpm-workspace.yaml             # pnpm workspace configuration
├── package.json                    # Root package.json
└── .env.example                    # Environment variables template
```

### Structure Rationale

- **apps/:** Applications and services that can be deployed independently. Each app has its own package.json, build config, and dependencies. Mobile, web, and backend have different deployment targets and lifecycles.

- **packages/:** Shared code consumed by apps. The `ui` package contains design tokens, types, and utilities (NOT full component implementations) to maintain visual consistency without forcing cross-platform abstractions.

- **Feature modules:** Each domain (products, orders, inventory) is encapsulated in its own module with controllers, services, and DTOs. This follows NestJS best practices and enables clear boundaries.

- **Platform-specific UI:** Mobile and web have their own component directories because native mobile patterns (bottom tabs, drawer) differ from web patterns (sidebar). Sharing component implementations between React Native (Capacitor) and React (Next.js) is an anti-pattern that hurts DX and UX.

- **Shared tokens, not components:** The `packages/ui` package shares design tokens (colors, spacing, typography) and TypeScript types, but NOT component implementations. This provides consistency without coupling.

## Architectural Patterns

### Pattern 1: Unified Auth with Backend Validation

**What:** Supabase Auth handles user authentication and JWT issuance for both mobile and web clients. Backend validates JWTs but doesn't store user data—it trusts Supabase's authentication and focuses on business logic.

**When to use:** When you want a managed auth solution (email/password, OAuth, MFA) without building your own auth system, but need a separate backend for business logic and data.

**Trade-offs:**
- **Pros:** Managed authentication with minimal backend code, consistent auth across platforms, secure JWT validation with RS256 asymmetric keys, easy to add OAuth providers.
- **Cons:** Dependency on external service (Supabase), requires careful JWT secret management, need to handle token refresh on clients, potential latency if Supabase is in different region.

**Example:**
```typescript
// Backend: NestJS Supabase JWT Strategy
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.SUPABASE_JWT_SECRET,
      algorithms: ['RS256'], // Asymmetric keys recommended
    });
  }

  async validate(payload: any) {
    // JWT already validated by Passport
    // Return user info to attach to request
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

// Usage: Protect routes with JwtAuthGuard
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  // All endpoints require valid Supabase JWT
}
```

### Pattern 2: Shared Design Tokens, Platform-Specific Components

**What:** Extract design tokens (colors, spacing, typography, breakpoints) into a shared package. Each platform implements its own components using these tokens, rather than trying to share component code.

**When to use:** When building cross-platform apps where visual consistency matters but the underlying component APIs differ (React Native vs React DOM, Capacitor vs Next.js).

**Trade-offs:**
- **Pros:** Visual consistency without DX/UX compromises, platform-specific optimizations (SSR on web, native performance on mobile), easier to maintain and understand, no cross-platform abstraction leakage.
- **Cons:** Some duplication of component logic, need to update multiple implementations when design changes, requires discipline to follow design tokens.

**Example:**
```typescript
// packages/ui/src/tokens/colors.ts
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    500: '#0ea5e9',
    600: '#0284c7',
    900: '#0c4a6e',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    500: '#737373',
    900: '#171717',
  },
  // ... more colors
} as const;

// packages/ui/src/tokens/spacing.ts
export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  // ... more spacing
} as const;

// packages/ui/src/types/models.ts
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  createdAt: Date;
}

// apps/web/src/components/ui/button.tsx (Next.js)
import { colors } from '@repo/ui/tokens';

export function Button({ children, variant = 'primary' }: ButtonProps) {
  return (
    <button
      className="px-4 py-2 rounded-md"
      style={{
        backgroundColor: colors.primary[500],
        color: colors.neutral[50],
      }}
    >
      {children}
    </button>
  );
}

// apps/mobile/src/components/Button.tsx (React Native)
import { colors } from '@repo/ui/tokens';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export function Button({ children, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity style={styles.button}>
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  text: {
    color: colors.neutral[50],
  },
});
```

### Pattern 3: Backend Serves Mock Data (Not Frontend)

**What:** Backend exposes REST endpoints with realistic dummy data instead of having frontend mock data locally. This validates the frontend-backend contract early and ensures auth, headers, and data flow work correctly from day one.

**When to use:** In early project phases (greenfield projects) when you want to validate architecture and data flow before implementing real business logic.

**Trade-offs:**
- **Pros:** Validates auth flow (JWT in headers), tests API contract early, realistic network latency, easy to swap for real data later, consistent data across platforms.
- **Cons:** Slightly more setup than local mocks, backend must be running for frontend dev (can mitigate with docker-compose), need to keep mock data realistic.

**Example:**
```typescript
// apps/backend/src/modules/products/products.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  // Mock data for Phase 1 - validates contract
  private mockProducts = [
    {
      id: '1',
      name: 'Laptop Dell XPS 13',
      sku: 'DELL-XPS-13-2024',
      price: 1299.99,
      stock: 15,
      category: 'Electronics',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Office Chair Ergonomic',
      sku: 'CHAIR-ERG-001',
      price: 299.99,
      stock: 8,
      category: 'Furniture',
      createdAt: new Date('2024-02-01'),
    },
    // ... more realistic mock data
  ];

  findAll() {
    // Later: return this.prisma.product.findMany();
    return this.mockProducts;
  }

  findOne(id: string) {
    // Later: return this.prisma.product.findUnique({ where: { id } });
    return this.mockProducts.find(p => p.id === id);
  }
}

// apps/backend/src/modules/products/products.controller.ts
@Controller('products')
@UseGuards(JwtAuthGuard) // Validates JWT from Supabase
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}

// apps/web/src/lib/api.ts (Frontend)
export async function getProducts() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('http://localhost:3001/products', {
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
    },
  });

  return response.json();
}
```

### Pattern 4: Monorepo Build Pipeline with Turborepo

**What:** Configure Turborepo to define task dependencies so shared packages build before apps, and enable caching to speed up repeated builds. Use pnpm workspaces for dependency management.

**When to use:** Always in monorepos with multiple apps and shared packages. Essential for cross-platform projects where build times can become problematic.

**Trade-offs:**
- **Pros:** Intelligent caching (rebuild only what changed), parallel task execution, clear dependency graph, significantly faster CI/CD pipelines.
- **Cons:** Additional configuration, learning curve for team, cache invalidation edge cases.

**Example:**
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}

// pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

// Root package.json scripts
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  }
}

// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}

// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@repo/ui": "workspace:*"  // pnpm workspace protocol
  }
}
```

## Data Flow

### Request Flow

```
[User Action]
    ↓
[UI Component] → [Event Handler] → [API Client] → [Backend Endpoint]
    ↓                                                      ↓
[Update UI]                                       [Validate JWT]
    ↑                                                      ↓
[State Update] ← [Transform Response] ← [Service] → [Database Query]
                                              ↓
                                        [Mock Data or Prisma]
```

### Authentication Flow

```
[Login Form (Web/Mobile)]
    ↓
[@supabase/supabase-js client]
    ↓
[Supabase Auth API]
    ↓
[JWT Access Token + Refresh Token]
    ↓
[Store in local storage / secure storage]
    ↓
[Include in Authorization header for backend requests]
    ↓
[Backend JWT Guard validates token with SUPABASE_JWT_SECRET]
    ↓
[Extract user info from token payload]
    ↓
[Attach to request.user]
    ↓
[Controllers access via @CurrentUser() decorator]
```

### State Management

```
[Server State (API Data)]
    ↓
[TanStack Query / SWR] → [Cache] → [Automatic Refetch]
    ↓                       ↓
[Components]          [Optimistic Updates]

[Client State (UI/Form)]
    ↓
[Zustand / Context API] → [State Store] → [Subscribers]
    ↓                                          ↓
[Actions/Setters]  ←  [Components]
```

### Key Data Flows

1. **Authentication Flow:** User submits credentials → Supabase Auth validates → JWT issued → Stored in client → Included in all backend requests → Backend validates JWT → User info extracted → Request proceeds.

2. **Data Fetching Flow:** Component mounts → API client fetches with JWT → Backend validates token → Service returns mock/real data → Client caches response → Component renders → Subsequent requests use cache (TanStack Query/SWR).

3. **Form Submission Flow:** User fills form → Client validates → Submit handler calls API with JWT → Backend validates token → Service processes (mock or real) → Response returned → Client updates cache → UI reflects changes → Success/error feedback shown.

4. **Navigation Flow (Mobile):** Bottom tabs for primary sections (Dashboard, Products, Orders, Inventory) → Drawer from header for secondary actions (Profile, Settings, Logout). No context-dependent navigation changes.

5. **Navigation Flow (Web):** Sidebar always visible for all sections → Consistent layout across all pages → No hamburger menu on desktop.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1k users** | Monolith is perfectly fine. Single NestJS backend, single PostgreSQL instance, Supabase Auth. No caching layer needed. Deploy backend + web to single server, mobile apps to stores. |
| **1k-10k users** | Add Redis for session caching and rate limiting. Optimize database queries (indexes, query analysis). Enable Next.js ISR for static content. Consider read replicas for PostgreSQL if read-heavy. CDN for static assets. |
| **10k-100k users** | Horizontal scaling: Deploy multiple backend instances behind load balancer. Database connection pooling (PgBouncer). Add Redis cluster for distributed caching. Separate background jobs (BullMQ). Monitor and optimize N+1 queries. Consider database sharding if write-heavy. |
| **100k+ users** | Consider splitting backend into microservices by domain (products, orders, inventory) if team size justifies complexity. API Gateway or BFF pattern for client-specific optimizations. Dedicated analytics database (separate from transactional DB). Event-driven architecture for async operations. Full observability stack (logging, metrics, tracing). |

### Scaling Priorities

1. **First bottleneck: Database queries** — Most commercial admin systems are CRUD-heavy with complex queries (joins, aggregations for dashboard). Solution: Add indexes, optimize queries, use read replicas, implement query result caching with Redis. Prisma/Drizzle query analysis helps identify slow queries early.

2. **Second bottleneck: API response times** — As data grows, response times increase. Solution: Implement pagination for list endpoints, add Redis caching for frequently accessed data (dashboard metrics, product lists), use database indexes, consider materialized views for complex aggregations.

3. **Third bottleneck: Authentication overhead** — JWT validation on every request adds latency. Solution: Cache validated JWTs in Redis with short TTL (5-10 minutes), implement connection pooling, consider API Gateway with caching layer.

4. **Fourth bottleneck: Frontend bundle size** — Mobile apps especially sensitive to bundle size. Solution: Code splitting in Next.js (already built-in), lazy loading for mobile features, optimize images and assets, tree-shake unused dependencies.

## Anti-Patterns

### Anti-Pattern 1: Sharing Component Code Between React Native and React DOM

**What people do:** Try to create "universal components" that work on both mobile (React Native) and web (React DOM) by abstracting away platform differences.

**Why it's wrong:** React Native and React DOM have fundamentally different APIs (View vs div, Text vs span, StyleSheet vs CSS). Abstraction layers leak constantly, hurt DX (confusing types, IDE support breaks), hurt UX (platform-specific patterns ignored), and create maintenance nightmares.

**Do this instead:** Share design tokens (colors, spacing, typography) and TypeScript types (data models, API contracts), but implement components separately for each platform. Accept some duplication in exchange for clarity, maintainability, and platform-specific optimizations.

### Anti-Pattern 2: Frontend Mock Data Instead of Backend Mock Data

**What people do:** Add mock data directly in frontend code (mock arrays, JSON files) and plan to "swap it out later" when backend is ready.

**Why it's wrong:** Doesn't validate auth flow (no JWT headers), doesn't test API contract (no network requests), doesn't reveal integration issues early, hard to keep in sync across mobile + web, creates false sense of progress (frontend "works" but nothing is integrated).

**Do this instead:** Backend serves mock data through real REST endpoints from day one. Frontend always calls API with JWT headers. This validates architecture, surfaces integration issues early (CORS, auth headers, data shape mismatches), and makes transitioning to real data trivial (change service implementation, not all frontend code).

### Anti-Pattern 3: Using Supabase PostgreSQL for Business Data

**What people do:** Since Supabase provides PostgreSQL for auth.users, developers add business tables (products, orders, inventory) to the same Supabase database.

**Why it's wrong:** Couples business logic to auth provider (vendor lock-in), Supabase PostgreSQL has limitations (can't easily migrate to self-hosted, RLS complexity for complex permissions, potential costs), mixing auth and business data creates unclear boundaries, harder to scale independently.

**Do this instead:** Use Supabase ONLY for authentication (auth.users table). Run a separate PostgreSQL instance for business data accessed via your NestJS backend. Clean separation of concerns, easy to migrate or replace Supabase Auth later, independent scaling, clear ownership boundaries.

### Anti-Pattern 4: BFF (Backend for Frontend) Too Early

**What people do:** Create separate backends for mobile and web (mobile-api, web-api) from the start, thinking it will simplify client code.

**Why it's wrong:** Premature abstraction that adds complexity without proven benefit. In Phase 1, mobile and web need the same data (products, orders, inventory). Creating separate backends means duplicating business logic, auth validation, database queries, and deployment pipelines. The overhead doesn't pay off until clients have genuinely different needs (rare in admin systems).

**Do this instead:** Start with a single NestJS backend serving both mobile and web. If/when client-specific needs emerge (e.g., mobile needs push notifications, web needs real-time websockets, different data shapes), THEN consider BFF pattern or client-specific endpoints in the same backend (e.g., /api/mobile/*, /api/web/*).

### Anti-Pattern 5: Over-Modularizing in Monorepo

**What people do:** Create excessive packages in the monorepo: @repo/utils, @repo/constants, @repo/validators, @repo/formatters, @repo/hooks, @repo/api-client, etc. Each tiny piece of shared code becomes its own package.

**Why it's wrong:** Overhead of maintaining package.json, tsconfig, build config for each package outweighs benefits. Circular dependency issues proliferate. Harder to understand project structure. Slower builds (Turborepo must build many packages). Premature optimization that assumes massive reuse.

**Do this instead:** Start with minimal packages: @repo/ui (design tokens, types, utilities). Only extract new packages when a clear need emerges (e.g., if you add a CLI tool that needs types, extract @repo/types). Prefer duplication over wrong abstraction. It's easier to extract code into packages later than to merge over-modularized packages.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Supabase Auth** | Client SDK (@supabase/supabase-js) for login/signup. Backend validates JWTs with passport-jwt + SUPABASE_JWT_SECRET. | Keep SUPABASE_JWT_SECRET secure. Use RS256 asymmetric keys (recommended). Handle token refresh on clients. |
| **PostgreSQL (Business)** | NestJS connects via Prisma or Drizzle ORM. Use connection pooling (PgBouncer) for production. | Separate from Supabase PostgreSQL. Use DATABASE_URL env var. Run migrations via Prisma/Drizzle CLI. |
| **Capacitor Plugins** | Mobile app uses Capacitor plugins for native features (camera, filesystem, push notifications, etc.). | Check plugin compatibility with React. Use official @capacitor/* plugins when available. Test on real devices. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Mobile ↔ Backend** | REST API with JWT Bearer token. Fetch API or axios. | Handle network errors gracefully (offline mode, retry logic). Use TanStack Query for caching and retries. |
| **Web ↔ Backend** | REST API with JWT Bearer token. Fetch API (built-in). | Leverage Next.js API routes as proxy if needed for security (hide backend URL). SSR can fetch directly server-side. |
| **Backend ↔ PostgreSQL** | Prisma Client or Drizzle ORM with type-safe queries. | Use Prisma migrations or Drizzle migrations. Connection pooling in production. Monitor query performance. |
| **Apps ↔ packages/ui** | Direct imports via pnpm workspace protocol (`@repo/ui`). | Must build packages/ui first (Turborepo handles this). TypeScript types flow through. |
| **Backend Modules** | Direct imports between modules (ProductsModule imports SharedModule). NestJS dependency injection. | Use @Global() decorator for truly shared modules (DatabaseModule, ConfigModule). Otherwise, explicit imports in module metadata. |

## Build Order and Dependencies

### Phase 1: Foundation (Week 1-2)

**What to build:**
1. Monorepo structure (pnpm workspaces + Turborepo config)
2. packages/ui with design tokens and types
3. Supabase Auth project setup (already exists per context)
4. Backend auth module (JWT strategy, guards)

**Why this order:**
- Design tokens and types must exist before apps can import them.
- Auth must work before protected routes can be tested.
- Backend auth validates the Supabase integration pattern.

**Build command:** `turbo run build --filter=@repo/ui` → `turbo run build --filter=backend`

### Phase 2: Backend API (Week 2-3)

**What to build:**
1. NestJS modules for each domain (Products, Orders, Inventory, Dashboard)
2. Mock data services (realistic dummy data)
3. REST endpoints with JWT guards
4. CORS configuration for web and mobile

**Why this order:**
- Frontend needs working API endpoints to test integration.
- Mock data validates contract before real data complexity.

**Dependencies:** Requires Phase 1 auth module.

**Build command:** `turbo run build --filter=backend`

### Phase 3: Web App (Week 3-4)

**What to build:**
1. Next.js app with App Router structure
2. Supabase Auth integration (login, signup, session)
3. Sidebar navigation layout
4. Core section pages (Dashboard, Products, Orders, etc.)
5. shadcn/ui components
6. API client with JWT headers

**Why this order:**
- Web is faster to develop and test than mobile (no build/deploy to device).
- Validates backend API contract and auth flow.
- Establishes design patterns for mobile app.

**Dependencies:** Requires Phase 2 backend API.

**Build command:** `turbo run build --filter=web`

### Phase 4: Mobile App (Week 4-5)

**What to build:**
1. React + Capacitor project structure
2. Supabase Auth integration (reuse patterns from web)
3. Bottom tab navigation + drawer navigation
4. Core section screens (same content as web)
5. Platform-specific UI components
6. API client with JWT headers (reuse pattern from web)

**Why this order:**
- Mobile is last because it depends on web's validated patterns.
- Capacitor build/deploy cycle is slower than web.
- Most complexity is already solved (auth, API integration, data flow).

**Dependencies:** Requires Phase 2 backend API, Phase 3 web app patterns.

**Build command:** `turbo run build --filter=mobile`, then Capacitor CLI for iOS/Android builds.

### Parallel Work Opportunities

- **After Phase 1:** Backend and packages/ui can be developed in parallel.
- **After Phase 2:** Web and mobile can start in parallel if different developers, but web should finish first to establish patterns.
- **Ongoing:** Design tokens and types in packages/ui can be enhanced in parallel with app development.

### Critical Path

**packages/ui → backend (auth) → backend (modules) → web → mobile**

This is the minimum viable path. Web and mobile could be swapped, but web is faster to iterate on, so it's better for validating patterns.

## Sources

### Monorepo & Build Tools
- [Setup monorepo for nestjs(api) & nextjs(fe) - Medium](https://medium.com/@alan.nguyen2050/setup-monorepo-for-nestjs-api-nextjs-fe-05e82945a8b5)
- [From Monolith to Monorepo: Building Faster with Turborepo, pnpm and Capacitor - DEV](https://dev.to/saltorgil/from-monolith-to-monorepo-building-faster-with-turborepo-pnpm-and-capacitor-41ng)
- [Setting Up a React and React Native Monorepo with TurboRepo and pnpm - Medium](https://medium.com/@alex.derville/setting-up-a-react-and-react-native-monorepo-with-turborepo-and-pnpm-8310c1faf18c)
- [How to setup a monorepo project using NextJS, NestJS, Turborepo and pnpm - Medium](https://medium.com/@chengchao60827/how-to-setup-a-monorepo-project-using-nextjs-nestjs-turborepo-and-pnpm-e0d3ade0360d)
- [How we configured pnpm and Turborepo for our monorepo - Nhost](https://nhost.io/blog/how-we-configured-pnpm-and-turborepo-for-our-monorepo)
- [Structuring a repository - Turborepo Docs](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [Managing dependencies - Turborepo Docs](https://turborepo.dev/docs/crafting-your-repository/managing-dependencies)

### Cross-Platform Architecture
- [Exploring Modern Web App Architectures: Trends and Best Practices for 2026 - Tech Stack](https://tech-stack.com/blog/modern-application-development/)
- [The 2026 Blueprint for Unbeatable Mobile App Architecture - Impact Tech Lab](https://impacttechlab.com/future-proof-your-app-the-2026-blueprint-for-unbeatable-mobile-app-architecture/)
- [Frontend Design Patterns That Actually Work in 2026 - Netguru](https://www.netguru.com/blog/frontend-design-patterns)
- [Backends for Frontends Pattern - AWS](https://aws.amazon.com/blogs/mobile/backends-for-frontends-pattern/)
- [Backend for Frontend Pattern - GeeksforGeeks](https://www.geeksforgeeks.org/system-design/backend-for-frontend-pattern/)
- [Sam Newman - Backends For Frontends](https://samnewman.io/patterns/architectural/bff/)

### Design System & Components
- [Next.js + Capacitor starter with TailwindCSS - GitHub](https://github.com/RobSchilderr/nextjs-native-starter)
- [Next.js + Tailwind + Ionic + Capacitor starter - GitHub](https://github.com/mlynch/nextjs-tailwind-ionic-capacitor-starter)
- [React Native Reusables - Bringing shadcn/ui to React Native - GitHub](https://github.com/mrzachnugent/react-native-reusables)
- [gluestack - React & React Native UI components library](https://gluestack.io/)

### Authentication & Backend
- [NestJS Supabase Auth - GitHub](https://github.com/hiro1107/nestjs-supabase-auth)
- [Auth architecture - Supabase Docs](https://supabase.com/docs/guides/auth/architecture)
- [Building Full stack application with NestJs, NextJs and Supabase - Medium](https://shobhitb.medium.com/building-full-stack-application-with-nestjs-nextjs-and-supabase-fce78be07074)
- [JSON Web Token (JWT) - Supabase Docs](https://supabase.com/docs/guides/auth/jwts)
- [NestJS Database & Prisma - Prisma](https://www.prisma.io/nestjs)
- [Build a REST API with NestJS, Prisma, PostgreSQL and Swagger - Prisma Blog](https://www.prisma.io/blog/nestjs-prisma-rest-api-7D056s1BmOL0)
- [Best ORM for NestJS in 2025: Drizzle ORM vs TypeORM vs Prisma - DEV](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c)

### Admin Dashboard Patterns
- [Admin Dashboard: Ultimate Guide, Templates & Examples (2026) - WeWeb](https://www.weweb.io/blog/admin-dashboard-ultimate-guide-templates-examples)
- [Top Admin Dashboard Design Ideas for 2026 - FanRuan](https://www.fanruan.com/en/blog/top-admin-dashboard-design-ideas-inspiration)
- [Inventory Management System Design: Key Principles for Optimal Control - 10Web](https://10web.io/blog/inventory-management-system-design/)

---
*Architecture research for: Cross-Platform Commercial Admin System (Mobile + Web + Backend)*
*Researched: 2026-01-22*
