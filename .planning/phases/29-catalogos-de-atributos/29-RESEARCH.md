# Phase 29: Catálogos de Atributos (Propiedades) — Research

**Researched:** 2026-04-30
**Domain:** ABM CRUD self-contained — 6 tablas Postgres `prop_*` + módulo NestJS `PropiedadesModule` parametrizado + página Next.js `/propiedades` con 6 tabs lazy + componente `PropiedadCreateDialog` standalone reusable.
**Confidence:** HIGH (todas las decisiones verificadas contra el codebase existente; un solo hallazgo cambia la dirección — ver §"Hallazgo crítico").

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema: shape de tablas y FK**

- **D-01**: Una tabla por propiedad, NO genérica polimórfica. 6 tablas independientes (`prop_marca`, `prop_color`, `prop_talle`, `prop_material`, `prop_presentacion`, `prop_objeto`).
- **D-02**: Identificador y FK por `id` (INT) + cache de nombre denormalizado vía trigger. **Phase 29 deja el trigger preparado pero NO lo conecta a `articulos` todavía** (queda como SQL en el migration, comentado o aplicado sin FK fuente).
- **D-03**: Schema mínimo por tabla: `(id SERIAL PK, nombre TEXT NOT NULL, abrev TEXT NOT NULL, activo BOOLEAN DEFAULT true, created_at TIMESTAMP, updated_at TIMESTAMP)`. **SIN slug.**
- **D-04**: Naming de tabla con prefijo `prop_`. Convivirá visualmente con `articulos.prop_aux_1..5` hasta su deprecación en Phase 31/37 — overlap aceptado.
- **D-05**: `nombre` UNIQUE case-insensitive vía `CREATE UNIQUE INDEX ... ON prop_marca (LOWER(nombre))`.
- **D-06**: `abrev` UNIQUE per tabla con CHECK `abrev ~ '^[A-Z0-9]{1,8}$'`. ASCII mayúsculas + dígitos, 1 a 8 chars. Cross-prop NO se valida.

**Set de propiedades**

- **D-07**: 6 tablas, NO 7. `calificador` queda como TEXT libre.
- **D-08**: Phase 30 (templates) distinguirá entre propiedades con catálogo (FK lookup → `abrev`) y propiedades text-libres como `calificador`. **Fuera del scope de Phase 29.**
- **D-09**: NO agregamos `prop_modelo`, `prop_medida`, `prop_aplicacion` ahora.
- **D-10**: `prop_aux_1..5` actuales en `articulos` quedan out of scope.

**Composición de SKU (decidido acá pero afecta Phase 30)**

- **D-11**: SKU separator = `-` (guión).
- **D-12**: `codigo` queda intacto en `articulos.codigo`. Composer aplica `stripSep(codigo)` SOLO al armar el SKU.
- **D-13**: Reabre decisión cerrada #4 del design-notes — pasa a "sin variantes: sku = stripSep(codigo)". **Out of scope de Phase 29 — solo se documenta.**
- **D-14**: Composer NO necesita slugificar valores de catálogo (`abrev` ya es ASCII por CHECK).

**UI**

- **D-15**: Una sola página `/propiedades` con 6 tabs lazy.
- **D-16**: Componente `PropiedadTable` genérico parametrizado por config.
- **D-17**: `PropiedadCreateDialog` reusable standalone — testeado en Phase 29, Phase 32 lo cabla al `ArticuloForm`.
- **D-18**: Soft-delete vía `activo=false`. Listado default filtra `activo=true`; toggle "Mostrar inactivos".

**Resolución SC#5**

- **D-19**: Diferir Success Criteria #5 a Phase 32. **Phase 29 entrega ABM completo + endpoints API + `PropiedadCreateDialog` standalone listo. NO cabla nada al `ArticuloForm`.** CAT-02 marca como "parcial" en Phase 29 y "completo" en Phase 32.

### Claude's Discretion

- Estructura de carpetas web/backend (qué módulo NestJS, qué shape de DTOs, naming exacto de archivos): research/planner deciden.
- Detalle de validación frontend (zod schema, mensajes de error): planner decide.
- UX micro: si los tabs van arriba, abajo, o como sidebar lateral; si el form de edit es Sheet o Dialog. **Resuelto en UI-SPEC.md (tabs horizontales arriba, edit en Dialog).**
- Auto-sugerencia de `abrev`: algoritmo exacto (primeras 3 vs 4 chars; qué hacer con palabras compuestas). **Recomendación cerrada en este research — ver §"Algoritmo abrev auto-suggest".**
- Si el migration de Phase 29 incluye un seed inicial. **Sugerencia: NO seed por defecto.**

### Deferred Ideas (OUT OF SCOPE)

- `prop_calificador` como tabla — D-07.
- `prop_modelo`, `prop_medida`, `prop_aplicacion` como tablas — D-09.
- Auditoría de uso real de `prop_aux_1..5` — capturar como quick-task antes de Phase 31.
- Rename `articulos.adjetivo → articulos.calificador` — Phase 30/31 o tech debt.
- **Cableado de `PropiedadCreateDialog` al `ArticuloForm`** — Phase 32 (D-19).
- **FK desde `articulos.*_id` a `prop_*.id` + trigger de cache de nombre conectado** — Phase 30/31.
- Bulk import (CSV/Excel) de valores de catálogo — futuro.
- Renombre de la fase en el roadmap ("Catálogos de Atributos" → "Propiedades de Artículos") — opcional, baja prioridad.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CAT-01** | Admin puede gestionar catálogos (marcas, colores, talles, materiales, presentaciones, objetos) con CRUD completo: nombre, abrev, estado activo. *Nota: el req original menciona "slug"; D-03 lo reemplaza por `abrev` y D-07 reduce a 6 tablas (sin calificador).* | §Standard Stack (Drizzle + NestJS) + §Architecture Patterns (módulo parametrizado) + §Code Examples (CRUD service genérico) |
| **CAT-02 (parcial)** | Componente `PropiedadCreateDialog` standalone listo para reuso. **NO se cabla al `ArticuloForm`** — diferido a Phase 32 por D-19. | §Architecture Patterns (Dialog + RHF + zod) + §Code Examples (PropiedadCreateDialog signature) |
| **CAT-03** | Sistema valida unicidad de `nombre` (case-insensitive vía `LOWER(nombre)`) y `abrev` por tabla, rechaza duplicados con error legible (ConflictException 409). | §Hallazgo crítico (Drizzle declarativo) + §Code Examples (manejo error 23505) + §Common Pitfalls (UNIQUE LOWER index) |
| **CAT-04** | Admin puede desactivar valores (soft-delete vía `activo=false`) sin perder datos históricos; toggle "Mostrar inactivos" para ver el set completo. | §Architecture Patterns (soft-delete pattern de `articulos`/`depositos`) + §Code Examples (toggle endpoint) |

**Coverage:** 4/4 requisitos con enfoque concreto. CAT-02 explícitamente parcial.
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directivas activas que el planner DEBE respetar:

| Constraint | Source | Aplicación en Phase 29 |
|------------|--------|------------------------|
| Idioma UI/docs: español (es-MX), moneda MXN, "vos" argentino aceptado en copy | `/CLAUDE.md` §Convenciones | Todos los mensajes de error, copy de toast, placeholders en es-MX (ya capturado en UI-SPEC). |
| Estética: shadcn/ui + Tabler overlay (rounded-md/sm, h-9/h-8, py-4, text-sm) | `/CLAUDE.md` §Convenciones + UI-SPEC | Reusar tokens existentes; consultar `shadcn-tabler-mcp` si se inicializa un componente nuevo. |
| Auth: Supabase JWT validado vía JWKS; RBAC con `app_metadata.role` (`admin` escribe, `viewer` lee) | `/CLAUDE.md` §Convenciones + `JwtAuthGuard` + `RolesGuard` | GET endpoints accesibles a `viewer`+`admin`; POST/PATCH/DELETE/toggle solo `admin`. Ver §"Patrón RBAC". |
| DB: PostgreSQL con Drizzle ORM (datos de negocio); Supabase NO almacena datos de negocio | `/CLAUDE.md` §Convenciones | Las 6 tablas `prop_*` viven en Postgres local, no en Supabase. |
| Commits: conventional commits en inglés | `/CLAUDE.md` §Convenciones | `docs(29): …`, `feat(propiedades): …`, `feat(prop): add prop_marca CRUD`. |
| Antes de modificar componentes UI base, consultar `shadcn-tabler-mcp` | `/CLAUDE.md` §MCP | Si el planner necesita tocar `tabs.tsx`, `dialog.tsx`, etc. — debe consultar primero. Phase 29 NO debería modificarlos (todos ya existen). |
| Antes de cambios DB en producción, NUNCA borrar tablas — confirmar con usuario | `MEMORY.md` §Feedback | El migration debe ser puramente aditivo. Las 6 tablas `prop_*` son nuevas. |
| Servicios dockerizados: usar `docker compose`, NUNCA `pnpm dev` directo | `MEMORY.md` §Feedback | El planner debe asumir testing/dev contra contenedores levantados. Web:3000, Backend:3001. |
| Verificación visual: usar `playwright-testing` skill (NO MCP), capturar screenshots | `MEMORY.md` §Feedback | Tests E2E del flujo `/propiedades` (Phase 29 success-criteria) usan playwright-testing skill. |

## Summary

Phase 29 es un trabajo **self-contained de baja-media complejidad técnica** y **alta prescripción**: TODAS las decisiones de schema, UI y boundary están cerradas en CONTEXT.md y UI-SPEC.md. La labor del planner es traducirlas a tareas concretas siguiendo patrones existentes en el repo — *no* tomar decisiones nuevas.

El **patrón canónico a copiar** ya existe en el repo: `DispositivosModule` (backend) + `DepositoDialog` + `DepositosList` (web). Estos cubren TODOS los casos a resolver en Phase 29 — hashing de UNIQUE violations a `ConflictException(23505)`, soft-delete con flag `activo`, toggle endpoint, RHF + zod en Dialog `sm:max-w-md`, fetch directo via `api.client.ts` (NO TanStack Query — el repo no lo usa todavía).

