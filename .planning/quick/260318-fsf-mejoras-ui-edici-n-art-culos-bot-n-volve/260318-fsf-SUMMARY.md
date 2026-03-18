---
phase: quick
plan: 260318-fsf
subsystem: web/articulos
tags: [ui, articulos, header, switch, edit-page]
one-liner: 'Header simplificado con Volver outline + Switch activo/inactivo en card Identificacion del formulario'

dependency-graph:
  requires: []
  provides: [UI-EDIT-HEADER, UI-EDIT-TOGGLE]
  affects: [articulos-edit-page, articulo-form]

tech-stack:
  added: []
  patterns: [callback-prop, controlled-switch]

key-files:
  modified:
    - apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx
    - apps/web/src/components/articulos/articulo-form.tsx

decisions:
  - Switch no modifica el campo activo del form directamente — delega al AlertDialog existente via callback

metrics:
  duration: ~10 min
  completed: 2026-03-18
  tasks-completed: 2
  files-modified: 2
---

# Quick Task 260318-fsf: Mejoras UI Edicion Articulos — Boton Volver + Switch Activo

## Summary

Header de edicion de articulos simplificado: solo muestra Volver (outline, mismo tamaño que Guardar) y Guardar. El titulo h1 muestra el nombre completo sin truncar. El toggle activo/inactivo fue movido a un Switch en la card Identificacion del formulario.

## Tasks Completed

| Task | Name                                                  | Commit  | Files               |
| ---- | ----------------------------------------------------- | ------- | ------------------- |
| 1    | Simplificar header sticky y pasar callback de toggle  | c19051b | `page.tsx`          |
| 2    | Agregar Switch activo/inactivo en card Identificacion | 83bf43b | `articulo-form.tsx` |

## Changes Made

### Task 1 — Header simplificado (`page.tsx`)

- Boton Volver: `variant="ghost"` → `variant="outline"` con `className="h-8 text-sm shrink-0"` (igual visual que Guardar)
- Titulo h1: eliminado `truncate max-w-[300px]`, nombre completo visible
- Eliminado el Badge activo/inactivo del header
- Eliminado el boton Desactivar/Reactivar del header
- Eliminado el import de `Badge`
- Agregadas props `onToggleActivo` e `isActivo` al componente `ArticuloForm`

### Task 2 — Switch en card Identificacion (`articulo-form.tsx`)

- Agregadas props opcionales `onToggleActivo?: () => void` e `isActivo?: boolean` a `ArticuloFormProps`
- Switch inline con el `SectionHeader` de Identificacion (solo visible en modo edit cuando se pasa `onToggleActivo`)
- Muestra texto "Activo" / "Inactivo" a la izquierda del Switch
- Click en Switch dispara `onToggleActivo()` que abre el AlertDialog de confirmacion existente
- El campo `activo` del schema del formulario no fue modificado — sigue disponible para el submit

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compila sin errores (`npx tsc --noEmit`)
- Header resultante: Volver (outline, h-8) izquierda + titulo completo + Guardar derecha
- Sin Badge ni boton Desactivar en el header
- Switch en card Identificacion refleja estado activo del articulo
- Click en Switch abre AlertDialog de confirmacion (flujo existente sin cambios)

## Self-Check: PASSED

- `/home/sanchez/proyectos/objetiva-comercios-admin/apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` — FOUND
- `/home/sanchez/proyectos/objetiva-comercios-admin/apps/web/src/components/articulos/articulo-form.tsx` — FOUND
- Commit c19051b — FOUND
- Commit 83bf43b — FOUND
