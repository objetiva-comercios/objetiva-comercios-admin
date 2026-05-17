---
quick_id: 260517-i9d
slug: mover-propiedades-templates-a-settings-articulos
created: 2026-05-17T16:09:00Z
completed: 2026-05-17T16:25:00Z
status: completed
commits:
  - 405cd8f2 # Task 1: layout con tabs + visibilidad
  - ae9de274 # Task 2: mover propiedades
  - 49a3cff9 # Task 3: mover templates
  - debcbe5f # Task 4: navegación + sidebar
key-files:
  created:
    - apps/web/src/app/(dashboard)/settings/articulos/layout.tsx
    - apps/web/src/app/(dashboard)/settings/articulos/page.tsx
    - apps/web/src/app/(dashboard)/settings/articulos/visibilidad/page.tsx
    - apps/web/src/app/(dashboard)/settings/articulos/propiedades/page.tsx
    - apps/web/src/app/(dashboard)/settings/articulos/templates/page.tsx
    - apps/web/src/app/(dashboard)/settings/articulos/templates/[id]/page.tsx
  deleted:
    - apps/web/src/app/(dashboard)/settings/articulos/page.tsx (old, replaced by redirect)
    - apps/web/src/app/(dashboard)/propiedades/page.tsx
    - apps/web/src/app/(dashboard)/templates/page.tsx
    - apps/web/src/app/(dashboard)/templates/[id]/page.tsx
  modified:
    - apps/web/src/config/navigation.ts
    - apps/web/src/components/settings/settings-nav.tsx
---

# Quick 260517-i9d — Reubicar Propiedades + Templates → /settings/articulos

Consolidación de la configuración de artículos bajo `/settings/articulos` con un layout de tabs Tabler (Visibilidad / Propiedades / Templates) y limpieza de la navegación top-level antes del UAT.

## Resultado

| URL antes             | URL después                                  |
| --------------------- | -------------------------------------------- |
| `/settings/articulos` | `/settings/articulos/visibilidad` (redirect) |
| `/propiedades`        | `/settings/articulos/propiedades`            |
| `/templates`          | `/settings/articulos/templates`              |
| `/templates/[id]`     | `/settings/articulos/templates/[id]`         |

El sidebar principal ya no muestra **Propiedades** ni **Templates** como secciones de primer nivel — viven bajo Configuración → Artículos. El item lateral "Artículos" actualizó su descripción para reflejar el nuevo alcance.

## Detalle por task

### Task 1 — Layout con tabs + visibilidad (commit `405cd8f2`)

- Movido `apps/web/src/app/(dashboard)/settings/articulos/page.tsx` → `apps/web/src/app/(dashboard)/settings/articulos/visibilidad/page.tsx` (preservado el contenido íntegro de toggles).
- Removido el `<h2>Artículos</h2>` redundante del contenido de visibilidad — el layout ya provee el título de sección.
- Creado `apps/web/src/app/(dashboard)/settings/articulos/layout.tsx`:
  - Header `"Configuración de Artículos"` + descripción.
  - 3 tabs horizontales (Visibilidad / Propiedades / Templates) URL-driven con `<Link>` + `usePathname` en lugar del componente `Tabs` de shadcn. Razón: cada tab es una subruta con su propio loading state; los componentes shadcn `Tabs` aplican estilos de pills + shadow que NO son Tabler.
  - Estética Tabler: triggers `h-9`, underline con `border-b-2` para el activo (no pill background), text-sm font-medium, `gap-1` entre tabs, contenedor `border-b` para la línea horizontal.
  - Match activo con `startsWith` para soportar subrutas dinámicas (`templates/[id]`).
- Creado `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`: server component con `redirect('/settings/articulos/visibilidad')`.

### Task 2 — Mover Propiedades (commit `ae9de274`)

- `git mv` de `apps/web/src/app/(dashboard)/propiedades/page.tsx` → `apps/web/src/app/(dashboard)/settings/articulos/propiedades/page.tsx`.
- Eliminado el directorio vacío `apps/web/src/app/(dashboard)/propiedades/`.
- Removido el header redundante `<h2>Propiedades</h2>` — el wrapper ahora solo monta `<PropiedadesPage>` (que internamente tiene sus 8 tabs de catálogos: marca, color, talle, material, presentación, objeto, familia, aplicación).
- `PropiedadesPage` (componente compartido) no se tocó — su contrato con el resto del codebase queda intacto.

### Task 3 — Mover Templates (commit `49a3cff9`)

- `git mv` de `templates/page.tsx` y `templates/[id]/page.tsx` bajo `settings/articulos/templates/`.
- Eliminado el directorio vacío `apps/web/src/app/(dashboard)/templates/`.
- Lista de templates: el `<h2>Templates</h2>` redundante se reemplazó por una fila flex con la descripción y el botón "Nuevo template" (deshabilitado con tooltip — D-13 Phase 30).
- Detail page: mantiene su `<h2>` con `template.nombre` (no es redundante — el layout dice "Configuración de Artículos", el h2 muestra el nombre del template específico).
- Links internos actualizados:
  - Lista → detalle: `/templates/${id}` → `/settings/articulos/templates/${id}`.
  - Detalle → lista (Volver + push de error): `/templates` → `/settings/articulos/templates`.

