# Phase 2: Backend API with Mock Data - Research

**Researched:** 2026-01-24
**Domain:** NestJS REST API with mock data generation
**Confidence:** HIGH

## Summary

This research investigated building REST APIs with NestJS using mock data for e-commerce applications. The standard approach uses NestJS's built-in validation pipes with class-validator/class-transformer for request validation, @faker-js/faker for realistic data generation, and the repository pattern to abstract data access. Key findings show camelCase is the standard for TypeScript/JavaScript JSON APIs, offset pagination is simpler for mock data scenarios (cursor pagination is for production scale), and proper guard/filter setup is critical for authentication and error handling.

NestJS provides a mature, opinionated framework with strong TypeScript support, dependency injection, and decorator-based architecture. The ecosystem recommends feature-based module organization, global validation pipes, and exception filters for consistent error handling.

**Primary recommendation:** Use @faker-js/faker 10.x for generating 500+ products with comprehensive attributes, implement offset-based pagination for simplicity in this phase, leverage NestJS ValidationPipe globally with class-validator decorators, and structure modules by feature (products, orders, inventory, etc.) with controllers handling routing and services managing business logic.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library           | Version | Purpose               | Why Standard                                                      |
| ----------------- | ------- | --------------------- | ----------------------------------------------------------------- |
| @nestjs/common    | ^10.0.0 | Core NestJS framework | Official framework with decorators, DI, guards, filters           |
| class-validator   | ^0.14.x | DTO validation        | Decorator-based validation, integrates with NestJS ValidationPipe |
| class-transformer | ^0.5.x  | DTO transformation    | Transforms plain objects to class instances for validation        |
| @faker-js/faker   | ^10.2.0 | Mock data generation  | TypeScript-first, 169+ generators, commerce module for products   |

### Supporting

| Library         | Version | Purpose            | When to Use                                |
| --------------- | ------- | ------------------ | ------------------------------------------ |
| @nestjs/swagger | ^7.x    | API documentation  | Auto-generate OpenAPI docs from decorators |
| dotenv          | ^16.x   | Environment config | Manage port, CORS origins, JWT secrets     |

### Alternatives Considered

| Instead of        | Could Use         | Tradeoff                                                                                      |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| @faker-js/faker   | @ngneat/falso     | Falso is tree-shakable and lighter, but faker has larger ecosystem and more commerce features |
| class-validator   | joi/zod           | Joi/Zod use functional schemas vs decorators; class-validator integrates better with NestJS   |
| offset pagination | cursor pagination | Cursor is faster at scale but adds complexity; offset is simpler for mock data phase          |

**Installation:**

```bash
pnpm add class-validator class-transformer @faker-js/faker
pnpm add -D @types/node
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/
├── common/              # Shared utilities, decorators, filters
│   ├── decorators/      # Custom decorators (@Public, etc.)
│   ├── filters/         # Exception filters
│   ├── guards/          # Auth guards (already exists)
│   └── dto/             # Shared DTOs (pagination, responses)
├── modules/             # Feature modules
│   ├── products/
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── products.module.ts
│   │   ├── dto/         # Product-specific DTOs
│   │   └── entities/    # Product entity/interface
│   ├── orders/
│   ├── inventory/
│   ├── sales/
│   ├── purchases/
│   └── dashboard/
├── data/                # Mock data generation
│   ├── generators/      # Faker-based generators
│   └── seed.ts          # Initialize mock data
├── auth/                # Authentication (already exists)
└── main.ts
```

### Pattern 1: Feature Module with Service-Repository Pattern

**What:** Each domain (products, orders) is a self-contained module with controller, service, and mock data repository
**When to use:** For every API resource in this phase
**Example:**

```typescript
// products/products.module.ts
import { Module } from '@nestjs/common'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // Export if other modules need products
})
export class ProductsModule {}

// products/products.service.ts
import { Injectable } from '@nestjs/common'

@Injectable()
export class ProductsService {
  private products = [] // Mock data stored in-memory

  findAll(query: QueryDto) {
    // Filter, sort, paginate
    return { data: this.products, meta: { total: 500 } }
  }
}
```

### Pattern 2: Global ValidationPipe Setup

**What:** Configure validation globally in main.ts instead of per-route
**When to use:** Always - apply validation to all endpoints
**Example:**

```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Auto-transform to DTO class instances
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if unknown properties sent
    })
  )

  await app.listen(3001)
}
```