**Hallazgo crítico que altera la prescripción inicial del STACK.md milestone**: Drizzle ORM v0.45 SÍ soporta `check()` constraints declarativos en el tercer argumento de `pgTable()` (verificado en docs oficiales — `/drizzle-team/drizzle-orm-docs#indexes-constraints`). Esto significa que **NO necesitamos `drizzle-kit generate --custom` para los CHECK ni para los UNIQUE INDEX `LOWER(nombre)`** — ambos se declaran en `schema.ts` y Drizzle los emite en el migration generado automáticamente. La única migración custom que sigue siendo necesaria es la del **trigger SQL preparado de cache de nombre** (D-02), que sí requiere `--custom` o un archivo SQL adjunto.

**Primary recommendation:** Replicar el patrón del módulo `Dispositivos` (con `unique` violation handling, `toggleActive` endpoint, DTOs class-validator). Para web, replicar el patrón `DepositosList` + `DepositoDialog` (fetch directo, useState local, Toast feedback). Una sola estructura genérica parametrizada por `propTipo` cubre las 6 tablas con configuración mínima por cada una.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persistencia de las 6 tablas `prop_*` con CHECK + UNIQUE LOWER | Database / Storage | — | Constraints estructurales (UNIQUE, CHECK regex) son responsabilidad de Postgres. Drizzle es el cliente declarativo, pero la integridad referencial vive en el motor. |
| Trigger preparado para cache de nombre (sin conectar a articulos) | Database / Storage | — | Función PL/pgSQL definida en SQL custom; AFTER INSERT/UPDATE en `prop_marca` etc. NO se dispara en Phase 29 porque no hay FK fuente. |
| Validación de UNIQUE violation → 409 ConflictException con mensaje legible | API / Backend | Database | Postgres lanza error code `23505`; NestJS service traduce a `ConflictException` con mensaje específico (UNIQUE LOWER vs UNIQUE abrev). |
| Validación de formato `abrev` (regex `[A-Z0-9]{1,8}`) | API / Backend | Database | DTO con class-validator (`@Matches(/^[A-Z0-9]{1,8}$/)`) provee feedback inmediato; CHECK constraint en DB es backstop. **Doble enforcement por defensa en profundidad.** |
| RBAC: admin escribe, viewer lee | API / Backend | — | `JwtAuthGuard` global + `RolesGuard` con `@Roles('admin')` en POST/PATCH/DELETE. Patrón ya en `DepositosController`. |
| Página `/propiedades` con 6 tabs lazy + state activeTab | Frontend Server (SSR) | Browser / Client | Page server-component delgado que monta un Client Component (`PropiedadesPage`) con `useState<TabKey>` y `<Tabs>` de Radix. Cada `<TabsContent>` monta su `PropiedadTable` solo cuando se selecciona. |
| `PropiedadTable` genérica (data fetch + paginación cliente + filtros) | Browser / Client | API / Backend | Client Component; fetch directo via `api.client.ts` con `useEffect` + `useState` (NO TanStack Query — patrón actual del repo). Paginación cliente (~6 tablas, esperado <500 filas/u en realidad humana). |
| `PropiedadCreateDialog` standalone reusable | Browser / Client | API / Backend | Client Component con RHF + zod. Phase 32 lo importa con prop `onCreated` callback. |
| Auto-suggest de abrev (NFD + strip diacritics + uppercase) | Browser / Client | — | Función pura en `apps/web/src/lib/abrev.ts`, ejecutada `onChange` del input nombre con debounce 150ms. Lógica disponible también en backend (no necesaria en Phase 29 pero útil para Phase 32 fallback). |
| Sidebar entry "Propiedades" | Browser / Client | — | Edit `apps/web/src/config/navigation.ts` agregando route con icon Lucide `Tags`, posicionado después de "Artículos". |

---

## Standard Stack

### Core (ya instalado — verificado en package.json al 2026-04-30)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | `^0.45.1` (latest 0.45.2) `[VERIFIED: npm view]` | ORM Postgres + emisión declarativa de UNIQUE INDEX functional + CHECK constraints | Ya es el ORM del proyecto. v0.45 soporta `check()` y `uniqueIndex().on(sql\`lower(...)\`)` nativamente — NO requiere SQL custom para CAT-03/CAT-04. `[CITED: drizzle-team/drizzle-orm-docs/indexes-constraints.mdx]` |
| `drizzle-kit` | `^0.31.10` `[VERIFIED: npm view]` | Generación de migrations desde schema.ts; `--custom` solo para SQL puro (trigger preparado de D-02) | Ya en uso. `--custom` documentado: `drizzle-kit generate --custom --name=trigger-cache-nombre-prop`. `[CITED: drizzle-team/drizzle-orm-docs/drizzle-kit-generate.mdx]` |
| `@nestjs/common` | `^10.0.0` | Framework backend con DI, guards, ValidationPipe global | Ya en uso. ValidationPipe con `whitelist:true, transform:true, forbidNonWhitelisted:true` está activo (`apps/backend/src/main.ts`). |
| `class-validator` | `^0.14.3` | Decoradores de validación en DTOs (`@IsString`, `@Matches`, `@MaxLength`) | Ya en uso. Patrón en `CreateDepositoDto`. Para `abrev`: `@Matches(/^[A-Z0-9]{1,8}$/, { message: 'La abreviación debe tener 1 a 8 caracteres en mayúsculas o dígitos' })`. |
| `class-transformer` | `^0.5.1` | Auto-transform query params/body a tipos DTO | Ya configurado vía `ValidationPipe({ transform: true })`. |
| `react-hook-form` | `^7.71.1` | Manejo de formularios reactivos en `PropiedadCreateDialog`/`PropiedadEditDialog` | Ya en uso. Patrón en `DepositoDialog`. |
| `@hookform/resolvers` | `^5.2.2` | Bridge zod ↔ RHF (`zodResolver`) | Ya en uso. |
| `zod` | `^4.3.6` | Schema de validación cliente | Ya en uso. |
| `@radix-ui/react-tabs` | `^1.1.13` `[VERIFIED: npm view]` | Tabs primitives (lazy mount automático con `forceMount={undefined}`) | Ya instalado (`apps/web/package.json`). El componente `apps/web/src/components/ui/tabs.tsx` ya lo expone. |
| `@radix-ui/react-dialog` | `^1.1.15` | Dialog primitives para `PropiedadCreateDialog`/`EditDialog` | Ya instalado. |
| `@radix-ui/react-alert-dialog` | `^1.1.15` | AlertDialog para confirmación de soft-delete | Ya instalado. |
| `@radix-ui/react-switch` | `^1.2.6` | Toggle "Mostrar inactivos" | Ya instalado. |
| `@radix-ui/react-tooltip` | `^1.2.8` | Tooltip en abrev truncadas | Ya instalado. |
| `@tanstack/react-table` | `^8.21.3` | (Opcional) si la `PropiedadTable` se monta sobre TanStack en vez de `<Table>` directo | Ya instalado. **Recomendación**: tabla simple `<Table>` directo (estilo `DepositosList`) — no necesitamos sorting server-side ni grouping. Mantener consistencia con `depositos`. |
| `lucide-react` | `^0.563.0` | Iconos (`Tags`, `Plus`, `Pencil`, `MoreHorizontal`, `ToggleLeft/Right`, `Loader2`) | Ya en uso. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `slugify` | `^1.6.9` `[VERIFIED: npm view]` | (NO en Phase 29) Phase 30 lo usa para slugs de propiedades text-libres | **NO instalar en Phase 29**. CONTEXT D-14: composer NO necesita slugify para valores de catálogo. STACK.md ya tenía esto reservado para Phase 30. |
| `@nestjs/event-emitter` | `^3.0.1` | Webhooks de propiedades (no requeridos por Phase 29 SC) | **NO emitir eventos en Phase 29** — los webhooks actuales son para `articulo.*`. Si se requiere en futuro, replicar pattern de `articulos.service.ts` línea 105. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| UNIQUE INDEX `LOWER(nombre)` | Postgres `CITEXT` extension | `CITEXT` requiere `CREATE EXTENSION` (privilegio admin DB), cambia el tipo de columna y rompe el patrón TS↔DB del repo. UNIQUE LOWER es self-contained, declarativo en Drizzle, y aplica solo donde lo querés. **Decisión: UNIQUE LOWER.** |
| Endpoint con `:tabla` en URL parametrizado (1 controller, 1 service genérico) | 6 controllers separados con boilerplate mínimo | El parametrizado evita 6 archivos copia-pega pero pierde tipado fuerte por endpoint y dificulta validación específica per-tabla en futuro. **Decisión: 1 controller + 1 service parametrizados** — alineado con D-16 ("componente genérico parametrizado") y mantiene boilerplate al mínimo. Ver §"Architecture Patterns: Backend genérico parametrizado". |
| TanStack Query para CRUD client-side | Fetch directo + useState (patrón actual del repo) | TanStack Query no está instalado en `apps/web` (verificado: `grep useQuery apps/web/src` retorna 0 resultados). Introducirlo en Phase 29 sería scope creep — el patrón existente (`DepositosList`) cubre toda la funcionalidad. **Decisión: fetch directo, igual que depositos.** |
| Server Actions de Next 14 | Fetch a backend NestJS | El backend NestJS expone TODOS los endpoints; Server Actions duplicarían lógica. **Decisión: el patrón establecido fetcher → NestJS API queda.** |
| ServerDataTable para `PropiedadTable` | Tabla simple `<Table>` con paginación cliente | `ServerDataTable` está pensado para volúmenes grandes con sorting/filter server-side. Las 6 propiedades tendrán <500 filas reales (marcas, colores, talles, etc.) — over-engineering. **Decisión: `<Table>` simple estilo `DepositosList`.** Si en futuro alguna explota (bulk import), promover a ServerDataTable sin tocar el shape del componente. |

**Installation:**

No hay paquetes nuevos a instalar en Phase 29. **Todo el stack ya está disponible.**

```bash
# Verificación opcional (debería retornar todas las versiones del package.json)
pnpm --filter @objetiva/backend list drizzle-orm class-validator
pnpm --filter @objetiva/web list react-hook-form zod @radix-ui/react-tabs
```

**Version verification (2026-04-30):**
```bash
npm view drizzle-orm version       # 0.45.2  (latest patch — actual locked 0.45.1)
npm view drizzle-kit version       # 0.31.10
npm view @radix-ui/react-tabs version  # 1.1.13
npm view slugify version           # 1.6.9   (no usar en Phase 29)
```

Todas las versiones lockeadas en package.json son compatibles. **Sin upgrade necesario.**

---

## Architecture Patterns

### System Architecture Diagram