### Task 4 — Navegación + sidebar (commit `debcbe5f`)

- `apps/web/src/config/navigation.ts`: removidos los entries Propiedades + Templates y los imports `Tags`/`Layers` que ya no se usan.
- `apps/web/src/components/settings/settings-nav.tsx`:
  - Description del item "Artículos" actualizada: `"Visibilidad de campos, propiedades y templates de composición"`.
  - **[Rule 1 - Bug]** Match activo cambiado de `pathname === item.href` a `pathname === item.href || pathname.startsWith(item.href + "/")` para que el item lateral "Artículos" siga resaltado cuando estás en `/visibilidad`, `/propiedades`, `/templates` o `/templates/[id]`. El comportamiento previo solo resaltaba la URL exacta, dejando el sidebar sin highlight visual en las subrutas.

## Decisiones de diseño aplicadas

| Decisión                                     | Razón                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tabs URL-driven con `<Link>`, no `Tabs`      | Cada tab es una subruta con loading state propio (Next.js App Router). El componente `Tabs` de shadcn aplica pills + shadow, no Tabler.                      |
| Underline activo `border-b-2 border-primary` | Patrón Tabler canónico para tabs internas; el componente shadcn por defecto usa pills/background.                                                            |
| Server redirect en `/settings/articulos`     | Garantiza que cualquier link viejo o bookmark a `/settings/articulos` aterrice en la tab por defecto.                                                        |
| Conservar inner tabs de `PropiedadesPage`    | Las 8 tabs de catálogos son contenido legítimo de la tab "Propiedades"; no hay anti-patrón de doble tab porque el outer cambia URL y el inner cambia estado. |
| Match activo del SettingsNav con startsWith  | Sin esto, el sidebar lateral pierde highlight al navegar dentro de Artículos — UX bug.                                                                       |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sidebar de Settings no resaltaba "Artículos" en subrutas**

- **Found during:** Task 4 (al revisar `settings-nav.tsx` para actualizar la description).
- **Issue:** El match `pathname === item.href` solo funciona cuando la URL exacta coincide. Con las nuevas subrutas (`/settings/articulos/visibilidad`, etc.) el item lateral "Artículos" quedaba sin highlight visual, rompiendo la UX de orientación.
- **Fix:** Cambio a `pathname === item.href || pathname.startsWith(item.href + "/")` (mismo patrón que el `ArticulosSettingsLayout` recién creado).
- **Files modified:** `apps/web/src/components/settings/settings-nav.tsx`
- **Commit:** `debcbe5f`

No hubo otras desviaciones. El plan se ejecutó en línea con el spec.

## Verificación

- `pnpm --filter @objetiva/web type-check` → exit 0
- `pnpm --filter @objetiva/web build` → exit 0 (27 rutas, incluye las 5 nuevas bajo `/settings/articulos/*`, NO incluye `/propiedades` ni `/templates` top-level)
- `cd apps/web && pnpm test -- --run` → 29/29 tests passing
- `grep -rn "from.*['\"]@/app/(dashboard)/propiedades['\"]" apps/web/src` → vacío
- `grep -rn "from.*['\"]@/app/(dashboard)/templates['\"]" apps/web/src` → vacío
- `docker compose build erp-web` → image rebuilt
- `docker compose up -d --no-deps erp-web` → container ready
- Smoke HTTP en container:
  - `/settings/articulos` → `307 → /login?returnTo=/settings/articulos` (middleware auth, ruta reconocida)
  - `/settings/articulos/{visibilidad,propiedades,templates}` → `307 → /login?returnTo=…` (rutas reconocidas)
  - `/propiedades` y `/templates` viejas → `307 → /login?returnTo=…` (middleware intercepta antes del 404; al login con sesión activa darán 404 como esperado)

El visual UAT lo realiza el usuario en `https://erp.sanchezrepuestos.com.ar/settings/articulos` mañana.

## Self-Check: PASSED

Archivos creados (verificados con `ls`):

- `apps/web/src/app/(dashboard)/settings/articulos/layout.tsx`
- `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`
- `apps/web/src/app/(dashboard)/settings/articulos/visibilidad/page.tsx`
- `apps/web/src/app/(dashboard)/settings/articulos/propiedades/page.tsx`
- `apps/web/src/app/(dashboard)/settings/articulos/templates/page.tsx`
- `apps/web/src/app/(dashboard)/settings/articulos/templates/[id]/page.tsx`

Directorios viejos eliminados:

- `apps/web/src/app/(dashboard)/propiedades/` — no existe
- `apps/web/src/app/(dashboard)/templates/` — no existe

Commits verificados con `git log`:

- `405cd8f2` — feat(quick-260517-i9d): add tabbed layout…
- `ae9de274` — feat(quick-260517-i9d): relocate /propiedades…
- `49a3cff9` — feat(quick-260517-i9d): relocate /templates…
- `debcbe5f` — feat(quick-260517-i9d): drop top-level Propiedades/Templates nav…
