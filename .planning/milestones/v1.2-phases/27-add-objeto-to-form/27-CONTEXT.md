# Phase 27: Add objeto Field to ArticuloForm - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

El campo `objeto` (agregado al schema en Phase 22) se vuelve editable en el formulario de crear/editar artículos. Solo se agrega al Zod schema, se renderiza como FormField en la sección Propiedades, y se popula con el valor existente en modo edición.

</domain>

<decisions>
## Implementation Decisions

### Posición en el formulario

- Primer campo de la sección "Propiedades", antes de marca
- Orden resultante: objeto, marca, modelo, talle, color, material, presentación, medida
- También agregar `isCampoVisible('objeto')` a la condición del wrapper de la sección Propiedades

### Label y placeholder

- Label: "Tipo / Objeto"
- Sin placeholder ni FormDescription — consistente con los demás campos de Propiedades
- Input estándar (mismo patrón que marca, modelo, etc.)

### Patrón de implementación

- Zod: `objeto: z.string().optional().or(z.literal(''))` — idéntico a marca, material, etc.
- FormField: mismo patrón que los demás campos de Propiedades (Input + FormLabel + FormMessage)
- Default value: `articulo?.objeto ?? ''` en el objeto defaultValues del form

### Claude's Discretion

- Grid placement exacto (col-span dentro del grid de Propiedades)
- Cualquier ajuste menor de spacing

</decisions>

<specifics>
## Specific Ideas

- En futuras etapas, objeto (y otros campos de Propiedades como marca) se tomarán de tablas de parámetros — por ahora es texto libre con Input estándar
- El campo ya existe en DB schema (`objeto: text('objeto')`) y en la tabla de la lista (Phase 22)

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ArticuloForm` (`components/articulos/articulo-form.tsx`): formulario con Zod schema + React Hook Form, sección Propiedades en líneas 220-340
- `useArticulosConfig` (`hooks/use-articulos-config.ts`): hook con `isCampoVisible()` ya soporta 'objeto'
- Patrón de campo: cada campo en Propiedades es un bloque `{isCampoVisible('campo') && (<FormField .../>)}` dentro de un grid

### Established Patterns

- Zod string opcional: `z.string().optional().or(z.literal(''))`
- FormField estándar: `<FormField control={form.control} name="campo" render={({field}) => <FormItem>...`
- Default values: `campo: articulo?.campo ?? ''`

### Integration Points

- `articuloFormSchema` (línea 28): agregar campo objeto
- Sección Propiedades (línea 220): agregar `isCampoVisible('objeto')` al wrapper y FormField antes de marca
- `defaultValues` en useForm (línea ~85): agregar `objeto: articulo?.objeto ?? ''`

</code_context>

<deferred>
## Deferred Ideas

- Tablas de parámetros para objeto, marca y demás propiedades — futura fase (cambiaría Input por Select/Combobox)

</deferred>

---

_Phase: 27-add-objeto-to-form_
_Context gathered: 2026-03-13_
