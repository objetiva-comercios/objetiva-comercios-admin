# Pitfalls Research

**Domain:** File uploads, API Keys y Webhooks para admin platform NestJS existente
**Researched:** 2026-03-10
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Webhook delivery bloqueando la respuesta CRUD

**What goes wrong:**
El endpoint `POST /api/articulos` hace el insert en DB y luego intenta entregar webhooks sincrónicamente antes de responder al cliente. Si el servidor destino del webhook tarda 10 segundos o hace timeout, el usuario espera 10+ segundos para crear un artículo. En el peor caso, si el destino está caído y hay 5 suscriptores, el CRUD timeout completo.

**Why it happens:**
Es la implementación "obvia" -- después del insert, iterar los webhooks y hacer `fetch()` a cada URL. Funciona en dev con un solo webhook rápido, pero se rompe en producción con destinos lentos o caídos.

**How to avoid:**
Desacoplar completamente la entrega de webhooks del ciclo request/response del CRUD. Dos opciones:

1. **Cola con BullMQ + Redis** (recomendado a futuro): El servicio CRUD emite un evento, un job se encola en Redis, un worker separado entrega los webhooks con reintentos exponenciales. El CRUD responde inmediatamente.
2. **Fire-and-forget con EventEmitter** (viable para v1.2): `eventEmitter.emit('articulo.created', payload)` y un listener hace los HTTP calls en background. Sin garantía de entrega ni reintentos, pero no bloquea.

Para v1.2 con scope pequeño (solo artículos), el EventEmitter de NestJS es suficiente. BullMQ es necesario cuando los webhooks sean críticos o haya muchos suscriptores.

**Warning signs:**

- Response times del CRUD suben cuando hay webhooks configurados
- Timeouts intermitentes en creación/edición de artículos
- Tests de artículos lentos porque esperan respuestas HTTP externas

**Phase to address:**
Fase de Webhooks -- diseñar como async desde el primer día, nunca como llamada síncrona.

---

### Pitfall 2: API Keys almacenadas en texto plano en la base de datos

**What goes wrong:**
Se guarda la API key tal cual en la tabla `api_keys`. Si la DB se compromete (SQL injection, backup expuesto, acceso indebido), todas las keys están expuestas y el atacante tiene acceso completo a la API.

**Why it happens:**
Las API keys parecen "no tan sensibles" como passwords. El desarrollador piensa "es solo un token interno" y lo guarda como varchar. Además, necesita mostrar la key al usuario al crearla, lo que lleva a pensar que debe ser recuperable.

**How to avoid:**

- Generar la key con `crypto.randomBytes(32).toString('hex')` (64 chars hex, alta entropía)
- Almacenar SOLO el hash SHA-256 de la key (NO bcrypt -- las API keys tienen entropía suficiente, SHA-256 es rápido para lookup y seguro para keys de 256+ bits)
- Mostrar la key completa SOLO una vez al crearla, con advertencia clara de "no se puede recuperar"
- Guardar un prefijo visible (primeros 8 chars) para identificación en la UI: `obj_a1b2c3d4...`
- Índice UNIQUE en la columna `key_hash` para búsqueda rápida

Esquema recomendado:

```
api_keys: id, name, key_hash (sha256, unique), key_prefix (8 chars), role (admin/viewer), created_by, created_at, last_used_at, expires_at, revoked_at
```

**Warning signs:**

- La tabla `api_keys` tiene una columna `key` o `token` de tipo varchar sin hash
- Se puede "ver" la key completa desde la UI después de crearla
- No hay columna `key_hash` en el schema

**Phase to address:**
Fase de API Keys -- el schema y la lógica de hashing deben implementarse desde el primer commit.

---

### Pitfall 3: Guard JWT global en conflicto con API Key auth

**What goes wrong:**
El proyecto tiene `JwtAuthGuard` como guard global que valida Supabase JWTs via JWKS. Al agregar API Keys, hay dos problemas:

1. Si se pone el API Key guard como OTRO guard global, ambos corren y uno falla (el JWT guard rechaza requests con API key porque no tiene Bearer JWT válido de Supabase)
2. Si se marca las rutas de API key como `@Public()`, se pierde toda autenticación
3. El `request.user` esperado por `RolesGuard` tiene shape diferente según venga de JWT o API key