### Pattern 3: Query DTO for Filtering and Pagination

**What:** Create reusable DTO for query parameters with validation decorators
**When to use:** For list endpoints that support filtering, sorting, pagination
**Example:**

```typescript
// common/dto/query.dto.ts
import { IsOptional, IsInt, Min, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20

  @IsOptional()
  @IsString()
  sort?: string // e.g., "-createdAt" for descending

  @IsOptional()
  @IsString()
  status?: string
}
```

### Pattern 4: Standard Response Format

**What:** Consistent response structure with data and metadata
**When to use:** For all collection endpoints
**Example:**

```typescript
// common/dto/paginated-response.dto.ts
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Usage in controller
@Get()
findAll(@Query() query: QueryDto): PaginatedResponseDto<Product> {
  return this.productsService.findAll(query);
}
```

### Pattern 5: Exception Filter for Consistent Errors

**What:** Global exception filter that formats all errors uniformly
**When to use:** Register globally to catch all exceptions
**Example:**

```typescript
// common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()
    const status = exception.getStatus()

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    })
  }
}

// main.ts
app.useGlobalFilters(new HttpExceptionFilter())
```

### Pattern 6: Mock Data Seeding

**What:** Generate and store mock data on application startup
**When to use:** In this phase, to populate in-memory data stores
**Example:**

```typescript
// data/generators/product.generator.ts
import { faker } from '@faker-js/faker'

export function generateProduct(id: number) {
  return {
    id,
    sku: faker.string.alphanumeric(8).toUpperCase(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
    cost: parseFloat(faker.commerce.price({ min: 5, max: 500 })),
    category: faker.commerce.department(),
    stock: faker.number.int({ min: 0, max: 500 }),
    imageUrl: faker.image.url(),
    createdAt: faker.date.past(),
    updatedAt: new Date(),
  }
}

// data/seed.ts
export function seedProducts(count: number = 500) {
  return Array.from({ length: count }, (_, i) => generateProduct(i + 1))
}
```

### Anti-Patterns to Avoid

- **Controllers with business logic:** Controllers should only handle HTTP concerns (routing, parsing) and delegate to services
- **Manual validation in routes:** Use ValidationPipe and DTOs instead of try-catch validation blocks
- **Circular dependencies:** Don't import modules that import each other; use forwardRef sparingly or restructure
- **Creating provider instances manually:** Never `new Service()` - always inject via constructor
- **Missing exception handling:** Don't let errors bubble without filters; use HttpException for operational errors
- **Swallowed logs on startup:** Circular dependencies can hide startup errors; use tools like Madge to detect

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem               | Don't Build                              | Use Instead                                 | Why                                                                    |
| --------------------- | ---------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Request validation    | Custom validation functions with if/else | class-validator decorators + ValidationPipe | Handles type coercion, nested objects, custom validators, localization |
| Data transformation   | Manual object mapping                    | class-transformer with @Type(), @Exclude()  | Handles circular refs, nested transformations, groups                  |
| Fake data generation  | Manual arrays of sample data             | @faker-js/faker with locale support         | 169+ generators, realistic data, internationalization, edge cases      |
| Authentication guards | Manual token checking in controllers     | NestJS Guards with @UseGuards()             | Integrates with DI, composable, testable, execution context aware      |
| Exception formatting  | Try-catch in every route                 | Exception Filters with @Catch()             | Centralized, consistent errors, stack traces, logging integration      |
| Pagination logic      | Manual slice/skip calculations           | Standard QueryDto + service layer helpers   | Handles edge cases (page overflow), validation, metadata generation    |
| API documentation     | Manual OpenAPI spec writing              | @nestjs/swagger decorators                  | Auto-generates from DTOs, stays in sync with code                      |

**Key insight:** NestJS provides built-in solutions for nearly all cross-cutting concerns. Hand-rolling custom solutions defeats the framework's purpose and creates maintenance burden. Trust the framework's patterns - they handle edge cases you haven't encountered yet.

## Common Pitfalls

### Pitfall 1: Circular Dependency Deadlocks

**What goes wrong:** Application fails to start with cryptic errors, or worse, silently swallows logs during startup
**Why it happens:** Module A imports Module B which imports Module A, creating a cycle the DI container can't resolve
**How to avoid:**

- Use feature-based modules that don't cross-reference (products module shouldn't import orders module)
- If shared functionality needed, extract to common module
- Use Madge tool to detect: `npx madge --circular src/`
  **Warning signs:** "Nest can't resolve dependencies" errors, startup hangs, missing logs

