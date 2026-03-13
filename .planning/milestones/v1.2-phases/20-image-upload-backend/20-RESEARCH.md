# Phase 20: Image Upload Backend - Research

**Researched:** 2026-03-12
**Domain:** NestJS file upload with Multer + sharp image processing
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Organizacion de archivos:**

- Estructura flat por tipo: `uploads/articulos/etiquetas/` y `uploads/articulos/productos/` (ya existentes)
- Naming convention: `{codigo_sanitizado}_{slot}_{size}.webp` (ej: `ABC123_1_thumb.webp`, `ABC123_1_detail.webp`)
- Codigo de articulo sanitizado: caracteres no-alfanuméricos reemplazados por guiones bajos ("ABC/123 N" -> "ABC_123_N")
- Originales descartados despues del procesamiento — solo se conservan las versiones WebP
- Imagen nueva sobreescribe la anterior en el mismo slot sin borrado explicito previo

**Validacion de uploads:**

- Tipos aceptados: JPG, PNG, WebP (todo se convierte a WebP)
- Tamaño maximo: 5 MB por archivo
- Validacion doble: MIME type de Multer + magic bytes via sharp (sharp falla si no es imagen real)
- Una imagen por request (el frontend sube imagen por imagen, un slot a la vez)

**Procesamiento y formatos:**

- Procesamiento sincrono en el mismo request (sharp es ~100-300ms por imagen)
- Conversion a WebP con calidad 80%
- Thumbnail: 200x200 exacto con crop desde centro (cuadrado)
- Detail: 1000px maximo en el lado mas largo, manteniendo aspect ratio

**Diseño del endpoint:**

- `POST /api/articulos/:codigo/imagenes` — sube imagen, procesa, guarda en filesystem Y actualiza el articulo en DB
  - Body: multipart con `file` + campos `tipo` (etiqueta|producto) y `slot` (1-3 para etiqueta, 1-6 para producto)
  - Response: URLs generadas (thumb + detail) + articulo actualizado
- `DELETE /api/articulos/:codigo/imagenes/:tipo/:slot` — borra archivos del filesystem y limpia la referencia en DB
  - Response: confirmacion + articulo actualizado
- Ambos endpoints protegidos con RBAC (admin only)

**Almacenamiento en DB:**

- Arrays `imagenesProducto` y `imagenesEtiqueta` (JSONB string[]) mantienen schema actual
- Posicion en array = slot (index 0 = slot 1, null = slot vacio)
- Solo se guarda URL del detail en el array
- URL del thumbnail se deriva por convencion: reemplazar `_detail.webp` por `_thumb.webp`

### Claude's Discretion

- Multer storage strategy (memory vs disk)
- Implementacion exacta de la funcion de sanitizacion del codigo
- Error messages y HTTP status codes especificos
- Estructura del modulo NestJS (nuevo modulo o extender articulos)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                              | Research Support                                                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IMG-03 | System generates automatic thumbnails (200x200 for list, 800px max for detail) via sharp | Sharp resize API with `fit: 'cover'` for square crop and `fit: 'inside'` with `withoutEnlargement` for detail; CONTEXT.md updated detail to 1000px max |

</phase_requirements>

---

## Summary

Phase 20 implementa el backend de upload/delete/serve de imagenes para articulos. El stack es NestJS 10 con `@nestjs/platform-express` (Multer ya disponible como dev dep `@types/multer`), mas `sharp` como unica dependencia nueva. El patron es: multipart upload en memory storage → validacion MIME + implicit magic bytes via sharp → procesamiento en buffer → escritura en filesystem → actualizacion JSONB en DB.

La decision mas importante de "Claude's Discretion" (storage strategy) es **memory storage** sobre disk storage. Justificacion: el archivo se procesa en memoria igual con sharp, disk storage agrega un round-trip de I/O innecesario antes del procesamiento. Con 5MB max y procesamiento sincrono, memory es la eleccion correcta. Multer memoryStorage entrega `file.buffer` directamente a sharp.

La estructura del modulo puede ser extender `ArticulosModule` existente — agregar los endpoints en `ArticulosController` y la logica en `ArticulosService` o en un service dedicado `ArticulosImagenesService` dentro del mismo modulo. Dado que los endpoints estan nested bajo `:codigo`, un controller separado (`ArticulosImagenesController`) dentro del mismo modulo es la opcion mas limpia.

