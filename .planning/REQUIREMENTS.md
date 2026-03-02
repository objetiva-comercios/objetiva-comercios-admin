# Requirements: Objetiva Comercios Admin

**Defined:** 2026-01-22
**Core Value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one

## v1 Requirements

Requirements for initial release (Phase 1 foundation). Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up with email and password via Supabase Auth
- [x] **AUTH-02**: User can log in with email and password
- [x] **AUTH-03**: User session persists across browser/app refresh
- [x] **AUTH-04**: User can log out from any page
- [ ] **AUTH-05**: Backend validates JWT tokens from Supabase on every request
- [x] **AUTH-06**: User roles and permissions system (RBAC) implemented

### Navigation & Layout

- [ ] **NAV-01**: Mobile app displays bottom tabs for primary sections (Dashboard, Articles, Orders, Inventory)
- [ ] **NAV-02**: Mobile app displays drawer navigation from header for secondary actions (Profile, Settings, Logout)
- [x] **NAV-03**: Web app displays sidebar navigation for all sections
- [x] **NAV-04**: Navigation is consistent and NOT context-dependent across platforms
- [x] **NAV-05**: Layout includes header with app name and user menu
- [x] **NAV-06**: Layout includes content area that adapts to navigation
- [x] **NAV-07**: All sections are navigable (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings)

### UI & Responsiveness

- [x] **UI-01**: UI follows shadcn aesthetic (modern, dense, admin-oriented)
- [x] **UI-02**: Dark theme implemented and works across platforms
- [x] **UI-03**: Layout is responsive and adapts to screen sizes
- [x] **UI-04**: Mobile and web feel cohesive despite platform-specific implementations
- [ ] **UI-05**: Components live in packages/ui with shared design tokens

### Dashboard

- [x] **DASH-01**: Dashboard displays key metrics (sales, inventory, orders)
- [x] **DASH-02**: Dashboard shows realistic operational data from backend
- [x] **DASH-03**: Dashboard demonstrates layout density (not empty states)

### Backend & API

- [x] **API-01**: Backend exposes /api/dashboard endpoint with mock data
- [x] **API-02**: Backend exposes /api/products endpoint with mock data
- [x] **API-03**: Backend exposes /api/orders endpoint with mock data
- [x] **API-04**: Backend exposes /api/inventory endpoint with mock data
- [x] **API-05**: Backend exposes /api/sales endpoint with mock data
- [x] **API-06**: Backend exposes /api/purchases endpoint with mock data
- [x] **API-07**: Backend serves realistic dummy data (500+ products minimum)
- [x] **API-08**: Backend has health check endpoint
- [x] **API-09**: All API endpoints require valid JWT token

### Monorepo & Tooling

- [ ] **MONO-01**: Monorepo structure with pnpm workspaces functional
- [ ] **MONO-02**: Turborepo configured for builds and caching
- [ ] **MONO-03**: TypeScript workspace resolution works across packages
- [ ] **MONO-04**: packages/ui exports shared design tokens and types
- [ ] **MONO-05**: Mobile app (apps/mobile) builds and runs in browser
- [ ] **MONO-06**: Mobile app can be built for iOS/Android via Capacitor
- [x] **MONO-07**: Web app (apps/web) builds and runs
- [x] **MONO-08**: Backend (apps/backend) builds and runs
- [x] **MONO-09**: All apps can run concurrently in development mode

### Settings & Profile

- [x] **SET-01**: User can view their profile information
- [x] **SET-02**: User can update their profile
- [x] **SET-03**: User can access basic business settings
- [x] **SET-04**: Settings page is navigable from drawer/sidebar

### Documentation

- [ ] **DOC-01**: README covers installation steps
- [ ] **DOC-02**: README covers environment variable setup for all apps
- [x] **DOC-03**: README covers running all apps (mobile, web, backend)
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