### Pitfall 2: Validation Pipe Not Transforming Types

**What goes wrong:** Query parameters arrive as strings even though DTO declares them as numbers; validation passes but runtime errors occur
**Why it happens:** ValidationPipe `transform: true` option not enabled, so class-transformer doesn't convert types
**How to avoid:** Always use `transform: true` in ValidationPipe setup, add `@Type()` decorators to DTO properties
**Warning signs:** `typeof page === 'string'` when DTO says `page: number`, math operations fail on query params

### Pitfall 3: Missing Global Prefix Conflicts

**What goes wrong:** Routes conflict with frontend or other services; `/products` collides with frontend route
**Why it happens:** Backend routes not prefixed, making them hard to proxy/route in production
**How to avoid:** Use `app.setGlobalPrefix('api')` in main.ts so all routes become `/api/products`
**Warning signs:** CORS errors, routing confusion, need for complex proxy configs

### Pitfall 4: Faker Data Not Realistic Enough

**What goes wrong:** Mock products have nonsensical attributes (negative prices, empty SKUs), UI breaks
**Why it happens:** Using faker without constraints or validation
**How to avoid:**

- Always set min/max on numeric fields: `faker.number.int({ min: 0, max: 500 })`
- Ensure required fields never undefined
- Generate relational consistency (order.productId exists in products)
  **Warning signs:** Frontend displays "undefined", negative inventory, future dates for past transactions

### Pitfall 5: Unprotected Routes After Adding JWT Guard

**What goes wrong:** Login endpoint requires authentication, creating impossible chicken-and-egg
**Why it happens:** Global guard applied without @Public() decorator mechanism
**How to avoid:**

- Create @Public() decorator using SetMetadata
- Check for public metadata in guard's canActivate method
- Apply to /auth/login, /health endpoints
  **Warning signs:** 401 on login, health checks fail, can't authenticate

### Pitfall 6: CORS Rejecting Frontend Requests

**What goes wrong:** Frontend gets CORS errors even though CORS enabled
**Why it happens:** CORS origin list doesn't match frontend URL exactly (http vs https, port mismatch)
**How to avoid:**

- Use exact URLs in origin array: `['http://localhost:3000', 'http://localhost:5173']`
- Enable credentials if cookies/auth headers used: `credentials: true`
- In production, use environment variables for allowed origins
  **Warning signs:** Browser console shows CORS policy errors, preflight OPTIONS requests fail

### Pitfall 7: Port Conflicts in Monorepo Dev Mode

**What goes wrong:** Backend won't start because port 3001 already in use by another app
**Why it happens:** Multiple backend instances running, or port collision with other services
**How to avoid:**

- Use different ports for each app (backend: 3001, web: 3000, mobile-server: 3002)
- Store port in .env file: `PORT=3001`
- Check process: `lsof -i :3001` (Unix) or `netstat -ano | findstr :3001` (Windows)
  **Warning signs:** EADDRINUSE error, app fails to listen, silent startup failure

### Pitfall 8: Service Layer Doing Too Much

**What goes wrong:** ProductsService becomes 1000+ lines with business logic, data access, validation, formatting
**Why it happens:** No clear separation between service responsibilities
**How to avoid:**

- Services handle business logic only
- Controllers handle HTTP concerns (parsing, response formatting)
- Separate repository/data-access layer (even for mock data)
- DTOs handle validation and transformation
  **Warning signs:** Services with multiple responsibilities, hard to test, frequent merge conflicts

## Code Examples

Verified patterns from official sources and community best practices:

### JWT Auth Guard with Public Routes

```typescript
// common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}

// main.ts - Apply guard globally
app.useGlobalGuards(new JwtAuthGuard(new Reflector()));

// auth/auth.controller.ts - Mark login as public
@Public()
@Post('login')
login() { /* ... */ }
```

### Complete Product Module Example

