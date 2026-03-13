# Phase 20: Image Upload Backend - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

El backend puede recibir, procesar y servir imágenes de artículos con thumbnails automáticos. Incluye endpoints de upload y delete, procesamiento con sharp (thumbnail + detail en WebP), y serving estático. El frontend de imágenes (UI de slots, drag-drop, preview) es Phase 21.

</domain>

<decisions>
## Implementation Decisions

### Organización de archivos

- Estructura flat por tipo: `uploads/articulos/etiquetas/` y `uploads/articulos/productos/` (ya existentes)
- Naming convention: `{codigo_sanitizado}_{slot}_{size}.webp` (ej: `ABC123_1_thumb.webp`, `ABC123_1_detail.webp`)
- Código de artículo sanitizado: caracteres no-alfanuméricos reemplazados por guiones bajos ("ABC/123 Ñ" → "ABC_123_N")
- Originales descartados después del procesamiento — solo se conservan las versiones WebP
- Imagen nueva sobreescribe la anterior en el mismo slot sin borrado explícito previo

### Validación de uploads

- Tipos aceptados: JPG, PNG, WebP (todo se convierte a WebP)
- Tamaño máximo: 5 MB por archivo
- Validación doble: MIME type de Multer + magic bytes via sharp (sharp falla si no es imagen real)
- Una imagen por request (el frontend sube imagen por imagen, un slot a la vez)

### Procesamiento y formatos

- Procesamiento síncrono en el mismo request (sharp es ~100-300ms por imagen)
- Conversión a WebP con calidad 80%
- Thumbnail: 200x200 exacto con crop desde centro (cuadrado)
- Detail: 1000px máximo en el lado más largo, manteniendo aspect ratio

### Diseño del endpoint

- `POST /api/articulos/:codigo/imagenes` — sube imagen, procesa, guarda en filesystem Y actualiza el artículo en DB
  - Body: multipart con `file` + campos `tipo` (etiqueta|producto) y `slot` (1-3 para etiqueta, 1-6 para producto)
  - Response: URLs generadas (thumb + detail) + artículo actualizado
- `DELETE /api/articulos/:codigo/imagenes/:tipo/:slot` — borra archivos del filesystem y limpia la referencia en DB
  - Response: confirmación + artículo actualizado
- Ambos endpoints protegidos con RBAC (admin only)

### Almacenamiento en DB

- Arrays `imagenesProducto` y `imagenesEtiqueta` (JSONB string[]) mantienen schema actual
- Posición en array = slot (index 0 = slot 1, null = slot vacío)
- Solo se guarda URL del detail en el array
- URL del thumbnail se deriva por convención: reemplazar `_detail.webp` por `_thumb.webp`

### Claude's Discretion

- Multer storage strategy (memory vs disk)
- Implementación exacta de la función de sanitización del código
- Error messages y HTTP status codes específicos
- Estructura del módulo NestJS (nuevo módulo o extender artículos)

</decisions>

<specifics>
## Specific Ideas

- El endpoint de upload es nested bajo artículos: `POST /api/articulos/:codigo/imagenes` (no un endpoint genérico de uploads)
- Response del POST incluye el artículo completo actualizado para que el frontend pueda refrescar sin fetch adicional
- El detail cambió de 800px a 1000px max por decisión del usuario

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `uploads/` directory con serving estático ya configurado en `main.ts` (`app.useStaticAssets(uploadsDir, { prefix: '/api/uploads/' })`)
- `uploads/articulos/etiquetas/` y `uploads/articulos/productos/` ya existen con imágenes reales
- `@nestjs/platform-express` y `@types/multer` ya en dependencias del backend
- `ArticulosService` con métodos CRUD existentes (findOne, update) que se pueden reutilizar
- `RolesGuard` y `@Roles('admin')` decorator para proteger endpoints

### Established Patterns

- Controllers usan decorators `@UseGuards(RolesGuard)` + `@Roles('admin')` para write operations
- DTOs con class-validator para validación de input
- Services inyectan `@Inject('DATABASE') db` para acceso a Drizzle ORM
- Responses devuelven el objeto completo después de mutations (create/update)

### Integration Points

- Schema DB: `imagenesProducto` (jsonb string[]) e `imagenesEtiqueta` (jsonb string[]) ya definidos en `articulos` table
- `articulos.controller.ts`: agregar endpoints de imagen aquí o crear controller separado
- `main.ts`: static serving ya configurado, no necesita cambios
- `sharp`: necesita instalarse como dependencia nueva

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 20-image-upload-backend_
_Context gathered: 2026-03-12_
