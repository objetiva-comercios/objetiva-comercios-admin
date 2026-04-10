# Objetiva Comercios Admin

Sistema de administracion para operaciones comerciales. Permite gestionar articulos (~30 campos con imagenes), existencias (stock multi-deposito), inventarios fisicos, ordenes, ventas y compras desde una app web y una app movil. Incluye API keys para integraciones externas y webhooks para notificaciones de eventos. Funciona como monorepo con un backend NestJS, una app web Next.js y una app movil Capacitor + React, compartiendo autenticacion via Supabase y datos de negocio en PostgreSQL con Drizzle ORM. Dirigido a duenos de comercios y personal interno de operaciones diarias.

## Tecnologias

| Categoria      | Tecnologia                                          |
| -------------- | --------------------------------------------------- |
| Monorepo       | pnpm 9, Turborepo 2                                 |
| Frontend Web   | Next.js 14 (App Router), React 18, Tailwind CSS 3.4 |
| Frontend Movil | Vite 5, React 18, Capacitor 8, React Router 7       |
| Backend        | NestJS 10, TypeScript 5.3                           |
| Base de datos  | PostgreSQL (Drizzle ORM 0.45)                       |
| Autenticacion  | Supabase Auth (JWT via JWKS), API Keys (SHA-256)    |
| Imagenes       | sharp 0.34 (WebP, thumbnails automaticos)           |
| Eventos        | @nestjs/event-emitter 3 (webhooks)                  |
| UI             | shadcn/ui, Radix UI, Lucide Icons, Recharts         |
| Tablas         | TanStack Table 8, TanStack Query 5 (movil)          |
| Formularios    | React Hook Form 7, Zod 4                            |
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
git clone https://github.com/objetiva-comercios/objetiva-comercios-admin.git
cd objetiva-comercios-admin
pnpm install
```

2. Compilar los paquetes compartidos (necesario antes de `dev`):

```bash
pnpm build
```

3. Configurar las variables de entorno (ver seccion siguiente).

4. Crear la base de datos PostgreSQL y cargar schema + datos de prueba:

```bash
createdb nombre_de_tu_base
cd apps/backend
pnpm db:push
pnpm db:seed
```

5. Iniciar todos los servicios en modo desarrollo:

```bash
pnpm dev
```

## Configuracion

El proyecto usa **dos bases de datos separadas**:

- **Supabase**: Exclusivamente para autenticacion (login, signup, JWT). No almacena datos de negocio.
- **PostgreSQL local** (Drizzle ORM): Todos los datos de negocio (articulos, existencias, inventarios, ordenes, ventas, compras, depositos, configuracion, api keys, webhooks).

El backend no se conecta a la base de Supabase. Solo valida los JWT que Supabase genera, usando el endpoint JWKS publico. Tambien acepta API keys como metodo alternativo de autenticacion (CompositeAuthGuard: JWT primero, fallback a Bearer token).

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

Los servicios `erp-web` y `erp-backend` se conectan a la red externa `sanchez_docker_network` y se rutean via Traefik. El backend carga variables desde `apps/backend/.env.production`.

## Arquitectura del proyecto

```
objetiva-comercios-admin/
├── apps/
│   ├── backend/                # NestJS API + Drizzle ORM
│   │   ├── src/
│   │   │   ├── auth/           # Modulo de autenticacion (controller, types)
│   │   │   ├── common/         # Guards (JWT, Roles, CompositeAuth), decoradores, DTOs, filtros
│   │   │   ├── db/             # DrizzleService, schema, seed, generators
│   │   │   └── modules/        # articulos (+ imagenes), depositos, existencias, inventarios,
│   │   │                       # dispositivos, dashboard, orders, sales, purchases, settings,
│   │   │                       # api-keys, webhooks
│   │   └── drizzle/            # Migraciones SQL generadas
│   ├── web/                    # Next.js 14 App Router
│   │   └── src/
│   │       ├── app/            # Rutas: dashboard, articulos (CRUD/existencias/inventarios),
│   │       │                   #   orders, sales, purchases, settings (depositos/dispositivos/
│   │       │                   #   api-keys/webhooks/articulos-config)
│   │       ├── components/     # articulos/, depositos/, existencias/, inventarios/,
│   │       │                   #   dispositivos/, dashboard/, layout/, settings/, tables/, ui/
│   │       ├── config/         # navigation.ts (sidebar config)
│   │       ├── lib/            # Supabase clients, API fetch (server + client), utilidades
│   │       └── types/          # Interfaces TypeScript por dominio
│   └── mobile/                 # Vite + React + Capacitor
│       └── src/
│           ├── components/     # auth/, layout/ (AppShell, BottomTabs, DrawerNav), ui/
│           ├── pages/          # Dashboard, Articulos, Pedidos, Ventas, Compras, Login, Settings
│           ├── lib/            # Supabase client, API fetch
│           └── types/          # Interfaces TypeScript
├── packages/
│   ├── types/                  # Tipos compartidos: AppRole, schemas Zod de auth
│   ├── ui/                     # Design tokens (spacing, typography), utilidad cn()
│   └── utils/                  # formatCurrency (MXN), formatDate (es-MX)
├── docker/
│   ├── web.Dockerfile          # Build multi-stage Next.js standalone
│   └── backend.Dockerfile      # Build multi-stage NestJS
├── uploads/                    # Imagenes de articulos (volumen Docker persistente)
├── docker-compose.yml          # Servicios erp-web + erp-backend con Traefik
├── install.sh                  # Instalador automatico para VPS
├── turbo.json                  # Pipeline de build con cache
└── pnpm-workspace.yaml         # apps/* + packages/*
```

Flujo de autenticacion:

```
Usuario → [Web/Mobile] → Supabase Auth → JWT
                                           │
                                           ▼
                          [Backend] ← valida JWT via JWKS
                              │         (o API Key via SHA-256)
                              ▼
                        PostgreSQL (datos de negocio)
                              │
                              ▼ (EventEmitter)
                        Webhooks → URLs externas (HMAC-SHA256)