```typescript
// modules/products/dto/create-product.dto.ts
import { IsString, IsNumber, IsUrl, Min } from 'class-validator'

export class CreateProductDto {
  @IsString()
  name: string

  @IsString()
  sku: string

  @IsNumber()
  @Min(0)
  price: number

  @IsNumber()
  @Min(0)
  cost: number

  @IsString()
  category: string

  @IsNumber()
  @Min(0)
  stock: number

  @IsUrl()
  imageUrl: string
}

// modules/products/products.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ProductsService } from './products.service'
import { QueryDto } from '../../common/dto/query.dto'

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryDto) {
    return this.productsService.findAll(query)
  }
}

// modules/products/products.service.ts
import { Injectable } from '@nestjs/common'
import { seedProducts } from '../../data/seed'

@Injectable()
export class ProductsService {
  private readonly products = seedProducts(500)

  findAll(query: QueryDto) {
    let filtered = [...this.products]

    // Filter by status if provided
    if (query.status) {
      filtered = filtered.filter(p => p.status === query.status)
    }

    // Sort
    if (query.sort) {
      const descending = query.sort.startsWith('-')
      const field = descending ? query.sort.slice(1) : query.sort
      filtered.sort((a, b) => {
        const order = descending ? -1 : 1
        return a[field] > b[field] ? order : -order
      })
    }

    // Paginate
    const page = query.page || 1
    const limit = query.limit || 20
    const start = (page - 1) * limit
    const data = filtered.slice(start, start + limit)

    return {
      data,
      meta: {
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      },
    }
  }
}
```

### Realistic E-commerce Mock Data

```typescript
// data/generators/product.generator.ts
import { faker } from '@faker-js/faker'

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Books',
  'Toys',
  'Food & Beverage',
]

export function generateProduct(id: number) {
  const price = faker.number.float({ min: 10, max: 1000, fractionDigits: 2 })
  const cost = price * faker.number.float({ min: 0.4, max: 0.7, fractionDigits: 2 })

  return {
    id,
    sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price,
    cost: parseFloat(cost.toFixed(2)),
    category: faker.helpers.arrayElement(CATEGORIES),
    stock: faker.number.int({ min: 0, max: 500 }),
    imageUrl: faker.image.urlLoremFlickr({ category: 'product' }),
    createdAt: faker.date.past({ years: 2 }).toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// data/generators/order.generator.ts
export function generateOrder(id: number, products: any[]) {
  const orderDate = faker.date.past({ years: 1 })
  const status = faker.helpers.arrayElement([
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ])

  const itemCount = faker.number.int({ min: 1, max: 5 })
  const items = Array.from({ length: itemCount }, () => {
    const product = faker.helpers.arrayElement(products)
    const quantity = faker.number.int({ min: 1, max: 10 })
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
      subtotal: product.price * quantity,
    }
  })

  const total = items.reduce((sum, item) => sum + item.subtotal, 0)

  return {
    id,
    orderNumber: `ORD-${faker.string.numeric(8)}`,
    customerId: faker.number.int({ min: 1, max: 1000 }),
    customerName: faker.person.fullName(),
    items,
    total: parseFloat(total.toFixed(2)),
    status,
    createdAt: orderDate.toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// data/seed.ts
import { generateProduct } from './generators/product.generator'
import { generateOrder } from './generators/order.generator'

export function seedProducts(count: number = 500) {
  return Array.from({ length: count }, (_, i) => generateProduct(i + 1))
}

export function seedOrders(count: number = 200, products: any[]) {
  return Array.from({ length: count }, (_, i) => generateOrder(i + 1, products))
}
```

### Dashboard Aggregation Service

```typescript
// modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common'

@Injectable()
export class DashboardService {
  constructor(
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private salesService: SalesService
  ) {}

  getKpis() {
    const products = this.productsService.getAll()
    const orders = this.ordersService.getAll()
    const sales = this.salesService.getAll()

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
    const totalOrders = orders.length
    const pendingOrders = orders.filter(o => o.status === 'pending').length
    const lowStockProducts = products.filter(p => p.stock < 10).length

    return {
      revenue: {
        total: totalRevenue,
        trend: '+12.5%', // Mock trend
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
      },
      inventory: {
        lowStock: lowStockProducts,
        outOfStock: products.filter(p => p.stock === 0).length,
      },
      sales: {
        today: sales.filter(s => this.isToday(s.createdAt)).length,
        thisWeek: sales.filter(s => this.isThisWeek(s.createdAt)).length,
      },
    }
  }

  private isToday(date: string): boolean {
    const today = new Date()
    const check = new Date(date)
    return check.toDateString() === today.toDateString()
  }

  private isThisWeek(date: string): boolean {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const check = new Date(date)
    return check >= weekAgo && check <= now
  }
}
```

## State of the Art

