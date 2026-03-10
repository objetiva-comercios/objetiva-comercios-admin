# Technology Stack

**Project:** Objetiva Comercios Admin v1.2
**Researched:** 2026-03-10
**Scope:** Stack additions for File Upload, API Keys, Webhooks, Configurable Columns, Sheet Panels

## Recommended Stack

### File Upload (Backend)

| Technology                                | Version  | Purpose                          | Why                                                                                                           |
| ----------------------------------------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `multer` (via `@nestjs/platform-express`) | Built-in | Multipart form-data parsing      | Ya incluido en NestJS+Express. `@types/multer` ya esta en devDependencies. No agregar nada nuevo.             |
| `sharp`                                   | ^0.33    | Resize/compress imagenes subidas | Unica dependencia nueva para imagenes. Genera thumbnails para la grilla sin servir archivos de 5MB al listar. |

**Cero dependencias nuevas para upload basico.** NestJS incluye `FileInterceptor`, `FilesInterceptor`, `@UploadedFile()`, `@UploadedFiles()`, `ParseFilePipe`, `MaxFileSizeValidator`, `FileTypeValidator` out of the box. Multer viene con `@nestjs/platform-express` que ya esta instalado.

**Patron de almacenamiento:**

```
/uploads/articulos/{codigo}/producto-{1-6}.webp
/uploads/articulos/{codigo}/etiqueta-{1-3}.webp
/uploads/articulos/{codigo}/thumb-producto-{1-6}.webp
/uploads/articulos/{codigo}/thumb-etiqueta-{1-3}.webp
```

Servir archivos estaticos con `ServeStaticModule` de `@nestjs/serve-static` (paquete separado de `@nestjs/common`, hay que instalarlo). Los campos `imagenesProducto` e `imagenesEtiqueta` en el schema ya son `jsonb` con `string[]` -- guardar paths relativos ahi.

**Validacion via ParseFilePipe:**

- `MaxFileSizeValidator`: 5MB por imagen
- `FileTypeValidator`: `/image\/(jpeg|png|webp)/`
- sharp convierte todo a WebP al guardar (consistencia + compresion)

**Confidence:** HIGH -- NestJS docs oficiales confirman este patron, `@types/multer` ya presente en el proyecto.

### File Upload (Frontend)

| Technology                                 | Version | Purpose                          | Why                                                                                                       |
| ------------------------------------------ | ------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Nativo `<input type="file">` + React state | N/A     | Seleccion de archivos            | No necesita libreria. React Hook Form maneja el estado del formulario, el input nativo da el File object. |
| `fetch` / wrapper existente                | N/A     | Upload via `multipart/form-data` | FormData nativo del browser. No instalar axios ni nada extra.                                             |

**NO instalar** react-dropzone, filepond, uploadthing, ni similares. Para un grid de 9 slots de imagen (3 etiqueta + 6 producto) con click-to-upload, un `<input>` escondido con `accept="image/*"` es suficiente. La complejidad esta en el layout del grid, no en la libreria de upload.

**Confidence:** HIGH -- el proyecto ya usa fetch wrappers para la API.

### API Keys (Backend)

| Technology    | Version  | Purpose                          | Why                                                                                                   |
| ------------- | -------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `node:crypto` | Built-in | Generacion y hashing de API keys | `crypto.randomBytes(32)` para generar, `crypto.createHash('sha256')` para hashear. Zero dependencias. |

**Patron recomendado:**

1. **Generar:** `const raw = crypto.randomBytes(32).toString('base64url')` -- key visible al usuario una sola vez
2. **Prefijo:** `obj_` + raw (facilita identificar tokens Objetiva vs otros)
3. **Hashear:** `crypto.createHash('sha256').update(rawKey).digest('hex')` -- guardar SOLO el hash en DB
4. **Verificar:** hashear el Bearer token entrante y comparar con `crypto.timingSafeEqual`

**NO usar bcrypt/scrypt/argon2.** Las API keys son generadas con alta entropia (256 bits), no son passwords elegidos por humanos. SHA-256 es correcto y rapido para este caso. bcrypt seria incorrecto (lento sin beneficio de seguridad adicional para keys de alta entropia).

**Schema Drizzle para `api_keys`:**

```typescript
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(), // SHA-256 hex
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(), // "obj_xxxx" para identificacion visual
  activo: boolean('activo').notNull().default(true),
  ultimoUso: timestamp('ultimo_uso'),
  creadoPor: varchar('creado_por', { length: 255 }).notNull(), // email del admin que la creo
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // null = no expira
})
```

