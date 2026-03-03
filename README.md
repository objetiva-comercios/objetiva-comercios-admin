# Objetiva Comercios Admin

Sistema de administracion reutilizable para aplicaciones comerciales. Provee una base solida con autenticacion, navegacion y secciones operativas (dashboard, productos, ordenes, inventario, ventas, compras) para comercios pequenos y medianos. Funciona como monorepo con una app web (Next.js), una app movil (Capacitor + React), y un backend (NestJS) que comparten autenticacion via Supabase y datos de negocio en PostgreSQL separado.

## Tecnologias

| Categoria      | Tecnologia                                          |
| -------------- | --------------------------------------------------- |
| Monorepo       | pnpm 9, Turborepo 2                                 |
| Frontend Web   | Next.js 14 (App Router), React 18, Tailwind CSS 3.4 |
| Frontend Movil | Vite 5, React 18, Capacitor 8, React Router 7       |
| Backend        | NestJS 10, TypeScript 5.3                           |
| Base de datos  | PostgreSQL (Drizzle ORM 0.45)                       |
| Autenticacion  | Supabase Auth (JWT via JWKS)                        |
| UI             | shadcn/ui, Radix UI, Lucide Icons, Recharts         |
| Tablas         | TanStack Table 8, TanStack Query 5 (movil)          |
| Validacion     | Zod 4, class-validator                              |
| Calidad        | ESLint, Prettier, Husky, lint-staged                |

## Requisitos previos

- Node.js >= 20
- pnpm >= 9 (`corepack enable pnpm`)
- PostgreSQL (local o remoto)
- Proyecto de Supabase (solo para autenticacion)

## Instalacion

1. Clonar el repositorio e instalar dependencias:

```bash
git clone <repository-url>
cd objetiva-comercios-admin
pnpm install
```

2. Compilar los paquetes compartidos (necesario antes de `dev`):

```bash
pnpm build
```

3. Configurar las variables de entorno (ver seccion siguiente).

4. Crear la base de datos PostgreSQL y ejecutar migraciones:

```bash
createdb nombre_de_tu_base
cd apps/backend
pnpm db:migrate
pnpm db:seed
```

5. Iniciar todos los servicios en modo desarrollo:

```bash
pnpm dev
```

## Configuracion

El proyecto usa **dos bases de datos separadas**:

- **Supabase**: Exclusivamente para autenticacion (login, signup, JWT). No almacena datos de negocio.
- **PostgreSQL local** (Drizzle ORM): Todos los datos de negocio (productos, ordenes, inventario, ventas, compras).

El backend no se conecta a la base de Supabase. Solo valida los JWT que Supabase genera, usando el endpoint JWKS publico.

### `apps/backend/.env`

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_de_tu_base
SUPABASE_PROJECT_ID=tu-project-id
PORT=3001
NODE_ENV=development
```

| Variable              | Default       | Descripcion                                             |
| --------------------- | ------------- | ------------------------------------------------------- |
| `DATABASE_URL`        | -             | Connection string de PostgreSQL para datos de negocio   |
| `SUPABASE_PROJECT_ID` | -             | Reference ID del proyecto Supabase (Settings > General) |
| `PORT`                | `3001`        | Puerto del servidor backend                             |
| `NODE_ENV`            | `development` | Entorno de ejecucion                                    |

### `apps/web/.env`

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

| Variable                        | Default                 | Descripcion                                |
| ------------------------------- | ----------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | -                       | URL del proyecto Supabase                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | -                       | Clave publica (anon) del proyecto Supabase |
| `NEXT_PUBLIC_API_URL`           | `http://localhost:3001` | URL del backend                            |

### `apps/mobile/.env`

```env
VITE_SUPABASE_URL=https://tu-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_API_URL=http://localhost:3001
```

| Variable                 | Default                 | Descripcion                                |
| ------------------------ | ----------------------- | ------------------------------------------ |
| `VITE_SUPABASE_URL`      | -                       | URL del proyecto Supabase                  |
| `VITE_SUPABASE_ANON_KEY` | -                       | Clave publica (anon) del proyecto Supabase |
| `VITE_API_URL`           | `http://localhost:3001` | URL del backend                            |

## Uso

