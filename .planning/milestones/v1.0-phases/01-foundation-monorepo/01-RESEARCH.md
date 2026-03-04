# Phase 1: Foundation & Monorepo - Research

**Researched:** 2026-01-23
**Domain:** Monorepo tooling (pnpm + Turborepo), TypeScript workspace configuration, Supabase Auth JWT validation
**Confidence:** HIGH

## Summary

The standard approach for modern monorepos in 2026 combines **pnpm workspaces** (dependency management) with **Turborepo** (build orchestration and caching). This stack provides efficient dependency resolution, incremental builds with intelligent caching (10-15x speedups with remote caching), and straightforward configuration without lock-in.

**Key architectural decisions:**

- Use `apps/` for applications/services, `packages/` for shared libraries (TypeScript, React components, utilities)
- Namespace internal packages with scope prefix (e.g., `@objetiva/ui`) to avoid npm registry conflicts
- Place `.env` files in individual apps, never in workspace root, to prevent environment variable leakage
- Enable TypeScript strict mode with composite builds for type safety and incremental compilation
- Validate Supabase JWTs using asymmetric keys (RS256/ES256) via JWKS endpoint, never shared secrets

**shadcn/ui integration:** Official monorepo support exists via `npx shadcn@latest init` with Next.js (Monorepo) option. The CLI automatically installs components in `packages/ui` and updates import paths, supporting React 19 and Tailwind CSS v4.

**Primary recommendation:** Follow Turborepo's official structure with pnpm workspaces. Use scoped package names, per-app environment files, strict TypeScript configuration, and asymmetric JWT validation for production-ready security.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library       | Version | Purpose                             | Why Standard                                                                                    |
| ------------- | ------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| pnpm          | 9.x+    | Package manager with workspaces     | Fast, disk-efficient, strict dependency resolution prevents phantom dependencies                |
| Turborepo     | 2.x+    | Build system and task orchestration | Zero-config remote caching, 10-15x build speedups, framework-agnostic (easy migration path)     |
| TypeScript    | 5.x+    | Type system                         | Industry standard for large codebases, strict mode catches errors early                         |
| shadcn/ui     | Latest  | Component library base              | Official monorepo support, copy-paste philosophy (no npm dependency lock-in), modern aesthetics |
| Supabase Auth | Latest  | Authentication provider             | Managed auth service, JWT-based, OAuth support, row-level security integration                  |

### Supporting

| Library     | Version | Purpose                 | When to Use                                                                                |
| ----------- | ------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| ESLint      | 8.x/9.x | Linting                 | Standard for code quality, use with `@rushstack/eslint-config` for monorepo shared configs |
| Prettier    | 3.x+    | Code formatting         | Zero-config formatting, use with `eslint-config-prettier` to avoid conflicts               |
| Husky       | 9.x+    | Git hooks               | Pre-commit automation, install only in monorepo root                                       |
| lint-staged | 15.x+   | Pre-commit file linting | Runs linters only on staged files, dramatically faster than full workspace lints           |
| jose        | 5.x+    | JWT verification        | Modern, secure JWT library for Node.js, supports JWKS endpoint verification                |

### Alternatives Considered

| Instead of | Could Use           | Tradeoff                                                                                                                                              |
| ---------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Turborepo  | Nx                  | Nx is more opinionated/powerful but heavier mental model. Use if need code generation, advanced CI orchestration. Turborepo preferred for simplicity. |
| pnpm       | npm/yarn workspaces | pnpm is fastest and most strict. npm workspaces adequate for simpler projects. yarn 1.x discouraged (deprecated).                                     |
| jose       | jsonwebtoken        | `jsonwebtoken` doesn't support JWKS endpoints natively. `jose` is modern, actively maintained, better security.                                       |

**Installation:**

