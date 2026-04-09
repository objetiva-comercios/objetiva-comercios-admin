---
phase: quick-260319-od3
plan: 01
one_liner: 'Fix botón editar, agregar categoría/subcategoría end-to-end, separar metadata'
status: complete
commits: [a505e2c]
---

# Summary: Fix botón editar, categoría/subcategoría, layout sheet

## What Changed

### 1. Botón Editar restaurado a azul

- `variant="outline"` → `variant="default"` en articulo-sheet.tsx

### 2. X del sheet separada del botón

- `top-4` → `top-2` en sheet.tsx (SheetPrimitive.Close)

### 3. Categoría/Subcategoría — end-to-end (nuevo campo)

- **schema.ts**: agregadas columnas `categoria VARCHAR(100)` y `subcategoria VARCHAR(100)`
- **DB**: ALTER TABLE ejecutado directamente en PostgreSQL de producción
- **create-articulo.dto.ts**: campos opcionales con validación
- **articulo.ts** (tipo frontend): `categoria: string | null`, `subcategoria: string | null`
- **articulo-form.tsx**: campos en zod schema + default values + inputs en sección Propiedades
- **articulo-sheet.tsx**: FieldRow para Categoría y Subcategoría en sección Propiedades

### 4. Sección metadata separada

- Separator + `pt-2` antes de Creado/Actualizado
- Texto en `text-muted-foreground` para menor prominencia visual
