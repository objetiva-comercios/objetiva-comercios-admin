# Phase 28: Add objeto to ArticuloSheet - Research

**Researched:** 2026-03-13
**Domain:** React component extension — shadcn/ui Sheet + FieldRow pattern
**Confidence:** HIGH

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                          | Research Support                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| VIEW-02 | User can view articulo detail in a lateral panel/sheet showing all fields and images | `objeto` field is the only gap: infrastructure (type, hook, config) is complete. Adding `FieldRow` in Propiedades grid closes the requirement. |

</phase_requirements>

---

## Summary

Esta fase es el cierre del gap INT-02 del audit v1.2: el campo `objeto` existe en todo el stack (DB schema, tipo `Articulo`, `CamposVisibles` con default `true`, `isCampoVisible('objeto')` funcional) pero no aparece en `ArticuloSheet`, el panel lateral de detalle. Phase 27 ya lo integró en el formulario crear/editar; Phase 28 lo integra en la vista de detalle.

La corrección es quirúrgica: un único cambio en `articulo-sheet.tsx`. El componente `FieldRow` ya existe en el mismo archivo y tiene exactamente la signature correcta. Solo hay que agregar un `FieldRow` dentro del grid de Propiedades, respetando la condición `isCampoVisible('objeto')`.

No hay instalaciones, migraciones, ni cambios de backend. Es una operación de copiar-y-adaptar el patrón de los otros campos de Propiedades existentes.

**Primary recommendation:** Un solo plan de 1 tarea con 1 edición puntual en `articulo-sheet.tsx`: insertar el `FieldRow` de `objeto` como primer campo dentro del grid de Propiedades.

---

## Standard Stack

### Core (ya instalado, sin cambios)

| Library   | Version   | Purpose                       | Relevancia                                                |
| --------- | --------- | ----------------------------- | --------------------------------------------------------- |
| React     | instalado | Componente funcional          | El componente `ArticuloSheet` ya usa el patrón correcto   |
| shadcn/ui | instalado | Sheet, Badge, Separator, etc. | Componentes ya en uso, no agregar ninguno nuevo           |
| date-fns  | instalado | Formateo de fechas            | Ya importado en el archivo, no relevante para este cambio |

No hay instalaciones necesarias para esta fase.

---

## Architecture Patterns

### FieldRow — el componente interno a reutilizar

`FieldRow` está definido dentro del mismo `articulo-sheet.tsx` (líneas 39-46):

```tsx
// Fuente: apps/web/src/components/articulos/articulo-sheet.tsx línea 39
function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value ?? '—'}</span>
    </div>
  )
}
```

Acepta `string | null | undefined` — el tipo de `articulo.objeto` es `string | null`, que encaja directamente sin casteo.

### Patrón de campo condicional en el grid Propiedades (código exacto a replicar)

El patrón establecido — cada campo en el grid Propiedades sigue el mismo formato. Ejemplo referencia: `marca` (líneas 274-275):

```tsx
// Fuente: apps/web/src/components/articulos/articulo-sheet.tsx línea 274
{
  isCampoVisible('marca') && <FieldRow label="Marca" value={articulo.marca} />
}
```

El campo `objeto` replica este patrón exactamente:

```tsx
{
  isCampoVisible('objeto') && <FieldRow label="Tipo / Objeto" value={articulo.objeto} />
}
```

### Ubicación dentro del grid de Propiedades

El grid de Propiedades está en las líneas 273-285:

```tsx
// Fuente: apps/web/src/components/articulos/articulo-sheet.tsx líneas 271-297
<div>
  <SectionHeader title="Propiedades" />
  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
    {isCampoVisible('marca') && <FieldRow label="Marca" value={articulo.marca} />}
    {isCampoVisible('modelo') && <FieldRow label="Modelo" value={articulo.modelo} />}
    {isCampoVisible('talle') && <FieldRow label="Talle" value={articulo.talle} />}
    {isCampoVisible('color') && <FieldRow label="Color" value={articulo.color} />}
    {isCampoVisible('material') && <FieldRow label="Material" value={articulo.material} />}
    {isCampoVisible('presentacion') && (
      <FieldRow label="Presentacion" value={articulo.presentacion} />
    )}
    {isCampoVisible('medida') && <FieldRow label="Medida" value={articulo.medida} />}
  </div>
  ...
</div>
```