```

## API / Endpoints

Todos los endpoints requieren JWT valido en header `Authorization: Bearer <token>` o API key como Bearer token, excepto `/health` y `GET /api/settings`.

Los endpoints de escritura (POST, PATCH, DELETE) requieren rol `admin` en `app_metadata.role`.

### General

| Metodo | Ruta               | Descripcion                                |
| ------ | ------------------ | ------------------------------------------ |
| GET    | `/health`          | Health check (publico)                     |
| GET    | `/api/auth/verify` | Verifica token y retorna datos del usuario |

### Dashboard

| Metodo | Ruta             | Descripcion                                                  |
| ------ | ---------------- | ------------------------------------------------------------ |
| GET    | `/api/dashboard` | KPIs: total articulos, activos, stock bajo, ventas recientes |

### Articulos

| Metodo | Ruta                                          | Descripcion                                             |
| ------ | --------------------------------------------- | ------------------------------------------------------- |
| GET    | `/api/articulos`                              | Lista paginada con busqueda multi-campo y sorting       |
| GET    | `/api/articulos/:codigo`                      | Detalle de articulo                                     |
| POST   | `/api/articulos`                              | Crear articulo (admin)                                  |
| PATCH  | `/api/articulos/:codigo`                      | Actualizar articulo (admin)                             |
| DELETE | `/api/articulos/:codigo`                      | Soft-delete (admin) — emite articulo.deleted            |
| PATCH  | `/api/articulos/:codigo/toggle`               | Toggle activo/inactivo (admin) — emite articulo.updated |
| POST   | `/api/articulos/:codigo/imagenes`             | Subir imagen a slot (admin, multipart)                  |
| DELETE | `/api/articulos/:codigo/imagenes/:tipo/:slot` | Eliminar imagen de slot (admin)                         |

### Depositos

| Metodo | Ruta                                    | Descripcion                    |
| ------ | --------------------------------------- | ------------------------------ |
| GET    | `/api/depositos`                        | Lista con resumen de stock     |
| POST   | `/api/depositos`                        | Crear deposito (admin)         |
| PATCH  | `/api/depositos/:id`                    | Actualizar deposito (admin)    |
| PATCH  | `/api/depositos/:id/toggle`             | Toggle activo/inactivo (admin) |
| GET    | `/api/depositos/:id/sectores`           | Sectores de un deposito        |
| POST   | `/api/depositos/:id/sectores`           | Crear sector (admin)           |
| PATCH  | `/api/depositos/:id/sectores/:sectorId` | Actualizar sector (admin)      |
| DELETE | `/api/depositos/:id/sectores/:sectorId` | Eliminar sector (admin)        |

### Existencias

| Metodo | Ruta                                           | Descripcion                                  |
| ------ | ---------------------------------------------- | -------------------------------------------- |
| GET    | `/api/existencias`                             | Stock por deposito (filtrable)               |
| GET    | `/api/existencias/matrix`                      | Vista matricial: articulos x depositos       |
| GET    | `/api/existencias/kpi`                         | KPIs: total con stock, stock bajo, sin stock |
| GET    | `/api/existencias/articulo/:articuloCodigo`    | Stock de un articulo en todos los depositos  |
| POST   | `/api/existencias`                             | Upsert de existencia (admin)                 |
| PATCH  | `/api/existencias/:articuloCodigo/:depositoId` | Actualizar cantidad/thresholds (admin)       |

### Inventarios

| Metodo | Ruta                                         | Descripcion                                       |
| ------ | -------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/inventarios`                           | Lista de eventos de conteo (filtrable por estado) |
| GET    | `/api/inventarios/:id`                       | Detalle de evento con total de articulos          |
| POST   | `/api/inventarios`                           | Crear evento de conteo (admin)                    |
| PATCH  | `/api/inventarios/:id`                       | Actualizar evento (admin)                         |
| PATCH  | `/api/inventarios/:id/estado`                | Transicion de estado (admin)                      |
| GET    | `/api/inventarios/:id/articulos`             | Articulos contados con discrepancias vs stock     |
| POST   | `/api/inventarios/:id/articulos`             | Agregar articulo al conteo (admin)                |
| PATCH  | `/api/inventarios/:id/articulos/:articuloId` | Actualizar cantidad contada (admin)               |
| DELETE | `/api/inventarios/:id/articulos/:articuloId` | Quitar articulo del conteo (admin)                |