```
                                ┌─────────────────────────────────┐
   Browser (Client)             │  /propiedades  page             │
                                │  ─────────────────────────────  │
                                │  Sidebar: "Propiedades" link    │
                                │  Page header: title + subtitle  │
                                │  <Tabs value={activeTab}>       │
                                │    ├── Marcas       ──┐         │
                                │    ├── Colores        │ lazy    │
                                │    ├── Talles         │ mount   │
                                │    ├── Materiales     │ via     │
                                │    ├── Presentaciones │ active  │
                                │    └── Objetos      ──┘ tab     │
                                │                                  │
                                │  ┌── PropiedadTable<T> ────┐    │
                                │  │ Toolbar:               │    │
                                │  │  [+ Nueva propiedad]   │    │
                                │  │  [Switch inactivos]    │    │
                                │  │ <Table> id|nombre|     │    │
                                │  │   abrev|estado|⋮       │    │
                                │  │ Pagination cliente     │    │
                                │  └────────────────────────┘    │
                                │  ┌── PropiedadCreateDialog ─┐  │
                                │  │ RHF + zod                │  │
                                │  │ nombre + abrev (auto)    │  │
                                │  └──────────────────────────┘  │
                                │  ┌── PropiedadEditDialog ──┐   │
                                │  │ misma forma             │   │
                                │  └─────────────────────────┘   │
                                │  ┌── AlertDialog deactivate┐   │
                                │  └─────────────────────────┘   │
                                └──────────────┬──────────────────┘
                                               │ fetch via api.client.ts
                                               │ (Bearer JWT desde Supabase)
                                               ▼
   API / Backend                ┌─────────────────────────────────┐
   (NestJS, port 3001)          │ Global guards:                  │
                                │  CompositeAuthGuard (JWT or API)│
                                │  RolesGuard (per @Roles)        │
                                │                                  │
                                │  PropiedadesController          │
                                │   GET    /api/propiedades/:tipo │
                                │   GET    /api/propiedades/:tipo/:id│
                                │   POST   /api/propiedades/:tipo │  @Roles('admin')
                                │   PATCH  /api/propiedades/:tipo/:id│  @Roles('admin')
                                │   PATCH  /api/propiedades/:tipo/:id/toggle│  @Roles('admin')
                                │            ▼                     │
                                │  PropiedadesService (genérico)  │
                                │   tableForTipo(tipo) → drizzle table│
                                │   findAll, findOne, create,      │
                                │   update, toggleActive           │
                                │   try/catch error.code='23505'   │
                                │      → ConflictException 409     │
                                │      mensaje según constraint    │
                                └──────────────┬──────────────────┘
                                               │ Drizzle ORM
                                               ▼
   Database / Storage           ┌─────────────────────────────────┐
   (PostgreSQL 16 local)        │  prop_marca,  prop_color,       │
                                │  prop_talle,  prop_material,    │
                                │  prop_presentacion, prop_objeto │
                                │  ─────────────────────────────  │
                                │  cada tabla:                    │
                                │   id SERIAL PK                  │
                                │   nombre TEXT NOT NULL          │
                                │   abrev TEXT NOT NULL           │
                                │   activo BOOLEAN DEFAULT true   │
                                │   created_at, updated_at        │
                                │  Constraints:                   │
                                │   UNIQUE INDEX LOWER(nombre)    │
                                │   UNIQUE (abrev)                │
                                │   CHECK abrev ~ '^[A-Z0-9]{1,8}$'│
                                │                                  │
                                │  cache_nombre_<prop>() function │
                                │  + AFTER INSERT/UPDATE trigger  │
                                │   (declarado en SQL custom,     │
                                │    NO se dispara — sin FK)      │
                                └─────────────────────────────────┘
```

### Recommended Project Structure

```
apps/backend/src/
├── modules/
│   └── propiedades/                      ← NUEVO (Phase 29)
│       ├── propiedades.controller.ts     # 1 controller, 5 endpoints, :tipo en URL
│       ├── propiedades.service.ts        # genérico parametrizado por tipo
│       ├── propiedades.module.ts         # registrado en AppModule
│       ├── propiedades.constants.ts      # PROP_TABLES map: 'marca' → propMarca, etc.
│       └── dto/
│           ├── create-propiedad.dto.ts   # nombre + abrev con @Matches
│           ├── update-propiedad.dto.ts   # PartialType
│           └── propiedad-tipo.param.ts   # ParseEnumPipe / @IsIn validator
├── db/
│   └── schema.ts                         # MODIFICADO — agregar 6 tablas + relations + types
└── drizzle/
    ├── 0004_phase_29_propiedades.sql     # GENERATED — Drizzle emit las 6 CREATE TABLE + UNIQUE LOWER + CHECK
    └── 0005_phase_29_cache_trigger.sql   # CUSTOM — funciones cache_nombre_<prop>() + triggers (sin disparar)

apps/web/src/
├── app/(dashboard)/propiedades/          ← NUEVO (Phase 29)
│   └── page.tsx                          # Server Component delgado que renderiza <PropiedadesPage />
├── components/propiedades/               ← NUEVO
│   ├── propiedades-page.tsx              # Client component con <Tabs> y activeTab state
│   ├── propiedad-table.tsx               # Genérico <PropiedadTable propTipo="marca" />
│   ├── propiedad-create-dialog.tsx       # Standalone reusable (export para Phase 32)
│   ├── propiedad-edit-dialog.tsx         # Reusa schema y form layout
│   ├── propiedad-deactivate-dialog.tsx   # AlertDialog
│   └── propiedad-config.ts               # PROP_CONFIG: { marca: { singular, plural, placeholder } }
├── lib/
│   ├── api.client.ts                     # MODIFICADO — agregar fetchPropiedades, createPropiedad, etc.
│   └── abrev.ts                          ← NUEVO — función pura `suggestAbrev(nombre)`
├── types/
│   └── propiedad.ts                      ← NUEVO — interface Propiedad + tipo PropTipo
└── config/
    └── navigation.ts                     # MODIFICADO — entry "Propiedades" con icon Tags

packages/types/src/                       # NO MODIFICAR — los tipos de propiedad viven en apps/web/src/types/propiedad.ts (mirror si mobile lo necesita en futuro)
```

### Pattern 1: Schema declarativo Drizzle con UNIQUE LOWER + CHECK

**What:** Declarar las 6 tablas en `schema.ts` usando el tercer argumento de `pgTable()` con `uniqueIndex().on(sql\`LOWER(${table.nombre})\`)` y `check()`. Drizzle emite el SQL correcto al generar el migration. **NO requiere `--custom`.**

**When to use:** Cualquier tabla nueva en este proyecto que necesite UNIQUE case-insensitive o CHECK regex.

**Example:**

```typescript
// apps/backend/src/db/schema.ts (agregado al final del archivo)
// Source: drizzle-team/drizzle-orm-docs/indexes-constraints.mdx + guides/unique-case-insensitive-email.mdx
import {
  pgTable, serial, text, boolean, timestamp,
  uniqueIndex, index, check,
} from 'drizzle-orm/pg-core'
import { sql, type AnyPgColumn } from 'drizzle-orm'

// Helper local — funciones SQL reusables
function lower(col: AnyPgColumn) {
  return sql`lower(${col})`
}

const ABREV_REGEX_SQL = sql`abrev ~ '^[A-Z0-9]{1,8}$'`

// Factory que produce la definición de una tabla prop_*
function definePropTable(tableName: string, indexPrefix: string) {
  return pgTable(
    tableName,
    {
      id: serial('id').primaryKey(),
      nombre: text('nombre').notNull(),
      abrev: text('abrev').notNull(),
      activo: boolean('activo').notNull().default(true),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (table) => [
      uniqueIndex(`${indexPrefix}_nombre_lower_uniq`).on(lower(table.nombre)),
      uniqueIndex(`${indexPrefix}_abrev_uniq`).on(table.abrev),
      check(`${indexPrefix}_abrev_format_chk`, ABREV_REGEX_SQL),
      index(`${indexPrefix}_activo_idx`).on(table.activo),
    ]
  )
}

export const propMarca         = definePropTable('prop_marca',         'prop_marca')
export const propColor         = definePropTable('prop_color',         'prop_color')
export const propTalle         = definePropTable('prop_talle',         'prop_talle')
export const propMaterial      = definePropTable('prop_material',      'prop_material')
export const propPresentacion  = definePropTable('prop_presentacion',  'prop_presentacion')
export const propObjeto        = definePropTable('prop_objeto',        'prop_objeto')

export type PropMarca = typeof propMarca.$inferSelect
export type NewPropMarca = typeof propMarca.$inferInsert
// ... mismo patrón para los otros 5
```

**Migration generado por `pnpm db:generate`** (verificar antes de aplicar):

```sql
-- drizzle/0004_phase_29_propiedades.sql (resumen — Drizzle emit el equivalente para las 6 tablas)
CREATE TABLE "prop_marca" (
  "id" serial PRIMARY KEY NOT NULL,
  "nombre" text NOT NULL,
  "abrev" text NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "prop_marca_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "prop_marca_nombre_lower_uniq" ON "prop_marca" USING btree (lower("nombre"));
CREATE UNIQUE INDEX "prop_marca_abrev_uniq" ON "prop_marca" USING btree ("abrev");
CREATE INDEX "prop_marca_activo_idx" ON "prop_marca" USING btree ("activo");
-- repetido para prop_color, prop_talle, prop_material, prop_presentacion, prop_objeto
```

**Verificación obligatoria post-`db:generate`:** `cat drizzle/000X_*.sql` y confirmar que (a) las 6 tablas están, (b) los `lower()` están sin escapar, (c) el regex `^[A-Z0-9]{1,8}$` está literal. Si no, ajustar el helper `lower()` o el `check()`.

### Pattern 2: Backend genérico parametrizado por tipo (1 controller, 1 service)

**What:** Un solo controller con `:tipo` en URL, un solo service que recibe el `tipo` y resuelve la tabla via lookup. Mensajes de error específicos per-constraint vía detección de `error.code === '23505'` + parseo del `constraint_name`.

**When to use:** 6 endpoints CRUD idénticos en estructura. Alineado con D-16 ("componente genérico").

**Example:**