**Why it happens:**
El guard JWT actual (en `jwt-auth.guard.ts`) está diseñado para un solo tipo de autenticación -- valida contra Supabase JWKS con issuer y audience específicos. Agregar un segundo tipo de auth requiere refactorizar el flujo, no solo "agregar otro guard".

**How to avoid:**
Crear un **CompositeAuthGuard** que reemplace al `JwtAuthGuard` global:

1. Inspecciona el header `Authorization`:
   - Si empieza con `Bearer ey...` (JWT, base64-encoded) -> valida con Supabase JWKS (lógica actual)
   - Si empieza con `Bearer obj_...` (API key con prefijo conocido) -> busca SHA-256 hash en tabla `api_keys`, verifica que no esté revocada ni expirada
2. Ambos paths terminan seteando `request.user` con la misma interfaz `AuthenticatedUser` (`userId`, `email`, `role`)
3. Para API keys, el `role` se define al crear la key (admin/viewer) y se asigna al `request.user.role`
4. El `RolesGuard` existente funciona sin cambios porque `request.user` tiene la misma forma
5. Agregar `request.authMethod: 'jwt' | 'apikey'` para distinguir el origen de la autenticación si se necesita

**Warning signs:**

- Tests de endpoints existentes empiezan a fallar después de agregar API key auth
- `request.user` es `undefined` en algunos paths
- El `RolesGuard` tira `ForbiddenException` para requests autenticados con API key

**Phase to address:**
Fase de API Keys -- implementar el CompositeAuthGuard ANTES de crear las rutas de gestión de API keys.

---

### Pitfall 4: Validación de imágenes solo por MIME type del header

**What goes wrong:**
Se valida `file.mimetype === 'image/jpeg'` que viene del header `Content-Type` del cliente. Un atacante sube un archivo `.php`, `.html` o ejecutable renombrándolo a `.jpg` y seteando el Content-Type a `image/jpeg`. Si el servidor sirve el archivo directamente, puede ejecutar código malicioso o XSS.

**Why it happens:**
Multer expone `file.mimetype` que es el valor declarado por el cliente, no verificado. Es la validación más fácil y parece suficiente en un test rápido.

**How to avoid:**
Validación en tres capas:

1. **Extensión**: whitelist de extensiones (.jpg, .jpeg, .png, .webp)
2. **Magic bytes**: leer los primeros bytes del archivo y verificar la firma (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`). NestJS `FileTypeValidator` usa magic numbers internamente.
3. **Tamaño máximo**: 5MB por imagen (configurable), 50MB por request total
4. **Servir con Content-Type forzado** basado en extensión validada, no en metadata del upload

```typescript
new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
  ],
})
```

**Warning signs:**

- Solo se valida `file.mimetype` sin verificar magic bytes
- Se sirven archivos con el Content-Type original del upload
- No hay límite de tamaño configurado en el endpoint

**Phase to address:**
Fase de Upload de Imágenes -- implementar validación completa en el pipe del endpoint.

---

### Pitfall 5: Colisión de nombres de archivo y path traversal

**What goes wrong:**
Dos usuarios suben `foto.jpg` y el segundo sobrescribe al primero. O peor: un atacante sube un archivo con nombre `../../../etc/cron.d/malicious` y escribe fuera del directorio de uploads.

**Why it happens:**
Se usa `file.originalname` directamente como nombre de archivo destino, o se construye el path con string concatenation sin sanitización.

**How to avoid:**

- **NUNCA** usar `file.originalname` como nombre de archivo. Generar UUID: `${uuidv4()}.${ext}`
- Estructura de directorio predecible: `uploads/articulos/{codigo}/producto/{uuid}.jpg` y `uploads/articulos/{codigo}/etiqueta/{uuid}.jpg`
- Usar `path.join()` para construir rutas, nunca concatenación de strings
- Validar que el `codigo` del artículo no contenga `..`, `/`, `\` o null bytes antes de usarlo en paths
- Configurar Multer con `destination` absoluto, no relativo

```typescript
storage: diskStorage({
  destination: '/var/data/objetiva/uploads',
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})
```

**Warning signs:**

- `file.originalname` aparece en el path de destino
- Los archivos se guardan dentro del directorio del proyecto (`apps/backend/uploads/`)
- El path se construye con template literals sin sanitización del `codigo`

**Phase to address:**
Fase de Upload de Imágenes -- configurar Multer correctamente desde el inicio.

---

### Pitfall 6: SSRF via webhook URLs

**What goes wrong:**
Un usuario admin configura un webhook con URL `http://169.254.169.254/latest/meta-data/` (AWS metadata endpoint), `http://localhost:5432/` (PostgreSQL), o `http://10.0.0.1/admin` (servicio interno). El servidor hace la request y expone datos internos de la infraestructura.

