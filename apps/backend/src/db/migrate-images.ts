/**
 * migrate-images.ts
 *
 * Lee label_images y article_images de la DB `sanchez` (fuente),
 * procesa los JPG con sharp (thumb + detail webp),
 * y escribe las rutas nuevas en `erp_sanchez.articulos`.
 *
 * Tambien copia label_ocrs, descripcion_web y json_articulo.
 *
 * Uso:
 *   pnpm tsx src/db/migrate-images.ts C30421MA           # uno solo
 *   pnpm tsx src/db/migrate-images.ts C30421MA --dry-run  # sin escribir
 *   pnpm tsx src/db/migrate-images.ts                     # todos
 *   pnpm tsx src/db/migrate-images.ts --dry-run           # todos, sin escribir
 */
import 'dotenv/config'
import postgres from 'postgres'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'

// ── Conexiones a las dos DBs ──────────────────────────────────────────

const sourceDb = postgres('postgresql://sanchez:S4nch3zR3pu3st0s@localhost:5432/sanchez')
const targetDb = postgres('postgresql://sanchez:S4nch3zR3pu3st0s@localhost:5432/erp_sanchez')

// ── Rutas base ────────────────────────────────────────────────────────

const ALFRED_BASE = '/home/sanchez/proyectos/sanchez-vps-alfred/uploads/pim/inventario'
const MONOREPO_ROOT = join(process.cwd(), '..', '..')
const UPLOADS_BASE = join(MONOREPO_ROOT, 'uploads', 'articulos')

// ── Helpers (misma logica que articulos-imagenes.service.ts) ──────────

function sanitizeCodigo(codigo: string): string {
  return codigo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

function buildFileName(codigo: string, slot: number, size: 'thumb' | 'detail'): string {
  return `${sanitizeCodigo(codigo)}_${slot}_${size}.webp`
}

function subdir(tipo: 'etiqueta' | 'producto'): string {
  return tipo === 'etiqueta' ? 'etiquetas' : 'productos'
}

/**
 * Resuelve una ruta de imagen fuente desde ALFRED_BASE.
 * Las rutas en la DB sanchez son como "/images/temporales/IMG_xxx.jpg"
 */
function resolveSourceFile(sourcePath: string): string | null {
  // Quitar el / inicial si lo tiene para hacer join correcto
  const relative = sourcePath.startsWith('/') ? sourcePath.slice(1) : sourcePath
  const fullPath = join(ALFRED_BASE, relative)
  return existsSync(fullPath) ? fullPath : null
}

/**
 * Revisa si ya existen los webp procesados para este codigo/slot/tipo.
 * Retorna la URL del detail si ambos existen, null si no.
 */
function checkExistingWebp(
  codigo: string,
  tipo: 'etiqueta' | 'producto',
  slot: number
): string | null {
  const outputDir = join(UPLOADS_BASE, subdir(tipo))
  const thumbPath = join(outputDir, buildFileName(codigo, slot, 'thumb'))
  const detailPath = join(outputDir, buildFileName(codigo, slot, 'detail'))
  const detailName = buildFileName(codigo, slot, 'detail')

  if (existsSync(thumbPath) && existsSync(detailPath)) {
    return `/api/uploads/articulos/${subdir(tipo)}/${detailName}`
  }
  return null
}

async function processImage(
  filePath: string,
  codigo: string,
  tipo: 'etiqueta' | 'producto',
  slot: number,
  dryRun: boolean
): Promise<string> {
  const outputDir = join(UPLOADS_BASE, subdir(tipo))
  const thumbName = buildFileName(codigo, slot, 'thumb')
  const detailName = buildFileName(codigo, slot, 'detail')
  const detailUrl = `/api/uploads/articulos/${subdir(tipo)}/${detailName}`

  if (dryRun) {
    console.log(`    [DRY-RUN] ${filePath} -> ${detailName} + ${thumbName}`)
    return detailUrl
  }

  const buffer = await readFile(filePath)

  const thumbBuffer = await sharp(buffer)
    .resize(200, 200, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toBuffer()

  const detailBuffer = await sharp(buffer)
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, thumbName), thumbBuffer)
  await writeFile(join(outputDir, detailName), detailBuffer)

  console.log(
    `    + ${detailName} (${(detailBuffer.length / 1024).toFixed(0)}KB) + ${thumbName} (${(thumbBuffer.length / 1024).toFixed(0)}KB)`
  )
  return detailUrl
}

