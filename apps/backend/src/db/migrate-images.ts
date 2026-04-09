/**
 * migrate-images.ts
 *
 * Lee imagenes_producto e imagenes_etiqueta de articulos con rutas viejas
 * (/images/...), re-procesa los JPG con sharp (thumb + detail webp),
 * y actualiza la DB con las rutas nuevas (/api/uploads/articulos/...).
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

const sql = postgres(process.env.DATABASE_URL!)
// uploads/ esta en la raiz del monorepo, no en apps/backend/
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
 * Dado "/images/labelImages_xxx_1.jpg", busca el archivo real en disco.
 */
function resolveOldFile(oldPath: string, tipo: 'etiqueta' | 'producto'): string | null {
  const filename = oldPath.split('/').pop()
  if (!filename) return null
  const fullPath = join(UPLOADS_BASE, subdir(tipo), filename)
  return existsSync(fullPath) ? fullPath : null
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
    console.log(`    [DRY-RUN] ${filePath} → ${detailName} + ${thumbName}`)
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
    `    ✓ ${detailName} (${(detailBuffer.length / 1024).toFixed(0)}KB) + ${thumbName} (${(thumbBuffer.length / 1024).toFixed(0)}KB)`
  )
  return detailUrl
}

// ── Tipos ─────────────────────────────────────────────────────────────

interface ArticuloRow {
  codigo: string
  imagenes_producto: string[] | null
  imagenes_etiqueta: string[] | null
}

type TipoConfig = {
  tipo: 'etiqueta' | 'producto'
  field: 'imagenes_etiqueta' | 'imagenes_producto'
}

const TIPOS: TipoConfig[] = [
  { tipo: 'etiqueta', field: 'imagenes_etiqueta' },
  { tipo: 'producto', field: 'imagenes_producto' },
]

async function migrateArticulo(
  art: ArticuloRow,
  dryRun: boolean
): Promise<{ changed: boolean; errors: string[] }> {
  const errors: string[] = []
  const updates: Record<string, (string | null)[]> = {}
  let changed = false

  for (const { tipo, field } of TIPOS) {
    const arr = art[field] || []
    if (arr.length === 0) continue

    // Ya migrado
    if (arr.some(u => u?.startsWith('/api/uploads/'))) continue
    // Sin formato viejo
    if (!arr.some(u => u?.startsWith('/images/'))) continue

    const newArr: (string | null)[] = []

    for (let i = 0; i < arr.length; i++) {
      const oldUrl = arr[i]
      if (!oldUrl || !oldUrl.startsWith('/images/')) {
        newArr.push(oldUrl)
        continue
      }

      const filePath = resolveOldFile(oldUrl, tipo)
      if (!filePath) {
        errors.push(`${tipo} slot ${i + 1}: archivo no encontrado para ${oldUrl}`)
        newArr.push(null)
        continue
      }

      try {
        const newUrl = await processImage(filePath, art.codigo, tipo, i + 1, dryRun)
        newArr.push(newUrl)
        changed = true
      } catch (err) {
        errors.push(`${tipo} slot ${i + 1}: error procesando: ${(err as Error).message}`)
        newArr.push(null)
      }
    }

    updates[field] = newArr
  }

  if (changed && !dryRun) {
    const etiq = updates.imagenes_etiqueta
    const prod = updates.imagenes_producto
    if (etiq && prod) {
      await sql`UPDATE articulos SET imagenes_etiqueta = ${etiq}, imagenes_producto = ${prod}, actualizado = now() WHERE codigo = ${art.codigo}`
    } else if (etiq) {
      await sql`UPDATE articulos SET imagenes_etiqueta = ${etiq}, actualizado = now() WHERE codigo = ${art.codigo}`
    } else if (prod) {
      await sql`UPDATE articulos SET imagenes_producto = ${prod}, actualizado = now() WHERE codigo = ${art.codigo}`
    }
  }

  return { changed, errors }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const codigoArg = args.find(a => !a.startsWith('--'))

  if (dryRun) console.log('=== DRY RUN — no se escribe nada ===\n')

  let rows: ArticuloRow[]

  if (codigoArg) {
    rows = await sql`
      SELECT codigo, imagenes_producto, imagenes_etiqueta
      FROM articulos WHERE codigo = ${codigoArg}
    `
    if (rows.length === 0) {
      console.error(`Articulo ${codigoArg} no encontrado`)
      process.exit(1)
    }
  } else {
    rows = await sql`
      SELECT codigo, imagenes_producto, imagenes_etiqueta
      FROM articulos
      WHERE array_to_string(imagenes_producto, ',') LIKE '%/images/%'
         OR array_to_string(imagenes_etiqueta, ',') LIKE '%/images/%'
    `
  }

  console.log(`Articulos a procesar: ${rows.length}\n`)

  let processed = 0
  let migrated = 0
  let skipped = 0
  let withErrors = 0

  for (const art of rows) {
    console.log(`[${processed + 1}/${rows.length}] ${art.codigo}`)

    const result = await migrateArticulo(art, dryRun)

    if (!result.changed) {
      console.log('  → sin cambios')
      skipped++
    } else {
      migrated++
    }

    if (result.errors.length > 0) {
      withErrors++
      for (const e of result.errors) console.log(`  ⚠ ${e}`)
    }

    processed++
  }

  console.log(`\n=== Resumen ===`)
  console.log(
    `Total: ${processed} | Migrados: ${migrated} | Sin cambios: ${skipped} | Con errores: ${withErrors}`
  )

  await sql.end()
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