**Primary recommendation:** Extender `ArticulosModule` con un controller y service dedicados para imagenes, usando Multer memoryStorage + sharp en pipeline sincrono.

---

## Standard Stack

### Core

| Library                    | Version | Purpose                                                              | Why Standard                                                                       |
| -------------------------- | ------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `@nestjs/platform-express` | ^10.0.0 | Multer integration (ya instalado)                                    | Oficial NestJS adapter para Express/Multer                                         |
| `@types/multer`            | ^2.0.0  | Tipos TypeScript para Express.Multer.File (ya instalado como devDep) | Ya presente en backend                                                             |
| `sharp`                    | ^0.34.x | Image processing: resize, WebP conversion, buffer in/out             | Libreria estandar de la industria, la mas rapida para Node.js, soporte nativo WebP |
| `@types/node`              | ^20.0.0 | fs/promises, path (ya instalado)                                     | Filesystem operations para escribir archivos                                       |

### Supporting

| Library  | Version                                   | Purpose           | When to Use                                   |
| -------- | ----------------------------------------- | ----------------- | --------------------------------------------- |
| `multer` | (transitivo via @nestjs/platform-express) | Multipart parsing | Incluido automaticamente, no instalar directo |

### Alternatives Considered

| Instead of               | Could Use                | Tradeoff                                                                  |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------- |
| memory storage           | disk storage             | disk agrega I/O round-trip antes de sharp; memory es correcto para <5MB   |
| sharp inline             | bull queue + sharp async | queue es overkill para 100-300ms sync; CONTEXT.md locked sync             |
| ParseFilePipe validators | fileFilter de multer     | ambos validos; fileFilter rechaza antes de subir (mejor para size limits) |

**Installation:**

```bash
cd apps/backend && pnpm add sharp
```

sharp no necesita `@types/sharp` — el paquete incluye tipos propios desde v0.30+.

---

## Architecture Patterns

### Recommended Module Structure

```
apps/backend/src/modules/articulos/
├── articulos.controller.ts          # CRUD existente (sin cambios)
├── articulos.service.ts             # CRUD existente (sin cambios)
├── articulos.module.ts              # Agregar nuevos providers
├── articulos-imagenes.controller.ts # NUEVO: endpoints POST y DELETE
├── articulos-imagenes.service.ts    # NUEVO: logica de procesamiento
└── dto/
    ├── upload-imagen.dto.ts         # NUEVO: tipo, slot validados con class-validator
    └── ...existing dtos
```

### Pattern 1: Multer Memory Storage en FileInterceptor

**What:** Configurar FileInterceptor con memoryStorage para que el archivo llegue como Buffer.
**When to use:** Siempre que el archivo se procesa antes de guardarse (nuestro caso con sharp).

```typescript
// Source: https://docs.nestjs.com/techniques/file-upload
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'

@Post(':codigo/imagenes')
@UseGuards(RolesGuard)
@Roles('admin')
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, callback) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowed.includes(file.mimetype)) {
        return callback(new BadRequestException('Tipo de archivo no permitido'), false)
      }
      callback(null, true)
    },
  })
)
async uploadImagen(
  @Param('codigo') codigo: string,
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadImagenDto,
) { ... }
```

