---
status: partial
phase: 30-templates-composici-n-sku-nombre
source: [30-VERIFICATION.md]
started: 2026-05-17T15:50:00Z
updated: 2026-05-17T15:50:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. /propiedades — 8 tabs renderizan en orden (regresión + 2 nuevas)

expected: Las 8 pestañas (Marcas, Colores, Talles, Materiales, Presentaciones, Objetos, Familias, Aplicaciones) renderizan en orden; las 6 originales siguen funcionando idénticas a Phase 29; Aplicaciones y Familias muestran lista (potencialmente vacía) sin errores en consola
result: [pending]

### 2. Tab Familias — columna extra "Subcategoría" + select en dialog

expected: Al clickear Familias aparece la columna "Subcategoría" entre Abrev y Estado; el botón "Nueva familia" abre un dialog con un Select de subcategorías activas; intentar crear sin seleccionar subcategoría muestra error "Seleccioná una subcategoría"
result: [pending]

### 3. Crear familia con subcategoría — persiste y aparece con nombre legible

expected: POST /propiedades/familia con parentId válido crea la fila; al recargar la tab aparece la nueva fila y la columna "Subcategoría" muestra el nombre (no "#id") de la subcategoría seleccionada
result: [pending]

### 4. Duplicado de familia — retorna 409 legible

expected: Al crear una familia con un par (parentId, nombre) que ya existe, aparece un toast/error legible (ej. "Ya existe una familia con ese nombre") y no se crea otra fila
result: [pending]

### 5. /templates — lista template default + botón "Nuevo template" disabled con tooltip

expected: La tabla muestra 1 fila (id=1, nombre="default"); el botón "Nuevo template" está disabled; al hover muestra tooltip "Disponible en próxima fase — Phase 30 entrega solo el template default"
result: [pending]

### 6. /templates/1 — editar atributos y persistir via PATCH

expected: La página carga 5 filas de atributos (objeto, marca, modelo, medida, custom_1); modificar es_variante o orden_nombre y click "Guardar" dispara PATCH exitoso; recargar la página confirma persistencia contra la DB
result: [pending]

### 7. /templates/1 — validación cliente rechaza valores inválidos

expected: Setear custom_slot=4 (fuera de rango 1-3) o orden_nombre=0 muestra toast "Validación: ..." y NO dispara PATCH
result: [pending]

### 8. Estética Tabler en componentes nuevos

expected: Inputs y buttons tienen h-9 (no h-10), border-radius md (no lg/xl), tablas text-sm, padding py-4/gap-4, bg explícito en controles de form
result: [pending]

### 9. Sin elementos drag-drop visibles en /templates/[id] (D-13 honrado)

expected: El form de edición de atributos NO muestra handles draggables ni elementos arrastrables; es una tabla simple con inputs número y switches
result: [pending]

### 10. Rebuild Docker — endpoints sirviéndose desde container productivo

expected: Tras docker compose build erp-backend erp-web && docker compose up -d, los endpoints /api/templates, /api/propiedades/familia, /api/propiedades/aplicacion, /api/propiedades/subcategoria están disponibles en https://erp.sanchezrepuestos.com.ar y las páginas /templates, /templates/[id] y los 8 tabs renderizan en producción
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
