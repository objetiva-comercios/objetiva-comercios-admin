# Deploy — Objetiva Comercios Admin

## Instalacion rapida

```bash
curl -sL https://raw.githubusercontent.com/objetiva-comercios/objetiva-comercios-admin/main/install.sh | bash
```

O desde el VPS:

```bash
bash ~/proyectos/objetiva-comercios-admin/install.sh
```

## Requisitos

- **Docker** >= 24.0 con Docker Compose v2
- **Git**
- **Traefik** como reverse proxy (red `sanchez_docker_network`)
- **PostgreSQL** accesible desde la red Docker
- **Supabase** proyecto configurado (solo auth — JWT)

## Arquitectura

```
                    ┌─────────────┐
                    │   Traefik   │
                    │   (proxy)   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
    /api, /health               todo lo demas
              │                         │
     ┌────────▼────────┐      ┌────────▼────────┐
     │   erp-backend   │      │    erp-web       │
     │   NestJS:3001   │      │  Next.js:3000    │
     │                 │      │                  │
     │ - REST API      │      │ - App Router     │
     │ - Auth (JWT)    │      │ - shadcn/ui      │
     │ - Image upload  │      │ - SSR + CSR      │
     │ - Webhooks      │      │                  │
     └────────┬────────┘      └──────────────────┘
              │
     ┌────────▼────────┐      ┌──────────────────┐
     │   PostgreSQL    │      │    Supabase       │
     │  (datos negocio)│      │   (solo auth)     │
     └─────────────────┘      └──────────────────┘
```

**Flujo de red:**

- Traefik recibe todo el trafico en `erp.sanchezrepuestos.com.ar`
- Rutas `/api/*` y `/health` → `erp-backend:3001` (priority 10)
- Todo lo demas → `erp-web:3000` (priority 1)
- El web hace llamadas SSR al backend via `http://erp-backend:3001` (red Docker interna)
- El browser hace llamadas al backend via `http://erp.sanchezrepuestos.com.ar/api/...` (Traefik)

## Variables de entorno

### Backend (`apps/backend/.env.production`)

| Variable              | Descripcion                  | Ejemplo                                               | Requerida |
| --------------------- | ---------------------------- | ----------------------------------------------------- | --------- |
| `DATABASE_URL`        | Connection string PostgreSQL | `postgresql://user:pass@host:5432/objetiva_comercios` | Si        |
| `SUPABASE_PROJECT_ID` | ID del proyecto Supabase     | `tvgvrumddnkhgwfxeuif`                                | Si        |
| `PORT`                | Puerto del servidor          | `3001`                                                | Si        |
| `NODE_ENV`            | Entorno de ejecucion         | `production`                                          | Si        |

### Web (`apps/web/.env.production`)

| Variable                        | Descripcion                          | Ejemplo                              | Requerida |
| ------------------------------- | ------------------------------------ | ------------------------------------ | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL publica del proyecto Supabase    | `https://xxx.supabase.co`            | Si        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase                 | `eyJ...`                             | Si        |
| `NEXT_PUBLIC_API_URL`           | URL publica de la API (para browser) | `http://erp.sanchezrepuestos.com.ar` | Si        |
| `API_URL`                       | URL interna de la API (para SSR)     | `http://erp-backend:3001`            | Si        |

> **Nota:** `NEXT_PUBLIC_*` se bake-an en el build de Next.js. Si cambias estas variables, necesitas rebuild.

## Servicios

| Servicio     | Container     | Puerto interno | Descripcion                                     |
| ------------ | ------------- | -------------- | ----------------------------------------------- |
| Web frontend | `erp-web`     | 3000           | Next.js 14 App Router, shadcn/ui, SSR           |
| Backend API  | `erp-backend` | 3001           | NestJS, Drizzle ORM, JWT auth, image processing |

## Red y acceso

- **Red Docker:** `sanchez_docker_network` (external)
- **Dominio:** `erp.sanchezrepuestos.com.ar` (via Traefik)
- **Routers Traefik:**
  - `erp-backend` — `PathPrefix(/api)` o `PathPrefix(/health)`, priority 10
  - `erp-web` — catch-all, priority 1
- **Entrypoint:** `web` (HTTP — trafico va cifrado por Tailscale)

### Configurar acceso DNS

**Opcion A: Tailscale (recomendado)**

Agregar en `/etc/hosts` de tu maquina:

```
<IP-TAILSCALE>    erp.sanchezrepuestos.com.ar
```

Para obtener la IP Tailscale del VPS: `tailscale ip -4`

**Opcion B: DNS publico**

Crear registro A: `erp` → IP publica del VPS en el dominio `sanchezrepuestos.com.ar`

**Opcion C: Desarrollo local sin Traefik**

