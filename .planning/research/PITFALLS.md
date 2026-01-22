# Pitfalls Research

**Domain:** Cross-platform Commercial Admin (Monorepo, Mobile + Web + Backend)
**Researched:** 2026-01-22
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: TypeScript Workspace Resolution Hell

**What goes wrong:**
TypeScript fails to resolve internal dependencies correctly across workspace packages, causing type errors in the IDE despite successful builds. JavaScript resolves dependencies fine, but TypeScript expects explicit configuration in each tsconfig.json about where to find dependencies.

**Why it happens:**
Developers assume that pnpm workspace configuration is sufficient for TypeScript to understand package relationships. TypeScript has its own resolution system that doesn't automatically respect workspace configurations.

**How to avoid:**
- Use TypeScript project references in each package's tsconfig.json
- Configure `paths` in root tsconfig.json to map workspace packages
- Set up proper `composite: true` for packages that are dependencies
- Use `@org/package-name` naming convention consistently
- Ensure `baseUrl` and `paths` align with workspace structure

**Warning signs:**
- "Cannot find module '@/components'" errors in IDE but builds succeed
- Type imports working in one package but failing in another
- Autocomplete/IntelliSense not working for workspace packages
- Build works locally but fails in CI due to path resolution

**Phase to address:**
Phase 1 (Foundation) - Must be solved before any code sharing begins

---

### Pitfall 2: Turborepo Caching Misconfiguration

**What goes wrong:**
Cache hits occur when outputs should be rebuilt, or cache misses happen constantly despite no changes. The caching configuration isn't perfect out of the box and requires tuning to match your specific monorepo structure.

**Why it happens:**
Default Turborepo configuration doesn't account for project-specific dependencies like environment files, configuration files outside the package directory, or platform-specific build variations (web vs mobile).

**How to avoid:**
- Explicitly declare all `inputs` in turbo.json (env files, config files, schemas)
- Use different cache keys for web vs mobile builds even if sharing code
- Include `.env.example` in inputs but exclude actual `.env` from cache
- Configure `outputs` to include all generated files (types, build artifacts)
- Use `globalDependencies` for root-level files affecting all packages
- Test cache behavior with `turbo run build --dry-run`

**Warning signs:**
- Mobile app shows stale data after web package updates
- Type changes not reflected in dependent packages
- Environment variable changes not triggering rebuilds
- CI builds succeed but local builds fail (or vice versa)
- `pnpm install` doesn't trigger necessary rebuilds

**Phase to address:**
Phase 1 (Foundation) - Configure during initial monorepo setup

---

### Pitfall 3: Next.js SSR Assumptions with Capacitor

**What goes wrong:**
Next.js features like `getServerSideProps`, `getStaticProps`, API routes, and image optimization stop working when the app is built for mobile with Capacitor. The mobile app requires pure client-side execution but developers build server-dependent features.

**Why it happens:**
Developers are familiar with Next.js SSR patterns and forget that Capacitor apps run entirely client-side. The mobile build uses `output: 'export'` which creates a static site with minimal HTML shell.

**How to avoid:**
- Configure Next.js with `output: 'export'` from day one
- Use `unoptimized: true` for next/image
- Avoid `getServerSideProps` and `getStaticProps` - use client-side data fetching
- If API routes needed, treat them as separate backend concern (NestJS)
- Use environment detection to conditionally use features only on web
- Test mobile builds early and often, not just web