### Dispositivos Moviles

| Metodo | Ruta                           | Descripcion                    |
| ------ | ------------------------------ | ------------------------------ |
| GET    | `/api/dispositivos`            | Lista de dispositivos          |
| POST   | `/api/dispositivos`            | Crear dispositivo (admin)      |
| PATCH  | `/api/dispositivos/:id`        | Actualizar dispositivo (admin) |
| PATCH  | `/api/dispositivos/:id/toggle` | Toggle activo/inactivo (admin) |

### Ordenes

| Metodo | Ruta                | Descripcion                |
| ------ | ------------------- | -------------------------- |
| GET    | `/api/orders`       | Lista paginada con filtros |
| GET    | `/api/orders/stats` | Conteo por estado          |
| GET    | `/api/orders/:id`   | Detalle con items          |
| POST   | `/api/orders`       | Crear orden (admin)        |
| PATCH  | `/api/orders/:id`   | Actualizar orden (admin)   |
| DELETE | `/api/orders/:id`   | Eliminar orden (admin)     |

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

### Configuracion del negocio

| Metodo | Ruta                       | Descripcion                                          |
| ------ | -------------------------- | ---------------------------------------------------- |
| GET    | `/api/settings`            | Obtener configuracion del negocio (publico)          |
| PATCH  | `/api/settings`            | Actualizar configuracion (admin)                     |
| POST   | `/api/settings/logo/:type` | Subir logo (type: `square` o `rectangular`, max 2MB) |
| DELETE | `/api/settings/logo/:type` | Eliminar logo (admin)                                |

### API Keys

| Metodo | Ruta                | Descripcion                                  |
| ------ | ------------------- | -------------------------------------------- |
| GET    | `/api/api-keys`     | Lista de API keys activas (admin, solo JWT)  |
| POST   | `/api/api-keys`     | Crear API key — retorna key completa una vez |
| DELETE | `/api/api-keys/:id` | Revocar API key (admin, solo JWT)            |

### Webhooks