Agregar `ports:` al docker-compose.yml:

```yaml
erp-web:
  ports:
    - '3000:3000'

erp-backend:
  ports:
    - '3001:3001'
```

Y acceder a `http://localhost:3000` (web) y `http://localhost:3001/api` (backend).

## Volumenes

| Volumen                  | Container     | Descripcion                                                              |
| ------------------------ | ------------- | ------------------------------------------------------------------------ |
| `./uploads:/app/uploads` | `erp-backend` | Imagenes de articulos (etiqueta + producto). Persistente entre rebuilds. |

## Dockerfiles

Ambos Dockerfiles usan multi-stage build con Node.js 20 Alpine:

- **`docker/web.Dockerfile`** — 3 stages: deps → build (Turbo: types → utils → ui → web) → standalone runner
- **`docker/backend.Dockerfile`** — 3 stages: deps → build (Turbo: types → backend) → pruned production runner

## Comandos utiles

```bash
cd ~/proyectos/objetiva-comercios-admin

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio especifico
docker compose logs -f erp-backend
docker compose logs -f erp-web

# Reiniciar servicios
docker compose restart

# Detener servicios
docker compose down

# Rebuild y deploy
docker compose up -d --build

# Rebuild sin cache (fuerza reinstalar dependencias)
docker compose build --no-cache && docker compose up -d

# Health check manual
docker exec erp-backend wget -qO- http://localhost:3001/health

# Acceder al shell del backend
docker exec -it erp-backend sh

# Ver estado de contenedores
docker compose ps
```

## Base de datos

El backend usa Drizzle ORM contra PostgreSQL. Los comandos de DB se corren **dentro del container** o desde el host con `DATABASE_URL` configurado:

```bash
# Desde el host (necesita Node.js + pnpm):
cd apps/backend
pnpm db:push       # Push schema directo (desarrollo)
pnpm db:migrate    # Aplicar migraciones
pnpm db:seed       # Seed con datos faker
pnpm db:studio     # Editor visual de DB
```

> **Produccion:** Usar `db:migrate` (no `db:push`). El seed solo se corre la primera vez.

## Actualizacion

```bash
cd ~/proyectos/objetiva-comercios-admin

# Opcion A: Re-correr el instalador (recomendado)
bash install.sh

# Opcion B: Manual
git pull origin main
docker compose build --no-cache
docker compose up -d
```

El instalador preserva automaticamente:

- `apps/backend/.env.production`
- `apps/web/.env.production`
- `uploads/` (imagenes de articulos)

## Troubleshooting

### El backend no arranca

```bash
docker compose logs erp-backend
```

Causas comunes:

- `DATABASE_URL` incorrecta o PostgreSQL no accesible desde la red Docker
- `SUPABASE_PROJECT_ID` incorrecto — el backend no puede validar JWTs
- Puerto 3001 ocupado por otro servicio

### El frontend muestra errores de API

- Verificar que `NEXT_PUBLIC_API_URL` apunta al dominio correcto
- Verificar que Traefik rutea `/api/*` al backend (priority 10)
- Verificar que `API_URL=http://erp-backend:3001` esta configurado para SSR

### Las imagenes no cargan

- Verificar que el volumen `./uploads:/app/uploads` esta montado
- Verificar que las imagenes existen: `ls uploads/articulos/`
- Verificar que Traefik rutea `/api/uploads/*` al backend

### Traefik no rutea al servicio

```bash
# Verificar que los contenedores estan en la red correcta
docker network inspect sanchez_docker_network | grep erp

# Verificar labels de Traefik
docker inspect erp-backend | grep traefik
docker inspect erp-web | grep traefik
```

### Rebuild despues de cambiar variables NEXT*PUBLIC*\*

Las variables `NEXT_PUBLIC_*` se bake-an en el build de Next.js. Si las cambias:

```bash
docker compose build --no-cache erp-web
docker compose up -d erp-web
```

## Estructura relevante al deploy

```
objetiva-comercios-admin/
├── docker-compose.yml          # Servicios: erp-web + erp-backend
├── docker/
│   ├── web.Dockerfile          # Multi-stage Next.js standalone
│   └── backend.Dockerfile      # Multi-stage NestJS production
├── install.sh                  # Instalador automatico
├── uploads/                    # Imagenes de articulos (volumen persistente)
├── apps/
│   ├── backend/
│   │   ├── .env.production     # Variables de entorno backend
│   │   └── .env.example        # Template
│   └── web/
│       ├── .env.production     # Variables de entorno web (NEXT_PUBLIC_*)
│       └── .env.example        # Template
└── packages/
    ├── types/                  # Tipos compartidos
    ├── utils/                  # Utilidades compartidas
    └── ui/                     # Componentes UI compartidos
```
