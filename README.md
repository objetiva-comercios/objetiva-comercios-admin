# Objetiva Comercios Admin

A reusable admin foundation for commercial applications with authentication, navigation, and operational sections. Built as a monorepo with web and mobile apps sharing authentication and design tokens.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Web**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Mobile**: Vite + React (Capacitor for iOS/Android in Phase 4)
- **Backend**: NestJS, TypeScript
- **Auth**: Supabase Auth (JWT validation)
- **UI**: shadcn/ui components, shared design tokens

## Prerequisites

- Node.js 20+ ([download](https://nodejs.org/))
- pnpm 9+ (`corepack enable pnpm`)
- Git

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd objetiva-comercios-admin

# Install dependencies (all workspaces)
pnpm install

# Build shared packages (required before dev)
pnpm build

# Start all apps in development mode
pnpm dev
```

Apps run on:

- **Web**: http://localhost:3000
- **Mobile**: http://localhost:5173
- **Backend**: http://localhost:3001

## Project Structure

```
objetiva-comercios-admin/
├── apps/
│   ├── web/                 # Next.js admin web app
│   ├── mobile/              # Vite + React mobile app
│   └── backend/             # NestJS API server
├── packages/
│   ├── ui/                  # Shared design tokens & components
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utilities
├── pnpm-workspace.yaml      # Workspace definition
├── turbo.json               # Build pipeline configuration
└── package.json             # Root package with scripts
```

## Environment Setup

### 1. Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use existing)
3. Navigate to **Project Settings > General** to get your **Reference ID** (project ID)
4. Navigate to **Project Settings > API** to get your **anon public** key

### 2. Configure Environment Variables

Copy the example env file for each app:

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your Supabase project ID

# Web (optional for Phase 1)
cp apps/web/.env.example apps/web/.env

# Mobile (optional for Phase 1)
cp apps/mobile/.env.example apps/mobile/.env
```

**Required for backend** (`apps/backend/.env`):

```
SUPABASE_PROJECT_ID=your-project-reference-id
PORT=3001
```

## Development Commands

```bash
# Development (all apps)
pnpm dev

# Development (single app)
pnpm dev --filter=@objetiva/web
pnpm dev --filter=@objetiva/mobile
pnpm dev --filter=@objetiva/backend

# Build all
pnpm build

# Build single package/app
pnpm build --filter=@objetiva/ui
pnpm build --filter=@objetiva/web

# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
pnpm format:check
```

## Testing Authentication (AUTH-05)

The backend validates Supabase JWT tokens on protected endpoints (AUTH-05 requirement).

### Quick Test (No Token Required)

Run the automated test script:

```bash
./scripts/test-auth.sh
```

This tests:

- ✓ Health check endpoint
- ✓ Protected endpoint returns 401 without token
- ✓ Protected endpoint returns 401 with invalid token

### Full Test (With Valid Token)

To test with a real Supabase JWT:

**Method 1: Supabase Dashboard (Easiest)**

1. Go to Supabase Dashboard > SQL Editor
2. Run: `SELECT auth.uid(), auth.email()`
3. Go to Authentication > Users > Create New User
4. Use Supabase client library to sign in and get access_token

**Method 2: Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Get test token (requires user creation first)
supabase projects list
```

**Method 3: Manual Testing**

```bash
# Health check (no auth)
curl http://localhost:3001/health

# Protected endpoint (401 expected)
curl http://localhost:3001/api/auth/verify

# With invalid token (401 expected)
curl -H "Authorization: Bearer invalid" \
  http://localhost:3001/api/auth/verify

# With valid token (200 expected, returns user info)
curl -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  http://localhost:3001/api/auth/verify
```

### Troubleshooting Auth

**"Missing authorization header"**: Add `-H "Authorization: Bearer <token>"`

**"Invalid or expired token"**:

- Check SUPABASE_PROJECT_ID in apps/backend/.env matches your project
- Verify token is from the same Supabase project
- Token may be expired (Supabase JWTs expire after 1 hour by default)

## Shared Packages

### @objetiva/ui

Design tokens and UI utilities:

```typescript
import { colors, spacing, typography, cn } from '@objetiva/ui'

// Use cn() for conditional class names
<div className={cn('base-class', condition && 'conditional-class')} />

// Access design tokens
console.log(colors.primary.DEFAULT) // #3b82f6
```

### @objetiva/types

Shared TypeScript types:

```typescript
import { User, ApiResponse } from '@objetiva/types'

const user: User = {
  id: '123',
  email: 'user@example.com',
  role: 'admin',
}
```

### @objetiva/utils

Common utilities:

```typescript
import { formatCurrency, formatDate } from '@objetiva/utils'

formatCurrency(1234.56) // "$1,234.56"
formatDate(new Date()) // "Jan 23, 2026"
```

## Adding Dependencies

```bash
# Add to root (dev dependencies only)
pnpm add -w -D <package>

# Add to specific workspace
pnpm add <package> --filter=@objetiva/web
pnpm add <package> --filter=@objetiva/backend
```

## Turborepo Caching

Turborepo caches build outputs for faster subsequent builds:

```bash
# First build - full execution
pnpm build

# Second build - uses cache (FULL TURBO)
pnpm build
```

To clear cache:

```bash
rm -rf .turbo node_modules/.cache
```

## Git Hooks

Pre-commit hooks run automatically via Husky + lint-staged:

- ESLint fixes for TypeScript files
- Prettier formatting for all supported files

To skip hooks (not recommended):

```bash
git commit --no-verify -m "message"
```

## Troubleshooting

### "Cannot find module @objetiva/ui"

Run `pnpm build` before `pnpm dev` to compile shared packages.

### TypeScript errors in IDE

1. Restart TypeScript server: Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"
2. Rebuild packages: `pnpm build`

### Port already in use

```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change port in .env
```

### pnpm install fails

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## License

Private - All rights reserved