| Feature                               | Reason                                                               |
| ------------------------------------- | -------------------------------------------------------------------- |
| Advanced Analytics/BI Dashboards      | Bloat and complexity — this is operations-first, not analytics-heavy |
| Full CRM Suite                        | Scope explosion — lightweight customer management only               |
| Advanced Inventory Forecasting (ML)   | Over-promising early — simple stock alerts sufficient for v1         |
| Mobile POS App                        | Separate product — admin focus, not cashier UX                       |
| Real-Time Notifications               | Notification fatigue — activity feed is enough                       |
| Multi-Currency/Multi-Language         | Premature complexity — single locale initially                       |
| Automated Reordering                  | Liability issues — manual purchase recording safer                   |
| Everything Customizable               | Decision paralysis — opinionated defaults are a feature              |
| Blockchain/Web3 Integration           | Solution seeking problem — no business value                         |
| AI Chatbot Support                    | Masks poor UX — fix workflows instead                                |
| Ionic/Material UI components          | Design system constraint — shadcn aesthetic required                 |
| Supabase PostgreSQL for business data | Technical constraint — separate PostgreSQL instance                  |
| Empty states in Phase 1               | Phase 1 goal — show realistic density, not placeholders              |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase                     | Status   |
| ----------- | ------------------------- | -------- |
| AUTH-01     | Phase 3, Phase 8          | Complete |
| AUTH-02     | Phase 3, Phase 8          | Complete |
| AUTH-03     | Phase 3, Phase 7, Phase 8 | Complete |
| AUTH-04     | Phase 3, Phase 8          | Complete |
| AUTH-05     | Phase 1                   | Complete |
| AUTH-06     | Phase 6                   | Complete |
| NAV-01      | Phase 4, Phase 8          | Pending  |
| NAV-02      | Phase 4, Phase 8          | Pending  |
| NAV-03      | Phase 3, Phase 8          | Complete |
| NAV-04      | Phase 3, Phase 4, Phase 8 | Complete |
| NAV-05      | Phase 3, Phase 4, Phase 8 | Complete |
| NAV-06      | Phase 3, Phase 4, Phase 8 | Complete |
| NAV-07      | Phase 3, Phase 4, Phase 8 | Complete |
| UI-01       | Phase 3, Phase 8          | Complete |
| UI-02       | Phase 3, Phase 8          | Complete |
| UI-03       | Phase 3, Phase 8          | Complete |
| UI-04       | Phase 3, Phase 4, Phase 8 | Complete |
| UI-05       | Phase 1                   | Complete |
| DASH-01     | Phase 3, Phase 7, Phase 8 | Complete |
| DASH-02     | Phase 3, Phase 7, Phase 8 | Complete |
| DASH-03     | Phase 3, Phase 8          | Complete |
| API-01      | Phase 2                   | Complete |
| API-02      | Phase 2                   | Complete |
| API-03      | Phase 2                   | Complete |
| API-04      | Phase 2                   | Complete |
| API-05      | Phase 2                   | Complete |
| API-06      | Phase 2                   | Complete |
| API-07      | Phase 2                   | Complete |
| API-08      | Phase 2                   | Complete |
| API-09      | Phase 2                   | Complete |
| MONO-01     | Phase 1                   | Complete |
| MONO-02     | Phase 1                   | Complete |
| MONO-03     | Phase 1                   | Complete |
| MONO-04     | Phase 1                   | Complete |
| MONO-05     | Phase 4, Phase 8          | Pending  |
| MONO-06     | Phase 4, Phase 8          | Pending  |
| MONO-07     | Phase 3, Phase 8          | Complete |
| MONO-08     | Phase 2                   | Complete |
| MONO-09     | Phase 2                   | Complete |
| SET-01      | Phase 3, Phase 8          | Complete |
| SET-02      | Phase 3, Phase 8          | Complete |
| SET-03      | Phase 3, Phase 8          | Complete |
| SET-04      | Phase 3, Phase 8          | Complete |
| DOC-01      | Phase 1                   | Complete |
| DOC-02      | Phase 1                   | Complete |
| DOC-03      | Phase 3, Phase 8          | Complete |
| DOC-04      | Phase 1                   | Complete |

**Coverage:**

- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

**Coverage Notes:**

- Some requirements (NAV-04, NAV-05, NAV-06, NAV-07, UI-04) appear in multiple phases because they apply to both web and mobile platforms
- Each requirement's primary delivery phase is the first listed
- 100% coverage achieved

---

_Requirements defined: 2026-01-22_
_Last updated: 2026-03-02 after gap closure phases 7-8 added_
