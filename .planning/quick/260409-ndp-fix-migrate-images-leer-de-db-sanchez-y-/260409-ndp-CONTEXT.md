# Quick Task 260409-ndp: Fix migrate-images - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Task Boundary

Corregir migrate-images.ts para que lea las imágenes fuente desde la DB `sanchez` (campos label_images, article_images) y escriba las rutas procesadas en la DB `erp_sanchez` (campos imagenes_etiqueta, imagenes_producto). Actualmente el script lee/escribe solo en erp_sanchez donde los arrays están vacíos.

</domain>

<decisions>
## Diagnóstico Completo

### Causa raíz
El script `migrate-images.ts` lee `imagenes_producto`/`imagenes_etiqueta` de `erp_sanchez.articulos` — pero esos campos están vacíos (arrays []). Las imágenes fuente están en la DB `sanchez.articulos` en campos `label_images` y `article_images`.

### Datos verificados
- DB `sanchez.articulos`: 11,414 artículos, 6,549 con label_images, 971 con article_images
- DB `erp_sanchez.articulos`: 100,990 artículos, 0 con imagenes_producto, 0 con imagenes_etiqueta
- Los códigos coinciden 1:1 entre ambas DBs (verificado con muestra)
- Archivos webp parcialmente procesados: 6,390 en productos/, cantidad en etiquetas/
- Algunos artículos tienen webp en disco pero no en DB (ej: 50-130 tiene archivos pero DB vacía)
- Otros no tienen webp en disco (ej: 3-6100 no tiene archivos)

### Mapping de campos
- `sanchez.label_images` (jsonb array de rutas /images/...) → `erp_sanchez.imagenes_etiqueta` (text[])
- `sanchez.article_images` (jsonb array de rutas /images/...) → `erp_sanchez.imagenes_producto` (text[])
- `sanchez.label_ocrs` → `erp_sanchez.etiquetas_ocr` (text[])
- `sanchez.descripcion_web` → `erp_sanchez.descripcion_web` (text)
- `sanchez.json_articulo` → `erp_sanchez.json_articulo` (jsonb)

### Rutas de archivos fuente
Las rutas en sanchez DB son relativas como `/images/temporales/IMG_xxx.jpg` o `/images/labelImages_xxx.jpg`.
Los archivos reales están en: `/home/sanchez/proyectos/sanchez-vps-alfred/uploads/pim/inventario/images/`

### Flujo correcto del script
1. Leer de DB `sanchez`: codigo, label_images, article_images, label_ocrs, descripcion_web, json_articulo
2. Para cada imagen en label_images/article_images:
   - Resolver archivo fuente en alfred: `/home/sanchez/proyectos/sanchez-vps-alfred/uploads/pim/inventario/{ruta}`
   - Si ya existe el webp procesado en uploads/articulos/, usar ese
   - Si no, procesar con sharp (thumb + detail webp)
3. Escribir en DB `erp_sanchez`: imagenes_etiqueta, imagenes_producto, etiquetas_ocr, descripcion_web, json_articulo

### Docker context
- El script corre en el HOST (no en container) — tiene acceso al filesystem
- La DB es accesible en localhost:5432 (o postgres:5432 desde container)
- Production env: `DATABASE_URL=postgresql://sanchez:S4nch3zR3pu3st0s@localhost:5432/erp_sanchez`

</decisions>

<specifics>
## Specific Ideas

- El script actual busca archivos en uploads/articulos/ pero las fuentes están en alfred/uploads/pim/inventario/
- Necesita una segunda conexión a la DB sanchez para leer los campos fuente
- Los campos label_ocrs, descripcion_web, json_articulo también deben migrarse (sin procesamiento de imagen)
- Algunos archivos ya están procesados en disco — el script debe detectar esto y no re-procesar

</specifics>