**Why it happens:**
Se acepta cualquier URL que el usuario ingresa sin validar que apunta a un host externo legítimo. En desarrollo todo funciona porque solo se prueban URLs públicas.

**How to avoid:**
Validación de URL del webhook al momento de REGISTRAR (no solo al entregar):

1. Parsear la URL y resolver el DNS
2. Rechazar IPs privadas/reservadas: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `::1`, `fc00::/7`
3. Rechazar esquemas que no sean `https://` (excepto en desarrollo con flag explícito)
4. Al momento de ENTREGAR, re-validar la IP resuelta (el DNS puede cambiar entre registro y entrega -- DNS rebinding attack)

Para v1.2 con usuarios admin internos, una validación básica (rechazar IPs privadas + solo HTTPS en prod) es suficiente. No necesita un proxy dedicado tipo smokescreen.

**Warning signs:**

- Se puede registrar `http://localhost:...` como webhook URL
- No hay validación de URL al crear el webhook
- La entrega se hace sin verificar la IP resuelta

**Phase to address:**
Fase de Webhooks -- validación de URL en el servicio de creación de webhooks.

---

### Pitfall 7: Formulario de artículos con ~30 campos sin agrupación UX

**What goes wrong:**
Se renderiza un formulario con 30+ campos en una sola página, el usuario se abruma, no sabe qué es requerido, pierde scroll position, y el submit falla por validación de un campo que no ve. La experiencia es tan mala que los usuarios prefieren no usar el sistema.

**Why it happens:**
Se implementan los campos uno a uno desde el schema de DB sin pensar en la experiencia de usuario. Cada campo existe en la DB, así que "hay que mostrarlo". No hay diseño de UX previo.

**How to avoid:**
Agrupar en secciones colapsables/tabs con prioridad:

1. **Identificación** (siempre visible): codigo, nombre, sku, codigoBarras -- 4 campos
2. **Propiedades** (expandible): marca, modelo, talle, color, material, presentacion, medida -- 7 campos
3. **Precios** (expandible): precio, costo -- 2 campos
4. **Imágenes** (tab separado o sección dedicada): imagenesProducto, imagenesEtiqueta -- zona de upload con preview
5. **ERP** (colapsado por defecto, solo admin): erpId, erpCodigo, erpNombre, erpPrecio, erpCosto, erpUnidades, erpDatos, erpSincronizado, erpFechaSync -- 9 campos
6. **Origen/Sistema** (colapsado): originSource, originSyncId, originSyncedAt, activo -- 4 campos
7. **Observaciones**: observaciones -- 1 campo, textarea

Validación inline al perder foco (blur), no solo al submit. Indicar campos requeridos claramente. Mantener scroll position al mostrar errores.

**Warning signs:**

- El formulario tiene más de 10 campos visibles simultáneamente sin agrupación
- No hay indicación visual de qué secciones tienen errores
- El usuario tiene que scrollear mucho para encontrar un error de validación

**Phase to address:**
Fase de Artículos CRUD completo -- diseñar la UX del formulario ANTES de implementar campos.

---

## Technical Debt Patterns

| Shortcut                                             | Immediate Benefit                          | Long-term Cost                                                                                       | When Acceptable                                                                                        |
| ---------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Webhooks con EventEmitter (sin cola persistente)     | Sin Redis, implementación simple           | No hay reintentos si el proceso muere, sin dead-letter queue                                         | v1.2 con pocos suscriptores. Migrar a BullMQ cuando los webhooks sean críticos para integraciones      |
| Imágenes en filesystem local sin CDN                 | Sin infra adicional, rápido de implementar | No escala horizontalmente, se pierde en redeploy sin volumen persistente, sin optimización de tamaño | Aceptable para v1.2 si el deploy usa volumen persistente. Migrar a S3/minio cuando se necesite escalar |
| API key sin expiración por defecto                   | Menos fricción UX, "just works"            | Keys olvidadas activas indefinidamente, riesgo de seguridad acumulativo                              | Nunca -- siempre poner expiración default (90 días) con opción de renovar                              |
| Webhook sin firma HMAC                               | Menos código, implementación más rápida    | Receptores no pueden verificar autenticidad del payload, vulnera integridad                          | Solo en MVP interno. Agregar HMAC antes de que terceros consuman webhooks                              |
| Guardar URLs de imagen como paths relativos en jsonb | Simple, funciona en desarrollo             | Mobile necesita URLs absolutas, migrar después es tedioso                                            | Nunca -- guardar siempre path relativo al root de uploads y construir URL completa en el serializer    |

