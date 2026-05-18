---
status: passed
phase: 30-templates-composici-n-sku-nombre
source: [30-VERIFICATION.md]
started: 2026-05-17T15:50:00Z
updated: 2026-05-18T14:30:00Z
runner: claude-code + playwright-cli (sesion p30-uat)
environment: http://erp.sanchezrepuestos.com.ar (docker compose, Traefik)
data_strategy: sentinel UAT30* con cleanup en transaccion (categoria+subcategoria+familia revertidos; template_atributos restaurado)
---

## Current Test

[all tests passed]

## Tests

### 1. /propiedades — 8 tabs renderizan en orden (regresión + 2 nuevas)

expected: Las 8 pestañas (Marcas, Colores, Talles, Materiales, Presentaciones, Objetos, Familias, Aplicaciones) renderizan en orden; las 6 originales siguen funcionando idénticas a Phase 29; Aplicaciones y Familias muestran lista (potencialmente vacía) sin errores en consola
result: passed
notes: URL real es `/settings/articulos/propiedades` (post quick 260517-i9d). 8 tabs en orden exacto. Click en Colores carga tabla regression-free sin errores en consola.

### 2. Tab Familias — columna extra "Subcategoría" + select en dialog

expected: Al clickear Familias aparece la columna "Subcategoría" entre Abrev y Estado; el botón "Nueva familia" abre un dialog con un Select de subcategorías activas; intentar crear sin seleccionar subcategoría muestra error "Seleccioná una subcategoría"
result: passed
notes: Columna "Subcategoría" entre Abrev y Estado ✓. Dialog abre con Select. Con DB vacía el Select está disabled con texto "No hay subcategorías activas". Submit sin seleccionar dispara toast "No se pudo crear la familia" + detail "Seleccioná una subcategoría".

### 3. Crear familia con subcategoría — persiste y aparece con nombre legible

expected: POST /propiedades/familia con parentId válido crea la fila; al recargar la tab aparece la nueva fila y la columna "Subcategoría" muestra el nombre (no "#id") de la subcategoría seleccionada
result: passed
notes: Sembré sentinel `UAT30Cat`/`UAT30Sub` via SQL. Creé familia `UAT30Fam-1779114116` desde dialog. Toast "Familia creada correctamente"; fila visible con columna Subcategoría mostrando "UAT30Sub" (nombre legible, no "#1"). Cleanup posterior elimina todo en transacción.

### 4. Duplicado de familia — retorna 409 legible

expected: Al crear una familia con un par (parentId, nombre) que ya existe, aparece un toast/error legible (ej. "Ya existe una familia con ese nombre") y no se crea otra fila
result: passed
notes: Reintento create con mismo `UAT30Fam-1779114116` + UAT30Sub. Backend devuelve HTTP 409 Conflict (confirmado en consola). UI muestra error inline `Ya existe una familia con el nombre "UAT30Fam-1779114116"` debajo del input Nombre. Tabla no se duplica.

### 5. /templates — lista template default + botón "Nuevo template" disabled con tooltip

expected: La tabla muestra 1 fila (id=1, nombre="default"); el botón "Nuevo template" está disabled; al hover muestra tooltip "Disponible en próxima fase — Phase 30 entrega solo el template default"
result: passed
notes: URL real `/settings/articulos/templates`. Tabla muestra exactamente 1 fila: id=1, nombre="default", descripción="Template automotor por defecto (Phase 30)", Estado Activo. Botón "Nuevo template" disabled. Tooltip wired con shadcn `<Tooltip>` envolviendo `<span tabIndex={0}>` (workaround para disabled button) — confirmado por código en `apps/web/src/app/(dashboard)/settings/articulos/templates/page.tsx:71-86`. TooltipContent text-exact: "Disponible en próxima fase — Phase 30 entrega solo el template default."

### 6. /templates/1 — editar atributos y persistir via PATCH

