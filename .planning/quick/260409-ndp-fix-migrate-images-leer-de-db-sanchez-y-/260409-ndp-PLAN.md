---
phase: quick-260409-ndp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/backend/src/db/migrate-images.ts
autonomous: true
must_haves:
  truths:
    - "Script connects to TWO databases: sanchez (source read) and erp_sanchez (target write)"
    - "Images are read from sanchez.articulos fields label_images and article_images"
    - "Processed webp files and metadata are written to erp_sanchez.articulos"
    - "Existing webp files in uploads/ are reused without reprocessing"
    - "Missing source files are logged as warnings without stopping execution"
    - "Script supports --dry-run and single-codigo mode"
  artifacts:
    - path: "apps/backend/src/db/migrate-images.ts"
      provides: "Complete migration script with dual-DB connection"
      min_lines: 200
  key_links:
    - from: "migrate-images.ts"
      to: "sanchez DB"
      via: "postgres connection to localhost:5432/sanchez"
      pattern: "sourceDb.*sanchez"
    - from: "migrate-images.ts"
      to: "erp_sanchez DB"
      via: "postgres connection to localhost:5432/erp_sanchez"
      pattern: "targetDb.*erp_sanchez"
    - from: "migrate-images.ts"
      to: "alfred uploads"
      via: "filesystem read from /home/sanchez/proyectos/sanchez-vps-alfred/uploads/pim/inventario"
      pattern: "sanchez-vps-alfred"
---

<objective>
Rewrite migrate-images.ts to read image source paths from DB `sanchez` and write processed results to DB `erp_sanchez`.

Purpose: The current script reads from erp_sanchez where image arrays are empty. The actual image paths live in the `sanchez` database in fields `label_images`, `article_images`, `label_ocrs`, `descripcion_web`, and `json_articulo`.

Output: A working migration script that processes ~7,000 articulos with images from the source DB.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/backend/src/db/migrate-images.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite migrate-images.ts with dual-DB connections and correct field mapping</name>
  <files>apps/backend/src/db/migrate-images.ts</files>
  <action>
Rewrite the entire script. Key changes from current version:

**1. Two DB connections (hardcoded, this is a one-time script):**
```
const sourceDb = postgres('postgresql://sanchez:S4nch3zR3pu3st0s@localhost:5432/sanchez')
const targetDb = postgres('postgresql://sanchez:S4nch3zR3pu3st0s@localhost:5432/erp_sanchez')
```

**2. Read from sourceDb (sanchez.articulos):**
Query fields: `codigo, label_images, article_images, label_ocrs, descripcion_web, json_articulo`
- `label_images` and `article_images` are jsonb arrays of strings like `"/images/temporales/IMG_xxx.jpg"` or `"/images/labelImages_xxx.jpg"`
- Filter: WHERE `label_images IS NOT NULL AND label_images != '[]'::jsonb OR article_images IS NOT NULL AND article_images != '[]'::jsonb`
- If codigoArg provided, filter by codigo too

**3. Resolve source files from ALFRED path (NOT from uploads/):**
```
const ALFRED_BASE = '/home/sanchez/proyectos/sanchez-vps-alfred/uploads/pim/inventario'
```
Given a source path like `/images/temporales/IMG_xxx.jpg`, the real file is at `${ALFRED_BASE}/images/temporales/IMG_xxx.jpg`.

**4. Check for existing webp BEFORE processing:**
Before calling sharp, check if `uploads/articulos/{etiquetas|productos}/{sanitizedCodigo}_{slot}_{detail|thumb}.webp` already exists. If BOTH detail and thumb exist, skip processing and use the existing URL. This makes the script idempotent and avoids reprocessing the ~6,390 already-done files.