## Integration Gotchas

| Integration                             | Common Mistake                                                                                                                                        | Correct Approach                                                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multer + NestJS ParseFilePipe           | `ParseFilePipe` como pipe global no se aplica a archivos Multer; confusión entre `@UploadedFile()` y `@Body()` mezclando campos de texto con archivos | Usar `@UploadedFile(new ParseFilePipe({...}))` directamente en el parámetro del método. Campos de texto del formulario van en `@Body()` separado                 |
| API Keys + `request.user` tipado        | API key auth setea un user sin `userId` real (no hay Supabase user), pero código existente asume `request.user.userId` siempre es UUID válido         | Definir un `userId` sintético para API keys (e.g., `apikey:{key_id}`) y asegurar que logs/audit trail lo manejen                                                 |
| ServeStaticModule + rutas API           | `ServeStaticModule` sirve archivos estáticos y puede interceptar rutas de API si el prefijo colisiona                                                 | No usar ServeStaticModule para uploads. Crear un controller dedicado `UploadsController` con auth guard que lea y sirva archivos. Ruta: `GET /api/uploads/:path` |
| Webhook payload + serialización Drizzle | Timestamps de Drizzle son `Date` objects, `numeric` son strings. Al serializar a JSON el payload cambia de tipos                                      | Definir un schema de payload explícito con tipos consistentes. No pasar el objeto Drizzle raw al webhook                                                         |
| Multer multipart + Capacitor mobile     | Capacitor `@capacitor/http` plugin no envía `multipart/form-data` correctamente en algunas versiones; headers y boundary se corrompen                 | Usar el `fetch()` nativo del WebView (no el plugin HTTP de Capacitor) con `FormData` estándar. En Capacitor 5+ el fetch nativo funciona bien para multipart      |
| Webhook + artículo con texto PK en URL  | El `codigo` de artículo puede tener caracteres especiales que rompen URLs del webhook payload                                                         | URL-encode el `codigo` cuando se incluya en links dentro del payload. Usar `encodeURIComponent()`                                                                |

## Performance Traps

| Trap                                               | Symptoms                                                                                                                      | Prevention                                                                                                                                                                  | When It Breaks                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Listar artículos incluyendo campos de imágenes     | GET /articulos trae jsonb de imagenes_producto + imagenes_etiqueta para cada artículo, respuesta de 500KB+ para 100 artículos | No incluir campos de imágenes en el listado. Endpoint separado `GET /articulos/:codigo/imagenes` o query param `?fields=imagenes`                                           | >100 artículos con imágenes                 |
| Webhook fan-out síncrono en el handler del CRUD    | CRUD response time = sum(webhook delivery times). 3 webhooks x 3s timeout = 9s extra mínimo                                   | Async delivery con EventEmitter. Timeout máximo de 5s por webhook con abort                                                                                                 | >2 webhooks configurados O un destino lento |
| Validación de imágenes con memoryStorage de Multer | Multer guarda archivo completo en memoria antes de validar. 6 imágenes de producto x 5MB = 30MB en RAM por request            | Usar `diskStorage` (no `memoryStorage`). Validar magic bytes leyendo primeros 16 bytes del archivo en disco                                                                 | >3 archivos simultáneos o >5MB por archivo  |
| API key lookup sin índice en hash                  | SHA-256 lookup hace full table scan. Cada request autenticado por API key paga el costo                                       | Índice UNIQUE en columna `key_hash`. La tabla será pequeña pero el lookup es por-request                                                                                    | >50 API keys o alta concurrencia            |
| Webhook retry storm en batch updates               | 100 artículos actualizados en batch generan 100 webhooks x N suscriptores x 3 reintentos = miles de HTTP calls                | Rate limit por destino URL (max 10 concurrent), debounce/batch de eventos del mismo tipo en ventana de 5s, circuit breaker (auto-disable después de 10 fallos consecutivos) | Batch updates + destino caído               |
| Imágenes sin resize/optimización                   | Se almacenan fotos de 4000x3000px tal cual del celular. Listar artículos con thumbnails descarga 3MB por imagen               | Generar thumbnail (300px) al subir. Almacenar original + thumbnail. Listar con thumbnail, detalle con original                                                              | >20 artículos con fotos de celular          |

