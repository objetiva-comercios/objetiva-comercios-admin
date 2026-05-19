import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'
import { eq } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { articulos } from '../../db/schema'
import { UploadImagenDto } from './dto/upload-imagen.dto'
import { ImportImagenUrlDto } from './dto/import-imagen-url.dto'

@Injectable()
export class ArticulosImagenesService {
  constructor(private readonly drizzle: DrizzleService) {}

  private sanitizeSku(sku: string): string {
    return sku
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .replace(/[^a-zA-Z0-9]+/g, '_') // replace non-alphanumeric with _
      .replace(/_+/g, '_') // collapse consecutive _
      .replace(/^_+|_+$/g, '') // trim leading/trailing _
      .toUpperCase()
  }

  private buildFileName(sku: string, slot: number, size: 'thumb' | 'detail'): string {
    return `${this.sanitizeSku(sku)}_${slot}_${size}.webp`
  }

  private getOutputDir(tipo: 'etiqueta' | 'producto'): string {
    const subdir = tipo === 'etiqueta' ? 'etiquetas' : 'productos'
    return join(process.cwd(), 'uploads', 'articulos', subdir)
  }

  private getDbField(tipo: 'etiqueta' | 'producto'): 'imagenesProducto' | 'imagenesEtiqueta' {
    return tipo === 'producto' ? 'imagenesProducto' : 'imagenesEtiqueta'
  }

  async uploadImagen(sku: string, buffer: Buffer, dto: UploadImagenDto) {
    // 1. Verify articulo exists (by sku — Phase 31 Deploy 2)
    const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.sku, sku))

    if (!rows.length) {
      throw new NotFoundException(`Articulo con sku ${sku} no encontrado`)
    }

    const articulo = rows[0]

    // 2. Validate slot range
    const maxSlot = dto.tipo === 'etiqueta' ? 3 : 6
    if (dto.slot > maxSlot) {
      throw new BadRequestException(
        `Slot invalido: ${dto.tipo} acepta maximo ${maxSlot} imagenes (slot 1-${maxSlot})`
      )
    }

    const outputDir = this.getOutputDir(dto.tipo)
    const thumbFileName = this.buildFileName(sku, dto.slot, 'thumb')
    const detailFileName = this.buildFileName(sku, dto.slot, 'detail')

    // 3. Process with sharp (also validates image bytes)
    let thumbBuffer: Buffer
    let detailBuffer: Buffer

    try {
      thumbBuffer = await sharp(buffer)
        .resize(200, 200, { fit: 'cover', position: 'centre' })
        .webp({ quality: 80 })
        .toBuffer()

      detailBuffer = await sharp(buffer)
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
    } catch {
      throw new BadRequestException('Archivo no es una imagen valida')
    }

    // 4. Write files to disk
    await mkdir(outputDir, { recursive: true })
    await writeFile(join(outputDir, thumbFileName), thumbBuffer)
    await writeFile(join(outputDir, detailFileName), detailBuffer)

    // 5. Build URL (plural: etiquetas/, productos/)
    const tipoPlural = dto.tipo === 'etiqueta' ? 'etiquetas' : 'productos'
    const detailUrl = `/api/uploads/articulos/${tipoPlural}/${detailFileName}`

    // 6. Update DB JSONB array
    const dbField = this.getDbField(dto.tipo)
    const currentArr: (string | null)[] = [...((articulo[dbField] as string[]) || [])]

    // Extend array with nulls if needed
    while (currentArr.length < dto.slot) {
      currentArr.push(null)
    }
    currentArr[dto.slot - 1] = detailUrl

    // 7. Persist and return updated articulo (keyed by sku — Phase 31 Deploy 2)
    const updated = await this.drizzle.db
      .update(articulos)
      .set({ [dbField]: currentArr, updatedAt: new Date() })
      .where(eq(articulos.sku, sku))
      .returning()

    return updated[0]
  }

  private readonly logger = new Logger(ArticulosImagenesService.name)

  async importFromUrl(sku: string, dto: ImportImagenUrlDto) {
    // 1. Download image from external URL
    let buffer: Buffer
    try {
      const response = await fetch(dto.url)
      if (!response.ok) {
        throw new BadRequestException(
          `No se pudo descargar la imagen: ${response.status} ${response.statusText}`
        )
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) {
        throw new BadRequestException(`URL no retorna una imagen (content-type: ${contentType})`)
      }
      buffer = Buffer.from(await response.arrayBuffer())
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new BadRequestException(
        `Error descargando imagen desde ${dto.url}: ${(err as Error).message}`
      )
    }

    this.logger.log(
      `Imagen descargada desde ${dto.url} (${buffer.length} bytes) → ${sku} ${dto.tipo} slot ${dto.slot}`
    )

    // 2. Reuse existing upload pipeline
    return this.uploadImagen(sku, buffer, { tipo: dto.tipo, slot: dto.slot })
  }

  async deleteImagen(sku: string, tipo: 'etiqueta' | 'producto', slot: number) {
    // 1. Verify articulo exists (by sku — Phase 31 Deploy 2)
    const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.sku, sku))

    if (!rows.length) {
      throw new NotFoundException(`Articulo con sku ${sku} no encontrado`)
    }

    const articulo = rows[0]

    // 2. Build file paths
    const outputDir = this.getOutputDir(tipo)
    const thumbPath = join(outputDir, this.buildFileName(sku, slot, 'thumb'))
    const detailPath = join(outputDir, this.buildFileName(sku, slot, 'detail'))

    // 3. Delete files (ignore ENOENT — idempotent)
    await unlink(thumbPath).catch(err => {
      if (err.code !== 'ENOENT') throw err
    })
    await unlink(detailPath).catch(err => {
      if (err.code !== 'ENOENT') throw err
    })

    // 4. Update DB: set slot to null
    const dbField = this.getDbField(tipo)
    const currentArr: (string | null)[] = [...((articulo[dbField] as string[]) || [])]

    if (slot <= currentArr.length) {
      currentArr[slot - 1] = null
    }

    const updated = await this.drizzle.db
      .update(articulos)
      .set({ [dbField]: currentArr, updatedAt: new Date() })
      .where(eq(articulos.sku, sku))
      .returning()

    return updated[0]
  }
}