**Guard dual (JWT + API Key):** Modificar `JwtAuthGuard` para aceptar AMBOS: Supabase JWT (existente) O API Key (nuevo). Si el Bearer token empieza con `obj_`, validar contra tabla `api_keys`. Si no, validar JWT como ahora. Un solo guard, dos paths de validacion. Las API keys siempre tienen role `admin`.

**Confidence:** HIGH -- `node:crypto` es stdlib, patron bien establecido, verificado en multiples fuentes.

### Webhooks (Backend)

| Technology         | Version  | Purpose                                 | Why                                                                                       |
| ------------------ | -------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `node:crypto`      | Built-in | Firma HMAC-SHA256 de payloads           | Los endpoints receptores verifican autenticidad con `X-Webhook-Signature`.                |
| `@nestjs/schedule` | ^4.1     | Cron job para procesar cola de webhooks | Polling cada 30s de la tabla `webhook_deliveries`. Unica dependencia nueva para webhooks. |

**NO usar BullMQ/Redis.** BullMQ necesita Redis como infraestructura adicional. Este proyecto es un admin para comercios chicos -- genera tal vez 10-50 webhooks por dia. Una tabla PostgreSQL con un cron job (`@Cron('*/30 * * * * *')`) que procesa entregas pendientes es la solucion correcta para esta escala.

Si en el futuro el volumen crece significativamente, migrar a pg-boss (PostgreSQL-based job queue, sin necesidad de Redis) como paso intermedio antes de considerar BullMQ+Redis.

**Schema Drizzle para webhooks:**

```typescript
// Registros de webhook (configuracion del usuario)
export const webhooks = pgTable('webhooks', {
  id: serial('id').primaryKey(),
  url: varchar('url', { length: 500 }).notNull(),
  entidad: varchar('entidad', { length: 50 }).notNull(), // 'articulos' (extensible)
  evento: varchar('evento', { length: 50 }).notNull(), // 'create' | 'update' | 'delete'
  secreto: varchar('secreto', { length: 64 }).notNull(), // HMAC secret auto-generado
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Cola de entregas
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: serial('id').primaryKey(),
    webhookId: integer('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    payload: jsonb('payload').notNull(),
    estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
    // pendiente | entregado | fallido
    intentos: integer('intentos').notNull().default(0),
    maxIntentos: integer('max_intentos').notNull().default(5),
    proximoIntento: timestamp('proximo_intento').notNull().defaultNow(),
    ultimoError: text('ultimo_error'),
    httpStatus: integer('http_status'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [index('webhook_deliveries_estado_proximo_idx').on(table.estado, table.proximoIntento)]
)
```

**Patron de retry (exponential backoff con jitter):**

- Intento 1: inmediato
- Intento 2: ~30s
- Intento 3: ~2min
- Intento 4: ~15min
- Intento 5: ~1h
- Formula: `delay = baseDelay * 2^intento + random(0, baseDelay * 0.1)`
- Despues de 5 intentos fallidos: marcar como `fallido`, no reintentar
- Reintentar solo en: timeout, 5xx, connection error. NO reintentar en 4xx.

**Firma del payload:**

```typescript
const timestamp = Date.now().toString()
const signature = crypto
  .createHmac('sha256', webhook.secreto)
  .update(`${timestamp}.${JSON.stringify(payload)}`)
  .digest('hex')
// Headers enviados:
// X-Webhook-Signature: sha256={signature}
// X-Webhook-Timestamp: {timestamp}
```

**Outbound HTTP:** Usar `fetch` nativo de Node.js 18+ (ya disponible en el runtime del proyecto). No instalar axios/got/node-fetch.

**Confidence:** HIGH para el patron general. MEDIUM para `@nestjs/schedule` version exacta -- verificar compatibilidad con NestJS 10 al instalar.

### Columnas Configurables (Backend + Frontend)

| Technology                         | Version              | Purpose                             | Why                                                                      |
| ---------------------------------- | -------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| Campo JSONB en `business_settings` | N/A                  | Persistir config global de columnas | Un campo `columnasArticulos` en la tabla existente. Sin tabla nueva.     |
| TanStack Table `columnVisibility`  | ^8.21 (ya instalado) | Toggle de columnas en el frontend   | `@tanstack/react-table` ya soporta `columnVisibility` state nativamente. |