```typescript
// apps/backend/src/modules/propiedades/propiedades.constants.ts
import {
  propMarca, propColor, propTalle, propMaterial,
  propPresentacion, propObjeto,
} from '../../db/schema'

export const PROP_TIPOS = ['marca', 'color', 'talle', 'material', 'presentacion', 'objeto'] as const
export type PropTipo = typeof PROP_TIPOS[number]

export const PROP_TABLES = {
  marca: propMarca,
  color: propColor,
  talle: propTalle,
  material: propMaterial,
  presentacion: propPresentacion,
  objeto: propObjeto,
} as const

// Mapeo singular usado en mensajes de error
export const PROP_LABELS: Record<PropTipo, { singular: string; plural: string }> = {
  marca:         { singular: 'marca',         plural: 'marcas' },
  color:         { singular: 'color',         plural: 'colores' },
  talle:         { singular: 'talle',         plural: 'talles' },
  material:      { singular: 'material',      plural: 'materiales' },
  presentacion:  { singular: 'presentación',  plural: 'presentaciones' },
  objeto:        { singular: 'objeto',        plural: 'objetos' },
}
```

```typescript
// apps/backend/src/modules/propiedades/propiedades.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq, asc } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { PROP_TABLES, PROP_LABELS, PropTipo } from './propiedades.constants'
import { CreatePropiedadDto } from './dto/create-propiedad.dto'
import { UpdatePropiedadDto } from './dto/update-propiedad.dto'

@Injectable()
export class PropiedadesService {
  constructor(private readonly drizzle: DrizzleService) {}

  private tableFor(tipo: PropTipo) {
    const table = PROP_TABLES[tipo]
    if (!table) throw new BadRequestException(`Tipo de propiedad inválido: ${tipo}`)
    return table
  }

  async findAll(tipo: PropTipo, opts: { activo?: boolean }) {
    const table = this.tableFor(tipo)
    const conditions = []
    if (opts.activo !== undefined) conditions.push(eq(table.activo, opts.activo))
    return this.drizzle.db.select().from(table)
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(asc(table.nombre))
  }

  async findOne(tipo: PropTipo, id: number) {
    const table = this.tableFor(tipo)
    const rows = await this.drizzle.db.select().from(table).where(eq(table.id, id))
    return rows[0] ?? null
  }

  async create(tipo: PropTipo, dto: CreatePropiedadDto) {
    const table = this.tableFor(tipo)
    try {
      const rows = await this.drizzle.db.insert(table)
        .values({ nombre: dto.nombre, abrev: dto.abrev })
        .returning()
      return rows[0]
    } catch (error: unknown) {
      this.handleUniqueViolation(error, tipo, dto)
      throw error
    }
  }

  async update(tipo: PropTipo, id: number, dto: UpdatePropiedadDto) {
    const table = this.tableFor(tipo)
    try {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.nombre !== undefined) updateData.nombre = dto.nombre
      if (dto.abrev !== undefined) updateData.abrev = dto.abrev

      const rows = await this.drizzle.db.update(table)
        .set(updateData).where(eq(table.id, id)).returning()

      if (!rows[0]) {
        const label = PROP_LABELS[tipo].singular
        throw new NotFoundException(`${label} con ID ${id} no encontrado`)
      }
      return rows[0]
    } catch (error: unknown) {
      this.handleUniqueViolation(error, tipo, dto)
      throw error
    }
  }

  async toggleActive(tipo: PropTipo, id: number) {
    const table = this.tableFor(tipo)
    const existing = await this.findOne(tipo, id)
    if (!existing) {
      const label = PROP_LABELS[tipo].singular
      throw new NotFoundException(`${label} con ID ${id} no encontrado`)
    }
    const rows = await this.drizzle.db.update(table)
      .set({ activo: !existing.activo, updatedAt: new Date() })
      .where(eq(table.id, id)).returning()
    return rows[0]
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private handleUniqueViolation(
    error: unknown,
    tipo: PropTipo,
    dto: { nombre?: string; abrev?: string }
  ) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      (error as Record<string, unknown>).code !== '23505'
    ) return

    const detail = String((error as Record<string, unknown>).detail ?? '')
    const constraint = String((error as Record<string, unknown>).constraint_name ?? '')
    const label = PROP_LABELS[tipo].plural

    // Distinguir UNIQUE LOWER(nombre) vs UNIQUE(abrev) por nombre del constraint
    if (constraint.includes('nombre_lower_uniq') || detail.toLowerCase().includes('lower')) {
      throw new ConflictException(`Ya existe una ${PROP_LABELS[tipo].singular} con el nombre "${dto.nombre}"`)
    }
    if (constraint.includes('abrev_uniq') || detail.includes('abrev')) {
      throw new ConflictException(`La abreviación "${dto.abrev}" ya existe en ${label}`)
    }
    // Fallback genérico
    throw new ConflictException(`Conflicto de unicidad en ${label}`)
  }
}
```

```typescript
// apps/backend/src/modules/propiedades/propiedades.controller.ts
import {
  Controller, Get, Post, Patch, Param, Query, Body,
  ParseIntPipe, UseGuards, NotFoundException, ParseBoolPipe,
} from '@nestjs/common'
import { PropiedadesService } from './propiedades.service'
import { CreatePropiedadDto } from './dto/create-propiedad.dto'
import { UpdatePropiedadDto } from './dto/update-propiedad.dto'
import { PROP_TIPOS, PropTipo } from './propiedades.constants'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('propiedades')
export class PropiedadesController {
  constructor(private readonly service: PropiedadesService) {}

  @Get(':tipo')
  findAll(
    @Param('tipo') tipo: string,
    @Query('activo') activo?: string,
  ) {
    this.assertValidTipo(tipo)
    const activoBool = activo === undefined ? true : activo === 'true' ? true : activo === 'false' ? false : undefined
    return this.service.findAll(tipo as PropTipo, { activo: activoBool })
  }

  @Get(':tipo/:id')
  async findOne(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    this.assertValidTipo(tipo)
    const row = await this.service.findOne(tipo as PropTipo, id)
    if (!row) throw new NotFoundException(`Propiedad con ID ${id} no encontrada en ${tipo}`)
    return row
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':tipo')
  create(@Param('tipo') tipo: string, @Body() dto: CreatePropiedadDto) {
    this.assertValidTipo(tipo)
    return this.service.create(tipo as PropTipo, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':tipo/:id')
  update(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePropiedadDto,
  ) {
    this.assertValidTipo(tipo)
    return this.service.update(tipo as PropTipo, id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':tipo/:id/toggle')
  toggleActive(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    this.assertValidTipo(tipo)
    return this.service.toggleActive(tipo as PropTipo, id)
  }

  private assertValidTipo(tipo: string): asserts tipo is PropTipo {
    if (!(PROP_TIPOS as readonly string[]).includes(tipo)) {
      throw new NotFoundException(`Tipo de propiedad inválido: ${tipo}`)
    }
  }
}
```

```typescript
// apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts
import { IsString, MaxLength, MinLength, Matches } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreatePropiedadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  nombre!: string

  @IsString()
  @Matches(/^[A-Z0-9]{1,8}$/, {
    message: 'La abreviación debe tener 1 a 8 caracteres en mayúsculas o dígitos',
  })
  abrev!: string
}
```

```typescript
// apps/backend/src/modules/propiedades/dto/update-propiedad.dto.ts
import { PartialType } from '@nestjs/mapped-types'
import { CreatePropiedadDto } from './create-propiedad.dto'

export class UpdatePropiedadDto extends PartialType(CreatePropiedadDto) {}
```

> Nota: si `@nestjs/mapped-types` no está instalado, replicar el patrón actual del repo (DTO custom con `@IsOptional()` por campo, como en `UpdateDepositoDto`).

### Pattern 3: Trigger SQL preparado para cache de nombre (D-02) — sin disparar

**What:** Funciones PL/pgSQL `cache_nombre_marca()` etc. + triggers AFTER INSERT/UPDATE en cada `prop_*`. **El trigger NO actualiza nada en `articulos` todavía** (Phase 30/31 lo hará). En Phase 29 el código del trigger queda escrito pero internamente hace `RETURN NEW` o un no-op gated por `IF EXISTS (SELECT 1 FROM information_schema.columns ...)`.

**When to use:** Solo este caso: dejar la infraestructura SQL lista para que Phase 30/31 simplemente "encienda" el trigger sin redefinirlo.

**Decisión recomendada (planner debe confirmar):** **Opción A — escribir el SQL en `drizzle/0005_phase_29_cache_trigger.sql` (`--custom`) pero comentado**, con descripción inline del approach. El planner puede preferir Opción B ("aplicado pero no-op") por defensa en profundidad.

**Example (Opción A — comentado):**

```sql
-- drizzle/0005_phase_29_cache_trigger.sql
-- Generado vía `drizzle-kit generate --custom --name=phase_29_cache_trigger`
-- Phase 29 deja preparado el SQL pero NO crea el trigger todavía.
-- Phase 30/31 reactivará este bloque cuando articulos.<prop>_id exista como FK.
-- Si se prefiere aplicar el SQL como no-op, descomentar TODO el bloque.

-- -----------------------------------------------------------------------------
-- BLOQUE COMENTADO — activar en Phase 30/31
-- -----------------------------------------------------------------------------
/*
CREATE OR REPLACE FUNCTION cache_nombre_prop()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actuar si articulos tiene la columna FK correspondiente
  -- (gated para que el mismo trigger valga en Phase 29 sin romper)
  IF NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    EXECUTE format(
      'UPDATE articulos SET %I = $1 WHERE %I = $2',
      TG_ARGV[0],          -- nombre de columna cache (ej: 'marca')
      TG_ARGV[1]           -- nombre de columna FK    (ej: 'marca_id')
    ) USING NEW.nombre, NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prop_marca_cache_nombre
  AFTER UPDATE OF nombre ON prop_marca
  FOR EACH ROW EXECUTE FUNCTION cache_nombre_prop('marca', 'marca_id');
-- repetir para color, talle, material, presentacion, objeto
*/
```

**Why this matters:** Documentado en `.planning/research/PITFALLS.md §P-11` — "denorm trigger silent failure". Postergar la activación a Phase 30/31 evita errores silenciosos y deja un comentario que el planner futuro encontrará.

### Pattern 4: Tabs lazy-loaded en Next 14 App Router con Radix Tabs

**What:** UNA sola página Client Component con `useState<PropTipo>('marca')`. Cada `<TabsContent value={tipo}>` envuelve su `<PropiedadTable propTipo={tipo} />`. Radix monta solo el TabsContent activo por default; el data fetch en `PropiedadTable` se dispara en `useEffect` cuando el componente monta — esto es lazy de facto.

