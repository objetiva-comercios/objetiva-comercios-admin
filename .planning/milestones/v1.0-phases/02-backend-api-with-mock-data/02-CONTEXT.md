# Phase 2: Backend API with Mock Data - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build complete backend API with realistic mock data endpoints that validate the frontend-backend contract. Deliver authenticated REST API serving dummy data for Dashboard, Products, Orders, Inventory, Sales, and Purchases. Real database integration happens in Phase 5 — this phase focuses on establishing the API surface and data shape.

</domain>

<decisions>
## Implementation Decisions

### Response structure & pagination

- **Filtering and sorting**: Support query parameters for filtering and sorting (e.g., `?status=pending&sort=-createdAt`)
- Pagination approach: Claude's discretion
- Response metadata: Claude's discretion
- Standard entity fields: Claude's discretion

### Mock data attributes & volume

- **Product count**: 500+ products (match success criteria)
- **Product attributes**: Comprehensive set including name, SKU, price, cost, category, stock, images, description
- Data variety (statuses, edge cases): Claude's discretion
- Relational consistency between entities: Claude's discretion

### API conventions & patterns

- **URL structure**: RESTful resource paths (`/api/products`, `/api/orders`)
- **Date format**: ISO 8601 strings (e.g., `2026-01-24T10:30:00Z`)
- API versioning: Claude's discretion
- JSON field naming convention: Claude's discretion

### Error handling & validation

- Authentication errors (401): Claude's discretion
- Validation error structure: Claude's discretion
- HTTP status codes: Claude's discretion
- Error context (request IDs, timestamps): Claude's discretion

### Claude's Discretion

- Pagination implementation (cursor vs offset/limit)
- Response metadata depth (full vs minimal)
- Standard entity fields (id, createdAt, updatedAt decisions)
- Mock data variety and distribution of statuses
- Referential integrity between mock entities
- API versioning approach
- JSON field naming (camelCase vs snake_case)
- Authentication error detail level
- Validation error format
- HTTP status code granularity
- Error response debugging context

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches aligned with modern REST API conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 02-backend-api-with-mock-data_
_Context gathered: 2026-01-24_