| Old Approach           | Current Approach                    | When Changed     | Impact                                                 |
| ---------------------- | ----------------------------------- | ---------------- | ------------------------------------------------------ |
| faker (unmaintained)   | @faker-js/faker                     | 2022             | New community fork with TypeScript, active maintenance |
| Manual query parsing   | class-validator + class-transformer | NestJS 6+ (2019) | Type-safe, auto-validated query params                 |
| Route-level guards     | Global guards with metadata         | NestJS 7+ (2020) | DRY, centralized auth                                  |
| try-catch everywhere   | Exception filters                   | Core pattern     | Consistent error responses                             |
| snake_case JSON        | camelCase JSON                      | JS/TS standard   | Aligns with frontend conventions                       |
| Cursor pagination only | Offset for simple cases             | Ongoing          | Offset acceptable for <10k records                     |

**Deprecated/outdated:**

- **faker package** (old, unmaintained): Use @faker-js/faker instead
- **class-validator-jsonschema**: Built into @nestjs/swagger now
- **Manual JWT verification in guards**: Use @nestjs/passport with strategies
- **helmet package direct use**: Integrated in NestJS security practices

## Open Questions

Things that couldn't be fully resolved:

1. **How many orders/sales/purchases to generate?**
   - What we know: Products need 500+ (per requirements), orders should relate to products
   - What's unclear: Optimal ratios for realistic data (500 products → X orders?)
   - Recommendation: Start with 200 orders, 100 sales, 50 purchases. Adjust if frontend performance testing reveals issues.

2. **Should mock data persist between restarts?**
   - What we know: In-memory data is simpler, file-based data is more realistic
   - What's unclear: Does frontend team need stable IDs across restarts?
   - Recommendation: Start in-memory, add JSON file persistence if needed for testing workflows.

3. **What level of referential integrity?**
   - What we know: Orders should reference real product IDs, inventory should match products
   - What's unclear: How strict should consistency be? (e.g., order quantity <= product stock?)
   - Recommendation: Ensure IDs match, but allow "impossible" states (negative stock) to test frontend edge cases.

## Sources

### Primary (HIGH confidence)

- Official NestJS Documentation (docs.nestjs.com) - Validation, Exception Filters, Authentication
- @faker-js/faker NPM package - Version 10.2.0, commerce module capabilities
- class-validator NPM package - Version 0.14.x, decorator patterns
- MDN Web Docs - ISO 8601 date format, JSON serialization standards

### Secondary (MEDIUM confidence)

- [Mastering NestJS REST API Backend](https://medium.com/@janishar.ali/mastering-nestjs-building-an-effective-rest-api-backend-8a5add59c2f5) - Architecture patterns
- [NestJS DTO Validation Guide](https://medium.com/@ahureinebenezer/mastering-data-validation-in-nestjs-a-complete-guide-with-class-validator-and-class-transformer-02a029db6ecf) - ValidationPipe setup
- [Pagination Best Practices](https://www.speakeasy.com/api-design/pagination) - Offset vs cursor
- [Best Practices for NestJS Structure](https://arnab-k.medium.com/best-practices-for-structuring-a-nestjs-application-b3f627548220) - Module organization
- [10 Common NestJS Mistakes](https://medium.com/@enguerrandpp/10-common-mistakes-to-avoid-when-using-nest-js-ea96f5f460b0) - Anti-patterns
- [JWT Auth Guard Implementation](https://medium.com/@bhanushaliyash2000/implementing-an-auth-guard-with-jwt-tokens-in-nest-js-92176a9c3457) - Guard patterns
- [CamelCase vs Snake_Case](https://apidog.com/blog/camelcase-vs-snake_case/) - JSON naming conventions
- [Repository Pattern in NestJS](https://www.tymzap.com/blog/decoupled-data-layer-with-repository-pattern-in-nestjs) - Service layer
- [NestJS Error Handling Patterns](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nestjs/) - Exception filters
- [Faker.js Commerce API](https://fakerjs.dev/api/commerce) - Product generation

### Tertiary (LOW confidence)

- GitHub Issues (nestjs/nest) - Port conflicts, circular dependencies
- Stack Overflow discussions - Query parameter patterns
- Community blog posts - Various implementation details

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Official packages with stable versions, widely adopted
- Architecture: HIGH - Official NestJS patterns, verified in docs and multiple sources
- Pitfalls: MEDIUM-HIGH - Based on community consensus and issue tracking, not all officially documented
- Mock data: HIGH - @faker-js/faker official API, verified commerce methods

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable ecosystem, slow-moving changes expected)
