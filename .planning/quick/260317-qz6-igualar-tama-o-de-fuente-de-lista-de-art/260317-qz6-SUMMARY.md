---
phase: quick
plan: 260317-qz6
subsystem: ui/tables
tags: [style, consistency, data-table]
key-files:
  modified:
    - apps/web/src/components/tables/data-table.tsx
decisions: []
metrics:
  duration: ~2min
  completed: 2026-03-17T19:28:16Z
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 260317-qz6: Igualar tamaño de fuente en DataTable

**One-liner:** Added `text-sm py-2` to `TableHead` and `TableCell` in `DataTable` to match the compact style already applied in `ServerDataTable`.

## What Was Done

Applied `className="text-sm py-2"` to:

- `TableHead` (line 92) — column headers
- `TableCell` (line 112) — data cells

This matches the existing style in `ServerDataTable` (used by the artículos table), making all tables in the app visually consistent.

## Deviations from Plan

The verification script expected 3 instances of `text-sm py-2`, assuming the empty-state `TableCell` also had that class. It does not — it has `className="h-24 text-center"` which is correct and intentional. The 2 target elements were updated as specified. No fix needed.

## Commits

| Hash    | Message                                                                 |
| ------- | ----------------------------------------------------------------------- |
| d28cd8c | fix(quick-qz6): apply text-sm py-2 to DataTable TableHead and TableCell |

## Self-Check: PASSED

- [x] `apps/web/src/components/tables/data-table.tsx` modified with 2 new `text-sm py-2` class additions
- [x] Commit d28cd8c exists