| Metodo | Ruta                                       | Descripcion                       |
| ------ | ------------------------------------------ | --------------------------------- |
| GET    | `/api/webhooks`                            | Lista de suscripciones (admin)    |
| GET    | `/api/webhooks/:id`                        | Detalle de suscripcion (admin)    |
| POST   | `/api/webhooks`                            | Crear suscripcion (admin)         |
| PATCH  | `/api/webhooks/:id`                        | Actualizar suscripcion (admin)    |
| DELETE | `/api/webhooks/:id`                        | Revocar suscripcion (admin)       |
| POST   | `/api/webhooks/:id/ping`                   | Enviar test ping (admin)          |
| POST   | `/api/webhooks/:id/regenerate-secret`      | Regenerar secreto HMAC (admin)    |
| GET    | `/api/webhooks/:id/deliveries`             | Log de entregas (admin)           |
| POST   | `/api/webhooks/:id/deliveries/:did/resend` | Reenviar delivery fallido (admin) |

Eventos disponibles: `articulo.created`, `articulo.updated`, `articulo.deleted`. Los payloads se firman con HMAC-SHA256 (header `X-Signature`). Entregas con hasta 3 reintentos y backoff exponencial.

## Scripts y automatizacion

### Base de datos (desde `apps/backend/`)

| Comando            | Descripcion                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `pnpm db:generate` | Genera migraciones a partir del schema Drizzle                                                    |
| `pnpm db:migrate`  | Aplica migraciones pendientes                                                                     |
| `pnpm db:push`     | Empuja el schema directamente (sin migracion)                                                     |
| `pnpm db:seed`     | Llena la base con datos de prueba (300 articulos, 5 depositos, existencias, inventarios, ordenes) |
| `pnpm db:studio`   | Abre Drizzle Studio (editor visual de base de datos)                                              |

### Pre-commit (automatico)

Husky + lint-staged ejecutan ESLint y Prettier automaticamente en cada commit sobre los archivos modificados.

## Docker

Dos servicios dockerizados con multi-stage builds (Node.js 20 Alpine):

| Servicio      | Dockerfile                  | Puerto | Descripcion                                        |
| ------------- | --------------------------- | ------ | -------------------------------------------------- |
| `erp-web`     | `docker/web.Dockerfile`     | 3000   | Next.js standalone (3 stages: deps → build → run)  |
| `erp-backend` | `docker/backend.Dockerfile` | 3001   | NestJS production (3 stages: deps → build → prune) |

Volumenes: `./uploads:/app/uploads` — imagenes de articulos persistentes entre rebuilds.

Red: `sanchez_docker_network` (externa) — conecta con Traefik y otros servicios.

Traefik rutea `PathPrefix(/api)` y `/health` al backend (priority 10), todo lo demas al web (priority 1).

```bash
# Levantar
docker compose up -d --build

# Logs
docker compose logs -f

# Rebuild sin cache
docker compose build --no-cache && docker compose up -d
```

## Deploy

Instalacion automatica en VPS:

```bash
curl -sL https://raw.githubusercontent.com/objetiva-comercios/objetiva-comercios-admin/main/install.sh | bash
```

El script clona el repo, preserva `.env.production` y `uploads/` en reinstalaciones, construye las imagenes Docker y ejecuta health check. Requiere Docker, Traefik configurado en `sanchez_docker_network`, y PostgreSQL accesible.

Dominio: `erp.sanchezrepuestos.com.ar` (via Traefik, entrypoint `web`).

Ver [DEPLOY.md](DEPLOY.md) para documentacion completa (arquitectura, variables, troubleshooting).

## Testing de autenticacion

### Test rapido (sin token)

```bash
./scripts/test-auth.sh
```

Verifica: health check, rechazo sin token, rechazo con token invalido.

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

| Milestone | Fases | Planes | Estado  | Fecha      |
| --------- | ----- | ------ | ------- | ---------- |
| v1.0 MVP  | 13    | 42     | Shipped | 2026-03-04 |
| v1.1      | 5     | 18     | Shipped | 2026-03-10 |
| v1.2      | 10    | 18     | Shipped | 2026-03-13 |

Milestone v1.2 "Articulos CRUD + Imagenes + API Keys + Webhooks" completado — 78 planes totales ejecutados a traves de 28 fases. CRUD completo de articulos con imagenes, columnas configurables, API keys para integraciones externas, y webhooks con firma HMAC-SHA256. Incluye mejoras post-milestone: escala UI configurable, rediseno de imagenes en detalle, iconos de secciones, cards de KPIs de existencias, y sincronizacion con schema de produccion.

Ultimo avance: 2026-04-10.