El campo `objeto` va **antes de `marca`**, como primer campo del grid, replicando el orden decidido en Phase 27 (objeto → marca → modelo → talle → color → material → presentacion → medida).

---

## Puntos de integración exactos

| Archivo                                                | Ubicación                                                                               | Cambio                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/articulos/articulo-sheet.tsx` | Línea 273 — primera línea del `<div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">` | Insertar `{isCampoVisible('objeto') && <FieldRow label="Tipo / Objeto" value={articulo.objeto} />}` |

**Un solo cambio, una sola línea insertada.**

No hay cambios necesarios en:

- `useArticulosConfig` — `isCampoVisible('objeto')` ya funciona
- `CamposVisibles` — ya tiene `objeto: boolean` con default `true`
- `Articulo` type — ya tiene `objeto: string | null`
- Backend / API — el campo ya se retorna en las respuestas
- `CAMPOS_LABELS` — ya tiene `objeto: 'Objeto'`

---

## Don't Hand-Roll

| Problema                          | No construir                 | Usar en cambio                                | Por qué                                                         |
| --------------------------------- | ---------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Renderizado condicional del campo | Lógica de visibilidad propia | `isCampoVisible('objeto')` del hook existente | Ya soportado con default `true` en CamposVisibles               |
| Componente de fila etiqueta-valor | Div + spans custom           | `FieldRow` definido en el mismo archivo       | Ya existe, ya maneja `null` con `—`, ya tiene estilos correctos |

---

## Common Pitfalls

### Pitfall 1: Usar label "Objeto" en lugar de "Tipo / Objeto"

**What goes wrong:** El campo tiene una doble semántica (tipo de artículo + objeto físico). El label correcto decidido en Phase 27 es "Tipo / Objeto".
**How to avoid:** `<FieldRow label="Tipo / Objeto" value={articulo.objeto} />`
**Warning signs:** Si el label dice solo "Objeto" sin el "Tipo /".

### Pitfall 2: Posición incorrecta en el grid

**What goes wrong:** Insertar `objeto` después de `marca` en lugar de antes, rompiendo la coherencia con el orden del formulario (donde `objeto` es el primer campo de Propiedades tras Phase 27).
**How to avoid:** El FieldRow de `objeto` va como **primera línea** dentro del `<div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">`, antes del de `marca`.

### Pitfall 3: Usar la sintaxis multi-línea innecesariamente

**What goes wrong:** Escribir el FieldRow en 3+ líneas con `(` y `)` cuando todos los demás campos de una sola longitud usan la versión inline.
**How to avoid:** `{isCampoVisible('objeto') && <FieldRow label="Tipo / Objeto" value={articulo.objeto} />}` — mismo estilo que `marca`, `modelo`, `talle`, `color`.

---

## Code Examples

### Línea exacta a insertar

```tsx
{
  isCampoVisible('objeto') && <FieldRow label="Tipo / Objeto" value={articulo.objeto} />
}
```

### Bloque resultante del grid Propiedades (estado final)

```tsx
// Fuente: apps/web/src/components/articulos/articulo-sheet.tsx — después del cambio
<div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
  {isCampoVisible('objeto') && <FieldRow label="Tipo / Objeto" value={articulo.objeto} />}
  {isCampoVisible('marca') && <FieldRow label="Marca" value={articulo.marca} />}
  {isCampoVisible('modelo') && <FieldRow label="Modelo" value={articulo.modelo} />}
  {isCampoVisible('talle') && <FieldRow label="Talle" value={articulo.talle} />}
  {isCampoVisible('color') && <FieldRow label="Color" value={articulo.color} />}
  {isCampoVisible('material') && <FieldRow label="Material" value={articulo.material} />}
  {isCampoVisible('presentacion') && (
    <FieldRow label="Presentacion" value={articulo.presentacion} />
  )}
  {isCampoVisible('medida') && <FieldRow label="Medida" value={articulo.medida} />}
</div>
```