**When to use:** Cualquier página con múltiples paneles que comparten layout pero no datos.

**Anti-pattern detectado:** Renderizar las 6 PropiedadTable en paralelo y cambiar visibilidad con CSS — provoca 6 fetches en paralelo al primer load. El default Radix de "renderizar solo el active" YA es lazy.

**Example:**

```typescript
// apps/web/src/app/(dashboard)/propiedades/page.tsx
import { PropiedadesPage } from '@/components/propiedades/propiedades-page'

export default function PropiedadesRoute() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium flex items-center gap-2">
          {/* icon Tags handled by sidebar; aquí solo título */}
          Propiedades
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestión de propiedades de artículos
        </p>
      </div>
      <PropiedadesPage />
    </div>
  )
}
```

```typescript
// apps/web/src/components/propiedades/propiedades-page.tsx
'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropiedadTable } from './propiedad-table'
import { PROP_TIPOS, PROP_LABELS, type PropTipo } from './propiedad-config'

export function PropiedadesPage() {
  const [activeTab, setActiveTab] = useState<PropTipo>('marca')

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as PropTipo)}
      className="w-full"
    >
      <TabsList className="w-full justify-start">
        {PROP_TIPOS.map(tipo => (
          <TabsTrigger key={tipo} value={tipo}>
            {PROP_LABELS[tipo].plural}
          </TabsTrigger>
        ))}
      </TabsList>
      {PROP_TIPOS.map(tipo => (
        <TabsContent key={tipo} value={tipo} className="mt-4">
          {/* Radix monta esto solo cuando value === activeTab — lazy automático */}
          <PropiedadTable propTipo={tipo} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
```

> Verificación: si en futuro se reportan "datos vienen siempre vacíos al cambiar de tab", revisar que `<PropiedadTable>` use `useEffect(() => loadData(), [propTipo])` — el componente sí remonta cuando cambia `propTipo` porque cada TabsContent es su propio subtree.

### Pattern 5: PropiedadCreateDialog standalone reusable

**What:** Componente Dialog (no Sheet) que abre formulario `nombre + abrev` con auto-suggest. Acepta props para integración Phase 32 sin cambios. Patrón seguido: `DepositoDialog` exacto.

**Example:**

```typescript
// apps/web/src/components/propiedades/propiedad-create-dialog.tsx
'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createPropiedad } from '@/lib/api.client'
import { suggestAbrev } from '@/lib/abrev'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { PROP_LABELS, type PropTipo } from './propiedad-config'

const schema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido').max(255),
  abrev: z.string()
    .regex(/^[A-Z0-9]{1,8}$/, 'La abreviación debe tener 1 a 8 caracteres en mayúsculas o dígitos'),
})
type FormValues = z.infer<typeof schema>

export interface PropiedadCreateDialogProps {
  propTipo: PropTipo
  /** Phase 32 reuse hook — invocado tras éxito con la fila creada. */
  onCreated?: (created: { id: number; nombre: string; abrev: string }) => void
  /** Trigger custom — si no se provee, el padre controla open/onOpenChange. */
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PropiedadCreateDialog({
  propTipo,
  onCreated,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: PropiedadCreateDialogProps) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen

  const [isLoading, setIsLoading] = useState(false)
  const [abrevManuallyEdited, setAbrevManuallyEdited] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', abrev: '' },
  })

  // Auto-suggest abrev — solo si el usuario no la editó manualmente
  const nombre = form.watch('nombre')
  useEffect(() => {
    if (abrevManuallyEdited) return
    const suggested = suggestAbrev(nombre)
    if (suggested !== form.getValues('abrev')) {
      form.setValue('abrev', suggested, { shouldValidate: false })
    }
  }, [nombre, abrevManuallyEdited, form])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      form.reset({ nombre: '', abrev: '' })
      setAbrevManuallyEdited(false)
    }
  }, [open, form])

  const label = PROP_LABELS[propTipo]

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      const created = await createPropiedad(propTipo, values)
      toast({ title: `${capitalize(label.singular)} creada correctamente` })
      onCreated?.(created)
      onOpenChange(false)
    } catch (err) {
      // Backend devuelve 409 con mensaje específico per-constraint
      const message = err instanceof Error ? err.message : 'Error desconocido'
      // Mapear errores de campo si el mensaje contiene "nombre" o "abrev"
      if (message.toLowerCase().includes('nombre')) {
        form.setError('nombre', { message })
      } else if (message.toLowerCase().includes('abreviación') || message.toLowerCase().includes('abrev')) {
        form.setError('abrev', { message })
      } else {
        toast({
          title: `No se pudo crear la ${label.singular}`,
          description: message,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva {capitalize(label.singular)}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder={getNombrePlaceholder(propTipo)} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="abrev"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abreviación</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: SHI (auto-sugerido)"
                      {...field}
                      onChange={(e) => {
                        setAbrevManuallyEdited(true)
                        field.onChange(e.target.value.toUpperCase())
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    1-8 caracteres, solo mayúsculas y dígitos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear {label.singular}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
function getNombrePlaceholder(tipo: PropTipo): string {
  const placeholders: Record<PropTipo, string> = {
    marca: 'Ej: Shimano', color: 'Ej: Rojo', talle: 'Ej: XL',
    material: 'Ej: Cuero', presentacion: 'Ej: Caja', objeto: 'Ej: Casco',
  }
  return placeholders[tipo]
}
```

### Pattern 6: Algoritmo abrev auto-suggest (D-Discretion cerrada)

**What:** Función pura — NFD normalize + strip diacritics + uppercase + filter `[A-Z0-9]` + take first 4 chars + cap a 8.

**Decisión recomendada:** **4 chars iniciales** (mejor distinción para palabras compuestas). El usuario puede editar libremente.

**Casos de prueba (que pasarán los unit tests):**

| Input | Output |
|-------|--------|
| `"Shimano"` | `"SHIM"` |
| `"Continental Europa"` | `"CONT"` (primera palabra dominante) |
| `"Niño"` | `"NINO"` |
| `"L'Oréal"` | `"LORE"` |
| `"AC/DC"` | `"ACDC"` |
| `"3M"` | `"3M"` |
| `""` | `""` |
| `"  "` | `""` |
| `"  ¡Hola!  "` | `"HOLA"` |

**Example:**

```typescript
// apps/web/src/lib/abrev.ts
/**
 * Sugerencia automática de `abrev` desde un nombre.
 *
 * Reglas:
 *  1. Trim y NFD normalize
 *  2. Strip diacríticos (combining marks)
 *  3. Uppercase
 *  4. Quedarse solo con [A-Z0-9]
 *  5. Tomar las primeras 4 (regla cerrada en research; ver §"Algoritmo abrev auto-suggest")
 *  6. Cap a 8 (defense in depth — el regex CHECK ya garantiza 1..8)
 *
 * NOTA: el usuario puede editar libremente; la sugerencia es solo guía visual.
 */
export function suggestAbrev(nombre: string, takeChars = 4): string {
  return (nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, takeChars)
    .slice(0, 8)
}
```

> **Nota técnica importante:** el regex `/[̀-ͯ]/g` que aparece en algunos issues web tiene caracteres invisibles que rompen el linter. Usar la forma escapada `/[̀-ͯ]/g` es portable y CI-friendly. `[CITED: Unicode UAX#15 — combining marks block]`

### Anti-Patterns to Avoid

- **Generar 6 controllers separados** copiando el `DepositosController`. Costo: 6 archivos casi idénticos a mantener. **Use el controller parametrizado por `:tipo`** (Pattern 2).
- **Renderizar las 6 PropiedadTable en paralelo y ocultar con CSS.** Provoca 6 fetches al primer load. **Use `<TabsContent value={tipo}>` — Radix solo monta el activo.**
- **Slugificar `abrev` en backend.** El usuario tipea ASCII puro y el CHECK regex ya enforza el formato. NO usar `slugify` en Phase 29.
- **Guardar `abrev` en lowercase.** Rompe el CHECK `[A-Z0-9]` y el contrato visual del SKU. La UI debe `.toUpperCase()` en el `onChange` del input abrev.
- **Hard-delete con DELETE en lugar de toggle activo=false.** Rompe CAT-04 (preservar histórico). Si futuro requiere DELETE, agregar endpoint separado con confirmación dura.
- **Usar TanStack Query en Phase 29 para "estandarizar".** Introduce dep nueva, requiere QueryClient provider, rompe el patrón actual del repo. Diferir a un quick-task de tech debt si vale.
- **Trigger de cache que se aplica y dispara en Phase 29.** Si la columna `articulos.marca` aún es text-libre (NO FK), el trigger podría sobrescribir valores legítimos al editar `prop_marca`. Mantener comentado o gated.
- **Validar cross-prop uniqueness de abrev (`talle.XL ≠ color.XL`).** D-06 explícita: cross-prop NO se valida. El SKU es globalmente único por composición ordenada del template.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UNIQUE case-insensitive sobre `nombre` | Trigger BEFORE INSERT que hace `LOWER(nombre)` y SELECT | `CREATE UNIQUE INDEX ON tabla (LOWER(nombre))` declarado en Drizzle `uniqueIndex().on(sql\`lower(...)\`)` | Postgres native, atómico, indexable. **Ya soportado declarativamente en Drizzle 0.45.** |
| CHECK regex de formato `abrev` | Validar solo en backend con class-validator | `check('chk_name', sql\`abrev ~ '^[A-Z0-9]{1,8}$'\`)` en pgTable + `@Matches()` en DTO | Defensa en profundidad: DB rechaza writes maliciosos directos; DTO da feedback inmediato. **Ya soportado declarativamente en Drizzle 0.45.** |
| Manejo de UNIQUE violation → mensaje legible | Hacer 2 SELECT pre-INSERT para checkear duplicado | try/catch en service detectando `error.code === '23505'` + parsing `constraint_name` para mensaje específico | Pre-SELECT introduce race condition. Patrón ya usado en `DispositivosService`. |
| Tabs lazy mount | useState + useEffect + condicional `{activeTab === 'marca' && <Marcas />}` | Radix `<Tabs>` con `<TabsContent value={tipo}>` (default behavior monta solo el active) | Radix lo da gratis, accesibilidad ARIA correcta, transiciones limpias. |
| Form validation con mensaje en español | Implementar manualmente parsing de errores | RHF + zod + `zodResolver` (patrón existente en `DepositoDialog`) | Ya en uso, lock-in mínimo. |
| Soft-delete pattern | Implementar tabla `deleted_props` separada | Boolean `activo` + filtro `WHERE activo = true` por default | Patrón ya usado en `articulos`, `depositos`, `dispositivos_moviles`. Reactivar es trivial. |
| Auto-suggest abrev | Librería externa de transliteración (`@sindresorhus/transliterate`) | `String.prototype.normalize('NFD')` + `replace(/[̀-ͯ]/g, '')` + uppercase | El espacio ASCII de marcas/colores/talles del rubro NO incluye edge-cases que requieran librería completa. **5 LOC vs +50KB de deps.** |
| Toggle "mostrar inactivos" | Endpoint separado `/api/propiedades/:tipo/inactivos` | Query param `?activo=true|false|all` en GET existente | Más simple, una sola ruta. **PERO**: confirmar con planner si se acepta `activo=all` o si se prefiere `activo=` (sin valor) para "todos". |