**5. Write to targetDb (erp_sanchez.articulos):**
Match by codigo. Update fields:
- `imagenes_etiqueta` = text[] of new URLs from label_images processing
- `imagenes_producto` = text[] of new URLs from article_images processing  
- `etiquetas_ocr` = the label_ocrs array from source (direct copy, cast to text[])
- `descripcion_web` = the descripcion_web string from source (direct copy)
- `json_articulo` = the json_articulo jsonb from source (direct copy)
- `actualizado = now()`

**6. Handle edge cases:**
- Empty strings in source arrays: skip (filter out before processing)
- Null/empty arrays: skip that field entirely
- Source file not found in alfred: log warning `"⚠ {codigo} slot {n}: fuente no encontrada: {path}"`, set that slot to null in output array
- Already migrated check: if imagenes_etiqueta/imagenes_producto in target already have `/api/uploads/` URLs, skip that articulo (log as "ya migrado")

**7. CLI interface (keep same as current):**
- `pnpm tsx src/db/migrate-images.ts` — all
- `pnpm tsx src/db/migrate-images.ts CODIGO` — single
- `pnpm tsx src/db/migrate-images.ts --dry-run` — no writes
- `pnpm tsx src/db/migrate-images.ts CODIGO --dry-run` — single, no writes

**8. Progress and summary:**
- Log each articulo: `[N/total] CODIGO — X etiqueta(s), Y producto(s)` 
- At end: total processed, migrated, skipped (ya migrado), with errors, images processed, images reused (existing webp)
- Close BOTH db connections at end

**9. Keep existing helpers:** sanitizeCodigo, buildFileName, subdir, processImage (with sharp thumb+detail). Only change resolveOldFile to resolve from ALFRED_BASE instead of UPLOADS_BASE.

**Important:** The source DB fields (label_images, article_images) are jsonb, not text[]. Parse accordingly. The target DB fields (imagenes_etiqueta, imagenes_producto) are text[]. The etiquetas_ocr target field is also text[]; label_ocrs in source is jsonb array — cast appropriately.
  </action>
  <verify>
    <automated>cd /home/sanchez/proyectos/objetiva-comercios-admin/apps/backend && npx tsx src/db/migrate-images.ts 005100VA --dry-run 2>&1 | head -20</automated>
  </verify>
  <done>
- Script connects to sanchez DB and reads label_images/article_images
- Script resolves source files from alfred path
- Script detects existing webp files and skips reprocessing
- Script writes correct URLs to erp_sanchez.articulos
- --dry-run mode shows what would be done without writing
- Single-codigo mode works (e.g., `005100VA`)
- Missing source files are warned but don't crash the script
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| script→filesystem | Reads from alfred path, writes to uploads/ |
| script→source DB | Read-only access to sanchez DB |
| script→target DB | Write access to erp_sanchez.articulos |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-ndp-01 | T (Tampering) | DB credentials | accept | One-time migration script with hardcoded local credentials, not deployed to production |
| T-ndp-02 | D (DoS) | sharp processing | mitigate | Process one articulo at a time (sequential), not parallel batch |
| T-ndp-03 | I (Info Disclosure) | console logs | accept | Script runs locally by admin, logs are ephemeral |
</threat_model>

<verification>
1. Run with --dry-run on a known codigo that has images in sanchez DB: should show image paths found
2. Run without --dry-run on a single codigo: should create/reuse webp files and update erp_sanchez
3. Run again on same codigo: should detect "ya migrado" and skip
4. Run on a codigo with no images: should skip gracefully
</verification>

<success_criteria>
- Script reads from sanchez DB (not erp_sanchez) for image source paths
- Script writes processed URLs to erp_sanchez.articulos
- Existing webp files are reused without reprocessing
- All 5 fields are migrated: imagenes_etiqueta, imagenes_producto, etiquetas_ocr, descripcion_web, json_articulo
- Script is idempotent: re-running skips already-migrated articulos
</success_criteria>

<output>
After completion, create `.planning/quick/260409-ndp-fix-migrate-images-leer-de-db-sanchez-y-/260409-ndp-SUMMARY.md`
</output>
