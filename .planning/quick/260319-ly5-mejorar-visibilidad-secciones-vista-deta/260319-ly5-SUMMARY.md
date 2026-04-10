---
phase: quick-260319-ly5
plan: 01
one_liner: 'Mejorar jerarquía visual de secciones en vista detalle artículo con estética Tabler'
status: complete
commits: [28032cc]
---

# Summary: Mejorar visibilidad secciones vista detalle artículo

## What Changed

### articulo-sheet.tsx — Visual Hierarchy Improvements

**SectionHeader** — De `text-xs font-medium text-muted-foreground uppercase tracking-wide` a `text-sm font-semibold text-foreground border-l-2 border-primary pl-2`. Borde izquierdo de acento + texto prominente crea ancla visual clara para cada sección.

**FieldRow** — Labels ahora con `font-medium` para diferenciar visualmente del valor.

**StatCard** — Agregado `border-l-2 border-primary/30` como acento sutil en los cards hero de precio/costo/stock.

**CollapsibleSection** — Trigger cambió de `font-medium hover:underline` a `font-semibold text-foreground hover:text-primary transition-colors`. Se ve más interactivo y moderno.

**Stock table** — Header row con `bg-muted` para anclar visualmente la tabla.

**Secciones contenedoras** — Propiedades y Stock envueltas en `bg-card/50 rounded-sm border p-3` creando bloques visuales diferenciados.

**Separadores** — Eliminados 3 `<Separator />` redundantes entre secciones (ahora las cards hacen la separación). Solo queda el separador entre stat cards e imágenes.

**Spacing** — Contenedor principal de `space-y-4` a `space-y-3` para cohesión Tabler.

## Verification

- TypeScript compila sin errores (`npx tsc --noEmit`)
- Todos los cambios son puramente CSS/Tailwind — sin cambios de lógica ni estructura