// ── Tipos ─────────────────────────────────────────────────────────────

interface SourceRow {
  codigo: string
  label_images: string[] | null  // jsonb en sanchez, postgres lib lo parsea
  article_images: string[] | null
  label_ocrs: string[] | null
  descripcion_web: string | null
  json_articulo: unknown | null
}

type TipoConfig = {
  tipo: 'etiqueta' | 'producto'
  sourceField: 'label_images' | 'article_images'
  targetField: 'imagenes_etiqueta' | 'imagenes_producto'
}

const TIPOS: TipoConfig[] = [
  { tipo: 'etiqueta', sourceField: 'label_images', targetField: 'imagenes_etiqueta' },
  { tipo: 'producto', sourceField: 'article_images', targetField: 'imagenes_producto' },
]

// Contadores globales de imagenes
let imagesProcessed = 0
let imagesReused = 0

async function migrateArticulo(
  art: SourceRow,
  targetExisting: { imagenes_etiqueta: string[] | null; imagenes_producto: string[] | null } | null,
  dryRun: boolean
): Promise<{ changed: boolean; errors: string[] }> {
  const errors: string[] = []
  let changed = false

  // Verificar si ya esta migrado en target
  if (targetExisting) {
    const etiqArr = targetExisting.imagenes_etiqueta || []
    const prodArr = targetExisting.imagenes_producto || []
    if (
      etiqArr.some(u => u?.startsWith('/api/uploads/')) ||
      prodArr.some(u => u?.startsWith('/api/uploads/'))
    ) {
      console.log('  -> ya migrado, saltando')
      return { changed: false, errors: [] }
    }
  }

  const newEtiquetas: (string | null)[] = []
  const newProductos: (string | null)[] = []

  for (const { tipo, sourceField, targetField } of TIPOS) {
    const rawArr = art[sourceField]
    // jsonb array: filtrar nulls y strings vacios
    const arr = (rawArr || []).filter((v: unknown) => typeof v === 'string' && (v as string).trim() !== '')
    if (arr.length === 0) continue

    const newArr: (string | null)[] = []

    for (let i = 0; i < arr.length; i++) {
      const sourcePath = arr[i] as string

      // Verificar si ya existe el webp procesado
      const existingUrl = checkExistingWebp(art.codigo, tipo, i + 1)
      if (existingUrl) {
        console.log(`    ~ reusando: ${buildFileName(art.codigo, i + 1, 'detail')}`)
        newArr.push(existingUrl)
        imagesReused++
        changed = true
        continue
      }

      // Resolver archivo fuente desde alfred
      const filePath = resolveSourceFile(sourcePath)
      if (!filePath) {
        console.log(`  ! ${art.codigo} slot ${i + 1}: fuente no encontrada: ${sourcePath}`)
        errors.push(`${tipo} slot ${i + 1}: fuente no encontrada: ${sourcePath}`)
        newArr.push(null)
        continue
      }

      try {
        const newUrl = await processImage(filePath, art.codigo, tipo, i + 1, dryRun)
        newArr.push(newUrl)
        imagesProcessed++
        changed = true
      } catch (err) {
        errors.push(`${tipo} slot ${i + 1}: error procesando: ${(err as Error).message}`)
        newArr.push(null)
      }
    }

    if (targetField === 'imagenes_etiqueta') {
      newEtiquetas.push(...newArr)
    } else {
      newProductos.push(...newArr)
    }
  }

  if (changed && !dryRun) {
    const etiq = newEtiquetas.length > 0 ? newEtiquetas : null
    const prod = newProductos.length > 0 ? newProductos : null
    const ocrs = art.label_ocrs && art.label_ocrs.length > 0
      ? (art.label_ocrs as string[])
      : null
    const descWeb = art.descripcion_web || null
    const jsonArt = art.json_articulo ? JSON.stringify(art.json_articulo) : null

    // Un solo UPDATE con todos los campos; los null no sobreescriben
    // porque usamos COALESCE para preservar valores existentes
    await targetDb`
      UPDATE articulos SET
        imagenes_etiqueta = COALESCE(${etiq}::text[], imagenes_etiqueta),
        imagenes_producto = COALESCE(${prod}::text[], imagenes_producto),
        etiquetas_ocr = COALESCE(${ocrs}::text[], etiquetas_ocr),
        descripcion_web = COALESCE(${descWeb}::text, descripcion_web),
        json_articulo = COALESCE(${jsonArt}::jsonb, json_articulo),
        actualizado = now()
      WHERE codigo = ${art.codigo}
    `
  }

  return { changed, errors }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const codigoArg = args.find(a => !a.startsWith('--'))

  console.log('Migracion de imagenes: sanchez -> erp_sanchez')
  console.log(`Source DB: sanchez | Target DB: erp_sanchez`)
  console.log(`Alfred base: ${ALFRED_BASE}`)
  console.log(`Uploads base: ${UPLOADS_BASE}`)
  if (dryRun) console.log('\n=== DRY RUN -- no se escribe nada ===')
  console.log()

  let rows: SourceRow[]

  if (codigoArg) {
    rows = await sourceDb`
      SELECT codigo, label_images, article_images, label_ocrs, descripcion_web, json_articulo
      FROM articulos
      WHERE codigo = ${codigoArg}
    `
    if (rows.length === 0) {
      console.error(`Articulo ${codigoArg} no encontrado en DB sanchez`)
      process.exit(1)
    }
  } else {
    rows = await sourceDb`
      SELECT codigo, label_images, article_images, label_ocrs, descripcion_web, json_articulo
      FROM articulos
      WHERE (label_images IS NOT NULL AND label_images != '[]'::jsonb)
         OR (article_images IS NOT NULL AND article_images != '[]'::jsonb)
    `
  }

  console.log(`Articulos a procesar (fuente): ${rows.length}\n`)

  let processed = 0
  let migrated = 0
  let skipped = 0
  let withErrors = 0

  for (const art of rows) {
    const etiqCount = ((art.label_images || []) as string[]).filter(v => typeof v === 'string' && v.trim() !== '').length
    const prodCount = ((art.article_images || []) as string[]).filter(v => typeof v === 'string' && v.trim() !== '').length
    console.log(`[${processed + 1}/${rows.length}] ${art.codigo} -- ${etiqCount} etiqueta(s), ${prodCount} producto(s)`)

    // Buscar estado actual en target
    const targetRows = await targetDb`
      SELECT imagenes_etiqueta, imagenes_producto
      FROM articulos WHERE codigo = ${art.codigo}
    `
    const targetExisting = targetRows.length > 0
      ? targetRows[0] as { imagenes_etiqueta: string[] | null; imagenes_producto: string[] | null }
      : null

    if (!targetExisting) {
      console.log('  -> codigo no existe en erp_sanchez, saltando')
      skipped++
      processed++
      continue
    }

    const result = await migrateArticulo(art, targetExisting, dryRun)

    if (!result.changed) {
      skipped++
    } else {
      migrated++
    }

    if (result.errors.length > 0) {
      withErrors++
    }

    processed++
  }

  console.log(`\n=== Resumen ===`)
  console.log(`Total: ${processed} | Migrados: ${migrated} | Sin cambios/saltados: ${skipped} | Con errores: ${withErrors}`)
  console.log(`Imagenes procesadas: ${imagesProcessed} | Imagenes reusadas (webp existente): ${imagesReused}`)

  await sourceDb.end()
  await targetDb.end()
}

main().catch(async err => {
  console.error('Error fatal:', err)
  await sourceDb.end().catch(() => {})
  await targetDb.end().catch(() => {})
  process.exit(1)
})