```bash
# Initialize pnpm if not already
corepack enable pnpm

# Install Turborepo globally (optional, can use npx)
pnpm add turbo -w -D

# Install husky and lint-staged in root
pnpm add husky lint-staged -w -D

# Install jose in backend app
cd apps/backend
pnpm add jose
```

## Architecture Patterns

### Recommended Project Structure

```
objetiva-comercios-admin/
├── apps/
│   ├── web/                 # Next.js admin web app
│   ├── mobile/              # React Native mobile app
│   └── backend/             # Node.js/Express API server
├── packages/
│   ├── ui/                  # Shared React components (shadcn/ui base)
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utilities
├── .husky/                  # Git hooks
├── pnpm-workspace.yaml      # Workspace definition
├── turbo.json               # Build pipeline configuration
├── package.json             # Root package.json (private: true)
├── .env.example             # Root env template (documentation only)
└── README.md                # Developer onboarding guide
```

**Key principles:**

- **Flat package structure:** Avoid nested packages (`apps/**`). Turborepo does not support nested packages.
- **No root tsconfig.json:** Each package manages its own TypeScript config. Use `@tsconfig/node-lts-strictest` as base.
- **Environment files in apps:** Each app has its own `.env` file. Root `.env.example` is documentation only.
- **Scoped package names:** Use `@objetiva/*` namespace to prevent npm registry conflicts.

### Pattern 1: Workspace Dependencies with pnpm Protocol

**What:** Reference local packages using `workspace:*` protocol in package.json dependencies
**When to use:** Always for internal package dependencies
**Example:**

```json
{
  "name": "@objetiva/web",
  "dependencies": {
    "@objetiva/ui": "workspace:*",
    "@objetiva/types": "workspace:*",
    "@objetiva/utils": "workspace:*"
  }
}
```