**Warning signs:**
- Features work in `npm run dev` but break in mobile build
- Images fail to load on mobile but work on web
- "Server-side only" errors in mobile app
- Mobile app shows blank screens or loading states forever
- SEO requirements being discussed for mobile app (mobile apps don't need SSR)

**Phase to address:**
Phase 1 (Foundation) - Must be configured before any Next.js features are built

---

### Pitfall 4: iOS Navigation Routing Breaks

**What goes wrong:**
Navigation works perfectly on web and Android but completely breaks on iOS. Next.js router rejects Capacitor's custom scheme (`capacitor://localhost`) because it validates URLs and only accepts `http` or `https`.

**Why it happens:**
Capacitor uses a custom URL scheme for iOS apps, but Next.js router has built-in URL validation that doesn't recognize this scheme. This is a known incompatibility that requires patching Next.js core files.

**How to avoid:**
- Use Capacitor's App plugin to handle navigation on iOS
- Consider implementing custom navigation wrapper that detects platform
- Apply necessary patches to Next.js router (requires patch-package)
- Test iOS specifically - simulator and physical device behavior can differ
- Document the iOS navigation approach for future developers

**Warning signs:**
- `router.push()` works on web but silently fails on iOS
- Links navigate on Android but not iOS
- Console shows URL validation errors only on iOS
- Users can load first screen but can't navigate anywhere

**Phase to address:**
Phase 1 (Navigation) - Critical for basic mobile functionality

---

### Pitfall 5: Supabase Auth Client Scope Leakage

**What goes wrong:**
Multiple users share the same Supabase client instance in NestJS backend, causing authentication context to leak between requests. User A makes request, then User B's request uses User A's auth context.

**Why it happens:**
Default NestJS providers use singleton scope. Developers inject Supabase client as a regular service without understanding that auth context is request-specific and must be isolated per request.

**How to avoid:**
- Use `@Injectable({ scope: Scope.REQUEST })` for Supabase client service
- Create client per request with request-specific auth headers
- Set `persistSession: false` in Supabase client options for backend
- Extract JWT from request headers and pass to Supabase client creation
- Never share Supabase client instances across requests
- Test with concurrent requests from different users

**Warning signs:**
- User sees another user's data intermittently
- Auth works perfectly in development but fails in production under load
- Race conditions in tests involving multiple users
- Session data leaking across API calls
- "You don't have permission" errors that resolve on retry

**Phase to address:**
Phase 1 (Auth Integration) - Must be correct before any user-specific data flows

---

### Pitfall 6: Platform Abstraction Forced Too Early

**What goes wrong:**
Attempt to create unified components that work on both mobile and web, leading to components that work poorly on both platforms instead of well on one. Components become complex conditional messes: "if mobile show X, if web show Y."

**Why it happens:**
Desire to maximize code sharing and DRY principles. Developers assume cross-platform means single implementation. The monorepo structure tempts developers to share everything rather than selectively share what makes sense.

**How to avoid:**
- Accept that UI will have platform-specific implementations
- Share design tokens, utilities, and business logic - not necessarily UI components
- Use `.web.tsx` and `.mobile.tsx` file extensions for platform-specific components
- Create shared "headless" components (logic) with platform-specific views
- Let web feel like web and mobile feel like mobile
- Share shadcn components carefully - many need mobile adaptations

**Warning signs:**
- Components with excessive `Platform.select()` or conditional rendering
- Props like `isMobile`, `isWeb` being passed everywhere
- Touch targets wrong size on mobile because designed for mouse
- Navigation patterns feeling awkward on one platform
- Team debates "should this button be here or there" constantly

**Phase to address:**
Phase 1 (UI Foundation) - Establish pattern before building many components

---

### Pitfall 7: Dark Mode Works on Web, Breaks in Mobile

**What goes wrong:**
Dark mode toggles work perfectly on web but fail in mobile app, or vice versa. Popover components, dialogs, and modals always render in light mode despite dark theme being active.

**Why it happens:**
shadcn/ui uses Tailwind's `class` strategy for dark mode with `next-themes`, but Capacitor's rendering context may not properly propagate the dark class to portaled components (dialogs, popovers). Mobile OS also has its own dark mode that may conflict.

**How to avoid:**
- Test dark mode on mobile early, not just web
- Ensure `darkMode: "class"` in tailwind.config.js
- Apply dark class to root element in both web and mobile contexts
- Check that portaled components inherit theme context
- Consider using CSS variables with media queries as fallback
- Respect mobile OS theme preference via Capacitor Status Bar API
- Verify theme persistence works in mobile app (localStorage vs native storage)

**Warning signs:**
- Dark mode toggle works but specific components stay light
- Theme resets when app backgrounds/foregrounds on mobile
- Dialogs/popovers render in wrong theme
- Flash of wrong theme on app startup (mobile)
- iOS vs Android showing different theme behavior

**Phase to address:**
Phase 1 (Layout & Theme) - Core visual foundation must work everywhere

---

### Pitfall 8: Mock Data Too Perfect, Production Integration Fails

**What goes wrong:**
UI works beautifully with clean mock data but breaks when connected to real backend. Error states never tested, edge cases not handled, loading states inadequate. The "happy path bias" means production reveals crashes that mocks never exposed.

**Why it happens:**
Backend serves mock data in early phases, so developers build UI against perfect, complete data. Mocks don't include API errors, slow responses, partial data, pagination edge cases, or validation errors. Contract drift occurs as backend evolves.

**How to avoid:**
- Include realistic error scenarios in mock data (400, 401, 403, 500 responses)
- Mock slow network conditions (loading states actually show)
- Create incomplete data sets (empty arrays, null fields, missing optional data)
- Use realistic data density - not just 3 perfect items, but 100 items with variety
- Establish API contract testing (JSON schema or OpenAPI spec)
- Sync backend changes with frontend team early
- Test against real backend in a dev environment regularly, not just at end

**Warning signs:**
- No error boundary implementations
- Loading states that never appear in development
- "Cannot read property X of undefined" in production
- Pagination works for page 1 but breaks on page 2
- Forms don't show backend validation errors
- Success flow tested but failure flow ignored

**Phase to address:**
Phase 1 (Mock Data Strategy) - Set pattern before building features
Phase 2+ (Backend Integration) - Systematic testing of real integration

---

### Pitfall 9: Dependency Version Drift Across Packages

**What goes wrong:**
Packages within the monorepo use different versions of the same dependency (React 18.2.0 in one, 18.3.1 in another). This causes subtle bugs, type mismatches, and bloated bundle sizes with duplicate dependencies.

**Why it happens:**
Developers run `pnpm add` in individual packages instead of using workspace protocols. Auto-merge of dependabot PRs without checking workspace consistency. Copy-pasting package.json entries between packages.

**How to avoid:**
- Use workspace protocol `"dependency": "workspace:*"` for internal packages
- Centralize shared dependencies in root package.json where possible
- Use pnpm's `catalog:` protocol for enforcing version consistency
- Set up dependabot to group updates per dependency across workspace
- Run `pnpm dedupe` regularly
- Use `syncpack` tool to detect and fix version inconsistencies
- Lint for version mismatches in CI

**Warning signs:**
- "Module not found" errors that make no sense
- Type errors: "Type X is not assignable to type X"
- Bundle size increases unexpectedly
- Multiple React versions warning in console
- Same fix needed in multiple packages separately

**Phase to address:**
Phase 1 (Monorepo Setup) - Prevent from beginning with proper tooling

---

### Pitfall 10: Over-Engineering Phase 1 with Enterprise Patterns

**What goes wrong:**
Team implements complex architecture (microservices, event sourcing, CQRS, saga patterns) before knowing actual requirements. Phase 1 becomes 3 months instead of 2 weeks. Code is over-abstracted and hard to change quickly.

**Why it happens:**
Developers anticipate future scale and complexity. "We might need this later" thinking. Previous experience with legacy systems makes developers over-correct. The greenfield project feels like opportunity to do everything "right."

**How to avoid:**
- Phase 1 focus: Navigation works, auth works, layout looks right
- Use simple patterns: REST API, straightforward state management, basic components
- Build "just enough" architecture - optimize for changeability not premature scale
- Remember: Greenfield is greenfield for about a week, then you refactor
- Defer complex patterns until Phase 2+ when requirements are clearer
- Document "things we intentionally deferred" to avoid false sense of forgetting

**Warning signs:**
- Discussing microservices before knowing what services you need
- Implementing complex state management before knowing state shape
- Building abstractions for "when we add more platforms later"
- Spending more time on architecture docs than code
- Team velocity very slow despite "just" building basic features
- Multiple layers of indirection for simple operations

**Phase to address:**
Phase 1 (Foundation) - Actively resist over-engineering temptation

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip TypeScript project references | Faster initial setup | Type errors across packages, poor IDE support | Never - fix it in Phase 1 |
| Use `any` types extensively | Faster development initially | No type safety, refactoring nightmares | Only for true unknowns or complex third-party types |
| Hard-code API URLs instead of env vars | Quick prototyping | Can't switch environments, breaks in production | Only in throwaway prototypes |
| Skip responsive mobile testing, only test web | Faster iteration on web UI | Complete mobile UI rebuild later | Never - test both from start |
| Use frontend local mocks instead of backend mocks | Frontend can work independently | Contract drift, integration surprises | Phase 1 only, switch to backend mocks in Phase 2 |
| Same component for web and mobile (no platform-specific) | Less code to maintain | Poor UX on both platforms, constant conditionals | Only for truly platform-agnostic components (utilities, hooks) |
| Skip error boundaries | Faster feature completion | App crashes for users, poor error recovery | Never - add boundaries in Phase 1 layout |
| Duplicate code instead of shared package | Unblocked development | Divergence, bugs fixed in one place but not others | Early prototyping only, extract by Phase 2 |
| Skip Turborepo cache configuration tuning | Builds work out of the box | Stale builds or cache misses, wasted CI time | Never - tune in Phase 1 |
| Commit .env files with real secrets | Easier team onboarding | Security breach, leaked credentials | Never - use .env.example only |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + NestJS | Using singleton-scoped Supabase client | Use `Scope.REQUEST` and create client per request with JWT from headers |
| Capacitor + Next.js | Assuming SSR features work on mobile | Configure `output: 'export'`, use only client-side features |
| next-themes + Capacitor | Theme not persisting in mobile app | Use Capacitor Preferences API instead of localStorage for mobile |
| shadcn + Mobile | Touch targets too small (designed for mouse) | Override button/input sizing for mobile with larger hit areas |
| pnpm workspaces + Turborepo | Running `pnpm install` doesn't trigger rebuilds | Add `pnpm-lock.yaml` to `globalDependencies` in turbo.json |
| Capacitor iOS | Navigation completely broken despite working on Android | Patch Next.js router or use Capacitor App plugin for navigation |
| Supabase Auth | Missing RLS policies - clients can read all data | Create RLS policies immediately after creating tables |
| TypeScript in monorepo | Types not resolving across workspace packages | Set up project references and paths in tsconfig.json |
| Mock data | Only testing happy path, no error scenarios | Include error responses, slow loading, incomplete data in mocks |
| Capacitor + CSS | Fixed positioning behaves differently on mobile | Test on real devices, use safe-area-inset CSS variables |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all data on initial page load | App feels fast with 10 items | Implement pagination or infinite scroll from start | 100+ items (seconds to load) |
| No bundle splitting in Next.js | Fast builds, simple config | Use dynamic imports for heavy components/libraries | Bundle > 500KB (slow initial load) |
| Syncing entire dataset to mobile app | Works with test data | Implement incremental sync, only changed data | 1000+ records (app startup hangs) |
| Re-rendering entire list on single item change | Simple state management | Use React.memo, proper key props, or virtualization | Lists > 50 items (UI lags) |
| Fetching user data on every API call in backend | Stateless, simple logic | Cache user session data with Redis or in-memory store | 100+ concurrent users |
| Not using Turborepo remote caching in CI | Local development feels fast | Set up Vercel/custom remote cache for CI | Team > 3 developers (wasted CI time) |
| Loading all images at full resolution | Looks perfect | Use next/image with proper sizing or compress images | 10+ images per page (slow load) |
| No database indexes on foreign keys | Queries fast with 100 rows | Add indexes on commonly queried/joined columns | 10,000+ rows (queries timeout) |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Skipping Row Level Security (RLS) in Supabase Auth setup | Users can access all data by inspecting API calls | Implement RLS policies before adding any real data |
| Storing sensitive data in localStorage on mobile | Data accessible to other apps on jailbroken devices | Use Capacitor SecureStorage for tokens/secrets |
| Exposing admin endpoints without role checks | Any authenticated user can access admin functions | Implement role-based guards in NestJS from Phase 1 |
| Committing .env files to git | Leaked API keys, database credentials | Use .env.example only, add .env to .gitignore |
| Client-side only validation | Malicious users bypass validation | Always validate on backend, client validation is UX only |
| Using Supabase anon key for admin operations | Public key in bundle allows data manipulation | Use service_role key only in backend, never in frontend |
| No rate limiting on auth endpoints | Brute force attacks, account takeover | Implement rate limiting in NestJS or use Supabase rate limits |
| Logging sensitive data (passwords, tokens) | Credentials leak in log files | Sanitize logs, use structured logging with filtering |
| Trusting user_id from client | User can impersonate others | Extract user_id from verified JWT only, never from request body |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Same navigation pattern on mobile and web | Mobile users struggle with desktop-style menus | Bottom tab navigation for mobile, sidebar for web |
| Empty states showing instead of realistic data | Can't evaluate UI density and usefulness | Show realistic dummy data in Phase 1 to demonstrate actual usage |
| No loading states (assumes instant API responses) | App appears frozen or broken | Show skeletons/spinners for all async operations |
| Forms that don't show backend validation errors | User submits, nothing happens, confusion | Display server errors clearly next to relevant fields |
| No feedback on actions (save, delete, etc.) | User uncertainty - did it work? | Toast notifications or inline confirmations for all actions |
| Tiny touch targets on mobile (designed for mouse) | Users miss buttons, frustration | Minimum 44x44px touch targets per iOS/Android guidelines |
| Inconsistent behavior across platforms | Relearning required, cognitive load | Allow platform-specific patterns where appropriate |
| Modal overuse on mobile | Modals block entire screen, poor mobile UX | Use bottom sheets or inline expansion on mobile |
| No offline state handling in mobile app | App appears broken when network drops | Show offline indicator, queue actions for when online |
| Desktop-width forms on mobile | Horizontal scrolling, poor accessibility | Responsive single-column layout for mobile forms |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Authentication:** UI works but missing token refresh logic - verify auto-refresh before expiry
- [ ] **Dark Mode:** Toggle works but portaled components (Dialog, Popover) stay light - check all modals
- [ ] **Mobile Build:** Next.js dev server works but production build fails - test `output: 'export'` build
- [ ] **Error Handling:** Happy path works but no error boundaries - verify error states for all async operations
- [ ] **Form Validation:** Client validation works but backend returns different errors - test server validation display
- [ ] **Navigation:** Routing works on web but breaks on iOS - test on actual iOS device/simulator
- [ ] **API Integration:** Mock data works but real API has different field names - verify against actual backend contract
- [ ] **Loading States:** Data appears instantly with mocks but no loaders - test with network throttling
- [ ] **Responsive Design:** Looks perfect on laptop but broken on mobile - test on real devices, not just browser DevTools
- [ ] **Monorepo Types:** IDE shows types but build fails in CI - verify TypeScript project references configured
- [ ] **Permissions:** All features accessible to test user but missing role checks - verify permission guards on backend
- [ ] **Safe Areas:** UI looks fine on emulator but notch/home indicator overlap on real device - test on physical iPhone/Android

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| TypeScript resolution broken | MEDIUM | Add project references to all tsconfig.json files, run clean build, restart IDE |
| Turborepo cache poisoned | LOW | Run `turbo run build --force`, clear `.turbo` cache directory |
| Next.js SSR features used | HIGH | Refactor to client-side fetching, remove SSR functions, test mobile build |
| iOS navigation broken | MEDIUM | Apply Next.js router patch or implement Capacitor navigation wrapper |
| Supabase client scope leakage | HIGH | Refactor to REQUEST scope, add tests for concurrent user requests |
| Platform abstraction too deep | HIGH | Extract platform-specific files (.web/.mobile), accept some duplication |
| Dark mode broken on mobile | MEDIUM | Audit component tree for theme context loss, add ThemeProvider wrapper |
| Mock/real API contract drift | MEDIUM-HIGH | Generate TypeScript types from backend schema, add contract tests |
| Dependency version drift | MEDIUM | Run `syncpack fix-mismatches`, update package.json files, reinstall |
| Over-engineered Phase 1 | HIGH | Simplify architecture, remove unused abstractions, focus on working features |
| Missing RLS policies | HIGH | Write RLS policies for all tables, test with different user roles, audit data access |
| Production secrets in git | CRITICAL | Rotate all leaked credentials immediately, audit git history, add pre-commit hooks |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| TypeScript workspace resolution | Phase 1 (Foundation) | All packages show types in IDE, clean build succeeds |
| Turborepo caching issues | Phase 1 (Foundation) | Dry run shows correct cache hits/misses |
| Next.js SSR with Capacitor | Phase 1 (Foundation) | Mobile build completes successfully |
| iOS navigation breaks | Phase 1 (Navigation) | Navigate between screens on iOS device |
| Supabase client scope leakage | Phase 1 (Auth) | Concurrent user tests pass |
| Platform abstraction forced early | Phase 1 (UI Foundation) | Components feel native on each platform |
| Dark mode mobile breaks | Phase 1 (Layout & Theme) | Toggle works on all platforms, all components |
| Mock data too perfect | Phase 1 (Mock Strategy) then ongoing | Error states and edge cases handled |
| Dependency version drift | Phase 1 (Monorepo Setup) | syncpack reports no mismatches |
| Over-engineering Phase 1 | Phase 1 (All) | Features delivered in weeks not months |
| Missing RLS policies | Phase 1 (Auth) then Phase 2+ | All tables have policies, audit passes |
| Empty states instead of density | Phase 1 (Mock Data) | Realistic data volume shown in demos |

---

## Sources

- [How we configured pnpm and Turborepo for our monorepo | Nhost](https://nhost.io/blog/how-we-configured-pnpm-and-turborepo-for-our-monorepo)
- [Structuring a repository | Turborepo](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [Integrating Capacitor with Next.js: A Step-by-Step Guide | Medium](https://hamzaaliuddin.medium.com/integrating-capacitor-with-next-js-a-step-by-step-guide-685c5030710c)
- [Convert Your Next.js App to iOS & Android with Capacitor 8](https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/)
- [bug: Next.js app won't navigate to other pages on iOS · Issue #3664 | Capacitor](https://github.com/ionic-team/capacitor/issues/3664)
- [Setup Supabase with Nest.js](https://blog.andriishupta.dev/setup-supabase-with-nestjs)
- [Next x Nest - Using Supabase & Google OAuth in NestJS](https://abhik.hashnode.dev/next-x-nest-using-supabase-google-oauth-in-nestjs)
- [Best way to authenticate a user in the backend · Supabase Discussion #15633](https://github.com/orgs/supabase/discussions/15633)
- [Cross-Platform UX: Designing Consistency Across Devices | Medium](https://medium.com/@harsh.mudgal_27075/cross-platform-ux-designing-consistency-across-devices-42ad853c7e15)
- [Common Challenges in Cross-Platform App Development and How to Overcome Them in 2026](https://www.techloy.com/common-challenges-in-cross-platform-app-development-and-how-to-overcome-them-in-2026/)
- [Organizing components in a monorepo | Knack Engineering](https://engineering.joinknack.com/file-structure/)
- [Share code between React Web & React Native Mobile with Nx](https://nx.dev/blog/share-code-between-react-web-react-native-mobile-with-nx)
- [Dark Mode in Shadcn: Easy Theme Switching | Medium](https://medium.com/@hiteshchauhan2023/dark-mode-in-shadcn-easy-theme-switching-3f3fde99eeb6)
- [Frontend Handbook | React / Tailwind / Shadcn | Infinum](https://infinum.com/handbook/frontend/react/tailwind/shadcn)
- [Building with Mock Data: Smart Front-End Strategy or Future Headache? | Medium](https://medium.com/lotuss-it/building-with-mock-data-smart-front-end-strategy-or-future-headache-548cafe95c7b)
- [The API Dilemma – Choosing a Mock API vs. a Real Backend](https://www.confluent.io/blog/choosing-between-mock-api-and-real-backend/)
- [Delivering Greenfield Projects: Getting the Foundations Right | Medium](https://medium.com/@audaciatech/delivering-greenfield-projects-getting-the-foundations-right-d09c9e52e8b8)
- [How I deal with greenfield technical debt | Medium](https://medium.com/@ScalaWilliam/how-i-deal-with-greenfield-technical-debt-1a35be33dc71)

---
*Pitfalls research for: Cross-platform Commercial Admin (Monorepo, Mobile + Web + Backend)*
*Researched: 2026-01-22*
