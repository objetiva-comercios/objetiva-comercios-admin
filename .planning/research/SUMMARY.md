# Project Research Summary

**Project:** Objetiva Comercios Admin v1.2
**Domain:** Admin platform for commercial operations — Articulos CRUD completo, Image Management, API Keys, Webhooks, Columnas Configurables
**Researched:** 2026-03-10
**Confidence:** HIGH

## Executive Summary

v1.2 extiende un monorepo NestJS/Next.js existente (post-v1.1) con cinco capacidades: CRUD completo de articulos (edicion + soft-delete UI), gestion de imagenes de productos/etiquetas, API keys para integraciones externas, webhooks para notificar eventos, y columnas configurables en la tabla de articulos. La investigacion confirma que el stack existente cubre casi todo: solo se necesitan **3 dependencias nuevas** (`sharp`, `@nestjs/schedule`, `@nestjs/serve-static`). Multer ya esta incluido, TanStack Table ya soporta column visibility, y los componentes shadcn/ui necesarios ya estan instalados.

La arquitectura recomendada sigue patrones industriales bien establecidos: API keys con hash SHA-256 (patron GitHub/Stripe), webhooks con firma HMAC-SHA256 y entrega asincrona fire-and-forget, imagenes procesadas a WebP con thumbnails via sharp, y un CompositeAuthGuard que unifica JWT de Supabase con API key auth en un solo guard global. El refactoring del guard global (de instanciacion manual a `APP_GUARD` via DI) es el cambio arquitectural mas delicado porque afecta a todos los endpoints existentes.

Los riesgos principales son: (1) webhook delivery bloqueando respuestas CRUD si se implementa sincrono, (2) conflicto del guard JWT global al agregar API key auth, (3) vulnerabilidades de seguridad en file upload (path traversal, MIME spoofing), y (4) SSRF via URLs de webhook. Todos tienen mitigaciones claras documentadas en la investigacion y deben implementarse desde el primer commit de cada feature, no como mejoras posteriores.

## Key Findings

### Recommended Stack

Solo 3 paquetes nuevos para todo el milestone. El principio fue maximizar lo que ya existe en el proyecto y en Node.js stdlib.

**Dependencias nuevas:**

- `sharp` ^0.33: resize/compress imagenes a WebP, generar thumbnails -- estandar de facto, 10x mas rapido que jimp
- `@nestjs/schedule` ^4.1: cron job cada 30s para procesar cola de webhook deliveries -- integracion nativa con NestJS DI
- `@nestjs/serve-static`: servir `/uploads/` como archivos estaticos -- necesario para que el frontend acceda a imagenes

**Evaluados y descartados:** react-dropzone (input nativo suficiente), BullMQ+Redis (overkill para 10-50 webhooks/dia), bcrypt/argon2 (SHA-256 correcto para keys de alta entropia), axios/got (fetch nativo), zustand/jotai (config server-side).

Detalle completo: [STACK.md](./STACK.md)

### Expected Features

**Must have (table stakes):**

- Ruta de edicion `/articulos/[codigo]/editar` -- el boton "Editar" del sheet ya linkea ahi pero la ruta no existe
- Soft-delete con confirmacion via AlertDialog -- toggle activo/inactivo ya existe en backend
- Upload de imagenes con preview -- el form actual tiene placeholder "proximamente"
- Visualizacion de imagenes en el sheet de detalle
- UI para show/hide columnas en lista de articulos -- TanStack Table ya lo soporta nativamente
- CRUD completo de API keys (crear, listar, revocar) con copia unica del token
- CRUD de suscripciones webhook con secreto HMAC

**Should have (diferenciadores):**

- Grid de imagenes con slots etiquetados (3 etiqueta + 6 producto) en vez de gallery generico
- Boton "Enviar test" en webhooks para verificar conectividad sin crear articulo real
- Log de entregas de webhook con badges de status
- Margen calculado automaticamente en precios (display-only)

**Defer (v2+):**

- Crop/resize en frontend, drag-and-drop reorder, bulk import CSV
- Rate limiting por API key, OAuth2/token refresh, permisos granulares por key
- Webhook fan-out, webhooks para entidades distintas de articulos
- Gestion de imagenes desde mobile (solo read-only)

Detalle completo: [FEATURES.md](./FEATURES.md)

### Architecture Approach

La arquitectura agrega 2 modulos nuevos (`ApiKeysModule`, `WebhooksModule`), modifica 2 existentes (`ArticulosModule` para upload + webhook emission, `SettingsModule` para column config), y refactoriza el guard global a un CompositeAuthGuard con DI. Se crean 3-4 tablas nuevas (`api_keys`, `webhook_subscriptions`, `webhook_deliveries`, opcionalmente `column_configs`). El patron clave es que API key auth produce el mismo shape de `AuthenticatedUser` en `request.user`, lo que hace que `@Roles()` funcione sin cambios para ambos tipos de auth.