## Security Mistakes

| Mistake                                         | Risk                                                                                                                         | Prevention                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Servir uploads como archivos estáticos sin auth | Cualquiera con la URL puede ver imágenes de artículos; posible info comercial sensible (precios en etiquetas OCR)            | Servir desde controller con guard de auth, o aceptar el riesgo documentando que las imágenes de producto son públicas |
| API key visible en logs del servidor            | NestJS LoggerMiddleware o interceptor de logging captura headers incluyendo Authorization; la API key completa queda en logs | Sanitizar headers de auth en el logger: mostrar solo `Bearer obj_a1b2...` (prefijo). Nunca loguear el valor completo  |
| Webhook secret compartido entre suscriptores    | Si un suscriptor filtra su secret, puede forjar webhooks para todos los demás                                                | Generar un `signing_secret` HMAC único por suscriptor. Cada registro en `webhooks` tiene su propio secret             |
| Directorio de uploads dentro del proyecto       | `apps/backend/uploads/` se borra con `git clean`, redeploy, o rebuild del contenedor                                         | Directorio externo: `/var/data/objetiva/uploads/` con volumen Docker persistente. Variable de entorno `UPLOADS_DIR`   |
| API key sin scope ni permisos granulares        | Una key con acceso total permite que una integración externa borre artículos, modifique settings, etc.                       | Mínimo: campo `role` (admin/viewer) en la key. Ideal: scopes por recurso (`articulos:read`, `articulos:write`)        |
| DNS rebinding en webhook delivery               | Se valida IP al registrar webhook, pero al entregar (horas después) el DNS resuelve a IP interna                             | Re-resolver DNS y re-validar IP al momento de CADA entrega, no solo al registrar                                      |
| Upload sin rate limiting                        | Un usuario o bot sube miles de imágenes llenando el disco del servidor                                                       | Rate limit en el endpoint de upload: max 20 uploads/minuto por usuario. Throttler de NestJS                           |

## UX Pitfalls

| Pitfall                                                  | User Impact                                                                                                    | Better Approach                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| No mostrar progreso de upload de imágenes                | El usuario no sabe si el upload funciona, hace click múltiples veces, duplica uploads                          | Barra de progreso por imagen con `XMLHttpRequest.upload.onprogress`. Desactivar botón de submit durante upload                               |
| API key mostrada una vez sin botón de copiar             | El usuario ve la key, va a configurar su integración, y cuando vuelve ya no puede verla                        | Modal con botón "Copiar al portapapeles", checkbox "Ya copié mi key" habilita el botón de cerrar. Advertencia de que no se mostrará de nuevo |
| Errores de validación del formulario sin indicar sección | Submit falla con "Error en campo erpCodigo" pero el usuario no sabe en qué sección está                        | Badge rojo en sección con error, auto-expandir sección del primer error, scroll automático al campo                                          |
| Webhooks sin feedback de estado                          | El usuario configura un webhook y nunca sabe si funciona                                                       | Mostrar último intento de entrega (fecha, HTTP status, response time) en la lista de webhooks. Badge verde/amarillo/rojo                     |
| Delete de artículo sin advertir sobre webhooks           | El usuario borra un artículo, se dispara webhook.delete, pero no sabe que se notificará a sistemas externos    | Diálogo de confirmación que menciona: "Se notificará a N webhooks sobre la eliminación"                                                      |
| Upload de imagen sin preview antes de guardar            | El usuario sube 6 imágenes sin verlas, guarda, y una estaba equivocada                                         | Preview en thumbnail antes de submit. Drag-and-drop para reordenar. Botón X para eliminar antes de guardar                                   |
| Formulario pierde estado al navegar                      | El usuario llena 20 campos, navega a otra sección para consultar un dato, y al volver el formulario está vacío | Persistir estado del formulario en memoria (React state) o sessionStorage. Confirmar antes de navegar si hay cambios sin guardar             |

