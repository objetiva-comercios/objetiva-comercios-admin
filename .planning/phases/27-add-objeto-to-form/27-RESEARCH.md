# Phase 27: Add objeto Field to ArticuloForm - Research

**Researched:** 2026-03-13
**Domain:** React Hook Form + Zod schema extension, shadcn/ui FormField pattern
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Posicion: primer campo de la sección "Propiedades", antes de marca
- Orden resultante: objeto, marca, modelo, talle, color, material, presentación, medida
- Agregar `isCampoVisible('objeto')` a la condición del wrapper de la sección Propiedades
- Label: "Tipo / Objeto"
- Sin placeholder ni FormDescription — consistente con los demás campos de Propiedades
- Input estándar (mismo patrón que marca, modelo, etc.)
- Zod: `objeto: z.string().optional().or(z.literal(''))` — idéntico a marca, material, etc.
- FormField: mismo patrón que los demás campos de Propiedades
- Default value: `articulo?.objeto ?? ''` en defaultValues del form

### Claude's Discretion

- Grid placement exacto (col-span dentro del grid de Propiedades)
- Cualquier ajuste menor de spacing

### Deferred Ideas (OUT OF SCOPE)

- Tablas de parámetros para objeto, marca y demás propiedades — futura fase (cambiaría Input por Select/Combobox)
  </user_constraints>

---

## Summary

Esta fase cierra el gap INT-01 del audit v1.2: el campo `objeto` existe en el schema de DB (Phase 22) y aparece en la lista de artículos, pero el formulario de crear/editar no lo incluye. La corrección es quirúrgica: 3 cambios en 1 archivo (`articulo-form.tsx`).

El campo ya está completamente soportado en la infraestructura circundante: `CamposVisibles` tiene `objeto: boolean` con default `true`, el tipo `Articulo` tiene `objeto: string | null`, y `isCampoVisible('objeto')` ya funciona sin modificaciones adicionales.

**Primary recommendation:** Un solo plan de 1 tarea con 3 ediciones puntuales en `articulo-form.tsx`: agregar al Zod schema, al defaultValues, y al JSX de Propiedades.

---

## Standard Stack

### Core (ya instalado, sin cambios)

| Library             | Version   | Purpose                                     | Relevancia                                |
| ------------------- | --------- | ------------------------------------------- | ----------------------------------------- |
| react-hook-form     | instalado | Form state management                       | Pattern establecido en el form            |
| zod                 | instalado | Schema validation                           | `z.string().optional().or(z.literal(''))` |
| @hookform/resolvers | instalado | Zod → RHF bridge                            | Ningún cambio necesario                   |
| shadcn/ui Form\*    | instalado | FormField, FormItem, FormLabel, FormMessage | Componentes a reutilizar directamente     |

No hay instalaciones necesarias para esta fase.

---

## Architecture Patterns

### Patrón de campo en Propiedades (código exacto a replicar)

El patrón establecido en el form — cada campo en Propiedades es idéntico. Ejemplo referencia: `marca` (línea 232-246 del form actual):

```tsx
// Fuente: apps/web/src/components/articulos/articulo-form.tsx línea 232
{
  isCampoVisible('marca') && (
    <FormField
      control={form.control}
      name="marca"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Marca</FormLabel>
          <FormControl>
            <Input className="h-9" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
```

El campo `objeto` replica este patrón exactamente, con `name="objeto"` y `<FormLabel>Tipo / Objeto</FormLabel>`.

### Wrapper de la sección Propiedades

**Estado actual** (líneas 221-227):

```tsx
{(isCampoVisible('marca') ||
  isCampoVisible('modelo') ||
  isCampoVisible('talle') ||
  isCampoVisible('color') ||
  isCampoVisible('material') ||
  isCampoVisible('presentacion') ||
  isCampoVisible('medida')) && (
```

**Estado final** — agregar `isCampoVisible('objeto') ||` al inicio de la expresión:

```tsx
{(isCampoVisible('objeto') ||
  isCampoVisible('marca') ||
  ...
```

### Grid placement

La sección Propiedades usa `<div className="grid gap-3 sm:grid-cols-2">`. Todos los campos (marca, modelo, talle, color, material, presentacion) van dentro de este grid sin `col-span` explícito — cada uno ocupa 1 columna. `objeto` va primero dentro del grid, en la misma columna que los demás. `medida` está fuera del grid (líneas 324-338), debajo — no cambia.

---

## Puntos de integración exactos

| Ubicación                       | Cambio                                                    | Línea actual                   |
| ------------------------------- | --------------------------------------------------------- | ------------------------------ |
| `articuloFormSchema` (línea 28) | Agregar `objeto: z.string().optional().or(z.literal(''))` | Después de línea 40 (`medida`) |
| `defaultValues` (línea ~90)     | Agregar `objeto: articulo?.objeto ?? ''`                  | Después de `medida`            |
| Wrapper Propiedades (línea 221) | Agregar `isCampoVisible('objeto') \|\|` al inicio         | Primera condición              |
| Grid Propiedades (línea 232)    | Agregar FormField para `objeto` antes del de `marca`      | Primera posición en el grid    |

---

## Don't Hand-Roll