**CRITICO — fileFilter y limits en FileInterceptor:** Multer evalua `limits.fileSize` durante la subida. Si el archivo supera el limite, Multer lanza un error de tipo `MulterError` con code `LIMIT_FILE_SIZE`. Este error llega como 500 si no se maneja. Hay un issue conocido en NestJS (#465, #7229) donde el error de Multer no se convierte automaticamente a 400. Solucion: usar un ExceptionFilter o manejar en el service.

### Pattern 2: Sharp Pipeline — Buffer → WebP → Buffer → fs.writeFile

**What:** Leer desde `file.buffer`, procesar con sharp, escribir resultado en filesystem.
**When to use:** Procesamiento sincrono de imagen; evitar escribir archivo original.

```typescript
// Source: https://sharp.pixelplumbing.com/api-resize/ y https://sharp.pixelplumbing.com/api-output/
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

async processAndSave(buffer: Buffer, outputDir: string, baseName: string): Promise<{ thumbUrl: string; detailUrl: string }> {
  // Thumbnail: 200x200 cuadrado, crop desde centro
  const thumbBuffer = await sharp(buffer)
    .resize(200, 200, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toBuffer()

  // Detail: max 1000px en lado mas largo, mantiene aspect ratio
  const detailBuffer = await sharp(buffer)
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, `${baseName}_thumb.webp`), thumbBuffer)
  await writeFile(join(outputDir, `${baseName}_detail.webp`), detailBuffer)

  return {
    thumbUrl: `/api/uploads/articulos/${tipo}s/${baseName}_thumb.webp`,
    detailUrl: `/api/uploads/articulos/${tipo}s/${baseName}_detail.webp`,
  }
}
```

**Notas sobre sharp:**

- `fit: 'cover'` para thumbnail = crop inteligente desde el centro (equivale a object-fit: cover)
- `fit: 'inside'` para detail = nunca supera las dimensiones pero mantiene aspect ratio (si la imagen es menor a 1000px, `withoutEnlargement: true` la deja tal cual)
- sharp infiere el formato de entrada del buffer automaticamente — no necesitas especificar input format
- `sharp(buffer)` lanza error si el buffer no es una imagen valida = "magic bytes" validation gratis

### Pattern 3: Sanitizacion del Codigo de Articulo

**What:** Convertir `codigo` (texto libre, PK) a string seguro para usar en filename.
**Implementation:**

```typescript
function sanitizeCodigo(codigo: string): string {
  return codigo
    .normalize('NFD') // descomponer acentos: "Ñ" → "N\u0303"
    .replace(/[\u0300-\u036f]/g, '') // remover diacriticos: "N\u0303" → "N"
    .replace(/[^a-zA-Z0-9]/g, '_') // caracteres no-alfanuméricos → guion bajo
    .replace(/_+/g, '_') // colapsar guiones bajos consecutivos
    .replace(/^_|_$/g, '') // trim guiones bajos inicio/fin
    .toUpperCase()
}
// "ABC/123 Ñ" → "ABC_123_N"
// "PROD-001.A" → "PROD_001_A"
```

### Pattern 4: Actualizacion JSONB array con slot

**What:** El slot (1-based) corresponde al index 0-based del array JSONB. Los slots vacios son `null`.
**Implementation en service:**

```typescript
async updateImageSlot(
  codigo: string,
  campo: 'imagenesProducto' | 'imagenesEtiqueta',
  slot: number,  // 1-based
  url: string | null,
): Promise<Articulo> {
  const articulo = await this.findOne(codigo)
  if (!articulo) throw new NotFoundException(...)

  const arr = [...(articulo[campo] ?? [])]
  // Extender el array si el slot supera la longitud actual
  while (arr.length < slot) arr.push(null)
  arr[slot - 1] = url  // null para borrar, string para agregar

  return this.update(codigo, { [campo]: arr })
}
```

### Pattern 5: DELETE endpoint — borrar archivos y limpiar DB

**What:** Eliminar archivos del filesystem y setear null en el slot del array.

```typescript
@Delete(':codigo/imagenes/:tipo/:slot')
@UseGuards(RolesGuard)
@Roles('admin')
async deleteImagen(
  @Param('codigo') codigo: string,
  @Param('tipo') tipo: 'etiqueta' | 'producto',
  @Param('slot', ParseIntPipe) slot: number,
) {
  return this.articulosImagenesService.deleteImagen(codigo, tipo, slot)
}
```

En el service, usar `fs.promises.unlink` envuelto en try/catch (el archivo puede no existir si fue borrado manualmente):

```typescript
import { unlink } from 'fs/promises'

try {
  await unlink(thumbPath)
  await unlink(detailPath)
} catch {
  // ignorar si no existe — idempotente
}
```

### Anti-Patterns to Avoid

- **Disk storage con multer:** Agrega I/O innecesario — el archivo se escribe en /tmp, se lee con fs, se procesa con sharp, se escribe de nuevo. Memory storage es correcto aqui.
- **ValidatePipe sobre multipart body:** `class-validator` no procesa campos de FormData directamente cuando `forbidNonWhitelisted: true` esta activo globalmente. Los DTOs de upload deben usar `@IsOptional()` con cuidado o excluirse del pipe global.
- **Usar `@Body()` DTO con `forbidNonWhitelisted: true` global:** El ValidationPipe global tiene `forbidNonWhitelisted: true`. Los campos `tipo` y `slot` del FormData llegarán como strings. El DTO debe usar `@Transform` para convertir `slot` a number. Sin `@Transform`, `@IsInt()` fallará sobre el string "1".
- **No manejar el error LIMIT_FILE_SIZE de Multer:** Multer lanza un `MulterError` que NestJS no convierte automaticamente a 400. Hay que capturarlo en el controller o un filter.
- **Rutas absolutas hardcodeadas:** Usar `process.cwd()` + `join()` como ya hace `main.ts` para calcular el directorio de uploads.

---

## Don't Hand-Roll

| Problem                             | Don't Build                               | Use Instead                           | Why                                                                    |
| ----------------------------------- | ----------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Image resize/crop/format conversion | Custom canvas/jimp code                   | sharp                                 | sharp usa libvips en C, 10-15x mas rapido que alternativas JS          |
| Magic bytes validation              | Leer y comparar bytes manualmente         | sharp (falla con imagen invalida)     | sharp ya valida al procesar — si no es imagen, lanza error descriptivo |
| Multipart parsing                   | Parsear Content-Type boundary manualmente | Multer via `@nestjs/platform-express` | Ya instalado y configurado                                             |
| File serving                        | Express router manual para /uploads       | `app.useStaticAssets()`               | Ya configurado en `main.ts`                                            |

**Key insight:** sharp hace el trabajo pesado de validacion + conversion + resize. No hay razon para separar la validacion de magic bytes de sharp — si sharp puede procesar el buffer, es una imagen valida.

---

## Common Pitfalls

### Pitfall 1: LIMIT_FILE_SIZE de Multer devuelve 500

**What goes wrong:** Cuando el archivo supera `limits.fileSize`, Multer lanza un `MulterError` con `code: 'LIMIT_FILE_SIZE'`. NestJS no tiene un handler por defecto para este tipo de error — llega como 500 Internal Server Error al cliente.

**Why it happens:** El ExceptionFilter global maneja `HttpException` pero no `MulterError`. La issue #465 en nestjs/nest confirma este comportamiento desde versiones tempranas.

**How to avoid:** Usar un ExceptionFilter que capture `MulterError`:

```typescript
// En http-exception.filter.ts o un filtro especifico
import { MulterError } from 'multer'

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    response.status(400).json({
      statusCode: 400,
      message:
        error.code === 'LIMIT_FILE_SIZE' ? 'Archivo demasiado grande (max 5MB)' : error.message,
    })
  }
}
```

**Warning signs:** Postman/curl devuelve 500 al subir archivo >5MB.

### Pitfall 2: ValidationPipe global con FormData body

**What goes wrong:** El ValidationPipe global tiene `forbidNonWhitelisted: true`. Los campos de FormData (`tipo`, `slot`) llegan como strings. Si el DTO tiene `@IsInt() slot: number`, la validacion falla porque el valor es `"1"` (string), no `1` (number).

**Why it happens:** `transform: true` en el pipe global deberia transformar, pero con `@IsInt()` en campos de FormData, `class-transformer` no siempre convierte correctamente sin `@Type(() => Number)`.

**How to avoid:** En el DTO de upload, usar explicitamente:

```typescript
import { Transform } from 'class-transformer'

export class UploadImagenDto {
  @IsIn(['etiqueta', 'producto'])
  tipo: 'etiqueta' | 'producto'

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(6)
  slot: number
}
```

**Warning signs:** 400 con mensaje "slot must be an integer number" al subir via FormData correctamente formado.

### Pitfall 3: sharp y tipos de importacion en TypeScript/ESM

**What goes wrong:** sharp tiene un historial de problemas con ESM vs CJS en diferentes versiones. En proyectos NestJS con TypeScript (CommonJS), la importacion correcta es `import sharp from 'sharp'` (default import), no `import * as sharp from 'sharp'`.

**Why it happens:** El package.json de sharp usa `exports` condicional para ESM/CJS. En CJS con TypeScript, el default import es el correcto.

**How to avoid:** Usar `import sharp from 'sharp'` y asegurarse de que `tsconfig.json` tenga `"esModuleInterop": true` (que es el default en NestJS CLI projects).

**Warning signs:** `sharp is not a function` en runtime despues de compilar.

### Pitfall 4: El array JSONB con gaps (slots vacios)

**What goes wrong:** Si el array tiene `["url_slot1.webp", null, "url_slot3.webp"]` y se guarda en Drizzle, la serializacion JSON de arrays con `null` es correcta en PostgreSQL JSONB. Sin embargo, si se hace `arr.filter(Boolean)` al leer, se pierden los indices.

**Why it happens:** Confundir index del array con slot number.

**How to avoid:** Nunca filtrar el array al leer/escribir. Los `null` son intentionales — representan slots vacios. La posicion (index 0 = slot 1) es la fuente de verdad.

### Pitfall 5: Paths en produccion vs desarrollo

**What goes wrong:** `process.cwd()` en NestJS con `nest start --watch` apunta al directorio raiz del backend. En produccion con `node dist/main.js`, tambien apunta al directorio donde se ejecuta el comando. Esto es consistente, pero hay que asegurarse de ejecutar el proceso desde `apps/backend/`.

**How to avoid:** Usar `join(process.cwd(), 'uploads', 'articulos', ...)` igual que ya lo hace `main.ts`. Esto es correcto.

---

## Code Examples

Verified patterns from official sources:

### Upload completo — controller

```typescript
// Source: https://docs.nestjs.com/techniques/file-upload + adaptado al proyecto
import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ArticulosImagenesService } from './articulos-imagenes.service'
import { UploadImagenDto } from './dto/upload-imagen.dto'

@Controller('articulos')
export class ArticulosImagenesController {
  constructor(private readonly imagenesService: ArticulosImagenesService) {}

  @Post(':codigo/imagenes')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Solo JPG, PNG o WebP'), false)
        }
        cb(null, true)
      },
    })
  )
  async uploadImagen(
    @Param('codigo') codigo: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImagenDto
  ) {
    if (!file) throw new BadRequestException('Archivo requerido')
    return this.imagenesService.uploadImagen(codigo, file.buffer, dto)
  }

  @Delete(':codigo/imagenes/:tipo/:slot')
  @UseGuards(RolesGuard)
  @Roles('admin')
  deleteImagen(
    @Param('codigo') codigo: string,
    @Param('tipo') tipo: string,
    @Param('slot', ParseIntPipe) slot: number
  ) {
    return this.imagenesService.deleteImagen(codigo, tipo as 'etiqueta' | 'producto', slot)
  }
}
```

### Sharp WebP resize — thumbnail y detail

```typescript
// Source: https://sharp.pixelplumbing.com/api-resize/ + https://sharp.pixelplumbing.com/api-output/
import sharp from 'sharp'

// Thumbnail 200x200 cuadrado
const thumbBuffer = await sharp(inputBuffer)
  .resize(200, 200, { fit: 'cover', position: 'centre' })
  .webp({ quality: 80 })
  .toBuffer()

// Detail max 1000px, aspect ratio preservado
const detailBuffer = await sharp(inputBuffer)
  .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 80 })
  .toBuffer()
```

### Nombre de archivo por convencion

```typescript
function sanitizeCodigo(codigo: string): string {
  return codigo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar diacriticos
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
}

function buildFileName(codigo: string, slot: number, size: 'thumb' | 'detail'): string {
  return `${sanitizeCodigo(codigo)}_${slot}_${size}.webp`
}
// buildFileName('ABC/123 N', 2, 'thumb') → 'ABC_123_N_2_thumb.webp'
```

---

## State of the Art

| Old Approach                 | Current Approach                  | When Changed       | Impact                                                              |
| ---------------------------- | --------------------------------- | ------------------ | ------------------------------------------------------------------- |
| jimp para resize             | sharp                             | ~2019              | sharp es 10-15x mas rapido, soporte WebP nativo                     |
| multer disk storage siempre  | memory storage para procesamiento | Patron establecido | Elimina round-trip de I/O cuando se procesa en memoria              |
| `ParseFilePipe` + validators | fileFilter en multer options      | Contemporaneo      | fileFilter rechaza antes de parsear; mejor para size limits grandes |
| multer como dep directa      | via @nestjs/platform-express      | NestJS 7+          | No instalar multer directamente                                     |

**Deprecated/outdated:**

- `import * as sharp from 'sharp'`: Usar `import sharp from 'sharp'` con esModuleInterop.
- `new ParseFilePipe({ validators: [...] })` para MIME validation: valido pero fileFilter es mas eficiente (rechaza antes).

---

## Open Questions

1. **Manejo del error MulterError para LIMIT_FILE_SIZE**
   - What we know: El ExceptionFilter existente (`HttpExceptionFilter`) solo captura `HttpException`.
   - What's unclear: Si hay que modificar el filtro global o crear uno especifico para Multer.
   - Recommendation: Agregar `@Catch(MulterError)` al filtro global existente en `http-exception.filter.ts`.

2. **Orden de guards con FileInterceptor**
   - What we know: `@UseGuards` se evalua antes que `@UseInterceptors` en NestJS.
   - What's unclear: Si el orden actual es suficiente o necesita ajuste con multipart.
   - Recommendation: El orden `@UseGuards(RolesGuard)` antes de `@UseInterceptors(FileInterceptor(...))` es correcto — auth se verifica antes del procesamiento del archivo.

---

## Validation Architecture

### Test Framework

| Property           | Value                                       |
| ------------------ | ------------------------------------------- |
| Framework          | No hay test framework instalado actualmente |
| Config file        | ninguno detectado                           |
| Quick run command  | N/A                                         |
| Full suite command | N/A                                         |

### Phase Requirements → Test Map

| Req ID | Behavior                            | Test Type            | Automated Command       | File Exists? |
| ------ | ----------------------------------- | -------------------- | ----------------------- | ------------ |
| IMG-03 | Thumbnail 200x200 WebP generado     | unit (sharp service) | N/A — no test framework | Wave 0 gap   |
| IMG-03 | Detail 1000px max WebP generado     | unit (sharp service) | N/A — no test framework | Wave 0 gap   |
| IMG-03 | Upload endpoint acepta JPG/PNG/WebP | integration (e2e)    | N/A — no test framework | Wave 0 gap   |
| IMG-03 | Rechaza MIME invalido con 400       | integration (e2e)    | N/A — no test framework | Wave 0 gap   |
| IMG-03 | Rechaza archivo >5MB                | integration (e2e)    | N/A — no test framework | Wave 0 gap   |

### Sampling Rate

- No hay test framework instalado. Verificacion manual via curl/Postman durante implementacion.
- La verificacion de `/gsd:verify-work` sera funcional/visual.

### Wave 0 Gaps

- No hay framework de tests — dado el historial del proyecto (ninguna fase anterior lo ha instalado), no se recomienda agregar tests como Wave 0 de esta fase. La verificacion sera manual.

_(Si no hay gaps: los tests no son parte del scope de esta fase dado que el proyecto no tiene infraestructura de tests establecida)_

---

## Sources

### Primary (HIGH confidence)

- https://docs.nestjs.com/techniques/file-upload — FileInterceptor, UploadedFile, ParseFilePipe, fileFilter, limits
- https://sharp.pixelplumbing.com/api-resize/ — resize API: width, height, fit, position, withoutEnlargement
- https://sharp.pixelplumbing.com/api-output/ — WebP output: quality 1-100, toBuffer()
- Codebase inspeccionado directamente — `main.ts`, `articulos.controller.ts`, `articulos.service.ts`, `schema.ts`, `package.json`

### Secondary (MEDIUM confidence)

- https://oneuptime.com/blog/post/2026-02-02-nestjs-file-uploads/view — patterns de FileInterceptor con memoryStorage, sharp integration (2026, reciente)
- https://github.com/nestjs/nest/issues/465 — bug conocido de LIMIT_FILE_SIZE → 500 (verificado en issues oficiales)
- https://github.com/nestjs/nest/issues/7229 — confirmacion del mismo bug en versiones recientes

### Tertiary (LOW confidence)

- Ninguna — todos los findings criticos estan verificados con fuentes primarias o secundarias.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — sharp es la libreria estandar de facto, Multer ya esta presente en el proyecto
- Architecture: HIGH — patrones verificados con docs oficiales NestJS + codebase existente
- Pitfalls: HIGH para MulterError/LIMIT_FILE_SIZE (issues oficiales), HIGH para FormData + ValidationPipe (patron conocido), MEDIUM para sharp CJS import (comportamiento esperado con esModuleInterop)

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (sharp y NestJS 10 son estables; cambios mayores poco probables en 90 dias)