## "Looks Done But Isn't" Checklist

- [ ] **File uploads:** Se sube la imagen pero no se limpia al borrar el artículo -- verificar que DELETE del artículo borre archivos del filesystem
- [ ] **File uploads:** Las URLs de imagen son relativas (`uploads/articulos/...`) pero el mobile necesita absolutas (`https://api.example.com/uploads/...`) -- verificar que el serializer construya URL completa usando `BACKEND_URL`
- [ ] **File uploads:** Se suben imágenes pero no se pueden eliminar individualmente -- verificar endpoint `DELETE /api/articulos/:codigo/imagenes/:filename`
- [ ] **API Keys:** Se puede crear una key pero no revocarla -- verificar endpoint y UI de revocación con confirmación
- [ ] **API Keys:** La key funciona para auth pero `last_used_at` nunca se actualiza -- verificar que el CompositeAuthGuard actualice el timestamp (async, non-blocking)
- [ ] **API Keys:** Se puede crear key con rol admin sin ser admin -- verificar que el endpoint de creación requiera rol admin
- [ ] **Webhooks:** Se entrega el webhook pero no se registra el intento -- verificar tabla `webhook_deliveries` con status code, response body (truncado), y timestamp
- [ ] **Webhooks:** El payload del webhook no incluye suficiente info -- verificar que incluye: evento, timestamp, artículo completo (o campos cambiados para update)
- [ ] **Webhooks:** Funciona para create pero no para update/delete -- verificar los tres eventos con tests
- [ ] **Webhooks:** No hay forma de re-enviar un webhook fallido -- verificar botón "Reintentar" en la UI de deliveries
- [ ] **Formulario:** Los campos ERP se muestran a viewers que no deberían editarlos -- verificar que campos ERP sean read-only para rol viewer
- [ ] **Imágenes:** Se suben imágenes pero no se puede reordenar el array en `imagenes_producto` -- verificar drag-and-drop o flechas
- [ ] **Imágenes:** Se sube una imagen corrupta y el frontend muestra broken image -- verificar que la validación de magic bytes rechace archivos no válidos

## Recovery Strategies

| Pitfall                                                 | Recovery Cost | Recovery Steps                                                                                                                                                                       |
| ------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API keys en texto plano en DB                           | MEDIUM        | Script de migración: generar SHA-256 de cada key existente, crear columna `key_hash`, popular, borrar columna plaintext. Las keys siguen funcionando porque el hash se calcula igual |
| Webhook síncrono bloqueando CRUD                        | MEDIUM        | Extraer lógica de entrega a un EventEmitter listener. Refactoring del servicio, no del controller ni del schema. ~2 horas de trabajo                                                 |
| Imágenes con nombres originales (colisiones existentes) | HIGH          | Renombrar todos los archivos a UUID, actualizar referencias en `imagenes_producto`/`imagenes_etiqueta` del jsonb. Requiere script de migración + downtime                            |
| Guard JWT no soporta API keys                           | MEDIUM        | Crear CompositeAuthGuard, registrar como APP_GUARD reemplazando JwtAuthGuard. Tests existentes no deberían romperse si el path de JWT no cambia                                      |
| Imágenes huérfanas (artículos borrados, archivos no)    | LOW           | Script periódico que lista archivos en uploads/ y verifica contra jsonb de artículos. Los no referenciados van a una carpeta de "orphaned" y se borran después de 30 días            |
| SSRF en webhooks ya registrados                         | LOW           | Agregar validación de IP al servicio de entrega (no solo al registro). No requiere cambio de schema ni migración de datos                                                            |
| Formulario sin agrupación ya implementado               | LOW           | Refactoring de UI: envolver campos en componentes `<FormSection>` colapsables. No cambia lógica de negocio                                                                           |

## Pitfall-to-Phase Mapping

