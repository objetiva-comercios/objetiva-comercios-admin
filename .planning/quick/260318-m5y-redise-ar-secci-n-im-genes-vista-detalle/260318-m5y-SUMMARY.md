---
phase: quick-260318-m5y
plan: '01'
subsystem: articulos-ui
tags: [images, sheet, layout, ux]
dependency_graph:
  requires: []
  provides: [unified-image-slots-layout]
  affects: [articulo-sheet]
tech_stack:
  added: []
  patterns: [flex-layout, conditional-slot-rendering]
key_files:
  modified:
    - apps/web/src/components/articulos/articulo-sheet.tsx
decisions:
  - 'Replaced IIFE conditional rendering with always-visible 9-slot horizontal row'
  - 'Used flex-[6]/flex-[3] on labels for proportional centering over slot groups'
  - 'h-14 container with aspect-square slots keeps images compact in the 480-640px sheet'
metrics:
  duration: '5 minutes'
  completed_date: '2026-03-18'
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-260318-m5y Plan 01: Redisenar seccion imagenes vista detalle Summary

**One-liner:** Unified 9-slot horizontal image row (6 producto + separator + 3 etiqueta) with placeholders — no more conditional empty/populated states.

## Tasks Completed

| Task | Name                                                       | Commit  | Files                                                |
| ---- | ---------------------------------------------------------- | ------- | ---------------------------------------------------- |
| 1    | Replace images section with unified horizontal slot layout | 2578ab7 | apps/web/src/components/articulos/articulo-sheet.tsx |

## What Was Built

Replaced the images section in `articulo-sheet.tsx` (lines 194-266) with a single, consistent layout:

- A labels row with `flex-[6]` "Producto" and `flex-[3]` "Etiqueta" spans, correctly centering over their slot groups
- A `h-14` flex container with `items-stretch` and `gap-1`
- 6 producto slots: image button (with thumbnail + hover opacity) if url exists, muted placeholder with `ImageIcon` if null
- A `w-px bg-border self-stretch mx-0.5` vertical separator
- 3 etiqueta slots: same image/placeholder pattern
- Lightbox functionality fully preserved via `openLightboxForType` onClick handlers

The previous implementation used an IIFE with three branches: empty state (6 gray boxes + "Sin imagenes" header), populated etiquetas section (grid), and populated productos section (grid). The new layout is unconditional — same markup regardless of image count.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- File exists: `apps/web/src/components/articulos/articulo-sheet.tsx` — FOUND
- Commit 2578ab7 exists — FOUND
- TypeScript: no errors (`npx tsc --noEmit` passed with no output)