---

## State of the Art

| Elemento                            | Estado actual antes de Phase 28   | Acción Phase 28          |
| ----------------------------------- | --------------------------------- | ------------------------ |
| `objeto` en DB schema               | Existe — Phase 22                 | Sin cambio               |
| `objeto` en tipo `Articulo`         | Existe (`objeto: string \| null`) | Sin cambio               |
| `objeto` en `CamposVisibles`        | Existe con default `true`         | Sin cambio               |
| `isCampoVisible('objeto')`          | Funcional                         | Sin cambio               |
| `objeto` en la lista de artículos   | Visible — Phase 22                | Sin cambio               |
| `objeto` en formulario crear/editar | Agregado — Phase 27               | Sin cambio               |
| `objeto` en `ArticuloSheet`         | AUSENTE                           | Agregar FieldRow en grid |

---

## Validation Architecture

### Test Framework

| Property           | Value                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Framework          | No test framework detectado (no hay pytest.ini, jest.config, ni vitest.config en el proyecto) |
| Config file        | none                                                                                          |
| Quick run command  | `pnpm --filter web build` (type-check via Next.js build)                                      |
| Full suite command | `pnpm --filter web build`                                                                     |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                        | Test Type | Automated Command         | File Exists? |
| ------- | --------------------------------------------------------------- | --------- | ------------------------- | ------------ |
| VIEW-02 | Campo `objeto` visible en ArticuloSheet sección Propiedades     | manual    | N/A                       | N/A          |
| VIEW-02 | Campo muestra label "Tipo / Objeto" con el valor del artículo   | manual    | N/A                       | N/A          |
| VIEW-02 | Campo respeta `isCampoVisible('objeto')` (desaparece si oculto) | manual    | N/A                       | N/A          |
| VIEW-02 | TypeScript compila sin errores                                  | smoke     | `pnpm --filter web build` | ✅           |

### Sampling Rate

- **Per task commit:** `pnpm --filter web build`
- **Per wave merge:** `pnpm --filter web build`
- **Phase gate:** Build verde + verificación visual manual antes de `/gsd:verify-work`

### Wave 0 Gaps

None — no hay infraestructura de tests que crear. La verificación es build TypeScript + visual manual.

---

## Open Questions

No hay preguntas abiertas. Todo el contexto está resuelto:

- Posición: primer campo en el grid de Propiedades (antes de marca) — coherente con Phase 27
- Label: "Tipo / Objeto" — decidido en Phase 27
- Patrón: idéntico a campos existentes en el mismo componente
- Infraestructura: completamente disponible (`isCampoVisible`, `FieldRow`, tipo `Articulo`)

---

## Sources

### Primary (HIGH confidence)

- `apps/web/src/components/articulos/articulo-sheet.tsx` — código fuente completo inspeccionado; confirmado que `objeto` está ausente del grid de Propiedades
- `apps/web/src/types/articulo.ts` — `Articulo` tiene `objeto: string | null`
- `apps/web/src/types/articulos-config.ts` — `CamposVisibles` tiene `objeto: boolean` con default `true`
- `apps/web/src/hooks/use-articulos-config.ts` — `isCampoVisible('objeto')` funcional
- `.planning/phases/27-add-objeto-to-form/27-RESEARCH.md` — contexto de Phase 27 (campo ya en formulario)

---

## Metadata

**Confidence breakdown:**

- Punto de integración exacto: HIGH — código fuente leído directamente, línea identificada
- Patrón de implementación: HIGH — replicación de código existente en el mismo archivo, sin ambigüedad
- Infraestructura circundante: HIGH — tipos, hook y config verificados directamente

**Research date:** 2026-03-13
**Valid until:** N/A — código estático, no depende de versiones externas
