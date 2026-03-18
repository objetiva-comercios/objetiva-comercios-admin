---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx
  - apps/web/src/components/articulos/articulo-form.tsx
autonomous: true
requirements: [UI-EDIT-HEADER, UI-EDIT-TOGGLE]

must_haves:
  truths:
    - 'El header sticky solo muestra Volver (izquierda) y Guardar (derecha)'
    - 'El boton Volver tiene variant outline y mismo tamano que Guardar'
    - 'El titulo h1 muestra el nombre completo sin truncar'
    - 'El estado activo/inactivo se controla con un Switch en la card Identificacion'
    - 'Al cambiar el Switch se muestra el dialogo de confirmacion existente'
  artifacts:
    - path: 'apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx'
      provides: 'Header simplificado + callback para toggle'
    - path: 'apps/web/src/components/articulos/articulo-form.tsx'
      provides: 'Switch activo/inactivo en card Identificacion'
  key_links:
    - from: 'articulo-form.tsx'
      to: 'page.tsx'
      via: 'onToggleActivo callback prop'
      pattern: "onToggleActivo\\?\\(\\)"
---

<objective>
Simplificar el header sticky de edicion de articulos y reubicar el toggle activo/inactivo como Switch en la primera card del formulario.

Purpose: Mejorar la visibilidad del boton Volver, mostrar el nombre completo del articulo, y reemplazar el badge+boton desactivar por un Switch mas intuitivo en el formulario.
Output: Header limpio con solo Volver+Guardar, Switch de estado en card Identificacion.
</objective>

<execution_context>
@/home/sanchez/.claude/get-shit-done/workflows/execute-plan.md
@/home/sanchez/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx
@apps/web/src/components/articulos/articulo-form.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Simplificar header sticky y pasar callback de toggle</name>
  <files>apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx</files>
  <action>
Modificar el sticky header (lineas 135-173) para que quede asi:

1. **Boton Volver** (izquierda): Cambiar de `variant="ghost" size="sm"` a `variant="outline" size="sm" className="h-8 text-sm shrink-0"`. Mismo estilo visual que Guardar pero con outline. Mantener el Link a /articulos y el icono ArrowLeft.

2. **Titulo h1** (centro-izquierda): Quitar `truncate max-w-[300px]`. Dejar solo `className="text-lg font-semibold tracking-tight"`. Mantener `min-w-0` en el contenedor padre para que no rompa el layout.

3. **Eliminar el Badge** de activo/inactivo del header (linea 148-150).

4. **Eliminar el boton Desactivar/Reactivar** del header (lineas 153-160). Solo dejar el boton Guardar en la derecha.

5. **Quitar el import de Badge** ya que no se usa mas en este archivo.

6. **Pasar nueva prop a ArticuloForm**: Agregar `onToggleActivo={() => setShowToggleDialog(true)}` y `isActivo={articulo.activo}` como props al componente ArticuloForm (linea 179-186).

El header resultante debe tener esta estructura:

- Izquierda: [Volver (outline, h-8)] + [h1 Editar: {nombre completo}]
- Derecha: [Guardar]
  </action>
  <verify>
  <automated>cd /home/sanchez/proyectos/objetiva-comercios-admin && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>Header solo muestra Volver (outline, mismo tamano que Guardar) + titulo completo + Guardar. Sin badge ni boton desactivar.</done>
  </task>

<task type="auto">
  <name>Task 2: Agregar Switch activo/inactivo en card Identificacion del formulario</name>
  <files>apps/web/src/components/articulos/articulo-form.tsx</files>
  <action>
1. **Agregar props opcionales** a ArticuloFormProps:
   - `onToggleActivo?: () => void` — callback que abre el dialogo de confirmacion
   - `isActivo?: boolean` — estado actual del articulo (para mostrar en el Switch)

2. **Agregar Switch en la card Identificacion** (el primer `div.border.rounded-sm`, linea 152): Insertar un contenedor flex entre el SectionHeader y el grid de campos. El SectionHeader y el Switch deben estar en una fila:

```tsx
<div className="flex items-center justify-between">
  <SectionHeader title="Identificacion" />
  {mode === 'edit' && onToggleActivo && (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{isActivo ? 'Activo' : 'Inactivo'}</span>
      <Switch checked={isActivo} onCheckedChange={() => onToggleActivo()} />
    </div>
  )}
</div>
```

El Switch solo se muestra en modo edit (no en create). Usa `isActivo` prop para el estado visual (no el form field) porque el toggle real pasa por la API via el dialogo de confirmacion del page. El Switch NO modifica el form field `activo` directamente — solo dispara el callback que abre el AlertDialog.

3. **No tocar el campo `activo` del schema** ni su defaultValue — sigue existiendo para el submit del formulario pero no se muestra como campo editable visible.
   </action>
   <verify>
   <automated>cd /home/sanchez/proyectos/objetiva-comercios-admin && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30</automated>
   </verify>
   <done>La card Identificacion muestra un Switch Activo/Inactivo en la esquina superior derecha. Al togglear el Switch se abre el dialogo de confirmacion existente. Solo visible en modo edit.</done>
   </task>

</tasks>

<verification>
- `npx tsc --noEmit` compila sin errores
- Visualmente: header tiene solo Volver (outline) y Guardar, titulo completo sin truncar
- Switch en card Identificacion refleja el estado activo del articulo
- Click en Switch abre el AlertDialog de confirmacion
</verification>

<success_criteria>

- Header limpio: Volver (outline, h-8) a la izquierda, Guardar a la derecha
- Nombre completo visible en el titulo (sin truncate)
- No hay Badge ni boton Desactivar en el header
- Switch activo/inactivo en la card Identificacion (solo modo edit)
- El flujo de confirmacion (AlertDialog) sigue funcionando igual
- TypeScript compila sin errores
  </success_criteria>

<output>
After completion, create `.planning/quick/260318-fsf-mejoras-ui-edici-n-art-culos-bot-n-volve/260318-fsf-SUMMARY.md`
</output>