| Problema                | No construir      | Usar en cambio                                | Por qué                                             |
| ----------------------- | ----------------- | --------------------------------------------- | --------------------------------------------------- |
| Visibilidad condicional | Lógica custom     | `isCampoVisible('objeto')` existente          | Ya soportado en `CamposVisibles` con default `true` |
| Tipo del campo          | Inferencia manual | `Articulo.objeto: string \| null` ya definido | El tipo ya existe, `?? ''` maneja el null           |

---

## Common Pitfalls

### Pitfall 1: Olvidar agregar al wrapper condition

**What goes wrong:** El campo `objeto` se renderiza pero la sección Propiedades entera se oculta si todos los demás campos están ocultos — aunque `objeto` esté visible.
**How to avoid:** Agregar `isCampoVisible('objeto') ||` como **primera** condición del wrapper (línea 221).

### Pitfall 2: Agregar placeholder inconsistente con el patrón

**What goes wrong:** Los campos de Propiedades NO usan placeholder (a diferencia de Identificación). Agregar `placeholder="Tipo de objeto"` rompe la consistencia.
**How to avoid:** La decisión es sin placeholder ni FormDescription — el Input debe ser `<Input className="h-9" {...field} />` sin prop `placeholder`.

### Pitfall 3: Posición incorrecta en el grid

**What goes wrong:** Colocar `objeto` después de `marca` o en otra posición altera el orden decidido.
**How to avoid:** El FormField de `objeto` va como **primer hijo** dentro del `<div className="grid gap-3 sm:grid-cols-2">` de Propiedades.

---

## Code Examples

### Zod schema (agregar en articuloFormSchema)

```typescript
// Fuente: patrón establecido en articuloFormSchema línea 34
objeto: z.string().optional().or(z.literal('')),
```

### defaultValues (agregar en useForm)

```typescript
// Fuente: patrón establecido en defaultValues línea 96
objeto: articulo?.objeto ?? '',
```

### FormField completo para objeto

```tsx
{
  isCampoVisible('objeto') && (
    <FormField
      control={form.control}
      name="objeto"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tipo / Objeto</FormLabel>
          <FormControl>
            <Input className="h-9" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
```

---

## State of the Art

| Elemento                              | Estado actual                        | Acción Phase 27 |
| ------------------------------------- | ------------------------------------ | --------------- |
| `objeto` en DB schema                 | Existe (`text('objeto')`) — Phase 22 | Sin cambio      |
| `objeto` en tipo `Articulo`           | Existe (`objeto: string \| null`)    | Sin cambio      |
| `objeto` en `CamposVisibles`          | Existe con default `true`            | Sin cambio      |
| `objeto` en la lista de artículos     | Visible — Phase 22                   | Sin cambio      |
| `objeto` en `articuloFormSchema`      | AUSENTE                              | Agregar         |
| `objeto` en `defaultValues`           | AUSENTE                              | Agregar         |
| `objeto` en JSX Propiedades           | AUSENTE                              | Agregar         |
| `isCampoVisible('objeto')` en wrapper | AUSENTE                              | Agregar         |

---

## Validation Architecture

### Test Framework

| Property           | Value                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Framework          | No test framework detectado en el proyecto (no hay pytest.ini, jest.config, ni vitest.config) |
| Config file        | none                                                                                          |
| Quick run command  | `pnpm --filter web build` (type-check via Next.js build)                                      |
| Full suite command | `pnpm --filter web build`                                                                     |

### Phase Requirements → Test Map

Esta fase no tiene IDs de requirements formales (integration gap closure). La verificación es visual/manual:

| Comportamiento                             | Test Type | Método                                                                         |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| Campo `objeto` visible en formulario crear | manual    | Abrir /articulos/nuevo, verificar campo "Tipo / Objeto" en sección Propiedades |
| Campo `objeto` popula en modo edición      | manual    | Editar artículo con objeto != null, verificar que el campo muestra el valor    |
| TypeScript compila sin errores             | smoke     | `pnpm --filter web build`                                                      |
| Campo respeta `isCampoVisible('objeto')`   | manual    | Ocultar campo desde settings, verificar que desaparece del form                |

### Wave 0 Gaps

- No hay gaps de infraestructura de tests — no existe framework de tests en el proyecto.
- La verificación es build de TypeScript + verificación visual manual.

---

## Open Questions

No hay preguntas abiertas. Todo el contexto está resuelto:

- Posición: decidida (primer campo en grid Propiedades)
- Label: decidido ("Tipo / Objeto")
- Patrón: idéntico a campos existentes
- Infraestructura: ya completa (tipo, hook, config)

---

## Sources

### Primary (HIGH confidence)

- `apps/web/src/components/articulos/articulo-form.tsx` — código fuente completo del formulario inspeccionado directamente
- `apps/web/src/types/articulos-config.ts` — `CamposVisibles` incluye `objeto: boolean` con default `true`
- `apps/web/src/types/articulo.ts` — `Articulo` incluye `objeto: string | null`
- `apps/web/src/hooks/use-articulos-config.ts` — `isCampoVisible('objeto')` ya funcional
- `.planning/phases/27-add-objeto-to-form/27-CONTEXT.md` — decisiones de implementación bloqueadas

---

## Metadata

**Confidence breakdown:**

- Puntos de integración exactos: HIGH — código fuente leído directamente, líneas identificadas
- Patrón de implementación: HIGH — replicación de código existente, sin ambigüedad
- Infraestructura circundante: HIGH — tipos y hooks verificados directamente

**Research date:** 2026-03-13
**Valid until:** N/A — código estático, no depende de versiones externas