**Source:** [pnpm workspaces documentation](https://pnpm.io/workspaces)

**Why this works:** `workspace:*` forces pnpm to resolve to local workspace packages, never npm registry. Before publishing, pnpm converts to actual versions (e.g., `workspace:*` → `1.0.0`).

### Pattern 2: Turborepo Task Pipeline with Caching

**What:** Define task dependencies and outputs for intelligent caching
**When to use:** For all build, lint, type-check tasks
**Example:**

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": ["NODE_ENV"]
    },
    "lint": {
      "dependsOn": [],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalEnv": ["NODE_ENV"],
  "globalDependencies": [".env"]
}
```

**Source:** [Turborepo configuration reference](https://turborepo.dev/docs/reference/configuration)

**Key insights:**

- `dependsOn: ["^build"]` means "wait for `build` task in all dependencies first"
- `outputs` defines what to cache. If omitted or empty, only logs are cached
- `cache: false` for dev servers (long-running, no cacheable output)
- `persistent: true` tells Turborepo task runs indefinitely

### Pattern 3: TypeScript Workspace Configuration

**What:** Each package has own tsconfig.json extending shared base
**When to use:** Always in TypeScript monorepos
**Example:**

```json
// packages/ui/tsconfig.json
{
  "extends": "@tsconfig/node-lts-strictest/tsconfig.json",
  "compilerOptions": {
    "composite": true, // Required for project references
    "declaration": true, // Emit .d.ts files
    "declarationMap": true, // Emit .d.ts.map for debugging
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Source:** [Managing TypeScript Packages in Monorepos - Nx Blog](https://nx.dev/blog/managing-ts-packages-in-monorepos)

**Why composite mode:** Enables incremental builds. TypeScript emits `.tsbuildinfo` files for faster subsequent compiles (only changed files recompile).

### Pattern 4: Supabase JWT Validation with JWKS

**What:** Verify Supabase JWTs using public keys from JWKS endpoint
**When to use:** All authenticated backend API routes
**Example:**

```typescript
// Source: https://supabase.com/docs/guides/auth/jwts
import { jwtVerify, createRemoteJWKSet } from 'jose'

const SUPABASE_JWKS = createRemoteJWKSet(
  new URL(`https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/auth/v1/.well-known/jwks.json`)
)

export async function verifySupabaseJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, SUPABASE_JWKS, {
      issuer: `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/auth/v1`,
      audience: 'authenticated',
    })

    return {
      userId: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch (error) {
    throw new Error('Invalid or expired JWT')
  }
}

// Express middleware example
app.use('/api/*', async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  try {
    const token = authHeader.substring(7)
    req.user = await verifySupabaseJWT(token)
    next()
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' })
  }
})
```

**Critical security notes:**

- **Never use shared secrets (HS256) in production.** Compromised secret = attacker can forge JWTs for any user
- **JWKS endpoint is cached for 10 minutes.** Don't cache longer or you break token revocation
- Always validate `iss` (issuer), `aud` (audience), and `exp` (expiration)

### Pattern 5: shadcn/ui in Shared Package

**What:** Initialize shadcn/ui with monorepo support, components auto-install in packages/ui
**When to use:** Shared design system across multiple apps
**Example:**

```bash
# From apps/web directory
npx shadcn@latest init
# Select "Next.js (Monorepo)" option

# Adding a component
npx shadcn@latest add button
# CLI installs to packages/ui automatically
```

**Import pattern:**

```typescript
// In apps/web/components/LoginForm.tsx
import { Button } from '@objetiva/ui/components/button'
import { Input } from '@objetiva/ui/components/input'
import { cn } from '@objetiva/ui/lib/utils'
```

**Source:** [shadcn/ui monorepo documentation](https://ui.shadcn.com/docs/monorepo)

**Configuration requirement:** Both app and packages/ui must have identical `style`, `iconLibrary`, and `baseColor` in `components.json`. For Tailwind v4, leave tailwind config empty.

### Pattern 6: Environment Variable Management

**What:** Per-app `.env` files with root `.env.example` as documentation
**When to use:** Always in monorepos
**Structure:**

```
# Root .env.example (documentation only, not loaded)
# Copy to apps/*/. env and fill in values

# Supabase
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Backend
PORT=3001
NODE_ENV=development
```

**App-specific `.env`:**

```bash
# apps/backend/.env (gitignored)
SUPABASE_PROJECT_ID=abc123
PORT=3001
```

**turbo.json configuration:**

```json
{
  "tasks": {
    "build": {
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "env": ["NODE_ENV", "SUPABASE_*"]
    }
  }
}
```

**Source:** [Turborepo environment variables guide](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)

**Why this works:**

- Prevents environment variable leakage between apps
- Framework inference auto-detects `NEXT_PUBLIC_*`, `VITE_*`, etc.
- Turborepo tracks env changes for cache invalidation

### Anti-Patterns to Avoid

- **Cross-package file imports (`../`):** Install the package as a dependency instead. Direct file access breaks workspace boundaries and TypeScript resolution.
- **Shared secrets for JWT validation:** Use asymmetric keys (RS256/ES256) + JWKS endpoint. Shared secrets (HS256) create security vulnerabilities.
- **Root `.env` file loaded by all apps:** Use per-app `.env` files. Root `.env.example` is documentation only.
- **Hashing too many files in Turborepo:** Only hash critical files (`src/**`, `package.json`). Hashing volatile files (logs, build artifacts) destroys cache hit rates.
- **Not defining `outputs` in turbo.json:** Turborepo cannot cache anything if outputs aren't specified. Tasks will run every time.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                         | Don't Build                                        | Use Instead                                       | Why                                                                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT validation                  | Custom JWT parsing + manual signature verification | `jose` library with JWKS endpoint                 | JWT verification is cryptographically complex. Manual implementation risks timing attacks, signature validation bugs, missing expiration checks. `jose` handles JWKS rotation, async verification, edge cases. |
| Monorepo task orchestration     | Custom bash scripts with `cd` + `npm run`          | Turborepo with `turbo.json` pipeline              | Task dependency graphs are hard (parallel execution, failure handling, incremental builds). Turborepo provides battle-tested caching, remote cache sharing, framework inference.                               |
| Environment variable validation | Runtime checks in app code                         | `zod` + validated config module                   | Catching missing env vars at runtime in production is too late. Validated config at startup prevents deployment of misconfigured apps.                                                                         |
| Design tokens                   | CSS variables manually managed                     | JSON/YAML tokens + build-time transformation      | Design tokens need synchronization across platforms (web, mobile). Manual management leads to drift. Tooling (Style Dictionary) transforms tokens to CSS, JS, native formats.                                  |
| Shared ESLint config            | Copy-paste `.eslintrc.js` to every package         | Shared config package (`@objetiva/eslint-config`) | Maintenance nightmare when config changes. Shared package enables single update, all packages inherit. Use `@rushstack/eslint-patch` for plugin dependencies.                                                  |

**Key insight:** Monorepo tooling matured significantly in 2024-2026. Turborepo + pnpm + JWKS-based auth are production-proven patterns used by Vercel, Supabase, and major SaaS companies. Hand-rolling these creates technical debt.

## Common Pitfalls

### Pitfall 1: TypeScript Can't Resolve Workspace Packages

**What goes wrong:** Import from `@objetiva/ui` shows "Cannot find module" error despite package existing
**Why it happens:** Package isn't built yet, or `package.json` missing `main`/`types` fields pointing to compiled output
**How to avoid:**

- Each shared package needs `"main": "./dist/index.js"` and `"types": "./dist/index.d.ts"` in package.json
- Run `turbo build` before `turbo dev` to ensure packages are compiled
- Use `dependsOn: ["^build"]` in turbo.json so dev tasks wait for dependencies to build
  **Warning signs:** Red squiggles in VS Code, "Module not found" at runtime, imports work in some packages but not others

### Pitfall 2: Turborepo Cache Misses on Unchanged Code

**What goes wrong:** Tasks run fully even when nothing changed, cache hit rate near 0%
**Why it happens:** Too many files in inputs, missing `outputs` definition, or environment variables changing on every run
**How to avoid:**

- Only hash source files: `"inputs": ["src/**", "package.json"]`, exclude `dist/`, `node_modules/`, logs
- Always define `outputs`: `"outputs": ["dist/**"]` for build tasks
- Use `turbo --summarize` to see what's invalidating cache
- Check for volatile env vars (timestamps, random IDs) changing task hashes
  **Warning signs:** "cache miss" in turbo output, build times don't improve, `--summarize` shows different hashes each run

### Pitfall 3: Supabase JWT Validation Fails in Production

**What goes wrong:** Backend rejects valid JWTs, users can't authenticate, 401 errors
**Why it happens:** Using shared secret (HS256) with wrong key, not validating `iss`/`aud`, clock skew between servers
**How to avoid:**

- Use JWKS endpoint with `jose` library (asymmetric keys RS256/ES256)
- Always validate issuer: `issuer: 'https://PROJECT_ID.supabase.co/auth/v1'`
- Always validate audience: `audience: 'authenticated'`
- Allow small clock skew (jose does this by default, 30 seconds)
- Log JWT validation errors with details (expired, invalid signature, wrong issuer)
  **Warning signs:** Inconsistent auth failures, works locally but fails in production, JWTs rejected immediately after issuance

### Pitfall 4: pnpm Workspace Dependency Version Mismatch

**What goes wrong:** Local package reference fails, "no matching version found", or wrong version resolved
**Why it happens:** Package version in package.json doesn't match `workspace:` range, or forgot to use `workspace:` protocol
**How to avoid:**

- Always use `workspace:*` for internal dependencies (matches any version)
- Run `pnpm install` after changing dependencies to update lockfile
- Check `pnpm-lock.yaml` has `link:` entries for workspace packages
- Use `pnpm why <package>` to debug resolution
  **Warning signs:** pnpm trying to install from npm registry, multiple versions of same package, "Cannot find module" at runtime

### Pitfall 5: Git Hooks Don't Run in Monorepo

**What goes wrong:** Husky pre-commit hook doesn't run, or runs but fails to lint/format files
**Why it happens:** Husky installed in wrong location (per-package instead of root), or lint-staged not configured for monorepo
**How to avoid:**

- Install husky and lint-staged ONLY in root: `pnpm add husky lint-staged -w -D`
- Initialize husky in root: `npx husky init` (creates `.husky/` directory)
- Configure lint-staged in root `package.json` with glob patterns:
  ```json
  {
    "lint-staged": {
      "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
      "*.{json,md}": ["prettier --write"]
    }
  }
  ```
- Pre-commit hook should run: `npx lint-staged` (not per-package scripts)
  **Warning signs:** No output when committing, files committed without formatting, husky directory in packages

### Pitfall 6: Environment Variables Leak Between Apps

**What goes wrong:** Backend sees `NEXT_PUBLIC_*` vars from web app, web app loads backend secrets, security breach
**Why it happens:** Shared root `.env` file loaded by all apps, or misconfigured dotenv
**How to avoid:**

- NEVER create root `.env` file (only `.env.example` for documentation)
- Each app has its own `.env` file in app directory: `apps/web/.env`, `apps/backend/.env`
- Add all `.env` files to `.gitignore` (except `.env.example`)
- Turborepo automatically isolates env vars per package
- Use framework-specific prefixes: `NEXT_PUBLIC_` for client-side, plain names for server-side
  **Warning signs:** Backend API key visible in browser dev tools, web app crashing from missing backend-only vars

### Pitfall 7: shadcn/ui Components Don't Share Styles

**What goes wrong:** Button component looks different in web vs mobile, Tailwind classes not working
**Why it happens:** Mismatched `components.json` config between app and packages/ui, or Tailwind not configured in packages/ui
**How to avoid:**

- Run `npx shadcn@latest init` from app directory, select "Monorepo" option
- Ensure identical config in both `apps/web/components.json` and `packages/ui/components.json`:
  - Same `style` (default, new-york)
  - Same `iconLibrary` (lucide)
  - Same `baseColor` (slate, gray, zinc, etc.)
- For Tailwind v4: Leave `tailwind` config empty in components.json
- packages/ui needs its own `tailwind.config.js` with same theme
  **Warning signs:** Components render but unstyled, TypeScript errors on `cn()` utility, icon imports fail

## Code Examples

Verified patterns from official sources:

### Minimal pnpm-workspace.yaml

```yaml
# Source: https://pnpm.io/workspaces
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json

```json
{
  "name": "objetiva-comercios-admin",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "prepare": "husky"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1",
    "eslint": "^8.57.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.2.0",
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### turbo.json with Environment Variable Tracking

```json
// Source: https://turborepo.dev/docs/reference/configuration
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV"],
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "env": ["NODE_ENV", "SUPABASE_*"]
    },
    "lint": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

### Backend JWT Validation Middleware

```typescript
// Source: https://supabase.com/docs/guides/auth/jwts
// apps/backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { jwtVerify, createRemoteJWKSet } from 'jose'

const SUPABASE_JWKS = createRemoteJWKSet(
  new URL(`https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/auth/v1/.well-known/jwks.json`)
)

interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
    role: string
  }
}

export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.substring(7)

  try {
    const { payload } = await jwtVerify(token, SUPABASE_JWKS, {
      issuer: `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/auth/v1`,
      audience: 'authenticated',
    })

    req.user = {
      userId: payload.sub!,
      email: payload.email as string,
      role: payload.role as string,
    }

    next()
  } catch (error) {
    console.error('JWT verification failed:', error)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Test endpoint
app.get('/api/auth/verify', authenticateJWT, (req: AuthRequest, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user,
  })
})
```

### Shared Package with TypeScript

```json
// packages/ui/package.json
{
  "name": "@objetiva/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./components/*": "./dist/components/*.js",
    "./lib/*": "./dist/lib/*.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.3.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

```json
// packages/ui/tsconfig.json
{
  "extends": "@tsconfig/node-lts-strictest/tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Design Tokens Structure

```typescript
// packages/ui/src/tokens/colors.ts
export const colors = {
  // Primitive tokens
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Semantic tokens (context-aware)
  primary: {
    DEFAULT: '#3b82f6',
    foreground: '#ffffff',
  },
  secondary: {
    DEFAULT: '#64748b',
    foreground: '#ffffff',
  },
  destructive: {
    DEFAULT: '#ef4444',
    foreground: '#ffffff',
  },
  muted: {
    DEFAULT: '#f1f5f9',
    foreground: '#64748b',
  },
  accent: {
    DEFAULT: '#f1f5f9',
    foreground: '#0f172a',
  },
  background: '#ffffff',
  foreground: '#0f172a',
  border: '#e2e8f0',
} as const

export type Color = typeof colors
```

```typescript
// packages/ui/src/tokens/spacing.ts
export const spacing = {
  0: '0px',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
} as const

export type Spacing = typeof spacing
```

```typescript
// packages/ui/src/tokens/typography.ts
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const

export type Typography = typeof typography
```

```typescript
// packages/ui/src/tokens/index.ts
export * from './colors'
export * from './spacing'
export * from './typography'

// Export as single object for programmatic access
import { colors } from './colors'
import { spacing } from './spacing'
import { typography } from './typography'

export const tokens = {
  colors,
  spacing,
  typography,
} as const
```

## State of the Art

| Old Approach                                | Current Approach                                 | When Changed | Impact                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Lerna + Yarn 1.x                            | pnpm workspaces + Turborepo                      | 2022-2023    | Faster installs (pnpm), better caching (Turborepo), no separate orchestration tool needed                               |
| JWT verification with shared secret (HS256) | JWKS endpoint with asymmetric keys (RS256/ES256) | 2023-2024    | Better security (no shared secret distribution), easier key rotation, follows OAuth best practices                      |
| TypeScript Project References in monorepo   | Composite builds without project references      | 2024-2025    | Simpler config, Turborepo handles dependency order, project references only needed for very large repos (100+ packages) |
| Manual Tailwind config in each package      | Tailwind CSS v4 with @theme directive            | 2024-2025    | CSS-first configuration, no JS config files, easier to share theme across packages                                      |
| Copy-paste shadcn/ui components per app     | shadcn/ui monorepo mode                          | 2024         | Official monorepo support, CLI auto-installs to packages/ui, centralized component library                              |

**Deprecated/outdated:**

- **Lerna:** No longer actively developed. Nx and Turborepo are successors. Migration guides exist.
- **Yarn 1.x workspaces:** Yarn 1.x in maintenance mode. Use pnpm or Yarn 4+ (berry).
- **jsonwebtoken library for Supabase Auth:** Doesn't support JWKS endpoints. Use `jose` instead.
- **Shared tsconfig.json in root with project references:** Turborepo recommends per-package tsconfig without cross-package references for simpler setup.
- **Global .env file for all apps:** Security anti-pattern. Use per-app .env files.

## Open Questions

Things that couldn't be fully resolved:

1. **Mobile (React Native) integration with shadcn/ui**
   - What we know: shadcn/ui is web-focused (React + Tailwind). Official mobile support unclear.
   - What's unclear: How to share design tokens with React Native app. Options: (a) separate RN component library with same tokens, (b) use react-native-web for unified components, (c) separate UI implementations per platform
   - Recommendation: Start with separate `packages/ui-mobile` using React Native components but importing design tokens from `packages/ui/tokens`. Evaluate react-native-web if code reuse becomes priority. Flag for validation during planning.

2. **Optimal ESLint/Prettier rule set for this stack**
   - What we know: Should use shared config package for consistency. `@rushstack/eslint-config` recommended for monorepos.
   - What's unclear: Specific rule preferences for this team (semicolons, trailing commas, line length, etc.)
   - Recommendation: Start with opinionated preset (`@vercel/style-guide` or `eslint-config-next` for Next.js apps), customize minimally. Add `eslint-config-prettier` to avoid conflicts. Document decisions in README.

3. **Changesets vs manual versioning**
   - What we know: Changesets automate versioning and changelogs in monorepos. Popular in open-source.
   - What's unclear: Is automatic versioning needed for internal project? Adds complexity for Phase 1.
   - Recommendation: Skip changesets initially. Use manual versioning (packages stay at 1.0.0). Add changesets later if publishing packages or need automated changelogs. Not critical for foundation phase.

4. **Turborepo remote cache hosting**
   - What we know: Vercel offers free remote cache. Self-hosted options exist (turborepo-remote-cache). Remote cache gives 10-15x speedup in CI.
   - What's unclear: Team's preference for Vercel account vs self-hosted. Security/privacy concerns?
   - Recommendation: Start with local cache only (no remote). Add Vercel remote cache in Phase 2-3 when CI/CD setup happens. Local cache sufficient for foundation development.

## Sources

### Primary (HIGH confidence)

- [Turborepo - Structuring a Repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) - Official structure guidelines
- [Turborepo - Configuration Reference](https://turborepo.dev/docs/reference/configuration) - turbo.json schema
- [Turborepo - Using Environment Variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables) - Environment variable management
- [pnpm Workspaces Documentation](https://pnpm.io/workspaces) - Workspace protocol, configuration
- [shadcn/ui Monorepo Documentation](https://ui.shadcn.com/docs/monorepo) - Official monorepo setup
- [Supabase Auth JWT Guide](https://supabase.com/docs/guides/auth/jwts) - JWT validation methods
- [Supabase JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) - JWT structure

### Secondary (MEDIUM confidence)

- [Nhost - How We Configured pnpm and Turborepo](https://nhost.io/blog/how-we-configured-pnpm-and-turborepo-for-our-monorepo) - Real-world production setup
- [Nx Blog - Managing TypeScript Packages in Monorepos](https://nx.dev/blog/managing-ts-packages-in-monorepos) - TypeScript configuration patterns
- [Vinayak Hegde - Building a Monorepo with pnpm and Turborepo](https://vinayak-hegde.medium.com/building-a-monorepo-with-pnpm-and-turborepo-a-journey-to-efficiency-cfeec5d182f5) - Practical implementation guide
- [Horacio Herrera - Setup lint-staged on a Monorepo](https://www.horacioh.com/writing/setup-lint-staged-on-a-monorepo/) - Git hooks in monorepo
- [UXPin - Design Tokens in React](https://www.uxpin.com/studio/blog/what-are-design-tokens-in-react/) - Design token architecture

### Tertiary (LOW confidence)

- WebSearch results for "pnpm turborepo monorepo common mistakes pitfalls 2026" - Community experiences
- WebSearch results for "TypeScript strict mode monorepo tsconfig best practices 2026" - Configuration recommendations
- WebSearch results for "design tokens TypeScript React shared package best practices 2026" - Token organization patterns

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Official documentation confirms pnpm + Turborepo as established pattern, multiple production examples
- Architecture: HIGH - Official Turborepo and pnpm docs provide explicit structure recommendations, shadcn/ui monorepo mode documented
- Pitfalls: MEDIUM-HIGH - Common issues documented across official sources and verified community reports, but some based on experiential accounts
- Supabase JWT validation: HIGH - Official Supabase documentation with code examples, jose library is recommended approach
- Design tokens: MEDIUM - General best practices well-documented but specific TypeScript patterns vary by implementation

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days) - Stable ecosystem, but monitor for Turborepo 2.x updates and Tailwind CSS v4 stable release
