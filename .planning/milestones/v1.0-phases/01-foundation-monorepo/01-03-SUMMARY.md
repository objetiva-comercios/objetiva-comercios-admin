---
phase: 01-foundation-monorepo
plan: 03
subsystem: ui
tags: [next.js, vite, react, tailwind, workspace, design-tokens]

# Dependency graph
requires:
  - phase: 01-foundation-monorepo
    plan: 01
    provides: Monorepo foundation with shared packages and design tokens
provides:
  - Next.js web application consuming @objetiva/ui design tokens
  - Vite + React mobile application consuming @objetiva/ui design tokens
  - Tailwind CSS configuration pattern for workspace packages
  - Both apps build and run successfully
affects: [02-backend-foundations, 03-auth-foundations, 04-mobile-native]

# Tech tracking
tech-stack:
  added: [next@14.2.35, vite@5.4.21, @vitejs/plugin-react@4.0.0]
  patterns: [Tailwind config with design token imports, Next.js App Router, Vite ES modules]

key-files:
  created:
    - apps/web/src/app/page.tsx
    - apps/web/tailwind.config.ts
    - apps/web/next.config.mjs
    - apps/mobile/src/App.tsx
    - apps/mobile/tailwind.config.ts
    - apps/mobile/vite.config.ts
    - apps/mobile/postcss.config.cjs
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "Used Next.js 14.2 with App Router for web application"
  - "Used Vite 5 with React for mobile application (Capacitor will be added in Phase 4)"
  - "Spread readonly arrays in Tailwind config to satisfy type constraints"
  - "Renamed next.config.ts → next.config.mjs (Next.js 14.2 compatibility)"
  - "Renamed postcss.config.js → postcss.config.cjs (ES module package compatibility)"

patterns-established:
  - "Pattern: Spread design token readonly arrays when passing to Tailwind config"
  - "Pattern: Use .cjs extension for CommonJS config files in ES module packages"
  - "Pattern: Next.js config as .mjs with JSDoc type comments for versions < 15"

# Metrics
duration: 67min
completed: 2026-01-23
---

# Phase 1 Plan 3: Web and Mobile App Skeletons Summary

**Next.js web app and Vite mobile app both consuming @objetiva/ui design tokens via Tailwind CSS, with working builds and type safety**

## Performance

- **Duration:** 67 min
- **Started:** 2026-01-23T23:20:33Z
- **Completed:** 2026-01-24T00:27:43Z
- **Tasks:** 2
- **Files modified:** 25

## Accomplishments

- Next.js 14 web application with App Router, running on port 3000
- Vite 5 + React mobile application, running on port 5173
- Both apps successfully import and use design tokens from @objetiva/ui
- Tailwind CSS configured with shared design tokens in both apps
- Type-safe imports with full TypeScript support
- Both apps build successfully via Turborepo

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Next.js web app skeleton** - `7f9dfb3` (feat)
2. **Task 2: Create Vite + React mobile app skeleton** - `3016fac` (feat)

## Files Created/Modified

**Web app (apps/web):**

- `package.json` - Next.js 14 with workspace dependencies
- `tsconfig.json` - TypeScript config extending root with Next.js plugin
- `next.config.mjs` - Next.js config with @objetiva/ui transpilation
- `tailwind.config.ts` - Tailwind config importing design tokens
- `src/app/layout.tsx` - Root layout with metadata
- `src/app/page.tsx` - Homepage displaying design token colors
- `src/app/globals.css` - Tailwind directives and CSS variables
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `components.json` - shadcn/ui configuration for future use
- `.env.example` - Environment variables template

**Mobile app (apps/mobile):**

- `package.json` - Vite + React with workspace dependencies, ES module type
- `tsconfig.json` - TypeScript config for React with bundler resolution
- `tsconfig.node.json` - TypeScript config for Vite config
- `vite.config.ts` - Vite config with React plugin and path aliases
- `tailwind.config.ts` - Tailwind config importing design tokens
- `postcss.config.cjs` - PostCSS config (CommonJS for ES module package)
- `index.html` - HTML entry point with viewport-fit for mobile
- `src/main.tsx` - React entry point
- `src/App.tsx` - Root component displaying design token colors
- `src/index.css` - Tailwind directives and safe area insets
- `src/vite-env.d.ts` - Vite environment types
- `.env.example` - Environment variables template