**NO agregar** librerias de estado global (zustand, jotai, recoil). La configuracion de columnas es global (no por usuario), se carga una vez del backend al montar la tabla, se guarda con un PATCH. `useState` + fetch es suficiente.

**Patron:**

- Agregar campo `columnasArticulos` (JSONB, `string[]`) a `business_settings`
- Default: `['codigo', 'nombre', 'modelo', 'medida', 'presentacion', 'precio', 'unidades', 'objeto']`
- Endpoint: `GET /api/configuracion/columnas-articulos` y `PATCH /api/configuracion/columnas-articulos`
- Frontend: poblar `columnVisibility` de TanStack Table desde la respuesta del API

**Confidence:** HIGH -- TanStack Table ya soporta esto nativamente, verificado en el codebase.

### Panel Lateral / Sheet (Frontend)

| Technology             | Version      | Purpose                                                   | Why                                                                                                                      |
| ---------------------- | ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Sheet (shadcn/ui)      | Ya instalado | Panel lateral para detalle de articulo                    | `sheet.tsx` ya existe en `apps/web/src/components/ui/`. Ajustar ancho de `sm:max-w-sm` a `sm:max-w-2xl` para el detalle. |
| ScrollArea (shadcn/ui) | Ya instalado | Scroll dentro del sheet para contenido largo (~30 campos) | `scroll-area.tsx` ya existe. Wrappear el contenido del sheet.                                                            |
| Tabs (shadcn/ui)       | Ya instalado | Organizar secciones (Datos, Imagenes, ERP, Stock)         | `tabs.tsx` ya existe.                                                                                                    |
| Separator (shadcn/ui)  | Ya instalado | Separar grupos de campos dentro de cada tab               | `separator.tsx` ya existe.                                                                                               |

**NO agregar** nuevas dependencias de UI. Todo lo necesario para el panel de detalle ya esta instalado. La unica modificacion necesaria es crear una variante wider del SheetContent (override de className, no nuevo componente).

**Confidence:** HIGH -- componentes verificados en el filesystem del proyecto.

## Resumen de Dependencias Nuevas

### Realmente necesarias (3 packages)

```bash
# Desde apps/backend/
pnpm add sharp @nestjs/schedule @nestjs/serve-static
```

| Package                | Proposito                                                  | Justificacion                                                           |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `sharp`                | Resize/compress imagenes a WebP, generar thumbnails        | Estandar de facto para image processing en Node.js. Tipos TS incluidos. |
| `@nestjs/schedule`     | Cron job cada 30s para procesar cola de webhook deliveries | Integracion nativa con NestJS DI y lifecycle hooks.                     |
| `@nestjs/serve-static` | Servir `/uploads/` como archivos estaticos                 | Necesario para que el frontend acceda a las imagenes subidas.           |

### NO agregar (evaluados y descartados)

| Package                        | Razon para excluir                                                        |
| ------------------------------ | ------------------------------------------------------------------------- |
| `multer`                       | Ya incluido via `@nestjs/platform-express`                                |
| `react-dropzone` / `filepond`  | Input nativo + React state suficiente para 9 slots fijos                  |
| `BullMQ` + `Redis`             | Overkill para 10-50 webhooks/dia. PostgreSQL queue es correcto            |
| `pg-boss`                      | Buena opcion pero innecesaria ahora. Escalar a esto si el volumen crece   |
| `bcrypt` / `argon2`            | API keys son alta entropia, SHA-256 es correcto y mas rapido              |
| `axios` / `got` / `node-fetch` | `fetch` nativo de Node.js 18+ es suficiente                               |
| `zustand` / `jotai`            | Config de columnas es server-side, no necesita store global               |
| `uuid` / `nanoid`              | `crypto.randomBytes()` + `crypto.randomUUID()` son nativos en Node.js 18+ |
| `@radix-ui/*` (nuevos)         | Todos los primitivos necesarios ya estan instalados                       |
| `uploadthing` / `tus`          | Protocolos de upload resumable innecesarios para imagenes de <5MB         |

## Alternatives Considered