| Pitfall                           | Prevention Phase                        | Verification                                                                                 |
| --------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Webhook bloqueando CRUD           | Webhooks (diseño async)                 | Response time de POST /articulos < 500ms con 3 webhooks configurados                         |
| API keys en texto plano           | API Keys (schema con hash)              | Columna `key_hash` existe, no hay columna `key` plaintext en schema                          |
| Guard JWT vs API key              | API Keys (CompositeAuthGuard)           | Tests existentes de JWT pasan + tests nuevos de API key auth pasan                           |
| Validación de imagen insuficiente | Upload de Imágenes (ParseFilePipe)      | Subir archivo .html renombrado a .jpg resulta en rechazo 422                                 |
| Colisión de nombres de archivo    | Upload de Imágenes (Multer config UUID) | Subir dos archivos con mismo `originalname` genera UUIDs diferentes en disco                 |
| SSRF en webhooks                  | Webhooks (validación de URL)            | Registrar webhook con `http://localhost:3000` retorna 400                                    |
| Formulario 30 campos abrumante    | Artículos CRUD UI (secciones)           | Formulario tiene secciones colapsables, badges de error por sección                          |
| Path traversal en uploads         | Upload de Imágenes (Multer config)      | Subir archivo con nombre `../../etc/passwd` no escribe fuera de uploads/                     |
| Imágenes huérfanas al borrar      | Artículos CRUD backend                  | DELETE de artículo elimina archivos del filesystem asociados                                 |
| Webhook sin firma HMAC            | Webhooks (signing)                      | Header `X-Webhook-Signature` presente en cada entrega, verificable con secret del suscriptor |
| DNS rebinding en webhook          | Webhooks (validación en delivery)       | Webhook hacia dominio que resuelve a IP interna es rechazado al momento de entrega           |

## Sources

- [NestJS File Upload docs](https://docs.nestjs.com/techniques/file-upload) -- configuración oficial de Multer, ParseFilePipe, FileTypeValidator con magic numbers
- [NestJS Authentication docs](https://docs.nestjs.com/security/authentication) -- guards, strategies, composite auth patterns
- [Webhook Security Best Practices 2025-2026 (DEV)](https://dev.to/digital_trubador/webhook-security-best-practices-for-production-2025-2026-384n) -- HMAC signing, SSRF, idempotency
- [Standard Webhooks spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) -- especificación de firma y entrega
- [API Key Authentication Best Practices (Zuplo)](https://zuplo.com/blog/2022/12/01/api-key-authentication) -- hashing SHA-256 vs bcrypt, rotation pattern, prefix
- [API Key Management Best Practices (OneUptime)](https://oneuptime.com/blog/post/2026-02-20-api-key-management-best-practices/view) -- lifecycle, rotation, scoping
- [Building Webhook Systems with NestJS (DEV)](https://dev.to/juan_castillo/building-a-webhook-systems-with-nestjs-handling-retry-security-dead-letter-queues-and-rate-4nm7) -- retry, dead letter queue, BullMQ, rate limiting
- [Send Webhooks with NestJS (Hookdeck)](https://hookdeck.com/outpost/guides/send-webhooks-with-nestjs-guide) -- outgoing webhook patterns
- [Best Practices for Webhook Providers (webhooks.fyi)](https://webhooks.fyi/best-practices/webhook-providers) -- delivery, signing, retries
- [Svix Webhook Security](https://www.svix.com/resources/webhook-best-practices/security/) -- HMAC-SHA256, timestamp freshness, idempotency
- [NestJS dual auth: API Key + JWT (Medium)](https://medium.com/@alpercitak/nest-js-authenticate-with-both-api-key-and-jwt-4a22bf7b3049) -- composite guard pattern
- [PayloadTooLargeError fix for NestJS (CopyProgramming)](https://copyprogramming.com/howto/nest-js-request-entity-too-large-payloadtoolargeerror-request-entity-too-large) -- body parser limits, middleware order
- [Path traversal via file upload (Doyensec)](https://blog.doyensec.com/2025/01/09/cspt-file-upload.html) -- client-side path traversal attacks
- [File upload MIME type bypass (Sourcery)](https://www.sourcery.ai/vulnerabilities/file-upload-content-type-bypass) -- magic bytes validation necessity
- [Webhook security checklist (Aikido)](https://www.aikido.dev/blog/webhook-security-checklist) -- comprehensive security checklist
- Codebase analysis: `apps/backend/src/common/guards/jwt-auth.guard.ts`, `roles.guard.ts`, `apps/backend/src/db/schema.ts` (articulos con jsonb imagenes_producto/imagenes_etiqueta)

---

_Pitfalls research for: Objetiva Comercios Admin v1.2 -- Artículos CRUD + API Keys + Webhooks_
_Researched: 2026-03-10_
