# Phase 1: Foundation & Monorepo - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish working monorepo with shared packages, TypeScript configuration, and authentication foundation that all apps can build upon. This phase sets up the technical foundation — monorepo tooling (pnpm + Turborepo), shared packages for UI/types/utilities, TypeScript configuration, and Supabase Auth integration with backend JWT validation.

</domain>

<decisions>
## Implementation Decisions

### Workspace Structure & Package Organization

- **Top-level organization:** Claude's discretion (standard apps/ and packages/ structure)
- **Initial packages:** Start with packages/ui only. Add packages/types and packages/utils when needed (not premature).
  - **Correction:** Actually create packages/ui, packages/types, and packages/utils from the start
  - packages/ui: Design tokens, shadcn/ui components
  - packages/types: Shared TypeScript types (API contracts, domain models)
  - packages/utils: Common helpers (formatters, validators)
- **Package naming:** Claude's discretion (scoped @objetiva/\* or simple names)
- **App naming:** Claude's discretion (descriptive vs generic)

### Shared UI Package Scope

- **packages/ui contents:**
  - Design tokens (colors, spacing, typography)
  - Shared React components (buttons, inputs, cards) using shadcn/ui as base
  - **NOT** types or utilities (those go in separate packages)
- **Component library:** Use shadcn/ui as base — copy components into packages/ui
- **Platform differences:** Claude's discretion on how to handle web vs mobile component variations (single component with detection, separate exports, or composition)

### TypeScript & Tooling Configuration

- **TypeScript strict mode:** Full strict mode enabled (strict: true)
- **tsconfig structure:** Base tsconfig in root, apps/packages extend it
- **Linting/formatting:** ESLint with TypeScript support + Prettier
- **Git hooks:** Yes, use husky + lint-staged for pre-commit checks

### Authentication Foundation Setup

- **Auth package structure:** Claude's discretion (packages/auth, in-app, or packages/utils)
- **JWT test endpoint:** Comprehensive validation
  - Validate JWT signature and expiration
  - Return decoded user info (sub, email)
  - Protected route requiring valid JWT (401 on invalid/missing token)
  - Proves end-to-end auth flow works
- **Environment variables:** .env.example in root documenting all vars, app-specific .env files for local dev
- **README scope:** Comprehensive onboarding
  - Prerequisites and installation (Node/pnpm versions, install command)
  - Supabase project setup (how to create project, get credentials)
  - Running apps in dev mode (commands, ports)

### Claude's Discretion

- Exact monorepo directory structure (apps/ vs apps/backend separation)
- Package naming convention (scoped vs simple)
- App naming convention (descriptive vs generic)
- How to handle web vs mobile component variations in packages/ui
- Where auth helpers live (packages/auth vs in-app vs packages/utils)
- Build tool choices per package
- Exact ESLint/Prettier rule configuration

</decisions>

<specifics>
## Specific Ideas

- Use shadcn/ui as component base (aligns with "shadcn aesthetic" from roadmap)
- Supabase Auth for authentication only (separate PostgreSQL for data comes in Phase 5)
- Backend must validate Supabase JWT tokens successfully

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 01-foundation-monorepo_
_Context gathered: 2026-01-23_
