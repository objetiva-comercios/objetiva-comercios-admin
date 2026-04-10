# Quick Task 260410-ifc: Rediseño imágenes artículos — Summary

**Completed:** 2026-04-10
**Commits:** fb381bd, 69a1e62, 9a8e6a2

## One-liner

Agregados iconos Image/Tag con conteo en lista de artículos y rediseñada sección imágenes del panel detalle con 9 slots en fila única (6 producto + separador + 3 etiqueta).

## What Changed

### Task 1: Columna de iconos en lista de artículos
- **File:** `apps/web/src/components/articulos/articulos-columns.tsx`
- Nueva columna `imagenes` entre `nombre` y `marca`
- Iconos `Image` (producto) y `Tag` (etiqueta) de lucide-react
- Con imágenes: icono normal + número de conteo
- Sin imágenes: icono gris (30% opacity) + punto medio "·"

### Task 2: Rediseño sección imágenes panel detalle
- **File:** `apps/web/src/components/articulos/articulo-sheet.tsx`
- 9 slots siempre visibles: 6 producto + separador vertical + 3 etiqueta
- Labels "Producto" y "Etiqueta" arriba de cada grupo
- Placeholders vacíos: borde dashed + ImageIcon al 30% opacity
- Thumbnails: 48x48px (w-12 h-12) con click que abre lightbox
- Lightbox unificado: navega producto + etiqueta como secuencia única

## Decisions Applied (from CONTEXT.md)
- Iconos después de nombre, antes de marca
- Una columna compacta con ambos iconos
- Lucide: Image + Tag
- Número pequeño al lado del icono
- Fila única de 9 con línea vertical sutil como separador
- Borde dashed para placeholders vacíos
- Sin cambios en vista edición
- Datos contados en frontend (arrays ya vienen del backend)
