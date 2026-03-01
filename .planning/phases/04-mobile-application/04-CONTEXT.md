# Phase 4: Mobile Application - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver iOS/Android mobile app with platform-specific navigation (bottom tabs + drawer) consuming the same backend API as web. Users can log in, navigate all operational sections, and view data in a mobile-optimized format. The app builds via Capacitor for iOS/Android and runs in browser for development.

</domain>

<decisions>
## Implementation Decisions

### Navigation structure

- Bottom tabs (4): Dashboard, Articles, Orders, Inventory
- Drawer navigation for secondary items: Sales, Purchases, Profile, Settings, Logout
- Drawer triggered by hamburger menu icon on the left side of the header
- Active tab highlighted with primary brand color (consistent with web sidebar active state)
- Header shows dynamic page title that changes per section (e.g., "Dashboard", "Articles")
- Navigation is always visible — tabs and drawer are NOT context-dependent

### Data display

- Card-based layout for all data lists (Articles, Orders, Sales, Purchases, Inventory)
- Each card shows key info: name/title, price/amount, status badge, secondary metadata
- Tapping a card opens a bottom sheet with full item details (dismissible by swipe down)
- Horizontal scrollable filter chips at the top of each list section
- Infinite scroll pagination — auto-loads more items as user scrolls down

### UI component approach

- Tailwind CSS only — build mobile-specific components from scratch
- No Ionic or third-party mobile UI frameworks
- Share design tokens from @objetiva/ui (colors, spacing, typography via `cn` utility)
- React Router v6 for client-side navigation
- TanStack Query (React Query) for data fetching, caching, and infinite scroll support
- Dark mode supported from day one — follow system preference with toggle in Settings

### Auth & session

- Login screen: centered card with Objetiva brand logo at top, email/password fields
- Full Login + Signup flows on mobile (matching web auth capabilities)
- Supabase client-side auth with auto-persist session in localStorage
- Session checked on app launch — valid session goes to Dashboard, expired refreshes token, no session goes to Login
- Branded splash screen with Objetiva logo + spinner while checking auth state on launch

### Claude's Discretion

- Exact card layout dimensions and spacing
- Bottom sheet component implementation details
- Loading skeleton designs for lists and dashboard
- Error state handling and retry UI
- Splash screen animation/transition
- Pull-to-refresh implementation details
- Capacitor plugin selection and configuration

</decisions>

<specifics>
## Specific Ideas

- Bottom tabs should mirror the roadmap success criteria: Dashboard, Articles, Orders, Inventory as primary sections
- Drawer should handle the overflow sections (Sales, Purchases) plus account actions (Profile, Settings, Logout)
- Filter chips pattern similar to Google Maps / Airbnb — one-tap, horizontally scrollable
- Bottom sheet for details similar to Apple Maps / Google Maps — slide up, swipe down to dismiss
- Login screen should feel cohesive with web but optimized for mobile touch targets

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `@objetiva/ui` package: design tokens (colors, spacing), `cn` utility, `class-variance-authority` — shared across web and mobile
- `@objetiva/types` package: TypeScript types for Product, Order, Sale, Purchase, Inventory, Dashboard — same API contracts
- `@objetiva/utils` package: shared utilities
- Web's `navigation.ts` config: route definitions with labels and icons (lucide-react) — can adapt icon set for mobile tabs

### Established Patterns

- Web uses `fetchWithAuth` pattern with Supabase JWT — mobile needs client-side equivalent (no server-side `createClient`)
- Web uses shadcn/ui components — mobile will build Tailwind-only components but maintain same visual language
- Backend returns paginated responses (`{ data, meta: { total, page, limit, totalPages } }`) — TanStack Query's `useInfiniteQuery` maps directly
- Web has loading skeletons, toast notifications, and dark theme — mobile should follow same patterns

### Integration Points

- Backend API at `localhost:3001/api/*` — same endpoints consumed by both web and mobile
- Supabase Auth — shared project, JWT tokens work across both apps
- Monorepo workspace — mobile app at `apps/mobile`, shares packages via `workspace:*` protocol
- Vite + Tailwind already configured in mobile app skeleton

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 04-mobile-application_
_Context gathered: 2026-03-01_