| Category         | Recommended                           | Alternative               | Why Not                                                                                                    |
| ---------------- | ------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Image processing | `sharp`                               | jimp, imagemagick         | sharp es 10x mas rapido que jimp, no requiere binario externo como imagemagick. Tipos TS built-in.         |
| Webhook queue    | PostgreSQL table + `@nestjs/schedule` | BullMQ + Redis            | Redis es infra innecesaria para este volumen. Agrega operacion, monitoreo, y un punto de fallo.            |
| Webhook queue    | PostgreSQL table                      | pg-boss                   | pg-boss es bueno pero agrega abstraccion. Para 5 intentos con backoff, SQL directo es mas transparente.    |
| API key hash     | SHA-256 (`node:crypto`)               | bcrypt/argon2             | API keys son 256-bit random, no passwords humanos. Hash lento no agrega seguridad.                         |
| File upload UI   | Native `<input>` + FormData           | react-dropzone            | 9 slots fijos de imagen con click-to-upload no necesitan drag-and-drop.                                    |
| Job scheduler    | `@nestjs/schedule`                    | node-cron, agenda         | `@nestjs/schedule` se integra nativamente con NestJS DI, lifecycle, y testing.                             |
| Outbound HTTP    | `fetch` (Node.js nativo)              | axios, got                | Cero dependencias. El proyecto ya corre en Node.js 18+.                                                    |
| Static files     | `@nestjs/serve-static`                | nginx reverse proxy       | En desarrollo, serve-static es mas simple. En produccion, se puede poner nginx delante sin cambiar codigo. |
| Image format     | WebP (via sharp)                      | Mantener formato original | WebP comprime 25-35% mas que JPEG con calidad similar. Soporte universal en browsers modernos.             |

## Integracion con Stack Existente

### Guard dual (JWT + API Key)

El `JwtAuthGuard` existente (en `apps/backend/src/common/guards/jwt-auth.guard.ts`) necesita una bifurcacion temprana:

```
Bearer token recibido
  +-- Empieza con "obj_"? --> hashear, buscar en tabla api_keys
  |     +-- Encontrado y activo? --> request.user = { userId: 'api-key', email: key.creadoPor, role: 'admin' }
  |     +-- No encontrado? --> 401
  +-- No empieza con "obj_"? --> Validar JWT via JWKS (flujo actual sin cambios)
```

### Webhook dispatch desacoplado

Los servicios de articulos (`ArticulosService`) NO llaman HTTP directamente. Despues de create/update/delete exitoso, el servicio llama `webhookService.enqueue(entidad, evento, payload)` que inserta en `webhook_deliveries`. El cron job del `WebhookService` procesa la cola cada 30 segundos, completamente desacoplado del request del usuario.

### Multer config en modulo dedicado

Crear `UploadsModule` con:

- `MulterModule.register({ dest: './uploads/tmp' })` -- archivos temporales
- Servicio que mueve de tmp a path final, convierte a WebP con sharp, genera thumbnail
- Endpoint: `POST /api/articulos/:codigo/imagenes` con `FilesInterceptor`

### ServeStaticModule para /uploads

```typescript
// app.module.ts
ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), 'uploads'),
  serveRoot: '/uploads',
})
```

## Sources

### Official Documentation (HIGH confidence)

- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload) -- FileInterceptor, ParseFilePipe, validators
- [NestJS Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling) -- @nestjs/schedule, @Cron decorator
- [NestJS Serve Static](https://docs.nestjs.com/recipes/serve-static) -- ServeStaticModule configuration
- [Node.js Crypto API](https://nodejs.org/api/crypto.html) -- randomBytes, createHash, createHmac, timingSafeEqual

### Verified Patterns (MEDIUM confidence)

- [Roll Your Own API Keys (Dennis O'Keeffe, 2025)](https://www.dennisokeeffe.com/blog/2025-04-07-roll-your-own-api-keys) -- SHA-256 hash pattern for API keys
- [Webhook Retry Best Practices (Svix)](https://www.svix.com/resources/webhook-best-practices/retries/) -- Exponential backoff, jitter, retry codes
- [Webhook Retry Best Practices (Hookdeck)](https://hookdeck.com/webhooks/guides/webhook-retry-best-practices) -- HMAC signature pattern, timestamp inclusion

### Ecosystem Reference (LOW confidence, not adopted)

- [pg-boss](https://github.com/timgit/pg-boss) -- PostgreSQL job queue, documented as escalation path
- [BullMQ NestJS integration](https://docs.bullmq.io/guide/nestjs) -- Evaluated and rejected for this scale

---

_Stack research for v1.2: Articulos CRUD + API Keys + Webhooks_
_Researched: 2026-03-10_
_Conclusion: Solo 3 dependencias nuevas (sharp, @nestjs/schedule, @nestjs/serve-static). Todo lo demas ya esta en el proyecto o es stdlib de Node.js._
