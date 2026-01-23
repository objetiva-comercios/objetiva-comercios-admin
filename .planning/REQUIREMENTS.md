# Requirements: Objetiva Comercios Admin

**Defined:** 2026-01-22
**Core Value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one

## v1 Requirements

Requirements for initial release (Phase 1 foundation). Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password via Supabase Auth
- [ ] **AUTH-02**: User can log in with email and password
- [ ] **AUTH-03**: User session persists across browser/app refresh
- [ ] **AUTH-04**: User can log out from any page
- [ ] **AUTH-05**: Backend validates JWT tokens from Supabase on every request
- [ ] **AUTH-06**: User roles and permissions system (RBAC) implemented

### Navigation & Layout

- [ ] **NAV-01**: Mobile app displays bottom tabs for primary sections (Dashboard, Articles, Orders, Inventory)
- [ ] **NAV-02**: Mobile app displays drawer navigation from header for secondary actions (Profile, Settings, Logout)
- [ ] **NAV-03**: Web app displays sidebar navigation for all sections
- [ ] **NAV-04**: Navigation is consistent and NOT context-dependent across platforms
- [ ] **NAV-05**: Layout includes header with app name and user menu
- [ ] **NAV-06**: Layout includes content area that adapts to navigation
- [ ] **NAV-07**: All sections are navigable (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings)

### UI & Responsiveness

- [ ] **UI-01**: UI follows shadcn aesthetic (modern, dense, admin-oriented)
- [ ] **UI-02**: Dark theme implemented and works across platforms
- [ ] **UI-03**: Layout is responsive and adapts to screen sizes
- [ ] **UI-04**: Mobile and web feel cohesive despite platform-specific implementations
- [ ] **UI-05**: Components live in packages/ui with shared design tokens

### Dashboard

- [ ] **DASH-01**: Dashboard displays key metrics (sales, inventory, orders)
- [ ] **DASH-02**: Dashboard shows realistic operational data from backend
- [ ] **DASH-03**: Dashboard demonstrates layout density (not empty states)

### Backend & API

- [ ] **API-01**: Backend exposes /api/dashboard endpoint with mock data
- [ ] **API-02**: Backend exposes /api/products endpoint with mock data
- [ ] **API-03**: Backend exposes /api/orders endpoint with mock data
- [ ] **API-04**: Backend exposes /api/inventory endpoint with mock data
- [ ] **API-05**: Backend exposes /api/sales endpoint with mock data
- [ ] **API-06**: Backend exposes /api/purchases endpoint with mock data
- [ ] **API-07**: Backend serves realistic dummy data (500+ products minimum)
- [ ] **API-08**: Backend has health check endpoint
- [ ] **API-09**: All API endpoints require valid JWT token

### Monorepo & Tooling

- [ ] **MONO-01**: Monorepo structure with pnpm workspaces functional
- [ ] **MONO-02**: Turborepo configured for builds and caching
- [ ] **MONO-03**: TypeScript workspace resolution works across packages
- [ ] **MONO-04**: packages/ui exports shared design tokens and types
- [ ] **MONO-05**: Mobile app (apps/mobile) builds and runs in browser
- [ ] **MONO-06**: Mobile app can be built for iOS/Android via Capacitor
- [ ] **MONO-07**: Web app (apps/web) builds and runs
- [ ] **MONO-08**: Backend (apps/backend) builds and runs
- [ ] **MONO-09**: All apps can run concurrently in development mode

### Settings & Profile

- [ ] **SET-01**: User can view their profile information
- [ ] **SET-02**: User can update their profile
- [ ] **SET-03**: User can access basic business settings
- [ ] **SET-04**: Settings page is navigable from drawer/sidebar

### Documentation

- [ ] **DOC-01**: README covers installation steps
- [ ] **DOC-02**: README covers environment variable setup for all apps
- [ ] **DOC-03**: README covers running all apps (mobile, web, backend)
- [ ] **DOC-04**: Environment variable examples provided (.env.example files)

## v2 Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Dashboard Advanced

- **DASH-V2-01**: Dense data display with Bloomberg terminal aesthetic
- **DASH-V2-02**: Activity feed showing timeline of recent changes

### Product Management

- **PROD-V2-01**: Create, read, update, delete products
- **PROD-V2-02**: Search and filter products by name, category, attributes
- **PROD-V2-03**: Export product list to CSV/Excel
- **PROD-V2-04**: Bulk operations with Excel-like editing
- **PROD-V2-05**: Barcode scanning for quick product lookup
- **PROD-V2-06**: Custom fields and metadata for products

### Inventory Management

- **INV-V2-01**: Real-time inventory tracking
- **INV-V2-02**: Multi-location inventory support
- **INV-V2-03**: Smart stock alerts with predictive warnings

### Sales Management

- **SALE-V2-01**: Manual sales transaction recording
- **SALE-V2-02**: Order management with status workflows
- **SALE-V2-03**: POS integration with offline capability

### Purchase Management

- **PURCH-V2-01**: Manual purchase order recording
- **PURCH-V2-02**: Supplier management and tracking

### Navigation Advanced

- **NAV-V2-01**: Keyboard shortcuts for power users

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Advanced Analytics/BI Dashboards | Bloat and complexity — this is operations-first, not analytics-heavy |
| Full CRM Suite | Scope explosion — lightweight customer management only |
| Advanced Inventory Forecasting (ML) | Over-promising early — simple stock alerts sufficient for v1 |
| Mobile POS App | Separate product — admin focus, not cashier UX |
| Real-Time Notifications | Notification fatigue — activity feed is enough |
| Multi-Currency/Multi-Language | Premature complexity — single locale initially |
| Automated Reordering | Liability issues — manual purchase recording safer |
| Everything Customizable | Decision paralysis — opinionated defaults are a feature |
| Blockchain/Web3 Integration | Solution seeking problem — no business value |
| AI Chatbot Support | Masks poor UX — fix workflows instead |
| Ionic/Material UI components | Design system constraint — shadcn aesthetic required |
| Supabase PostgreSQL for business data | Technical constraint — separate PostgreSQL instance |
| Empty states in Phase 1 | Phase 1 goal — show realistic density, not placeholders |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| - | - | Pending |

**Coverage:**
- v1 requirements: 0 total (to be calculated after roadmap)
- Mapped to phases: 0
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after initial definition*