| Comando             | Descripcion                                |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Inicia todas las apps en modo desarrollo   |
| `pnpm build`        | Compila todos los paquetes y apps          |
| `pnpm type-check`   | Verificacion de tipos TypeScript           |
| `pnpm lint`         | Ejecuta ESLint en todo el monorepo         |
| `pnpm lint:fix`     | Corrige errores de linting automaticamente |
| `pnpm format`       | Formatea con Prettier                      |
| `pnpm format:check` | Verifica formato sin modificar             |

### Desarrollo

```bash
# Todas las apps en paralelo
pnpm dev

# App individual
pnpm dev --filter=@objetiva/web
pnpm dev --filter=@objetiva/mobile
pnpm dev --filter=@objetiva/backend
```

Puertos:

- Web: http://localhost:3000
- Mobile: http://localhost:5173
- Backend: http://localhost:3001

### Produccion (Docker)

```bash
docker compose up -d --build
```

Los servicios `erp-web` y `erp-backend` se conectan a la red externa `sanchez_docker_network`. El backend carga variables desde `apps/backend/.env.production`.

## Arquitectura del proyecto

```
objetiva-comercios-admin/
├── apps/
│   ├── backend/             # NestJS API + Drizzle ORM
│   │   ├── src/
│   │   │   ├── auth/        # Modulo de autenticacion (controller, types)
│   │   │   ├── common/      # Guards (JWT), decoradores, DTOs base, filtros de excepcion
│   │   │   ├── db/          # DrizzleService, schema, seed, generators
│   │   │   └── modules/     # dashboard, products, orders, inventory, sales, purchases
│   │   └── drizzle/         # Migraciones SQL generadas
│   ├── web/                 # Next.js 14 App Router
│   │   └── src/
│   │       ├── app/         # Rutas: dashboard, articles, orders, inventory, sales, purchases, settings
│   │       ├── components/  # dashboard/, layout/, providers/, settings/, tables/, ui/ (shadcn)
│   │       └── lib/         # Supabase clients, API fetch, utilidades
│   └── mobile/              # Vite + React + Capacitor
│       └── src/
│           ├── components/  # auth/, layout/ (AppShell, BottomTabs, DrawerNav), ui/, OfflineBanner
│           ├── pages/       # Dashboard, Articles, Orders, Inventory, Sales, Purchases, Login, Signup, Profile, Settings
│           └── lib/         # Supabase client, API fetch
├── packages/
│   ├── types/               # Tipos compartidos: User, AppRole, ApiResponse, schemas Zod
│   ├── ui/                  # Design tokens (spacing, typography), utilidad cn()
│   └── utils/               # formatCurrency (MXN), formatDate (es-MX)
├── docker/
│   ├── web.Dockerfile       # Build multi-stage Next.js standalone
│   └── backend.Dockerfile   # Build multi-stage NestJS
├── docker-compose.yml       # Servicios erp-web + erp-backend
├── turbo.json               # Pipeline de build con cache
└── pnpm-workspace.yaml      # apps/* + packages/*
```

Flujo de autenticacion:

```
Usuario → [Web/Mobile] → Supabase Auth → JWT
                                           │
                                           ▼
                          [Backend] ← valida JWT via JWKS
                              │
                              ▼
                        PostgreSQL (datos de negocio)
```

## API / Endpoints

Todos los endpoints requieren JWT valido en header `Authorization: Bearer <token>`, excepto `/health`.

Los endpoints de escritura (POST, PATCH, DELETE) requieren rol `admin` en `app_metadata.role`.

### General

| Metodo | Ruta               | Descripcion                                |
| ------ | ------------------ | ------------------------------------------ |
| GET    | `/health`          | Health check (publico)                     |
| GET    | `/api/auth/verify` | Verifica token y retorna datos del usuario |

### Dashboard

| Metodo | Ruta             | Descripcion                                          |
| ------ | ---------------- | ---------------------------------------------------- |
| GET    | `/api/dashboard` | KPIs agregados: ventas, ordenes, inventario, compras |

### Productos

| Metodo | Ruta                       | Descripcion                                           |
| ------ | -------------------------- | ----------------------------------------------------- |
| GET    | `/api/products`            | Lista paginada con filtros (search, status, category) |
| GET    | `/api/products/categories` | Lista de categorias                                   |
| GET    | `/api/products/stats`      | Conteo por estado                                     |
| GET    | `/api/products/:id`        | Detalle de producto                                   |
| POST   | `/api/products`            | Crear producto (admin)                                |
| PATCH  | `/api/products/:id`        | Actualizar producto (admin)                           |
| DELETE | `/api/products/:id`        | Eliminar producto (admin)                             |

### Ordenes