**Key insight:** El stack del repo ya provee TODOS los building blocks. Phase 29 es 80% configuración + 20% lógica nueva. La lógica nueva relevante: parametrización del service, manejo de UNIQUE detection con `constraint_name`, y `suggestAbrev`. Resto es replicar `DepositosModule` + `DepositoDialog` con cambios cosméticos.

---

## Common Pitfalls

### Pitfall 1: Drizzle no detecta el `lower()` del UNIQUE INDEX al introspectar

**What goes wrong:** Cuando se ejecuta `pnpm db:generate` después de modificar `schema.ts` con un `uniqueIndex().on(sql\`lower(...)\`)`, Drizzle puede no reconocer el índice existente en re-generaciones futuras y proponer DROP + CREATE — perdiendo la unicidad transitoriamente.

**Why it happens:** La introspección de Drizzle compara expresiones SQL textualmente; si la cadena emitida difiere del helper, ve "diferente" aun cuando es semánticamente igual.

**How to avoid:**
1. Definir helper `lower(col)` UNA vez y reusarlo en TODAS las 6 tablas — consistencia textual.
2. Después de cada `db:generate`, **siempre** revisar el `.sql` antes de aplicar.
3. CI step opcional: `pnpm db:generate --check` debería retornar diff vacío.

**Warning signs:**
- Migration regenerada contiene `DROP INDEX prop_marca_nombre_lower_uniq; CREATE UNIQUE INDEX...`
- Tras aplicar, queries que antes daban 409 ahora aceptan duplicados case-different.

**Source:** `[VERIFIED: codebase grep — pattern usado pero no aún en case-insensitive index]` `[CITED: drizzle-team/drizzle-orm-docs/guides/unique-case-insensitive-email.mdx]`.

### Pitfall 2: ValidationPipe rechaza `tipo` con 400 si no se valida en URL param

**What goes wrong:** El `@Param('tipo')` no pasa por `class-validator` (no hay DTO en URL params). Si el cliente envía `/api/propiedades/inventado`, el service hace lookup en `PROP_TABLES['inventado']` → undefined → posible crash con stack trace en logs.

**How to avoid:** Helper `assertValidTipo` en el controller (mostrado en Pattern 2) que verifica contra `PROP_TIPOS` array y lanza `NotFoundException` si no.

**Warning signs:**
- 500 errors en logs con `Cannot read properties of undefined (reading 'id')`.
- Endpoint responde HTML stack trace en vez de JSON.

### Pitfall 3: Auto-suggest dispara sobre cada keypress (jitter)

**What goes wrong:** `useEffect` que recalcula `abrev` en cada keystroke del nombre causa "flicker" visual — el campo abrev cambia letra a letra mientras el usuario tipea.

**How to avoid:** UI-SPEC ya lo cubre — debounce 150ms en el `onChange` de `nombre`. **Implementación opcional con `useDebouncedCallback` o `setTimeout` simple.**

**Warning signs:**
- Pruebas en Playwright fallan porque snapshot de abrev no coincide con la última letra tipeada.

### Pitfall 4: `abrev` lowercase del usuario rompe CHECK

**What goes wrong:** Usuario tipea `shi` en abrev manualmente. zod cliente acepta solo `[A-Z0-9]` → muestra error inline. Pero algunos forms permiten submit con error si el usuario insiste. Backend lanza 409 con mensaje confuso (CHECK violation).

**How to avoid:** En `onChange` del input abrev, hacer `.toUpperCase()` automático (ver Pattern 5 — ya implementado). El zod schema queda como backstop.

**Warning signs:**
- Tests E2E fallan con "form submitted with invalid abrev value" en backend logs.

### Pitfall 5: Toast de éxito al fallar fetch silencioso

**What goes wrong:** Si la red falla durante `createPropiedad`, el toast ya se mostró por estructura del code (común en patrones imperativos). El usuario cree que se creó pero al reload no aparece.

**How to avoid:** Toast SOLO dentro del `try` después de await exitoso (patrón en `DepositoDialog.onSubmit`). Hacer code review explícito de cada CRUD.

**Warning signs:**
- Tests E2E muestran toast de éxito pero la tabla no actualiza en reload.

### Pitfall 6: Tabs lazy NO refresca al volver

**What goes wrong:** Usuario crea una marca, va al tab Color, vuelve a Marcas — la lista no muestra la nueva. Esto pasa si `<PropiedadTable>` cachea data y NO escucha onCreated.

**How to avoid:** Después de `createPropiedad` exitoso, llamar `loadData()` explícitamente. El callback `onSuccess` en el dialog dispara `loadData()` en el padre. Patrón replicado de `DepositoDialog`/`DepositosList`.

**Warning signs:**
- Test "creo X, navego a otro tab y vuelvo, X debe estar visible" falla.

### Pitfall 7: Trigger de cache se enciende accidentalmente en Phase 29

**What goes wrong:** Si el SQL del trigger D-02 se aplica sin `IF NOT EXISTS` guards o sin gating por columna existente, al hacer `UPDATE prop_marca SET nombre = 'X'` el trigger intenta `UPDATE articulos SET marca = 'X'` cuando aún `articulos.marca_id` no existe → error en producción que bloquea ediciones.

**How to avoid:** Mantener el bloque del trigger **comentado** en la migration custom (ver Pattern 3 Opción A). Phase 30/31 lo descomenta y aplica con la columna FK ya existente.

**Warning signs:**
- `PATCH /api/propiedades/marca/:id` devuelve 500 con `column "marca_id" does not exist`.

**Source:** `[CITED: PITFALLS.md §P-11]`

---

## Code Examples

### CRUD operations — api.client.ts (additions)

```typescript
// apps/web/src/lib/api.client.ts (sección a agregar)
import type { Propiedad, PropTipo } from '@/types/propiedad'

export async function fetchPropiedades(
  tipo: PropTipo,
  opts: { activo?: boolean | 'all' } = {}
): Promise<Propiedad[]> {
  const headers = await getAuthHeaders()
  const params = new URLSearchParams()
  if (opts.activo === false) params.set('activo', 'false')
  else if (opts.activo === 'all') params.set('activo', 'all')
  // default activo=true sin enviar (server lo asume)

  const qs = params.toString()
  const url = `${API_BASE_URL}/api/propiedades/${tipo}${qs ? `?${qs}` : ''}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}

export async function createPropiedad(
  tipo: PropTipo,
  data: { nombre: string; abrev: string }
): Promise<Propiedad> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/propiedades/${tipo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function updatePropiedad(
  tipo: PropTipo,
  id: number,
  data: Partial<{ nombre: string; abrev: string }>
): Promise<Propiedad> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/propiedades/${tipo}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}

export async function togglePropiedadActivo(
  tipo: PropTipo,
  id: number
): Promise<Propiedad> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/propiedades/${tipo}/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}
```

### Types — apps/web/src/types/propiedad.ts

```typescript
// apps/web/src/types/propiedad.ts
export const PROP_TIPOS = [
  'marca', 'color', 'talle', 'material', 'presentacion', 'objeto',
] as const
export type PropTipo = typeof PROP_TIPOS[number]

export interface Propiedad {
  id: number
  nombre: string
  abrev: string
  activo: boolean
  createdAt: string
  updatedAt: string
}
```

### PropiedadTable — versión simplificada (similar a DepositosList)

```typescript
// apps/web/src/components/propiedades/propiedad-table.tsx (esqueleto)
'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  fetchPropiedades, togglePropiedadActivo,
} from '@/lib/api.client'
import type { Propiedad, PropTipo } from '@/types/propiedad'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Plus, MoreHorizontal, Loader2 } from 'lucide-react'
import { PROP_LABELS } from './propiedad-config'
import { PropiedadCreateDialog } from './propiedad-create-dialog'
import { PropiedadEditDialog } from './propiedad-edit-dialog'
import { PropiedadDeactivateDialog } from './propiedad-deactivate-dialog'

interface Props { propTipo: PropTipo }

