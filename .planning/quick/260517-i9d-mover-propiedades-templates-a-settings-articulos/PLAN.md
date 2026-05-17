---
quick_id: 260517-i9d
slug: mover-propiedades-templates-a-settings-articulos
created: 2026-05-17T16:09:00Z
status: in-progress
---

# Quick Task: Reubicar Propiedades + Templates → /settings/articulos

## Contexto

Phase 30 dejó `/propiedades` y `/templates` como rutas top-level en el sidebar principal. UX-wise están mal ubicadas: son **configuración del modelo de artículos**, no secciones operativas equivalentes a Compras / Ventas / Pedidos. La sección `/settings/articulos` ya existe y maneja la visibilidad de campos de la lista/detalle de artículos.

## Objetivo

Consolidar bajo `/settings/articulos` toda la configuración relacionada con artículos:

1. Visibilidad de campos (lo que ya existe)
2. Propiedades (catálogos de atributos: marcas, colores, talles, materiales, presentaciones, objetos, calificadores, familias, aplicaciones, categorías, subcategorías) — mover desde `/propiedades`
3. Templates (composición SKU/Nombre + atributos del template) — mover desde `/templates`

## URL design

```
/settings/articulos                       → redirect a /settings/articulos/visibilidad
/settings/articulos/visibilidad           → toggles de campos visibles (contenido actual)
/settings/articulos/propiedades           → 8 tabs de catálogos de propiedades
/settings/articulos/templates             → lista de templates
/settings/articulos/templates/[id]        → editor de atributos del template
```

URLs viejas (`/propiedades`, `/templates`, `/templates/[id]`) se ELIMINAN — no hay redirects backwards porque ningún usuario externo las bookmarkeó y son rutas internas detrás de auth.

## UX patrón Tabler

Dentro de `/settings/articulos` rendear un layout con **tabs horizontales internas** (no sub-sidebar) — patrón Tabler para secciones con múltiples vistas de configuración. Tabs: `Visibilidad | Propiedades | Templates`. El parent layout `/settings` ya tiene sidebar lateral con secciones generales (Perfil, Negocio, Artículos, etc.); las tabs internas viven dentro del area de contenido de "Artículos".

## Tareas

### Task 1: Mover contenido visibilidad → subruta + crear layout con tabs

1. **Mover** `apps/web/src/app/(dashboard)/settings/articulos/page.tsx` → `apps/web/src/app/(dashboard)/settings/articulos/visibilidad/page.tsx` (contenido íntegro, sin cambios funcionales).

2. **Crear** `apps/web/src/app/(dashboard)/settings/articulos/layout.tsx`:
   - Header con título "Configuración de Artículos" + descripción ("Visibilidad de campos, catálogos de propiedades y templates de composición")
   - Tabs horizontales debajo del header — 3 tabs (Visibilidad, Propiedades, Templates)
   - Tabs usan estética Tabler: `h-9` triggers, underline activo, sin pill background
   - El children renderiza la subruta activa
   - Layout es client component porque necesita `usePathname` para resaltar tab activa

3. **Crear** `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`:
   - Server component que hace `redirect('/settings/articulos/visibilidad')`

### Task 2: Mover Propiedades → /settings/articulos/propiedades

1. **Mover** `apps/web/src/app/(dashboard)/propiedades/page.tsx` → `apps/web/src/app/(dashboard)/settings/articulos/propiedades/page.tsx`
2. **Eliminar** el directorio viejo `apps/web/src/app/(dashboard)/propiedades/` (debe quedar vacío después del move)
3. **Verificar** que ningún componente importa el path viejo. Si la página tiene `<PageHeader>` redundante con el nuevo layout (título "Propiedades"), removerlo — el layout ya provee el contexto.

### Task 3: Mover Templates → /settings/articulos/templates

1. **Mover** `apps/web/src/app/(dashboard)/templates/page.tsx` → `apps/web/src/app/(dashboard)/settings/articulos/templates/page.tsx`
2. **Mover** `apps/web/src/app/(dashboard)/templates/[id]/page.tsx` → `apps/web/src/app/(dashboard)/settings/articulos/templates/[id]/page.tsx`
3. **Eliminar** el directorio viejo `apps/web/src/app/(dashboard)/templates/`
4. **Buscar y reemplazar** referencias internas a `/templates/` en JSX/TSX (debería ser solo el `Link` desde la lista hacia el detalle dentro de los mismos archivos movidos)
5. Si la página tiene `<PageHeader>` redundante con el layout, removerlo — el layout ya tiene contexto.

### Task 4: Actualizar navegación + verificar build

1. **Editar** `apps/web/src/config/navigation.ts`:
   - REMOVER el entry `Propiedades` (icon Tags, href `/propiedades`)
   - REMOVER el entry `Templates` (icon Layers, href `/templates`)
   - Remover imports `Tags` y `Layers` si no se usan en otro lado
2. **Editar** `apps/web/src/components/settings/settings-nav.tsx`:
   - Actualizar el item "Artículos" description: "Visibilidad de campos, propiedades y templates de composición"
3. **Verificar:**
   - `pnpm --filter @objetiva/web type-check` → exit 0
   - `pnpm --filter @objetiva/web build` → exit 0
   - `cd apps/web && pnpm test -- --run` → 29/29 passing (sin regresiones)
   - `grep -r "from.*['\"]@/app/(dashboard)/propiedades['\"]" apps/web/src` → vacío
   - `grep -r "from.*['\"]@/app/(dashboard)/templates['\"]" apps/web/src` → vacío

## Restricciones

- **NO modificar** el código de los componentes movidos más allá de remover headers redundantes y arreglar imports — solo file moves.
- **NO modificar** endpoints backend, schema DB, ni lógica de negocio. Esto es 100% reorganización de rutas frontend.
- **NO añadir nuevos features** — solo mover + agregar el layout de tabs.
- **Tabler estética:** triggers de tabs h-9 con underline activo (NO pills), border-radius md, gap-4. Usar componente Tabs de shadcn/ui (`@/components/ui/tabs`).
- **Idioma:** todo el contenido en español (es-MX). Labels: "Visibilidad", "Propiedades", "Templates".
- **Frontend-design skill:** consultá si dudás del patrón visual exacto; el objetivo es que la navegación interna se sienta natural y consistente con el resto del admin.

## Verificación final

- Type-check y build verdes
- 29/29 tests passing
- Navegando a `/settings/articulos` redirige a `/visibilidad`
- Las tabs cambian de URL al clickear y resaltan correctamente
- Sidebar top-level NO muestra Propiedades ni Templates
- Sidebar de Settings muestra "Artículos" con descripción actualizada
- Las 3 vistas (visibilidad, propiedades, templates) funcionan exactamente como antes

## Commit strategy

Un commit atómico por task (4 commits total + SUMMARY commit = 5 commits).

## Output

`SUMMARY.md` en `.planning/quick/260517-i9d-mover-propiedades-templates-a-settings-articulos/` documentando los moves, layouts creados, navigation cleanup, verificación.