**Root:**

- `pnpm-lock.yaml` - Updated with web and mobile dependencies

## Decisions Made

- **Next.js 14.2 instead of 15.x:** Stayed with 14.x for stability. Version 15 supports .ts config but 14.2 requires .mjs.
- **Vite for mobile app:** Lighter than Next.js, better for Capacitor integration in Phase 4. ES modules enabled for modern build.
- **Spread readonly arrays in Tailwind config:** Design tokens use `as const` for type safety, but Tailwind expects mutable arrays. Spread operator converts them.
- **postcss.config.cjs extension:** Mobile app has "type": "module" in package.json, so CommonJS configs need .cjs extension.
- **Shared Tailwind pattern:** Both apps use identical pattern for consuming design tokens (import → spread fontFamily arrays → extend theme).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed readonly array types in Tailwind config**

- **Found during:** Task 1 (Type checking web app)
- **Issue:** Design tokens export font families as readonly arrays (`as const`), but Tailwind expects mutable `string[]` type
- **Fix:** Spread operator to convert readonly to mutable: `fontFamily: { sans: [...typography.fontFamily.sans], mono: [...typography.fontFamily.mono] }`
- **Files modified:** apps/web/tailwind.config.ts, apps/mobile/tailwind.config.ts
- **Verification:** TypeScript compilation succeeded, no type errors
- **Committed in:** 7f9dfb3 (Task 1), 3016fac (Task 2)

**2. [Rule 1 - Bug] Renamed next.config.ts to next.config.mjs**

- **Found during:** Task 1 (Building web app)
- **Issue:** Next.js 14.2.35 doesn't support .ts config files (only 15.x does), build failed with "not supported" error
- **Fix:** Renamed to .mjs and converted to JavaScript with JSDoc type annotation
- **Files modified:** apps/web/next.config.mjs (created, next.config.ts deleted)
- **Verification:** Next.js build succeeded, generated .next directory
- **Committed in:** 7f9dfb3 (Task 1)

**3. [Rule 1 - Bug] Renamed postcss.config.js to postcss.config.cjs**

- **Found during:** Task 2 (Building mobile app)
- **Issue:** Mobile app package.json has "type": "module", so .js files are treated as ES modules. PostCSS config uses `module.exports` (CommonJS), causing "module is not defined in ES module scope" error
- **Fix:** Renamed to .cjs extension to force CommonJS interpretation
- **Files modified:** apps/mobile/postcss.config.cjs (renamed from .js)
- **Verification:** Vite build succeeded, generated dist directory
- **Committed in:** 3016fac (Task 2)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All fixes necessary for TypeScript compatibility and successful builds. No scope creep - these are configuration corrections.

## Issues Encountered

**pnpm install hanging on Windows:**

- **Issue:** Initial `pnpm install` commands hung indefinitely after downloading packages
- **Resolution:** Killed hanging processes, used `npm install` which delegated to pnpm via workspace detection. Subsequent `pnpm install` with longer timeout (120s) succeeded.
- **Impact:** Delayed execution by ~20 minutes
- **Root cause:** Unknown - possibly Windows-specific pnpm issue or network timeout

## User Setup Required

None - no external service configuration required. This phase only sets up local app skeletons.

## Next Phase Readiness

**Ready for next phase:**

- Web and mobile apps exist and run successfully
- Both apps consume shared packages via workspace protocol
- Tailwind CSS configured with design tokens in both apps
- TypeScript resolves all imports correctly
- Turborepo builds all apps with caching

**Pattern established for future apps:**

- Use spread operator for readonly array design tokens in Tailwind config
- Use .cjs extension for CommonJS configs in ES module packages
- Next.js 14.x requires .mjs config, not .ts

**No blockers or concerns**

---

_Phase: 01-foundation-monorepo_
_Completed: 2026-01-23_