| Metodo | Ruta                | Descripcion                |
| ------ | ------------------- | -------------------------- |
| GET    | `/api/orders`       | Lista paginada con filtros |
| GET    | `/api/orders/stats` | Conteo por estado          |
| GET    | `/api/orders/:id`   | Detalle con items          |
| POST   | `/api/orders`       | Crear orden (admin)        |
| PATCH  | `/api/orders/:id`   | Actualizar orden (admin)   |
| DELETE | `/api/orders/:id`   | Eliminar orden (admin)     |

### Inventario

| Metodo | Ruta                       | Descripcion                   |
| ------ | -------------------------- | ----------------------------- |
| GET    | `/api/inventory`           | Lista paginada con filtros    |
| GET    | `/api/inventory/stats`     | Conteo por estado             |
| GET    | `/api/inventory/low-stock` | Items con stock bajo          |
| GET    | `/api/inventory/:id`       | Detalle de item               |
| PATCH  | `/api/inventory/:id`       | Actualizar inventario (admin) |

### Ventas

| Metodo | Ruta               | Descripcion                |
| ------ | ------------------ | -------------------------- |
| GET    | `/api/sales`       | Lista paginada con filtros |
| GET    | `/api/sales/stats` | Conteo por estado          |
| GET    | `/api/sales/:id`   | Detalle con items          |
| POST   | `/api/sales`       | Registrar venta (admin)    |
| PATCH  | `/api/sales/:id`   | Actualizar venta (admin)   |
| DELETE | `/api/sales/:id`   | Eliminar venta (admin)     |

### Compras

| Metodo | Ruta                   | Descripcion                |
| ------ | ---------------------- | -------------------------- |
| GET    | `/api/purchases`       | Lista paginada con filtros |
| GET    | `/api/purchases/stats` | Conteo por estado          |
| GET    | `/api/purchases/:id`   | Detalle con items          |
| POST   | `/api/purchases`       | Registrar compra (admin)   |
| PATCH  | `/api/purchases/:id`   | Actualizar compra (admin)  |
| DELETE | `/api/purchases/:id`   | Eliminar compra (admin)    |

## Scripts y automatizacion

### Base de datos (desde `apps/backend/`)

| Comando            | Descripcion                                                                            |
| ------------------ | -------------------------------------------------------------------------------------- |
| `pnpm db:generate` | Genera migraciones a partir del schema Drizzle                                         |
| `pnpm db:migrate`  | Aplica migraciones pendientes                                                          |
| `pnpm db:push`     | Empuja el schema directamente (sin migracion)                                          |
| `pnpm db:seed`     | Llena la base con datos de prueba (500 productos, 200 ordenes, 150 ventas, 50 compras) |
| `pnpm db:studio`   | Abre Drizzle Studio (editor visual de base de datos)                                   |

### Pre-commit (automatico)

Husky + lint-staged ejecutan ESLint y Prettier automaticamente en cada commit sobre los archivos modificados.

## Testing de autenticacion

### Test rapido (sin token)

```bash
./scripts/test-auth.sh
```

Verifica: health check, rechazo sin token, rechazo con token invalido.

### Test manual

```bash
# Health check (publico)
curl http://localhost:3001/health

# Endpoint protegido (espera 401)
curl http://localhost:3001/api/auth/verify

# Con token valido (espera 200)
curl -H "Authorization: Bearer TU_JWT_DE_SUPABASE" \
  http://localhost:3001/api/auth/verify
```

### Crear usuario admin en Supabase

1. Ir a Supabase Dashboard > Authentication > Users > Add user
2. Para asignar rol admin, ir a SQL Editor y ejecutar:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'tu@email.com';
```

Sin esta asignacion, el usuario tendra rol `viewer` por defecto (solo lectura).

## Troubleshooting

### "Cannot find module @objetiva/ui"

Ejecutar `pnpm build` antes de `pnpm dev` para compilar los paquetes compartidos.

### Errores de TypeScript en el IDE

1. Reiniciar el servidor de TypeScript: Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"
2. Recompilar paquetes: `pnpm build`

### Puerto en uso

```bash
lsof -i :3000   # Encontrar el proceso
kill -9 <PID>   # O cambiar el puerto en .env
```

### pnpm install falla

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Estado del proyecto

Milestone v1.0 completado. 13 fases ejecutadas, 42 planes completados (100%).

Ultimo avance: 2026-03-03 (limpieza de deuda tecnica).