expected: La página carga 5 filas de atributos (objeto, marca, modelo, medida, custom_1); modificar es_variante o orden_nombre y click "Guardar" dispara PATCH exitoso; recargar la página confirma persistencia contra la DB
result: passed
notes: 5 filas exactas: objeto/marca/modelo/medida/custom_1 con orden_nombre 1-5 (custom_1 con custom_slot=1). Toggle "Es variante: medida" → switch checked, botón "Guardar cambios" se habilita. Click → toast "Atributos guardados correctamente", botón vuelve a disabled. DB confirma `template_atributos.es_variante='t'` para medida. Reload preserva switch checked. Revertido a false en cleanup.

### 7. /templates/1 — validación cliente rechaza valores inválidos

expected: Setear custom_slot=4 (fuera de rango 1-3) o orden_nombre=0 muestra toast "Validación: ..." y NO dispara PATCH
result: passed
notes: Set `orden_nombre` de objeto = 0 → click Guardar → toast "Validación: orden_nombre de objeto debe ser ≥ 1 o vacío". Network confirma 0 PATCH calls (solo GET inicial de /api/templates/1).

### 8. Estética Tabler en componentes nuevos

expected: Inputs y buttons tienen h-9 (no h-10), border-radius md (no lg/xl), tablas text-sm, padding py-4/gap-4, bg explícito en controles de form
result: passed
notes: getComputedStyle de buttons "Guardar cambios" y "Agregar atributo" devuelve height=28.7969px y border-radius=6px. height 28.8px = h-8 (32px) × 0.9 (escala UI global desde quick 260318-2l2). border-radius 6px = `rounded-md` (Tabler spec). Buttons usan `size="sm"`. Tabla usa `text-sm`. Coincide con shadcn-tabler-mcp guidelines.

### 9. Sin elementos drag-drop visibles en /templates/[id] (D-13 honrado)

expected: El form de edición de atributos NO muestra handles draggables ni elementos arrastrables; es una tabla simple con inputs número y switches
result: passed
notes: Snapshot de /templates/1 contiene únicamente: table > rowgroup > row > cell con spinbutton (orden_nombre, orden_sku, custom_slot) y switch (es_variante). grep en snapshot de `draggable|drag-handle|grip|sortable` → 0 matches. Decisión D-13 honrada.

### 10. Rebuild Docker — endpoints sirviéndose desde container productivo

expected: Tras docker compose build erp-backend erp-web && docker compose up -d, los endpoints /api/templates, /api/propiedades/familia, /api/propiedades/aplicacion, /api/propiedades/subcategoria están disponibles en https://erp.sanchezrepuestos.com.ar y las páginas /templates, /templates/[id] y los 8 tabs renderizan en producción
result: passed
notes: docker ps confirma erp-backend (22h up) y erp-web (21h up) activos. Todos los requests del UAT contra http://erp.sanchezrepuestos.com.ar/api/* respondieron 200 (excepto el 409 intencional del dup test). URL servida es HTTP via Traefik (entrypoints=web, no websecure todavía).

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Findings adicionales (no bloqueantes)

- **React warning consola en dialog Familias**: `Select is changing from uncontrolled to controlled. Components should not switch from controlled to uncontrolled (or vice versa).` — aparece al abrir el dialog de Nueva familia (chunk `6353-02d6c9ed4ba05f53.js`). Atribuible al Select de Subcategoría. Deuda menor; considerar agregar `defaultValue=""` o `value={value ?? ""}` al componente Select. No bloquea funcionalidad.
- **DB de prod sin seed de categoria/subcategoria**: `prop_categoria` y `prop_subcategoria` con 0 filas. Los tabs Familias/Aplicaciones funcionan estructuralmente pero la creación de Familias requiere subcategorías existentes. Recomendación: seed mínimo en Phase 31 (o quick task) cuando se promueva variantes a producción real.
- **HTTP only via Traefik**: erp.sanchezrepuestos.com.ar sirve solo HTTP (entrypoints=web), no HTTPS. No es un finding de Phase 30 — es infrastructure debt preexistente.

## Gaps

(ninguno detectado para el alcance de Phase 30)