export function PropiedadTable({ propTipo }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Propiedad | null>(null)
  const [deactivating, setDeactivating] = useState<Propiedad | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const label = PROP_LABELS[propTipo]

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchPropiedades(propTipo, {
        activo: showInactive ? 'all' : true,
      })
      setData(rows)
    } catch (err) {
      toast({
        title: `No se pudieron cargar las ${label.plural}`,
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [propTipo, showInactive, toast, label.plural])

  useEffect(() => { loadData() }, [loadData])

  async function handleReactivate(p: Propiedad) {
    setTogglingId(p.id)
    try {
      await togglePropiedadActivo(propTipo, p.id)
      toast({ title: `${capitalize(label.singular)} reactivada` })
      await loadData()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center justify-between p-4">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva {label.singular}
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          Mostrar inactivos
        </label>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Sin {label.plural}. Usá el botón Nueva {label.singular} para agregar la primera.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] font-mono text-xs">ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-[100px] font-mono">Abrev</TableHead>
              <TableHead className="w-[80px]">Estado</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(p => (
              <TableRow key={p.id} className={!p.activo ? 'text-muted-foreground' : ''}>
                <TableCell className="font-mono text-sm">{p.id}</TableCell>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell className="font-mono">{p.abrev}</TableCell>
                <TableCell>
                  <Badge variant={p.activo ? 'default' : 'secondary'} className="px-1.5 py-0 text-[11px]">
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {togglingId === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(p)}>Editar</DropdownMenuItem>
                        {p.activo ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeactivating(p)}
                          >Desactivar</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleReactivate(p)}>Reactivar</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PropiedadCreateDialog
        propTipo={propTipo}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => loadData()}
      />
      {editing && (
        <PropiedadEditDialog
          propTipo={propTipo}
          propiedad={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onUpdated={() => { setEditing(null); loadData() }}
        />
      )}
      {deactivating && (
        <PropiedadDeactivateDialog
          propTipo={propTipo}
          propiedad={deactivating}
          open={!!deactivating}
          onOpenChange={(o) => !o && setDeactivating(null)}
          onConfirmed={() => { setDeactivating(null); loadData() }}
        />
      )}
    </div>
  )
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
```

### Sidebar entry — apps/web/src/config/navigation.ts (modificación)

```typescript
// apps/web/src/config/navigation.ts
import {
  LayoutDashboard, Package, ShoppingCart, ShoppingBag,
  ClipboardList, Settings, Tags, type LucideIcon,
} from 'lucide-react'

// ... rutas existentes preservadas; insertar Propiedades después de Artículos:
{
  label: 'Propiedades',
  icon: Tags,
  href: '/propiedades',
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Drizzle Kit `--custom` para CHECK constraints | `check()` declarativo en `pgTable` (3er argumento) | Drizzle ORM 0.31+ (estable a 0.45) `[CITED: drizzle-team/drizzle-orm-docs/indexes-constraints.mdx]` | El STACK.md milestone-level decía "CHECK constraints requieren `--custom`". **Ya no.** Phase 29 los declara en TS y Drizzle los emite. |
| Drizzle Kit `--custom` para UNIQUE INDEX functional | `uniqueIndex().on(sql\`lower(${col})\`)` declarativo | Drizzle 0.31+ `[CITED: drizzle-team/drizzle-orm-docs/latest-releases/drizzle-orm-v0310.mdx]` | Mismo principio. UNIQUE LOWER se declara en TS. |
| Strict-mode `import slugify from 'slugify'` para `abrev` | Función pura `String.prototype.normalize('NFD')` | N/A — abrev es ASCII puro por D-06 | Phase 29 NO necesita slugify. Mantener footprint mínimo. |
| Random IDs (`nanoid`/`cuid2`) para PK de catálogos | `serial` Postgres autoincremental | Phase 29 reafirma — no aplica para catálogos | FK por `id` (D-02) con `INT` permite cache numérico mínimo, indexación nativa, debug visual. |
| Endpoint `:tabla` permitiendo cualquier valor | Whitelist con `PROP_TIPOS` array + helper assert | Phase 29 (decisión nueva) | Defensa en profundidad: el `:tipo` es enum cerrado, validado en controller. |

**Deprecated/outdated:**

- **TanStack Query como sugerencia automática para web**: en este repo, no es la práctica. NO migrar el módulo Propiedades a TanStack Query como side-effect.
- **`articulos.prop_aux_1..5`** — overlap visual con `prop_*`, deprecación diferida a Phase 31/37.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | El `constraint_name` está en `error.constraint_name` (string) en errores de `postgres.js` v3.4 | §Pattern 2 (handleUniqueViolation) | El parsing de constraint para distinguir UNIQUE LOWER vs UNIQUE abrev podría fallar; fallback al mensaje genérico evita crash pero da UX peor. **Verificación rápida durante Wave 0**: hacer un INSERT que viole UNIQUE y `console.log(error)` para confirmar shape. |
| A2 | `ParseBoolPipe` o parseo manual de `?activo=true|false|all` es suficiente — no se necesita DTO de query | §Pattern 2 (controller) | Si el cliente envía valores raros (`?activo=1`), el comportamiento podría ser inconsistente. Solución prescrita: parsing manual con whitelist de strings. |
| A3 | El ValidationPipe global con `forbidNonWhitelisted: true` rechaza propiedades extra en POST/PATCH body | §Pattern 2 (DTOs) | Si el cliente envía `{nombre, abrev, fechaCreacion}`, el ValidationPipe ya retorna 400. **Verificado**: `apps/backend/src/main.ts` línea 22 confirma. → **bajamos esta a `[VERIFIED]` pero se mantiene como assumption porque otra config ad-hoc podría desactivarlo.** |
| A4 | Postgres 16 soporta `CREATE UNIQUE INDEX ... ON tabla (LOWER(col))` sin extensión | §Pattern 1 | Soportado nativamente desde Postgres 7+. `[VERIFIED: psql --version → 16.13]` (`bash` ejecutado). Riesgo: nulo. |
| A5 | El patrón de `error.code === '23505'` también aplica a violación de UNIQUE INDEX functional (no solo UNIQUE constraint). | §Common Pitfalls | Postgres usa el mismo SQLSTATE para ambos. `[CITED: postgresql.org/docs/current/errcodes-appendix]` — sección 23505: "unique_violation" cubre todos los UNIQUE/UNIQUE INDEX. |
| A6 | La página `/propiedades` será visitable por `viewer` (no solo `admin`) | §Architectural Responsibility Map | Si el negocio prefiere ocultar el menú a `viewer`, el sidebar requiere `useUser()` check. El **planner debe confirmar**: por consistencia con `/depositos` (también visible a viewer), Phase 29 sigue ese contrato (read-only). Acciones POST/PATCH/DELETE están guardadas por `RolesGuard`. |
| A7 | El usuario aceptará el mapeo "first 4 chars" para abrev auto-suggest | §Algorithm abrev auto-suggest | Si el negocio prefiere "first 3", cambiar default `takeChars=3`. **No bloquea**: el usuario puede editar libremente. |
| A8 | El planner aceptará la **Opción A (trigger SQL comentado)** para D-02 sobre Opción B (aplicado pero no-op) | §Pattern 3 | Si se prefiere B, hay que escribir guard `IF EXISTS column ...` en cada función trigger. Más complejo pero más defensivo. **Recomiendo A para Phase 29; planner decide**. |
| A9 | El campo `nombre` se guarda en mixed-case (no se normaliza). El UNIQUE LOWER permite "Shimano" y "shimano" como duplicados, pero la fila almacena la cadena tal cual la tipea el admin (case respetado en lecturas) | §Schema | Confirmado por D-05 (UNIQUE case-insensitive — duplicados rechazados, pero el case original se preserva para display). El planner puede preferir normalizar a Title Case en backend; **NO hay decisión cerrada al respecto**. Recomendación: NO normalizar — dejar que el admin controle el case visible. |

**Si el planner detecta que A1, A6, A7, A8 o A9 deben revisarse antes de codificar, debería abrir mini-discussion.**

---

## Open Questions

1. **Cómo manejar `?activo=all`?**
   - What we know: el toggle "Mostrar inactivos" debe traer activos+inactivos.
   - What's unclear: convención del query param. Opciones: `?activo=all`, `?activo=` (vacío), `?showInactive=true`, omitir el param.
   - Recommendation: usar `?activo=all` (3 valores: `true`/`false`/`all`, default `true` cuando ausente). Easy de extender, explícito.

2. **¿La página `/propiedades` requiere protección guard adicional para roles?**
   - What we know: backend tiene `RolesGuard`. El frontend hoy NO usa middleware de roles a nivel de ruta — todas las rutas autenticadas son visibles al `viewer`, y cada acción individual es la que se rechaza si carece de rol.
   - What's unclear: si el planner querrá forzar redirect 403 al entrar a `/propiedades` siendo viewer.
   - Recommendation: NO agregar middleware nuevo. Replicar exactamente el contrato de `/settings/depositos` (visible a viewer, mutaciones bloqueadas en backend).

3. **¿El módulo `PropiedadesModule` debe registrarse en `AppModule.imports`?**
   - What we know: sí (todo módulo NestJS debe estar en imports).
   - What's unclear: ningún issue real, solo recordatorio para el planner.
   - Recommendation: `apps/backend/src/app.module.ts` agrega `PropiedadesModule` en imports.

4. **¿Fixture initial-data o tabla vacía al primer deploy?**
   - What we know: D-Discretion abierta — usuario sugirió "no seed por defecto".
   - What's unclear: Phase 32 necesitará al menos 1-2 marcas/colores de ejemplo para probar el wireup. ¿Se siembran desde Phase 32 o se asume que el admin las creará vía UI durante UAT?
   - Recommendation: **No seed en Phase 29.** El admin las crea en `/propiedades` durante UAT. Phase 32 puede agregar un seed si el plan-checker detecta que no se puede testear sin datos.

5. **Web types: ¿agregar también a `packages/types`?**
   - What we know: hoy `apps/web/src/types/propiedad.ts` es suficiente. `packages/types` solo expone `AppRole` y zod schemas auth.
   - What's unclear: si mobile en futuro consumirá propiedades, conviene mover a `packages/types`.
   - Recommendation: dejar en `apps/web/src/types/` por ahora (consistente con `apps/web/src/types/deposito.ts`). Si Phase 30+ necesita mobile, migrar entonces.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + Web | ✓ | 22.22.0 | — (mín v18) |
| pnpm | Build, install | ✓ | 9.0.0 | — |
| PostgreSQL | DB local | ✓ | 16.13 (Ubuntu) | Docker compose si se prefiere |
| Docker | Servicios dockerizados (web:3000, backend:3001) | ✓ | 29.2.1 | — |
| Drizzle Kit CLI | Migrations | ✓ (en deps) | 0.31.10 | — |
| Supabase JWT (JWKS endpoint) | Auth backend | ✓ (env var configurada) | n/a | Public envs en `.env` |

**Missing dependencies with no fallback:** ninguna.

**Missing dependencies with fallback:** ninguna.

**Conclusión:** entorno listo para implementar Phase 29 sin instalación de tooling adicional.

---

## Validation Architecture

> Sección obligatoria: `.planning/config.json` no setea `workflow.nyquist_validation = false`, por lo tanto la sección está habilitada.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **Inexistente todavía en backend.** No hay `*.spec.ts` / `*.test.ts` en `apps/backend/src` ni `apps/backend/test`. `apps/web` tampoco. `[VERIFIED: find ... -name "*.spec.ts" -o "*.test.ts" → 0 resultados]` |
| Config file | None — Wave 0 debe crearlos |
| Quick run command | (post Wave 0) `pnpm --filter @objetiva/backend test` |
| Full suite command | (post Wave 0) `pnpm --filter @objetiva/backend test --coverage` + `pnpm --filter @objetiva/web test` + Playwright E2E |
| Recommended frameworks | **Backend: Jest** (incluido por NestJS CLI por default, aunque no se inicializó). **Web: Vitest** (Next 14 friendly). **E2E: Playwright** (skill `playwright-testing` ya en el repo según CLAUDE.md). |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAT-01 | Listar marcas vacías al crear tabla | unit (service) | `pnpm --filter @objetiva/backend test propiedades.service.spec.ts -t "findAll returns empty"` | ❌ Wave 0 |
| CAT-01 | Crear marca "Shimano" + abrev "SHI" | unit (service) | `pnpm ... test -t "create persists row"` | ❌ Wave 0 |
| CAT-01 | Endpoint POST /api/propiedades/marca devuelve 201 | integration (controller + service + DB test container) | `pnpm ... test -t "POST creates"` | ❌ Wave 0 |
| CAT-01 | UI puede listar+crear+editar+desactivar+reactivar | E2E Playwright | `pnpm --filter @objetiva/web test:e2e propiedades.spec.ts` | ❌ Wave 0 |
| CAT-02 (parcial) | `PropiedadCreateDialog` standalone abre/cierra y crea | component test | `pnpm --filter @objetiva/web test propiedad-create-dialog.test.tsx` | ❌ Wave 0 |
| CAT-02 (parcial) | `onCreated` callback se dispara con `{id, nombre, abrev}` | unit React | misma suite arriba | ❌ Wave 0 |
| CAT-03 | Crear marca con nombre "Shimano" y luego "SHIMANO" → 409 | integration | `pnpm ... test -t "rejects case-insensitive duplicate name"` | ❌ Wave 0 |
| CAT-03 | Crear marca con abrev duplicado "SHI" → 409 | integration | `pnpm ... test -t "rejects duplicate abrev"` | ❌ Wave 0 |
| CAT-03 | Crear con abrev `"shi"` (lowercase) → 400 zod / 400 class-validator | integration | `pnpm ... test -t "rejects lowercase abrev"` | ❌ Wave 0 |
| CAT-03 | DB CHECK rechaza INSERT directo de `abrev='shi'` | integration (raw SQL) | `pnpm ... test -t "DB CHECK enforces"` | ❌ Wave 0 |
| CAT-04 | Toggle activo→inactivo, listado default no incluye | integration | `pnpm ... test -t "soft-delete hides by default"` | ❌ Wave 0 |
| CAT-04 | Listado con `?activo=all` incluye inactivas | integration | `pnpm ... test -t "show inactive returns all"` | ❌ Wave 0 |
| CAT-04 | Toggle inactivo→activo (reactivar) | integration | `pnpm ... test -t "reactivate flips flag"` | ❌ Wave 0 |
| CAT-04 | Soft-delete preserva `id` y `created_at` | integration | `pnpm ... test -t "soft-delete preserves data"` | ❌ Wave 0 |
| Helper | `suggestAbrev("Shimano") === "SHIM"` | unit pure | `pnpm --filter @objetiva/web test abrev.test.ts` | ❌ Wave 0 |
| Helper | `suggestAbrev("Niño") === "NINO"` (NFD strip) | unit pure | misma suite | ❌ Wave 0 |
| Helper | `suggestAbrev("L'Oréal") === "LORE"` | unit pure | misma suite | ❌ Wave 0 |
| Helper | `suggestAbrev("AC/DC") === "ACDC"` | unit pure | misma suite | ❌ Wave 0 |
| Helper | `suggestAbrev("") === ""` | unit pure | misma suite | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @objetiva/backend test propiedades` (rápido, suite módulo Propiedades) + `pnpm --filter @objetiva/web test propiedad` (Web).
- **Per wave merge:** suite completa backend + web + lint + type-check.
- **Phase gate:** suite completa con coverage ≥ 80% líneas en `apps/backend/src/modules/propiedades/` y `apps/web/src/components/propiedades/`. Playwright E2E del flujo `/propiedades` PASS antes de `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `apps/backend/jest.config.js` — config Jest (NestJS default, ts-jest, paths de tsconfig)
- [ ] `apps/backend/test/jest-e2e.json` — config para integration tests con DB test container
- [ ] `apps/backend/src/modules/propiedades/propiedades.service.spec.ts` — cubre CAT-01 a CAT-04 (unit con mock DrizzleService)
- [ ] `apps/backend/test/propiedades.e2e-spec.ts` — integration completo contra Postgres (test container o DB temporal)
- [ ] `apps/web/vitest.config.ts` — config Vitest + jsdom
- [ ] `apps/web/src/lib/abrev.test.ts` — algoritmo puro (8+ casos)
- [ ] `apps/web/src/components/propiedades/propiedad-create-dialog.test.tsx` — RHF + zod + onCreated callback
- [ ] `apps/web/e2e/propiedades.spec.ts` — Playwright E2E (login admin → crear marca → ver en lista → editar → desactivar → toggle inactivos → reactivar)
- [ ] `pnpm --filter @objetiva/backend add -D jest @nestjs/testing ts-jest @types/jest supertest` — install deps
- [ ] `pnpm --filter @objetiva/web add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react` — install deps
- [ ] `pnpm --filter @objetiva/web add -D @playwright/test` (si no está) — install
- [ ] Backend: agregar script `"test": "jest"` y `"test:e2e": "jest --config test/jest-e2e.json"` en `apps/backend/package.json`
- [ ] Web: agregar script `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:e2e": "playwright test"` en `apps/web/package.json`

> **Crítica importante para el planner:** Wave 0 puede ser tan grande como Phase 29 mismo. Hay dos caminos:
> 1. **Camino "completo"**: instalar test infra + tests obligatorios — alarga Phase 29 ~30%.
> 2. **Camino "mínimo viable"**: testing manual vía Playwright skill (`playwright-testing` en CLAUDE.md) + tests unitarios solo para `suggestAbrev` (función pura, costo bajísimo). Aplazar suite Jest completa a un quick task posterior o a Phase 30.
>
> **Recomendación**: **Camino mínimo viable** — costos del Camino completo se diluyen mejor cuando hay 2-3 phases siguiendo el mismo patrón. Phase 29 entrega:
> - `apps/web/src/lib/abrev.test.ts` (Vitest si se instala, o Node `--test` builtin si se quiere zero-deps).
> - `apps/web/e2e/propiedades.spec.ts` (Playwright via skill).
> - Backend: tests manuales documentados en VERIFY.md (fixture INSERT/SELECT vía `db:studio` o `psql`).
> El planner debe **decidir entre los dos caminos** y reflejarlo en la cantidad de plans/tasks.

*(Si el planner elige Camino mínimo: las gaps válidas se reducen a `abrev.test.ts` + `propiedades.spec.ts` Playwright + scripts en package.json. El resto se difiere.)*

---

## Sources

### Primary (HIGH confidence)

- **Codebase actual** — verificación directa:
  - `apps/backend/src/modules/depositos/{controller,service,module}.ts` — patrón canónico
  - `apps/backend/src/modules/dispositivos/dispositivos.service.ts` — patrón UNIQUE violation 23505
  - `apps/backend/src/modules/articulos/articulos.{controller,service}.ts` — patrón soft-delete + RBAC
  - `apps/backend/src/db/schema.ts` — schema actual (sin tocar prop_*)
  - `apps/backend/src/common/guards/{jwt-auth.guard,roles.guard}.ts` — auth pattern
  - `apps/backend/src/main.ts` — ValidationPipe global config
  - `apps/web/src/components/depositos/{deposito-dialog,depositos-list}.tsx` — patrón web canónico
  - `apps/web/src/components/ui/{tabs,dialog,alert-dialog,switch,dropdown-menu,skeleton,tooltip}.tsx` — primitivas existentes
  - `apps/web/src/lib/api.client.ts` — fetch client patrón
  - `apps/web/src/config/navigation.ts` — sidebar config
  - `apps/web/src/types/deposito.ts` — types client patrón
  - `apps/web/package.json`, `apps/backend/package.json` — versiones lockeadas (verificadas contra `npm view`)
- **Drizzle ORM official docs** (Context7 verified via `ctx7@latest docs /drizzle-team/drizzle-orm-docs`):
  - `indexes-constraints.mdx` — `check()` declarativo en pgTable
  - `guides/unique-case-insensitive-email.mdx` — patrón `uniqueIndex().on(sql\`lower(${col})\`)`
  - `drizzle-kit-generate.mdx` — `--custom` flag para SQL puro (trigger D-02)
  - `latest-releases/drizzle-orm-v0310.mdx` — soporte estable de UNIQUE INDEX functional
- **Postgres documentation:**
  - SQLSTATE 23505 (`unique_violation`) cubre constraints y functional unique indexes — `[CITED: postgresql.org/docs/current/errcodes-appendix]`
  - `psql --version → 16.13 (Ubuntu)` `[VERIFIED: bash]`
- **npm registry checks (2026-04-30):** `slugify@1.6.9`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `@radix-ui/react-tabs@1.1.13` — todos `[VERIFIED]`.
- **CONTEXT.md** Phase 29 (decisiones D-01 a D-19) y **UI-SPEC.md** aprobado.

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — la directiva milestone-level "CHECK requiere `--custom`" queda **superada** por hallazgo Drizzle declarativo (verificado).
- `.planning/research/ARCHITECTURE.md` — orden de migración Fase A — referencia conceptual; en Phase 29 las tablas se llaman `prop_*` (no `atributo_*`) por D-04.
- `.planning/research/PITFALLS.md` — P-04 mitigado por D-06 (CHECK ASCII estricto), P-11 mitigado dejando trigger comentado.

### Tertiary (LOW confidence — flagged for validation)

- A1: shape exacto de `error.constraint_name` en `postgres.js v3.4` — verificar en Wave 0 con un INSERT que viole UNIQUE.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — versiones verificadas contra registry y package.json; todas las primitivas UI ya instaladas.
- Architecture (parametrización backend, lazy tabs frontend): **HIGH** — patrones espejados de módulos existentes; Radix Tabs comportamiento verificado en docs.
- Schema constraints (UNIQUE LOWER + CHECK): **HIGH** — Drizzle docs oficial verificada vía Context7.
- Pitfalls: **HIGH** — heredados del milestone PITFALLS.md y verificados contra el codebase.
- Validation Architecture: **MEDIUM** — recomendación expuesta pero requiere decisión del planner entre Camino completo vs mínimo viable.

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (30 días — stack estable, sin breaking changes esperados)
