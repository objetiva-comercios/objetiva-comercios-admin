---
plan: 260409-ndp
one_liner: Rewrite migrate-images.ts to read from sanchez DB and write processed images to erp_sanchez
status: complete
commits:
  - bd587ff: "fix(quick-260409-ndp): rewrite migrate-images to read from sanchez DB and write to erp_sanchez"
deviations: []
---

# Quick Task 260409-ndp: Fix migrate-images dual-DB

## Diagnosis
- Images existed on disk (6,390 webp) but DB fields were empty arrays for ALL 100K articulos
- Root cause: script read from erp_sanchez (empty) instead of sanchez (6,549 with label_images)

## What Changed
- `apps/backend/src/db/migrate-images.ts`: Complete rewrite with dual DB connections
  - Reads from sanchez: label_images, article_images, label_ocrs, descripcion_web, json_articulo
  - Writes to erp_sanchez: imagenes_etiqueta, imagenes_producto, etiquetas_ocr, descripcion_web, json_articulo
  - Resolves source images from alfred, detects existing webp to avoid reprocessing

## Verification
- 3-6100: processed 1 etiqueta, DB updated
- 50-130: reused existing webp + processed missing, DB updated
- Full migration pending
