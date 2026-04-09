---
phase: quick-260319-whs
plan: 01
one_liner: 'Fix sticky header gap en edición y error 500 al subir imagen'
status: complete
commits: [f4a232d]
---

# Summary: Fix sticky header gap y error upload imagen

## What Changed

### 1. Sticky header gap (edición artículo)

- **Causa**: El `<main>` del layout tiene `p-6` (24px padding). El sticky header con `top-0` se pegaba al top del scroll container pero no cubría el padding, dejando un gap visible.
- **Fix**: Agregado `-mt-6` al sticky header para que cubra el padding del main.

### 2. Error 500 al subir imagen

- **Causa**: Mismatch entre schema Drizzle (define `jsonb`) y DB real (tenía `text[]`). Al hacer UPDATE con un array JS, Drizzle lo serializaba como JSON pero PostgreSQL esperaba text array syntax.
- **Fix**: Convertidas las columnas `imagenes_producto`, `imagenes_etiqueta`, `etiquetas_ocr` de `text[]` a `jsonb` en la DB con `ALTER TABLE ... TYPE jsonb USING to_jsonb(...)`. Defaults seteados a `'[]'::jsonb`.