**Componentes principales:**

1. `CompositeAuthGuard` -- reemplaza JwtAuthGuard, intenta JWT primero, fallback a API key
2. `ApiKeysModule` -- CRUD keys, hash SHA-256, prefix para identificacion visual
3. `WebhooksModule` -- CRUD suscripciones, cola de entrega en PostgreSQL, retry con backoff exponencial
4. Upload de imagenes en `ArticulosModule` -- multer memory storage + sharp + filesystem
5. Column config en `SettingsModule` -- config global guardada en DB, consumida por TanStack Table

Detalle completo: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Critical Pitfalls

1. **Webhook delivery bloqueando CRUD** -- Usar fire-and-forget con EventEmitter/catch, nunca `await fetch()` dentro del handler. Disenar async desde el primer dia.
2. **Guard JWT global en conflicto con API key auth** -- Crear CompositeAuthGuard con `APP_GUARD` via DI (no `useGlobalGuards` manual). Mantener mismo shape de `request.user` para ambos paths.
3. **API keys en texto plano** -- Almacenar SOLO hash SHA-256, mostrar key completa una unica vez al crear. Indice UNIQUE en `key_hash`.
4. **Validacion de imagenes solo por MIME type** -- Usar `ParseFilePipe` con `FileTypeValidator` (magic bytes) + `MaxFileSizeValidator`. Nunca confiar en `file.mimetype` del cliente.
5. **Path traversal y colision de nombres** -- Nunca usar `file.originalname`. Generar UUID para filename. Validar que `codigo` no contenga `..`, `/`, `\`.
6. **SSRF via webhook URLs** -- Rechazar IPs privadas/reservadas al registrar webhook. Re-validar IP al momento de cada entrega (DNS rebinding).

Detalle completo: [PITFALLS.md](./PITFALLS.md)

## Implications for Roadmap

Based on research, suggested phase structure (7 phases):

### Phase 1: Articulos CRUD Completo (UI)

**Rationale:** La base ya existe (form, controller, endpoints). Solo falta wiring. Desbloquea el CRUD sin imagenes y es la feature mas basica esperada.
**Delivers:** Ruta editar funcional, soft-delete con confirmacion, toasts de feedback
**Addresses:** Table stakes -- edicion y eliminacion de articulos
**Avoids:** Pitfall 7 (formulario sin agrupacion) -- ya resuelto en v1.1 con SectionHeader

### Phase 2: Image Upload Backend

**Rationale:** Infraestructura necesaria antes de cualquier UI de imagenes. Sigue el patron existente de `FileInterceptor` del settings/logo.
**Delivers:** Endpoints `POST/DELETE /api/articulos/:codigo/imagenes/:tipo`, conversion a WebP, thumbnails automaticos, static file serving
**Uses:** `sharp`, `@nestjs/serve-static`, multer (ya incluido)
**Avoids:** Pitfall 4 (MIME validation), Pitfall 5 (path traversal, colision de nombres)

### Phase 3: Image Upload Frontend

**Rationale:** Depende de Phase 2 (backend). La feature mas visible para el usuario -- reemplaza el placeholder "proximamente".
**Delivers:** Grid de slots etiquetados (3 etiqueta + 6 producto), upload con preview, eliminar individual
**Addresses:** Table stakes (upload de imagenes) + diferenciador (grid con slots etiquetados)

### Phase 4: Columnas Configurables

**Rationale:** Independiente de las demas features. TanStack Table ya soporta column visibility. Mejora UX inmediata en la lista existente.
**Delivers:** Dropdown de columnas, persistencia en businessSettings, config global
**Uses:** TanStack Table `columnVisibility` (ya instalado), campo JSONB en businessSettings

### Phase 5: API Keys

**Rationale:** Modulo independiente, pero necesario antes de webhooks (los consumidores externos necesitan auth). Incluye el refactoring critico del guard global.
**Delivers:** CRUD API keys, CompositeAuthGuard (JWT + API key), pagina en Settings
**Avoids:** Pitfall 2 (keys en texto plano), Pitfall 3 (guard JWT en conflicto)
**Implements:** CompositeAuthGuard, ApiKeysModule

### Phase 6: Webhooks CRUD + Delivery Engine

**Rationale:** Depende de que ArticulosService exista (ya existe desde v1.1) y se beneficia de API Keys (Phase 5). Es la feature mas compleja del milestone.
**Delivers:** CRUD suscripciones, secreto HMAC, entrega asincrona con retry exponencial, log de deliveries, boton "Enviar test"
**Uses:** `@nestjs/schedule`, `node:crypto` HMAC, cola PostgreSQL
**Avoids:** Pitfall 1 (webhook bloqueando CRUD), Pitfall 6 (SSRF)

### Phase 7: Polish y Verificacion

**Rationale:** Fase de cierre para integrar detalles que cruzan features: imagenes en el sheet de detalle, margen calculado en precios, cleanup de imagenes huerfanas al borrar articulo.
**Delivers:** Imagenes en ArticuloSheet, margen calculado, verificacion end-to-end de todo el milestone

### Phase Ordering Rationale

- **CRUD UI primero** porque tiene cero dependencias de backend nuevo y entrega valor inmediato
- **Imagenes backend antes que frontend** por dependencia directa (el frontend necesita donde subir)
- **Columnas configurables antes de API keys** porque es rapido, independiente, y mejora la UX de la lista que ya existe
- **API keys antes de webhooks** porque: (a) el refactoring del guard global es mejor hacerlo temprano, (b) los consumidores de webhooks necesitan autenticarse
- **Webhooks al final** porque es la feature mas compleja y depende de que el stack de auth dual ya funcione
- **Polish al final** para integrar detalles cross-feature que se descubren durante implementacion

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 5 (API Keys):** El refactoring del guard global de `useGlobalGuards()` a `APP_GUARD` via DI es el cambio mas delicado. Verificar que todos los tests existentes pasen despues del refactoring. Considerar `/gsd:research-phase`.
- **Phase 6 (Webhooks):** La cola PostgreSQL con retry exponencial y el cron job de `@nestjs/schedule` necesitan diseno cuidadoso. El event emitting en ArticulosService es un patron nuevo en este codebase.

Phases with standard patterns (skip research-phase):

- **Phase 1 (CRUD UI):** Todo el wiring ya existe, solo falta la page y el dialog.
- **Phase 2-3 (Imagenes):** El patron de FileInterceptor + ParseFilePipe ya esta usado en settings/logo. sharp es bien documentado.
- **Phase 4 (Columnas):** TanStack Table columnVisibility es nativo y bien documentado.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                             |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | Solo 3 deps nuevas, todas con docs oficiales. Verificado contra el codebase actual.                                               |
| Features     | HIGH       | Basado en analisis directo del codebase + patrones UX establecidos. Dependencias mapeadas.                                        |
| Architecture | HIGH       | Analisis directo de guards, modules, schema existente. Patrones NestJS verificados en docs oficiales.                             |
| Pitfalls     | HIGH       | Fuentes multiples (docs oficiales, articulos de seguridad, best practices de la industria). Cada pitfall con prevencion concreta. |

**Overall confidence:** HIGH

### Gaps to Address

- **`@nestjs/schedule` compatibilidad con NestJS 10:** STACK.md marca confidence MEDIUM para la version exacta. Verificar al instalar.
- **Multer memory vs disk storage:** ARCHITECTURE.md recomienda memory storage (patron existente del logo), pero PITFALLS.md advierte que 6 imagenes x 5MB = 30MB en RAM. Resolver durante planning de Phase 2: usar disk storage si se espera upload simultaneo frecuente.
- **Static file serving con auth:** PITFALLS.md advierte que imagenes publicas pueden exponer info comercial. Decidir en Phase 2 si las imagenes requieren auth o si son publicas. Recomendacion: publicas para v1.2 (simplifica mobile), documentar la decision.
- **Webhook delivery: EventEmitter vs tabla + cron:** PITFALLS.md sugiere EventEmitter fire-and-forget, STACK.md y ARCHITECTURE.md recomiendan tabla PostgreSQL + `@nestjs/schedule` cron. Recomendacion: **usar la tabla + cron** (mas robusto, soporta retry, visible en DB). El EventEmitter es solo para enqueue.

## Sources

### Primary (HIGH confidence)

- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload) -- FileInterceptor, ParseFilePipe, validators
- [NestJS Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling) -- @nestjs/schedule, @Cron decorator
- [NestJS Serve Static](https://docs.nestjs.com/recipes/serve-static) -- ServeStaticModule configuration
- [NestJS Authentication](https://docs.nestjs.com/security/authentication) -- guards, APP_GUARD, composite auth
- [Node.js Crypto API](https://nodejs.org/api/crypto.html) -- randomBytes, createHash, createHmac, timingSafeEqual
- Direct codebase analysis: guards, modules, schema, controllers, frontend components

### Secondary (MEDIUM confidence)

- [API Key Best Practices (Dennis O'Keeffe, Zuplo, OneUptime)](./STACK.md#sources) -- SHA-256 hash pattern
- [Webhook Best Practices (Svix, Hookdeck, webhooks.fyi)](./STACK.md#sources) -- HMAC signing, retry, SSRF prevention
- [NestJS dual auth pattern (Medium)](https://medium.com/@alpercitak/nest-js-authenticate-with-both-api-key-and-jwt-4a22bf7b3049) -- composite guard
- [Standard Webhooks spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) -- firma y entrega

### Tertiary (LOW confidence)

- Webhook volume estimates (10-50/dia) -- inferido del tipo de negocio, no medido
- pg-boss como escalation path -- documentado pero no evaluado en profundidad

---

_Research completed: 2026-03-10_
_Ready for roadmap: yes_
